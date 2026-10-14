import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlAcademic,sqlProgram,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {sqlAuthority,sqlCredentialProfile,sqlProfileInput} from './helpers/sql-authority.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {LocalSqlAcademicWorkingSet} from '../myys/academic-sql-store.mjs';
import {programPackageForPrincipal} from '../myys/program-package.mjs';
import {programBaseline,stableStringify} from '../myys/program-model.mjs';
import {hash} from '../myys/store.mjs';
const err=code=>e=>e.code===code;
const download=async(f,p,who='author',extra={})=>f.academic.programPackage({...await f.context(who),programId:p.id,...extra});
const ready=async f=>{const x=await sqlAuthority(f);await f.run('publisher','publish',{programId:x.p.id,reason});return {...x,profile:await sqlCredentialProfile(f,x)};};
const counts=async f=>Promise.all(['myys_academic_records','myys_academic_commands','myys_academic_audit'].map(async name=>(await f.rows(name)).length));
test('B03 same SQL information export binds program, publication, profile and authority without private files or new academic rows',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),before=await counts(f),r=await download(f,x.p);
 assert.deepEqual(r.payload.program,programBaseline(x.p));assert.equal(r.payload.credentialProfile.id,x.profile.id);assert.equal(r.payload.credentialProfile.authorityDossierId,x.dossier.id);assert.equal(r.sha256,hash(stableStringify(r.payload)));assert.equal(r.payload.programDigest,hash(stableStringify(programBaseline(x.p))));
 for(const name of ['signed','official','institutionApproved','licenseRightsVerified','externalSubmitted'])assert.equal(r[name],false);
 assert.equal(r.payload.credentialProfile.issuerPeople,undefined);assert.equal(r.payload.credentialProfile.createdBy,undefined);assert.equal(r.payload.publication.createdBy,undefined);
 for(const file of (await f.rows('myys_academic_records')).filter(r=>r.kind==='authority-file'))assert.equal(JSON.stringify(r).includes(file.data.base64),false);
 f.advance(1000);const next=await download(f,x.p);assert.equal(next.sha256,r.sha256);assert.notEqual(next.checkedAt,r.checkedAt);assert.deepEqual(await counts(f),before);
 for(const who of ['author','teacher','publisher','reviewer'])assert.equal((await download(f,x.p,who)).sha256,r.sha256);
});
test('B03 independent publication and reviewed profile are both required; central SEM remains separate',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f);await assert.rejects(download(f,x.p),err('program_package_blocked'));await f.run('publisher','publish',{programId:x.p.id,reason});await assert.rejects(download(f,x.p),err('program_package_blocked'));const p=await sqlCredentialProfile(f,x,{reviewed:false});await assert.rejects(download(f,x.p),err('program_package_blocked'));await f.run('publisher','credential-profile-review',{profileId:p.id,outcome:'accepted',reason});assert.ok(await download(f,x.p));
 const sem=await f.run('author','program',{...sqlProgram(),code:'SQLSEM',pathway:'sem-central'});await f.run('publisher','publish',{programId:sem.id,reason});await assert.rejects(download(f,sem),err('program_package_blocked'));assert.equal((await f.view('author')).programs.find(p=>p.id===sem.id).packageStatus.state,'central-path');
});
test('B08 same SQL export denies learners, administrative-only roles, foreign tenant and unit, and revoked caller',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);for(const who of ['student','other','admin','it','issuer'])await assert.rejects(download(f,x.p,who),err('not_found'));
 await assert.rejects(download(f,x.p,'author',{tenant:'other'}),err('not_found'));await f.putMembership(f.membership('teacher',{unit:'other-unit',roles:['instructor'],revision:1}),0);await f.putMembership(f.membership('teacher',{roles:['instructor'],active:false,revision:2}),1);delete f.sessions.teacher;await assert.rejects(download(f,x.p,'teacher'),err('not_found'));
 await f.actor('author');await f.putMembership(f.membership('author',{roles:['coordinator'],active:false,revision:2}),1);await assert.rejects(download(f,x.p),err('membership_required'));
});
test('B03 publication reviewer, dossier reviewer and assigned issuer must still be current on each download',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);for(const [person,roles]of [['publisher',['commission']],['registrar',['admin']],['issuer',['studentAffairs']]]){
  await f.putMembership(f.membership(person,{roles,active:false,revision:2}),1);await assert.rejects(download(f,x.p),err('program_package_blocked'));await f.putMembership(f.membership(person,{roles,revision:3}),2);assert.ok(await download(f,x.p));
 }
});
test('B03 draft revisions and holds close new exports without changing earlier payload or program versions',async t=>{
 const f=await sqlAcademic(t),x=await ready(f),before=await download(f,x.p),p2=await f.run('admin','credential-profile',{...sqlProfileInput(f,x),previousId:x.profile.id,changeReason:reason});await assert.rejects(download(f,x.p),err('program_package_blocked'));await f.run('publisher','credential-profile-review',{profileId:p2.id,outcome:'accepted',reason});assert.equal((await download(f,x.p)).payload.credentialProfile.id,p2.id);
 const next=await f.run('author','program',{...x.p,previousProgramId:x.p.id,changeReason:reason});await assert.rejects(download(f,next),err('program_package_blocked'));await f.run('publisher','credential-profile-hold',{profileId:p2.id,reason});await assert.rejects(download(f,x.p),err('program_package_blocked'));assert.equal(before.sha256,hash(stableStringify(before.payload)));assert.equal(before.payload.credentialProfile.id,x.profile.id);
});
test('B03 profile expiry reached while SQL snapshot loads returns no package',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);f.advance(1190000);f.sessions={};await f.context('author');let fired=false;f.sql.fault=({text})=>{if(!fired&&text.startsWith('SELECT kind,id,unit,owner,data')){fired=true;f.advance(11000);}};await assert.rejects(download(f,x.p),err('program_package_blocked'));f.sql.fault=null;assert.equal(fired,true);
});
test('B03 unknown SQL export COMMIT never returns a package; explicit next read rechecks current authority',async t=>{
 const f=await sqlAcademic(t),x=await ready(f);await f.context('author');const before=await counts(f);let fired=false;f.sql.fault=async({text,db})=>{if(!fired&&text==='COMMIT'){fired=true;await db.query('COMMIT');throw Error('synthetic export acknowledgement loss');}};await assert.rejects(download(f,x.p),err('identity_commit_unknown'));f.sql.fault=null;assert.deepEqual(await counts(f),before);await f.run('admin','authority-hold',{dossierId:x.dossier.id,reason});await assert.rejects(download(f,x.p),err('program_package_blocked'));
});
test('B28 old SQL backup cannot restore program export after authority hold under combined checkpoint',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'myys-package-sql-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=await sqlAcademic(t,{checkpointDirectory:join(dir,'journal')}),x=await ready(f),context=await f.context('author');await download(f,x.p);const old=await f.sql.db.dumpDataDir('none');await f.run('admin','authority-hold',{dossierId:x.dossier.id,reason});
 const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.programPackage({...context,programId:x.p.id}),err('identity_checkpoint'));
});
test('B03 generic, prototype and closed work sets do not authorize SQL package projection; production stays closed',async t=>{
 const set=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});set.close();for(const s of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),set])assert.throws(()=>programPackageForPrincipal(s,{},'p','2026-10-14T10:00:00.000Z'),err('local_only'));
 const f=await sqlAcademic(t),x=await ready(f),context=await f.context('author'),old=process.env.VERCEL;try{process.env.VERCEL='1';await assert.rejects(f.academic.programPackage({...context,programId:x.p.id}),err('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
});
