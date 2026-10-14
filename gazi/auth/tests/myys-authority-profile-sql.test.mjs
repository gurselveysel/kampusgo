import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {sqlAuthority,sqlCredentialProfile,sqlAuthorityUpload,sqlAuthorityInput,sqlProfileInput} from './helpers/sql-authority.mjs';
import {authorityCommand} from '../myys/authority.mjs';
import {profileCommand} from '../myys/credential-profile.mjs';
import {LocalSqlAcademicWorkingSet,academicSqlCapacity} from '../myys/academic-sql-store.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {hash} from '../myys/store.mjs';
const err=code=>e=>e.code===code;
const counts=async f=>Object.fromEntries(await Promise.all(['records','commands','audit'].map(async k=>[k,(await f.sql.db.query('SELECT COUNT(*) n FROM myys_academic_'+k)).rows[0].n])));
const dossierReview=(f,d)=>f.run('registrar','authority-review',{dossierId:d.id,outcome:'accepted',reason});
const profileReview=(f,p)=>f.run('publisher','credential-profile-review',{profileId:p.id,outcome:'accepted',reason});
const nextDossier=(f,x,patch={})=>f.run('admin','authority-dossier',{...sqlAuthorityInput(f,x.p,x.authority,x.attachments),previousId:x.dossier.id,changeReason:reason,...patch});
test('B02/B12 same SQL binds registry, two private files, scope dossier, independent review and person-bound profile',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f,{reviewed:false});await assert.rejects(sqlCredentialProfile(f,x),err('authority_required'));await dossierReview(f,x.dossier);const profile=await sqlCredentialProfile(f,x);
 const v=await f.view('admin');assert.equal(v.supportedActions.length,24);assert(v.supportedTabs.includes('credentialProfiles'));assert.equal(v.authority.dossiers[0].usable,true);assert.equal(v.credentialProfiles.profiles[0].usable,true);assert.equal(profile.authorityDossierId,x.dossier.id);assert.equal(profile.official,false);assert.equal(profile.pilot,true);assert.equal(profile.fields.length,11);assert.deepEqual(profile.issuerPeople,['issuer']);assert.deepEqual(v.credentialProfiles.issuerPeople,[{person:'issuer',unit:'engineering'}]);
 for(const a of x.attachments){const rows=(await f.rows('myys_academic_records')).filter(r=>r.id===a.id);assert.deepEqual(rows.map(r=>r.kind).sort(),['authority-attachment','authority-file']);const bytes=rows.find(r=>r.kind==='authority-file').data.base64;assert.equal(JSON.stringify(v).includes(bytes),false);assert.equal(hash(Buffer.from(bytes,'base64')),a.sha256);}
 assert.equal(x.dossier.legalAuthorityVerified,false);assert.equal(x.dossier.externalSubmitted,false);
});
test('B02 SQL private download returns exact bytes after commit; cached receipts never store bytes and reauthorize',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),args={attachmentId:x.attachments[0].id},id=randomUUID(),r=await f.run('admin','authority-download',args,id);
 assert.equal(hash(Buffer.from(r.file.base64,'base64')),x.attachments[0].sha256);assert.equal(r.file.name,'Yetki-İncelemesi.txt');assert.deepEqual(await f.run('admin','authority-download',args,id),r);const receipt=(await f.rows('myys_academic_commands')).find(c=>c.id===id);assert.equal(receipt.result.file,undefined);assert.equal(JSON.stringify(receipt).includes(r.file.base64),false);
 for(const who of ['student','teacher','issuer','publisher','it']){await assert.rejects(f.run(who,'authority-download',args),err('not_found'));assert.deepEqual((await f.view(who)).authority.attachments,[]);}
 await f.putMembership(f.membership('admin',{roles:['admin'],active:false,revision:2}),1);await assert.rejects(f.run('admin','authority-download',args,id),err('membership_required'));
});
test('B02 invalid file name, base64, size, date and forged authority flags cannot create either half of a SQL attachment',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),before=await counts(f),base=sqlAuthorityUpload(x.authority);
 for(const patch of [{base64:''},{base64:Buffer.alloc(32769).toString('base64')},{base64:'YQ'},{base64:'a==='},{fileName:'../secret.pdf'},{fileName:'active.html'},{documentDate:'2026-02-30'},{documentDate:'2099-01-01'},{kind:'unknown'},{official:true}])await assert.rejects(f.run('admin','authority-attachment',{...base,...patch}));assert.deepEqual(await counts(f),before);
 const a=await f.run('admin','authority-attachment',{...base,base64:Buffer.alloc(32768,65).toString('base64')});assert.equal(a.bytes,32768);assert.equal(a.authenticityVerified,false);assert.equal((await counts(f)).records,before.records+2);
});
test('B02 four separate source scopes and matching Senate/SEM attachments remain mandatory in SQL',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),input=sqlAuthorityInput(f,x.p,x.authority,x.attachments),before=await counts(f);
 for(const patch of [{attachmentIds:[]},{attachmentIds:[x.attachments[0].id,x.attachments[0].id]},{responsibilities:{}},{responsibilities:{...input.responsibilities,programOwner:{scope:reason,attachmentIds:['other']}}},{authorityId:'other'},{official:true}])await assert.rejects(nextDossier(f,x,patch));assert.deepEqual(await counts(f),before);
});
test('B02/B12 combined roles cannot let a dossier author or assigned issuer review their own authority chain',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f,{reviewed:false});await assert.rejects(f.run('admin','authority-review',{dossierId:x.dossier.id,outcome:'accepted',reason}),err('separation'));
 await f.putMembership(f.membership('author',{roles:['admin','coordinator'],revision:2}),1);delete f.sessions.author;await assert.rejects(f.run('author','authority-review',{dossierId:x.dossier.id,outcome:'accepted',reason}),err('separation'));await dossierReview(f,x.dossier);
 const p=await sqlCredentialProfile(f,x,{reviewed:false});await f.putMembership(f.membership('issuer',{roles:['studentAffairs','commission'],revision:2}),1);delete f.sessions.issuer;await assert.rejects(f.run('issuer','credential-profile-review',{profileId:p.id,outcome:'accepted',reason}),err('separation'));await profileReview(f,p);
});
test('B12 missing fields, invented source, inactive issuer, expired date and official mode remain closed in SQL',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),base=sqlProfileInput(f,x),before=await counts(f);
 for(const patch of [{acknowledgedFields:[]},{acknowledgedFields:base.acknowledgedFields.map(()=>base.acknowledgedFields[0])},{issuerPeople:['absent']},{issuerPeople:['issuer','issuer']},{sourceVersion:'invented'},{mode:'official'},{official:true},{format:'invented'},{expires:'2020-01-01T00:00:00.000Z'},{expires:new Date(f.clock().getTime()+3600000).toISOString()}])await assert.rejects(f.run('admin','credential-profile',{...base,...patch}));assert.deepEqual(await counts(f),before);
 await f.putMembership(f.membership('issuer',{roles:['studentAffairs'],active:false,revision:2}),1);assert.deepEqual((await f.view('admin')).credentialProfiles.issuerPeople,[]);await assert.rejects(f.run('admin','credential-profile',base),err('issuer_people'));
});
test('B02/B12 new authority and profile versions preserve old bindings; stale version writes and held profiles stay closed',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),p=await sqlCredentialProfile(f,x),next=await nextDossier(f,x);assert.equal((await f.view('admin')).credentialProfiles.profiles[0].usable,false);await assert.rejects(nextDossier(f,x),err('authority_changed'));await dossierReview(f,next);
 assert.equal((await f.view('admin')).credentialProfiles.profiles[0].authorityDossierId,x.dossier.id);const p2=await f.run('admin','credential-profile',{...sqlProfileInput(f,x),previousId:p.id,changeReason:reason});assert.equal(p2.authorityDossierId,next.id);assert.equal(p2.version,2);await profileReview(f,p2);await f.run('publisher','credential-profile-hold',{profileId:p2.id,reason});const v=await f.view('admin');assert.equal(v.credentialProfiles.profiles.find(r=>r.id===p2.id).usable,false);assert.equal(v.credentialProfiles.profiles.find(r=>r.id===p.id).authorityDossierId,x.dossier.id);assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='revocation').length,0);
});
test('B02/B12 expiry and source-reviewer revocation are rechecked without deleting the original dossier/profile',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),p=await sqlCredentialProfile(f,x);f.advance(1200001);f.sessions={};assert.equal((await f.view('admin')).credentialProfiles.profiles[0].usable,false);
 await f.putMembership(f.membership('registrar',{roles:['admin'],active:false,revision:2}),1);const v=await f.view('admin');assert.equal(v.authority.dossiers[0].usable,false);assert.equal(v.credentialProfiles.profiles[0].id,p.id);assert.equal(v.authority.dossiers[0].id,x.dossier.id);
});
test('B02 attachment-pair and download audit failures roll back all SQL records and publish no bytes',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),before=await counts(f);for(const [action,input]of [['authority-attachment',sqlAuthorityUpload(x.authority,'delegation')],['authority-download',{attachmentId:x.attachments[0].id}]]){let fired=false;f.sql.fault=({text})=>{if(!fired&&text.startsWith('INSERT INTO public.myys_academic_audit')){fired=true;throw Error('synthetic audit failure');}};await assert.rejects(f.run('admin',action,input));f.sql.fault=null;assert.equal(fired,true);assert.deepEqual(await counts(f),before);}
});
test('B02/B32 an attachment needing two rows cannot strand a single row at the SQL capacity boundary',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),before=await counts(f),position=Number((await f.sql.db.query('SELECT max(position) n FROM myys_academic_records')).rows[0].n),extra=academicSqlCapacity.maxRows-1-before.records;
 // Populate only this disposable database with valid synthetic registry copies.
 await f.sql.db.query("INSERT INTO myys_academic_records(position,tenant,kind,id,unit,owner,data) SELECT $1+i,$2,'registry','capacity-'||i,$3,$4,$5::jsonb||jsonb_build_object('id','capacity-'||i) FROM generate_series(1,$6::integer) g(i)",[position,f.config.tenant,x.authority.unit,x.authority.owner,JSON.stringify(x.authority),extra]);
 const full=await counts(f);assert.equal(full.records,academicSqlCapacity.maxRows-1);await assert.rejects(f.run('admin','authority-attachment',sqlAuthorityUpload(x.authority,'delegation')),err('academic_capacity'));assert.deepEqual(await counts(f),full);
});
test('B02 unknown download COMMIT returns no file; an explicit retry reopens bytes without duplicating receipt',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),id=randomUUID(),input={attachmentId:x.attachments[0].id};let fired=false;f.sql.fault=async({text,db})=>{if(!fired&&text==='COMMIT'){fired=true;await db.query('COMMIT');throw Error('synthetic lost acknowledgement');}};await assert.rejects(f.run('admin','authority-download',input,id),err('identity_commit_unknown'));f.sql.fault=null;
 const before=await counts(f),r=await f.run('admin','authority-download',input,id);assert.equal(hash(Buffer.from(r.file.base64,'base64')),x.attachments[0].sha256);assert.deepEqual(await counts(f),before);assert.equal((await f.rows('myys_academic_commands')).find(c=>c.id===id).result.file,undefined);
});
test('B02/B12 generic, copied and closed SQL work sets cannot unlock authority or profile commands',()=>{
 const set=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});set.close();for(const s of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),set]){assert.throws(()=>authorityCommand({action:'authority-attachment',s}),err('local_only'));assert.throws(()=>profileCommand({action:'credential-profile',s}),err('local_only'));}
});
test('B02 a previously cached private download rechecks actual SQL file integrity on each explicit replay',async t=>{
 const f=await sqlAcademic(t),x=await sqlAuthority(f),id=randomUUID(),input={attachmentId:x.attachments[0].id};await f.run('admin','authority-download',input,id);
 // Privileged corruption exists only inside this disposable, checkpoint-free test database.
 await f.sql.db.exec('ALTER TABLE myys_academic_records DISABLE TRIGGER USER');await f.sql.db.query("UPDATE myys_academic_records SET data=jsonb_set(data,'{base64}',$1::jsonb) WHERE kind='authority-file' AND id=$2",[JSON.stringify(Buffer.from('changed synthetic bytes').toString('base64')),input.attachmentId]);await f.sql.db.exec('ALTER TABLE myys_academic_records ENABLE TRIGGER USER');
 await assert.rejects(f.run('admin','authority-download',input,id),err('authority_file_changed'));await assert.rejects(sqlCredentialProfile(f,x),err('authority_required'));
});
test('B12 reviewed authority and profile do not expose unsupported SQL issuance/signing or grant an issuer academic package export',async t=>{
 const f=await sqlAcademic(t),passed=await f.passed(),x=await sqlAuthority(f,{program:passed.p});await sqlCredentialProfile(f,x);const v=await f.view('issuer');assert.equal(v.decisions.find(d=>d.id===passed.d.id).canIssue,false);assert(v.programs.every(p=>!p.packageStatus?.canDownload));assert(!v.supportedTabs.includes('issuances'));await assert.rejects(f.run('issuer','issue',{decisionId:passed.d.id}),err('academic_action'));
});
test('B28 combined checkpoint rejects an old SQL backup that would erase an authority hold and restore profile usability',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'myys-authority-sql-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=await sqlAcademic(t,{checkpointDirectory:join(dir,'journal')}),x=await sqlAuthority(f);await sqlCredentialProfile(f,x);const context=await f.context('admin'),old=await f.sql.db.dumpDataDir('none');await f.run('registrar','authority-hold',{dossierId:x.dossier.id,reason});assert.equal((await f.view('admin')).credentialProfiles.profiles[0].usable,false);
 const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.view(context),err('identity_checkpoint'));
});
