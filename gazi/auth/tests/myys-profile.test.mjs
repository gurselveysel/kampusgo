import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {importJWK} from 'jose';
import {use} from './helpers/myys-fixture.mjs';
import {localCredentialProfile} from './helpers/local-credential-profile.mjs';
import {profileFields,profileFormat,profileSource} from '../myys/credential-profile-model.mjs';
import {signApproved,verifyWithKeyring} from '../myys/credentials.mjs';
import {draftFor,validateDraft,makeCredential} from '../lib/badge-model.mjs';
const reason='Sentetik yerel profil incelemesi; gerçek düzenleme yetkisi oluşturmaz.';
const match=code=>e=>e.code===code;
const input=(p,authority)=>({programId:p.id,authorityId:authority.id,mode:'local-acceptance',sourceVersion:profileSource.version,format:profileFormat,acknowledgedFields:profileFields.map(f=>f.key),issuerPeople:['issuer'],expires:'2028-01-01T00:00:00.000Z',reason,scopeReference:reason});
const revise=(f,x,patch={})=>f.run('admin','credential-profile',{...input(x.p,x.authority),previousId:x.profile.id,changeReason:reason,...patch});
const approve=(f,p)=>f.run('publisher','credential-profile-review',{profileId:p.id,outcome:'accepted',reason});
const material=async()=>{const k=generateKeyPairSync('rsa',{modulusLength:2048}),kid='https://local-acceptance.invalid/api/rozet/anahtarlar#profile';return {privateKey:await importJWK(k.privateKey.export({format:'jwk'}),'RS256'),jwk:{...k.publicKey.export({format:'jwk'}),kid}};};
test('B12 geçerli karar profil olmadan ihraç edilemez; incelenmiş profil tüm dayanakları bağlar',()=>use(f=>{
 const x=f.passed({withProfile:false});assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_required'));const {profile}=localCredentialProfile(f,x.p,{reviewed:false});assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_blocked'));approve(f,profile);const r=f.run('issuer','issue',{decisionId:x.d.id});assert.equal(r.profileId,profile.id);assert.equal(r.authorityId,profile.authorityId);assert.equal(r.fieldKeys.length,11);assert.equal(r.pilot,true);assert.equal(f.core.view(f.context('issuer')).decisions[0].canIssue,false);
}));
test('B12 eksik/tekrarlı alan, bilinmeyen görevli, geçmiş süre, yanlış kaynak ve resmî mod reddedilir',()=>use(f=>{
 const p=f.program(),x=localCredentialProfile(f,p);for(const patch of [{acknowledgedFields:[]},{acknowledgedFields:profileFields.map(()=>profileFields[0].key)},{issuerPeople:['absent']},{issuerPeople:['issuer','issuer']},{expires:'2020-01-01T00:00:00.000Z'},{sourceVersion:'invented'},{mode:'official'},{official:true},{format:'unknown'}])assert.throws(()=>revise(f,{p,...x},patch));assert.equal(f.s.list('test-gazi','credential-profile').length,1);
}));
test('B12 yetki sicilinin program sorumlulukları ve ayrı incelemesi zorunludur',()=>use(f=>{
 const p=f.program(),r=f.run('admin','registry-draft',{unit:p.unit,type:'institution-authority',title:'Sentetik eksik eşleşme',fields:{...p.responsibilities,legalIssuer:'Farklı kurum sicili',pathway:p.pathway,authorityReference:reason}});assert.throws(()=>f.run('admin','credential-profile',input(p,r)),match('issuer_registry'));f.run('authority','registry-review',{recordId:r.id,outcome:'accepted',reason});assert.throws(()=>f.run('admin','credential-profile',input(p,r)),match('issuer_registry'));
}));
test('B12 hazırlayan/atanmış belge görevlisi profili inceleyemez; kurum ve birim ayrımı korunur',()=>use(f=>{
 const p=f.program(),x=localCredentialProfile(f,p,{reviewed:false});f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","commission"]','admin');assert.throws(()=>f.run('admin','credential-profile-review',{profileId:x.profile.id,outcome:'accepted',reason}),match('separation'));f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["studentAffairs","commission"]','issuer');assert.throws(()=>f.run('issuer','credential-profile-review',{profileId:x.profile.id,outcome:'accepted',reason}),match('separation'));f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('arts','publisher');assert.throws(()=>approve(f,x.profile),match('not_found'));assert.equal(f.core.view(f.context('publisher')).credentialProfiles.profiles.length,0);assert.throws(()=>f.core.run({...f.context('admin'),tenant:'other',commandId:randomUUID(),action:'credential-profile',input:input(p,x.authority)}),match('identity_tenant'));
}));
test('B12 yeni taslak yeni ihraçları kapatır; güncel sürüm incelenince yeni profil bağlanır',()=>use(f=>{
 const x=f.passed(),profile=f.s.list('test-gazi','credential-profile')[0],authority=f.s.get('test-gazi','registry',profile.authorityId),next=revise(f,{...x,profile,authority});assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_blocked'));assert.throws(()=>revise(f,{...x,profile,authority}),match('profile_changed'));approve(f,next);const r=f.run('issuer','issue',{decisionId:x.d.id});assert.equal(r.profileVersion,2);assert.equal(f.s.list('test-gazi','credential-profile')[0].version,1);
}));
test('B12 program sürümü ve atanmış kişi dışında ihraç yapılamaz',()=>use(f=>{
 const x=f.passed();f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["studentAffairs"]','it');assert.throws(()=>f.run('it','issue',{decisionId:x.d.id}),match('issuer_authority'));const next=f.run('author','program',{...x.p,previousProgramId:x.p.id,changeReason:reason,title:'Yeni program sürümü'});assert.equal(f.s.list('test-gazi','credential-profile').filter(p=>p.programId===next.id).length,0);
}));
test('B12 profil süresi ve yetki incelemecilerinin güncel üyeliği yeniden aranır',()=>use(f=>{
 const x=f.passed();f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('authority');assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_blocked'));f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run('authority');f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('publisher');assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_blocked'));f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run('publisher');f.core.clock=()=> '2090-01-01T00:00:00.000Z';assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),match('profile_blocked'));
}));
test('B12 profil durdurulunca bekleyen imza kapanır; kayıt ve pilot sınırı korunur',()=>use(async f=>{
 const x=f.passed(),r=f.run('issuer','issue',{decisionId:x.d.id});f.run('publisher','credential-profile-hold',{profileId:r.profileId,reason});const m=await material();await assert.rejects(()=>signApproved(f.core,f.context('issuer'),r.id,m,'https://local-acceptance.invalid'),match('profile_blocked'));assert.equal(f.s.list('test-gazi','signed').length,0);assert.equal(f.s.list('test-gazi','revocation').length,0);
}));
test('B12 profil/karar bağları imzalı içerikte yer alır; sonraki profil durdurması eski imzayı kendiliğinden iptal etmez',()=>use(async f=>{
 const x=f.passed(),r=f.run('issuer','issue',{decisionId:x.d.id}),m=await material(),base='https://local-acceptance.invalid',signed=await signApproved(f.core,f.context('issuer'),r.id,m,base);assert.equal(signed.credential.academicDecision.profileId,r.profileId);assert.equal(signed.credential.academicDecision.authorityId,r.authorityId);assert.equal(signed.credential.pilotMetadata.pilot,true);f.run('publisher','credential-profile-hold',{profileId:r.profileId,reason});assert.equal((await verifyWithKeyring(f.core,f.context('student'),signed.jwt,[{state:'active',material:m}],base)).valid,true);
}));
test('B12 denetim hatası profil incelemesini geri alır; komut tekrarında güncel yetki aranır',()=>use(f=>{
 const p=f.program(),x=localCredentialProfile(f,p,{reviewed:false});f.s.db.exec("CREATE TRIGGER reject_profile_audit BEFORE INSERT ON audit WHEN NEW.action='credential-profile-review' BEGIN SELECT RAISE(ABORT,'synthetic profile audit failure'); END;");assert.throws(()=>approve(f,x.profile),/synthetic profile audit failure/);assert.equal(f.s.list('test-gazi','credential-profile-review').length,0);f.s.db.exec('DROP TRIGGER reject_profile_audit');const input={profileId:x.profile.id,outcome:'accepted',reason},id=randomUUID(),r=f.run('publisher','credential-profile-review',input,id);assert.deepEqual(f.run('publisher','credential-profile-review',input,id),r);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]','publisher');assert.throws(()=>f.run('publisher','credential-profile-review',input,id),match('forbidden'));
}));
test('B12 sentetik rozet laboratuvarı karar/profil/kurum alanlarını ve gerçek kişiyi kabul etmez',()=>{
 for(const key of ['decisionId','academicDecision','profileId','official','issuer','pilot'])assert.ok(validateDraft({...draftFor('universite'),[key]:'injected'}).authority);assert.ok(validateDraft({...draftFor('universite'),learner:'real-person'}).learner);const c=makeCredential(draftFor('universite'),{id:randomUUID(),index:0,base:'https://local-acceptance.invalid',date:new Date().toISOString()});assert.equal(c.pilotMetadata.pilot,true);assert.equal(c.academicDecision,undefined);
});
test('B12 profil ve tekrar yolu üretimde kapalıdır; öğrenci yetki siciline erişemez',()=>use(f=>{
 const p=f.program(),x=localCredentialProfile(f,p);assert.equal(f.core.view(f.context('student')).credentialProfiles.profiles.length,0);const old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>revise(f,{p,...x}),match('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
