import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {programBaseline,stableStringify} from '../myys/program-model.mjs';
import {hash,LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {skillsProjection} from '../myys/projections.mjs';
const reason='Yeni görev ve çıktı ilişkileri akademik inceleme için güncellendi.';
const multi=p=>({...p,code:'MULTI',outcomes:[...p.outcomes,{id:'O2',text:'Veri kaynağının sınırlarını örneklerle açıklar.'}],tasks:[{id:'T1',title:'Ortak analiz görevi',outcomeIds:['O1','O2']},{id:'T2',title:'Kaynak değerlendirme görevi',outcomeIds:['O2']}],rubric:[{id:'R1',title:'Analiz kalitesi',weight:60,outcomeIds:['O1','O2'],taskIds:['T1']},{id:'R2',title:'Kaynak kalitesi',weight:40,outcomeIds:['O2'],taskIds:['T1','T2']}]});
test('çoktan çoğa görev/rubrik puan ağırlığını çoğaltmaz ve tüm görevleri gerektirir',()=>use(f=>{
 const p=f.run('author','program',multi(f.program()));f.run('publisher','publish',{programId:p.id,reason});const e=f.run('author','enroll',{programId:p.id,learnerId:'student'});
 const ev1=f.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:reason}),ev2=f.run('student','evidence',{enrollmentId:e.id,taskId:'T2',content:reason});
 const input={enrollmentId:e.id,evidenceIds:[ev1.id],scores:[{criterionId:'R1',score:4,reason},{criterionId:'R2',score:2,reason}],reason};assert.throws(()=>f.run('teacher','assess',input),e=>e.code==='missing_evidence');
 const a=f.run('teacher','assess',{...input,evidenceIds:[ev1.id,ev2.id]});assert.equal(a.score,80);assert.equal(a.programDigest,hash(stableStringify(programBaseline(p))));
 const d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});const view=f.core.view(f.context('student'));const skills=skillsProjection(view);assert.equal(skills.length,2);assert.ok(skills.every(s=>s.state==='assessed'));assert.equal(decisionArchive(f.core,f.context('student'),d.id).payload.program.version,1);
}));
test('bilinmeyen, tekrarlanan, boş ve çelişkili çıktı ilişkisi reddedilir',()=>use(f=>{
 const p=multi(f.program());for(const bad of [[],['missing'],['O1','O1']])assert.throws(()=>f.run('author','program',{...p,tasks:[{...p.tasks[0],outcomeIds:bad},p.tasks[1]]}),e=>e.code==='tasks');
 assert.throws(()=>f.run('author','program',{...p,tasks:[{...p.tasks[0],outcomeId:'O1'},p.tasks[1]]}),e=>e.code==='tasks');
}));
test('rubrik bilinmeyen görev, kopuk görev ve ilişkisiz görevle yayımlanamaz',()=>use(f=>{
 const p=multi(f.program());for(const links of [[],['unknown'],['T1','T1']])assert.throws(()=>f.run('author','program',{...p,rubric:[{...p.rubric[0],taskIds:links},p.rubric[1]]}),e=>e.code==='rubric_tasks');
 assert.throws(()=>f.run('author','program',{...p,rubric:p.rubric.map(r=>({...r,taskIds:['T1']}))}),e=>e.code==='rubric_tasks');
 assert.throws(()=>f.run('author','program',{...p,rubric:[{...p.rubric[0],outcomeIds:['O1'],taskIds:['T2']},p.rubric[1]]}),e=>e.code==='rubric_tasks');
}));
test('yeni sürüm açık önceki sürüm ve gerekçe gerektirir; yarışan eski yazar reddedilir',()=>use(f=>{
 const p=f.program();assert.throws(()=>f.run('author','program',p),e=>e.code==='version_conflict');assert.throws(()=>f.run('author','program',{...p,previousProgramId:p.id,changeReason:'kısa'}),e=>e.code==='version_conflict');
 const next=f.run('author','program',{...p,previousProgramId:p.id,changeReason:reason,title:'Yeni program açıklaması'});assert.equal(next.version,2);assert.equal(f.s.get('test-gazi','program',p.id).title,p.title);
 assert.throws(()=>f.run('author','program',{...p,previousProgramId:p.id,changeReason:reason}),e=>e.code==='version_conflict');
 assert.throws(()=>f.run('author','program',{...next,code:'OTHER'}),e=>e.code==='version_conflict');
}));
test('yeni program eski öğrenen, rubrik, kanıt ve karar arşivini değiştirmez',()=>use(f=>{
 const x=f.passed(),before=decisionArchive(f.core,f.context('student'),x.d.id);const next=f.run('author','program',{...x.p,previousProgramId:x.p.id,changeReason:reason,rubric:[{...x.p.rubric[0],title:'Yeni ölçüt'}],threshold:90});
 const after=decisionArchive(f.core,f.context('student'),x.d.id);assert.deepEqual(after,before);assert.equal(f.s.get('test-gazi','enrollment',x.e.id).programId,x.p.id);assert.equal(after.payload.assessment.programSnapshot.version,1);
 assert.throws(()=>f.run('author','enroll',{programId:next.id,learnerId:'other'}),e=>e.code==='unpublished');
}));
test('itiraz güncel kullanılabilirliği değiştirir; tarihsel arşiv hashini değiştirmez',()=>use(f=>{
 const x=f.passed(),before=decisionArchive(f.core,f.context('student'),x.d.id);f.run('student','appeal',{decisionId:x.d.id,reason});const after=decisionArchive(f.core,f.context('student'),x.d.id);assert.equal(after.sha256,before.sha256);assert.equal(after.currentUsable,false);assert.equal(after.signed,false);
}));
test('arşiv yalnız yetkili sahip veya birim okuyucusuna açılır',()=>use(f=>{
 const x=f.passed();for(const actor of ['other','it','admin'])assert.throws(()=>decisionArchive(f.core,f.context(actor),x.d.id),e=>e.code==='not_found');assert.ok(decisionArchive(f.core,f.context('teacher'),x.d.id).payload.evidence.length);
 const wrong={...f.context('teacher'),tenant:'other'};assert.throws(()=>decisionArchive(f.core,wrong,x.d.id));
}));
test('ikinci bağlantıda aynı arşiv aynen yeniden üretilir',()=>use(f=>{
 const x=f.passed(),first=decisionArchive(f.core,f.context('student'),x.d.id),s=new LocalAcceptanceStore(f.path);try{assert.deepEqual(decisionArchive(new MyysCore(s),f.context('student'),x.d.id),first);}finally{s.close();}
}));
test('eski tek çıktı biçimindeki kayıtlar değiştirilmeden arşivlenir',()=>use(f=>{
 const x=f.passed();const originalGet=f.s.get.bind(f.s);f.s.get=(tenant,kind,id)=>{const r=originalGet(tenant,kind,id);if(kind==='assessment'&&r){delete r.programSnapshot;delete r.programDigest;}return r;};const archive=decisionArchive(f.core,f.context('student'),x.d.id);assert.equal(archive.payload.program.tasks[0].outcomeId,'O1');assert.ok(archive.sha256);
}));
test('bozuk eski kanıt veya program dayanağı kabul edilmez',()=>use(f=>{
 const x=f.passed(),get=f.s.get.bind(f.s);f.s.get=(t,k,id)=>{const r=get(t,k,id);return k==='program'&&r?{...r,title:'Beklenmeyen içerik değişikliği'}:r;};assert.throws(()=>decisionArchive(f.core,f.context('student'),x.d.id),e=>e.code==='archive_integrity');
 f.s.get=(t,k,id)=>{const r=get(t,k,id);return k==='evidence'&&r?{...r,content:'bozuk'}:r;};assert.throws(()=>decisionArchive(f.core,f.context('student'),x.d.id),e=>e.code==='archive_integrity');
}));
