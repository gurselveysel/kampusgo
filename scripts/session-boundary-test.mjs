import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

// Exercise the actual Next broker module with failures at its network boundary.
let cookie = 'opaque-test-value', deleted = 0;
let response = { ok: false, code: 'SERVICE_UNAVAILABLE' };
let networkFailure = false;
const exports = {};
vm.runInNewContext(compile('lib/pilot/broker.ts'), {
  exports, process: { env: { NODE_ENV: 'production' } }, AbortSignal,
  require: name => name === 'next/headers' ? { cookies: async () => ({get:()=>cookie ? {value:cookie}:undefined, delete:()=>{deleted++;cookie=null;}}) } : {},
  fetch: async () => { if(networkFailure) throw new Error('network unavailable'); return {json:async()=>response}; }
});
assert.equal((await exports.revokePilotSession()).ok, false);
assert.equal(deleted, 0, 'Failed revocation must retain cookie for retry');
networkFailure=true;
assert.equal((await exports.revokePilotSession()).ok, false);
assert.equal(deleted, 0);
networkFailure=false; response={ok:false,code:'SESSION_INVALID'};
assert.equal((await exports.revokePilotSession()).ok, true);
assert.equal(deleted, 1, 'Confirmed invalid sessions can be removed');
cookie='opaque-test-value';response={ok:true};
assert.equal((await exports.revokePilotSession()).ok,true);
assert.equal(deleted,2);

// Run the deployed Edge request handler with failure-injected DB/Auth adapters.
// These are unit tests, not evidence of a live Supabase login.
let handler, revokeFailure=true, revoked=false, authFailure=false, authCalls=0;
const service={
  rpc:async name=>{
    if(name==='pilot_broker_get_session')return {data:revoked?[]:[{access_token:'synthetic-jwt'}],error:null};
    if(name==='pilot_broker_revoke_session'){
      if(revokeFailure)return {error:{code:'08006'}};
      revoked=true;return {error:null};
    }
    throw new Error('Unexpected RPC in logout');
  },
  auth:{admin:{signOut:async(jwt,scope)=>{
    assert.equal(revoked,true,'Application revocation must precede Auth cleanup');
    assert.equal(jwt,'synthetic-jwt');assert.equal(scope,'local');authCalls++;
    if(authFailure)throw new Error('Auth unavailable');
    return {error:null};
  }}}
};
vm.runInNewContext(compile('supabase/functions/pilot-auth-broker/index.ts'),{
  exports:{}, TextEncoder,Response,Request,Headers,crypto:webcrypto,btoa,
  console:{error:()=>{},warn:()=>{}},
  Deno:{env:{get:()=>''},serve:fn=>handler=fn},
  require:name=>name==='@supabase/supabase-js'?{createClient:()=>service}:{}
});
const request=op=>new Request('https://pilot.test/',{method:'POST',headers:{'content-type':'application/json','x-pilot-session':'a'.repeat(43)},body:JSON.stringify({op})});
let result=await handler(request('logout'));
assert.equal(result.status,503);assert.equal((await result.json()).ok,false);assert.equal(authCalls,0);
revokeFailure=false;authFailure=true;
result=await handler(request('logout'));
assert.equal((await result.json()).ok,true);assert.equal(revoked,true);assert.equal(authCalls,1);
result=await handler(request('context'));
assert.equal(result.status,401);assert.equal((await result.json()).code,'SESSION_INVALID','Old opaque value must fail after logout even when Auth cleanup fails');
console.log('PASS: Next cookie retry/confirmed revocation; Edge DB failure, revoke ordering, Auth cleanup failure, and old-session rejection (unit boundary tests).');
