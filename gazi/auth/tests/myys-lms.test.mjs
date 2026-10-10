import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {LocalLmsAdapter} from '../myys/lms.mjs';
import {registryFields} from '../myys/registry.mjs';
import {use} from './helpers/myys-fixture.mjs';

const reason='Sentetik örnekte kaynak çalışma ve ölçme kaydı incelendi.';
function setup(f){
 const {p,e}=f.setup(),key=randomBytes(32),contract={id:'test-source',tenant:'test-gazi',unit:'engineering',programId:p.id,mode:'local-acceptance',subjects:{'source-01':'student'},key};
 const adapter=new LocalLmsAdapter(f.s,contract);
 const event={id:'source-event-01',contractId:contract.id,tenant:contract.tenant,programId:p.id,subject:'source-01',revision:1,type:'grade',taskId:'T1',content:'Sentetik kaynak çalışması: veri kalitesi ve boş değerler incelendi.',grade:90,occurredAt:new Date().toISOString()};
 const accept=overrides=>{const raw=JSON.stringify({...event,...overrides});return adapter.accept(raw,createHmac('sha256',key).update(raw).digest('hex'));};
 const assess=ev=>f.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason});
 return {adapter,accept,event,p,e,key,assess};
}
test('LMS imzası, kurum kapsamı, kişi eşlemesi ve null kaynak notu reddedilir',()=>use(f=>{
 const x=setup(f);assert.throws(()=>x.adapter.accept(JSON.stringify(x.event),'0'.repeat(64)),/imzası/);
 assert.throws(()=>x.accept({tenant:'other'}),/kapsamı/);
 assert.throws(()=>x.accept({subject:'unmapped'}),/eşlemede/);
 assert.throws(()=>x.accept({grade:null}),/kaynak notu/);
 assert.equal(f.s.list('test-gazi','lms-event').length,0);
}));
test('LMS kabulü işlenme değildir; on tekrar bir olay ve bir alındı üretir',()=>use(f=>{
 const x=setup(f),r=x.accept();assert.equal(r.processed,false);
 for(let i=0;i<10;i++)assert.equal(x.accept().id,r.id);
 assert.equal(f.s.list('test-gazi','lms-event').length,1);
 for(let i=0;i<10;i++)assert.equal(x.adapter.process(r.id).state,'processed');
 assert.equal(f.s.list('test-gazi','lms-receipt').length,1);
 assert.equal(f.s.list('test-gazi','decision').length,0);
 assert.equal(f.s.list('test-gazi','issuance').length,0);
 assert.throws(()=>x.accept({grade:25}),/farklı içerik/);
}));
test('Sırasız ve aynı sürümlü farklı olay son durumu geriletemez',()=>use(f=>{
 const x=setup(f),newer=x.accept({id:'new-event-02',revision:2});x.adapter.process(newer.id);
 const older=x.accept();assert.equal(x.adapter.process(older.id).state,'stale');
 assert.throws(()=>x.accept({id:'collision-02',revision:2}),/kaynak sürümü/);
 assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:older.id}),/güncel/);
}));
test('LMS görev kanıtı insan incelemesine alınır; not tek başına başarı kararı olmaz',()=>use(f=>{
 const x=setup(f),r=x.accept();
 assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:r.id}),/İşlenmiş/);
 x.adapter.process(r.id);
 assert.throws(()=>f.run('student','import-lms-evidence',{eventId:r.id}),/yetkiniz/);
 const ev=f.run('teacher','import-lms-evidence',{eventId:r.id});assert.equal(ev.source,'signed-lms-local');
 assert.equal(f.s.list('test-gazi','assessment').length,0);
 const a=x.assess(ev),d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});
 assert.equal(f.run('issuer','issue',{decisionId:d.id}).state,'awaiting-signature');
}));
test('Yeni not düzeltmesi henüz işlenmeden eski karara bağlı ihraç kapanır',()=>use(f=>{
 const x=setup(f),r=x.accept();x.adapter.process(r.id);
 const ev=f.run('teacher','import-lms-evidence',{eventId:r.id}),a=x.assess(ev),d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});
 x.accept({id:'correction-02',revision:2,grade:20,content:'Düzeltilmiş sentetik çalışma: kaynağın ilk notu hatalıydı.'});
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id}),/Başarı kararı/);
 assert.equal(f.core.view(f.context('student')).decisions[0].usable,false);
 assert.equal(f.s.get('test-gazi','decision',d.id).score,100);
}));
test('Lisans iptali kaynak kanıtının kullanılmasını durdurur',()=>use(f=>{
 const x=setup(f),r=x.accept();x.adapter.process(r.id);
 x.accept({id:'license-revoked-01',type:'license-revoked'});
 assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:r.id}),/lisansı/);
}));
test('Sicil zorunlu alan, bağımsız inceleme ve kurum sınırını uygular',()=>use(f=>{
 const fields=Object.fromEntries(registryFields['data-flow'].map(k=>[k,'Sentetik '+k]));
 assert.throws(()=>f.run('admin','registry-draft',{unit:'engineering',type:'data-flow',title:'Veri akışı',fields:{}}),/zorunlu/);
 const r=f.run('admin','registry-draft',{unit:'engineering',type:'data-flow',title:'Veri akışı',fields});
 assert.throws(()=>f.run('admin','registry-review',{recordId:r.id,outcome:'accepted',reason}),/kendi/);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin"]','reviewer');
 const review=f.run('reviewer','registry-review',{recordId:r.id,outcome:'accepted',reason});
 assert.equal(review.official,false);
 assert.equal(f.core.view(f.context('student')).registry.length,0);
 assert.equal(f.core.view(f.context('reviewer')).registry.length,1);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('health','reviewer');
 assert.equal(f.core.view(f.context('reviewer')).registry.length,0);
}));
test('Tüm sicil türleri hakları ayrı tutar; kaydetme dış servisi etkinleştirmez',()=>use(f=>{
 for(const [type,keys]of Object.entries(registryFields)){
  const fields=Object.fromEntries(keys.map(k=>[k,'İzole test kaydı '+k]));
  const r=f.run('admin','registry-draft',{unit:'engineering',type,title:'Yerel kabul sicili',fields});
  assert.equal(r.state,'draft');assert.equal(r.official,false);
 }
 assert.equal(f.s.list('test-gazi','registry').length,5);
 assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
