import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localWalletStudySetup,walletStudyReason as reason} from './helpers/local-wallet-study.mjs';
import {hash} from '../myys/store.mjs';
const view=(f,who='student')=>f.core.view(f.context(who)).walletStudy;
const review=(f,x,who='it',discipline='technical',outcome='accepted')=>f.run(who,'wallet-study-review',{studyId:x.study.id,discipline,outcome,reason});
const academic=f=>hash(JSON.stringify(f.s.db.prepare("SELECT * FROM records WHERE kind IN ('program','enrollment','evidence','assessment','decision','issuance','signed') ORDER BY rowid").all()));
test('Keşif somut ihtiyaç, tam sicil amaç/yetki ve bütün alternatifleri gerektirir',()=>use(f=>{
 const x=localWalletStudySetup(f,{prepared:false});for(const patch of [{need:''},{purpose:'Başka amaçla bağlı olmayan cüzdan keşfi.'},{authorityId:x.input.dataFlowId},{alternatives:x.input.alternatives.slice(1)},{alternatives:[x.input.alternatives[0],x.input.alternatives[0],x.input.alternatives[2]]},{reviewOn:'2026-02-30'}])assert.throws(()=>f.run('admin','wallet-study',{...x.input,...patch}));
 const s=f.run('admin','wallet-study',x.input);assert.equal(s.version,1);assert.equal(s.externalChecks.length,5);assert.ok(s.externalChecks.every(c=>c.state==='not-run'));
}));
test('Kişisel veri/ham belge/bağlantı/başarı iddiası veya zincir seçimi açılamaz',()=>use(f=>{
 const x=localWalletStudySetup(f,{prepared:false});for(const patch of [{onChainPersonalData:true},{chainWriteEnabled:true},{externalWalletAccepted:true},{activate:true},{credential:'private-credential'},{recommendation:'activate'},{recommendation:'study-offchain',selectedOption:'chain'},{alternatives:x.input.alternatives.map(a=>({...a,credentialHash:'correlatable'}))}])assert.throws(()=>f.run('admin','wallet-study',{...x.input,...patch}));
 const s=f.run('admin','wallet-study',{...x.input,recommendation:'study-offchain',selectedOption:'open-protocol'});assert.equal(s.chainWriteEnabled,false);assert.equal(s.externalTransportEnabled,false);assert.equal(s.institutionNeedApproved,false);
}));
test('İki ayrı teknik ve mahremiyet incelemecisi gerekir; yerel kabul gerçek protokol testi yapmaz',()=>use(f=>{
 const x=localWalletStudySetup(f,{reviewed:false});assert.equal(view(f).studies.length,0);review(f,x);assert.equal(view(f).studies.length,0);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it","quality"]','it');assert.throws(()=>review(f,x,'it','privacy'),e=>e.code==='separation');
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','admin');assert.throws(()=>review(f,x,'admin','privacy'),e=>e.code==='separation');
 review(f,x,'reviewer','privacy');const s=view(f).studies[0];assert.equal(s.current,true);assert.equal(s.externalWalletAccepted,false);assert.equal(s.owner,undefined);assert.equal(s.dependencies,undefined);assert.ok(s.externalChecks.every(c=>c.realWallet===false));
}));
test('Ret yeni sürüm gerektirir; eski kayıt değişmez ve eski onay yeni sürüme taşınmaz',()=>use(f=>{
 const x=localWalletStudySetup(f,{reviewed:false});review(f,x,'it','technical','rejected');review(f,x,'reviewer','privacy');assert.equal(view(f).studies.length,0);assert.throws(()=>review(f,x),e=>e.code==='wallet_study_changed'||e.code==='separation');
 const s=f.run('admin','wallet-study',{...x.input,previousId:x.study.id,changeReason:reason,recommendation:'study-offchain',selectedOption:'private-wallet'});assert.equal(s.version,2);assert.equal(view(f,'admin').studies[1].reviews.length,0);assert.equal(view(f,'admin').studies[0].reviews[0].outcome,'rejected');
}));
test('Yeni taslak, süre ve durdurma güncel keşif önerisini kapatır; akademik kayıt korunur',()=>use(f=>{
 const x=localWalletStudySetup(f),before=academic(f);f.run('reviewer','wallet-study-hold',{studyId:x.study.id,reason});assert.equal(view(f).studies[0].current,false);
 const s=f.run('admin','wallet-study',{...x.input,previousId:x.study.id,changeReason:reason});review(f,{study:s});review(f,{study:s},'reviewer','privacy');assert.equal(view(f).studies[1].current,true);
 f.core.clock=()=>new Date(Date.parse(s.reviewOn)+2*86400000).toISOString();assert.equal(view(f).studies.some(s=>s.current),false);assert.equal(academic(f),before);
}));
test('Başka öğrenen/birim/kurum göremez; mevcut rol ve MFA tekrar denetlenir',()=>use(f=>{
 const x=localWalletStudySetup(f);assert.equal(view(f,'other').studies.length,0);assert.equal(view(f,'teacher').studies.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('another-unit','it');assert.equal(view(f,'it').studies.length,0);
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('admin'));assert.equal(view(f,'admin').programs.length,0);assert.throws(()=>f.run('admin','wallet-study',{...x.input,previousId:x.study.id,changeReason:reason}),e=>e.status===404);
}));
test('Komut tekrarı tek kayıt döndürür; denetim hatasında inceleme ve sonuç geri alınır',()=>use(f=>{
 const x=localWalletStudySetup(f,{prepared:false});x.study=f.run('admin','wallet-study',x.input,'study-once');assert.equal(f.run('admin','wallet-study',x.input,'study-once').id,x.study.id);assert.throws(()=>f.run('admin','wallet-study',x.input),e=>e.code==='wallet_study_changed');
 f.s.db.exec("CREATE TRIGGER study_audit_fail BEFORE INSERT ON audit WHEN NEW.action='wallet-study-review' BEGIN SELECT RAISE(ABORT,'synthetic'); END");assert.throws(()=>review(f,x));assert.equal(view(f,'it').studies[0].reviews.length,0);f.s.db.exec('DROP TRIGGER study_audit_fail');review(f,x);review(f,x,'reviewer','privacy');assert.equal(view(f).studies[0].current,true);
}));
test('Vercel ortamında yerel keşif komutu üretim bağlantısı açamaz',()=>use(f=>{
 const x=localWalletStudySetup(f,{prepared:false}),old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>f.run('admin','wallet-study',x.input),e=>e.code==='local_only');}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
