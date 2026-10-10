import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {importJWK} from 'jose';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {signApproved,verifyApproved,verifyWithKeyring,prepareBatch} from '../myys/credentials.mjs';
import {myysRoute} from '../myys/http.mjs';
import {qualityMetrics,skillsProjection} from '../myys/projections.mjs';

import {use} from './helpers/myys-fixture.mjs';
const reason='İtiraz kapsamında ek bir akademik inceleme talep ediyorum.';

test('Kişi kimliği e-postadan bağımsız; kurum ve süreli üyelik zorunlu',()=>use(f=>{
 assert.equal(f.core.view(f.context('student')).personId,'student');
 assert.throws(()=>f.core.view({...f.context('student'),tenant:'other-tenant'}),/üyeliği/);
 f.s.db.prepare('UPDATE memberships SET expires=? WHERE person=?').run('2000-01-01','student');
 assert.throws(()=>f.core.view(f.context('student')),/üyeliği/);
}));
test('Pilot oturumu kişi eşlemesi olmadan yetki vermez; ayrılan kişi hemen reddedilir',()=>use(f=>{
 assert.throws(()=>f.core.view({...f.context('student'),sessionHash:hash('unknown')}),/Kişiye bağlı/);
 f.s.db.prepare('UPDATE persons SET active=0 WHERE id=?').run('student');
 assert.throws(()=>f.core.view(f.context('student')),/Kişiye bağlı/);
}));
test('MFA yoksa ayrıcalıklı işlem reddedilir; yönetici kendiliğinden akademik yetki almaz',()=>use(f=>{
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('author');assert.throws(f.program,/yetkiniz/);
 const p={unit:'engineering'};assert.throws(()=>f.run('admin','decide',p));
}));
test('Programda çıktı, görev, rubrik ve dört sorumluluk gerekli; hazırlayan kendi sürümünü yayımlayamaz',()=>use(f=>{
 const p=f.program();f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["coordinator","commission"]','author');
 assert.throws(()=>f.run('author','publish',{programId:p.id,reason}),/Hazırlayan/);
 assert.throws(()=>f.run('author','program',{...p,rubric:[]}),/Rubrik/);
 assert.throws(()=>f.run('author','program',{...p,mode:'official'}),/Resmî/);
}));
test('Kurum ve birim izolasyonu kayıt kimliği bilinse de uygulanır',()=>use(f=>{
 const {e}=f.setup();assert.throws(()=>f.run('other','evidence',{enrollmentId:e.id,taskId:'T1',content:reason}),/erişilemiyor/);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('health','teacher');
 assert.throws(()=>f.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[],scores:[],reason}),/erişilemiyor/);
}));
test('Null kanıt, eksik görev, eksik puan ve istemci başarı bayrağı belgeye ilerleyemez',()=>use(f=>{
 const {e}=f.setup();assert.throws(()=>f.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:null}));
 assert.throws(()=>f.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:reason,verified:true}),/istemciden/);
 assert.throws(()=>f.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[],scores:[{criterionId:'R1',score:4,reason}],reason,passed:true}),/zorunlu/);
 const ev=f.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:reason});
 assert.throws(()=>f.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:null,reason}],reason}),/puan/);
}));
test('İkinci onay başarısız değerlendirmeyi başarıya dönüştüremez',()=>use(f=>{
 const x=f.setup(),{a}=f.assess(x,1);assert.equal(a.passed,false);
 assert.throws(()=>f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason}),/Başarısız/);
}));
test('Değerlendirici aynı dosyanın kararını veremez',()=>use(f=>{
 const x=f.setup(),{a}=f.assess(x);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["instructor","commission"]','teacher');
 assert.throws(()=>f.run('teacher','decide',{assessmentId:a.id,outcome:'approved',reason}),/Bağımsız/);
}));
test('Başarı, karar ve ihraç ayrı kalıcı olaylardır; süreç yeniden açıldığında aynı kanıt korunur',()=>use(f=>{
 const {d,ev}=f.passed();assert.equal(f.s.list('test-gazi','issuance').length,0);
 const r=f.run('issuer','issue',{decisionId:d.id});assert.equal(r.state,'awaiting-signature');
 const second=new LocalAcceptanceStore(f.path);assert.equal(second.get('test-gazi','evidence',ev.id).sha256,hash(ev.content));second.close();
 assert.throws(()=>f.s.db.prepare('UPDATE records SET owner=?').run('attacker'),/immutable/);
}));
test('Aynı olay on defa gelince tek kayıt; farklı içerik aynı anahtarla çakışır',()=>use(f=>{
 const {d}=f.passed(),key=randomUUID();const first=f.run('issuer','issue',{decisionId:d.id},key);
 for(let i=0;i<10;i++)assert.equal(f.run('issuer','issue',{decisionId:d.id},key).id,first.id);
 assert.equal(f.s.list('test-gazi','issuance').length,1);
 assert.throws(()=>f.run('issuer','issue',{decisionId:'different'},key),/farklı içerikle/);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it"]','issuer');
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id},key),/yetkiniz/);
}));
test('Açık itiraz ve yeniden değerlendirme ihraç kapısını kapatır; eski karar silinmez',()=>use(f=>{
 const {d}=f.passed(),appeal=f.run('student','appeal',{decisionId:d.id,reason});
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id}),/itiraz/);
 f.run('reviewer','resolve',{appealId:appeal.id,outcome:'reassessment',reason});
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id}),/yeniden/);
 assert.equal(f.s.get('test-gazi','decision',d.id).outcome,'approved');
}));
test('Kişisel kayıt varsayılan özel; süreli paylaşım özel kanıtı sızdırmaz, iptal erişimi keser',()=>use(f=>{
 const {d}=f.passed(),r=f.run('issuer','issue',{decisionId:d.id});
 assert.equal(f.core.view(f.context('other')).issuances.length,0);
 const share=f.run('student','share',{issuanceId:r.id,hours:1,purpose:'Yerel kabul paylaşım denemesi'});
 const output=f.core.shared({tenant:'test-gazi',token:share.token});assert.deepEqual(Object.keys(output).sort(),['issuer','official','pilot','state','title']);
 f.run('student','unshare',{shareId:share.id});assert.throws(()=>f.core.shared({tenant:'test-gazi',token:share.token}),/sona erdi/);
}));
test('Merkezi SEM yolu yerel rozet düzenleyemez',()=>use(f=>{
 const original=f.program();const p=f.run('author','program',{...original,code:'SEM',pathway:'sem-central'});
 f.run('publisher','publish',{programId:p.id,reason});const e=f.run('author','enroll',{programId:p.id,learnerId:'student'});
 const {a}=f.assess({e});const d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id}),/Merkezi SEM/);
}));
test('Teknik destek kanıt, puan veya akademik kararı değiştiremez',()=>use(f=>{
 const {d}=f.passed();assert.throws(()=>f.run('it','issue',{decisionId:d.id}),/erişilemiyor|yetkiniz/);
 const r=f.run('student','support',{unit:'engineering',subject:'Ders görünümü',message:reason,category:'technical'});assert.equal(r.state,'open');
}));
test('Karara bağlı gerçek kriptografik imza; kurcalama ve sonradan iptal reddedilir',()=>use(async f=>{
 const {d}=f.passed(),r=f.run('issuer','issue',{decisionId:d.id});const base='https://local-acceptance.invalid';
 const keys=generateKeyPairSync('rsa',{modulusLength:2048});const jwk=keys.privateKey.export({format:'jwk'});jwk.kid=base+'/api/rozet/anahtarlar#test';
 const material={privateKey:await importJWK(jwk,'RS256'),jwk:{...keys.publicKey.export({format:'jwk'}),kid:jwk.kid}};
 const signed=await signApproved(f.core,f.context('issuer'),r.id,material,base);
 assert.equal(signed.credential.academicDecision.id,d.id);
 assert.equal((await verifyApproved(f.core,f.context('student'),signed.jwt,material,base)).valid,true);
 const parts=signed.jwt.split('.');parts[1]=Buffer.from(JSON.stringify({...signed.credential,name:'Değiştirildi'})).toString('base64url');
 assert.equal((await verifyApproved(f.core,f.context('student'),parts.join('.'),material,base)).valid,false);
 await assert.rejects(()=>verifyApproved(f.core,f.context('other'),signed.jwt,material,base));
 f.run('issuer','revoke',{issuanceId:r.id,reason:'İzole kabul testi sonunda ihraç yetkisi iptal edildi.'});
 assert.equal((await verifyApproved(f.core,f.context('student'),signed.jwt,material,base)).valid,false);
}));
test('Kişisel kurulum yoksa HTTP uçları 503 ile kapalı kalır; pilot rol alanı kabul edilmez',async()=>{
 let status,data;const res={},json=(_,s,d)=>{status=s;data=d;};
 await myysRoute({req:{method:'POST'},path:'/api/myys/islem',b:{role:'admin'},sessionHash:'valid-pilot',res,json,core:null});
 assert.equal(status,503);assert.equal(data.code,'institution_setup_required');
});


test('Toplu hazırlık kısmi hatayı gizlemez; yinelenen satır ikinci belge sayılmaz',()=>use(f=>{
 const {d}=f.passed(),key=randomUUID();
 const batch=prepareBatch(f.core,f.context('issuer'),[{commandId:key,decisionId:d.id},{commandId:key,decisionId:d.id},{commandId:randomUUID(),decisionId:'missing'},null]);
 assert.equal(batch.received,4);assert.equal(batch.prepared,1);assert.equal(batch.signed,0);assert.equal(batch.results.filter(r=>r.status==='rejected').length,2);
}));
test('Anahtar rotasyonu eski güvenilir imzayı korur; kompromize anahtar reddedilir',()=>use(async f=>{
 const {d}=f.passed(),r=f.run('issuer','issue',{decisionId:d.id}),base='https://local-acceptance.invalid';
 const keys=generateKeyPairSync('rsa',{modulusLength:2048}),jwk=keys.privateKey.export({format:'jwk'});jwk.kid=base+'/api/rozet/anahtarlar#old';
 const material={privateKey:await importJWK(jwk,'RS256'),jwk:{...keys.publicKey.export({format:'jwk'}),kid:jwk.kid}};
 const signed=await signApproved(f.core,f.context('issuer'),r.id,material,base);
 assert.equal((await verifyWithKeyring(f.core,f.context('student'),signed.jwt,[{state:'retired',material}],base)).valid,true);
 assert.equal((await verifyWithKeyring(f.core,f.context('student'),signed.jwt,[{state:'compromised',material}],base)).valid,false);
}));
test('İmzalama sürerken yetki çekilirse belge kaydedilmez veya dışarı verilmez',()=>use(async f=>{
 const {d}=f.passed(),r=f.run('issuer','issue',{decisionId:d.id}),base='https://local-acceptance.invalid';
 const keys=generateKeyPairSync('rsa',{modulusLength:2048}),jwk=keys.privateKey.export({format:'jwk'});jwk.kid=base+'/api/rozet/anahtarlar#race';
 const material={privateKey:await importJWK(jwk,'RS256'),jwk:{...keys.publicKey.export({format:'jwk'}),kid:jwk.kid}};
 const signing=signApproved(f.core,f.context('issuer'),r.id,material,base);
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('issuer');
 await assert.rejects(()=>signing);assert.equal(f.s.list('test-gazi','signed').length,0);
}));

test('HTTP çalışma alanı başka öğrenenin kanıtını döndürmez; istemci rolü yetki sağlamaz',()=>use(async f=>{
 f.passed();let status,data;const json=(_,s,d)=>{status=s;data=d;};
 await myysRoute({req:{method:'GET',url:'/api/myys/calisma?kurum=test-gazi'},path:'/api/myys/calisma',sessionHash:hash('other'),res:{},json,core:f.core});
 assert.equal(status,200);assert.equal(data.evidence.length,0);
 await myysRoute({req:{method:'POST'},path:'/api/myys/islem',b:{tenant:'test-gazi',role:'studentAffairs',person:'issuer',commandId:randomUUID(),action:'issue',input:{decisionId:f.s.list('test-gazi','decision')[0].id}},sessionHash:hash('other'),res:{},json,core:f.core});
 assert.equal(status,404);assert.equal(f.s.list('test-gazi','issuance').length,0);
}));

test('Analitik paydaları ve beceri durumu kaynak kayıttan gelir; itiraz kanıtlı öneriyi düşürür',()=>use(f=>{
 const empty=qualityMetrics(f.core.view(f.context('student')));assert.equal(empty.assessmentSuccess.percent,null);
 const {d}=f.passed(),view=f.core.view(f.context('student')),metrics=qualityMetrics(view);
 assert.equal(metrics.assessmentSuccess.denominator,1);assert.equal(metrics.assessmentSuccess.numerator,1);assert.equal(metrics.issuanceAuthorizations,0);assert.equal(metrics.courseCompletion,null);
 assert.equal(skillsProjection(view)[0].state,'assessed');assert.equal(skillsProjection(view)[0].expertTaxonomyApproved,false);
 f.run('student','appeal',{decisionId:d.id,reason});assert.equal(skillsProjection(f.core.view(f.context('student')))[0].state,'developing');
 assert.equal(qualityMetrics(f.core.view(f.context('other'))).enrollments,0);
}));
