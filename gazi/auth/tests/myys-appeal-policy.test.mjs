import {importJWK,jwtVerify} from 'jose';
import {localKey} from './helpers/local-key.mjs';
import {signApproved} from '../myys/credentials.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {appealTiming,validDay} from '../myys/appeal-policy-model.mjs';
import {bindAppealPolicy} from '../myys/appeal-policy.mjs';
import {decisionArchive} from '../myys/archive.mjs';
const reason='Sentetik yerel itiraz kabulü; kurum adına resmî usul oluşturmaz.';
const now='2026-10-13T12:00:00.000Z';
const input=(p,patch={})=>({programId:p.id,scope:'local-acceptance',official:false,effect:'suspend',lateAction:'independent-review',timeZone:'UTC+03:00',startRule:'next-local-day',mode:'calendar',days:2,effectiveFrom:'2026-10-01T00:00:00.000Z',expires:'2028-01-01T00:00:00.000Z',reason,authorityReference:reason,source:{title:'Sentetik kabul politikası kaynağı',reference:'local-acceptance: synthetic test source only',version:'test-1',date:'2026-10-10',readScope:reason,officialApproval:false},...patch});
const approve=(f,p,outcome='accepted')=>f.run('publisher','appeal-policy-review',{policyId:p.id,outcome,reason});
const setup=(f,patch={})=>{f.core.clock=()=>now;const x=f.setup(),policy=f.run('admin','appeal-policy',input(x.p,patch));approve(f,policy);return {...x,policy};};
const decide=(f,x)=>{const {a}=f.assess(x);return f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});};
const receipt=(f,d)=>f.run('student','decision-receive',{decisionId:d.id,confirm:true});
const match=code=>e=>e.code===code;
test('B11 takvim hesabı ertesi yerel gün başlar; tam son milisaniye ve UTC gün geçişi',()=>{
 const p={mode:'calendar',days:1},r={id:'r',scope:'local-acceptance',createdAt:'2026-10-13T21:05:00.000Z'};
 const w=appealTiming(p,r,'2026-10-15T20:59:59.999Z');assert.equal(w.deadline,'2026-10-15T20:59:59.999Z');assert.equal(w.classification,'within-local-window');assert.equal(appealTiming(p,r,'2026-10-15T21:00:00.000Z').classification,'late-local-review');assert.equal(w.official,false);
});
test('B11 iş günü hafta sonu ve açık hariç günleri atlar; kapsam sonu manuel kalır',()=>{
 const r={id:'r',scope:'local-acceptance',createdAt:'2026-10-16T12:00:00.000Z'},p={mode:'business',days:2,calendar:{from:'2026-10-01',to:'2026-10-31',excludedDays:['2026-10-19']}};
 assert.equal(appealTiming(p,r,r.createdAt).deadline,'2026-10-21T20:59:59.999Z');p.calendar.to='2026-10-20';assert.equal(appealTiming(p,r,r.createdAt).classification,'manual-review');p.calendar.from='2026-10-17';assert.equal(appealTiming(p,r,r.createdAt).deadline,null);
});
test('B11 bilinmeyen kural, eksik/future teslim, sahte tarih ve resmî kapsam süre üretmez',()=>{
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2024-02-29'),true);const r={id:'r',scope:'local-acceptance',createdAt:now};
 for(const p of [null,{mode:'manual'},{mode:'unknown',days:1},{mode:'calendar',days:0},{mode:'business',days:2}])assert.equal(appealTiming(p,r,now).deadline,null);
 for(const receipt of [null,{...r,scope:'official'},{...r,createdAt:'bad'},{...r,createdAt:'2028-01-01T00:00:00Z'}])assert.equal(appealTiming({mode:'calendar',days:1},receipt,now).deadline,null);
});
test('B11 karar incelenmiş politika ve kaynak sürümünü sabitler; yeni politika arşivi değiştirmez',()=>use(f=>{
 const x=setup(f),d=decide(f,x),before=decisionArchive(f.core,f.context('student'),d.id);assert.equal(d.appealPolicy.policy.id,x.policy.id);assert.equal(d.appealPolicy.official,false);
 const v2=f.run('admin','appeal-policy',input(x.p,{previousId:x.policy.id,changeReason:reason,days:9}));approve(f,v2);assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,now).policy.id,v2.id);assert.equal(decisionArchive(f.core,f.context('student'),d.id).sha256,before.sha256);receipt(f,d);assert.equal(f.core.view(f.context('student')).decisions[0].appealWindow.deadline,'2026-10-15T20:59:59.999Z');
}));
test('B11 yeni taslak veya gelecek sürüm eski kabulü değiştirmez; durdurma eskiye sessiz düşmez',()=>use(f=>{
 const x=setup(f),d=decide(f,x),v2=f.run('admin','appeal-policy',input(x.p,{previousId:x.policy.id,changeReason:reason,effectiveFrom:'2026-11-01T00:00:00.000Z'}));assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,now).policy.id,x.policy.id);approve(f,v2);assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,now).policy.id,x.policy.id);
 f.run('publisher','appeal-policy-hold',{policyId:x.policy.id,reason});assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,now).policy,null);assert.equal(f.s.get('test-gazi','decision',d.id).appealPolicy.policy.id,x.policy.id);assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,'2026-11-02T00:00:00.000Z').policy.id,v2.id);
}));
test('B11 geçmiş/uygunsuz politika yeni karara süre vermez; tarihsiz eski karar manuel görünür',()=>use(f=>{
 const x=setup(f),d=decide(f,x);assert.equal(f.core.view(f.context('student')).decisions[0].appealWindow.classification,'manual-review');assert.equal(bindAppealPolicy(f.s,'test-gazi',x.p,'2029-01-01T00:00:00.000Z').policy,null);
 const p=f.run('author','program',{...x.p,code:'P02'}),v=f.run('admin','appeal-policy',input(p));approve(f,v,'rejected');assert.equal(bindAppealPolicy(f.s,'test-gazi',p,now).policy,null);assert.equal(d.appealPolicy.policy.id,x.policy.id);
}));
test('B11 geç başvuru kaydolur ve belgeyi askıya alır; ayrı süre gerekçesi olmadan kapanmaz',()=>use(f=>{
 const x=setup(f),d=decide(f,x);receipt(f,d);f.core.clock=()=> '2026-10-20T12:00:00.000Z';const a=f.run('student','appeal',{decisionId:d.id,reason});assert.equal(a.timing.classification,'late-local-review');assert.equal(a.timing.automaticRejection,false);assert.equal(f.core.view(f.context('issuer')).decisions[0].usable,false);
 assert.throws(()=>f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason}),match('appeal_time_review'));const r=f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason,timeReview:'admitted-local-review',timeReason:reason});assert.equal(r.policyId,x.policy.id);assert.equal(r.timeReason,reason);assert.equal(f.core.view(f.context('issuer')).decisions[0].usable,true);
}));
test('B11 teslimsiz ve manuel politika da bağımsız süre incelemesi ister; sonradan teyit başvuru anını değiştirmez',()=>use(f=>{
 const x=setup(f,{mode:'manual',days:null}),d=decide(f,x),a=f.run('student','appeal',{decisionId:d.id,reason});receipt(f,d);assert.equal(f.s.get('test-gazi','appeal',a.id).timing.receiptId,null);assert.throws(()=>f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason}),match('appeal_time_review'));assert.throws(()=>f.run('judge','resolve',{appealId:a.id,outcome:'upheld',reason,timeReview:'admitted-local-review',timeReason:reason}),match('forbidden'));
}));
test('B11 yerel teyit yalnız sahibi ve MFA ile tekil; istemci saati ve resmî tebliğ iddiası kaydedilmez',()=>use(f=>{
 const x=setup(f),d=decide(f,x);assert.throws(()=>f.run('other','decision-receive',{decisionId:d.id,confirm:true}),match('not_found'));assert.throws(()=>f.run('student','decision-receive',{decisionId:d.id,confirm:false}),match('receipt'));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('student');assert.throws(()=>receipt(f,d),match('not_found'));f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE person=?').run('student');const r=f.run('student','decision-receive',{decisionId:d.id,confirm:true,createdAt:'2020-01-01',officialNotificationAt:now,official:true});assert.equal(r.createdAt,now);assert.equal(r.officialNotificationAt,null);assert.equal(r.official,false);assert.equal(receipt(f,d).id,r.id);assert.equal(f.s.list('test-gazi','decision-receipt').length,1);assert.equal(f.core.view(f.context('student')).decisions[0].canReceive,false);
}));
test('B11 süre içindeki başvurunun inceleme zamanı uzasa da başvuru sınıfı sabit',()=>use(f=>{
 const x=setup(f),d=decide(f,x);receipt(f,d);const a=f.run('student','appeal',{decisionId:d.id,reason});f.core.clock=()=> '2026-10-20T12:00:00.000Z';const r=f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason,timeReview:'invented'});assert.equal(r.timeReview,'within-local-window');assert.equal(r.timeReason,null);
}));
test('B11 politika kaynak/süre/kapsam alanları ve sürüm çatışması katı doğrulanır',()=>use(f=>{
 f.core.clock=()=>now;const p=f.program();for(const patch of [{official:true},{scope:'production'},{effect:'ignore'},{lateAction:'reject'},{days:0},{days:366},{days:1.5},{mode:'manual',days:1},{timeZone:'auto'},{startRule:'same-day'},{effectiveFrom:'2026-10-01'},{expires:'2020-01-01T00:00:00.000Z'},{source:{...input(p).source,date:'2026-02-30'}},{source:{...input(p).source,date:'2028-01-01'}},{source:{...input(p).source,officialApproval:true}},{source:{...input(p).source,readScope:'short'}}])assert.throws(()=>f.run('admin','appeal-policy',input(p,patch)));
 const v=f.run('admin','appeal-policy',input(p));assert.throws(()=>f.run('admin','appeal-policy',input(p)),match('policy_changed'));assert.throws(()=>f.run('admin','appeal-policy',input(p,{previousId:v.id,changeReason:'short'})),match('policy_changed'));assert.equal(f.s.list('test-gazi','appeal-policy').length,1);
}));
test('B11 iş günü takviminde yinelenen/kapsam dışı/geçersiz tarih ve bilinmeyen hafta sonu reddedilir',()=>use(f=>{
 f.core.clock=()=>now;const p=f.program(),calendar={from:'2026-10-01',to:'2026-10-31',excludedDays:[],weekend:'sat-sun',reference:reason};for(const c of [{...calendar,excludedDays:['2026-10-10','2026-10-10']},{...calendar,excludedDays:['2026-11-01']},{...calendar,excludedDays:['2026-02-30']},{...calendar,weekend:'fri-sat'},{...calendar,to:'2026-09-30'}])assert.throws(()=>f.run('admin','appeal-policy',input(p,{mode:'business',calendar:c})),match('policy_calendar'));
 assert.equal(f.run('admin','appeal-policy',input(p,{mode:'business',calendar})).calendar.weekend,'sat-sun');
}));
test('B11 politika hazırlayan inceleyemez; başka birim/kurum/öğrenen ve MFA sınırı',()=>use(f=>{
 f.core.clock=()=>now;const p=f.program(),v=f.run('admin','appeal-policy',input(p));f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","commission"]','admin');assert.throws(()=>f.run('admin','appeal-policy-review',{policyId:v.id,outcome:'accepted',reason}),match('separation'));f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["coordinator","commission"]','author');assert.throws(()=>f.run('author','appeal-policy-review',{policyId:v.id,outcome:'accepted',reason}),match('separation'));
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('arts','publisher');assert.throws(()=>approve(f,v),match('not_found'));assert.equal(f.core.view(f.context('publisher')).appealPolicies.policies.length,0);assert.equal(f.core.view(f.context('student')).appealPolicies.policies.length,0);assert.throws(()=>f.core.view({...f.context('admin'),tenant:'other'}),match('identity_tenant'));f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('admin');assert.throws(()=>f.run('admin','appeal-policy',input(p)),match('not_found'));
}));
test('B11 eski taslak, tekrar inceleme/durdurma ve sona ermiş kabul engellenir',()=>use(f=>{
 f.core.clock=()=>now;const p=f.program(),v=f.run('admin','appeal-policy',input(p)),v2=f.run('admin','appeal-policy',input(p,{previousId:v.id,changeReason:reason}));assert.throws(()=>approve(f,v),match('policy_changed'));approve(f,v2);assert.throws(()=>approve(f,v2),match('policy_changed'));f.run('publisher','appeal-policy-hold',{policyId:v2.id,reason});assert.throws(()=>f.run('publisher','appeal-policy-hold',{policyId:v2.id,reason}),match('policy_changed'));const v3=f.run('admin','appeal-policy',input(p,{previousId:v2.id,changeReason:reason}));f.core.clock=()=> '2029-01-01T00:00:00.000Z';assert.throws(()=>approve(f,v3),match('policy_expired'));
}));
test('B11 kayıt+denetim atomik; tekrar güncel role bağlı ve Vercel üretim yolu kapalı',()=>use(f=>{
 f.core.clock=()=>now;const p=f.program(),args=input(p),id=randomUUID();f.s.db.exec("CREATE TRIGGER fail_policy BEFORE INSERT ON audit WHEN NEW.action='appeal-policy' BEGIN SELECT RAISE(ABORT,'test policy audit'); END;");assert.throws(()=>f.run('admin','appeal-policy',args,id),/test policy audit/);assert.equal(f.s.list('test-gazi','appeal-policy').length,0);f.s.db.exec('DROP TRIGGER fail_policy');const v=f.run('admin','appeal-policy',args,id);assert.equal(f.run('admin','appeal-policy',args,id).id,v.id);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]','admin');assert.throws(()=>f.run('admin','appeal-policy',args,id),match('forbidden'));
 const old=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>approve(f,v),match('local_only'));assert.throws(()=>f.run('admin','appeal-policy',args,id),match('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));

test('B11 imzalı belge aynı kararın politika kimliğini, sürümünü ve özetini taşır',()=>use(async f=>{
 const x=setup(f),d=decide(f,x),issuance=f.run('issuer','issue',{decisionId:d.id}),base='https://local-acceptance.invalid',pair=generateKeyPairSync('rsa',{modulusLength:2048}),material={privateKey:await importJWK(pair.privateKey.export({format:'jwk'}),'RS256'),jwk:{...pair.publicKey.export({format:'jwk'}),kid:base+'/api/rozet/anahtarlar#appeal-policy'}};localKey(f,material);const signed=await signApproved(f.core,f.context('issuer'),issuance.id,material,base),verified=await jwtVerify(signed.jwt,await importJWK(material.jwk,'RS256'),{algorithms:['RS256'],currentDate:new Date(now)});const bound=verified.payload.academicDecision;assert.equal(bound.appealPolicyId,x.policy.id);assert.equal(bound.appealPolicyVersion,1);assert.equal(bound.appealPolicyDigest,d.appealPolicy.digest);assert.equal(bound.appealPolicyReviewId,d.appealPolicy.reviewId);
}));
