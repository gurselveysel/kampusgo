import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sqlIdentityHttpFixture} from './helpers/sql-identity-http.mjs';
import {identityPaths as P,identityCookie as C,LocalPostgresIdentityHttp} from '../myys/identity-sql-http.mjs';
import {hash} from '../myys/store.mjs';
const fixture=async(t,opts)=>{const h=await sqlIdentityHttpFixture(opts);t.after(()=>h.close());return h;};
const count=async(h,table)=>Number((await h.f.sql.db.query('SELECT count(*) n FROM '+table)).rows[0].n);
const session=(h,cookie)=>h.request(P.session,{headers:{cookie}});
const failed=r=>{assert.equal(r.status,303);assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(r.headers['set-cookie'],undefined);};
const post=(h,path,cookie,csrf,extra={})=>h.request(path,{method:'POST',headers:{cookie,origin:h.origin},form:{csrf},...extra});
test('B07 SQL HTTPS rotates cookie and returns current SQL person without academic claim',async t=>{
 const h=await fixture(t),a=await h.start();assert.equal(a.start.status,303);const p=new URL(a.start.headers.location);assert.equal(p.origin,h.providerOrigin);assert.equal(p.searchParams.get('code_challenge_method'),'S256');assert.equal(p.searchParams.has('code_verifier'),false);const b=await h.callback(a.start),r=await h.request(b.headers.location,{headers:{cookie:a.cookie}});assert.equal(r.status,303);assert.equal(r.headers.location,P.login);const c=r.headers['set-cookie'][0];assert.match(c,/; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=\d+/);assert.notEqual(c.split(';')[0],a.cookie);const info=await session(h,c.split(';')[0]);assert.equal(info.status,200);assert.equal(info.headers['cache-control'],'no-store');assert.deepEqual(info.json().memberships,[{unit:'engineering',roles:['learner']}]);assert.equal(info.json().personId,'student');assert.equal(info.json().academicAccess,false);assert.equal(info.json().official,false);assert.equal(info.text.includes('sid-student'),false);assert.equal((await session(h,a.cookie)).status,401);const rows=await h.f.rows('myys_identity_sessions');assert.equal(rows.length,1);assert.equal(rows[0].session_hash,hash(c.split(';')[0].split('=')[1]));assert.equal(h.tokenCalls,1);assert.equal((await h.request('/api/myys/calisma',{headers:{cookie:c}})).status,404);
});
test('B07 SQL HTTPS denial consumes request and replay never exchanges code',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start,'deny');failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'cancelled');failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal(h.tokenCalls,0);assert.equal(await count(h,'myys_identity_sessions'),0);
});
test('B07 SQL HTTPS callback replay cannot mint another session',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start);assert.ok((await h.request(b.headers.location,{headers:{cookie:a.cookie}})).headers['set-cookie']);failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal(await count(h,'myys_identity_sessions'),1);assert.equal(h.tokenCalls,1);
});
test('B07 SQL HTTPS callback rejects wrong cookie state issuer and duplicate fields',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start),base=new URL(b.headers.location);for(const patch of [{state:randomBytes(32).toString('base64url')},{iss:'https://wrong.invalid'},{extra:'x'},{error:'denied'}]){const u=new URL(base);for(const [k,v]of Object.entries(patch))u.searchParams.set(k,v);failed(await h.request(u.href,{headers:{cookie:a.cookie}}));}const u=new URL(base);u.searchParams.append('state',base.searchParams.get('state'));failed(await h.request(u.href,{headers:{cookie:a.cookie}}));failed(await h.request(base.href,{headers:{cookie:C+'='+randomBytes(32).toString('base64url')}}));assert.equal(h.tokenCalls,0);assert.ok((await h.request(base.href,{headers:{cookie:a.cookie}})).headers['set-cookie']);
});
test('B07 SQL HTTPS Origin CSRF tenant and role confusion fail before challenge write',async t=>{
 const h=await fixture(t),p=await h.request(P.login),cookie=p.headers['set-cookie'][0].split(';')[0],csrf=p.text.match(/name="csrf" value="([^"]+)"/)[1];for(const v of [{headers:{cookie},form:{csrf}},{headers:{cookie,origin:'https://evil.invalid'},form:{csrf}},{headers:{cookie,origin:h.origin,'sec-fetch-site':'cross-site'},form:{csrf}},{headers:{cookie,origin:h.origin},form:{}},{headers:{cookie,origin:h.origin},form:{csrf:'x'.repeat(43)}},{headers:{cookie,origin:h.origin,'x-myys-csrf':'x'.repeat(43)},form:{csrf}},{headers:{cookie,origin:h.origin},form:{csrf,tenant:'other'}},{headers:{cookie,origin:h.origin},form:{csrf,role:'admin'}}])assert.ok([400,403].includes((await h.request(P.start,{method:'POST',...v})).status));assert.equal(await count(h,'myys_identity_challenges'),0);
});
test('B07 SQL HTTPS wrong Host forwarding headers and ambiguous cookies reject before budget',async t=>{
 const h=await fixture(t);for(const headers of [{host:'evil.invalid'},{forwarded:'for=127.0.0.1'},{'x-forwarded-for':'127.0.0.1'},{'x-forwarded-host':'evil.invalid'},{'x-forwarded-proto':'https'},{cookie:C+'=invalid'},{cookie:C+'='+'A'.repeat(43)+'; '+C+'='+'A'.repeat(43)}])assert.equal((await h.request(P.login,{headers})).status,403);assert.equal(await count(h,'myys_identity_http_buckets'),0);
});
test('B07 SQL HTTPS method query and bounded strict form reject ambiguity',async t=>{
 const h=await fixture(t),a=await h.start();const bad=await h.request(P.start);assert.equal(bad.status,405);assert.equal(bad.headers.allow,'POST');assert.equal((await h.request(P.session+'?tenant=other')).status,400);for(const v of [{body:{csrf:a.csrf}},{form:[['csrf',a.csrf],['csrf',a.csrf]]},{form:{csrf:a.csrf,padding:'x'.repeat(4100)}}]){const r=await h.request(P.start,{method:'POST',headers:{cookie:a.cookie,origin:h.origin},...v});assert.ok([400,413,415].includes(r.status));}assert.equal(await count(h,'myys_identity_challenges'),1);
});
test('B07 SQL HTTPS signed wrong issuer unknown person and weak MFA create no session',async t=>{
 const h=await fixture(t);for(const patch of [{iss:'https://wrong.invalid'},{sub:'unknown'},{amr:['pwd']}]){h.patch=patch;failed((await h.login()).response);}assert.equal(await count(h,'myys_identity_sessions'),0);
});
test('B07 SQL HTTPS directory change during provider I/O prevents session',async t=>{
 const h=await fixture(t);h.beforeToken=()=>h.f.putMembership(h.f.membership('student',{active:false,revision:2}),1);failed((await h.login()).response);assert.equal(await count(h,'myys_identity_sessions'),0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'failed');
});
test('B07 SQL HTTPS key rotation during provider I/O blocks final session',async t=>{
 let now=Date.parse('2026-10-14T10:00:59.500Z');const h=await fixture(t,{clock:()=>new Date(now)});h.beforeToken=async()=>{now+=500;await h.rotate();};failed((await h.login()).response);assert.equal(await count(h,'myys_identity_sessions'),0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'failed');assert.equal((await h.request(P.login)).status,200);
});
test('B07 SQL HTTPS permit expires at provider and at final SQL write with rollback',async t=>{
 const h=await fixture(t);h.beforeToken=()=>h.f.advance(30000);failed((await h.login()).response);assert.equal(await count(h,'myys_identity_sessions'),0);h.beforeToken=async()=>{};let shifted=false;h.f.sql.fault=({text,values})=>{if(text.startsWith('INSERT INTO myys_identity_challenge_audit')&&values[5]==='use'&&!shifted){shifted=true;h.f.advance(30000);}};failed((await h.login()).response);h.f.sql.fault=null;assert.ok(shifted);assert.equal(await count(h,'myys_identity_sessions'),0);assert.ok((await h.f.rows('myys_identity_challenges')).every(r=>r.status==='failed'));
});
test('B07 SQL HTTPS active quota prevents key rotation; old worker and CSRF close after transition',async t=>{
 let now=Date.parse('2026-10-14T10:00:00Z');const h=await fixture(t,{clock:()=>new Date(now)}),a=await h.start(),old=h.identity;await assert.rejects(h.rotate(),e=>e.code==='identity_key_rotation_wait');now+=60000;await h.rotate();assert.equal((await post(h,P.start,a.cookie,a.csrf)).status,403);h.select(old);assert.equal((await h.request(P.login)).status,503);
});
test('B07 SQL HTTPS logout closes family and later reads; missing CSRF cannot logout',async t=>{
 const h=await fixture(t),a=await h.login(),p=await session(h,a.cookie);assert.equal(p.status,200);assert.equal((await post(h,P.logout,a.cookie,undefined,{form:{}})).status,403);assert.equal((await session(h,a.cookie)).status,200);const out=await post(h,P.logout,a.cookie,p.json().csrf);assert.equal(out.status,303);assert.match(out.headers['set-cookie'][0],/Max-Age=0/);assert.equal((await session(h,a.cookie)).status,401);assert.equal((await h.f.rows('myys_identity_sessions'))[0].status,'revoked');
});
test('B07 SQL HTTPS pre-session logout during exchange cancels callback',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start);h.beforeToken=async()=>assert.equal((await post(h,P.logout,a.cookie,a.csrf)).status,303);failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal(await count(h,'myys_identity_sessions'),0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'cancelled');
});
test('B07 SQL HTTPS signed backchannel revokes and prevents late new callback',async t=>{
 const h=await fixture(t),a=await h.login(),logout_token=await h.f.logoutToken();assert.equal((await h.request(P.backchannel,{method:'POST',form:{logout_token}})).status,200);assert.equal((await session(h,a.cookie)).status,401);assert.equal((await h.request(P.backchannel,{method:'POST',form:{logout_token}})).status,200);assert.equal(await count(h,'myys_identity_logout_receipts'),1);h.f.advance(1000);h.beforeToken=async()=>assert.equal((await h.request(P.backchannel,{method:'POST',form:{logout_token:await h.f.logoutToken()}})).status,200);failed((await h.login()).response);assert.equal((await h.f.rows('myys_identity_sessions')).filter(r=>r.status==='active').length,0);
});
test('B07 SQL HTTPS backchannel rejects invalid signature extra fields duplicate and large form',async t=>{
 const h=await fixture(t),good=await h.f.logoutToken();for(const form of [{logout_token:'unsigned'},[['logout_token',good],['logout_token',good]],{logout_token:good,tenant:'other'},{logout_token:'x'.repeat(25000)}])assert.equal((await h.request(P.backchannel,{method:'POST',form})).status,400);assert.equal(await count(h,'myys_identity_logout_receipts'),0);
});
test('B07 SQL HTTPS uncertain real claim COMMIT returns no cookie and does not exchange',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start);let armed=false,fired=false;h.f.sql.fault=async({text,db})=>{if(text.startsWith("UPDATE myys_identity_challenges SET status='claimed'"))armed=true;if(armed&&!fired&&text==='COMMIT'){fired=true;await db.exec('COMMIT');throw Error('synthetic claim transport loss');}};failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));h.f.sql.fault=null;assert.ok(fired);assert.equal(h.tokenCalls,0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'claimed');failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal(h.tokenCalls,0);
});
test('B07 SQL HTTPS uncertain real final COMMIT returns no cookie and cannot repeat',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start);let armed=false,fired=false;h.f.sql.fault=async({text,db})=>{if(text.startsWith('INSERT INTO myys_identity_sessions'))armed=true;if(armed&&!fired&&text==='COMMIT'){fired=true;await db.exec('COMMIT');throw Error('synthetic final transport loss');}};failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));h.f.sql.fault=null;assert.ok(fired);assert.equal(await count(h,'myys_identity_sessions'),1);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'used');failed(await h.request(b.headers.location,{headers:{cookie:a.cookie}}));assert.equal(h.tokenCalls,1);
});
test('B07 SQL HTTPS audit failure rolls back final session and challenge use',async t=>{
 const h=await fixture(t);h.f.sql.fault=({text,values})=>{if(text.startsWith('INSERT INTO myys_identity_session_audit')&&values[5]==='accept')throw Error('synthetic audit failed');};failed((await h.login()).response);h.f.sql.fault=null;assert.equal(await count(h,'myys_identity_sessions'),0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'failed');
});
test('B07 SQL HTTPS rate limit has Turkish status no-store Retry-After and shared instance budget',async t=>{
 const h=await fixture(t,{limits:{global:5,network:2,browser:1,seconds:60}});await h.request(P.login);await h.request(P.login);h.select(h.make(h.keys[0]));const r=await h.request(P.login,{headers:{accept:'text/html'}});assert.equal(r.status,429);assert.equal(r.headers['retry-after'],'60');assert.equal(r.headers['cache-control'],'no-store');assert.match(r.text,/Giriş isteği sınırına ulaşıldı/);assert.match(r.text,/role="alert"/);assert.equal(r.headers['set-cookie'],undefined);
});
test('B07 SQL HTTPS remains Vercel-closed and rejects non-loopback origin',async()=>{
 const old=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>new LocalPostgresIdentityHttp({}),e=>e.code==='local_only');}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}assert.throws(()=>new LocalPostgresIdentityHttp({origin:'https://gazi.unigoturkiye.com'}),e=>e.code==='identity_http_config');
});
test('B07 SQL HTTPS final logout guard rolls back expired permit and audit',async t=>{
 const h=await fixture(t),a=await h.login(),p=await session(h,a.cookie);let shifted=false;h.f.sql.fault=({text,values})=>{if(text.startsWith('INSERT INTO myys_identity_session_audit')&&values[5]==='logout'&&!shifted){shifted=true;h.f.advance(30000);}};assert.equal((await post(h,P.logout,a.cookie,p.json().csrf)).status,503);h.f.sql.fault=null;assert.ok(shifted);assert.equal((await session(h,a.cookie)).status,200);assert.equal((await h.f.rows('myys_identity_sessions'))[0].status,'active');
});
test('B07 SQL HTTPS final backchannel guard rolls back expired receipt and revocation',async t=>{
 const h=await fixture(t),a=await h.login();let shifted=false;h.f.sql.fault=({text,values})=>{if(text.startsWith('INSERT INTO myys_identity_session_audit')&&values[5]==='backchannel'&&!shifted){shifted=true;h.f.advance(30000);}};assert.equal((await h.request(P.backchannel,{method:'POST',form:{logout_token:await h.f.logoutToken()}})).status,400);h.f.sql.fault=null;assert.ok(shifted);assert.equal(await count(h,'myys_identity_logout_receipts'),0);assert.equal((await session(h,a.cookie)).status,200);
});

test('B07 SQL HTTPS session errors remain JSON even for a navigation Accept header',async t=>{
 const h=await fixture(t),r=await h.request(P.session,{headers:{accept:'text/html'}});assert.equal(r.status,401);assert.match(r.headers['content-type'],/application\/json/);assert.equal(r.json().code,'session_required');assert.equal(r.json().official,false);assert.equal(r.headers['cache-control'],'no-store');
});
test('B07 SQL HTTPS provider timeout returns no cookie and late token cannot create session',async t=>{
 const h=await fixture(t,{exchangeTimeoutMs:250});let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);h.beforeToken=async()=>{enter();await gate;};const pending=h.login();await entered;const r=await pending;failed(r.response);release();assert.equal(await count(h,'myys_identity_sessions'),0);assert.equal((await h.f.rows('myys_identity_challenges'))[0].status,'failed');
});
test('B07 SQL HTTPS handler rejects a non-TLS transport before SQL or cookie writes',async t=>{
 const h=await fixture(t),headers={},res={setHeader:(k,v)=>headers[k]=v,removeHeader:k=>delete headers[k],writeHead:(status,extra)=>{res.status=status;Object.assign(headers,extra);},end:value=>{res.text=value;}};await h.identity.handle({url:P.login,method:'GET',headers:{host:new URL(h.origin).host},socket:{encrypted:false,remoteAddress:'127.0.0.1'}},res);assert.equal(res.status,403);assert.equal(headers['Set-Cookie'],undefined);assert.equal(await count(h,'myys_identity_http_buckets'),0);
});
