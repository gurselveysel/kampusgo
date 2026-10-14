import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sqlAcademic,sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {sqlIdentityHttpFixture} from './helpers/sql-identity-http.mjs';
import {appealPolicyCommand} from '../myys/appeal-policy.mjs';
import {LocalSqlAcademicWorkingSet,isLocalSqlAcademicStore} from '../myys/academic-sql-store.mjs';
const err=code=>e=>e.code===code;
const policy=(p,patch={})=>({programId:p.id,scope:'local-acceptance',official:false,effect:'suspend',lateAction:'independent-review',timeZone:'UTC+03:00',startRule:'next-local-day',mode:'calendar',days:2,effectiveFrom:'2026-10-01T00:00:00.000Z',expires:'2028-01-01T00:00:00.000Z',reason,authorityReference:reason,source:{title:'Sentetik SQL itiraz politikası kaynağı',reference:'local-acceptance: synthetic SQL source only',version:'sql-test-1',date:'2026-10-10',readScope:reason,officialApproval:false},...patch});
async function fixture(t){const root=mkdtempSync(join(tmpdir(),'myys-appeal-sql-')),f=await sqlAcademic(t,{checkpointDirectory:join(root,'journal'),keyLifetimeMs:30*86400000});t.after(()=>rmSync(root,{recursive:true,force:true}));return f;}
async function setup(f,patch={}){const x=await f.setup(),p=await f.run('admin','appeal-policy',policy(x.p,patch));await f.run('publisher','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason});return {...x,policy:p};}
async function decide(f,x){const a=await f.assess(x);return f.run('judge','decide',{assessmentId:a.a.id,outcome:'approved',reason});}
const receipt=(f,d,cmd)=>f.run('student','decision-receive',{decisionId:d.id,confirm:true},cmd);
test('B11 same SQL policy, independent review, decision and owner receipt pin source version and local timing',async t=>{
 const f=await fixture(t),x=await setup(f),d=await decide(f,x);assert.equal(d.appealPolicy.policy.id,x.policy.id);assert.equal(d.appealPolicy.policy.source.officialApproval,false);
 let v=await f.view('student');assert.equal(v.decisions[0].canReceive,true);assert.equal(v.decisions[0].appealWindow.classification,'manual-review');
 const r=await receipt(f,d);v=await f.view('student');assert.equal(r.official,false);assert.equal(r.officialNotificationAt,null);assert.equal(v.decisions[0].canReceive,false);assert.equal(v.decisions[0].appealWindow.classification,'within-local-window');assert.equal(v.decisions[0].appealWindow.deadline,'2026-10-16T20:59:59.999Z');assert.equal(v.decisions[0].appealWindow.automaticRejection,false);
 assert.equal((await f.view('admin')).appealPolicies.policies[0].review.outcome,'accepted');assert.equal((await f.view('student')).supportedTabs.includes('appealPolicies'),false);
});
test('B11 SQL policy preparation and review keep current membership, program scope and separation',async t=>{
 const f=await fixture(t),x=await f.setup();await f.putMembership(f.membership('admin',{roles:['admin','commission'],revision:2}),1);
 await assert.rejects(f.run('author','appeal-policy',policy(x.p)),err('not_found'));const p=await f.run('admin','appeal-policy',policy(x.p));
 await assert.rejects(f.run('admin','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason}),err('separation'));
 await assert.rejects(f.run('student','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason}),err('not_found'));
 await f.run('publisher','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason});const before=(await f.rows('myys_academic_records')).length;
 await f.putMembership(f.membership('publisher',{roles:['commission'],active:false,revision:2}),1);await assert.rejects(f.run('publisher','appeal-policy-hold',{policyId:p.id,reason}),e=>e.status===403);assert.equal((await f.rows('myys_academic_records')).length,before);
});
test('B11 SQL policy revisions and hold preserve earlier decision source and affect only later binding',async t=>{
 const f=await fixture(t),x=await setup(f),old=await decide(f,x);const second=await f.run('admin','appeal-policy',policy(x.p,{previousId:x.policy.id,changeReason:reason,days:3}));
 await assert.rejects(f.run('admin','appeal-policy',policy(x.p,{previousId:x.policy.id,changeReason:reason})),err('policy_changed'));
 await f.run('publisher','appeal-policy-review',{policyId:second.id,outcome:'accepted',reason});const d2=await decide(f,x);assert.equal(d2.appealPolicy.policy.id,second.id);
 await f.run('publisher','appeal-policy-hold',{policyId:second.id,reason});const d3=await decide(f,x);assert.equal(d3.appealPolicy.policy,null);
 const ds=(await f.view('student')).decisions;assert.equal(ds.find(d=>d.id===old.id).appealPolicy.policy.id,x.policy.id);assert.equal(ds.find(d=>d.id===d2.id).appealPolicy.policy.id,second.id);assert.equal((await f.view('admin')).appealPolicies.policies.at(-1).held,true);
 const order=(await f.sql.db.query('SELECT position FROM public.myys_academic_records WHERE tenant=$1 ORDER BY position',[f.config.tenant])).rows.map(r=>Number(r.position));assert.deepEqual(order,Array.from({length:order.length},(_,i)=>i+1));assert.equal((await f.sql.db.query("SELECT pg_get_serial_sequence('public.myys_academic_records','position') AS sequence")).rows[0].sequence,null);
});
test('B11 SQL receipt repeat creates one receipt across different command ids and always checks current owner',async t=>{
 const f=await fixture(t),d=await decide(f,await setup(f)),cmd=randomUUID(),r=await receipt(f,d,cmd);assert.equal((await receipt(f,d,cmd)).id,r.id);assert.equal((await receipt(f,d,randomUUID())).id,r.id);
 assert.equal((await f.rows('myys_academic_records')).filter(x=>x.kind==='decision-receipt').length,1);
 await assert.rejects(f.run('other','decision-receive',{decisionId:d.id,confirm:true}),err('not_found'));
 await assert.rejects(f.run('student','decision-receive',{decisionId:d.id,confirm:false}),err('receipt'));
 await f.putMembership(f.membership('student',{active:false,revision:2}),1);await assert.rejects(receipt(f,d,cmd),e=>e.status===403);
});
test('B11 SQL policy rejects official/legal assertions and incomplete local source or calendar without writing',async t=>{
 const f=await fixture(t),x=await f.setup(),before=(await f.rows('myys_academic_records')).length;
 for(const patch of [{official:true},{scope:'production'},{timeZone:'Europe/Istanbul'},{effect:'ignore'},{source:{...policy(x.p).source,officialApproval:true}},{mode:'business',calendar:null},{source:{...policy(x.p).source,readScope:''}}])await assert.rejects(f.run('admin','appeal-policy',policy(x.p,patch)));
 assert.equal((await f.rows('myys_academic_records')).length,before);
});
test('B11 SQL late local receipt window still accepts an appeal for independent human review',async t=>{
 const f=await fixture(t),x=await setup(f,{days:1}),d=await decide(f,x);await receipt(f,d);
 const future=new Date(f.clock().getTime()+30*86400000).toISOString();
 f.advance(3*86400000);for(const [person,roles]of [['student',['learner']],['reviewer',['quality']]])await f.putMembership(f.membership(person,{roles,revision:2,expires:future}),1);f.sessions={};
 assert.equal((await f.view('student')).decisions[0].appealWindow.classification,'late-local-review');const a=await f.run('student','appeal',{decisionId:d.id,reason});assert.ok(a.id);assert.equal((await f.view('student')).decisions[0].usable,false);await assert.rejects(f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason}),err('appeal_time_review'));const resolved=await f.run('reviewer','resolve',{appealId:a.id,outcome:'upheld',reason,timeReview:'admitted-local-review',timeReason:reason});assert.equal(resolved.timeReason,reason);assert.equal((await f.view('student')).decisions[0].usable,true);
});
test('B11 SQL policy or receipt audit failure rolls back its record, command and checkpoint',async t=>{
 const f=await fixture(t),x=await f.setup();await f.actor('admin');const before=(await f.rows('myys_academic_records')).length,head=f.journal.inspect().head;
 f.sql.fault=({text})=>{if(text.startsWith('INSERT INTO public.myys_academic_audit'))throw Error('synthetic audit failure');};await assert.rejects(f.run('admin','appeal-policy',policy(x.p)));f.sql.fault=null;
 assert.equal((await f.rows('myys_academic_records')).length,before);assert.deepEqual(f.journal.inspect().head,head);
 const p=await f.run('admin','appeal-policy',policy(x.p));await f.run('publisher','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason});const d=await decide(f,x);await f.actor('student');
 f.sql.fault=({text})=>{if(text.startsWith('INSERT INTO public.myys_academic_audit'))throw Error('synthetic audit failure');};await assert.rejects(receipt(f,d));f.sql.fault=null;assert.equal((await f.rows('myys_academic_records')).filter(x=>x.kind==='decision-receipt').length,0);
});
test('B11 generic objects, copied prototypes and closed SQL working sets cannot enter local policy command',()=>{
 const s=new LocalSqlAcademicWorkingSet({tenant:'test-gazi',records:[],memberships:[]});assert.equal(isLocalSqlAcademicStore(s),true);s.close();assert.equal(isLocalSqlAcademicStore(s),false);
 for(const store of [{},Object.create(LocalSqlAcademicWorkingSet.prototype),s])assert.throws(()=>appealPolicyCommand({action:'appeal-policy',s:store}),err('local_only'));
});
test('B11 SQL policy unknown COMMIT with combined checkpoint returns no result and cannot blindly repeat',async t=>{
 const f=await fixture(t),x=await f.setup();await f.actor('admin');let once=false;
 f.sql.fault=async({text,db})=>{if(!once&&text==='COMMIT'){once=true;await db.query('COMMIT');throw Error('lost acknowledgement');}};
 const cmd=randomUUID();await assert.rejects(f.run('admin','appeal-policy',policy(x.p),cmd),err('identity_commit_unknown'));f.sql.fault=null;
 assert.equal((await f.rows('myys_academic_records')).filter(x=>x.kind==='appeal-policy').length,1);await assert.rejects(f.run('admin','appeal-policy',policy(x.p),cmd),err('identity_checkpoint'));
});
test('B11 real HTTPS same SQL policy preparation respects CSRF and real signed role mapping',async t=>{
 const h=await sqlIdentityHttpFixture({academic:true,checkpoint:true});t.after(()=>h.close());
 const login=async who=>{const a=await h.login(who),v=await h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:a.cookie}});assert.equal(v.status,200);return {cookie:a.cookie,csrf:v.json().identitySession.csrf};};
 const send=(a,action,input,extra={})=>h.request('/api/myys/islem',{method:'POST',headers:{cookie:a.cookie,origin:h.origin,'x-myys-csrf':a.csrf,...extra},body:{tenant:'gazi',commandId:randomUUID(),action,input}});
 const author=await login('author'),{sqlProgram}=await import('./helpers/sql-academic.mjs'),p=await send(author,'program',sqlProgram());assert.equal(p.status,200);
 const admin=await login('admin');assert.equal((await send(admin,'appeal-policy',policy(p.json()),{'x-myys-csrf':'x'.repeat(43)})).status,403);const r=await send(admin,'appeal-policy',policy(p.json()));assert.equal(r.status,200,r.text);
 const publisher=await login('publisher'),accepted=await send(publisher,'appeal-policy-review',{policyId:r.json().id,outcome:'accepted',reason});assert.equal(accepted.status,200,accepted.text);
 const view=await h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:admin.cookie}});assert.equal(view.json().appealPolicies.policies[0].review.id,accepted.json().id);assert.equal(h.f.journal.inspect().pending,null);
});
test('B11 SQL explicit synthetic business calendar skips only listed days and falls back when its coverage ends',async t=>{
 const f=await fixture(t),calendar={from:'2026-10-01',to:'2026-10-31',weekend:'sat-sun',excludedDays:['2026-10-15'],reference:reason},x=await setup(f,{mode:'business',calendar}),d=await decide(f,x);await receipt(f,d);
 assert.equal((await f.view('student')).decisions[0].appealWindow.deadline,'2026-10-19T20:59:59.999Z');
 const p=await f.run('admin','appeal-policy',policy(x.p,{previousId:x.policy.id,changeReason:reason,mode:'business',calendar:{...calendar,to:'2026-10-15'}}));await f.run('publisher','appeal-policy-review',{policyId:p.id,outcome:'accepted',reason});
 const d2=await decide(f,x);await receipt(f,d2);const w=(await f.view('student')).decisions.find(v=>v.id===d2.id).appealWindow;assert.equal(w.classification,'manual-review');assert.equal(w.deadline,null);assert.equal(w.automaticRejection,false);
});
