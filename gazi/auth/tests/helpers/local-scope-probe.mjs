// Optional acceptance runner: probe a COPY after a real positive command commits.
// The source fixture and its test expectations are never mutated by these probes.
import {copyFileSync,mkdtempSync,rmSync,appendFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {LocalAcceptanceStore,hash} from '../../myys/store.mjs';
import {MyysCore} from '../../myys/core.mjs';
export function probeCommandScopes(core,args,result,actor){
 const report=process.env.MYYS_AUTHZ_PROBE_DIR;if(!report)return;
 assert.ok(core.store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'Scope probes are local only');
 assert.ok(resolve(report).startsWith(resolve(tmpdir())+'/'),'Scope probe output must be temporary');
 assert.ok(result?.unit,'Every sampled command must identify its authoritative unit');
 const dir=mkdtempSync(join(tmpdir(),'myys-scope-copy-')),file=join(dir,'probe.sqlite');let s;
 try{
  const source=core.store.db.prepare('PRAGMA database_list').all().find(x=>x.name==='main').file;copyFileSync(source,file);s=new LocalAcceptanceStore(file);const probe=new MyysCore(s,{clock:core.clock});
  const tables=s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
  assert.ok(tables.every(t=>/^[a-z_]+$/.test(t)));
  const before=()=>hash(JSON.stringify(tables.map(t=>[t,s.db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()])));
  const sourceBefore=()=>hash(JSON.stringify(tables.filter(t=>s.db.prepare('PRAGMA table_info('+t+')').all().some(c=>c.name==='tenant')).map(t=>[t,s.db.prepare('SELECT * FROM '+t+' WHERE tenant=? ORDER BY rowid').all(args.tenant)])));
  const roles=[...new Set(actor.memberships.flatMap(m=>m.roles))];
  s.db.prepare('UPDATE memberships SET active=0 WHERE tenant=? AND person=?').run(args.tenant,actor.id);
  s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1) ON CONFLICT(tenant,person,unit) DO UPDATE SET roles=excluded.roles,expires=excluded.expires,active=1').run(args.tenant,actor.id,'scope-probe-other-unit',JSON.stringify(roles),'2099-01-01T00:00:00.000Z');
  const baseline=before(),checks=[];
  for(const [name,request] of [['other-unit-fresh',{...args,commandId:randomUUID()}],['other-unit-replay',args],['other-tenant-fresh',{...args,tenant:'scope-probe-other-tenant',commandId:randomUUID()}],['other-tenant-replay',{...args,tenant:'scope-probe-other-tenant'}]]){
   let error;try{probe.run(request);}catch(e){error=e;}
   assert.ok(error&&[403,404].includes(error.status),`${args.action}: ${name} requires scope rejection, got ${error?.code||'SUCCESS'}`);
   assert.equal(before(),baseline,`${args.action}: ${name} changed records, idempotency or audit`);checks.push({name,status:error.status,code:error.code});
  }
  const knownRecords=new Set(s.db.prepare('SELECT id FROM records WHERE tenant=?').all(args.tenant).map(r=>r.id));
  function privateRecordCheck(value,path='view'){
   // A person may inspect their own membership history, including inactive units.
   if(path.startsWith('view.membership.members[')&&value?.person===actor.id)return;
   if(typeof value==='string')assert.ok(!knownRecords.has(value),`${args.action}: other-unit read exposed record at ${path}`);
   if(Array.isArray(value))value.forEach((v,i)=>privateRecordCheck(v,path+'['+i+']'));
   else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))privateRecordCheck(v,path+'.'+k);
  }
  privateRecordCheck(probe.view({sessionHash:args.sessionHash,tenant:args.tenant}));checks.push({name:'other-unit-read',status:'no-private-record'});
  assert.throws(()=>probe.view({sessionHash:args.sessionHash,tenant:'scope-probe-other-tenant'}),e=>e.status===403,`${args.action}: other-tenant read not blocked`);checks.push({name:'other-tenant-read',status:403});
  // A real, valid tenant-B session must also be unable to reference tenant-A IDs.
  // This avoids treating a rejected mismatched session as the entire tenant test.
  const otherTenant='scope-probe-valid-tenant',otherHash=hash(randomUUID());
  s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(otherTenant,actor.id,result.unit,JSON.stringify(roles),'2099-01-01T00:00:00.000Z');
  s.db.prepare('INSERT INTO bindings VALUES(?,?,?,?)').run(otherHash,actor.id,'2099-01-01T00:00:00.000Z',actor.mfa?1:0);
  s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(otherHash,otherTenant,'scope-probe',core.clock());
  function foreignReference(value,key=''){
   if(typeof value==='string')return /Ids?$/.test(key)&&knownRecords.has(value);
   if(Array.isArray(value))return value.some(v=>foreignReference(v,key));
   return value&&typeof value==='object'&&Object.entries(value).some(([k,v])=>foreignReference(v,k));
  }
  const other={...args,tenant:otherTenant,sessionHash:otherHash,commandId:randomUUID()},tenantBaseline=before();
  if(args.action==='batch-create'){
   const sourceDigest=sourceBefore();
   const own=probe.run(other);assert.ok(own.rows.every(r=>r.code&&r.decisionId===null&&r.owner===null), 'Foreign batch rows exposed a decision or learner');
   assert.equal(s.list(otherTenant,'issuance').length,0);assert.equal(sourceBefore(),sourceDigest);
   checks.push({name:'valid-other-tenant-reference',status:'foreign-rows-rejected'});
  }else if(foreignReference(args.input)||args.action==='membership-propose'){
   let error;try{probe.run(other);}catch(e){error=e;}
   assert.ok(error&&[400,403,404,409,422].includes(error.status),`${args.action}: valid tenant-B reference not rejected correctly: ${error?.code||error?.name||'SUCCESS'}`);
   assert.equal(before(),tenantBaseline,`${args.action}: foreign reference modified persisted state`);checks.push({name:'valid-other-tenant-reference',status:error.status,code:error.code});
  }else if(['program','registry-draft','support','privacy-request','privacy-withdraw-shares','recognition-policy','key-register'].includes(args.action)){
   const sourceDigest=sourceBefore();
   const own=probe.run(other);assert.notEqual(own.id,result.id,`${args.action}: tenant record identity collided`);
   assert.ok(s.db.prepare('SELECT id FROM records WHERE tenant=? AND id=?').get(otherTenant,own.id));
   assert.equal(sourceBefore(),sourceDigest);
   checks.push({name:'own-other-tenant-create-control',status:'separate-record'});
  }
  const otherView=probe.view(other);privateRecordCheck(otherView,'tenantB');checks.push({name:'valid-other-tenant-read',status:'no-tenant-A-record'});
  appendFileSync(join(report,process.pid+'.jsonl'),JSON.stringify({action:args.action,unit:result.unit,checks})+'\n');
 }finally{s?.close();rmSync(dir,{recursive:true,force:true});}
}
