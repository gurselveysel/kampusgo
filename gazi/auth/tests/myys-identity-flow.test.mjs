import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {generateKeyPair, exportJWK, SignJWT} from 'jose';
import {LocalIdentityFlow, pkceS256} from '../myys/identity-flow.mjs';
import {LocalAcceptanceStore, hash} from '../myys/store.mjs';
import {use} from './helpers/myys-fixture.mjs';

const pair=await generateKeyPair('ES256'), jwk={...await exportJWK(pair.publicKey),alg:'ES256',kid:'flow-test'};
const base=Date.parse('2026-10-10T20:30:00Z'), redirectUri='http://127.0.0.1:43117/oidc/callback';
const config=()=>({version:'local-2026.10.10.2',tenant:'test-gazi',issuer:'https://test-idp.invalid',audience:'myys-test-client',algorithms:['ES256'],jwks:{keys:[jwk]},mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}],maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0});
const match=code=>e=>e.code===code;
function harness(f,options={}) {
 const key=randomBytes(32),codes=new Map();let current=base,sequence=0;
 const h={calls:0,patch:{},hook:async()=>{},lastToken:null,lastVerifier:null,advance(ms){current+=ms;},now:()=>new Date(current)};
 const exchangeCode=async({code,codeVerifier,redirectUri:uri,signal})=>{
  h.calls++;const item=codes.get(code);
  assert.ok(item&&!item.used,'synthetic code is single-use');item.used=true;
  assert.equal(pkceS256(codeVerifier),item.request.code_challenge);assert.equal(uri,redirectUri);
  h.lastVerifier=codeVerifier;
  await h.hook(signal);
  const at=Math.floor(current/1000);
  h.lastToken=await new SignJWT({iss:'https://test-idp.invalid',sub:'student',aud:'myys-test-client',iat:at,exp:at+300,auth_time:at,nonce:item.request.nonce,acr:'urn:test:strong',amr:['pwd','otp'],...h.patch}).setProtectedHeader({alg:'ES256',kid:'flow-test',typ:'JWT'}).sign(pair.privateKey);
  return h.lastToken;
 };
 h.make=(store=f.s,override={})=>new LocalIdentityFlow({store,identityConfig:config(),derivationKey:key,redirectUri,exchangeCode,clock:h.now,...options,...override});
 h.flow=h.make();
 h.request=(flow=h.flow,browserSessionHash=hash('synthetic-prelogin'))=>{
  const request=flow.begin({browserSessionHash}),code='synthetic-authorization-'+(++sequence);
  codes.set(code,{request,used:false});
  return {request,input:{state:request.state,code,browserSessionHash,issuer:'https://test-idp.invalid',redirectUri}};
 };
 f.core.clock=()=>h.now().toISOString();
 return h;
}
const sessions=f=>f.s.db.prepare('SELECT count(*) AS n FROM identity_scopes').get().n;

test('B07 PKCE S256 RFC 7636 test vektörüyle eşleşir',()=>{
 assert.equal(pkceS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
 assert.throws(()=>pkceS256('short'),match('identity_pkce'));
});
test('B07 istek bağları kalıcıdır; açık durum verisinde nonce/verifier/ham state yoktur',()=>use(f=>{
 const h=harness(f),a=h.request();
 assert.equal(a.request.code_challenge_method,'S256');assert.equal(a.request.scope,'openid');assert.ok(!('codeVerifier' in a.request));
 const rows=f.s.db.prepare('SELECT * FROM identity_challenges').all();assert.equal(rows.length,1);assert.equal(rows[0].state_hash,hash(a.request.state));
 assert.ok(!JSON.stringify(rows).includes(a.request.nonce));assert.ok(!JSON.stringify(rows).includes(a.request.state));
}));
test('B06/B07 tek kullanımlık giriş gerçek yerel çekirdeğe kurum kapsamlı oturum bağlar',()=>use(async f=>{
 const h=harness(f),a=h.request(),result=await h.flow.complete(a.input);
 assert.equal(result.personId,'student');assert.equal(sessions(f),1);
 const view=f.core.view({sessionHash:hash(result.sessionToken),tenant:'test-gazi'});assert.ok(view);
 assert.equal(f.s.principal(hash(result.sessionToken),'test-gazi',h.now().toISOString()).id,'student');
 assert.throws(()=>f.s.principal(a.input.browserSessionHash,'test-gazi',h.now().toISOString()),match('identity_required'));
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));assert.equal(h.calls,1);
}));
for(const [name,change] of [
 ['başka tarayıcı',i=>({...i,browserSessionHash:hash('other-browser')})],
 ['yanlış state',i=>({...i,state:'a'.repeat(43)})],
 ['başka issuer',i=>({...i,issuer:'https://other.invalid'})],
 ['değişmiş dönüş adresi',i=>({...i,redirectUri:redirectUri+'/'})],
]) test(`B07 ${name} provider çağrısından önce reddedilir`,()=>use(async f=>{
 const h=harness(f),a=h.request();await assert.rejects(()=>h.flow.complete(change(a.input)));assert.equal(h.calls,0);assert.equal(sessions(f),0);
 await h.flow.complete(a.input);assert.equal(sessions(f),1);
}));
test('B07 farklı kurum veya sözleşme aynı kalıcı isteği kullanamaz',()=>use(async f=>{
 const h=harness(f),a=h.request();
 for(const patch of [{tenant:'other-tenant'},{version:'next-version'}]){
  const foreign=h.make(f.s,{identityConfig:{...config(),...patch}});await assert.rejects(()=>foreign.complete(a.input),match('identity_challenge'));
 }
 assert.equal(h.calls,0);await h.flow.complete(a.input);
}));
test('B07 süresi tam dolan istek provider çağrısından önce reddedilir',()=>use(async f=>{
 const h=harness(f,{requestLifetimeSeconds:10}),a=h.request();h.advance(10000);
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));assert.equal(h.calls,0);
}));
test('B07 iki depo bağlantısı aynı isteği eşzamanlı tamamlayamaz',()=>use(async f=>{
 const h=harness(f),a=h.request(),second=new LocalAcceptanceStore(f.path),other=h.make(second);
 let release,entered;const inside=new Promise(r=>{entered=r;});h.hook=()=>new Promise(r=>{release=r;entered();});
 try {
  const first=h.flow.complete(a.input);await inside;
  await assert.rejects(()=>other.complete(a.input),match('identity_challenge'));assert.equal(h.calls,1);
  release();await first;assert.equal(sessions(f),1);assert.equal(second.db.prepare("SELECT count(*) AS n FROM identity_challenges WHERE status='used'").get().n,1);
 } finally {second.close();}
}));
test('B07 yeniden açılan depoda bekleyen istek ve türetilen PKCE korunur',()=>use(async f=>{
 const h=harness(f),a=h.request(),second=new LocalAcceptanceStore(f.path);
 try {const result=await h.make(second).complete(a.input);assert.equal(result.personId,'student');assert.equal(sessions(f),1);}finally{second.close();}
}));
test('B07 yanlış türetme anahtarı kimlik açmaz ve aynı isteği tekrar denetmez',()=>use(async f=>{
 const h=harness(f),a=h.request(),wrong=h.make(f.s,{derivationKey:randomBytes(32)});
 await assert.rejects(()=>wrong.complete(a.input),match('identity_callback'));assert.equal(sessions(f),0);
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));assert.equal(h.calls,1);
}));
for(const [name,patch] of [['yanlış nonce',{nonce:'a'.repeat(43)}],['MFA yok',{amr:['pwd']}],['başka kişi',{sub:'not-provisioned'}]])
 test(`B07 ${name} oturum yaratmaz; tüketilen istek tekrar kullanılamaz`,()=>use(async f=>{
  const h=harness(f),a=h.request();h.patch=patch;
  await assert.rejects(()=>h.flow.complete(a.input),match('identity_callback'));assert.equal(sessions(f),0);
  assert.equal(f.s.db.prepare('SELECT status FROM identity_challenges').get().status,'failed');
  h.patch={};await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));assert.equal(h.calls,1);
 }));
test('B06 provider yanıtı sırasında ayrılan kişi atomik oturum aşamasında reddedilir',()=>use(async f=>{
 const h=harness(f),a=h.request();h.hook=async()=>{f.s.db.prepare("UPDATE persons SET active=0 WHERE id='student'").run();};
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_callback'));assert.equal(sessions(f),0);
}));
test('B07 provider beklerken süresi dolan istek oturum açamaz',()=>use(async f=>{
 const h=harness(f,{requestLifetimeSeconds:10}),a=h.request();h.hook=async()=>h.advance(10000);
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_callback'));assert.equal(sessions(f),0);
}));
test('B07 yeniden başlatılan giriş eski bekleyen/işlenen isteği iptal eder',()=>use(async f=>{
 const h=harness(f),a=h.request(),b=h.request();await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));
 let replacement;h.hook=async()=>{replacement=h.request();};
 await assert.rejects(()=>h.flow.complete(b.input),match('identity_callback'));assert.equal(sessions(f),0);
 h.hook=async()=>{};await h.flow.complete(replacement.input);assert.equal(sessions(f),1);
}));
test('B07 oturum kimliği döner; eski oturum sabitlemesi ve başka tenant erişimi reddedilir',()=>use(async f=>{
 const h=harness(f),a=h.request(h.flow,hash('student')),result=await h.flow.complete(a.input);
 assert.notEqual(hash(result.sessionToken),hash('student'));assert.throws(()=>f.s.principal(hash('student'),'test-gazi',h.now().toISOString()),match('identity_required'));
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','student','engineering','["learner"]','2099-01-01T00:00:00.000Z');
 assert.throws(()=>f.s.principal(hash(result.sessionToken),'other-tenant',h.now().toISOString()),match('identity_tenant'));
}));
test('B06 giriş sonrasında üyelik iptali sonraki gerçek çekirdek okumasını engeller',()=>use(async f=>{
 const h=harness(f),a=h.request(),result=await h.flow.complete(a.input);
 f.s.db.prepare("UPDATE memberships SET active=0 WHERE person='student'").run();
 assert.throws(()=>f.core.view({sessionHash:hash(result.sessionToken),tenant:'test-gazi'}),match('membership_required'));
}));
test('B07 çıkış oturumu ve başlamış yeni giriş isteğini iptal eder; tekrar çıkış zararsızdır',()=>use(async f=>{
 const h=harness(f),a=h.request(),result=await h.flow.complete(a.input),sessionHash=hash(result.sessionToken),next=h.request(h.flow,sessionHash);
 assert.deepEqual(h.flow.logout({sessionHash}),{revoked:true,cancelledRequests:1});assert.equal(sessions(f),0);
 assert.throws(()=>f.core.view({sessionHash,tenant:'test-gazi'}),match('identity_required'));
 await assert.rejects(()=>h.flow.complete(next.input),match('identity_challenge'));
 assert.deepEqual(h.flow.logout({sessionHash}),{revoked:false,cancelledRequests:0});
}));
test('B07 kurumlar arası çıkış başka kurum oturumunu silemez',()=>use(async f=>{
 const h=harness(f),result=await h.flow.complete(h.request().input),other=h.make(f.s,{identityConfig:{...config(),tenant:'other'}});
 assert.throws(()=>other.logout({sessionHash:hash(result.sessionToken)}),match('identity_tenant'));assert.equal(sessions(f),1);
}));
test('B07 oturum süresi MFA tazeliğini aşamaz',()=>use(async f=>{
 const h=harness(f);h.patch={auth_time:base/1000-895};const result=await h.flow.complete(h.request().input);
 assert.equal(Date.parse(result.expires),base+5000);h.advance(5000);
 assert.throws(()=>f.core.view({sessionHash:hash(result.sessionToken),tenant:'test-gazi'}),match('identity_required'));
}));
test('B07 sağlayıcı zaman aşımı yeni oturum oluşturmaz ve abort edilir',()=>use(async f=>{
 const h=harness(f,{exchangeTimeoutMs:10}),a=h.request();let signal;
 h.hook=s=>{signal=s;return new Promise(()=>{});};
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_callback'));assert.equal(signal.aborted,true);assert.equal(sessions(f),0);
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_challenge'));
}));
test('B07 denetim yazısı başarısızsa istek tüketimi ve oturum birlikte geri alınır',()=>use(async f=>{
 const h=harness(f),a=h.request();
 f.s.db.exec("CREATE TRIGGER reject_identity_audit BEFORE INSERT ON audit WHEN NEW.action='identity.accept' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END;");
 await assert.rejects(()=>h.flow.complete(a.input),match('identity_callback'));assert.equal(sessions(f),0);
 assert.equal(f.s.db.prepare('SELECT status FROM identity_challenges').get().status,'failed');
 assert.equal(f.s.db.prepare("SELECT count(*) AS n FROM audit WHERE action='identity.accept'").get().n,0);
}));
test('B07 denetim ve depo ham token, nonce, kod, verifier veya oturum anahtarı içermez',()=>use(async f=>{
 const h=harness(f),a=h.request(),result=await h.flow.complete(a.input);
 const saved=JSON.stringify(['audit','identity_challenges','identity_scopes','bindings'].map(t=>f.s.db.prepare('SELECT * FROM '+t).all()));
 for(const value of [a.request.state,a.request.nonce,a.input.code,h.lastToken,h.lastVerifier,result.sessionToken]) assert.ok(!saved.includes(value));
 assert.equal(f.s.db.prepare("SELECT count(*) AS n FROM audit WHERE action='identity.accept'").get().n,1);
}));
test('B07 yerel akış Vercel ortamında ve dış dönüş adresiyle açılamaz',()=>use(f=>{
 const h=harness(f);assert.throws(()=>h.make(f.s,{redirectUri:'https://gazi.unigoturkiye.com/callback'}),match('local_only'));
 const previous=process.env.VERCEL;
 try{process.env.VERCEL='1';assert.throws(()=>h.make(),match('local_only'));assert.throws(()=>h.request(),match('local_only'));}
 finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
}));
