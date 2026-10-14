import test from 'node:test';
import {curricula,lessonsFor} from '../../portal/src/learning-data.mjs';
const lessonFiles=Object.keys(curricula).flatMap(id=>lessonsFor(id).map(l=>l.id+'-Sunum.html'));
const caseFiles=Object.values(curricula).flatMap(ms=>ms.map(m=>m.id+'-Vaka.csv'));
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {generateSync} from 'otplib';
import handler,{safeNext,getToken,validOrigin} from '../api/gateway.mjs';
process.env.VERCEL_ENV='preview';process.env.GAZI_GATE_STORE_TOKEN='test';process.env.GAZI_GATE_IP_KEY='test-key';process.env.GAZI_TOTP_SECRET='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const original=globalThis.fetch;
let count=0,last=-1,session=null,unavailable=false,expired=false;
globalThis.fetch=async(url,opts)=>{if(unavailable)throw Error();const b=JSON.parse(opts.body);let r;
 if(b.action==='limit')r={allowed:++count<=5};
 if(b.action==='consume'){const good=b.step>last;if(good){last=b.step;session=b.hash;}r={expires:good?new Date(Date.now()+3600000).toISOString():null};}
 if(b.action==='session')r={expires:b.hash===session?new Date(Date.now()+(expired?-1000:3600000)).toISOString():null};
 if(b.action==='logout'){session=null;r={ok:true};}
 return new Response(JSON.stringify(r));};
test.after(()=>{globalThis.fetch=original;});
test('MYYS keeps session and CSRF gates; production-like deployment cannot open local storage',async()=>{
 const token='c'.repeat(64),auth={cookie:'__Host-gazi_demo_session='+token};
 assert.equal((await request('/api/myys/calisma?kurum=gazi')).statusCode,401);
 session=createHash('sha256').update(token).digest('hex');
 try{
  assert.equal((await request('/api/myys/islem','POST',{}, {...auth,origin:'https://evil.test'})).statusCode,403);
  for(const path of ['/api/myys/calisma?kurum=gazi','/api/myys/islem','/api/myys/imzala']){
   const r=await request(path,path.includes('calisma')?'GET':'POST',{},auth);
   assert.equal(r.statusCode,503);assert.equal(JSON.parse(r.data).code,'institution_setup_required');
  }
  assert.equal((await request('/myys/store.mjs','GET',undefined,auth)).statusCode,404);
 }finally{session=null;}
});
async function request(url,method='GET',body,extra={}){const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);Object.assign(req,{url,method,headers:{host:'gazi.unigoturkiye.com',origin:'https://gazi.unigoturkiye.com','content-type':'application/json',...extra}});const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(data){this.data=data?.toString()||'';}};await handler(req,res);return res;}
test('Redirects cannot leave this origin or target auth endpoints',()=>{for(const s of ['//evil.test','https://evil.test','/../a','/a\\b','/api/erisim/giris','/giris','/\r\nX:test'])assert.equal(safeNext(s),'/');assert.equal(safeNext('/kurumsal-demo.html#/rozetler'),'/kurumsal-demo.html#/rozetler');});
test('Cookie parser rejects malformed and duplicate tokens',()=>{assert.equal(getToken('__Host-gazi_demo_session=x'),null);const s='f'.repeat(64);assert.equal(getToken('__Host-gazi_demo_session='+s),s);assert.equal(getToken('__Host-gazi_demo_session='+s+';__Host-gazi_demo_session='+s),null);});
test('Login and the logos are available; every app entry and asset requires a session',async()=>{assert.equal((await request('/giris')).statusCode,200);for(const p of ['/','/index.html','/pilot.html','/legacy.html','/kurumsal-demo.html','/portal.js','/private/index.html','/data/reference.json','/content/wai-intro.tr.vtt','/content/P01-L01-Sunum.html','/content/P01-M01-Vaka.csv',...lessonFiles.map(f=>'/content/'+f),...caseFiles.map(f=>'/content/'+f)]){const r=await request(p);assert.equal(r.statusCode,303,p);assert.match(r.headers.Location,/^\/giris/);assert.match(r.headers['Cache-Control'],/no-store/);}assert.equal((await request('/api/erisim/oturum')).statusCode,401);});
test('CSRF, foreign Host and unsupported methods are rejected',async()=>{assert.equal((await request('/api/erisim/giris','POST',{code:'123456'},{origin:'https://evil.test'})).statusCode,403);assert.equal(validOrigin({headers:{host:'evil.test',origin:'https://evil.test'}}),false);assert.equal((await request('/api/erisim/giris')).statusCode,405);});
test('Valid TOTP opens app; reused token fails; logout revokes the cookie server side',async()=>{count=0;const code=generateSync({secret:process.env.GAZI_TOTP_SECRET});const r=await request('/api/erisim/giris','POST',{code});assert.equal(r.statusCode,200,r.data);const cookie=r.headers['Set-Cookie'];assert.match(cookie,/HttpOnly; SameSite=Strict; Max-Age=3600/);const auth={cookie:cookie.split(';')[0]};assert.equal((await request('/','GET',undefined,auth)).statusCode,200);assert.equal((await request('/portal.js','GET',undefined,auth)).statusCode,200);const captions=await request('/content/wai-intro.tr.vtt','GET',undefined,auth);assert.equal(captions.statusCode,200);assert.equal(captions.headers['Content-Type'],'text/vtt; charset=utf-8');assert.match(captions.data,/^WEBVTT/);for(const f of [...lessonFiles,...caseFiles]){const d=await request('/content/'+f,'GET',undefined,auth);assert.equal(d.statusCode,200);assert.match(d.headers['Content-Disposition'],/^attachment;/);assert.ok(d.data.length>100);}assert.equal((await request('/private/manifest.json','GET',undefined,auth)).statusCode,404);assert.equal((await request('/api/erisim/giris','POST',{code})).statusCode,401);assert.equal((await request('/api/erisim/cikis','POST',{},auth)).statusCode,200);assert.equal((await request('/','GET',undefined,auth)).statusCode,303);});
test('Old TOTP is rejected and rate limits apply to wrong codes',async()=>{count=0;const old=generateSync({secret:process.env.GAZI_TOTP_SECRET,epoch:Math.floor(Date.now()/1000)-120});assert.equal((await request('/api/erisim/giris','POST',{code:old})).statusCode,401);for(let i=0;i<4;i++)assert.equal((await request('/api/erisim/giris','POST',{code:'wrong'})).statusCode,401);assert.equal((await request('/api/erisim/giris','POST',{code:'wrong'})).statusCode,429);});
test('Store outage never opens protected content',async()=>{unavailable=true;const r=await request('/','GET',undefined,{cookie:'__Host-gazi_demo_session='+'a'.repeat(64)});assert.equal(r.statusCode,503);unavailable=false;});
test('An expired stored session cannot reopen the app',async()=>{session=createHash('sha256').update('e'.repeat(64)).digest('hex');expired=true;const r=await request('/','GET',undefined,{cookie:'__Host-gazi_demo_session='+'e'.repeat(64)});assert.equal(r.statusCode,303);assert.match(r.headers['Set-Cookie'],/Max-Age=0/);expired=false;session=null;});
