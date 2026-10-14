import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {IdentityKeyProvider} from '../myys/identity-key-provider.mjs';
import {PostgresIdentityKeyBridge} from '../myys/identity-key-bridge.mjs';
import {PostgresIdentityChallenges} from '../myys/identity-challenges.mjs';
import {hash} from '../myys/store.mjs';
import {pkceS256} from '../myys/identity-flow.mjs';
const scope={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'test-myys'};
const contractDigest=hash('synthetic-contract'),redirectUri='https://portal.invalid/callback',browserHash=hash('synthetic-browser');
const match=code=>e=>e.code===code;
async function fixture(t){
 const sql=await pgliteIdentity();t.after(()=>sql.close());await sql.install();await sql.db.exec(await readFile(new URL('../myys/identity-challenge-schema.sql',import.meta.url),'utf8'));
 // Sentinel only; this is not the person or session repository.
 await sql.db.exec('CREATE TABLE test_identity_result (id text PRIMARY KEY)');let time=Date.parse('2026-10-14T10:00:00Z');
 const rows=new Map(),secrets=new Map();const h={sql,clock:()=>new Date(time),advance:n=>{time+=n;},providerHook:async()=>{}};
 for(const purpose of ['pkce','nonce']){rows.set(purpose,{tenant:scope.tenant,purpose,version:'v1',algorithm:'HMAC-SHA-256',state:'active',notBefore:'2026-10-14T09:00:00.000Z',notAfter:'2026-10-14T11:00:00.000Z',retiredAt:null,revision:1});secrets.set(purpose,randomBytes(32));}
 h.driver={describe:async ref=>{await h.providerHook(ref);return structuredClone(rows.get(ref.purpose));},mac:async ref=>({tenant:ref.tenant,purpose:ref.purpose,version:ref.version,revision:ref.revision,mac:createHmac('sha256',secrets.get(ref.purpose)).update(ref.message).digest('base64url')})};
 h.provider=new IdentityKeyProvider({driver:h.driver,...scope,contractDigest,clock:h.clock});
 h.transactions=new PostgresIdentityTransactions({pool:sql.pool,...scope});h.keys=new PostgresIdentityKeyBridge({transactions:h.transactions,keyProvider:h.provider,...scope,contractDigest,clock:h.clock});
 h.control={operatorRef:'test-operator',authorityDigest:hash('test-control')};for(const row of rows.values())await h.keys.recordMetadata(row,{...h.control,expectedRevision:0});
 h.newRepo=(patch={})=>new PostgresIdentityChallenges({transactions:h.transactions,keyBridge:h.keys,...scope,contractDigest,redirectUri,clock:h.clock,...patch});h.repo=h.newRepo();
 h.begin=(repo=h.repo,browser=browserHash)=>repo.begin({browserHash:browser});
 h.input=(start,patch={})=>({state:start.state,browserHash,issuer:scope.issuer,redirectUri,...patch});
 h.claim=(start,repo=h.repo,patch={})=>repo.claim(h.input(start,patch));
 h.rows=()=>sql.db.query('SELECT * FROM myys_identity_challenges ORDER BY created,id').then(r=>r.rows);
 h.events=()=>sql.db.query('SELECT event FROM myys_identity_challenge_audit ORDER BY recorded_at,id').then(r=>r.rows.map(r=>r.event));
 h.finish=(handle,repo=h.repo,id='success')=>repo.finish(handle,async tx=>{await tx.query('INSERT INTO test_identity_result VALUES ($1)',[id]);return {id};});
 h.count=()=>sql.db.query('SELECT count(*)::int AS n FROM test_identity_result').then(r=>r.rows[0].n);
 h.revoke=async purpose=>{const old=rows.get(purpose),next={...old,state:'revoked',revision:old.revision+1};await h.keys.recordMetadata(next,{...h.control,expectedRevision:old.revision});Object.assign(old,next);};
 return h;
}
test('B07 SQL giriş isteği state/PKCE/nonce bağı ve atomik tek tüketim sağlar',async t=>{
 const h=await fixture(t),start=await h.begin();assert.equal(start.redirect_uri,redirectUri);assert.equal(start.scope,'openid');
 const handle=await h.claim(start);assert.equal(start.code_challenge,pkceS256(handle.codeVerifier));assert.equal(start.nonce,handle.nonce);
 const persisted=JSON.stringify(await h.rows());for(const secret of [start.state,start.nonce,handle.codeVerifier])assert.ok(!persisted.includes(secret));
 assert.deepEqual(await h.finish(handle),{id:'success'});assert.equal((await h.rows())[0].status,'used');assert.equal(await h.count(),1);
 assert.deepEqual((await h.events()).sort(),['begin','claim','use']);await assert.rejects(()=>h.claim(start),match('identity_challenge'));await assert.rejects(()=>h.finish(handle),match('identity_challenge'));
});
test('B07 iki repository aynı dönüşü sahiplenirken yalnız biri sağlayıcıya devam eder',async t=>{
 const h=await fixture(t),start=await h.begin(),other=h.newRepo();let describes=0;h.providerHook=async()=>{describes++;};
 const results=await Promise.allSettled([h.claim(start),h.claim(start,other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='identity_challenge').length,1);
 assert.equal(describes,4);const index=results.findIndex(r=>r.status==='fulfilled');await h.finish(results[index].value,index===0?h.repo:other);assert.equal(await h.count(),1);
});
test('B07 claim COMMIT sağlayıcıdan önce tamamlanır; hata yeni işlemle failed bırakır',async t=>{
 const h=await fixture(t),start=await h.begin();let observed=false;
 h.providerHook=async()=>{assert.equal(h.sql.active,0);assert.equal((await h.rows())[0].status,'claimed');assert.ok((await h.events()).includes('claim'));observed=true;throw Error('private KMS failure');};
 await assert.rejects(()=>h.claim(start),match('identity_challenge'));assert.equal(observed,true);assert.equal((await h.rows())[0].status,'failed');assert.equal(await h.count(),0);await assert.rejects(()=>h.claim(start),match('identity_challenge'));
});
test('B07 yanlış state/browser/issuer/redirect hiçbir geçerli isteği tüketmez',async t=>{
 const h=await fixture(t),start=await h.begin();
 for(const patch of [{state:randomBytes(32).toString('base64url')},{browserHash:hash('other')},{issuer:'https://other.invalid'},{redirectUri:'https://other.invalid/callback'},{state:'invalid'}])await assert.rejects(()=>h.claim(start,h.repo,patch),match('identity_challenge'));
 assert.equal((await h.rows())[0].status,'pending');await h.finish(await h.claim(start));
});
test('B07 sahiplenmeden önce veya SQL işi sırasında süre dolması eski isteği açamaz',async t=>{
 const h=await fixture(t),short=h.newRepo({requestLifetimeSeconds:1}),start=await h.begin(short);h.advance(1000);await assert.rejects(()=>h.claim(start,short),match('identity_challenge'));
 const next=await h.begin(short),handle=await h.claim(next,short);
 await assert.rejects(()=>short.finish(handle,async tx=>{await tx.query('INSERT INTO test_identity_result VALUES ($1)',['late']);h.advance(1000);}),match('identity_challenge'));
 assert.equal(await h.count(),0);assert.ok((await h.rows()).some(r=>r.status==='failed'));
});
test('B07 yeni giriş eski claimed isteği iptal eder; gecikmiş sonuç kabul edilmez',async t=>{
 const h=await fixture(t),first=await h.begin(),handle=await h.claim(first);h.advance(1);const next=await h.begin();
 await assert.rejects(()=>h.finish(handle),match('identity_challenge'));await h.finish(await h.claim(next));assert.deepEqual((await h.rows()).map(r=>r.status),['cancelled','used']);assert.equal(await h.count(),1);
});
test('B07 anahtar iptali öncesi üretilen handle SQL sonuç ve use kaydı oluşturamaz',async t=>{
 const h=await fixture(t),start=await h.begin(),handle=await h.claim(start);await h.revoke('nonce');
 await assert.rejects(()=>h.finish(handle),match('identity_key_barrier'));assert.equal(await h.count(),0);assert.equal((await h.rows())[0].status,'failed');assert.ok(!(await h.events()).includes('use'));
});
test('B07 iptal ve açık tarayıcı iptali KMS kapalıyken de çalışır',async t=>{
 const h=await fixture(t),first=await h.begin();await h.revoke('nonce');assert.deepEqual(await h.repo.cancel(h.input(first)),{cancelled:true});await assert.rejects(()=>h.claim(first),match('identity_challenge'));
 // Cancellation of a claimed request is separately exercised before provider shutdown.
 const h2=await fixture(t),next=await h2.begin(),handle=await h2.claim(next);await h2.revoke('pkce');assert.deepEqual(await h2.repo.cancelBrowser({browserHash}),{cancelled:1});await assert.rejects(()=>h2.finish(handle),match('identity_key_barrier'));assert.equal((await h2.rows())[0].status,'cancelled');
});
test('B07 claim denetimi hata verirse pending korunur; provider hiç çağrılmaz',async t=>{
 const h=await fixture(t),start=await h.begin();await h.sql.db.exec("ALTER TABLE myys_identity_challenge_audit ADD CHECK (event <> 'claim')");let called=false;h.providerHook=async()=>{called=true;};
 await assert.rejects(()=>h.claim(start),match('identity_store'));assert.equal(called,false);assert.equal((await h.rows())[0].status,'pending');assert.equal((await h.events()).length,1);
});
test('B07 use denetimi hata verirse sonuç rollback olur ve request tekrar kullanılamaz',async t=>{
 const h=await fixture(t),start=await h.begin(),handle=await h.claim(start);await h.sql.db.exec("ALTER TABLE myys_identity_challenge_audit ADD CHECK (event <> 'use')");
 await assert.rejects(()=>h.finish(handle),match('identity_store'));assert.equal(await h.count(),0);assert.equal((await h.rows())[0].status,'failed');assert.deepEqual((await h.events()).sort(),['begin','claim','fail']);await assert.rejects(()=>h.claim(start),match('identity_challenge'));
});
test('B07 belirsiz claim COMMIT provider çağırmaz; yeni giriş eski claimed kaydı kapatır',async t=>{
 const h=await fixture(t),start=await h.begin();let calls=0;h.providerHook=async()=>{calls++;};
 h.sql.fault=async({text,db})=>{if(text==='COMMIT'){await db.query('COMMIT');throw Object.assign(Error('transport'),{code:'ECONNRESET'});}};
 await assert.rejects(()=>h.claim(start),match('identity_commit_unknown'));assert.equal(calls,0);assert.equal((await h.rows())[0].status,'claimed');
 h.sql.fault=null;const next=await h.begin();await assert.rejects(()=>h.claim(start),match('identity_challenge'));await h.finish(await h.claim(next));assert.equal(await h.count(),1);
});
test('B07 belirsiz final COMMIT sonuç döndürmez ve kullanılmış isteği failed yapmaz',async t=>{
 const h=await fixture(t),start=await h.begin(),handle=await h.claim(start);let commits=0;
 h.sql.fault=async({text,db})=>{if(text==='COMMIT'){commits++;await db.query('COMMIT');throw Object.assign(Error('transport'),{code:'ECONNRESET'});}};
 await assert.rejects(()=>h.finish(handle),match('identity_commit_unknown'));assert.equal(commits,1);assert.equal(await h.count(),1);assert.equal((await h.rows())[0].status,'used');assert.ok(!(await h.events()).includes('fail'));
 h.sql.fault=null;await assert.rejects(()=>h.claim(start),match('identity_challenge'));await assert.rejects(()=>h.finish(handle),match('identity_challenge'));
});
test('B07 handle kopyası/başka repository ve sonradan değişen bağ reddedilir',async t=>{
 const h=await fixture(t),start=await h.begin(),handle=await h.claim(start),other=h.newRepo();
 await assert.rejects(()=>h.finish({...handle}),match('identity_challenge'));await assert.rejects(()=>h.finish(handle,other),match('identity_challenge'));
 await h.sql.db.query("UPDATE myys_identity_challenges SET nonce_binding=jsonb_set(nonce_binding,'{version}','\"other\"') WHERE state_hash=$1",[hash(start.state)]);
 await assert.rejects(()=>h.finish(handle),match('identity_challenge'));assert.equal(await h.count(),0);assert.equal((await h.rows())[0].status,'failed');
});
test('B07 sağlayıcıya verilen hata sonrası fail bir kez işler; farklı tarayıcı isteği korunur',async t=>{
 const h=await fixture(t),first=await h.begin(),handle=await h.claim(first),other=hash('other-browser');await h.begin(h.repo,other);
 assert.equal(await h.repo.fail(handle),true);await assert.rejects(()=>h.repo.fail(handle),match('identity_challenge'));assert.equal((await h.rows()).find(r=>r.browser_hash===other).status,'pending');
 await h.repo.cancelBrowser({browserHash});assert.equal((await h.rows()).find(r=>r.browser_hash===other).status,'pending');
});
test('B07 farklı issuer aynı tarayıcıda açık isteği veya contract değişimi eski handleı kullanamaz',async t=>{
 const h=await fixture(t),start=await h.begin();
 const otherScope={...scope,issuer:'https://second-idp.invalid'},tx=new PostgresIdentityTransactions({pool:h.sql.pool,...otherScope}),keys=new PostgresIdentityKeyBridge({transactions:tx,keyProvider:h.provider,...otherScope,contractDigest,clock:h.clock});
 const other=h.newRepo({...otherScope,transactions:tx,keyBridge:keys});await assert.rejects(()=>h.begin(other),match('identity_browser_scope'));
 await assert.rejects(()=>h.claim(start,other,{issuer:otherScope.issuer}),match('identity_challenge'));
 const stale=h.newRepo({contractDigest:hash('other-contract')});await assert.rejects(()=>h.claim(start,stale),match('identity_challenge'));
 await assert.rejects(()=>h.begin(stale),match('identity_challenge'));
 const wrongRedirect='https://portal.invalid/other-callback',misconfigured=h.newRepo({redirectUri:wrongRedirect});await assert.rejects(()=>h.claim(start,misconfigured,{redirectUri:wrongRedirect}),match('identity_challenge'));
 assert.equal((await h.rows())[0].status,'pending');await h.finish(await h.claim(start));
});
test('B07 yeni isteğin denetimi başarısızsa önceki pending kayıt ve state kullanılabilir kalır',async t=>{
 const h=await fixture(t),start=await h.begin();let failOnce=true;
 h.sql.fault=({text,values})=>{if(failOnce&&text.startsWith('INSERT INTO myys_identity_challenge_audit')&&values[5]==='begin'){failOnce=false;throw Object.assign(Error('audit failure'),{code:'23514'});}};
 await assert.rejects(()=>h.begin(),match('identity_store'));assert.equal((await h.rows()).length,1);assert.equal((await h.rows())[0].status,'pending');assert.deepEqual(await h.events(),['begin']);
 await h.finish(await h.claim(start));assert.equal(await h.count(),1);
});
test('B07 saat claim öncesine dönerse kabul ve sahte tarihli fail kaydı üretilemez',async t=>{
 const h=await fixture(t),start=await h.begin();h.advance(5000);const handle=await h.claim(start);h.advance(-1000);
 await assert.rejects(()=>h.finish(handle),match('identity_challenge'));assert.equal(await h.count(),0);assert.equal((await h.rows())[0].status,'claimed');assert.ok(!(await h.events()).includes('fail'));
 h.advance(1000);const next=await h.begin();await h.finish(await h.claim(next));assert.equal(await h.count(),1);
});
test('B07 çalışan yenilenince kalıcı claimed kayıt yeniden sahiplenilemez',async t=>{
 const h=await fixture(t),start=await h.begin(),oldHandle=await h.claim(start),replacement=h.newRepo();
 await assert.rejects(()=>h.claim(start,replacement),match('identity_challenge'));await assert.rejects(()=>h.finish(oldHandle,replacement),match('identity_challenge'));
 const next=await h.begin(replacement);await h.finish(await h.claim(next,replacement),replacement);assert.equal(await h.count(),1);assert.ok((await h.rows()).some(r=>r.status==='cancelled'));
});
