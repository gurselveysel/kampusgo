import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {use} from './helpers/myys-fixture.mjs';
import {seedLoginRequest,loginCleanupCase,cleanupReason as reason} from './helpers/local-login-cleanup.mjs';
import {identityHttpFixture} from './helpers/local-identity-http.mjs';
import {identityPaths as P} from '../myys/identity-http.mjs';
const clean=(f,p,extra={},key)=>f.run('student','privacy-login-cleanup',{previewId:p.id,confirm:true,...extra},key);
const rows=f=>f.s.db.prepare('SELECT * FROM identity_challenges ORDER BY id').all();
const barriers=f=>JSON.stringify(['identity_session_links','identity_provider_sessions','identity_logout_receipts','bindings','identity_scopes','persons','memberships'].map(t=>[t,f.s.db.prepare('SELECT * FROM '+t).all()]));

test('B28 yalnız tek kişiye kabul izi bağlı, tamamlanmış ve süresi dolmuş istek temizlenir',()=>use(f=>{
 const academic=f.passed(),eligible=seedLoginRequest(f),kept=[seedLoginRequest(f,{person:'other'}),seedLoginRequest(f,{tenant:'another'}),seedLoginRequest(f,{status:'pending'}),seedLoginRequest(f,{status:'claimed'}),seedLoginRequest(f,{future:true}),seedLoginRequest(f,{ambiguous:true}),seedLoginRequest(f,{accepted:false}),seedLoginRequest(f,{invalidTime:true})],before=barriers(f),x=loginCleanupCase(f),p=x.preview();
 assert.equal(p.candidateCount,1);assert.equal(p.eligibleCount,1);assert.equal(JSON.stringify(p).includes(eligible),false);const r=clean(f,p);assert.equal(r.removedRequestRows,1);assert.equal(r.sessionRowsDeleted,0);assert.equal(r.securityBarriersChanged,false);assert.equal(r.requestFullyFulfilled,false);assert.equal(r.physicalDestructionVerified,false);assert.deepEqual(rows(f).map(r=>r.id).sort(),kept.sort());assert.equal(barriers(f),before);assert.ok(f.s.get('test-gazi','decision',academic.d.id));assert.ok(f.s.db.prepare("SELECT 1 FROM audit WHERE action='identity.accept' AND record_id=?").get(eligible));
}));

test('B28 ayrı yanıt, kişi/MFA, kapalı üretim ve sabit hedef alanları zorunludur',()=>use(f=>{
 seedLoginRequest(f);const x=loginCleanupCase(f),p=x.preview();assert.throws(()=>clean(f,p,{confirm:false}),e=>e.code==='privacy_cleanup_confirm');assert.throws(()=>clean(f,p,{table:'audit'}),e=>e.code==='privacy_cleanup_fields');assert.throws(()=>f.run('admin','privacy-login-cleanup',{previewId:p.id,confirm:true}),e=>e.status===404);assert.throws(()=>f.run('other','privacy-login-preview',{requestId:x.request.id,responseId:x.response.id}),e=>e.status===404);
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('student');assert.throws(()=>x.preview(),e=>e.code==='mfa_required');f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE person=?').run('student');const old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>clean(f,p),e=>e.code==='local_only');}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
 f.run('admin','privacy-response',{requestId:x.request.id,previousResponseId:x.response.id,outcome:'institution-action-required',response:reason,basisReference:reason,academicRetentionReference:reason,reviewOn:'2099-01-01'});assert.throws(()=>clean(f,p),e=>e.code==='privacy_response');assert.equal(rows(f).length,1);
}));

test('B28 önizleme süresi, saat geri kayması ve değişmiş aday kümesi yazmadan reddedilir',()=>use(f=>{
 const now=Date.now();f.core.clock=()=>new Date(now).toISOString();seedLoginRequest(f);const x=loginCleanupCase(f),p=x.preview();f.core.clock=()=>new Date(now+900001).toISOString();assert.throws(()=>clean(f,p),e=>e.code==='privacy_cleanup_stale');f.core.clock=()=>new Date(now-1).toISOString();assert.throws(()=>clean(f,p),e=>e.code==='privacy_cleanup_stale');f.core.clock=()=>new Date(now).toISOString();seedLoginRequest(f);assert.throws(()=>clean(f,p),e=>e.code==='privacy_cleanup_stale');assert.equal(rows(f).length,2);assert.equal(f.s.list('test-gazi','privacy-login-cleanup').length,0);
}));

test('B28 audit hatası temizliği geri alır; başarılı tekrar yeniden silmez ve MFA tekrar denetlenir',()=>use(f=>{
 seedLoginRequest(f);const x=loginCleanupCase(f),p=x.preview();f.s.db.exec("CREATE TRIGGER fail_login_cleanup BEFORE INSERT ON audit WHEN NEW.action='privacy-login-cleanup' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END;");assert.throws(()=>clean(f,p));assert.equal(rows(f).length,1);assert.equal(f.s.list('test-gazi','privacy-login-cleanup').length,0);f.s.db.exec('DROP TRIGGER fail_login_cleanup');const r=clean(f,p,{},'same-cleanup');assert.equal(clean(f,p,{},'same-cleanup').id,r.id);assert.equal(clean(f,p).id,r.id);assert.equal(f.s.list('test-gazi','privacy-login-cleanup').length,1);f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('student');assert.throws(()=>clean(f,p,{},'same-cleanup'),e=>e.code==='forbidden');
}));

test('B28 yüz satır sınırı kalan kayıtları açık sayar; yeni önizlemeyle kalan temizlenir',()=>use(f=>{
 for(let i=0;i<101;i++)seedLoginRequest(f);const x=loginCleanupCase(f),p=x.preview();assert.equal(p.candidateCount,100);assert.equal(p.eligibleCount,101);const first=clean(f,p);assert.equal(first.removedRequestRows,100);assert.equal(first.remainingEligibleRows,1);assert.equal(rows(f).length,1);const next=x.preview();assert.equal(next.candidateCount,1);assert.equal(clean(f,next).removedRequestRows,1);assert.equal(rows(f).length,0);
}));

test('B28 giriş deposu veya uygun kayıt yoksa boş önizleme silme yetkisi üretmez',()=>use(f=>{
 const x=loginCleanupCase(f),p=x.preview();assert.equal(p.candidateCount,0);assert.throws(()=>clean(f,p),e=>e.code==='privacy_cleanup_empty');seedLoginRequest(f,{status:'failed'});assert.equal(x.preview().candidateCount,0);assert.equal(f.s.list('test-gazi','privacy-login-cleanup').length,0);
}));

test('B28 iki depo bağlantısındaki önizlemeler tek temizlikte mutabık kalır; eski aday tekrar çalışmaz',()=>use(f=>{
 seedLoginRequest(f);const x=loginCleanupCase(f),p=x.preview(),second=new LocalAcceptanceStore(f.path),core=new MyysCore(second);try{const p2=core.run({...f.context('student'),commandId:'second-preview',action:'privacy-login-preview',input:{requestId:x.request.id,responseId:x.response.id}});clean(f,p);assert.throws(()=>core.run({...f.context('student'),commandId:'second-run',action:'privacy-login-cleanup',input:{previewId:p2.id,confirm:true}}),e=>e.code==='privacy_cleanup_stale');assert.equal(second.list('test-gazi','privacy-login-cleanup').length,1);}finally{second.close();}
}));

test('B28 gerçek yerel HTTPS kabulünden kalan istek temizlenir; oturum ve callback tekrar reddi korunur',async()=>{
 let offset=0;const h=await identityHttpFixture({clock:()=>new Date(Date.now()+offset)});h.f.core.clock=()=>new Date(Date.now()+offset).toISOString();try{
  const page=await h.request(P.login),cookie=page.headers['set-cookie'][0].split(';')[0],csrf=page.text.match(/name="csrf" value="([A-Za-z0-9_-]{43})"/)[1],start=await h.request(P.start,{method:'POST',headers:{Cookie:cookie,Origin:h.origin},form:{csrf}}),authorization=await h.request(start.headers.location),id=authorization.text.match(/name="request" value="([a-f0-9]+)"/)[1],consent=await h.request(h.providerOrigin+'/__idp/authorize',{method:'POST',headers:{Origin:h.providerOrigin},form:{request:id,choice:'accept'}}),callback=consent.headers.location,accepted=await h.request(callback,{headers:{Cookie:cookie}});assert.equal(accepted.headers.location,'/#/academic');const sessionCookie=accepted.headers['set-cookie'][0].split(';')[0],used=h.f.s.db.prepare("SELECT * FROM identity_challenges WHERE status='used'").get();
  // Synthetic expiry injection avoids a real five-minute wait; the acceptance
  // and actor audit were created by the real signed HTTPS callback above.
  h.f.s.db.prepare('UPDATE identity_challenges SET expires=? WHERE id=?').run(used.finished+1,used.id);offset=1000;const before=barriers(h.f),x=loginCleanupCase(h.f);assert.equal(clean(h.f,x.preview()).removedRequestRows,1);assert.equal(barriers(h.f),before);assert.equal((await h.request(P.session,{headers:{Cookie:sessionCookie}})).status,200);const replay=await h.request(callback,{headers:{Cookie:cookie}});assert.equal(replay.headers.location,P.login+'?result=failed');assert.equal(replay.headers['set-cookie'],undefined);assert.equal((await h.request(P.session,{headers:{Cookie:sessionCookie}})).json().personId,'student');
 }finally{await h.close();}
});
