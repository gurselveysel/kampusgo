import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {sqlAuthority,sqlCredentialProfile} from './helpers/sql-authority.mjs';
import {sqlOpenKey,sqlKeyInput,sqlKey} from './helpers/sql-key.mjs';
import {sqlAcademicHttp,sqlHttpOk} from './helpers/sql-academic-http.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
import {LocalSqlAcademicWorkingSet} from '../myys/academic-sql-store.mjs';
import {keyCommand,keyFingerprint,signingKey} from '../myys/key-registry.mjs';
const err=c=>e=>e.code===c;
const counts=async f=>Promise.all(['myys_academic_records','myys_academic_commands','myys_academic_audit'].map(async n=>(await f.rows(n)).length));
const change=(f,k,state,expectedState='active',id=randomUUID())=>f.run('it','key-state',{keyId:k.id,state,expectedState,reason,incidentReference:reason},id);
test('B13 SQL public key and independent review bind current unit without enabling signature on an existing preparation',async t=>{
 const f=await sqlAcademic(t),x=await f.passed(),a=await sqlAuthority(f,{program:x.p});await sqlCredentialProfile(f,a);const issuance=await f.run('issuer','issue',{decisionId:x.d.id}),input=sqlKeyInput(),k=await sqlKey(f,{reviewed:false,input});let v=await f.view('it');assert.equal(v.keys[0].state,'pending');assert.equal(v.keys[0].canReview,false);assert.equal(k.privateKeyStored,false);assert.equal(k.fingerprint,keyFingerprint(input.publicJwk));assert.equal(k.official,false);
 await f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});v=await f.view('issuer');assert.equal(v.keys[0].state,'active');assert.equal(v.issuances[0].id,issuance.id);assert.equal(v.issuances[0].canSign,false);assert.equal(v.issuances[0].signed,false);assert.equal(v.signerAvailable,false);assert.equal((await f.rows('myys_academic_records')).filter(r=>r.kind==='signed').length,0);
});
test('B13 private fields, remote key URLs, wrong issuer, weak or noncanonical RSA produce no SQL record or receipt',async t=>{
 const f=await sqlAcademic(t),input=sqlKeyInput(),before=await counts(f),weak=generateKeyPairSync('rsa',{modulusLength:1024}).publicKey.export({format:'jwk'});
 for(const patch of [{issuer:'https://real.invalid'},{mode:'production'},{publicJwk:{...input.publicJwk,d:'PRIVATE_NOT_ACCEPTED'}},{publicJwk:{...input.publicJwk,x5u:'https://evil.invalid'}},{publicJwk:{...input.publicJwk,kid:'https://real.invalid/key'}},{publicJwk:{...weak,kid:input.publicJwk.kid}},{publicJwk:{...input.publicJwk,n:input.publicJwk.n+'='}},{publicJwk:{...input.publicJwk,e:'Aw'}},{publicJwk:{...input.publicJwk,alg:'HS256'}}])await assert.rejects(f.run('it','key-register',{...input,...patch}));
 assert.deepEqual(await counts(f),before);assert.equal(JSON.stringify(await f.rows('myys_academic_commands')).includes('PRIVATE_NOT_ACCEPTED'),false);
});
test('B08 SQL key preparation/review/read scopes and same-person review remain separate with combined roles',async t=>{
 const f=await sqlAcademic(t),input=sqlKeyInput();for(const who of ['student','issuer','author','admin'])await assert.rejects(f.run(who,'key-register',input),err('forbidden'));const k=await sqlKey(f,{reviewed:false,input});await f.putMembership(f.membership('it',{roles:['it','admin'],revision:2}),1);delete f.sessions.it;await assert.rejects(f.run('it','key-review',{keyId:k.id,outcome:'accepted',reason}),err('separation'));
 for(const who of ['student','other','author','teacher','judge'])assert.deepEqual((await f.view(who)).keys,[]);await assert.rejects(f.academic.view({...await f.context('admin'),tenant:'other'}),err('not_found'));await f.putMembership(f.membership('admin',{roles:['admin'],active:false,revision:2}),1);await f.putMembership(f.membership('admin',{unit:'other-unit',roles:['admin'],revision:1}),0);delete f.sessions.admin;await assert.rejects(f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason}),err('not_found'));assert.deepEqual((await f.view('admin')).keys,[]);
});
test('B13 key id/fingerprint cannot be reused and rotation requires a reviewed predecessor in the same SQL unit',async t=>{
 const f=await sqlAcademic(t),input=sqlKeyInput(),k=await sqlKey(f,{reviewed:false,input});await assert.rejects(f.run('it','key-register',input),err('duplicate'));await assert.rejects(f.run('it','key-register',{...input,publicJwk:{...input.publicJwk,kid:input.publicJwk.kid+'-other'}}),err('duplicate'));await assert.rejects(f.run('it','key-register',{...sqlKeyInput(sqlOpenKey('unreviewed-replacement')),replacesId:k.id}),err('key_previous'));await f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});const next=await sqlKey(f,{input:{...sqlKeyInput(sqlOpenKey('replacement')),replacesId:k.id}});assert.equal(next.replacesId,k.id);assert.equal((await f.view('it')).keys.length,2);
});
test('B13 expected-state transitions retain history and compromised or rejected keys cannot be reactivated',async t=>{
 const f=await sqlAcademic(t),k=await sqlKey(f);await change(f,k,'retired');await assert.rejects(change(f,k,'compromised'),err('key_changed'));await change(f,k,'compromised','retired');for(const state of ['active','retired','compromised'])await assert.rejects(change(f,k,state,'compromised'),err('key_changed'));const v=await f.view('it');assert.equal(v.keys[0].state,'compromised');assert.deepEqual(v.keys[0].changes.map(r=>r.previousState),['active','retired']);assert.equal(v.keys[0].changes.every(r=>r.academicRecordsChanged===false),true);
 const rejected=await sqlKey(f,{reviewed:false,input:sqlKeyInput(sqlOpenKey('rejected'))});await f.run('admin','key-review',{keyId:rejected.id,outcome:'rejected',reason});await assert.rejects(change(f,rejected,'retired','rejected'),err('key_changed'));
});
test('B16 SQL state races and replay keep one transition; revoked membership cannot reuse a historical receipt',async t=>{
 const f=await sqlAcademic(t),k=await sqlKey(f),id=randomUUID();await f.context('it');const before=await counts(f),rows=await Promise.all(Array.from({length:10},()=>change(f,k,'retired','active',id)));assert.equal(new Set(rows.map(r=>r.id)).size,1);assert.deepEqual(await counts(f),before.map(n=>n+1));await change(f,k,'compromised','retired');assert.equal((await change(f,k,'retired','active',id)).state,'retired');assert.equal((await f.view('it')).keys[0].state,'compromised');await assert.rejects(change(f,k,'compromised','active',id),err('idempotency_conflict'));
 const other=await sqlKey(f,{input:sqlKeyInput(sqlOpenKey('race'))}),race=await Promise.allSettled([change(f,other,'retired'),change(f,other,'compromised')]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.code,'key_changed');await f.putMembership(f.membership('it',{roles:['it'],active:false,revision:2}),1);await assert.rejects(change(f,k,'retired','active',id),err('membership_required'));
});
test('B16 audit failures atomically roll back SQL key, review and state records',async t=>{
 const f=await sqlAcademic(t),k=await sqlKey(f,{reviewed:false});for(const [action,input]of [['key-register',sqlKeyInput(sqlOpenKey('failed'))],['key-review',{keyId:k.id,outcome:'accepted',reason}]]){const before=await counts(f);let fired=false;f.sql.fault=({text})=>{if(!fired&&text.startsWith('INSERT INTO public.myys_academic_audit')){fired=true;throw Error('synthetic key audit failure');}};await assert.rejects(f.run(action==='key-review'?'admin':'it',action,input));f.sql.fault=null;assert.equal(fired,true);assert.deepEqual(await counts(f),before);}
 await f.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});const before=await counts(f);f.sql.fault=({text})=>{if(text.startsWith('INSERT INTO public.myys_academic_audit'))throw Error('synthetic state audit failure');};await assert.rejects(change(f,k,'compromised'));f.sql.fault=null;assert.deepEqual(await counts(f),before);assert.equal((await f.view('it')).keys[0].state,'active');
});
test('B28 restored old SQL key state cannot pass the combined checkpoint after compromise',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'myys-key-sql-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const f=await sqlAcademic(t,{checkpointDirectory:join(dir,'journal')}),k=await sqlKey(f),context=await f.context('it'),old=await f.sql.db.dumpDataDir('none');await change(f,k,'compromised');const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.view(context),err('identity_checkpoint'));
});
test('B13 generic and closed SQL stores cannot modify keys, and SQL metadata cannot activate the local signing factory',()=>{
 const set=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});assert.throws(()=>signingKey(set,'test-gazi','engineering',{}),err('local_only'));set.close();for(const s of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),set])assert.throws(()=>keyCommand({action:'key-register',s}),err('local_only'));
});
test('B13 signed HTTPS IT person and different administrator use one SQL key history while signature endpoint stays closed',async t=>{
 const h=await sqlAcademicHttp(t),input=sqlKeyInput(),k=await sqlKey(h,{reviewed:false,input});let a=await h.actor('it'),v=await sqlHttpOk(h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:a.cookie}}));assert.equal(v.personId,'it');assert.equal(v.keys[0].id,k.id);assert.equal(v.keys[0].canReview,false);await h.run('admin','key-review',{keyId:k.id,outcome:'accepted',reason});await change(h,k,'compromised');a=await h.actor('issuer');v=await sqlHttpOk(h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:a.cookie}}));assert.equal(v.keys[0].state,'compromised');assert.equal(v.signerAvailable,false);assert.equal((await h.post('issuer','imzala',{tenant:'gazi',issuanceId:'none'})).status,404);assert.equal(k.privateKeyStored,false);assert.equal(Object.keys(k.jwk).some(k=>['d','p','q','dp','dq','qi','oth'].includes(k)),false);
});
