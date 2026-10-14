import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {use} from './helpers/myys-fixture.mjs';
import {localMaterialSetup,materialReason as reason} from './helpers/local-material.mjs';
import {materialCatalog,materialFiles} from '../myys/material-catalog.mjs';
import {hash,LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {materialReady} from '../myys/material.mjs';
import {subjectExport} from '../myys/privacy.mjs';
const download=(x,extra={})=>({planId:x.plan.id,lessonId:'P01-L01',format:'slides',operation:'download',...extra});
const blocked=(f,x)=>assert.throws(()=>f.run('student','material-download',download(x)),e=>e.status===409);
test('B25 tek içerik kaynağı 6 koleksiyon 22 modül 66 dersi ve 88 mevcut özgün dosyanın baytlarını korur',()=>{
 const cats=materialCatalog();assert.equal(cats.length,6);assert.equal(cats.flatMap(c=>c.modules).length,22);assert.equal(cats.flatMap(c=>c.lessons).length,66);const files=new Set();
 for(const c of cats)for(const l of c.lessons){assert.equal(l.language,'Türkçe');assert.equal(l.reviewState,'not-institutionally-reviewed');for(const f of materialFiles(c.id,l.id)){files.add(f.name);assert.equal(f.content,readFileSync(new URL('../../content/'+f.name,import.meta.url),'utf8'));assert.equal(hash(f.content),f.sha256);assert.ok(c.refs.every(r=>r.delivery==='publisher-link-only'&&!r.copyAuthorized));}}
 assert.equal(files.size,88);
});
test('B05/B25 kişi→program→ders teslimi→ürün→rubrik→karar bağı ve durdurma sonrası eski dayanak korunur',()=>use(f=>{
 const x=localMaterialSetup(f),r=f.run('student','material-download',download(x));assert.equal(r.file.sha256,r.sha256);assert.equal(r.enrollmentId,x.e.id);assert.equal(r.published,false);
 const ev=f.run('student','evidence',{enrollmentId:x.e.id,taskId:'T1',materialDeliveryId:r.id,content:reason});assert.equal(ev.material.lessonId,'P01-L01');
 f.run('admin','material-hold',{planId:x.plan.id,reason});blocked(f,x);
 const a=f.run('teacher','assess',{enrollmentId:x.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason});const d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});assert.deepEqual(d.evidenceDigests[0].material,ev.material);assert.deepEqual(f.s.get('test-gazi','evidence',ev.id),ev);
 const exported=subjectExport(f.core,f.context('student')).payload;assert.equal(exported.records['material-delivery'][0].lessonId,'P01-L01');assert.equal(JSON.stringify(exported).includes(r.file.content),false);
}));
test('B05 iki ayrı insan incelemesi ve tüm derslerde dört kontrol olmadan teslim yok',()=>use(f=>{
 const x=localMaterialSetup(f,{approved:false});blocked(f,x);assert.throws(()=>f.run('author','material-review',{planId:x.plan.id,outcome:'accepted',checks:x.checks,reason}),e=>e.status===403);
 for(const checks of [x.checks.slice(1),[...x.checks.slice(1),x.checks[1]],x.checks.map((c,i)=>i?c:{...c,accessibility:false})])assert.throws(()=>f.run('reviewer','material-review',{planId:x.plan.id,outcome:'accepted',checks,reason}));
 f.run('reviewer','material-review',{planId:x.plan.id,outcome:'rejected',checks:x.checks.map((c,i)=>i?c:{...c,accessibility:false}),reason});blocked(f,x);
}));
test('B25 yanlış program materyali, eksik/çift ders, yabancı görev ve yanlış sicil sürümü reddedilir',()=>use(f=>{
 const x=localMaterialSetup(f,{prepared:false});for(const extra of [{catalogDigest:'0'.repeat(64)},{catalogId:'P06'},{registryId:'foreign'}, {lessons:x.input.lessons.slice(1)}, {lessons:[...x.input.lessons.slice(1),x.input.lessons[1]]},{lessons:x.input.lessons.map((l,i)=>i?l:{...l,lessonId:'P06-L01'})},{lessons:x.input.lessons.map((l,i)=>i?l:{...l,taskIds:['unknown']})}])assert.throws(()=>f.run('author','material-plan',{...x.input,...extra}));
 const plan=f.run('author','material-plan',x.input);assert.throws(()=>f.run('author','material-rights',{planId:plan.id,...x.rights}),e=>e.status===403);for(const extra of [{brand:true},{api:true},{externalCopy:true},{sourceReference:''},{readConfirmed:false},{copying:false,republishing:true}])assert.throws(()=>f.run('admin','material-rights',{planId:plan.id,...x.rights,...extra}));
}));
test('B05 kayıtlı olmayan öğrenen, başka görev, başka kişi teslimi ve harici dosya indirmesi kapalı',()=>use(f=>{
 const x=localMaterialSetup(f),r=f.run('student','material-download',download(x));assert.throws(()=>f.run('other','material-download',download(x)),e=>e.status===404);assert.equal(f.core.view(f.context('other')).materials.plans.length,0);
 for(const extra of [{lessonId:'P06-L01'},{format:'pptx'},{lessonId:'../P01-L01'}])assert.throws(()=>f.run('student','material-download',download(x,extra)),e=>e.status===404);
 const e=f.run('author','enroll',{programId:x.p.id,learnerId:'other'});assert.throws(()=>f.run('other','evidence',{enrollmentId:e.id,taskId:'T1',materialDeliveryId:r.id,content:reason}),e=>e.status===404);
 const staff=f.run('teacher','material-download',download(x));assert.equal(staff.enrollmentId,null);assert.throws(()=>f.run('student','evidence',{enrollmentId:x.e.id,taskId:'T1',materialDeliveryId:staff.id,content:reason}),e=>e.status===404);
}));
test('B05 yeniden yayın hazırlığı ayrı izne ve koordinatöre bağlı; gerçek yayın ve dış kopya yok',()=>use(f=>{
 const x=localMaterialSetup(f);assert.throws(()=>f.run('author','material-download',download(x,{operation:'republication-package'})),e=>e.status===403);
 const plan=f.run('author','material-plan',{...x.input,previousId:x.plan.id,changeReason:reason});f.run('admin','material-rights',{planId:plan.id,...x.rights,republishing:true});f.run('reviewer','material-review',{planId:plan.id,checks:x.checks,outcome:'accepted',reason});
 const args=download({plan},{operation:'republication-package'});assert.throws(()=>f.run('student','material-download',args),e=>e.status===403);const r=f.run('author','material-download',args);assert.equal(r.published,false);assert.equal(r.externalMaterialsIncluded,false);assert.equal(r.file.format,'slides');
}));
test('B25 yeni taslak eski indirmeyi kapatır; kayıt ve notları sessizce yeni sürüme taşımaz',()=>use(f=>{
 const x=localMaterialSetup(f);const r=f.run('student','material-download',download(x));f.run('author','material-plan',{...x.input,previousId:x.plan.id,changeReason:reason});blocked(f,x);assert.throws(()=>f.run('student','evidence',{enrollmentId:x.e.id,taskId:'T1',materialDeliveryId:r.id,content:reason}),e=>e.status===409);assert.equal(f.s.get('test-gazi','enrollment',x.e.id).programId,x.p.id);assert.equal(f.s.list('test-gazi','material-delivery').length,1);
}));
test('B05 her indirmede süre, hak sahibi ve incelemecinin güncel rolü yeniden denetlenir',()=>use(f=>{
 const x=localMaterialSetup(f),original=f.core.clock;f.core.clock=()=>x.plan.validUntil;blocked(f,x);f.core.clock=original;
 for(const who of ['author','admin','authority','reviewer']){f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run(who);blocked(f,x);f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run(who);}
 assert.equal(materialReady(f.s,'test-gazi',x.plan,f.core.clock()),true);
}));
test('B05 idempotent indirme gövdesi komut kaydında saklanmaz; aynı istek güncel durdurmayı aşamaz',()=>use(f=>{
 const x=localMaterialSetup(f),key=randomUUID(),input=download(x),r=f.run('student','material-download',input,key);assert.deepEqual(f.run('student','material-download',input,key),r);const raw=f.s.db.prepare('SELECT result FROM commands WHERE id=?').get(key).result;assert.equal(raw.includes('file'),false);assert.equal(raw.includes(r.file.content),false);assert.equal(f.s.list('test-gazi','material-delivery').length,1);
 f.run('admin','material-hold',{planId:x.plan.id,reason});assert.throws(()=>f.run('student','material-download',input,key),e=>e.status===409);f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('student');assert.throws(()=>f.run('student','material-download',input,key),e=>e.status===403);
}));
test('B05 ikinci SQLite bağlantısı durdurmayı eski oturum ve aynı indirme kimliğinde görür',()=>use(f=>{
 const x=localMaterialSetup(f),key=randomUUID(),input=download(x);f.run('student','material-download',input,key);const s=new LocalAcceptanceStore(f.path),core=new MyysCore(s);try{f.run('reviewer','material-hold',{planId:x.plan.id,reason});assert.throws(()=>core.run({...f.context('student'),commandId:key,action:'material-download',input}),e=>e.status===409);}finally{s.close();}
}));
test('B05 denetim hatası teslim ve komut kaydını birlikte geri alır',()=>use(f=>{
 const x=localMaterialSetup(f);f.s.db.exec("CREATE TRIGGER material_fail BEFORE INSERT ON audit WHEN NEW.action='material-download' BEGIN SELECT RAISE(ABORT,'synthetic'); END");const key=randomUUID();assert.throws(()=>f.run('student','material-download',download(x),key));assert.equal(f.s.list('test-gazi','material-delivery').length,0);assert.equal(f.s.db.prepare('SELECT * FROM commands WHERE id=?').get(key),undefined);
}));
test('B05 üretim ortamı kapalı kalır; mevcut canlı çekirdek etkinleştirilmez',()=>use(f=>{const x=localMaterialSetup(f);process.env.VERCEL='1';try{assert.throws(()=>f.run('student','material-download',download(x)),e=>e.status===503);}finally{delete process.env.VERCEL;}}));
test('B25 ayrı kalite görevlisi hak verilmiş dosyayı onaydan önce inceler; bu teslim öğrenen kanıtı olmaz',()=>use(f=>{
 const x=localMaterialSetup(f,{approved:false}),input=download(x,{operation:'review'}),key=randomUUID(),r=f.run('reviewer','material-download',input,key);assert.equal(r.reviewId,null);assert.equal(r.enrollmentId,null);blocked(f,x);assert.throws(()=>f.run('student','material-download',input),e=>e.status===403);assert.throws(()=>f.run('student','evidence',{enrollmentId:x.e.id,taskId:'T1',materialDeliveryId:r.id,content:reason}),e=>e.status===404);
 f.run('reviewer','material-review',{planId:x.plan.id,checks:x.checks,outcome:'accepted',reason});assert.deepEqual(f.run('reviewer','material-download',input,key),r);f.run('admin','material-hold',{planId:x.plan.id,reason});assert.throws(()=>f.run('reviewer','material-download',input,key),e=>e.status===409);
}));
