import test from 'node:test';
import assert from 'node:assert/strict';
import {sqlIdentityHttpFixture} from './helpers/sql-identity-http.mjs';
import {identityPaths as P} from '../myys/identity-sql-http.mjs';
const fixture=async t=>{const h=await sqlIdentityHttpFixture({checkpoint:true});t.after(()=>h.close());return h;};
test('B07/B28 TLS session and Turkish login fail closed when SQL state diverges from independent journal',async t=>{
 const h=await fixture(t),a=await h.login();assert.equal(a.response.status,303);assert.ok(a.cookie);assert.equal((await h.request(P.session,{headers:{cookie:a.cookie}})).status,200);
 await h.f.sql.db.query("UPDATE myys_identity_memberships SET active=false WHERE person_id='student'");
 const r=await h.request(P.session,{headers:{cookie:a.cookie,accept:'text/html'}});assert.equal(r.status,503);assert.match(r.headers['content-type'],/application\/json/);assert.equal(r.json().code,'identity_checkpoint');assert.equal(r.json().official,false);assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.text.includes('student'),false);
 const page=await h.request(P.login,{headers:{cookie:a.cookie,accept:'text/html'}});assert.equal(page.status,503);assert.match(page.text,/role="alert"/);assert.equal(page.headers['set-cookie'],undefined);assert.equal(page.text.includes('SELECT'),false);assert.equal(h.f.journal.inspect().pending,null);
});
test('B07/B28 TLS final commit uncertainty issues no cookie and blocks subsequent login before provider',async t=>{
 const h=await fixture(t),a=await h.start(),b=await h.callback(a.start);let armed=false,fired=false;
 h.f.sql.fault=async({text,db})=>{if(text.startsWith('INSERT INTO myys_identity_sessions'))armed=true;if(armed&&!fired&&text==='COMMIT'){fired=true;await db.exec('COMMIT');throw Error('synthetic postcommit failure');}};
 const result=await h.request(b.headers.location,{headers:{cookie:a.cookie}});h.f.sql.fault=null;assert.ok(fired);assert.equal(result.status,303);assert.equal(result.headers.location,P.login+'?result=failed');assert.equal(result.headers['set-cookie'],undefined);assert.ok(h.f.journal.inspect().pending);assert.equal((await h.f.rows('myys_identity_sessions')).length,1);
 h.select(h.make(h.keys[0]));const page=await h.request(P.login,{headers:{cookie:a.cookie,accept:'text/html'}});assert.equal(page.status,503);assert.equal(page.headers['set-cookie'],undefined);assert.equal(h.tokenCalls,1);
});
test('B07/B28 provider gap releases journal; current membership revision still denies final TLS acceptance',async t=>{
 const h=await fixture(t);h.beforeToken=async()=>{assert.equal(h.f.journal.inspect().pending,null);assert.equal(h.f.sql.active,0);await h.f.putMembership(h.f.membership('student',{active:false,revision:2}),1);};
 const result=await h.login();assert.equal(result.response.status,303);assert.equal(result.response.headers.location,P.login+'?result=failed');assert.equal(result.cookie,undefined);assert.equal((await h.f.rows('myys_identity_sessions')).length,0);assert.equal(h.f.journal.inspect().pending,null);
});
