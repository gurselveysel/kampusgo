import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localCredentialProfile} from './helpers/local-credential-profile.mjs';
import {exportProgramPackage} from '../myys/program-package.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {programBaseline,stableStringify} from '../myys/program-model.mjs';
import {hash} from '../myys/store.mjs';
const reason='Sentetik program bilgi paketi kabulü, gerçek kurum veya lisans onayı değildir.';
const code=c=>e=>e.code===c;
const status=(f,p,who='author')=>f.core.view(f.context(who)).programs.find(r=>r.id===p.id)?.packageStatus;
const download=(f,p,who='author')=>exportProgramPackage(f.core,f.context(who),p.id);
test('B03 program, iş yükü, rubrik, eğitici, lisans beyanı ve belge profili aynı pakette bağlıdır',()=>use(f=>{
 const x=f.passed(),out=download(f,x.p),p=f.s.list('test-gazi','credential-profile')[0];assert.deepEqual(out.payload.program,programBaseline(x.p));assert.equal(out.payload.credentialProfile.id,p.id);assert.equal(out.payload.credentialProfile.authorityDossierId,p.authorityDossierId);assert.equal(out.sha256,hash(stableStringify(out.payload)));assert.equal(out.payload.programDigest,hash(stableStringify(programBaseline(x.p))));assert.equal(status(f,x.p).checks.every(c=>c.ready),true);assert.equal(out.official,false);assert.equal(out.signed,false);assert.equal(out.licenseRightsVerified,false);assert.equal(out.institutionApproved,false);
}));
test('B03 yalnız program incelemesi tam bilgi paketi sayılmaz; eksik profil indirmeyi kapatır',()=>use(f=>{
 const p=f.program();assert.equal(status(f,p).state,'needs-review');assert.throws(()=>download(f,p),code('program_package_blocked'));f.run('publisher','publish',{programId:p.id,reason});assert.equal(status(f,p).checks.find(c=>c.key==='publication').ready,true);assert.equal(status(f,p).checks.find(c=>c.key==='profile').ready,false);assert.throws(()=>download(f,p),code('program_package_blocked'));localCredentialProfile(f,p);assert.equal(status(f,p).state,'local-ready');assert.ok(download(f,p).payload.credentialProfile);
}));
test('B03 kişi/üyelik/MFA sınırı indirmede yeniden aranır; idari ekler ve görevli listesi dışarı çıkmaz',()=>use(f=>{
 const x=f.passed(),out=download(f,x.p),encoded=f.s.list('test-gazi','authority-file')[0].base64;assert.equal(JSON.stringify(out).includes(encoded),false);assert.equal(out.payload.credentialProfile.issuerPeople,undefined);assert.equal(out.payload.credentialProfile.createdBy,undefined);assert.equal(out.payload.publication.createdBy,undefined);for(const who of ['student','other','admin','it'])assert.throws(()=>download(f,x.p,who),code('not_found'));assert.equal(status(f,x.p,'student').canDownload,false);assert.equal(status(f,x.p,'student').state,'local-ready');
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('author');assert.throws(()=>download(f,x.p),code('not_found'));assert.equal(status(f,x.p).canDownload,false);
}));
test('B03 incelemeci veya belge görevlisi üyelik kaybı, profil ve yetki dosyası durdurması yeni paketi kapatır',()=>use(f=>{
 const x=f.passed();for(const person of ['publisher','authority','issuer']){f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run(person);assert.throws(()=>download(f,x.p),code('program_package_blocked'));f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run(person);}
 const profile=f.s.list('test-gazi','credential-profile')[0];f.run('publisher','credential-profile-hold',{profileId:profile.id,reason});assert.equal(status(f,x.p).state,'needs-review');assert.throws(()=>download(f,x.p),code('program_package_blocked'));
}));
test('B03 yeni program eski öğrenci arşivini ve indirilmiş paketi değiştirmez; yeni sürüm eksik başlar',()=>use(f=>{
 const x=f.passed(),before=download(f,x.p),archive=decisionArchive(f.core,f.context('student'),x.d.id),next=f.run('author','program',{...x.p,previousProgramId:x.p.id,changeReason:reason,license:reason});assert.equal(status(f,next).state,'needs-review');assert.throws(()=>download(f,next),code('program_package_blocked'));assert.equal(download(f,x.p).sha256,before.sha256);assert.equal(decisionArchive(f.core,f.context('student'),x.d.id).sha256,archive.sha256);const d=f.s.list('test-gazi','authority-dossier')[0];f.run('admin','authority-hold',{dossierId:d.id,reason});assert.throws(()=>download(f,x.p),code('program_package_blocked'));assert.equal(before.sha256,hash(stableStringify(before.payload)));
}));
test('B03 merkezi SEM yolu mikro profil gibi sunulmaz; kapalı üretim yolu ihraç veya paket vermez',()=>use(f=>{
 const initial=f.program(),p=f.run('author','program',{...initial,code:'SEM-INFORMATION',pathway:'sem-central'});f.run('publisher','publish',{programId:p.id,reason});assert.equal(status(f,p).state,'central-path');assert.throws(()=>download(f,p),code('program_package_blocked'));const old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>download(f,p),code('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('B03 bozulmuş program veya süresi bitmiş profil bilgi paketi olarak indirilemez',()=>use(f=>{
 const x=f.passed(),get=f.s.get.bind(f.s),list=f.s.list.bind(f.s);f.s.get=(t,k,id)=>{const r=get(t,k,id);return k==='program'&&r?{...r,license:'Değişmiş izinsiz içerik'}:r;};assert.throws(()=>download(f,x.p),code('program_package_blocked'));f.s.get=get;f.core.clock=()=> '2091-01-01T00:00:00.000Z';assert.throws(()=>download(f,x.p),code('program_package_blocked'));f.s.list=list;
}));
