import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHmac} from 'node:crypto';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {IdentityKeyProvider} from '../myys/identity-key-provider.mjs';
import {hash,CoreError} from '../myys/store.mjs';
const scope={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'test-myys'};
const match=code=>e=>e.code===code;
const sqlError=code=>Object.assign(new Error('private database host, SQL and values must not escape'),{code});
// Fault-injection protocol driver, deliberately NOT a PostgreSQL emulator or SQL conformance test.
function poolHarness(){
 const h={connections:[],calls:[],state:[],fault:null,pool:null};
 h.pool={connect:async()=>{
  const n=h.connections.length,c={n,released:null,draft:null};h.connections.push(c);
  c.query=async(text,values=[])=>{
   h.calls.push({n,text,values});if(h.fault)await h.fault({n,text,values,c});
   if(text.startsWith('BEGIN'))c.draft=[...h.state];
   if(text==='COMMIT'){h.state=c.draft;c.draft=null;}
   if(text==='ROLLBACK')c.draft=null;
   if(text.startsWith('INSERT test'))c.draft.push(values[0]);
   return {rows:[],rowCount:1};
  };
  c.release=destroy=>{c.released=!!destroy;};return c;
 }};
 h.tx=new PostgresIdentityTransactions({pool:h.pool,...scope});return h;
}
test('B07 PostgreSQL sınırı aynı client ve kurum/tarayıcı işlem kilidi kullanır',async()=>{
 const h=poolHarness(),browserHash=hash('browser');let escaped;
 const result=await h.tx.run(async tx=>{escaped=tx;assert.deepEqual(tx.scope,scope);await tx.query('INSERT test session', ['opaque-session-hash']);await tx.query('INSERT test audit',['accept']);return {ok:true};},{browserHash});
 assert.deepEqual(result,{ok:true});assert.deepEqual(h.state,['opaque-session-hash','accept']);assert.equal(h.connections[0].released,false);assert.equal(h.calls[0].text,'BEGIN ISOLATION LEVEL SERIALIZABLE');assert.equal(h.calls.at(-1).text,'COMMIT');
 const locks=h.calls.filter(x=>x.text.includes('pg_advisory_xact_lock'));assert.equal(locks.length,2);assert.ok(locks.every(x=>/^-?\d+$/.test(x.values[0])));assert.ok(h.calls.every(x=>x.n===0&&typeof x.text==='string'));
 assert.throws(()=>escaped.query('INSERT test audit',['late']),match('identity_transaction'));assert.equal(h.state.length,2);
});
test('B07 işlem kapsamı kopyalanır; tenant ve browser kilitleri kapsamına göre ayrılır',async()=>{
 const h=poolHarness(),key=hash('same-browser');await h.tx.run(async()=>{},{browserHash:key});
 const a=h.calls.filter(x=>x.text.includes('pg_advisory')).map(x=>x.values[0]);h.calls=[];
 const b=new PostgresIdentityTransactions({pool:h.pool,...scope,tenant:'other'});await b.run(async()=>{},{browserHash:key});
 const next=h.calls.filter(x=>x.text.includes('pg_advisory')).map(x=>x.values[0]);assert.equal(a.filter(x=>next.includes(x)).length,1);
 await h.tx.run(async tx=>{assert.throws(()=>{tx.scope.tenant='other';});});
});
test('B07 denetim yazısı hatası session ile birlikte geri alınır ve ayrıntı sızmaz',async()=>{
 const h=poolHarness();h.fault=({text})=>{if(text==='INSERT test audit')throw sqlError('23514');};
 await assert.rejects(()=>h.tx.run(async tx=>{await tx.query('INSERT test session',['private']);await tx.query('INSERT test audit',['accept']);}),e=>e.code==='identity_store'&&!e.message.includes('private'));
 assert.deepEqual(h.state,[]);assert.equal(h.calls.at(-1).text,'ROLLBACK');assert.equal(h.connections[0].released,false);
});
test('B07 yalnız açıkça güvenli bütün SQL işlemi serialization hatasında yeniden çalışır',async()=>{
 const h=poolHarness();let work=0;h.fault=({n,text})=>{if(n===0&&text==='COMMIT')throw sqlError('40001');};
 await h.tx.run(async tx=>{work++;await tx.query('INSERT test audit',['once']);},{retrySafe:true});assert.equal(work,2);assert.deepEqual(h.state,['once']);assert.equal(h.connections.length,2);assert.ok(h.connections.every(c=>c.released===false));
});
test('B07 varsayılan tekrar kapalı; deadlock tekrar sayısı sınırlı',async()=>{
 const h=poolHarness();h.fault=({text})=>{if(text==='INSERT test audit')throw sqlError('40P01');};
 await assert.rejects(()=>h.tx.run(tx=>tx.query('INSERT test audit',['a'])),match('identity_store'));assert.equal(h.connections.length,1);
 await assert.rejects(()=>h.tx.run(tx=>tx.query('INSERT test audit',['a']),{retrySafe:true}),match('identity_store'));assert.equal(h.connections.length,4);assert.deepEqual(h.state,[]);
});
test('B07 belirsiz COMMIT yeniden denenmez, session sonucu dönmez, bağlantı atılır',async()=>{
 const h=poolHarness();let work=0;h.fault=({text,c})=>{if(text==='COMMIT'){h.state=c.draft;throw sqlError('ECONNRESET');}};
 await assert.rejects(()=>h.tx.run(async tx=>{work++;await tx.query('INSERT test session',['possibly-committed']);return {sessionToken:'must-not-return'};},{retrySafe:true}),match('identity_commit_unknown'));
 assert.equal(work,1);assert.deepEqual(h.state,['possibly-committed']);assert.equal(h.connections[0].released,true);assert.ok(!h.calls.some(x=>x.text==='ROLLBACK'));
});
test('B07 rollback başarısızsa yeniden deneme ve havuza dönüş yok',async()=>{
 const h=poolHarness();h.fault=({text})=>{if(text==='INSERT test audit')throw sqlError('40001');if(text==='ROLLBACK')throw sqlError('ECONNRESET');};
 await assert.rejects(()=>h.tx.run(tx=>tx.query('INSERT test audit',['a']),{retrySafe:true}),match('identity_store'));assert.equal(h.connections.length,1);assert.equal(h.connections[0].released,true);
});
test('B07 beklenmeyen SQL sorgusu ve yutulan sorgu hatası COMMIT edilemez',async()=>{
 const h=poolHarness();let finish;
 h.fault=({text})=>text==='INSERT test delayed'?new Promise(resolve=>{finish=resolve;}):undefined;
 await assert.rejects(()=>h.tx.run(tx=>{tx.query('INSERT test delayed',['late']);return 1;}),match('identity_transaction'));assert.equal(h.connections[0].released,true);assert.ok(!h.calls.some(x=>x.text==='COMMIT'));finish();await new Promise(r=>setImmediate(r));
 const other=poolHarness();other.fault=({text})=>{if(text==='INSERT test audit')throw sqlError('40001');};
 await assert.rejects(()=>other.tx.run(async tx=>{try{await tx.query('INSERT test audit',['x']);}catch{}return 1;}),match('identity_transaction'));assert.deepEqual(other.state,[]);
});
test('B07 eşzamanlı/iç içe client sorgusu ve geçersiz kapsam reddedilir',async()=>{
 const h=poolHarness();await assert.rejects(()=>h.tx.run(async()=>h.tx.run(async()=>{})),match('identity_transaction'));assert.equal(h.connections.length,1);
 await h.tx.run(async tx=>{const p=tx.query('SELECT test');assert.throws(()=>tx.query('SELECT other'),match('identity_transaction'));await p;});
});
test('B07 driver bağlantı/BEGIN hataları genel yanıt verir; schema/credential kurulmaz',async()=>{
 const tx=new PostgresIdentityTransactions({pool:{connect:async()=>{throw sqlError('ECONNREFUSED');}},...scope});await assert.rejects(()=>tx.run(()=>1),match('identity_store'));
 const h=poolHarness();h.fault=({text})=>{if(text.startsWith('BEGIN'))throw sqlError('08006');};await assert.rejects(()=>h.tx.run(()=>1),match('identity_store'));assert.equal(h.connections[0].released,true);
 for(const patch of [{tenant:''},{issuer:'http://idp.invalid'},{maxRetries:10},{statementTimeoutMs:0}])assert.throws(()=>new PostgresIdentityTransactions({pool:h.pool,...scope,...patch}));
});
function keyHarness(){
 let time=Date.parse('2026-10-14T10:00:00Z');const keys=new Map(),rows=new Map(),latest=new Map();
 const h={calls:[],hook:async()=>{},advance:n=>{time+=n;},now:()=>new Date(time),contractDigest:hash('contract'),tenant:'test-gazi'};
 h.add=(purpose,version)=>{const k=purpose+':'+version;keys.set(k,randomBytes(32));rows.set(k,{tenant:h.tenant,purpose,version,algorithm:'HMAC-SHA-256',state:'active',notBefore:'2026-10-14T09:00:00.000Z',notAfter:'2026-10-14T11:00:00.000Z',retiredAt:null,revision:1});latest.set(purpose,version);};
 for(const p of ['pkce','nonce'])h.add(p,'v1');
 h.row=(p,v='v1')=>rows.get(p+':'+v);
 h.driver={describe:async ref=>{h.calls.push({method:'describe',...ref});return structuredClone(h.row(ref.purpose,ref.version||latest.get(ref.purpose)));},mac:async(ref,{signal})=>{h.calls.push({method:'mac',...ref});await h.hook(ref,signal);return {tenant:ref.tenant,purpose:ref.purpose,version:ref.version,revision:ref.revision,mac:createHmac('sha256',keys.get(ref.purpose+':'+ref.version)).update(ref.message).digest('base64url')};}};
 h.provider=new IdentityKeyProvider({driver:h.driver,tenant:h.tenant,contractDigest:h.contractDigest,clock:h.now,timeoutMs:30});return h;
}
test('B07 anahtar sağlayıcısı PKCE/nonce amaçlarını ayırır; yalnız MAC ve sürüm bağı döner',async()=>{
 const h=keyHarness(),a=await h.provider.start({purpose:'pkce',context:hash('request')}),b=await h.provider.start({purpose:'nonce',context:hash('request')});assert.notEqual(a.mac,b.mac);assert.equal(Buffer.from(a.mac,'base64url').length,32);assert.equal(a.binding.version,'v1');assert.ok(!JSON.stringify(a).includes('secret'));h.advance(1000);assert.equal((await h.provider.verify(a.binding,a.mac)).mac,a.mac);
 const c=new IdentityKeyProvider({driver:h.driver,tenant:'other',contractDigest:h.contractDigest,clock:h.now});await assert.rejects(()=>c.resume(a.binding),match('identity_key'));const d=new IdentityKeyProvider({driver:h.driver,tenant:h.tenant,contractDigest:hash('other'),clock:h.now});await assert.rejects(()=>d.resume(a.binding),match('identity_key'));
});
test('B07 rotasyonda yeni istek v2, önceki istek sınırlı eski sürümle devam eder',async()=>{
 const h=keyHarness(),old=await h.provider.start({purpose:'pkce',context:hash('old')});h.advance(1000);Object.assign(h.row('pkce'),{state:'retired',retiredAt:h.now().toISOString(),revision:2});h.add('pkce','v2');
 assert.equal((await h.provider.verify(old.binding,old.mac)).mac,old.mac);assert.equal((await h.provider.start({purpose:'pkce',context:hash('new')})).binding.version,'v2');h.advance(300000);await assert.rejects(()=>h.provider.resume(old.binding),match('identity_key'));
});
test('B07 iptal edilmiş/silinmiş/yanlış amaçlı anahtar, oynanmış sürüm ve MAC reddedilir',async()=>{
 const h=keyHarness(),a=await h.provider.start({purpose:'pkce',context:hash('x')});
 for(const patch of [{version:'missing'},{purpose:'rate'},{tenant:'foreign'},{context:'raw-private-token'},{created:'invalid'},{extra:'private'}])await assert.rejects(()=>h.provider.resume({...a.binding,...patch}),match('identity_key'));
 await assert.rejects(()=>h.provider.verify(a.binding,'a'.repeat(43)),match('identity_key'));h.row('pkce').state='revoked';await assert.rejects(()=>h.provider.resume(a.binding),match('identity_key'));
});
test('B07 anahtar kullanımı sürerken revizyon/iptal değişirse sonuç kabul edilmez',async()=>{
 for(const change of [r=>r.revision++,r=>r.state='revoked']){const h=keyHarness();h.hook=()=>change(h.row('pkce'));await assert.rejects(()=>h.provider.start({purpose:'pkce',context:hash('x')}),match('identity_key'));}
});
test('B07 sağlayıcı ayrıntısı/sır alanı/yanlış MAC yanıtı dışarı çıkmaz',async()=>{
 for(const patch of [{privateKey:'never return this'},{version:'other'},{tenant:'foreign'},{revision:42},{mac:'bad'}]){
  const h=keyHarness(),real=h.driver.mac;h.driver.mac=async(...a)=>({...await real(...a),...patch});await assert.rejects(()=>h.provider.start({purpose:'pkce',context:hash('x')}),e=>e.code==='identity_key'&&!e.message.includes('never'));
 }
 const h=keyHarness();h.driver.describe=()=>{throw Error('secret endpoint');};await assert.rejects(()=>h.provider.start({purpose:'nonce',context:hash('x')}),e=>!e.message.includes('secret'));
});
test('B07 zaman aşımı abort eder; sonradan gelen MAC oturum/bağ oluşturmaz',async()=>{
 const h=keyHarness();let finish,signal;h.hook=(_,s)=>{signal=s;return new Promise(r=>{finish=r;});};await assert.rejects(()=>h.provider.start({purpose:'pkce',context:hash('x')}),match('identity_key'));assert.equal(signal.aborted,true);finish();await new Promise(r=>setImmediate(r));assert.equal(h.calls.filter(x=>x.method==='describe').length,1);
});
test('B07 MAC sonrası metadata yanıtı gecikirse istek son kullanma zamanı yeniden denetlenir',async()=>{
 const h=keyHarness(),original=h.driver.describe;let n=0;h.driver.describe=async ref=>{const r=await original(ref);if(++n===2)h.advance(1001);return r;};await assert.rejects(()=>h.provider.start({purpose:'pkce',context:hash('x'),lifetimeSeconds:1}),match('identity_key'));
});
test('B07 saat geri gitmesi, geçiş sınırı ve genişletilmiş/bozuk profil reddedilir',async()=>{
 const h=keyHarness(),a=await h.provider.start({purpose:'pkce',context:hash('x')});h.advance(-1);await assert.rejects(()=>h.provider.resume(a.binding),match('identity_key'));h.advance(1);Object.assign(h.row('pkce'),{state:'retired',retiredAt:h.now().toISOString(),revision:2});await assert.rejects(()=>h.provider.resume(a.binding),match('identity_key'));
 for(const purpose of ['csrf','rate','unknown'])await assert.rejects(()=>h.provider.start({purpose,context:hash('x')}),match('identity_key'));
});
test('B07 sürücü CoreError ayrıntısı gizlenir; güvenli iş kuralı hatası korunur',async()=>{
 const h=poolHarness();h.fault=({text})=>{if(text==='INSERT test audit')throw new CoreError('private','secret endpoint',500);};
 await assert.rejects(()=>h.tx.run(tx=>tx.query('INSERT test audit',['x'])),e=>e.code==='identity_store'&&!e.message.includes('secret'));
 await assert.rejects(()=>h.tx.run(()=>{throw new CoreError('membership_required','Kurum üyeliği yok.',403);}),match('membership_required'));
});
test('B07 iki işçi güncel anahtar kapanışını yeniden okur; olumlu anahtar önbelleği yok',async()=>{
 const h=keyHarness(),other=new IdentityKeyProvider({driver:h.driver,tenant:h.tenant,contractDigest:h.contractDigest,clock:h.now});const a=await h.provider.start({purpose:'nonce',context:hash('request')});
 assert.equal((await other.verify(a.binding,a.mac)).mac,a.mac);h.row('nonce').state='revoked';h.row('nonce').revision++;
 await assert.rejects(()=>h.provider.resume(a.binding),match('identity_key'));await assert.rejects(()=>other.resume(a.binding),match('identity_key'));
});
