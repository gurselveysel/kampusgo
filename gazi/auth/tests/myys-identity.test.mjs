import test from 'node:test';
import assert from 'node:assert/strict';
import {exportJWK, generateKeyPair, SignJWT} from 'jose';
import {createIdentityContract} from '../myys/identity-contract.mjs';
import {LocalAcceptanceStore, hash} from '../myys/store.mjs';
import {use} from './helpers/myys-fixture.mjs';

const now = new Date('2026-10-10T20:00:00.000Z'), at = now.getTime()/1000, nonce = 'server-generated-challenge-00000000000001';
const key = await generateKeyPair('ES256');
const publicKey = {...await exportJWK(key.publicKey), kid:'test-key-1', alg:'ES256', use:'sig'};
const config = () => ({version:'local-2026.10.10.1', issuer:'https://test-idp.invalid', tenant:'test-gazi', audience:'myys-test-client', algorithms:['ES256'], jwks:{keys:[publicKey]}, maxTokenAgeSeconds:300, maxAuthAgeSeconds:900, clockToleranceSeconds:0, mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}]});
const sign = (patch = {}, header = {}, signingKey = key.privateKey) => new SignJWT({iss:'https://test-idp.invalid', sub:'student', aud:'myys-test-client', iat:at, exp:at+300, auth_time:at, nonce, acr:'urn:test:strong', amr:['pwd','otp'], ...patch}).setProtectedHeader({alg:'ES256', kid:'test-key-1', typ:'JWT', ...header}).sign(signingKey);
const verify = (contract, token, time = now) => contract.verify(token, {expectedNonce:nonce, now:time});
const error = code => e => e.code === code && !e.message.includes(nonce);

test('B06 e-posta değişse de issuer/subject aynı kişiyi ve yalnız sunucu rollerini çözer', () => use(async f => {
 const c=createIdentityContract(config()), count=f.s.db.prepare('SELECT count(*) AS n FROM persons').get().n;
 for (const email of ['first@example.invalid','changed@example.invalid']) {
  const proof=await verify(c,await sign({email,roles:['admin'],tenant:'foreign',mfa:true}));
  assert.deepEqual(proof,{});
  assert.deepEqual(c.resolveLocalMember(proof,{store:f.s,now}),{id:'student',tenant:'test-gazi',mfa:true,memberships:[{unit:'engineering',roles:['learner']}]});
 }
 assert.equal(f.s.db.prepare('SELECT count(*) AS n FROM persons').get().n,count);
 assert.throws(()=>f.s.principal(hash('new-session'),'test-gazi',now.toISOString()),error('identity_required'));
}));
for (const [name, patch] of [
 ['başka issuer',{iss:'https://other.invalid'}],['issuer son eğik çizgi farkı',{iss:'https://test-idp.invalid/'}],['başka audience',{aud:'other-client'}],
 ['ek güvenilmeyen audience',{aud:['myys-test-client','other']}],['yanlış azp',{azp:'other'}],['süresi tam dolmuş',{exp:at}],
 ['gelecek iat',{iat:at+1}],['eski iat',{iat:at-301}],['eski auth_time',{auth_time:at-901}],['gelecek auth_time',{auth_time:at+1}],
 ['yanlış nonce',{nonce:'different-server-challenge-000000000001'}],['eksik auth_time',{auth_time:undefined}],['boş subject',{sub:''}],['kesirli zaman',{iat:at-0.5}],
 ]) test(`B07 ${name} reddedilir`,async()=>{
 const c=createIdentityContract(config());
 await assert.rejects(()=>sign(patch).then(token=>verify(c,token)),error('identity_token'));
});

test('B07 yanlış imza, bilinmeyen kid, uzaktan anahtar ve erişim belirteci reddedilir',async()=>{
 const c=createIdentityContract(config()), alien=await generateKeyPair('ES256');
 for (const token of [await sign({}, {}, alien.privateKey), await sign({}, {kid:'unknown'}), await sign({}, {jku:'https://attacker.invalid/keys'}), await sign({}, {typ:'at+jwt'})]) await assert.rejects(()=>verify(c,token),error('identity_token'));
});
test('B07 eksik sunucu isteği ve bozuk belirteç güvenli hata verir',async()=>{
 const c=createIdentityContract(config()), token=await sign();
 await assert.rejects(()=>c.verify(token,{now}),error('identity_challenge'));
 for(const malformed of [undefined,'','abc.def.ghi','x'.repeat(16385)]) await assert.rejects(()=>verify(c,malformed),error('identity_token'));
});
test('B07 doğrulanmış kanıt MFA tazelik süresini uzatamaz',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign({auth_time:at-899}));
 assert.equal(c.resolveLocalMember(proof,{store:f.s,now}).mfa,true);
 assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now:new Date(now.getTime()+1000)}),error('identity_proof'));
}));
test('B07 güvenilir ikinci anahtar rotasyonu kabul edilir; çıkarılan anahtar reddedilir',async()=>{
 const second=await generateKeyPair('ES256'), secondPublic={...await exportJWK(second.publicKey),kid:'test-key-2',alg:'ES256'};
 const spec=config();spec.jwks.keys.push(secondPublic);
 const c=createIdentityContract(spec), token=await sign({}, {kid:'test-key-2'}, second.privateKey);
 await verify(c,token); await verify(c,await sign());
 spec.jwks.keys=[secondPublic];
 await assert.rejects(()=>sign().then(t=>verify(createIdentityContract(spec),t)),error('identity_token'));
});
test('B07 sözleşmede açıkça seçilen RS256 doğrulanır, algoritma değişimi reddedilir',async()=>{
 const rsa=await generateKeyPair('RS256',{modulusLength:2048}), spec=config();
 spec.algorithms=['RS256'];spec.jwks.keys=[{...await exportJWK(rsa.publicKey),kid:'rsa-test',alg:'RS256'}];
 const c=createIdentityContract(spec);
 await verify(c,await sign({}, {alg:'RS256',kid:'rsa-test'},rsa.privateKey));
 await assert.rejects(()=>sign().then(t=>verify(c,t)),error('identity_token'));
});
test('B07 güven zinciri yapılandırması sonradan değiştirilemez',async()=>{
 const spec=config(), c=createIdentityContract(spec);spec.issuer='https://other.invalid';spec.mfaProfiles=[];spec.jwks.keys=[];
 await verify(c,await sign());
});
test('B07 özel/simetrik anahtar, yinelenen kid ve güvensiz issuer yapılandırması reddedilir',async()=>{
 const privateJwk=await exportJWK((await generateKeyPair('ES256',{extractable:true})).privateKey);
 for(const mutate of [s=>{s.issuer='http://test-idp.invalid';},s=>{s.jwks.keys.push(publicKey);},s=>{s.jwks.keys=[{...privateJwk,kid:'private',alg:'ES256'}];},s=>{s.algorithms=['HS256'];},s=>{s.maxTokenAgeSeconds=Infinity;}]){
  const spec=config();mutate(spec);assert.throws(()=>createIdentityContract(spec),error('identity_config'));
 }
});
test('B07 MFA yalnız kuruma özel acr/amr eşleşmesinden gelir',()=>use(async f=>{
 const c=createIdentityContract(config());
 for(const patch of [{acr:'unknown'}, {amr:['pwd']}, {acr:undefined,amr:undefined,mfa:true}]){
  const proof=await verify(c,await sign(patch));
  assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('identity_mfa'));
  assert.equal(c.resolveLocalMember(proof,{store:f.s,now,requireMfa:false}).mfa,false);
 }
}));
test('B06 ayrılan kişi ve değişen üyelik her okumada yeniden denetlenir',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign());
 assert.equal(c.resolveLocalMember(proof,{store:f.s,now}).id,'student');
 f.s.db.prepare('UPDATE persons SET active=0 WHERE id=?').run('student');
 assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('identity_member'));
 f.s.db.prepare('UPDATE persons SET active=1 WHERE id=?').run('student');
 f.s.db.prepare('UPDATE memberships SET expires=? WHERE person=?').run(now.toISOString(),'student');
 assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('membership_required'));
}));
test('B06 başka kurum üyeliği, bilinmeyen kişi ve bozuk rol kaydı yetki sağlamaz',()=>use(async f=>{
 const spec=config();spec.tenant='another-tenant';let c=createIdentityContract(spec);
 assert.throws(()=>c.resolveLocalMember({}, {store:f.s,now}),error('identity_proof'));
 let proof=await verify(c,await sign());assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('membership_required'));
 c=createIdentityContract(config());proof=await verify(c,await sign({sub:'not-provisioned'}));assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('identity_member'));
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["made-up-superuser"]','student');
 proof=await verify(c,await sign());assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('identity_directory'));
}));
test('B07 sahte/kopyalanmış, başka doğrulayıcıdan veya süresi dolmuş kanıt reddedilir',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign());
 for(const forged of [{},{...proof},await verify(createIdentityContract(config()),await sign())]) assert.throws(()=>c.resolveLocalMember(forged,{store:f.s,now}),error('identity_proof'));
 assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now:new Date(now.getTime()+300000)}),error('identity_proof'));
}));
test('B06 kişi anahtarı yerel depo kapanıp açılınca korunur',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign());
 const reopened=new LocalAcceptanceStore(f.path);
 try {assert.equal(c.resolveLocalMember(proof,{store:reopened,now}).id,'student');}finally{reopened.close();}
}));
test('B06 birim/rol değişimi güncel sicilden gelir; devre dışı üyelik görünmez',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign());
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]','student');
 assert.deepEqual(c.resolveLocalMember(proof,{store:f.s,now}).memberships,[{unit:'engineering',roles:['quality']}]);
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');
 assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('membership_required'));
}));
test('B06 yerel çözümleme Vercel ortamında açılamaz',()=>use(async f=>{
 const c=createIdentityContract(config()), proof=await verify(c,await sign()), before=process.env.VERCEL;
 try {process.env.VERCEL='1';assert.throws(()=>c.resolveLocalMember(proof,{store:f.s,now}),error('local_only'));}
 finally {if(before === undefined) delete process.env.VERCEL; else process.env.VERCEL=before;}
}));
