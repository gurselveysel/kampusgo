// Reproducible local authorization matrix. No production connection or credentials.
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,readdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
assert.ok(!process.env.VERCEL&&!process.env.VERCEL_ENV,'Acceptance matrix cannot run in production');
const output=join(root,'test-results/myys-scope');mkdirSync(output,{recursive:true});
const reports=mkdtempSync(join(tmpdir(),'myys-scope-report-'));
const inventory=JSON.parse(readFileSync(join(root,'gazi/auth/myys/acceptance/scope-inventory.json'),'utf8'));
// Cover literal dispatch guards and module action lists. The checked-in inventory
// is also reviewed against http.mjs; this small scan is not a JavaScript parser.
const discovered=new Set();
for(const file of readdirSync(join(root,'gazi/auth/myys')).filter(f=>f.endsWith('.mjs'))){
 const src=readFileSync(join(root,'gazi/auth/myys',file),'utf8').replace(/typeof\s+action/g,'typeof value');
 for(const m of src.matchAll(/\baction\s*[!=]==?\s*'([^']+)'/g))discovered.add(m[1]);
 for(const m of src.matchAll(/(?:\[([^\]]+)\]\.includes\(action\)|const\s+actions\s*=\[([^\]]+)\])/g))for(const v of (m[1]||m[2]).matchAll(/'([^']+)'/g))discovered.add(v[1]);
}
assert.deepEqual([...discovered].sort(),[...inventory.commands].sort(),'Command inventory drift: update and test every new dispatch');
const http=readFileSync(join(root,'gazi/auth/myys/http.mjs'),'utf8');
assert.deepEqual([...new Set([...http.matchAll(/'\/api\/myys\/([^']+)'/g)].map(m=>m[1]))].sort(),[...inventory.httpRoutes].sort(),'HTTP route inventory drift');
try{
 const files=readdirSync(join(root,'gazi/auth/tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>join(root,'gazi/auth/tests',f));
 const child=spawn(process.execPath,['--test',...files],{cwd:join(root,'gazi/auth'),env:{...process.env,MYYS_AUTHZ_PROBE_DIR:reports},stdio:['ignore','pipe','pipe']});
 let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log+=chunk;});
 const code=await new Promise((ok,fail)=>{child.once('error',fail);child.once('close',ok);});
 writeFileSync(join(output,'server-tests.txt'),log);assert.equal(code,0,'Server tests or scope probe failed; inspect test-results/myys-scope/server-tests.txt');
 const samples=readdirSync(reports).filter(f=>f.endsWith('.jsonl')).flatMap(f=>readFileSync(join(reports,f),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));
 const actions=Object.fromEntries(inventory.commands.map(action=>[action,{positiveSamples:0,checks:{}}]));
 for(const sample of samples){assert.ok(actions[sample.action]);const row=actions[sample.action];row.positiveSamples++;for(const check of sample.checks){const key=check.name+':'+check.status;row.checks[key]=(row.checks[key]||0)+1;}}
 for(const [action,row]of Object.entries(actions)){
  assert.ok(row.positiveSamples>0,action+' has no positive fixture');
  for(const name of ['other-unit-fresh','other-unit-replay','other-tenant-fresh','other-tenant-replay','other-unit-read','other-tenant-read','valid-other-tenant-read'])assert.equal(Object.entries(row.checks).filter(([k])=>k.startsWith(name+':')).reduce((n,[,v])=>n+v,0),row.positiveSamples,action+' lacks '+name);
  assert.equal(Object.entries(row.checks).filter(([k])=>k.startsWith('valid-other-tenant-reference:')||k.startsWith('own-other-tenant-create-control:')).reduce((n,[,v])=>n+v,0),row.positiveSamples,action+' lacks a valid tenant-B command control');
 }
 const totalChecks=samples.reduce((n,s)=>n+s.checks.length,0),result={at:new Date().toISOString(),scope:'isolated-local-acceptance',official:false,commandCount:Object.keys(actions).length,positiveSamples:samples.length,totalChecks,httpRoutes:inventory.httpRoutes,actions,limits:inventory.limits};
 writeFileSync(join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({commandCount:result.commandCount,positiveSamples:result.positiveSamples,totalChecks,httpRoutes:result.httpRoutes.length,result:'test-results/myys-scope/result.json'}));
}finally{rmSync(reports,{recursive:true,force:true});}
