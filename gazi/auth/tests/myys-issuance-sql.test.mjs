import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {sqlAuthority,sqlCredentialProfile,sqlProfileInput} from './helpers/sql-authority.mjs';
import {sqlAcademicHttp,sqlHttpOk} from './helpers/sql-academic-http.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {LocalSqlAcademicWorkingSet} from '../myys/academic-sql-store.mjs';
import {issuanceProfile} from '../myys/credential-profile.mjs';
import {stableStringify} from '../myys/program-model.mjs';
import {hash} from '../myys/store.mjs';
const err=c=>e=>e.code===c;
const ready=async f=>{const passed=await f.passed(),x=await sqlAuthority(f,{program:passed.p}),profile=await sqlCredentialProfile(f,x);return {...passed,...x,profile};};
const counts=async f=>Promise.all(['myys_academic_records','myys_academic_commands','myys_academic_audit'].map(async n=>(await f.rows(n)).length));
test('B12 same SQL decision and reviewed profile produce one private unsigned preparation visible to its learner',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),before=await counts(f);assert.equal((await f.view('issuer')).decisions[0].canIssue,true);const r=await f.run('issuer','issue',{decisionId:x.d.id});assert.equal(r.decisionId,x.d.id);assert.equal(r.owner,'student');assert.equal(r.createdBy,'issuer');assert.equal(r.profileId,x.profile.id);assert.equal(r.profileDigest,hash(stableStringify(x.profile)));assert.equal(r.authorityId,x.authority.id);assert.equal(r.fieldKeys.length,11);assert.equal(r.pilot,true);assert.equal(r.state,'awaiting-signature');assert.equal(r.visibility,'private');assert.deepEqual(await counts(f),before.map(n=>n+1));
 for(const who of ['student','issuer','teacher','judge']){const v=await f.view(who);assert.equal(v.issuances[0].id,r.id);assert.equal(v.issuances[0].signed,false);assert.equal(v.issuances[0].canSign,false);assert.equal(v.signerAvailable,false);assert.equal(v.decisions[0].canIssue,false);}
 for(const who of ['other','admin','it'])assert.deepEqual((await f.view(who)).issuances,[]);
});
test('B12 absent, unreviewed or held SQL profile cannot authorize preparation',async t=>{
 const f=await sqlAcademic(t),passed=await f.passed();await assert.rejects(f.run('issuer','issue',{decisionId:passed.d.id}),err('profile_required'));const x=await sqlAuthority(f,{program:passed.p}),profile=await sqlCredentialProfile(f,x,{reviewed:false});await assert.rejects(f.run('issuer','issue',{decisionId:passed.d.id}),err('profile_blocked'));await f.run('publisher','credential-profile-review',{profileId:profile.id,outcome:'accepted',reason});await f.run('publisher','credential-profile-hold',{profileId:profile.id,reason});assert.equal((await f.view('issuer')).decisions[0].canIssue,false);await assert.rejects(f.run('issuer','issue',{decisionId:passed.d.id}),err('profile_blocked'));assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='issuance').length,0);
});
test('B11 open appeal closes preparation and blocks an existing unsigned record without inventing revocation',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),r=await f.run('issuer','issue',{decisionId:x.d.id}),appeal=await f.run('student','appeal',{decisionId:x.d.id,reason});let v=await f.view('student');assert.equal(v.issuances[0].id,r.id);assert.equal(v.issuances[0].blocked,true);await assert.rejects(f.run('issuer','issue',{decisionId:x.d.id}),err('decision_blocked'));await f.run('reviewer','resolve',{appealId:appeal.id,outcome:'upheld',reason});v=await f.view('student');assert.equal(v.issuances[0].blocked,false);assert.equal(v.issuances[0].signed,false);assert.equal((await f.rows('myys_academic_records')).filter(r=>['signed','revocation'].includes(r.kind)).length,0);
});
test('B12 rejected decision and combined decision/author/learner roles cannot prepare their own document',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);for(const [person,roles]of [['judge',['commission','studentAffairs']],['author',['coordinator','studentAffairs']],['student',['learner','studentAffairs']]]){await f.putMembership(f.membership(person,{roles,revision:2}),1);delete f.sessions[person];await assert.rejects(f.run(person,'issue',{decisionId:x.d.id}),err('separation'));}
 const g=await sqlAcademic(t),a=await g.assess(await g.setup()),d=await g.run('judge','decide',{assessmentId:a.a.id,outcome:'rejected',reason});await assert.rejects(g.run('issuer','issue',{decisionId:d.id}),err('decision_blocked'));
});
test('B12 one enrollment has one preparation; explicit same command retries cannot create a second or bypass revoked membership',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),id=randomUUID(),input={decisionId:x.d.id};await f.context('issuer');const before=await counts(f);const rows=await Promise.all(Array.from({length:10},()=>f.run('issuer','issue',input,id)));assert.equal(new Set(rows.map(r=>r.id)).size,1);assert.deepEqual(await counts(f),before.map(n=>n+1));await assert.rejects(f.run('issuer','issue',input),err('duplicate'));await assert.rejects(f.run('issuer','issue',{decisionId:'other'},id),err('idempotency_conflict'));await f.putMembership(f.membership('issuer',{roles:['studentAffairs'],active:false,revision:2}),1);await assert.rejects(f.run('issuer','issue',input,id),err('membership_required'));
});
test('B16 SQL preparation audit failure rolls back authorization, command receipt and record together',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);await f.context('issuer');const before=await counts(f);let fired=false;f.sql.fault=({text})=>{if(!fired&&text.startsWith('INSERT INTO public.myys_academic_audit')){fired=true;throw Error('synthetic preparation audit failure');}};await assert.rejects(f.run('issuer','issue',{decisionId:x.d.id}));f.sql.fault=null;assert.equal(fired,true);assert.deepEqual(await counts(f),before);assert.equal((await f.view('issuer')).decisions[0].canIssue,true);
});
test('B16 unknown preparation COMMIT produces no success; an explicit current retry finds exactly one historical receipt',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),id=randomUUID(),input={decisionId:x.d.id};await f.context('issuer');let fired=false;f.sql.fault=async({text,db})=>{if(!fired&&text==='COMMIT'){fired=true;await db.query('COMMIT');throw Error('synthetic lost preparation acknowledgement');}};await assert.rejects(f.run('issuer','issue',input,id),err('identity_commit_unknown'));f.sql.fault=null;const before=await counts(f),r=await f.run('issuer','issue',input,id);assert.equal(r.state,'awaiting-signature');assert.deepEqual(await counts(f),before);
});
test('B12 later profile and authority changes preserve the historical preparation without granting signature',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),id=randomUUID(),r=await f.run('issuer','issue',{decisionId:x.d.id},id);await f.run('admin','credential-profile',{...sqlProfileInput(f,x),previousId:x.profile.id,changeReason:reason});await f.run('admin','authority-hold',{dossierId:x.dossier.id,reason});assert.deepEqual(await f.run('issuer','issue',{decisionId:x.d.id},id),r);const v=await f.view('student');assert.equal(v.issuances[0].profileId,x.profile.id);assert.equal(v.issuances[0].canSign,false);assert.equal(v.issuances[0].signed,false);assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='revocation').length,0);
});
test('B28 old SQL snapshot cannot erase an existing preparation under the combined checkpoint',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'myys-issuance-sql-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=await sqlAcademic(t,{checkpointDirectory:join(dir,'journal')}),x=await ready(f),context=await f.context('issuer'),old=await f.sql.db.dumpDataDir('none');await f.run('issuer','issue',{decisionId:x.d.id});const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.view(context),err('identity_checkpoint'));
});
test('B12 generic or closed SQL profile work set cannot fabricate a preparation authority',()=>{
 const set=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});set.close();for(const s of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),set])assert.throws(()=>issuanceProfile(s,{},null,'2026-10-14T10:00:00.000Z'),err('local_only'));
});
test('B12 signed HTTPS preparation and learner projection stay unsigned; signature and sharing endpoints remain closed',async t=>{
 const h=await sqlAcademicHttp(t),x=await sqlAuthority(h);await h.run('publisher','publish',{programId:x.p.id,reason});const e=await h.run('author','enroll',{programId:x.p.id,learnerId:'student'}),ev=await h.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:reason}),a=await h.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason}),d=await h.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});await sqlCredentialProfile(h,x);const r=await h.run('issuer','issue',{decisionId:d.id});const learner=await h.actor('student'),v=await sqlHttpOk(h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:learner.cookie}}));assert.equal(v.personId,'student');assert.equal(v.issuances[0].id,r.id);assert.equal(v.issuances[0].signed,false);assert.equal(v.issuances[0].canSign,false);for(const path of ['imzala','cuzdan-indir','dogrulama-paketi'])assert.equal((await h.post('issuer',path,{tenant:'gazi',issuanceId:r.id})).status,404);const shared=await h.post('student','islem',{tenant:'gazi',commandId:'no-sql-share',action:'share',input:{issuanceId:r.id,hours:1,purpose:reason}});assert.equal(shared.status,409);
});
