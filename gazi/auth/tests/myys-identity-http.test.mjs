import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {identityHttpFixture} from './helpers/local-identity-http.mjs';
import {identityCookie,identityPaths as P} from '../myys/identity-http.mjs';
const use=async fn=>{const h=await identityHttpFixture();try{await fn(h);}finally{await h.close();}};
const setCookie=r=>r.headers['set-cookie']?.[0].split(';')[0];
const csrf=r=>r.text.match(/name="csrf" value="([A-Za-z0-9_-]{43})"/)?.[1];
const headers=(h,c,t)=>({Cookie:c,Origin:h.origin,...(t?{'X-MYYS-CSRF':t}:{})});
async function begin(h){const page=await h.request(P.login),c=setCookie(page),t=csrf(page),start=await h.request(P.start,{method:'POST',headers:headers(h,c),form:{csrf:t}});assert.equal(start.status,303);const authorization=await h.request(start.headers.location,{headers:{Cookie:c}}),id=authorization.text.match(/name="request" value="([a-f0-9]+)"/)?.[1];assert.ok(id);return {c,t,start,id};}
async function response(h,b,choice='accept'){const r=await h.request(h.providerOrigin+'/__idp/authorize',{method:'POST',headers:{Origin:h.providerOrigin},form:{request:b.id,choice}});assert.equal(r.status,303);return r.headers.location;}
async function login(h){const b=await begin(h),callback=await response(h,b),r=await h.request(callback,{headers:{Cookie:b.c}});assert.equal(r.headers.location,'/#/academic');const c=setCookie(r),session=await h.request(P.session,{headers:{Cookie:c}});assert.equal(session.status,200);return {...b,c,preCookie:b.c,callback,session:session.json(),r};}
const grants=h=>h.f.s.db.prepare("SELECT COUNT(*) n FROM identity_scopes WHERE contract_version='local-http-2026.10.13.1'").get().n;
test('B07 HTTPS formu güvenli host çerezi, CSP ve tek kuruma bağlı kısa oturum üretir',()=>use(async h=>{
 const b=await login(h);assert.notEqual(b.c,b.preCookie);assert.equal(h.tokenCalls,1);assert.equal(b.session.personId,'student');assert.equal(b.session.tenant,'test-gazi');assert.equal(grants(h),1);assert.ok(b.r.headers['set-cookie'][0].includes('Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='));assert.ok(!b.r.headers['set-cookie'][0].includes('Domain='));assert.equal(b.r.headers['referrer-policy'],'no-referrer');assert.equal(b.r.headers['cache-control'],'no-store');assert.ok(b.r.headers['content-security-policy'].includes("frame-ancestors 'none'"));assert.ok(!b.r.text.includes(h.lastToken));assert.ok(!JSON.stringify(b.session).includes(h.lastToken));
 assert.equal((await h.request('/api/myys/calisma?kurum=test-gazi',{headers:{Cookie:b.c}})).json().personId,'student');assert.equal((await h.request('/api/myys/calisma?kurum=other',{headers:{Cookie:b.c}})).status,403);
}));
test('B07 başlangıç yalnız POST; Origin ve CSRF eşleşmeden sağlayıcıya gidilmez',()=>use(async h=>{
 const page=await h.request(P.login),c=setCookie(page),t=csrf(page);assert.equal((await h.request(P.start,{headers:{Cookie:c}})).status,405);
 for(const hd of [{Cookie:c},{Cookie:c,Origin:'https://evil.invalid'},{...headers(h,c),'Sec-Fetch-Site':'cross-site'}])assert.equal((await h.request(P.start,{method:'POST',headers:hd,form:{csrf:t}})).status,403);
 for(const val of ['', 'a'.repeat(43)])assert.equal((await h.request(P.start,{method:'POST',headers:headers(h,c),form:{csrf:val}})).status,403);assert.equal(h.tokenCalls,0);assert.equal(h.f.s.db.prepare('SELECT COUNT(*) n FROM identity_challenges').get().n,0);
}));
test('B07 sahte Host/forwarding, yinelenen/bozuk cookie ve açık yönlendirme reddedilir',()=>use(async h=>{
 const page=await h.request(P.login),c=setCookie(page),t=csrf(page);
 for(const hd of [{Host:'evil.invalid'},{'X-Forwarded-Host':'evil.invalid'},{'X-Forwarded-Proto':'https'},{Cookie:c+'; '+c},{Cookie:identityCookie+'=short'}])assert.equal((await h.request(P.login,{headers:hd})).status,403);
 assert.equal((await h.request(P.start,{method:'POST',headers:headers(h,c),form:{csrf:t,returnTo:'https://evil.invalid'}})).status,400);assert.equal((await h.request(P.login+'?returnTo=https://evil.invalid')).status,400);
}));
test('B07 eksik/farklı tarayıcı çerezi doğru callback isteğini kullanamaz',()=>use(async h=>{
 const b=await begin(h),cb=await response(h,b);for(const hd of [{},{Cookie:identityCookie+'='+'a'.repeat(43)}]){const r=await h.request(cb,{headers:hd});assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(r.headers['set-cookie'],undefined);}assert.equal(h.tokenCalls,0);assert.equal(grants(h),0);assert.equal((await h.request(cb,{headers:{Cookie:b.c}})).headers.location,'/#/academic');
}));
test('B07 eksik/yanlış issuer ve yinelenen callback parametreleri sağlayıcıya ulaşmaz',()=>use(async h=>{
 const b=await begin(h),cb=await response(h,b);
 for(const mutate of [u=>u.searchParams.delete('iss'),u=>u.searchParams.set('iss','https://wrong.invalid'),u=>u.searchParams.append('state',u.searchParams.get('state')),u=>u.searchParams.append('code','injected-code'),u=>u.searchParams.set('redirect_uri','https://evil.invalid'),u=>u.searchParams.set('error','access_denied')]){const url=new URL(cb);mutate(url);assert.equal((await h.request(url.href,{headers:{Cookie:b.c}})).headers.location,P.login+'?result=failed');}assert.equal(h.tokenCalls,0);assert.equal((await h.request(cb,{headers:{Cookie:b.c}})).headers.location,'/#/academic');
}));
test('B07 callback tekrarında yeni oturum üretilmez ve mevcut cookie silinmez',()=>use(async h=>{
 const b=await login(h);for(const c of [b.preCookie,b.c]){const r=await h.request(b.callback,{headers:{Cookie:c}});assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(r.headers['set-cookie'],undefined);}assert.equal(h.tokenCalls,1);assert.equal(grants(h),1);assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,200);
}));
test('B07 eşzamanlı HTTP callback kodu yalnız bir kez değiştirir',()=>use(async h=>{
 const b=await begin(h),cb=await response(h,b),rs=await Promise.all([h.request(cb,{headers:{Cookie:b.c}}),h.request(cb,{headers:{Cookie:b.c}})]);assert.equal(rs.filter(r=>r.headers.location==='/#/academic').length,1);assert.equal(h.tokenCalls,1);assert.equal(grants(h),1);
}));
test('B07 sağlayıcı iptali state/issuer bağıyla tüketilir; hata açıklaması yansıtılmaz',()=>use(async h=>{
 const b=await begin(h),cb=new URL(await response(h,b,'deny'));cb.searchParams.set('error_description','SECRET <script>bad</script>');const r=await h.request(cb.href,{headers:{Cookie:b.c}});assert.equal(r.headers.location,P.login+'?result=failed');assert.ok(!r.text.includes('SECRET'));assert.equal(h.tokenCalls,0);assert.equal(h.f.s.db.prepare('SELECT status FROM identity_challenges').get().status,'cancelled');const page=await h.request(r.headers.location,{headers:{Cookie:b.c}});assert.ok(page.text.includes('role="alert"'));assert.ok(!page.text.includes('SECRET'));assert.equal(grants(h),0);
}));
test('B07 sahte sağlayıcı hatası geçerli isteği iptal edemez',()=>use(async h=>{
 const b=await begin(h),cb=await response(h,b),bad=new URL(cb);bad.searchParams.delete('code');bad.searchParams.set('error','access_denied');bad.searchParams.set('state','a'.repeat(43));await h.request(bad.href,{headers:{Cookie:b.c}});assert.equal(h.f.s.db.prepare('SELECT status FROM identity_challenges').get().status,'pending');assert.equal((await h.request(cb,{headers:{Cookie:b.c}})).headers.location,'/#/academic');
}));
test('B07 HTTP token yanıtında MFA/nonce/issuer hatası oturum kurmaz ve tekrar tüketmez',()=>use(async h=>{
 for(const patch of [{amr:['pwd']},{nonce:'forged-nonce'},{iss:'https://wrong.invalid'}]){h.patch=patch;const b=await begin(h),cb=await response(h,b),r=await h.request(cb,{headers:{Cookie:b.c}});assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(r.headers['set-cookie'],undefined);const calls=h.tokenCalls;await h.request(cb,{headers:{Cookie:b.c}});assert.equal(h.tokenCalls,calls);}assert.equal(grants(h),0);
}));
test('B07 HTTP oturumuyla çekirdek değişikliği Origin+CSRF gerektirir; rol istemciden gelmez',()=>use(async h=>{
 const b=await login(h),input={tenant:'test-gazi',commandId:randomUUID(),action:'appeal',input:{decisionId:h.initial.d.id,reason:'Sentetik HTTP girişinden bağımsız inceleme talebi.'}};
 assert.equal((await h.request('/api/myys/islem',{method:'POST',headers:headers(h,b.c),body:input})).status,403);assert.equal((await h.request('/api/myys/islem',{method:'POST',headers:{...headers(h,b.c,b.session.csrf),Origin:'https://evil.invalid'},body:input})).status,403);
 assert.equal((await h.request('/api/myys/islem',{method:'POST',headers:headers(h,b.c,b.session.csrf),body:input})).status,200);assert.equal(h.f.s.list('test-gazi','appeal').length,1);
 const spoof={...input,commandId:randomUUID(),action:'resolve',input:{appealId:h.f.s.list('test-gazi','appeal')[0].id,outcome:'upheld',reason:'Sahte rol yetkisi ile bu talep sonuçlanmamalıdır.',role:'quality'}};assert.equal((await h.request('/api/myys/islem',{method:'POST',headers:headers(h,b.c,b.session.csrf),body:spoof})).status,403);
}));
test('B07 çıkış yalnız POST+CSRF; cookie temizlenir, eski oturum sunucuda kullanılamaz',()=>use(async h=>{
 const b=await login(h);assert.equal((await h.request(P.logout,{headers:headers(h,b.c)})).status,405);assert.equal((await h.request(P.logout,{method:'POST',headers:headers(h,b.c),body:{}})).status,403);assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,200);
 const r=await h.request(P.logout,{method:'POST',headers:headers(h,b.c,b.session.csrf),body:{tenant:'test-gazi'}});assert.equal(r.status,200);assert.ok(r.headers['set-cookie'][0].includes('Max-Age=0'));assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,401);assert.equal((await h.request('/api/myys/calisma?kurum=test-gazi',{headers:{Cookie:b.c}})).status,401);assert.equal(grants(h),0);assert.equal(h.f.s.list('test-gazi','decision').length,1);
}));
test('B07 callback sırasında çıkış bekleyen isteği iptal eder; geç token oturum kuramaz',()=>use(async h=>{
 let reached,release;const reachedPromise=new Promise(r=>reached=r),gate=new Promise(r=>release=r);h.beforeToken=async()=>{reached();await gate;};const b=await begin(h),cb=await response(h,b),pending=h.request(cb,{headers:{Cookie:b.c}});await reachedPromise;
 const out=await h.request(P.logout,{method:'POST',headers:headers(h,b.c),form:{csrf:b.t}});assert.equal(out.status,303);release();const r=await pending;assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(grants(h),0);
}));
test('B07 callback çerezi döndürdükten sonra yoldaki eski çerezli çıkış yeni oturumu iptal eder',()=>use(async h=>{
 const b=await login(h);const r=await h.request(P.logout,{method:'POST',headers:headers(h,b.preCookie),form:{csrf:b.t}});assert.equal(r.status,303);assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,401);assert.equal(grants(h),0);
}));
test('B07 üyelik geri çekilmesi her HTTP okumada yeniden denetlenir',()=>use(async h=>{
 const b=await login(h);h.f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,401);assert.equal((await h.request('/api/myys/calisma?kurum=test-gazi',{headers:{Cookie:b.c}})).status,401);
}));
test('B07 atomik denetim hatasında HTTP callback çerez vermez',()=>use(async h=>{
 h.f.s.db.exec("CREATE TRIGGER fail_http_accept BEFORE INSERT ON audit WHEN NEW.action='identity.accept' BEGIN SELECT RAISE(ABORT,'local test audit'); END;");const b=await begin(h),cb=await response(h,b),r=await h.request(cb,{headers:{Cookie:b.c}});assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(r.headers['set-cookie'],undefined);assert.equal(grants(h),0);assert.equal(h.f.s.db.prepare('SELECT COUNT(*) n FROM identity_session_links').get().n,0);
}));
test('B07 saklanan kayıtlarda token/code/state/verifier/cookie yok; Vercel HTTP kapısı kapalı',()=>use(async h=>{
 const b=await login(h),records=JSON.stringify({requests:h.f.s.db.prepare('SELECT * FROM identity_challenges').all(),sessions:h.f.s.db.prepare('SELECT * FROM identity_scopes').all(),links:h.f.s.db.prepare('SELECT * FROM identity_session_links').all(),audit:h.f.s.db.prepare('SELECT * FROM audit').all()});for(const secret of [h.lastToken,b.c.split('=')[1],new URL(b.callback).searchParams.get('code'),new URL(b.callback).searchParams.get('state')])assert.ok(!records.includes(secret));
 const old=process.env.VERCEL;process.env.VERCEL='1';try{assert.equal((await h.request(P.session,{headers:{Cookie:b.c}})).status,503);}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('B07 sağlayıcı HTTP zaman aşımı tek kullanımlık isteği yeniden açmaz',()=>use(async h=>{
 let release;const gate=new Promise(r=>release=r);h.beforeToken=()=>gate;const b=await begin(h),cb=await response(h,b);
 try{const r=await h.request(cb,{headers:{Cookie:b.c}});assert.equal(r.headers.location,P.login+'?result=failed');assert.equal(grants(h),0);assert.equal(h.f.s.db.prepare('SELECT status FROM identity_challenges').get().status,'failed');await h.request(cb,{headers:{Cookie:b.c}});assert.equal(h.tokenCalls,1);}finally{release();}
}));
test('B07 süresi bitmiş oturum cookie mevcut olsa da akademik kayda erişemez',()=>use(async h=>{
 const b=await login(h);h.f.s.db.prepare("UPDATE bindings SET expires='2020-01-01T00:00:00.000Z' WHERE session_hash IN (SELECT session_hash FROM identity_scopes WHERE contract_version='local-http-2026.10.13.1')").run();
 const r=await h.request('/api/myys/calisma?kurum=test-gazi',{headers:{Cookie:b.c}});assert.equal(r.status,401);assert.equal(r.json().loginPath,P.login);assert.equal(r.json().scope,'local-acceptance');assert.ok(!r.text.includes(h.initial.d.id));
}));
