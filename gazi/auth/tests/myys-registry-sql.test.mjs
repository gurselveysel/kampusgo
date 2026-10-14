import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {registryFields} from '../myys/registry.mjs';
import {pgliteIdentity} from './helpers/pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../myys/identity-transactions.mjs';
import {LocalPostgresAcademicCore} from '../myys/academic-sql.mjs';
const err=code=>e=>e.code===code;
const draft=(type='institution-authority',patch={})=>({unit:'engineering',type,title:'Sentetik '+type,fields:Object.fromEntries(registryFields[type].map(k=>[k,k==='pathway'?'micro':k==='creditPath'?'micro':reason])),...patch});
const counts=async f=>Object.fromEntries(await Promise.all(['records','commands','audit'].map(async k=>[k,(await f.sql.db.query('SELECT COUNT(*) n FROM myys_academic_'+k)).rows[0].n])));
const review=(f,r,patch={},who='registrar',id=randomUUID())=>f.run(who,'registry-review',{recordId:r.id,outcome:'accepted',reason,...patch},id);
test('B02/B04/B05/B14/B20 same SQL stores all five registry schemas and distinct human reviews',async t=>{
 const f=await sqlAcademic(t);
 for(const type of Object.keys(registryFields)){const r=await f.run('admin','registry-draft',draft(type,{official:true}));assert.equal(r.official,false);assert.equal(r.createdBy,'admin');await assert.rejects(review(f,r,{},'admin'),err('separation'));const v=await review(f,r);assert.equal(v.createdBy,'registrar');assert.equal(v.official,false);assert.equal(v.recordId,r.id);}
 const v=await f.view('registrar');assert.equal(v.registry.length,5);assert.equal(v.registryReviews.length,5);assert(v.supportedTabs.includes('registry'));assert.equal(v.supportedActions.length,28);assert.deepEqual(await counts(f),{records:10,commands:10,audit:10});
});
test('B08 learners, teachers and different units/tenants cannot read or review policy and rights records',async t=>{
 const f=await sqlAcademic(t),r=await f.run('admin','registry-draft',draft());
 for(const who of ['student','teacher','reviewer','judge']){const v=await f.view(who);assert.deepEqual(v.registry,[]);assert.deepEqual(v.registryReviews,[]);assert(!v.supportedTabs.includes('registry'));await assert.rejects(review(f,r,{},who));await assert.rejects(f.run(who,'registry-draft',draft()));}
 await f.putMembership(f.membership('registrar',{unit:'engineering',active:false,revision:2,roles:['admin']}),1);await f.putMembership(f.membership('registrar',{unit:'arts',roles:['admin']}),0);
 assert.deepEqual((await f.view('registrar')).registry,[]);await assert.rejects(review(f,r));await assert.rejects(f.academic.view({...await f.context('admin'),tenant:'other'}),err('not_found'));assert.deepEqual(await counts(f),{records:1,commands:1,audit:1});
});
test('B04/B05 missing required fields and fabricated types cannot leave a partial SQL registry record',async t=>{
 const f=await sqlAcademic(t);
 for(const type of Object.keys(registryFields))for(const key of registryFields[type]){const input=draft(type);delete input.fields[key];await assert.rejects(f.run('admin','registry-draft',input),err('registry'));}
 await assert.rejects(f.run('admin','registry-draft',{...draft(),type:'invented'}),err('registry'));assert.deepEqual(await counts(f),{records:0,commands:0,audit:0});
 const r=await f.run('admin','registry-draft',{...draft(),fields:{...draft().fields,forgedAuthority:true}});assert.equal('forgedAuthority'in r.fields,false);
});
test('B02 rejected review remains immutable; a new draft does not alter the original source or reason',async t=>{
 const f=await sqlAcademic(t),r=await f.run('admin','registry-draft',draft()),rejected=await review(f,r,{outcome:'rejected'});await assert.rejects(review(f,r),err('duplicate'));const second=await f.run('admin','registry-draft',draft('institution-authority',{title:'Yeni sentetik kaynak'}));assert.notEqual(second.id,r.id);const v=await f.view('admin');assert.deepEqual(v.registry.find(x=>x.id===r.id),r);assert.deepEqual(v.registryReviews.find(x=>x.recordId===r.id),rejected);assert.equal(v.registryReviews.some(x=>x.recordId===second.id),false);
});
test('B07/B16 ten identical requests remain one record; conflicting content and current revocation are rejected',async t=>{
 const f=await sqlAcademic(t),id=randomUUID(),r=await f.run('admin','registry-draft',draft(),id);
 for(let i=0;i<9;i++)assert.equal((await f.run('admin','registry-draft',draft(),id)).id,r.id);await assert.rejects(f.run('admin','registry-draft',draft('institution-authority',{title:'Çelişen kaynak'}),id),err('idempotency_conflict'));
 const rid=randomUUID(),v=await review(f,r,{},'registrar',rid);assert.equal((await review(f,r,{},'registrar',rid)).id,v.id);await f.putMembership(f.membership('registrar',{active:false,revision:2,roles:['admin']}),1);await assert.rejects(review(f,r,{},'registrar',rid),err('membership_required'));assert.deepEqual(await counts(f),{records:2,commands:2,audit:2});
});
test('B08/B16 audit failure rolls back registry, receipt and audit together',async t=>{
 const f=await sqlAcademic(t);await f.actor('admin');let fired=false;f.sql.fault=({text})=>{if(!fired&&text.startsWith('INSERT INTO public.myys_academic_audit')){fired=true;throw Error('synthetic registry audit failure');}};await assert.rejects(f.run('admin','registry-draft',draft()));f.sql.fault=null;assert.equal(fired,true);assert.deepEqual(await counts(f),{records:0,commands:0,audit:0});
});
test('B02/B12 locally accepted responsibility registry cannot enable official issuance or unbound profile actions',async t=>{
 const f=await sqlAcademic(t),r=await f.run('admin','registry-draft',draft());await review(f,r);const x=await f.passed(),v=await f.view('student');assert.equal(v.decisions.find(d=>d.id===x.d.id).canIssue,false);assert.deepEqual(v.issuances,[]);await assert.rejects(f.run('admin','credential-profile',{}),err('not_found'));await assert.rejects(f.run('admin','issue',{decisionId:x.d.id}),err('not_found'));assert.equal((await f.view('admin')).registry[0].official,false);
});
test('B28 combined checkpoint rejects an older SQL backup that would discard a registry review',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'myys-registry-sql-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const f=await sqlAcademic(t,{checkpointDirectory:join(directory,'journal')}),r=await f.run('admin','registry-draft',draft());await f.actor('registrar');const context=await f.context('admin'),old=await f.sql.db.dumpDataDir('none');await review(f,r);
 const sql=await pgliteIdentity({loadDataDir:old});t.after(()=>sql.close());const transactions=new PostgresIdentityTransactions({pool:sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience,checkpoint:f.checkpoint}),core=new LocalPostgresAcademicCore({identity:f.newFlow({transactions}),clock:f.clock});await assert.rejects(core.view(context),err('identity_checkpoint'));
});
