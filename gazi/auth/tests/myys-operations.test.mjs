import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,CoreError,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {LocalLmsAdapter,LocalLmsWorker,queueState} from '../myys/lms.mjs';
import {parseTransferCsv,transferCsv} from '../myys/transfer-csv.mjs';
import {use} from './helpers/myys-fixture.mjs';

function source(f){
 const {p,e}=f.setup(),key=randomBytes(32);let now='2026-10-10T20:00:00.000Z';const clock=()=>now;
 f.core.clock=clock;
 const contract={id:'source-local',tenant:'test-gazi',unit:'engineering',programId:p.id,mode:'local-acceptance',subjects:{source:'student'},key};
 const adapter=new LocalLmsAdapter(f.s,contract,{clock});
 const accept=(overrides={})=>{const raw=JSON.stringify({id:'source-event-01',contractId:contract.id,tenant:contract.tenant,programId:p.id,subject:'source',revision:1,type:'grade',taskId:'T1',content:'Türkçe çalışma: ölçme kanıtı ve öğrenme ürünü.',grade:90,occurredAt:clock(),...overrides});return adapter.accept(raw,createHmac('sha256',key).update(raw).digest('hex'));};
 return {p,e,clock,contract,adapter,accept,advance(ms){now=new Date(Date.parse(now)+ms).toISOString();}};
}
test('Kalıcı işçi: on tekrar, tek alındı, insan kararı ve ihraç otomatik üretilmez',()=>use(f=>{
 const x=source(f),event=x.accept(),w=new LocalLmsWorker(x.adapter);
 for(let i=0;i<10;i++){assert.equal(x.accept().id,event.id);w.run(event.id);}
 assert.equal(f.s.list('test-gazi','lms-receipt').length,1);assert.equal(f.s.list('test-gazi','lms-job').length,2);
 assert.equal(f.s.list('test-gazi','decision').length,0);assert.equal(f.s.list('test-gazi','issuance').length,0);
 assert.equal(f.core.view(f.context('it')).queue[0].state,'processed');
}));
test('İki bağlantı aynı olayı alamaz; süresi dolan işçi geç sonuç yazamaz',()=>use(f=>{
 const x=source(f),event=x.accept(),w=new LocalLmsWorker(x.adapter,{leaseMs:1000});
 const s2=new LocalAcceptanceStore(f.path);
 try{const w2=new LocalLmsWorker(new LocalLmsAdapter(s2,x.contract,{clock:x.clock}),{leaseMs:1000});
  const first=w.claim(event.id);assert.equal(w2.claim(event.id),null);x.advance(1001);const next=w2.claim(event.id);assert.ok(next);
  assert.throws(()=>w.finish(first),e=>e.code==='lease_lost');assert.equal(w2.finish(next).state,'processed');assert.equal(s2.list('test-gazi','lms-receipt').length,1);
 }finally{s2.close();}
}));
test('Depo yeniden açıldıktan sonra bekleyen olay işlenir',()=>use(f=>{
 const x=source(f),event=x.accept(),s2=new LocalAcceptanceStore(f.path);
 try{const w=new LocalLmsWorker(new LocalLmsAdapter(s2,x.contract,{clock:x.clock}));assert.equal(w.run(event.id).receipt.state,'processed');}finally{s2.close();}
 assert.equal(f.core.view(f.context('it')).queue[0].state,'processed');
}));
test('Geçici hata kalıcı zamanlamayla yeniden denenir, hata mesajındaki sır saklanmaz',()=>use(f=>{
 const x=source(f),event=x.accept();let fails=true;
 const w=new LocalLmsWorker(x.adapter,{beforeProcess(){if(fails)throw Object.assign(Error('secret-provider-response'),{code:'ETIMEDOUT'});}});
 assert.equal(w.run(event.id).failure.state,'retry-wait');assert.equal(w.run(event.id).claimed,false);
 x.advance(1000);fails=false;assert.equal(w.run(event.id).receipt.state,'processed');
 assert.doesNotMatch(JSON.stringify(f.s.list('test-gazi','lms-job')),/secret-provider-response/);
}));
test('Kalıcı hata ve çakışma karantinaya gider; kör tekrar çalışmaz',()=>use(f=>{
 const x=source(f),event=x.accept(),w=new LocalLmsWorker(x.adapter,{beforeProcess(){throw new CoreError('idempotency_conflict','private error');}});
 assert.equal(w.run(event.id).failure.state,'quarantined');for(let i=0;i<10;i++)assert.equal(w.run(event.id).claimed,false);
 assert.equal(f.s.list('test-gazi','lms-receipt').length,0);
 const q=f.core.view(f.context('it')).queue[0];assert.deepEqual(q.allowedActions,['lms-quarantine-review']);
 f.run('it','lms-quarantine-review',{eventId:event.id,expectedStateId:q.stateId,reason:'Kaynak sürümü yeniden doğrulanarak yeni olay ile düzeltilmeli.'});
 assert.equal(w.run(event.id).claimed,false);assert.equal(f.core.view(f.context('it')).queue[0].allowedActions.length,0);
 assert.throws(()=>f.run('it','lms-quarantine-review',{eventId:event.id,expectedStateId:q.stateId,reason:'İkinci inceleme aynı durum üstüne yazılmamalı.'}),e=>e.code==='duplicate');
}));
test('Yeniden deneme üst sınırı ve süresi sürekli dolan işçi karantinada durur',()=>use(f=>{
 const x=source(f),event=x.accept(),w=new LocalLmsWorker(x.adapter,{maxAttempts:2,leaseMs:1000});
 w.claim(event.id);x.advance(1001);w.claim(event.id);x.advance(1001);assert.equal(w.claim(event.id),null);
 assert.equal(f.core.view(f.context('it')).queue[0].state,'quarantined');
}));
test('İşçi alındısı ve denetimi atomik; denetim hatası başarıyı geri alır',()=>use(f=>{
 const x=source(f),event=x.accept(),w=new LocalLmsWorker(x.adapter),claim=w.claim(event.id);
 f.s.db.exec("CREATE TRIGGER audit_fail BEFORE INSERT ON audit WHEN NEW.action='lms.processed' BEGIN SELECT RAISE(ABORT,'audit-failure'); END;");
 assert.throws(()=>w.finish(claim),/audit-failure/);assert.equal(f.s.get('test-gazi','lms-receipt',event.id),null);
 assert.equal(queueState(f.s,'test-gazi',f.s.get('test-gazi','lms-event',event.id),x.clock()).state,'processing');
}));
test('Üyelik işlem öncesi ayrılırsa olay karantinaya alınır',()=>use(f=>{
 const x=source(f),event=x.accept();f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');
 assert.equal(new LocalLmsWorker(x.adapter).run(event.id).failure.errorCode,'lms_identity');
}));
test('Sırasız olay eskir; yeni düzeltme alındıdan önce eski kanıtı kapatır',()=>use(f=>{
 const x=source(f),older=x.accept(),newer=x.accept({id:'newer-event-02',revision:2,grade:20});const w=new LocalLmsWorker(x.adapter);
 assert.equal(w.run(older.id).receipt.state,'stale');assert.equal(w.run(newer.id).receipt.state,'processed');
 assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:older.id}),e=>e.code==='lms_evidence');
}));
test('Kuyruk teknik rolde kişisel kanıtı sızdırmaz; öğrenci ve başka birim görünümü kapalı',()=>use(f=>{
 const x=source(f),event=x.accept();new LocalLmsWorker(x.adapter).run(event.id);
 const view=f.core.view(f.context('it'));assert.equal(view.queue.length,1);assert.doesNotMatch(JSON.stringify(view.queue),/Türkçe çalışma|"owner":|"grade":|"content":/);
 assert.equal(f.core.view(f.context('student')).queue.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('health','it');assert.equal(f.core.view(f.context('it')).queue.length,0);
 assert.throws(()=>f.core.view({sessionHash:hash('it'),tenant:'other'}),e=>e.code==='identity_tenant');
}));
test('CSV Türkçe, virgül, çift tırnak ve satır sonunu korur; bozuk yapıyı reddeder',()=>{
 assert.deepEqual(parseTransferCsv('\uFEFFKarar kimliği,Satır açıklaması\r\nd1,"Öğrenen, İstanbul ""örnek""\nİkinci satır"\r\n'),[{decisionId:'d1',label:'Öğrenen, İstanbul "örnek"\nİkinci satır'}]);
 for(const bad of ['a,b\nx,y','Karar kimliği,Satır açıklaması\na,"b','Karar kimliği,Satır açıklaması\n"a"x,b'])assert.throws(()=>parseTransferCsv(bad));
 assert.equal(parseTransferCsv('Karar kimliği,Satır açıklaması\na,b,c')[0].inputError,'column_count');
 const csv=transferCsv([['=cmd','  +cmd','@cmd','-cmd','\t=cmd','Öğrenen, "İ"']]);assert.match(csv,/"'=cmd"/);assert.match(csv,/"'  \+cmd"/);assert.match(csv,/"Öğrenen, ""İ"""/);
});
test('Toplu liste eksik/yinelenen satırları kalıcı tutar; tek hazırlık oluşur',()=>use(f=>{
 const {d}=f.passed();const batch=f.run('issuer','batch-create',{unit:'engineering',title:'Türkçe öğrenci listesi',rows:[{decisionId:d.id,label:'İstanbul, Öğrenen'},{decisionId:d.id},null,{decisionId:'missing'}]});
 const before=f.core.view(f.context('issuer')).batches[0];assert.deepEqual(before.counts,{submitted:4,accepted:1,processed:0,rejected:3,prepared:0,signed:0,delivered:0});
 for(let row=1;row<=4;row++)for(let i=0;i<10;i++)f.run('issuer','batch-process',{batchId:batch.id,row});
 assert.equal(f.s.list('test-gazi','issuance').length,1);assert.equal(f.s.list('test-gazi','batch-result').length,4);
 const after=f.core.view(f.context('issuer')).batches[0];assert.equal(after.counts.processed,4);assert.equal(after.counts.prepared,1);assert.equal(after.rows[1].code,'duplicate_learner');
 const s2=new LocalAcceptanceStore(f.path);try{assert.deepEqual(new MyysCore(s2).view(f.context('issuer')).batches[0],after);}finally{s2.close();}
}));
test('Toplu satırda sonradan açılan itiraz yeniden denetlenir, kısmi hata saklanır',()=>use(f=>{
 const {d}=f.passed(),batch=f.run('issuer','batch-create',{unit:'engineering',title:'İtiraz kontrolü',rows:[{decisionId:d.id}]});
 f.run('student','appeal',{decisionId:d.id,reason:'Öğrenme kanıtının bağımsız yeniden incelenmesini istiyorum.'});
 assert.equal(f.run('issuer','batch-process',{batchId:batch.id,row:1}).code,'decision_blocked');assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
test('Toplu işlem MFA, kurum, birim, görevler ayrılığı ve tekrar yetkisini denetler',()=>use(f=>{
 const {d}=f.passed(),input={unit:'engineering',title:'Yetki sınırları',rows:[{decisionId:d.id}]};
 for(const actor of ['student','teacher','judge','admin','it'])assert.throws(()=>f.run(actor,'batch-create',input),e=>e.code==='forbidden');
 const command=randomUUID(),b=f.run('issuer','batch-create',input,command);assert.equal(f.core.view(f.context('student')).batches.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('health','issuer');
 assert.throws(()=>f.run('issuer','batch-create',input,command),e=>e.code==='forbidden');assert.throws(()=>f.run('issuer','batch-process',{batchId:b.id,row:1}),e=>e.code==='not_found');
 const hidden=f.run('issuer','batch-create',{...input,unit:'health'});assert.equal(hidden.rows[0].decisionId,null);assert.equal(hidden.rows[0].owner,null);
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('issuer');assert.throws(()=>f.run('issuer','batch-create',{...input,unit:'health'}),e=>e.code==='forbidden');
}));
test('Toplu hazırlık ve satır sonucu denetim hatasında birlikte geri alınır',()=>use(f=>{
 const {d}=f.passed(),b=f.run('issuer','batch-create',{unit:'engineering',title:'Atomik satır',rows:[{decisionId:d.id}]});
 f.s.db.exec("CREATE TRIGGER batch_audit_fail BEFORE INSERT ON audit WHEN NEW.action='batch-process' BEGIN SELECT RAISE(ABORT,'audit-failure'); END;");
 assert.throws(()=>f.run('issuer','batch-process',{batchId:b.id,row:1}),/audit-failure/);assert.equal(f.s.list('test-gazi','issuance').length,0);assert.equal(f.s.list('test-gazi','batch-result').length,0);
}));
