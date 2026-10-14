import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {sqlAcademic,sqlProgram,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {sqlIdentityFlow} from './helpers/sql-identity-flow.mjs';
import {sqlIdentityHttpFixture} from './helpers/sql-identity-http.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {PostgresIdentityCheckpoint,academicCheckpointProfile,academicCheckpointTables,identityCheckpointProfile} from '../myys/identity-checkpoint.mjs';
import {LocalIdentityCheckpointJournal} from '../scripts/lib/local-identity-checkpoint.mjs';
const closed=e=>e.code==='identity_checkpoint';
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'myys-academic-checkpoint-')),directory=join(root,'journal');
 const f=await sqlAcademic(t,{checkpointDirectory:directory});t.after(()=>rmSync(root,{recursive:true,force:true}));
 f.directory=directory;return f;
}
const counts=async sql=>Object.fromEntries(await Promise.all(['records','commands','audit'].map(async n=>[n,(await sql.db.query('SELECT count(*)::int n FROM myys_academic_'+n)).rows[0].n])));
const checkpoint=(f,driver=f.journal)=>new PostgresIdentityCheckpoint({journalDriver:driver,journalId:f.journalId,profile:academicCheckpointProfile});
function academic(f,sql=f.sql,cp=checkpoint(f)){
 const tx=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:cp});
 return new LocalPostgresAcademicCore({identity:f.newFlow({transactions:tx}),clock:f.clock});
}
async function restored(t,f,archive){const sql=await pgliteIdentity({loadDataDir:archive});t.after(()=>sql.close());return {sql,core:academic(f,sql)};}
test('B07/B09/B28 combined profile seals the same person, eight academic commands and all 15 data tables',async t=>{
 const f=await fixture(t),x=await f.passed(),a=await f.run('student','appeal',{decisionId:x.d.id,reason});
 await f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason});const v=await f.view('student');
 assert.equal(v.appeals[0].resolution.outcome,'upheld');assert.equal(academicCheckpointTables.length,15);
 assert.deepEqual(await counts(f.sql),{records:8,commands:8,audit:8});assert.equal(f.journal.inspect().head.profile,academicCheckpointProfile);assert.equal(f.journal.inspect().pending,null);
 const context=await f.context('student'),archive=await f.sql.db.dumpDataDir('none');f.journal.close();f.journal=LocalIdentityCheckpointJournal.open({directory:f.directory,journalId:f.journalId,profile:academicCheckpointProfile});
 const r=await restored(t,f,archive);assert.equal((await r.core.view(context)).decisions[0].id,x.d.id);
});
test('B09/B11/B28 old SQL backup cannot erase an appeal, even if newest checkpoint head is copied over it',async t=>{
 const f=await fixture(t),x=await f.passed(),context=await f.context('student'),old=await f.sql.db.dumpDataDir('none');
 const a=await f.run('student','appeal',{decisionId:x.d.id,reason});await f.run('reviewer','resolve',{appealId:a.id,outcome:'reassessment',reason});
 const head=(await f.sql.db.query('SELECT * FROM myys_identity_checkpoint_head')).rows[0],latest=await f.sql.db.dumpDataDir('none'),r=await restored(t,f,old);
 await assert.rejects(r.core.view(context),closed);assert.deepEqual(await counts(r.sql),{records:6,commands:6,audit:6});
 await r.sql.db.query('UPDATE myys_identity_checkpoint_head SET journal_id=$1,profile=$2,fence=$3,operation_id=$4,state_digest=$5',[head.journal_id,head.profile,head.fence,head.operation_id,head.state_digest]);
 await assert.rejects(r.core.view(context),closed);
 const good=await restored(t,f,latest);assert.equal((await good.core.view(context)).appeals[0].resolution.outcome,'reassessment');
});
for(const [table,statement]of [
 ['records',"UPDATE myys_academic_records SET data=jsonb_set(data,'{title}','\"changed after backup\"')"],
 ['commands',"UPDATE myys_academic_commands SET result=jsonb_set(result,'{title}','\"changed receipt\"')"],
 ['audit',"UPDATE myys_academic_audit SET recorded_at='2026-10-13T00:00:00.000Z'"]
])test('B28 combined digest detects privileged synthetic tampering of academic '+table,async t=>{
 const f=await fixture(t);await f.run('author','program',sqlProgram());const context=await f.context('author'),before=f.journal.inspect().head;
 // Fault injection only: production runtime is never granted DDL/trigger control.
 await f.sql.db.exec('ALTER TABLE myys_academic_'+table+' DISABLE TRIGGER USER;'+statement+';ALTER TABLE myys_academic_'+table+' ENABLE TRIGGER USER;');
 await assert.rejects(f.academic.view(context),closed);assert.deepEqual(f.journal.inspect().head,before);assert.equal(f.journal.inspect().pending,null);
});
test('B16/B28 failed checkpoint update rolls back academic record, command and audit as one unit',async t=>{
 const f=await fixture(t);await f.actor('author');const before=f.journal.inspect().head;let fired=false;
 f.sql.fault=({text})=>{if(text.startsWith('UPDATE public.myys_identity_checkpoint_head')){fired=true;throw Error('synthetic checkpoint fault');}};
 await assert.rejects(f.run('author','program',sqlProgram()));f.sql.fault=null;
 assert.equal(fired,true);assert.deepEqual(await counts(f.sql),{records:0,commands:0,audit:0});assert.deepEqual(f.journal.inspect().head,before);assert.equal(f.journal.inspect().pending,null);
 await f.run('author','program',sqlProgram());assert.deepEqual(await counts(f.sql),{records:1,commands:1,audit:1});
});
test('B16/B28 unknown real SQL COMMIT returns no academic result and leaves a durable closed reservation',async t=>{
 const f=await fixture(t),context=await f.context('author'),cmd=randomUUID();let fired=false;
 f.sql.fault=async({text,db})=>{if(!fired&&text==='COMMIT'){fired=true;await db.query('COMMIT');throw Error('lost commit acknowledgement');}};
 await assert.rejects(f.academic.run({...context,commandId:cmd,action:'program',input:sqlProgram()}),e=>e.code==='identity_commit_unknown');f.sql.fault=null;
 assert.deepEqual(await counts(f.sql),{records:1,commands:1,audit:1});assert.ok(f.journal.inspect().pending);
 f.journal.close();f.journal=LocalIdentityCheckpointJournal.open({directory:f.directory,journalId:f.journalId,profile:academicCheckpointProfile});
 await assert.rejects(academic(f).run({...context,commandId:cmd,action:'program',input:sqlProgram()}),closed);assert.deepEqual(await counts(f.sql),{records:1,commands:1,audit:1});
});
test('B16/B28 missing external seal after COMMIT blocks all academic reads and never publishes success',async t=>{
 const f=await fixture(t),context=await f.context('author');const driver={reserve:(...a)=>f.journal.reserve(...a),abort:(...a)=>f.journal.abort(...a),commit:()=>{throw Error('seal unavailable');}},core=academic(f,f.sql,checkpoint(f,driver));
 await assert.rejects(core.run({...context,commandId:randomUUID(),action:'program',input:sqlProgram()}),closed);
 assert.deepEqual(await counts(f.sql),{records:1,commands:1,audit:1});assert.ok(f.journal.inspect().pending);await assert.rejects(academic(f).view(context),closed);
});
test('B16/B28 lost external acknowledgement after durable seal can recover only the same committed receipt',async t=>{
 const f=await fixture(t),context=await f.context('author'),cmd=randomUUID();const driver={reserve:(...a)=>f.journal.reserve(...a),abort:(...a)=>f.journal.abort(...a),commit:(...a)=>{f.journal.commit(...a);throw Error('lost seal acknowledgement');}},core=academic(f,f.sql,checkpoint(f,driver));
 await assert.rejects(core.run({...context,commandId:cmd,action:'program',input:sqlProgram()}),closed);assert.equal(f.journal.inspect().pending,null);
 const result=await academic(f).run({...context,commandId:cmd,action:'program',input:sqlProgram()});assert.ok(result.id);assert.deepEqual(await counts(f.sql),{records:1,commands:1,audit:1});
});
test('B07/B28 profile downgrade and unknown academic table cannot silently reduce checkpoint coverage',async t=>{
 const f=await fixture(t),context=await f.context('author'),head=f.journal.inspect().head;
 assert.throws(()=>LocalIdentityCheckpointJournal.open({directory:f.directory,journalId:f.journalId}),closed);
 const old=new PostgresIdentityCheckpoint({journalDriver:f.journal,journalId:f.journalId,profile:identityCheckpointProfile});await assert.rejects(academic(f,f.sql,old).view(context),closed);assert.deepEqual(f.journal.inspect().head,head);
 await f.sql.db.exec('CREATE TABLE myys_academic_unregistered (id TEXT PRIMARY KEY)');await assert.rejects(f.view('author'),closed);
});
test('B07/B28 identity-only checkpoint rejects added academic tables instead of claiming protection',async t=>{
 const root=mkdtempSync(join(tmpdir(),'myys-checkpoint-profile-')),f=await sqlIdentityFlow(t,{checkpointDirectory:join(root,'journal')});t.after(()=>rmSync(root,{recursive:true,force:true}));
 const session=await f.login();await f.sql.db.exec(await readFile(new URL('../myys/academic-sql-schema.sql',import.meta.url),'utf8'));await assert.rejects(f.principal(session),closed);
});
test('B07/B09 combined checkpoint uses real HTTPS identity and denies tampered academic view without payload',async t=>{
 const h=await sqlIdentityHttpFixture({academic:true,checkpoint:true});t.after(()=>h.close());const a=await h.login('author');assert.equal(a.response.status,303);
 const v=await h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:a.cookie}});assert.equal(v.status,200);
 const result=await h.request('/api/myys/islem',{method:'POST',headers:{cookie:a.cookie,origin:h.origin,'x-myys-csrf':v.json().identitySession.csrf},body:{tenant:'gazi',commandId:randomUUID(),action:'program',input:sqlProgram()}});assert.equal(result.status,200,result.text);assert.equal(h.f.journal.inspect().head.profile,academicCheckpointProfile);assert.equal(h.f.journal.inspect().pending,null);
 await h.f.sql.db.exec("ALTER TABLE myys_academic_audit DISABLE TRIGGER USER;UPDATE myys_academic_audit SET recorded_at='2020-01-01T00:00:00.000Z';ALTER TABLE myys_academic_audit ENABLE TRIGGER USER;");
 const blocked=await h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:a.cookie,accept:'text/html'}});assert.equal(blocked.status,503);assert.equal(blocked.headers['set-cookie'],undefined);assert.equal(blocked.json().code,'identity_checkpoint');assert.equal(blocked.text.includes('SQL01'),false);assert.equal(blocked.json().programs,undefined);
});

test('B07/B28 existing identity-only journal remains readable without migration and cannot be relabeled academic',async t=>{
 const root=mkdtempSync(join(tmpdir(),'myys-checkpoint-legacy-')),directory=join(root,'journal'),f=await sqlIdentityFlow(t,{checkpointDirectory:directory});t.after(()=>rmSync(root,{recursive:true,force:true}));
 const session=await f.login();f.journal.close();const db=new DatabaseSync(join(directory,'checkpoint.sqlite'));db.exec('ALTER TABLE state DROP COLUMN profile');db.close();
 assert.throws(()=>LocalIdentityCheckpointJournal.open({directory,journalId:f.journalId,profile:academicCheckpointProfile}),closed);
 f.journal=LocalIdentityCheckpointJournal.open({directory,journalId:f.journalId});f.checkpoint=new PostgresIdentityCheckpoint({journalDriver:f.journal,journalId:f.journalId});
 assert.equal((await f.principal(session,f.newFlow())).id,'student');assert.equal(f.journal.inspect().head.profile,identityCheckpointProfile);
});
