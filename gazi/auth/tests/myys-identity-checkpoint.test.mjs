import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync,lstatSync,chmodSync,readFileSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {sqlIdentityFlow} from './helpers/sql-identity-flow.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {PostgresIdentityCheckpoint,identityCheckpointProfile} from '../myys/identity-checkpoint.mjs';
import {LocalIdentityCheckpointJournal} from '../scripts/lib/local-identity-checkpoint.mjs';
import {PostgresIdentityHttpSecurity} from '../myys/identity-http-security.mjs';
import {identitySqlContractDigest} from '../myys/identity-sql-flow.mjs';
import {CoreError,hash} from '../myys/store.mjs';
const code=c=>e=>e.code===c,closed=code('identity_checkpoint'),scope={tenant:'test-gazi',issuer:'https://idp.invalid',audience:'test-myys'},control={operatorRef:'synthetic-control',authorityDigest:hash('synthetic-commission')};
async function fixture(t,{initialize=true,install=true}={}){
 const dir=mkdtempSync(join(tmpdir(),'myys-checkpoint-')),sql=await pgliteIdentity();const directory=join(dir,'journal'),journalId=randomUUID(),journal=LocalIdentityCheckpointJournal.create({directory,journalId});
 t.after(async()=>{journal.close();await sql.close();rmSync(dir,{recursive:true,force:true});});
 const h={dir,directory,journalId,journal,sql,hook:async()=>{}};
 const driver=Object.fromEntries(['reserve','commit','abort'].map(method=>[method,async(...args)=>{assert.equal(sql.active,0);await h.hook(method,...args);return journal[method](...args);} ]));
 h.checkpoint=new PostgresIdentityCheckpoint({journalDriver:driver,journalId});h.tx=new PostgresIdentityTransactions({pool:sql.pool,...scope,checkpoint:h.checkpoint});
 if(install)for(const name of ['identity-key-schema.sql','identity-challenge-schema.sql','identity-session-schema.sql','identity-http-schema.sql','identity-checkpoint-schema.sql'])await sql.db.exec(await readFile(new URL('../myys/'+name,import.meta.url),'utf8'));
 if(initialize)await h.tx.initializeCheckpoint(control);return h;
}
async function flowFixture(t){
 const dir=mkdtempSync(join(tmpdir(),'myys-checkpoint-flow-')),closers=[];
 const h=await sqlIdentityFlow({after:fn=>closers.push(fn)},{checkpointDirectory:join(dir,'journal')});
 t.after(async()=>{for(const fn of closers)await fn();rmSync(dir,{recursive:true,force:true});});h.dir=dir;return h;
}
const write=tx=>tx.query('INSERT INTO myys_identity_persons(id,issuer,subject,active,revision) VALUES($1,$2,$3,true,1)',['synthetic',scope.issuer,'synthetic']);
test('B07/B28 checkpoint runtime creates no SQL schema and requires explicit empty initialization',async t=>{
 const h=await fixture(t,{install:false,initialize:false});let ran=false;await assert.rejects(h.tx.run(()=>{ran=true;}),closed);assert.equal(ran,false);assert.equal(h.sql.calls.length,0);
 await assert.rejects(h.tx.initializeCheckpoint(control),code('identity_store'));assert.equal(h.journal.inspect().pending,null);
 assert.equal((await h.sql.db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0);
});
test('B07/B28 explicit initialization cannot adopt existing identity data or replace an accepted journal',async t=>{
 const h=await fixture(t,{initialize:false});await h.sql.db.query('INSERT INTO myys_identity_persons VALUES($1,$2,$3,true,1)',['existing',scope.issuer,'existing']);
 await assert.rejects(h.tx.initializeCheckpoint(control),closed);assert.equal(h.journal.inspect().head,null);
 await h.sql.db.query('DELETE FROM myys_identity_persons');await h.tx.initializeCheckpoint(control);const before=h.journal.inspect();
 await assert.rejects(h.tx.initializeCheckpoint(control),closed);assert.deepEqual(h.journal.inspect(),before);
 await assert.rejects(h.tx.initializeCheckpoint({operatorRef:'x',authorityDigest:'bad'}),code('identity_checkpoint_control'));
});
test('B07/B28 actual SQL commit is accepted only after durable journal seal, with no provider IO in SQL',async t=>{
 const h=await fixture(t);const first=h.journal.inspect().head;await h.tx.run(async tx=>{await write(tx);return 'accepted';});const second=h.journal.inspect().head;
 assert.ok(second.fence>first.fence);assert.notEqual(second.stateDigest,first.stateDigest);assert.equal(h.journal.inspect().pending,null);
 const row=(await h.sql.db.query('SELECT * FROM myys_identity_checkpoint_head')).rows[0];assert.equal(row.state_digest,second.stateDigest);assert.equal(Number(row.fence),second.fence);
 await h.tx.run(async tx=>assert.equal((await tx.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1));assert.equal(h.journal.inspect().head.stateDigest,second.stateDigest);
});
test('B07/B28 confirmed rollback burns the fence, preserves accepted head, and permits safe subsequent work',async t=>{
 const h=await fixture(t),before=h.journal.inspect().head;await assert.rejects(h.tx.run(async tx=>{await write(tx);throw new CoreError('test_rule','Sentetik kural.',409);}),code('test_rule'));
 assert.deepEqual(h.journal.inspect().head,before);assert.equal(h.journal.inspect().pending,null);assert.equal((await h.sql.db.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,0);
 await h.tx.run(write);assert.equal(h.journal.inspect().head.fence,before.fence+2);
});
test('B07/B28 serialization retry keeps one reservation and commits the full callback once',async t=>{
 const h=await fixture(t);let commits=0,work=0;h.sql.fault=({text})=>{if(text==='COMMIT'&&++commits===1)throw Object.assign(new Error('synthetic'),{code:'40001'});};
 await h.tx.run(async tx=>{work++;await write(tx);},{retrySafe:true});assert.equal(work,2);assert.equal(h.journal.inspect().issued,2);assert.equal((await h.sql.db.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1);
});
test('B07/B28 unknown COMMIT after real commit returns no result and blocks all subsequent instances',async t=>{
 const h=await fixture(t);h.sql.fault=async({text,db})=>{if(text==='COMMIT'){await db.exec('COMMIT');throw Error('synthetic transport loss');}};
 await assert.rejects(h.tx.run(async tx=>{await write(tx);return {sessionToken:'must-not-escape'};},{retrySafe:true}),code('identity_commit_unknown'));h.sql.fault=null;
 assert.equal((await h.sql.db.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1);assert.ok(h.journal.inspect().pending);
 const next=new PostgresIdentityTransactions({pool:h.sql.pool,...scope,checkpoint:new PostgresIdentityCheckpoint({journalDriver:h.journal,journalId:h.journalId})});let ran=false;await assert.rejects(next.run(()=>{ran=true;}),closed);assert.equal(ran,false);
});
test('B07/B28 failed SQL rollback leaves reservation pending and never retries',async t=>{
 const h=await fixture(t);let calls=0;h.sql.fault=({text})=>{if(text.startsWith('INSERT INTO myys_identity_persons')){calls++;throw Object.assign(new Error('synthetic'),{code:'40001'});}if(text==='ROLLBACK')throw Error('synthetic rollback loss');};
 await assert.rejects(h.tx.run(write,{retrySafe:true}),code('identity_store'));h.sql.fault=null;await h.sql.db.exec('ROLLBACK');assert.equal(calls,1);assert.ok(h.journal.inspect().pending);await assert.rejects(h.tx.run(()=>1),closed);
});
test('B07/B28 post-COMMIT journal failure returns no value and does not roll back or reopen the reservation',async t=>{
 const h=await fixture(t);h.hook=method=>{if(method==='commit')throw Error('synthetic journal unavailable');};
 await assert.rejects(h.tx.run(async tx=>{await write(tx);return 'must-not-escape';}),closed);assert.ok(h.journal.inspect().pending);assert.equal((await h.sql.db.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1);await assert.rejects(h.tx.run(()=>1),closed);
});
test('B07/B28 lost journal acknowledgement after durable seal loses the result but preserves verified progress',async t=>{
 const h=await fixture(t);const driver={reserve:(...a)=>h.journal.reserve(...a),abort:(...a)=>h.journal.abort(...a),commit:(...a)=>{h.journal.commit(...a);throw Error('synthetic lost seal acknowledgement');}};
 const tx=new PostgresIdentityTransactions({pool:h.sql.pool,...scope,checkpoint:new PostgresIdentityCheckpoint({journalDriver:driver,journalId:h.journalId})});
 await assert.rejects(tx.run(async tx=>{await write(tx);return 'must-not-escape';}),closed);assert.equal(h.journal.inspect().pending,null);await h.tx.run(async tx=>assert.equal((await tx.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1));
});
test('B07/B28 two journal connections share a global reservation across tenant/issuer/audience',async t=>{
 const h=await fixture(t),second=LocalIdentityCheckpointJournal.open({directory:h.directory,journalId:h.journalId});t.after(()=>second.close());
 const b=new PostgresIdentityTransactions({pool:h.sql.pool,tenant:'other',issuer:'https://other.invalid',audience:'other',checkpoint:new PostgresIdentityCheckpoint({journalDriver:second,journalId:h.journalId})});
 let release,entered;const ready=new Promise(r=>{entered=r;}),wait=new Promise(r=>{release=r;});const a=h.tx.run(async tx=>{entered();await wait;await write(tx);});await ready;
 await assert.rejects(b.run(()=>1),closed);release();await a;await b.run(async tx=>assert.equal((await tx.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,1));
});
test('B07/B28 checkpoint and all identity state commit atomically when head update fails',async t=>{
 const h=await fixture(t),before=h.journal.inspect().head;h.sql.fault=({text})=>{if(text.startsWith('UPDATE public.myys_identity_checkpoint_head'))throw Error('synthetic head write failure');};
 await assert.rejects(h.tx.run(write),code('identity_store'));h.sql.fault=null;assert.deepEqual(h.journal.inspect().head,before);assert.equal((await h.sql.db.query('SELECT count(*)::int n FROM myys_identity_persons')).rows[0].n,0);await h.tx.run(write);
});
test('B07/B28 complete SQL datadir restore rejects stale authority, logout, keys and HTTP history together',async t=>{
 const h=await flowFixture(t),session=await h.login();assert.equal((await h.principal(session)).id,'student');
 const security=key=>new PostgresIdentityHttpSecurity({transactions:h.newTransactions(),...scope,origin:'https://portal.invalid',contractDigest:identitySqlContractDigest(h.config,h.redirectUri),key:key.key,keyRevision:key.revision,clock:h.clock});
 const first=security({key:randomBytes(32),revision:1});await first.activate({...h.control,expectedRevision:0});const old=await h.sql.db.dumpDataDir('none');
 await h.putPerson(h.person('student',{active:false,revision:2}),1);await h.putMembership(h.membership('student',{active:false,revision:2}),1);
 await h.flow.backchannelLogout({logoutToken:await h.logoutToken()});await h.revokeKey('nonce');await security({key:randomBytes(32),revision:2}).activate({...h.control,expectedRevision:1});
 const current=await h.sql.db.dumpDataDir('none');h.journal.close();h.journal=LocalIdentityCheckpointJournal.open({directory:join(h.dir,'journal'),journalId:h.journalId});
 const checkpoint=new PostgresIdentityCheckpoint({journalDriver:h.journal,journalId:h.journalId});
 const restored=await pgliteIdentity({loadDataDir:old});t.after(()=>restored.close());const tx=new PostgresIdentityTransactions({pool:restored.pool,...scope,checkpoint});
 assert.equal((await restored.db.query("SELECT active FROM myys_identity_persons WHERE id='student'")).rows[0].active,true);let ran=false;await assert.rejects(tx.run(()=>{ran=true;}),closed);assert.equal(ran,false);
 await assert.rejects(h.principal(session,h.newFlow({transactions:tx})),closed);
 const latest=await pgliteIdentity({loadDataDir:current});t.after(()=>latest.close());const latestTx=new PostgresIdentityTransactions({pool:latest.pool,...scope,checkpoint});
 await latestTx.run(async tx=>{assert.equal((await tx.query("SELECT active FROM myys_identity_persons WHERE id='student'")).rows[0].active,false);assert.equal((await tx.query('SELECT count(*)::int n FROM myys_identity_logout_receipts')).rows[0].n,1);assert.equal(Number((await tx.query('SELECT revision FROM myys_identity_http_epochs')).rows[0].revision),2);});
 await assert.rejects(h.principal(session,h.newFlow({transactions:latestTx})),code('identity_required'));
});
test('B07/B28 an old data snapshot with a copied newest head is rejected by complete state digest',async t=>{
 const h=await fixture(t);await h.tx.run(write);const head=(await h.sql.db.query('SELECT * FROM myys_identity_checkpoint_head')).rows[0];
 await h.sql.db.query("UPDATE myys_identity_persons SET active=false WHERE id='synthetic'");let ran=false;await assert.rejects(h.tx.run(()=>{ran=true;}),closed);assert.equal(ran,false);assert.deepEqual((await h.sql.db.query('SELECT * FROM myys_identity_checkpoint_head')).rows[0],head);
});
test('B07/B28 changes to audit, request, session, rate and key records are all fingerprinted',async t=>{
 const h=await flowFixture(t),session=await h.login();await h.flow.backchannelLogout({logoutToken:await h.logoutToken()});
 const security=new PostgresIdentityHttpSecurity({transactions:h.newTransactions(),...scope,origin:'https://portal.invalid',contractDigest:identitySqlContractDigest(h.config,h.redirectUri),key:randomBytes(32),clock:h.clock});await security.activate({...h.control,expectedRevision:0});security.close(await security.check({purpose:'login',network:'127.0.0.1'}));
 const queries=[
  "UPDATE myys_identity_challenge_audit SET recorded_at=recorded_at||'x'",
  "UPDATE myys_identity_challenges SET contract_digest=repeat('0',64)",
  'UPDATE myys_identity_http_buckets SET used=used+1',
  "UPDATE myys_identity_http_epochs SET policy_digest=repeat('0',64)",
  "UPDATE myys_identity_http_history SET operator_ref=operator_ref||'x'",
  "UPDATE myys_identity_key_audit SET operator_ref=operator_ref||'x'",
  "UPDATE myys_identity_key_barriers SET metadata=jsonb_set(metadata,'{state}','\"revoked\"'::jsonb)",
  "UPDATE myys_identity_logout_receipts SET digest=repeat('0',64)",
  'UPDATE myys_identity_memberships SET active=false',
  'UPDATE myys_identity_persons SET active=false',
  "UPDATE myys_identity_session_audit SET actor_ref=actor_ref||'x'",
  "UPDATE myys_identity_sessions SET contract_digest=repeat('0',64)"
 ];
 // Each independent, actual SQL corruption is rolled back by the test only after the guard denies it.
 for(const query of queries){
  const ticket=await h.checkpoint.reserve();await h.sql.db.exec('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try{const result=await h.sql.db.query(query);assert.ok(result.affectedRows>0);await assert.rejects(h.checkpoint.before({query:(...a)=>h.sql.db.query(...a)},ticket),closed);}finally{await h.sql.db.exec('ROLLBACK');await h.checkpoint.rolledBack(ticket);}
 }
 await assert.rejects(h.principal(session),code('identity_required'));
});
test('B07/B28 unknown extra identity table fails closed instead of silently omitting security data',async t=>{
 const h=await fixture(t);await h.sql.db.exec('CREATE TABLE myys_identity_future_security(id TEXT)');let ran=false;await assert.rejects(h.tx.run(()=>{ran=true;}),closed);assert.equal(ran,false);
});
test('B07/B28 foreign journal and copied ticket cannot authorize SQL work',async t=>{
 const h=await fixture(t),otherId=randomUUID(),other=LocalIdentityCheckpointJournal.create({directory:join(h.dir,'other'),journalId:otherId});t.after(()=>other.close());
 const cp=new PostgresIdentityCheckpoint({journalDriver:other,journalId:otherId}),tx=new PostgresIdentityTransactions({pool:h.sql.pool,...scope,checkpoint:cp});await assert.rejects(tx.initializeCheckpoint(control),closed);await assert.rejects(h.checkpoint.before({},{}),closed);
 const ticket=await h.checkpoint.reserve();await assert.rejects(h.checkpoint.rolledBack({...ticket}),closed);await h.checkpoint.rolledBack(ticket);await assert.rejects(h.checkpoint.rolledBack(ticket),closed);
});
test('B07/B28 journal paths and immutable receipts are private, persistent and non-replacing',async t=>{
 const h=await fixture(t);assert.equal(lstatSync(h.directory).mode&0o777,0o700);const file=join(h.directory,'checkpoint.sqlite');assert.equal(lstatSync(file).mode&0o777,0o600);const before=readFileSync(file);
 assert.throws(()=>LocalIdentityCheckpointJournal.create({directory:h.directory,journalId:h.journalId}),closed);assert.deepEqual(readFileSync(file),before);
 assert.throws(()=>LocalIdentityCheckpointJournal.open({directory:h.directory,journalId:randomUUID()}),closed);
 const link=join(h.dir,'link');symlinkSync(h.directory,link);assert.throws(()=>LocalIdentityCheckpointJournal.open({directory:link,journalId:h.journalId}),closed);
 const raw=new DatabaseSync(file);try{assert.throws(()=>raw.exec('DELETE FROM events'));assert.throws(()=>raw.exec("UPDATE events SET payload='{}'"));}finally{raw.close();}
 chmodSync(file,0o644);assert.throws(()=>LocalIdentityCheckpointJournal.open({directory:h.directory,journalId:h.journalId}),closed);chmodSync(file,0o600);
 const reopened=LocalIdentityCheckpointJournal.open({directory:h.directory,journalId:h.journalId});try{assert.deepEqual(reopened.inspect(),h.journal.inspect());}finally{reopened.close();}
});
test('B07/B28 reservation survives an abruptly killed second process and has no timeout reopening',async t=>{
 const h=await fixture(t);const module=new URL('../scripts/lib/local-identity-checkpoint.mjs',import.meta.url).href;
 const script=`import {LocalIdentityCheckpointJournal as J} from ${JSON.stringify(module)};const j=J.open({directory:process.argv[1],journalId:process.argv[2]});j.reserve({journalId:process.argv[2],profile:${JSON.stringify(identityCheckpointProfile)},kind:'operation',control:null});process.stdout.write('reserved\\n');setInterval(()=>{},1000);`;
 const child=spawn(process.execPath,['--input-type=module','-e',script,h.directory,h.journalId],{stdio:['ignore','pipe','pipe']});let output='';
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('child reservation timeout'));},10000);child.stdout.on('data',b=>{output+=b;if(output.includes('reserved\n')){clearTimeout(timer);resolve();}});child.on('error',reject);child.on('exit',c=>{if(!output.includes('reserved\n')){clearTimeout(timer);reject(Error('child exited '+c));}});});
 const exit=new Promise(r=>child.once('exit',r));child.kill('SIGKILL');await exit;assert.ok(h.journal.inspect().pending);await assert.rejects(h.tx.run(()=>1),closed);
});
test('B07/B28 journal timeout aborts signal and never enters SQL or returns a fabricated acceptance',async t=>{
 const h=await fixture(t),driver={reserve:(_,o)=>new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted')))),commit:()=>{},abort:()=>{}};
 const tx=new PostgresIdentityTransactions({pool:h.sql.pool,...scope,checkpoint:new PostgresIdentityCheckpoint({journalDriver:driver,journalId:h.journalId,timeoutMs:10})});h.sql.calls.length=0;await assert.rejects(tx.run(()=>1),closed);assert.equal(h.sql.calls.length,0);
});
test('B07/B28 local journal rejects production construction and later environment changes',async t=>{
 const h=await fixture(t);const before=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>h.journal.inspect(),code('local_only'));assert.throws(()=>LocalIdentityCheckpointJournal.open({directory:h.directory,journalId:h.journalId}),code('local_only'));await assert.rejects(h.tx.run(()=>1),closed);}finally{if(before===undefined)delete process.env.VERCEL;else process.env.VERCEL=before;}
});
