import test from 'node:test';
import assert from 'node:assert/strict';
import {sqlAcademicHttp,sqlHttpOk} from './helpers/sql-academic-http.mjs';
import {sqlIdentityHttpFixture} from './helpers/sql-identity-http.mjs';
import {sqlAuthority,sqlCredentialProfile} from './helpers/sql-authority.mjs';
import {sqlAcademicReason as reason} from './helpers/sql-academic.mjs';
import {stableStringify} from '../myys/program-model.mjs';
import {hash} from '../myys/store.mjs';
const ready=async h=>{const x=await sqlAuthority(h);await h.run('publisher','publish',{programId:x.p.id,reason});return {...x,profile:await sqlCredentialProfile(h,x)};};
test('B03 signed HTTPS person downloads the same SQL program package with private fields removed and no-cache',async t=>{
 const h=await sqlAcademicHttp(t),x=await ready(h),r=await h.export('author',x.p.id),p=await sqlHttpOk(Promise.resolve(r));assert.equal(p.sha256,hash(stableStringify(p.payload)));assert.equal(p.payload.credentialProfile.id,x.profile.id);assert.equal(p.payload.credentialProfile.authorityDossierId,x.dossier.id);assert.equal(p.payload.credentialProfile.issuerPeople,undefined);assert.equal(p.signed,false);assert.equal(p.official,false);assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['set-cookie'],undefined);assert.match(r.headers['content-type'],/application\/json/);const history=await h.f.rows('myys_identity_http_history');assert.equal(history[0].limits.academicProfile,'same-sql-academic/2');
 await h.run('admin','authority-hold',{dossierId:x.dossier.id,reason});const stale=await h.export('author',x.p.id);assert.equal(stale.status,409);assert.equal(stale.json().code,'program_package_blocked');assert.equal(stale.json().payload,undefined);
});
test('B08 SQL package HTTP rejects anonymous, CSRF, origin, verb, query, role and tenant forgery',async t=>{
 const h=await sqlAcademicHttp(t,{limits:{global:120,network:120,browser:40,seconds:60}});assert.equal((await h.request('/api/myys/program-paketi',{method:'POST',body:{tenant:'gazi',programId:'absent'}})).status,401);const a=await h.actor('author');
 for(const extra of [{'x-myys-csrf':undefined},{'x-myys-csrf':'x'.repeat(43)},{origin:'https://evil.invalid'},{'sec-fetch-site':'cross-site'},{'x-forwarded-host':'other.invalid'}])assert.equal((await h.export('author','absent',extra)).status,403);
 assert.equal((await h.request('/api/myys/program-paketi',{headers:{cookie:a.cookie}})).status,405);
 for(const body of [{tenant:'other',programId:'absent'},{tenant:'gazi',programId:'absent',role:'commission'},{tenant:'gazi',programId:'absent',action:'issue'}])assert.equal((await h.post('author','program-paketi',body)).status,400);
 assert.equal((await h.post('author','program-paketi',{tenant:'gazi'})).status,422);
 assert.equal((await h.post('author','program-paketi?programId=x',{tenant:'gazi',programId:'absent'})).status,400);assert.equal((await h.export('student','absent')).status,404);
 assert.equal((await h.export('author','x'.repeat(65000))).status,413);assert.equal((await h.f.rows('myys_academic_records')).length,0);
});
test('B07 expired permit during SQL program snapshot produces JSON failure without a package or cookie',async t=>{
 const h=await sqlAcademicHttp(t),x=await ready(h);await h.actor('author');let fired=false;h.f.sql.fault=({text})=>{if(!fired&&text.startsWith('SELECT kind,id,unit,owner,data')){fired=true;h.f.advance(30000);}};const r=await h.export('author',x.p.id,{accept:'text/html'});h.f.sql.fault=null;assert.equal(fired,true);assert.equal(r.status,503);assert.equal(r.json().code,'identity_http_permit');assert.equal(r.json().payload,undefined);assert.equal(r.headers['set-cookie'],undefined);assert.match(r.headers['content-type'],/application\/json/);
});
test('B03 default SQL identity profile does not expose package export; reviewed profile never opens issue or sign',async t=>{
 const closed=await sqlIdentityHttpFixture();t.after(()=>closed.close());assert.equal((await closed.request('/api/myys/program-paketi',{method:'POST',body:{tenant:'test-gazi',programId:'x'}})).status,404);
 const h=await sqlAcademicHttp(t),x=await ready(h);for(const who of ['student','admin','issuer'])assert.equal((await h.export(who,x.p.id)).status,404);const r=await h.post('issuer','islem',{tenant:'gazi',commandId:'no-real-issue',action:'issue',input:{programId:x.p.id}});assert.equal(r.status,409);assert.equal((await h.post('issuer','imzala',{tenant:'gazi',issuanceId:'none'})).status,404);
});
