import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeJwt,importJWK} from 'jose';
import {gzipSync,gunzipSync} from 'node:zlib';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {signedFixture} from './helpers/local-signing.mjs';
import {localKey} from './helpers/local-key.mjs';
import {signCredential} from '../lib/badge-service.mjs';
import {allocateStatus,publishStatusSnapshot,exportPublicTrust,exportVerificationBundle,currentStatusSnapshot} from '../myys/status-list.mjs';
const reason='Sentetik durum listesi kabulü; gerçek kurum kararı değildir.';
const match=c=>e=>e.code===c;
async function setup(f){const x=await signedFixture(f);await publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);return {...x,bundle:exportVerificationBundle(f.core,f.context('student'),x.issuance.id),trust:exportPublicTrust(f.core,f.context('it'),'engineering')};}
function independent(f,x,{bundle=x.bundle,trust=x.trust,issuer=x.base+'/api/rozet/kurum',at=f.core.clock()}={}){
 const dir=dirname(f.path);writeFileSync(join(dir,'bundle.json'),JSON.stringify(bundle));writeFileSync(join(dir,'trust.json'),JSON.stringify(trust));const r=spawnSync('python',[fileURLToPath(new URL('../scripts/verify-local-bundle.py',import.meta.url)),'--bundle',join(dir,'bundle.json'),'--trust',join(dir,'trust.json'),'--issuer',issuer,'--at',at],{encoding:'utf8',timeout:15000});assert.ifError(r.error);assert.ok(r.stdout,r.stderr);return JSON.parse(r.stdout);
}
test('B19 dışa aktarılan profil Python/OpenSSL ile uygulamadan bağımsız doğrulanır',()=>use(async f=>{
 const x=await setup(f),r=independent(f,x);assert.equal(r.valid,true);assert.equal(r.certification,false);assert.equal(r.onlineStatus,false);assert.equal(r.engine,'Python stdlib + OpenSSL');assert.equal(x.bundle.trustIncluded,false);assert.equal(JSON.stringify(x.trust).includes('"d":'),false);
}));
test('B13 iki ayrı liste en az 131072 MSB-first bit içerir; iptal doğru bitindedir',()=>use(async f=>{
 const x=await setup(f),allocation=f.s.get('test-gazi','status-allocation',x.issuance.id);assert.ok(allocation.index>=0&&allocation.index<131072);for(const l of x.bundle.statusLists){const p=decodeJwt(l.jwt),bits=gunzipSync(Buffer.from(p.credentialSubject.encodedList.slice(1),'base64url'));assert.equal(bits.length,16384);assert.equal(bits[allocation.index>>3]&(1<<(7-allocation.index%8)),0);}
 f.run('issuer','revoke',{issuanceId:x.issuance.id,reason});assert.equal(currentStatusSnapshot(f.core,'test-gazi','engineering'),null);await publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);const bundle=exportVerificationBundle(f.core,f.context('student'),x.issuance.id),p=decodeJwt(bundle.statusLists[0].jwt),bits=gunzipSync(Buffer.from(p.credentialSubject.encodedList.slice(1),'base64url'));assert.ok(bits[allocation.index>>3]&(1<<(7-allocation.index%8)));assert.equal(independent(f,x,{bundle}).code,'revoked');
}));
test('B13 itiraz askıdır; uygun bulma sonrası açılır ve kalıcı iptal üretilmez',()=>use(async f=>{
 const x=await setup(f),a=f.run('student','appeal',{decisionId:x.d.id,reason});await publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);let bundle=exportVerificationBundle(f.core,f.context('student'),x.issuance.id);assert.equal(independent(f,x,{bundle}).code,'suspended');assert.equal(f.s.list('test-gazi','revocation').length,0);f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason});await publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);bundle=exportVerificationBundle(f.core,f.context('student'),x.issuance.id);assert.equal(independent(f,x,{bundle}).valid,true);
}));
test('B19 bozuk imza, yanlış issuer, bilinmeyen ve ele geçirilmiş anahtar reddedilir',()=>use(async f=>{
 const x=await setup(f),parts=x.bundle.credential.split('.');parts[1]=Buffer.from(JSON.stringify({...decodeJwt(x.bundle.credential),name:'Değiştirilmiş'})).toString('base64url');assert.equal(independent(f,x,{bundle:{...x.bundle,credential:parts.join('.')}}).code,'signature');assert.equal(independent(f,x,{issuer:'https://wrong.invalid'}).valid,false);assert.equal(independent(f,x,{trust:{...x.trust,keys:[{...x.trust.keys[0],jwk:{...x.trust.keys[0].jwk,kid:'unknown'}}]}}).code,'unknown_key');assert.equal(independent(f,x,{trust:{...x.trust,keys:[{...x.trust.keys[0],state:'compromised'}]}}).code,'key_untrusted');
}));
test('B19 süresi dolmuş belge, durum listesi ve güven kopyası reddedilir',()=>use(async f=>{
 const x=await setup(f);assert.equal(independent(f,x,{at:new Date(Date.parse(x.trust.validUntil)+1).toISOString()}).code,'trust_expired');const expired=await signCredential({...x.signed.credential,validUntil:x.signed.credential.validFrom},x.material);assert.equal(independent(f,x,{bundle:{...x.bundle,credential:expired}}).code,'expired');const lists=structuredClone(x.bundle.statusLists),p=decodeJwt(lists[0].jwt);lists[0].jwt=await signCredential({...p,validUntil:p.validFrom},x.material);assert.equal(independent(f,x,{bundle:{...x.bundle,statusLists:lists}}).code,'expired');
}));
test('B19 bozuk gzip, aşırı açılma, kısa liste, karışık amaç ve sınır dışı indeks reddedilir',()=>use(async f=>{
 const x=await setup(f),p=decodeJwt(x.bundle.statusLists[0].jwt);
 for(const encodedList of ['unot_gzip','u'+gzipSync(Buffer.alloc(1)).toString('base64url'),'u'+gzipSync(Buffer.alloc(1000000)).toString('base64url')]){const jwt=await signCredential({...p,credentialSubject:{...p.credentialSubject,encodedList}},x.material);assert.equal(independent(f,x,{bundle:{...x.bundle,statusLists:[{...x.bundle.statusLists[0],jwt},x.bundle.statusLists[1]]}}).valid,false);}
 const jwt=await signCredential({...p,credentialSubject:{...p.credentialSubject,statusPurpose:'suspension'}},x.material);assert.equal(independent(f,x,{bundle:{...x.bundle,statusLists:[{...x.bundle.statusLists[0],jwt},x.bundle.statusLists[1]]}}).code,'status_binding');const vc=structuredClone(x.signed.credential);vc.credentialStatus[0].statusListIndex='131072';assert.equal(independent(f,x,{bundle:{...x.bundle,credential:await signCredential(vc,x.material)}}).code,'status_index');
}));
test('B13 durum listesi imzalanırken kaynak veya anahtar değişirse eski liste yayınlanmaz',()=>use(async f=>{
 const x=await setup(f),count=f.s.list('test-gazi','status-snapshot').length,promise=publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);f.run('student','appeal',{decisionId:x.d.id,reason});await assert.rejects(()=>promise,match('status_changed'));assert.equal(f.s.list('test-gazi','status-snapshot').length,count);
 const second=publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);f.run('it','key-state',{keyId:x.signed.keyId,state:'compromised',expectedState:'active',reason,incidentReference:reason});await assert.rejects(()=>second,match('signing_key'));assert.equal(currentStatusSnapshot(f.core,'test-gazi','engineering'),null);
}));
test('B13 süre dolması ve yeni kaynak ihracatı kapatır; liste yenilenince tekrar açılır',()=>use(async f=>{
 const x=await setup(f),now=f.core.clock();f.core.clock=()=>new Date(Date.parse(now)+301000).toISOString();assert.throws(()=>exportVerificationBundle(f.core,f.context('student'),x.issuance.id),match('status_stale'));await publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material);assert.equal(exportVerificationBundle(f.core,f.context('student'),x.issuance.id).statusLists.length,2);
}));
test('B13 durum/güven ihracı rol, MFA, kişi, kurum ve birimi sınırlar',()=>use(async f=>{
 const x=await setup(f);for(const who of ['student','issuer','admin'])await assert.rejects(()=>publishStatusSnapshot(f.core,f.context(who),'engineering',x.material),match('forbidden'));assert.throws(()=>exportVerificationBundle(f.core,f.context('other'),x.issuance.id),match('not_found'));assert.throws(()=>exportPublicTrust(f.core,f.context('student'),'engineering'),match('forbidden'));assert.throws(()=>exportPublicTrust(f.core,f.context('admin'),'arts'),match('forbidden'));assert.throws(()=>exportVerificationBundle(f.core,{...f.context('student'),tenant:'foreign'},x.issuance.id),match('identity_tenant'));f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('student');assert.throws(()=>exportVerificationBundle(f.core,f.context('student'),x.issuance.id),match('not_found'));
}));
test('B13 atomik denetim hatası listeyi geri alır; ayrılmış indeksler tekrar kullanılmaz',()=>use(async f=>{
 const x=await setup(f),n=f.s.list('test-gazi','status-snapshot').length;f.s.db.exec("CREATE TRIGGER fail_status BEFORE INSERT ON audit WHEN NEW.action='status-publish' BEGIN SELECT RAISE(ABORT,'test audit'); END;");await assert.rejects(()=>publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material),/test audit/);assert.equal(f.s.list('test-gazi','status-snapshot').length,n);const indices=new Set();f.s.transaction(()=>{for(let i=0;i<100;i++){const r={id:randomUUID(),unit:'engineering',owner:'student'},a=allocateStatus(f.s,'test-gazi',r,'issuer',f.core.clock());indices.add(a.index);assert.equal(allocateStatus(f.s,'test-gazi',r,'issuer',f.core.clock()).index,a.index);}});assert.equal(indices.size,100);
}));
test('B13 durum hizmeti Vercel üzerinde kapalı kalır',()=>use(async f=>{
 const x=await setup(f),old=process.env.VERCEL;process.env.VERCEL='1';try{await assert.rejects(()=>publishStatusSnapshot(f.core,f.context('it'),'engineering',x.material),match('local_only'));assert.throws(()=>exportPublicTrust(f.core,f.context('it'),'engineering'),match('local_only'));assert.throws(()=>exportVerificationBundle(f.core,f.context('student'),x.issuance.id),match('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));

test('B19 rotasyon öncesi belge yeni durum imzasıyla bağımsız doğrulanır',()=>use(async f=>{
 const x=await setup(f),pair=generateKeyPairSync('rsa',{modulusLength:2048}),material={jwk:{...pair.publicKey.export({format:'jwk'}),kid:x.base+'/api/rozet/anahtarlar#rotation'},privateKey:await importJWK(pair.privateKey.export({format:'jwk'}),'RS256')};localKey(f,material,{replacesId:x.signed.keyId});f.run('it','key-state',{keyId:x.signed.keyId,state:'retired',expectedState:'active',reason,incidentReference:reason});await publishStatusSnapshot(f.core,f.context('it'),'engineering',material);const bundle=exportVerificationBundle(f.core,f.context('student'),x.issuance.id),trust=exportPublicTrust(f.core,f.context('it'),'engineering');assert.equal(independent(f,x,{bundle,trust}).valid,true);assert.equal(trust.keys.find(k=>k.jwk.kid===x.material.jwk.kid).state,'retired');
}));
test('B19 imzalı listede kurcalama ve eksik başarı profili bağımsız reddedilir',()=>use(async f=>{
 const x=await setup(f),lists=structuredClone(x.bundle.statusLists),parts=lists[0].jwt.split('.');parts[1]=Buffer.from(JSON.stringify({...decodeJwt(lists[0].jwt),name:'Tampered'})).toString('base64url');lists[0].jwt=parts.join('.');assert.equal(independent(f,x,{bundle:{...x.bundle,statusLists:lists}}).code,'signature');const vc=structuredClone(x.signed.credential);delete vc.credentialSubject.achievement;assert.equal(independent(f,x,{bundle:{...x.bundle,credential:await signCredential(vc,x.material)}}).code,'achievement_type');
}));
