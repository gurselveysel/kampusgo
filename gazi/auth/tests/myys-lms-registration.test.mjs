import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePacketFixture} from './helpers/local-source-packet.mjs';
import {use} from './helpers/myys-fixture.mjs';
import {sourceRegistrationState} from '../myys/lms-registration.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {qualityReport} from '../myys/quality-report.mjs';
const match=code=>e=>e.code===code;
const reason='Kaynak kayıt ve çalışma dayanakları insan tarafından incelendi.';
async function harness(f){const h=await sourcePacketFixture(f);h.accept=async changes=>{const p=h.payload(changes);return h.adapter.accept(f.context('it'),await h.token(p));};h.reg=(revision=1,registered=true)=>h.accept({type:'registration',revision,submissionVersion:revision,registered});h.process=e=>h.adapter.process(f.context('it'),e.id);h.view=who=>f.core.view(f.context(who));return h;}
test('B15 kaynak kayıt bildirimi yeni kişi veya program kaydı yaratmaz, insan kararı üretmez',()=>use(async f=>{
 const h=await harness(f),before=f.s.list('test-gazi','enrollment').length;const a=await h.reg();assert.equal(a.processed,false);assert.equal(h.view('student').lmsProgress[0].registration.state,'pending');
 await assert.rejects(()=>h.accept(),match('lms_registration'));await assert.rejects(()=>h.accept({type:'completion'}),match('lms_registration'));
 h.process(a);assert.equal(h.view('student').lmsProgress[0].registration.state,'active');assert.equal(f.s.list('test-gazi','enrollment').length,before);assert.equal(f.s.list('test-gazi','decision').length,0);assert.equal(f.s.list('test-gazi','issuance').length,0);
 const p=h.payload({type:'registration',registrationId:'source-other-registration'});p.sub='source-other';p.personId='other';const token=await h.token(p);await assert.rejects(()=>h.adapter.accept(f.context('it'),token),match('lms_enrollment'));
}));
test('B15 doğru imza yanlış eşleme veya yetkisiz program kaydını açamaz',()=>use(async f=>{
 const h=await harness(f);
 for(const modify of [p=>p.personId='other',p=>p.sub='unknown',p=>{p.sub='source-other';p.personId='other';}]){const p=h.payload({type:'registration'});modify(p);const token=await h.token(p);await assert.rejects(()=>h.adapter.accept(f.context('it'),token));}
 assert.equal(f.s.list('test-gazi','lms-event').length,0);assert.equal(f.s.list('test-gazi','enrollment').length,1);
}));
test('B15 kayıt profili alan/tür/sürüm karışmasını ve değişen kaynak kayıt kimliğini reddeder',()=>use(async f=>{
 const h=await harness(f);for(const patch of [{registered:1},{registrationId:'bad value'},{registered:null}]){const p=h.payload({type:'registration'});Object.assign(p.event,patch);const token=await h.token(p);await assert.rejects(()=>h.adapter.accept(f.context('it'),token),match('source_signature'));}
 const wrong=h.payload({type:'registration'});wrong.format='myys-source-packet/1';const token=await h.token(wrong);await assert.rejects(()=>h.adapter.accept(f.context('it'),token),match('source_signature'));
 const r=await h.reg();h.process(r);await assert.rejects(()=>h.accept({type:'registration',revision:2,submissionVersion:2,registrationId:'changed'}),match('lms_registration'));
 f.run('author','enroll',{programId:h.initial.p.id,learnerId:'other'});const p=h.payload({type:'registration'});p.sub='source-other';p.personId='other';const duplicate=await h.token(p);await assert.rejects(()=>h.adapter.accept(f.context('it'),duplicate),match('lms_registration'));
}));
test('B15 tamamlama false ve true ayrı sürümlerdir; kaynak notu başarı kararına dönüşmez',()=>use(async f=>{
 const h=await harness(f);h.process(await h.reg());h.process(await h.accept({type:'completion',completed:false}));let v=h.view('student');assert.equal(v.lmsProgress[0].completion.completed,false);assert.equal(qualityReport(v).metrics.find(m=>m.id==='completion').numerator,0);
 const grade=await h.accept({grade:5});h.process(grade);assert.equal(h.view('student').lmsProgress[0].tasks[0].grade,5);assert.equal(f.s.list('test-gazi','assessment').length,0);
 h.process(await h.accept({type:'completion',revision:2,submissionVersion:2,completed:true}));v=h.view('student');assert.equal(v.lmsProgress[0].completion.completed,true);assert.equal(qualityReport(v).metrics.find(m=>m.id==='completion').numerator,1);assert.equal(f.s.list('test-gazi','decision').length,0);
}));
test('B15 kayıt iptali kuyruktayken eski kararı kapatır; yeniden kayıt eski notu canlandırmaz',()=>use(async f=>{
 const h=await harness(f);h.process(await h.reg());const grade=await h.accept();h.process(grade);const ev=f.run('teacher','import-lms-evidence',{eventId:grade.id}),a=f.run('teacher','assess',{enrollmentId:h.initial.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason}),d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});
 const before=decisionArchive(f.core,f.context('student'),d.id);assert.equal(before.currentUsable,true);
 const cancel=await h.reg(2,false);assert.equal(h.view('student').decisions[0].usable,false);assert.equal(h.view('student').lmsProgress[0].registration.state,'cancelled');assert.equal(f.s.get('test-gazi','lms-receipt',cancel.id),null);
 const again=await h.reg(3,true);h.process(again);h.process(cancel);assert.equal(h.view('student').lmsProgress[0].registration.state,'active');assert.equal(h.view('student').lmsProgress[0].tasks[0].current,false);assert.equal(h.view('student').decisions[0].usable,false);
 const next=await h.accept({revision:2,submissionVersion:2});h.process(next);assert.equal(h.view('student').lmsProgress[0].tasks[0].current,true);assert.equal(f.s.get('test-gazi','lms-event',next.id).registrationEventId,again.id);assert.equal(h.view('student').decisions[0].usable,false);
 const after=decisionArchive(f.core,f.context('student'),d.id);assert.equal(after.sha256,before.sha256);assert.deepEqual(after.payload,before.payload);
}));
test('B15 not düzeltmesi, lisans iptali ve kayıt güveni göstergeye aynı kaynaktan yansır',()=>use(async f=>{
 const h=await harness(f);h.process(await h.reg());const one=await h.accept();h.process(one);const complete=await h.accept({type:'completion'});h.process(complete);
 const correction=await h.accept({revision:2,submissionVersion:2,grade:20});assert.equal(h.view('student').lmsProgress[0].tasks[0].current,false);h.process(correction);assert.equal(h.view('student').lmsProgress[0].tasks[0].grade,20);
 await h.accept({type:'license-revoked'});const v=h.view('student');assert.equal(v.lmsProgress[0].licenseRevoked,true);assert.equal(v.lmsProgress[0].completion.current,false);assert.equal(qualityReport(v).metrics.find(m=>m.id==='completion').numerator,0);assert.equal(v.lmsProgress[0].tasks[0].current,false);
}));
test('B15 kayıt iptalinden sonra geç kalan worker kanıtı karantinaya alır',()=>use(async f=>{
 const h=await harness(f);h.process(await h.reg());const g=await h.accept(),worker=h.adapter.worker(f.context('it')),claim=worker.claim(g.id);await h.reg(2,false);
 assert.throws(()=>worker.finish(claim),match('lms_registration'));worker.fail(claim,{code:'lms_registration'});assert.equal(f.s.get('test-gazi','lms-receipt',g.id),null);assert.equal(h.view('it').queue.find(e=>e.id===g.id).state,'quarantined');
}));
test('B15 mükerrer/sırasız kayıt ve iki bağlantı güncel sürümü geriletemez',()=>use(async f=>{
 const h=await harness(f),p=h.payload({type:'registration',revision:3,submissionVersion:3}),token=await h.token(p),one=await h.adapter.accept(f.context('it'),token);h.process(one);
 const s2=new LocalAcceptanceStore(f.path);try{const other=h.make(s2);assert.equal((await other.accept(f.context('it'),token)).duplicate,true);assert.equal(other.process(f.context('it'),one.id).claimed,false);}finally{s2.close();}
 const old=await h.reg(2,false);assert.equal(h.process(old).receipt.state,'stale');assert.equal(sourceRegistrationState(f.s,'test-gazi',h.config.id,'student',h.config).state,'active');assert.equal(f.s.list('test-gazi','lms-event').length,2);
}));
test('B15 audit hatası kayıt olayını geri alır; güven kapanışı ilerlemeyi kullanıma kapatır',()=>use(async f=>{
 const h=await harness(f),p=h.payload({type:'registration'}),token=await h.token(p);f.s.db.exec("CREATE TRIGGER fail_lms_audit BEFORE INSERT ON audit WHEN NEW.action='lms.accept' BEGIN SELECT RAISE(ABORT,'synthetic'); END");await assert.rejects(()=>h.adapter.accept(f.context('it'),token));assert.equal(f.s.list('test-gazi','lms-event').length,0);f.s.db.exec('DROP TRIGGER fail_lms_audit');const e=await h.adapter.accept(f.context('it'),token);h.process(e);h.process(await h.accept({type:'completion'}));assert.equal(qualityReport(h.view('student')).metrics.find(m=>m.id==='completion').numerator,1);
 f.run('it','source-trust-state',{contractId:h.trustRecord.id,basedOn:h.view('it').sourceTrust[0].digest,target:'contract',expectedState:'active',state:'revoked',reason,incidentReference:reason});assert.equal(h.view('student').lmsProgress[0].registration.state,'untrusted');assert.equal(qualityReport(h.view('student')).metrics.find(m=>m.id==='completion').numerator,0);
}));
test('B15 ilerleme görünümü kişi/rol/birim ve başka tenant sınırını korur',()=>use(async f=>{
 const h=await harness(f);h.process(await h.reg());h.process(await h.accept());for(const who of ['student','teacher','reviewer','it'])assert.equal(h.view(who).lmsProgress.length,1);for(const who of ['other','admin'])assert.equal(h.view(who).lmsProgress.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('health','it');assert.equal(h.view('it').lmsProgress.length,0);assert.throws(()=>f.core.view({sessionHash:hash('student'),tenant:'foreign'}));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('teacher');assert.equal(h.view('teacher').lmsProgress.length,0);
}));

test('B15 aynı kişi/kaynak kimliği olsa bile başka birim program kaydı ilerlemeye katılmaz',()=>use(async f=>{
 const h=await harness(f),r=await h.reg();h.process(r);const original=f.s.get('test-gazi','lms-event',r.id);f.s.put('test-gazi','lms-event',{...original,id:'foreign-registration',unit:'health',programId:'foreign-program',registrationId:'must-not-leak',revision:99,registered:false});
 const v=h.view('student');assert.equal(v.lmsProgress.length,1);assert.equal(v.lmsProgress[0].registration.state,'active');assert.equal(v.lmsProgress[0].registration.registrationId,'source-registration-1');assert.ok(!JSON.stringify(v).includes('must-not-leak'));
}));
