import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,randomUUID} from 'node:crypto';
import {importJWK} from 'jose';
import {use} from './helpers/myys-fixture.mjs';
import {localKey} from './helpers/local-key.mjs';
import {signedFixture} from './helpers/local-signing.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {signApproved,verifyApproved,verifyWithKeyring} from '../myys/credentials.mjs';
import {localIssuer,keyStatus,signingKey} from '../myys/key-registry.mjs';
import {downloadWalletCredential} from '../myys/wallet.mjs';
const reason='Sentetik güvenlik olayı ve anahtar incelemesi; gerçek kurum kaydı değildir.';
const match=c=>e=>e.code===c,base='https://local-acceptance.invalid';
async function material(name='test-key'){const pair=generateKeyPairSync('rsa',{modulusLength:2048});return {privateKey:await importJWK(pair.privateKey.export({format:'jwk'}),'RS256'),jwk:{...pair.publicKey.export({format:'jwk'}),kid:base+'/api/rozet/anahtarlar#'+name}};}
const input=m=>({unit:'engineering',mode:'local-acceptance',issuer:localIssuer,publicJwk:m.jwk,reason,custodyReference:reason});
const change=(f,k,state,expectedState='active')=>f.run('it','key-state',{keyId:k.id,state,expectedState,reason,incidentReference:reason});
test('B13 anahtar sicili ve ayrı inceleme olmadan imza yok',()=>use(async f=>{
 const x=f.passed(),r=f.run('issuer','issue',{decisionId:x.d.id}),m=await material();await assert.rejects(()=>signApproved(f.core,f.context('issuer'),r.id,m,base),match('signing_key'));
 const k=localKey(f,m,{reviewed:false});await assert.rejects(()=>signApproved(f.core,f.context('issuer'),r.id,m,base),match('signing_key'));f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});const signed=await signApproved(f.core,f.context('issuer'),r.id,m,base);assert.equal(signed.keyId,k.id);assert.equal(signed.credential.validFrom.endsWith('.000Z'),true);assert.equal(signed.keyFingerprint,k.fingerprint);
}));
test('B13 özel anahtar, zayıf RSA, yanlış issuer/adres ve bilinmeyen JWK alanı reddedilir',()=>use(async f=>{
 const m=await material(),weak=generateKeyPairSync('rsa',{modulusLength:1024}).publicKey.export({format:'jwk'});
 for(const patch of [{issuer:'https://another.invalid'},{mode:'production'},{publicJwk:{...m.jwk,d:'PRIVATE_NOT_ACCEPTED'}},{publicJwk:{...m.jwk,x5u:'https://evil.invalid'}},{publicJwk:{...m.jwk,kid:'https://real.invalid/key'}},{publicJwk:{...weak,kid:m.jwk.kid}},{publicJwk:{...m.jwk,e:'Aw'}}])assert.throws(()=>f.run('it','key-register',{...input(m),...patch}));
 assert.equal(f.s.list('test-gazi','key').length,0);assert.equal(f.s.db.prepare('SELECT count(*) n FROM commands WHERE result LIKE ?').get('%PRIVATE_NOT_ACCEPTED%').n,0);
}));
test('B13 görevler ayrılığı, MFA, kurum ve birim matrisi',()=>use(async f=>{
 const m=await material();for(const role of ['student','issuer','author','admin','finance']){if(role==='finance')continue;assert.throws(()=>f.run(role,'key-register',input(m)),match('forbidden'));}
 const k=localKey(f,m,{reviewed:false});f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it","admin"]','it');assert.throws(()=>f.run('it','key-review',{keyId:k.id,outcome:'accepted',reason}),match('separation'));
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('arts','admin');assert.throws(()=>f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason}),match('not_found'));assert.equal(f.core.view(f.context('admin')).keys.length,0);assert.equal(f.core.view(f.context('student')).keys.length,0);
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('it');assert.throws(()=>change(f,k,'compromised'),match('not_found'));
 await assert.rejects(()=>signApproved(f.core,{...f.context('issuer'),tenant:'foreign'},'missing',m,base),match('identity_tenant'));
}));
test('B13 kimlik ve anahtar özeti tekrar kullanılamaz; anahtar değiştirilemez',()=>use(async f=>{
 const m=await material(),k=localKey(f,m);assert.throws(()=>localKey(f,m),match('duplicate'));assert.throws(()=>localKey(f,{jwk:{...m.jwk,kid:m.jwk.kid+'-other'}}),match('duplicate'));const n=await material();assert.throws(()=>localKey(f,{jwk:{...n.jwk,kid:m.jwk.kid}}),match('duplicate'));assert.throws(()=>f.s.db.prepare('UPDATE records SET owner=? WHERE id=?').run('other',k.id),/immutable/);
}));
test('B13 rotasyonda eski imza korunur, emekli anahtar yeni imza üretemez',()=>use(async f=>{
 const x=await signedFixture(f),k=f.s.get('test-gazi','key',x.signed.keyId),m=await material('new-key'),next=localKey(f,m,{replacesId:k.id});change(f,k,'retired');
 assert.equal(next.replacesId,k.id);assert.equal((await verifyApproved(f.core,f.context('student'),x.signed.jwt,x.material,base)).valid,true);assert.equal(downloadWalletCredential(f.core,f.context('student'),x.issuance.id).jwt,x.signed.jwt);
 assert.throws(()=>signingKey(f.s,'test-gazi','engineering',x.material),match('signing_key'));assert.equal(signingKey(f.s,'test-gazi','engineering',m).id,next.id);
}));
test('B13 ele geçirilme sicili doğrulama/cüzdan/paylaşım/teslimde aynı sonucu verir',()=>use(async f=>{
 const x=await signedFixture(f),k=f.s.get('test-gazi','key',x.signed.keyId),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose:'Sentetik doğrulama amacı'});change(f,k,'compromised');
 assert.equal((await verifyWithKeyring(f.core,f.context('student'),x.signed.jwt,[{state:'active',material:x.material}],base)).valid,false);assert.equal(f.core.view(f.context('student')).wallet[0].state,'blocked');assert.equal(f.core.view(f.context('student')).issuances[0].blocked,true);assert.equal(f.core.shared({tenant:'test-gazi',token:share.token}).state,'blocked');assert.throws(()=>downloadWalletCredential(f.core,f.context('student'),x.issuance.id),match('decision_blocked'));assert.throws(()=>f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose:'Yeni sentetik paylaşım'}),match('decision_blocked'));assert.throws(()=>f.run('student','credential-receive',{issuanceId:x.issuance.id,reason}),match('credential_blocked'));assert.equal(f.s.list('test-gazi','decision')[0].outcome,'approved');assert.equal(f.s.list('test-gazi','revocation').length,0);
}));
test('B13 ele geçirilmiş anahtar yeniden açılamaz ve eski komut yeni durumu aşamaz',()=>use(async f=>{
 const k=localKey(f,await material());change(f,k,'retired');assert.throws(()=>change(f,k,'compromised'),match('key_changed'));change(f,k,'compromised','retired');for(const state of ['active','retired','compromised'])assert.throws(()=>change(f,k,state,'compromised'),match('key_changed'));assert.equal(keyStatus(f.s,'test-gazi',k).state,'compromised');
}));
test('B13 imza beklerken anahtar geri çekilirse imza yayınlanmaz',()=>use(async f=>{
 const x=f.passed(),r=f.run('issuer','issue',{decisionId:x.d.id}),m=await material(),k=localKey(f,m),promise=signApproved(f.core,f.context('issuer'),r.id,m,base);change(f,k,'compromised');await assert.rejects(()=>promise,match('signing_key'));assert.equal(f.s.list('test-gazi','signed').length,0);
}));
test('B13 aynı kid ile başka açık anahtar imza ve doğrulamayı aşamaz',()=>use(async f=>{
 const x=await signedFixture(f),m=await material();m.jwk.kid=x.material.jwk.kid;assert.throws(()=>signingKey(f.s,'test-gazi','engineering',m),match('signing_key'));assert.equal((await verifyApproved(f.core,f.context('student'),x.signed.jwt,m,base)).valid,false);
}));
test('B13 denetim hatası durum değişikliğini atomik geri alır; tekrar güncel yetki ister',()=>use(async f=>{
 const k=localKey(f,await material());f.s.db.exec("CREATE TRIGGER fail_key_audit BEFORE INSERT ON audit WHEN NEW.action='key-state' BEGIN SELECT RAISE(ABORT,'test audit'); END;");assert.throws(()=>change(f,k,'compromised'),/test audit/);assert.equal(keyStatus(f.s,'test-gazi',k).state,'active');f.s.db.exec('DROP TRIGGER fail_key_audit');const commandId=randomUUID(),args={keyId:k.id,state:'retired',expectedState:'active',reason,incidentReference:reason};f.run('it','key-state',args,commandId);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]','it');assert.throws(()=>f.run('it','key-state',args,commandId),match('forbidden'));
}));
test('B13 ayrı depo bağlantısı güncel iptali okur; özel anahtar kaydedilmez',()=>use(async f=>{
 const x=await signedFixture(f),k=f.s.get('test-gazi','key',x.signed.keyId),s=new LocalAcceptanceStore(f.path);try{const c=new MyysCore(s);change(f,k,'compromised');assert.equal(c.view(f.context('student')).wallet[0].state,'blocked');assert.equal(JSON.stringify(s.list('test-gazi','key')).includes('"d":'),false);}finally{s.close();}
}));
test('B13 Vercel ortamında anahtar işlemleri ve imza kapalı',()=>use(async f=>{
 const x=f.passed(),r=f.run('issuer','issue',{decisionId:x.d.id}),m=await material(),k=localKey(f,m);const old=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>change(f,k,'compromised'),match('local_only'));await assert.rejects(()=>signApproved(f.core,f.context('issuer'),r.id,m,base),match('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
