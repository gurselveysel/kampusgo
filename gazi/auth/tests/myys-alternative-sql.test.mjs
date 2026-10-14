import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {alternativeDigest,alternativeCommand} from '../myys/alternative-evidence.mjs';
import {LocalSqlAcademicWorkingSet} from '../myys/academic-sql-store.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
const err=code=>e=>e.code===code;
async function fixture(t){const root=mkdtempSync(join(tmpdir(),'myys-alternative-sql-')),f=await sqlAcademic(t,{checkpointDirectory:join(root,'journal')});t.after(()=>rmSync(root,{recursive:true,force:true}));return f;}
const input=(f,x,patch={})=>({enrollmentId:x.e.id,taskId:'T1',method:'oral',content:'Sentetik sözlü uygulamada veri kalitesi ve yöntem gerekçeleri açıklandı.',sourceReference:'Sentetik yerel gözlem tutanağı A-01',methodReference:'Sentetik alternatif yöntem planı; resmî kural değildir.',observedAt:f.clock().toISOString(),reason,localOnly:true,...patch});
const propose=(f,x,patch={},cmd)=>f.run('teacher','alternative-evidence',input(f,x,patch),cmd);
const moderate=(f,e,patch={},who='moderator',cmd)=>f.run(who,'evidence-moderate',{evidenceId:e.id,basedOn:alternativeDigest(e),outcome:'accepted',reason,verificationReference:'Sentetik gözlem tutanağı görev ve programla karşılaştırıldı.',...patch},cmd);
const assess=(f,x,e,patch={})=>f.run('teacher','assess',{enrollmentId:x.e.id,evidenceIds:[e.id],scores:[{criterionId:'R1',score:4,reason}],reason,...patch});
const decide=(f,a,who='judge')=>f.run(who,'decide',{assessmentId:a.id,outcome:'approved',reason});
test('B10 same SQL alternative observation, independent moderation, rubric and independent decision preserve one learning record',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x),m=await moderate(f,e),a=await assess(f,x,e),d=await decide(f,a),v=await f.view('student');
 assert.equal(e.source,'alternative-local');assert.equal(e.owner,'student');assert.equal(e.createdBy,'teacher');assert.equal(m.createdBy,'moderator');assert.equal(a.evidenceDigests[0].alternative.moderation.id,m.id);assert.equal(a.evidenceDigests[0].alternative.method.version,1);assert.equal(a.score,100);assert.equal(v.decisions[0].id,d.id);assert.equal(v.decisions[0].canIssue,false);assert.equal(v.evidence[0].moderation.id,m.id);assert.equal(f.journal.inspect().pending,null);
});
test('B10 unreviewed or rejected SQL alternative cannot reach rubric; a newly reviewed revision can',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x);await assert.rejects(assess(f,x,e),err('missing_evidence'));await moderate(f,e,{outcome:'rejected'});await assert.rejects(assess(f,x,e),err('missing_evidence'));
 const next=await propose(f,x,{previousEvidenceId:e.id,changeReason:reason});await moderate(f,next);assert.equal((await assess(f,x,next)).passed,true);assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='assessment').length,1);
});
test('B10 SQL alternative cannot turn missing evidence, null score or failure into success using body flags',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x);await moderate(f,e);
 await assert.rejects(assess(f,x,e,{evidenceIds:[]}),err('missing_evidence'));await assert.rejects(assess(f,x,e,{scores:[{criterionId:'R1',score:null,reason}]}),err('scores'));
 const a=await assess(f,x,e,{scores:[{criterionId:'R1',score:1,reason}],passed:true,score:100});assert.equal(a.score,25);assert.equal(a.passed,false);await assert.rejects(decide(f,a),err('failed'));assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='decision').length,0);
});
test('B08/B10 SQL author, moderator, decision and appeal reviewer remain separate even with combined roles',async t=>{
 const f=await fixture(t);await f.putMembership(f.membership('teacher',{roles:['instructor','quality','commission'],revision:2}),1);await f.putMembership(f.membership('moderator',{roles:['quality','commission'],revision:2}),1);
 const x=await f.setup(),e=await propose(f,x);await assert.rejects(moderate(f,e,{},'teacher'),err('separation'));await moderate(f,e);const a=await assess(f,x,e);await assert.rejects(decide(f,a,'moderator'),err('separation'));const d=await decide(f,a),appeal=await f.run('student','appeal',{decisionId:d.id,reason});
 await assert.rejects(f.run('moderator','resolve',{appealId:appeal.id,outcome:'upheld',reason}),err('separation'));assert.equal((await f.view('moderator')).appeals[0].allowedActions.length,0);await f.run('reviewer','resolve',{appealId:appeal.id,outcome:'upheld',reason});
});
test('B06/B10 SQL moderation requires current instructor authority and current learner at preparation',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x);await f.putMembership(f.membership('teacher',{roles:['instructor'],active:false,revision:2}),1);assert.equal((await f.view('moderator')).evidence[0].canModerate,false);await assert.rejects(moderate(f,e),err('alternative_authority'));
 await f.putMembership(f.membership('teacher',{roles:['instructor'],revision:3}),2);await assert.rejects(propose(f,x,{previousEvidenceId:e.id,changeReason:reason}),err('identity_required'));delete f.sessions.teacher;
 await f.putMembership(f.membership('student',{active:false,revision:2}),1);await assert.rejects(propose(f,x,{previousEvidenceId:e.id,changeReason:reason}),err('learner'));
});
test('B09 SQL new alternative revision changes future selection and preserves historical rubric and decision snapshots',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x);await moderate(f,e);const a=await assess(f,x,e),d=await decide(f,a),snapshot=structuredClone(a.evidenceDigests);
 const next=await propose(f,x,{previousEvidenceId:e.id,changeReason:reason,method:'portfolio',content:'Sentetik ikinci sürüm portfolyoda ek ürün ve yöntem karşılaştırması yapıldı.'});assert.equal((await f.view('teacher')).evidence.find(v=>v.id===e.id).canAssess,true);
 await assert.rejects(propose(f,x,{previousEvidenceId:e.id,changeReason:reason}),err('alternative_changed'));await moderate(f,next);const v=await f.view('student');assert.equal(v.evidence.find(v=>v.id===e.id).canAssess,false);assert.equal(v.evidence.find(v=>v.id===next.id).canAssess,true);
 assert.deepEqual(v.assessments.find(r=>r.id===a.id).evidenceDigests,snapshot);assert.equal(v.decisions.find(r=>r.id===d.id).usable,true);assert.equal(v.decisions.find(r=>r.id===d.id).alternativeVersionUpdates[0].historyChanged,false);await assert.rejects(assess(f,x,e),err('missing_evidence'));assert.equal((await assess(f,x,next)).evidenceDigests[0].alternative.method.version,2);
});
test('B10 SQL signed/score assertions, future observation and stale moderation digest fail without a new record',async t=>{
 const f=await fixture(t),x=await f.setup();for(const patch of [{verified:true},{grade:90},{passed:true},{source:'signed-lms-local'},{localOnly:false},{observedAt:new Date(f.clock().getTime()+1000).toISOString()}])await assert.rejects(propose(f,x,patch));
 const e=await propose(f,x);await assert.rejects(moderate(f,e,{basedOn:'a'.repeat(64)}),err('alternative_integrity'));assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='evidence-moderation').length,0);assert.equal((await f.view('other')).evidence.length,0);
});
test('B16 SQL alternative audit rollback and payload-sensitive replay keep one record and receipt',async t=>{
 const f=await fixture(t),x=await f.setup();await f.actor('teacher');f.sql.fault=({text})=>{if(text.startsWith('INSERT INTO public.myys_academic_audit'))throw Error('synthetic audit failure');};await assert.rejects(propose(f,x));f.sql.fault=null;
 assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='evidence').length,0);const cmd=randomUUID(),e=await propose(f,x,{},cmd);assert.equal((await propose(f,x,{},cmd)).id,e.id);await assert.rejects(propose(f,x,{content:reason},cmd),err('idempotency_conflict'));
 const mid=randomUUID(),m=await moderate(f,e,{},'moderator',mid);assert.equal((await moderate(f,e,{},'moderator',mid)).id,m.id);await f.putMembership(f.membership('moderator',{roles:['quality'],active:false,revision:2}),1);await assert.rejects(moderate(f,e,{},'moderator',mid),e=>e.status===403);
});
test('B10 alternative policy accepts neither generic objects nor copied or closed SQL work sets',()=>{
 const s=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});s.close();for(const store of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),s])assert.throws(()=>alternativeCommand({action:'alternative-evidence',s:store}),err('local_only'));
});
test('B09/B28 older SQL backup cannot discard accepted alternative revision or its moderation',async t=>{
 const f=await fixture(t),x=await f.setup(),e=await propose(f,x);await moderate(f,e);const context=await f.context('student'),old=await f.sql.db.dumpDataDir('none'),next=await propose(f,x,{previousEvidenceId:e.id,changeReason:reason});await moderate(f,next);
 const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.view(context),err('identity_checkpoint'));
});
