import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {IdentityKeyProvider} from '../myys/identity-key-provider.mjs';
import {PostgresIdentityKeyBridge} from '../myys/identity-key-bridge.mjs';
import {hash} from '../myys/store.mjs';
const scope={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'test-myys'};
const contractDigest=hash('synthetic-contract'),context=hash('synthetic-challenge');
const control={operatorRef:'test-operator',authorityDigest:hash('synthetic-control-authority')};
const match=code=>e=>e.code===code;
async function fixture(t){
 const sql=await pgliteIdentity();t.after(()=>sql.close());await sql.install();
 // The two sentinel tables only test commit atomicity. They are not a session/challenge repository.
 await sql.db.exec('CREATE TABLE test_acceptance (id text PRIMARY KEY); CREATE TABLE test_acceptance_audit (id text PRIMARY KEY CHECK (id <> \'deny\'));');
 let time=Date.parse('2026-10-14T10:00:00Z');const rows=new Map(),secrets=new Map(),current=new Map();
 const h={sql,clock:()=>new Date(time),advance:n=>{time+=n;},calls:[],hook:async()=>{}};
 h.add=(purpose,version='v1')=>{const key=purpose+':'+version;rows.set(key,{tenant:scope.tenant,purpose,version,algorithm:'HMAC-SHA-256',state:'active',notBefore:'2026-10-14T09:00:00.000Z',notAfter:'2026-10-14T11:00:00.000Z',retiredAt:null,revision:1});secrets.set(key,randomBytes(32));current.set(purpose,version);};
 h.row=(purpose,version='v1')=>rows.get(purpose+':'+version);
 for(const purpose of ['pkce','nonce'])h.add(purpose);
 h.driver={describe:async ref=>{assert.equal(sql.active,0,'provider I/O must be outside SQL transaction');h.calls.push('describe');return structuredClone(h.row(ref.purpose,ref.version||current.get(ref.purpose)));},mac:async ref=>{assert.equal(sql.active,0);h.calls.push('mac');await h.hook(ref);return {tenant:ref.tenant,purpose:ref.purpose,version:ref.version,revision:ref.revision,mac:createHmac('sha256',secrets.get(ref.purpose+':'+ref.version)).update(ref.message).digest('base64url')};}};
 h.provider=new IdentityKeyProvider({driver:h.driver,...scope,contractDigest,clock:h.clock});
 h.newBridge=(patch={})=>new PostgresIdentityKeyBridge({transactions:new PostgresIdentityTransactions({pool:sql.pool,...scope,...patch}),keyProvider:h.provider,...scope,contractDigest,clock:h.clock,...patch});
 h.bridge=h.newBridge();
 h.install=async(purpose,version='v1')=>h.bridge.recordMetadata(h.row(purpose,version),{...control,expectedRevision:0});
 for(const purpose of ['pkce','nonce'])await h.install(purpose);
 h.pair=(bridge=h.bridge,extra={})=>Promise.all(['pkce','nonce'].map(purpose=>bridge.start({purpose,context,...extra})));
 h.accept=(receipts,id='accept',bridge=h.bridge)=>bridge.withKeys(receipts,async tx=>{await tx.query('INSERT INTO test_acceptance VALUES ($1)',[id]);await tx.query('INSERT INTO test_acceptance_audit VALUES ($1)',[id]);return {id};},{browserHash:hash('browser')});
 h.count=async table=>(await sql.db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
 h.change=async(purpose,state,{version='v1',bridge=h.bridge,provider=true}={})=>{const old=h.row(purpose,version),next={...old,state,revision:old.revision+1,retiredAt:state==='retired'?h.clock().toISOString():old.retiredAt};await bridge.recordMetadata(next,{...control,expectedRevision:old.revision});if(provider)Object.assign(old,next);return next;};
 return h;
}
test('B07 SQL key bridge gerçek PostgreSQL WASM işlemiyle iki amaç ve denetimi atomik bağlar',async t=>{
 const h=await fixture(t),pair=await h.pair();const result=await h.accept(pair);
 assert.deepEqual(result,{id:'accept'});assert.equal(await h.count('test_acceptance'),1);assert.equal(await h.count('test_acceptance_audit'),1);
 assert.ok(h.sql.calls.some(c=>c.text==='BEGIN ISOLATION LEVEL SERIALIZABLE'));assert.ok(h.sql.calls.some(c=>c.text.includes('FOR UPDATE')));
 assert.ok(pair.every(r=>Object.isFrozen(r)&&Object.isFrozen(r.binding)));assert.deepEqual(Object.keys(pair[0]).sort(),['binding','mac']);
 await assert.rejects(()=>h.accept(pair,'twice'),match('identity_key_barrier'));assert.equal(await h.count('test_acceptance'),1);
});
test('B07 sağlayıcıdan sonra SQL bariyerinde iptal eski makbuzla commit yolunu kapatır',async t=>{
 const h=await fixture(t),pair=await h.pair();await h.change('nonce','revoked',{provider:false});
 await assert.rejects(()=>h.accept(pair),match('identity_key_barrier'));assert.equal(await h.count('test_acceptance'),0);
 // Stale provider says active; the current SQL revision still denies a new receipt.
 await assert.rejects(()=>h.pair(),match('identity_key_barrier'));
});
test('B07 sağlayıcı SQL sicilinden önde veya metadata süresi farklıysa güven kapalıdır',async t=>{
 const h=await fixture(t);h.row('pkce').revision=2;
 await assert.rejects(()=>h.bridge.start({purpose:'pkce',context}),match('identity_key_barrier'));
 h.row('pkce').revision=1;h.row('pkce').notAfter='2026-10-14T12:00:00.000Z';
 await assert.rejects(()=>h.bridge.start({purpose:'pkce',context}),match('identity_key_barrier'));assert.equal(await h.count('test_acceptance'),0);
});
test('B07 emekli sürüm önceki isteği yeniden doğrular; eski makbuz ve yeni istek reddedilir',async t=>{
 const h=await fixture(t),pair=await h.pair();h.advance(1000);await h.change('pkce','retired');
 await assert.rejects(()=>h.accept(pair),match('identity_key_barrier'));
 await assert.rejects(()=>h.bridge.start({purpose:'pkce',context}),match('identity_key'));
 const resumed=[];for(const r of pair)resumed.push(await h.bridge.verify(r.binding,r.mac));
 assert.deepEqual(await h.accept(resumed),{id:'accept'});
 h.add('pkce','v2');await h.install('pkce','v2');const next=await h.bridge.start({purpose:'pkce',context:hash('next')});assert.equal(next.binding.version,'v2');
 await h.change('pkce','revoked');await assert.rejects(()=>h.bridge.resume(pair[0].binding),match('identity_key'));
});
test('B07 metadata revizyonu geri alınamaz, atlanamaz, yeniden açılamaz veya süre uzatılamaz',async t=>{
 const h=await fixture(t),base=structuredClone(h.row('pkce'));
 for(const patch of [{revision:3,state:'revoked'},{revision:2,state:'active'},{revision:2,state:'revoked',notAfter:'2026-10-14T12:00:00.000Z'},{revision:2,state:'retired',retiredAt:'2026-10-14T11:00:00.000Z'}])await assert.rejects(()=>h.bridge.recordMetadata({...base,...patch},{...control,expectedRevision:1}),match('identity_key_barrier'));
 await h.change('pkce','revoked');await assert.rejects(()=>h.bridge.recordMetadata({...base,revision:3},{...control,expectedRevision:2}),match('identity_key_barrier'));
 assert.equal(await h.count('myys_identity_key_audit'),3);
});
test('B07 veritabanı aynı amaçta iki aktif sürümü ve uygunsuz JSON kapsamını reddeder',async t=>{
 const h=await fixture(t);h.add('pkce','v2');await assert.rejects(()=>h.install('pkce','v2'),match('identity_store'));
 assert.equal(await h.count('myys_identity_key_barriers'),2);assert.equal(await h.count('myys_identity_key_audit'),2);
 await assert.rejects(()=>h.sql.db.query("UPDATE myys_identity_key_barriers SET metadata=jsonb_set(metadata,'{tenant}','\"foreign\"') WHERE purpose='pkce'"),e=>e.code==='23514');
});
test('B07 denetim SQL hatası metadata değişikliğini geri alır',async t=>{
 const h=await fixture(t);await h.sql.db.exec("ALTER TABLE myys_identity_key_audit ADD CHECK (revision < 2)");
 await assert.rejects(()=>h.change('pkce','revoked'),match('identity_store'));
 assert.equal((await h.sql.db.query("SELECT metadata FROM myys_identity_key_barriers WHERE purpose='pkce'")).rows[0].metadata.state,'active');
 assert.equal(await h.count('myys_identity_key_audit'),2);await h.accept(await h.pair());
});
test('B07 anahtar kontrollü işte denetim hatası bütün SQL kabul yazısını geri alır',async t=>{
 const h=await fixture(t),pair=await h.pair();await assert.rejects(()=>h.accept(pair,'deny'),match('identity_store'));assert.equal(await h.count('test_acceptance'),0);assert.equal(await h.count('test_acceptance_audit'),0);
});
test('B07 SQL işi sırasında süre dolarsa önceden yazılan kabul de geri alınır',async t=>{
 const h=await fixture(t),pair=await h.pair(h.bridge,{lifetimeSeconds:1});
 await assert.rejects(()=>h.bridge.withKeys(pair,async tx=>{await tx.query('INSERT INTO test_acceptance VALUES ($1)',['late']);h.advance(1000);}),match('identity_key_barrier'));
 assert.equal(await h.count('test_acceptance'),0);
});
test('B07 beklenen sorgu sonrası anahtar ömrü ve geri giden saat yeniden denetlenir',async t=>{
 const h=await fixture(t),pair=await h.pair();h.advance(-1);await assert.rejects(()=>h.accept(pair),match('identity_key_barrier'));
 h.advance(1);const fresh=await h.pair();let checked=false;h.sql.fault=({text})=>{if(!checked&&text.startsWith('SELECT metadata')){checked=true;h.advance(3600000);}};
 await assert.rejects(()=>h.accept(fresh),match('identity_key_barrier'));assert.equal(await h.count('test_acceptance'),0);
});
test('B07 kopyalanmış, başka köprüden, farklı bağlamlı veya aynı amaçlı makbuz kullanılamaz',async t=>{
 const h=await fixture(t),pair=await h.pair(),other=h.newBridge(),otherPair=await h.pair(other);
 for(const bad of [[{...pair[0]},pair[1]],otherPair,[pair[0],pair[0]],[pair[0],await h.bridge.start({purpose:'nonce',context:hash('other')})]])await assert.rejects(()=>h.accept(bad),match('identity_key_barrier'));
 await h.accept(pair);assert.equal(await h.count('test_acceptance'),1);
});
test('B07 tenant, issuer, audience ve sözleşme kapsamları SQL köprüsünde karışamaz',async t=>{
 const h=await fixture(t);
 for(const patch of [{tenant:'other'},{contractDigest:hash('foreign')},{issuer:'https://foreign.invalid',transactions:new PostgresIdentityTransactions({pool:h.sql.pool,...scope})},{audience:'foreign',transactions:new PostgresIdentityTransactions({pool:h.sql.pool,...scope})}]){
  const other=h.newBridge(patch);await assert.rejects(()=>other.start({purpose:'pkce',context}),match('identity_key_barrier'));
 }
 assert.equal(await h.count('test_acceptance'),0);
});
test('B07 ortak tenant anahtarının iptali başka issuer kapsamındaki köprüyü de kapatır',async t=>{
 const h=await fixture(t),other=h.newBridge({issuer:'https://second-idp.invalid'}),pair=await h.pair(other);
 await h.change('nonce','revoked');await assert.rejects(()=>h.accept(pair,'other',other),match('identity_key_barrier'));assert.equal(await h.count('test_acceptance'),0);
});
test('B07 sıraya alınmış iki SQL yazarından yalnız biri aynı beklenen revizyonu ilerletir',async t=>{
 const h=await fixture(t),other=h.newBridge({issuer:'https://second-idp.invalid'}),next={...h.row('pkce'),state:'revoked',revision:2};
 const results=await Promise.allSettled([h.bridge,other].map(b=>b.recordMetadata(next,{...control,expectedRevision:1})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='identity_key_barrier').length,1);assert.equal(await h.count('myys_identity_key_audit'),3);
});
test('B07 gerçek SQL COMMIT sonrasında bağlantı hatası sonuç döndürmez veya tekrarlamaz',async t=>{
 const h=await fixture(t),pair=await h.pair();let commits=0;
 h.sql.fault=async({text,db})=>{if(text==='COMMIT'){commits++;await db.query('COMMIT');throw Object.assign(new Error('private transport'),{code:'ECONNRESET'});}};
 await assert.rejects(()=>h.accept(pair),match('identity_commit_unknown'));assert.equal(commits,1);assert.equal(await h.count('test_acceptance'),1);assert.equal(h.sql.releases.at(-1),true);
 await assert.rejects(()=>h.accept(pair,'again'),match('identity_key_barrier'));
});
test('B07 kalıcı PostgreSQL WASM dosyası yeniden açılınca iptal ve denetim kaybolmaz',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'myys-pg-key-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 let sql=await pgliteIdentity(dir);await sql.install();const clock=()=>new Date('2026-10-14T10:00:00.000Z');
 const provider=new IdentityKeyProvider({driver:{describe:async()=>{},mac:async()=>{}},...scope,contractDigest,clock});
 const make=()=>new PostgresIdentityKeyBridge({transactions:new PostgresIdentityTransactions({pool:sql.pool,...scope}),keyProvider:provider,...scope,contractDigest,clock});
 const value={tenant:scope.tenant,purpose:'pkce',version:'v1',algorithm:'HMAC-SHA-256',state:'active',notBefore:'2026-10-14T09:00:00.000Z',notAfter:'2026-10-14T11:00:00.000Z',retiredAt:null,revision:1};
 await make().recordMetadata(value,{...control,expectedRevision:0});await make().recordMetadata({...value,revision:2,state:'revoked'},{...control,expectedRevision:1});await sql.close();
 sql=await pgliteIdentity(dir);t.after(()=>sql.close());
 assert.equal((await sql.db.query('SELECT metadata FROM myys_identity_key_barriers')).rows[0].metadata.state,'revoked');assert.equal((await sql.db.query('SELECT count(*)::int AS n FROM myys_identity_key_audit')).rows[0].n,2);
 await assert.rejects(()=>make().recordMetadata({...value,revision:3},{...control,expectedRevision:2}),match('identity_key_barrier'));
});
