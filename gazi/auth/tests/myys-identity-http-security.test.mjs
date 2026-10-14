import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {PostgresIdentityHttpSecurity} from '../myys/identity-http-security.mjs';
import {hash} from '../myys/store.mjs';
const code=c=>e=>e.code===c,scope={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'myys'},control={expectedRevision:0,operatorRef:'synthetic-admin',authorityDigest:'a'.repeat(64)};
test('B07 SQL academic profile cannot reuse an identity-only HTTP epoch or silently enable write purposes',()=>use(async f=>{
 await assert.rejects(f.security.check({...f.req,purpose:'academic-write'}),code('identity_rate_input'));
 const academic=f.make({allowAcademic:true});await assert.rejects(academic.assertCurrent(),code('identity_http_epoch'));
 const next=f.make({allowAcademic:true,key:f.keys[1],keyRevision:2});await next.activate({...control,expectedRevision:1});await next.assertCurrent();
 await assert.rejects(f.security.assertCurrent(),code('identity_http_epoch'));
 assert.throws(()=>f.make({allowAcademic:'true'}),code('identity_http_config'));
}));
test('B07 SQL academic write requires private successful CSRF verification before any guarded work',()=>use(async f=>{
 const security=f.make({allowAcademic:true});await security.activate(control);
 const read=await security.check({...f.req,purpose:'academic-read'}),csrf=await security.csrf(read,f.browserToken),req={...f.req,purpose:'academic-write'},permit=await security.check(req);
 const guard=p=>f.tx.run(tx=>security.assertPermit(tx,p,req));
 await assert.rejects(guard(permit),code('identity_http_permit'));
 await assert.rejects(security.verifyCsrf(permit,f.browserToken,'x'.repeat(43)),code('identity_csrf'));
 await assert.rejects(guard(permit),code('identity_http_permit'));
 await security.verifyCsrf(permit,f.browserToken,csrf);await guard(permit);
 await assert.rejects(guard({...permit,csrfVerified:true}),code('identity_http_permit'));
 security.close(permit);await assert.rejects(guard(permit),code('identity_http_permit'));
},{activate:false}));
async function use(fn,{install=true,activate=true,limits={global:5,network:2,browser:1,seconds:60}}={}){
 const h=await pgliteIdentity();let now=Date.parse('2026-10-14T12:00:00.000Z');try{
 if(install)await h.db.exec(await readFile(new URL('../myys/identity-http-schema.sql',import.meta.url),'utf8'));
 const keys=[randomBytes(32),randomBytes(32),randomBytes(32)],tx=new PostgresIdentityTransactions({pool:h.pool,...scope}),config={transactions:tx,...scope,origin:'https://app.invalid',contractDigest:'b'.repeat(64),key:keys[0],limits,clock:()=>new Date(now)},make=patch=>new PostgresIdentityHttpSecurity({...config,...patch}),security=make(),browserToken=randomBytes(32).toString('base64url'),req={purpose:'start',network:'127.0.0.1',browserHash:hash(browserToken)};
 const f={h,keys,tx,security,config,make,req,browserToken,advance:n=>{now+=n;},now:()=>now,async state(){const out={};for(const table of ['epochs','history','buckets'])out[table]=(await h.db.query('SELECT * FROM myys_identity_http_'+table+' ORDER BY tenant,issuer,audience'+(table==='history'?',revision':table==='buckets'?',purpose,kind,bucket':''))).rows;return JSON.stringify(out);}};if(activate)await security.activate(control);await fn(f);
 }finally{await h.close();}
}
test('B07 SQL HTTP runtime neither installs schema nor activates it',()=>use(async f=>{
 await assert.rejects(f.security.check(f.req),code('identity_store'));assert.equal((await f.h.db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_name LIKE 'myys_identity_http_%'")).rows[0].n,0);
},{install:false,activate:false}));
test('B07 SQL HTTP activation is explicit; configuration must match exactly',()=>use(async f=>{
 await assert.rejects(f.security.assertCurrent(),code('identity_http_epoch'));await f.security.activate(control);await f.security.assertCurrent();for(const patch of [{key:f.keys[1]},{limits:{...f.config.limits,global:6}},{contractDigest:'c'.repeat(64)},{origin:'https://other.invalid'}])await assert.rejects(f.make(patch).assertCurrent(),code('identity_http_epoch'));
 for(const patch of [{limits:{...f.config.limits,extra:1}},{origin:'https://app.invalid/path'},{key:Buffer.alloc(31)}])assert.throws(()=>f.make(patch),code('identity_http_config'));
},{activate:false}));
test('B07 SQL HTTP blocked browser does not spend other atomic budgets',()=>use(async f=>{
 const p=await f.security.check(f.req);assert.deepEqual(Object.keys(p),[]);assert.ok(Object.isFrozen(p));const before=await f.state();await assert.rejects(f.security.check(f.req),code('identity_rate'));assert.equal(await f.state(),before);await f.security.check({...f.req,browserHash:'d'.repeat(64)});const after=await f.state();await assert.rejects(f.security.check({...f.req,browserHash:'e'.repeat(64)}),code('identity_rate'));assert.equal(await f.state(),after);
}));
test('B07 SQL HTTP anonymous invalid starts spend global and peer budgets',()=>use(async f=>{
 const p=await f.security.check({...f.req,browserHash:null});await assert.rejects(f.security.verifyCsrf(p,f.browserToken,'a'.repeat(43)),code('identity_csrf'));await f.security.check({...f.req,browserHash:null});await assert.rejects(f.security.check({...f.req,browserHash:null}),code('identity_rate'));assert.deepEqual((await f.h.db.query('SELECT kind,used FROM myys_identity_http_buckets ORDER BY kind')).rows,[{kind:'global',used:2},{kind:'network',used:2}]);
}));
test('B07 SQL HTTP separate instances share budget under queued concurrent calls',()=>use(async f=>{
 const results=await Promise.allSettled([f.security.check(f.req),f.make().check(f.req)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'identity_rate');const rows=(await f.h.db.query('SELECT used FROM myys_identity_http_buckets')).rows;assert.equal(rows.length,3);assert.ok(rows.every(r=>r.used===1));
}));
test('B07 SQL HTTP all purpose windows drain before rotation; old worker fails closed',()=>use(async f=>{
 await f.security.check({...f.req,purpose:'backchannel'});const next=f.make({key:f.keys[1],keyRevision:2}),before=await f.state();await assert.rejects(next.activate({...control,expectedRevision:1}),code('identity_key_rotation_wait'));assert.equal(await f.state(),before);f.advance(60000);await next.activate({...control,expectedRevision:1});await next.check(f.req);await assert.rejects(f.security.check(f.req),code('identity_http_epoch'));
}));
test('B07 SQL HTTP skips, stale control and key ABA cannot activate',()=>use(async f=>{
 await assert.rejects(f.make({key:f.keys[2],keyRevision:3}).activate({...control,expectedRevision:2}),code('identity_http_epoch'));await assert.rejects(f.make({key:f.keys[1],keyRevision:2}).activate(control),code('identity_http_control'));await f.make({key:f.keys[1],keyRevision:2}).activate({...control,expectedRevision:1});await assert.rejects(f.make({key:f.keys[0],keyRevision:3}).activate({...control,expectedRevision:2}),code('identity_http_epoch'));assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_history')).rows[0].n,2);
}));
test('B07 SQL HTTP epoch and history audit roll back together',()=>use(async f=>{
 const before=await f.state();f.h.fault=({text})=>{if(text.startsWith('INSERT INTO myys_identity_http_history'))throw Error('synthetic audit failure');};await assert.rejects(f.make({key:f.keys[1],keyRevision:2}).activate({...control,expectedRevision:1}),code('identity_store'));f.h.fault=null;assert.equal(await f.state(),before);await f.security.assertCurrent();
}));
test('B07 SQL HTTP partial bucket write failure rolls every counter back',()=>use(async f=>{
 const before=await f.state();let inserts=0;f.h.fault=({text})=>{if(text.startsWith('INSERT INTO myys_identity_http_buckets')&&++inserts===2)throw Error('synthetic bucket failure');};await assert.rejects(f.security.check(f.req),code('identity_store'));f.h.fault=null;assert.equal(await f.state(),before);
}));
test('B07 SQL HTTP actual uncertain COMMIT spends budget but returns no permit',()=>use(async f=>{
 let commits=0;f.h.fault=async({text,db})=>{if(text==='COMMIT'){commits++;await db.exec('COMMIT');throw Error('synthetic loss after commit');}};await assert.rejects(f.security.check(f.req),code('identity_commit_unknown'));f.h.fault=null;assert.equal(commits,1);assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_buckets')).rows[0].n,3);await assert.rejects(f.security.check(f.req),code('identity_rate'));
}));
test('B07 SQL HTTP CSRF binds cookie, purpose, SQL epoch and origin',()=>use(async f=>{
 const login=await f.security.check({...f.req,purpose:'login'}),csrf=await f.security.csrf(login,f.browserToken),start=await f.security.check(f.req);assert.match(csrf,/^[A-Za-z0-9_-]{43}$/);await f.security.verifyCsrf(start,f.browserToken,csrf);await assert.rejects(f.security.verifyCsrf(start,randomBytes(32).toString('base64url'),csrf),code('identity_csrf'));await assert.rejects(f.security.verifyCsrf(login,f.browserToken,csrf),code('identity_csrf'));await assert.rejects(f.security.csrf(start,f.browserToken),code('identity_csrf'));await assert.rejects(f.security.verifyCsrf(start,f.browserToken,'x'.repeat(43)),code('identity_csrf'));await assert.rejects(f.make({origin:'https://other.invalid'}).csrf(login,f.browserToken),code('identity_http_permit'));
}));
test('B07 SQL HTTP permits reject clones, other instances, purpose changes and closure',()=>use(async f=>{
 const p=await f.security.check(f.req),guard=(permit,expect=f.req)=>f.tx.run(tx=>f.security.assertPermit(tx,permit,expect));await guard(p);await guard(p);await assert.rejects(guard({...p}),code('identity_http_permit'));await assert.rejects(f.tx.run(tx=>f.make().assertPermit(tx,p,f.req)),code('identity_http_permit'));await assert.rejects(guard(p,{...f.req,purpose:'callback'}),code('identity_http_permit'));await assert.rejects(guard(p,{...f.req,browserHash:'e'.repeat(64)}),code('identity_http_permit'));f.security.close(p);f.security.close(p);await assert.rejects(guard(p),code('identity_http_permit'));
}));
test('B07 SQL HTTP final guard rejects rotation before callback permit expires',()=>use(async f=>{
 f.advance(59500);const req={...f.req,purpose:'callback'},p=await f.security.check(req);await f.h.db.exec('CREATE TABLE synthetic_http_write (id TEXT PRIMARY KEY)');f.advance(500);await f.make({key:f.keys[1],keyRevision:2}).activate({...control,expectedRevision:1});await assert.rejects(f.tx.run(async tx=>{await tx.query('INSERT INTO synthetic_http_write VALUES ($1)',['must-rollback']);await f.security.assertPermit(tx,p,req);}),code('identity_http_epoch'));assert.equal((await f.h.db.query('SELECT count(*)::int n FROM synthetic_http_write')).rows[0].n,0);
}));
test('B07 SQL HTTP permit expiry and backward time reject guarded SQL work',()=>use(async f=>{
 const p=await f.security.check(f.req);await f.h.db.exec('CREATE TABLE synthetic_http_write (id TEXT PRIMARY KEY)');await assert.rejects(f.tx.run(async tx=>{await tx.query('INSERT INTO synthetic_http_write VALUES ($1)',['expired']);f.advance(30000);await f.security.assertPermit(tx,p,f.req);}),code('identity_http_permit'));assert.equal((await f.h.db.query('SELECT count(*)::int n FROM synthetic_http_write')).rows[0].n,0);f.advance(-30001);await assert.rejects(f.security.assertCurrent(),code('identity_http_epoch'));
}));
test('B07 SQL HTTP transaction ownership rejects forged, ended and other repository transactions',()=>use(async f=>{
 const p=await f.security.check(f.req);let escaped;await f.tx.run(async tx=>{escaped=tx;assert.ok(f.tx.owns(tx));await f.security.assertPermit(tx,p,f.req);});assert.equal(f.tx.owns(escaped),false);await assert.rejects(f.security.assertPermit(escaped,p,f.req),code('identity_http_scope'));await assert.rejects(f.security.assertPermit({scope,query:async()=>({rows:[]})},p,f.req),code('identity_http_scope'));const otherTx=new PostgresIdentityTransactions({pool:f.h.pool,...scope});await assert.rejects(otherTx.run(tx=>f.security.assertPermit(tx,p,f.req)),code('identity_http_scope'));await assert.rejects(f.make({tenant:'other'}).assertCurrent(),code('identity_http_scope'));
}));
test('B07 SQL HTTP scope budgets are separate and raw key/peer/cookie are not persisted',()=>use(async f=>{
 await f.security.check(f.req);const otherScope={...scope,tenant:'other'},otherTx=new PostgresIdentityTransactions({pool:f.h.pool,...otherScope}),other=f.make({...otherScope,transactions:otherTx});await other.activate(control);await other.check(f.req);const state=await f.state();for(const secret of [f.keys[0].toString('hex'),f.keys[0].toString('base64url'),f.req.network,f.req.browserHash,f.browserToken])assert.equal(state.includes(secret),false);assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_epochs')).rows[0].n,2);
}));
test('B07 SQL HTTP next window prunes expired scope counters and admits again',()=>use(async f=>{
 await f.security.check(f.req);f.advance(60000);await f.security.check(f.req);const rows=(await f.h.db.query('SELECT started,ends,used FROM myys_identity_http_buckets')).rows;assert.equal(rows.length,3);assert.ok(rows.every(r=>Number(r.started)===f.now()&&r.used===1&&Number(r.ends)===f.now()+60000));
}));
test('B07 SQL HTTP global budget cannot be bypassed by changing transport peers',()=>use(async f=>{
 for(let i=1;i<=5;i++)await f.security.check({...f.req,network:'127.0.0.'+i,browserHash:hash('synthetic-browser-'+i)});const before=await f.state();await assert.rejects(f.security.check({...f.req,network:'127.0.0.6',browserHash:hash('synthetic-browser-6')}),code('identity_rate'));assert.equal(await f.state(),before);const row=(await f.h.db.query("SELECT used FROM myys_identity_http_buckets WHERE kind='global'")).rows[0];assert.equal(row.used,5);
}));
test('B07 SQL HTTP tenant, issuer and audience counters and cleanup remain isolated',()=>use(async f=>{
 const others=[];for(const patch of [{tenant:'other'},{issuer:'https://other.invalid'},{audience:'other'}]){const nextScope={...scope,...patch},transactions=new PostgresIdentityTransactions({pool:f.h.pool,...nextScope}),s=f.make({...nextScope,transactions});await s.activate(control);await s.check(f.req);others.push(s);}await f.security.check(f.req);f.advance(60000);await f.security.check(f.req);assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_buckets')).rows[0].n,12);assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_buckets WHERE ends<=$1',[f.now()])).rows[0].n,9);for(const s of others)await s.check(f.req);assert.equal((await f.h.db.query('SELECT count(*)::int n FROM myys_identity_http_buckets WHERE ends<=$1',[f.now()])).rows[0].n,0);
}));
test('B07 SQL HTTP old CSRF generation and validation reject a rotated SQL epoch',()=>use(async f=>{
 f.advance(59500);const login=await f.security.check({...f.req,purpose:'login'}),oldCsrf=await f.security.csrf(login,f.browserToken),logout=await f.security.check({...f.req,purpose:'logout'});f.advance(500);const next=f.make({key:f.keys[1],keyRevision:2});await next.activate({...control,expectedRevision:1});await assert.rejects(f.security.csrf(login,f.browserToken),code('identity_http_epoch'));await assert.rejects(f.security.verifyCsrf(logout,f.browserToken,oldCsrf),code('identity_http_epoch'));const p=await next.check({...f.req,purpose:'login'}),csrf=await next.csrf(p,f.browserToken),start=await next.check(f.req);assert.notEqual(csrf,oldCsrf);await assert.rejects(next.verifyCsrf(start,f.browserToken,oldCsrf),code('identity_csrf'));await next.verifyCsrf(start,f.browserToken,csrf);
}));
test('B07 SQL HTTP malformed scope inputs are rejected before counters change',()=>use(async f=>{
 const before=await f.state();for(const patch of [{purpose:'unknown'},{network:'client-supplied-header'},{browserHash:'not-a-digest'}])await assert.rejects(f.security.check({...f.req,...patch}),code('identity_rate_input'));assert.equal(await f.state(),before);
}));
test('B07 SQL HTTP disk close and reopen preserves live budget and key history',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path');const dir=await mkdtemp(join(tmpdir(),'myys-http-sql-'));let h;try{
 let now=Date.parse('2026-10-14T12:00:00.000Z');const key=randomBytes(32),nextKey=randomBytes(32),config={...scope,origin:'https://app.invalid',contractDigest:'b'.repeat(64),key,clock:()=>new Date(now),limits:{global:5,network:2,browser:1,seconds:60}},req={purpose:'start',network:'127.0.0.1',browserHash:'d'.repeat(64)};
 h=await pgliteIdentity(dir);await h.db.exec(await readFile(new URL('../myys/identity-http-schema.sql',import.meta.url),'utf8'));let tx=new PostgresIdentityTransactions({pool:h.pool,...scope}),s=new PostgresIdentityHttpSecurity({...config,transactions:tx});await s.activate(control);const oldPermit=await s.check(req);await h.close();h=await pgliteIdentity(dir);tx=new PostgresIdentityTransactions({pool:h.pool,...scope});s=new PostgresIdentityHttpSecurity({...config,transactions:tx});await assert.rejects(s.check(req),code('identity_rate'));await assert.rejects(tx.run(t=>s.assertPermit(t,oldPermit,req)),code('identity_http_permit'));const next=new PostgresIdentityHttpSecurity({...config,key:nextKey,keyRevision:2,transactions:tx});await assert.rejects(next.activate({...control,expectedRevision:1}),code('identity_key_rotation_wait'));now+=60000;await next.activate({...control,expectedRevision:1});await assert.rejects(s.assertCurrent(),code('identity_http_epoch'));assert.equal((await h.db.query('SELECT count(*)::int n FROM myys_identity_http_history')).rows[0].n,2);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
