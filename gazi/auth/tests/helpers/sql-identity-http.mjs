// Disposable TLS app + different-site synthetic IdP + SQL. No academic store or production routes.
import https from 'node:https';
import {randomBytes,createHash,X509Certificate} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {sqlIdentityFlow} from './sql-identity-flow.mjs';
import {httpsRequest} from './local-identity-http.mjs';
import {LocalPostgresIdentityHttp,identityPaths} from '../../myys/identity-sql-http.mjs';
import {PostgresIdentityTransactions} from '../../myys/identity-transactions.mjs';
import {requireThat,hash} from '../../myys/store.mjs';
import {pkceS256} from '../../myys/identity-flow.mjs';
export async function sqlIdentityHttpFixture({clock=()=>new Date(),limits,exchangeTimeoutMs=1000,httpRequestLifetimeSeconds=30}={}){
 if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Isolated SQL acceptance only');
 const dir=mkdtempSync(join(tmpdir(),'myys-sql-https-'));let cert,key;
 try{const result=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-noenc','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-sha256','-days','1','-subj','/CN=MYYS synthetic SQL loopback','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});if(result.status!==0)throw Error('Test certificate unavailable');key=readFileSync(join(dir,'key.pem'));cert=readFileSync(join(dir,'cert.pem'));}finally{rmSync(dir,{recursive:true,force:true});}
 let origin,providerOrigin,identity,f;const closers=[],pending=new Map(),codes=new Map(),h={cert,spki:createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64'),tokenCalls:0,beforeToken:async()=>{},patch:{}};
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 async function form(req){let raw='';for await(const c of req){raw+=c;requireThat(Buffer.byteLength(raw)<=24576,'test_size','Test isteği büyük.',413);}return new URLSearchParams(raw);}
 const providerHandler=async(req,res)=>{try{
  const u=new URL(req.url,providerOrigin);
  if(u.pathname==='/__idp/authorize'&&req.method==='GET'){
   const p=u.searchParams;requireThat(p.get('client_id')===f.config.audience&&p.get('redirect_uri')===origin+identityPaths.callback&&p.get('response_type')==='code'&&p.get('scope')==='openid'&&p.get('code_challenge_method')==='S256'&&['state','nonce','code_challenge'].every(k=>/^[A-Za-z0-9_-]{43}$/.test(p.get(k))),'test_provider','Test isteği geçersiz.',400);
   const request=randomBytes(24).toString('hex');pending.set(request,Object.fromEntries(p));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','Content-Security-Policy':`default-src 'none'; form-action 'self' ${origin}; frame-ancestors 'none'; base-uri 'none'`});res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentetik kimlik sağlayıcısı</title><h1>Sentetik kimlik sağlayıcısı</h1><p>Gerçek hesap, parola veya doğrulama kodu kullanılmaz.</p><form method="post"><input type="hidden" name="request" value="${request}"><button name="choice" value="accept">Sentetik öğrenenle devam et</button><button name="choice" value="deny">Sentetik girişi iptal et</button></form></html>`);return;
  }
  if(u.pathname==='/__idp/authorize'&&req.method==='POST'){
   requireThat(req.headers.origin===providerOrigin,'test_origin','Test kaynağı geçersiz.',403);const p=await form(req),r=pending.get(p.get('request'));requireThat(r&&['accept','deny'].includes(p.get('choice')),'test_request','Test isteği yok.',403);pending.delete(p.get('request'));const callback=new URL(origin+identityPaths.callback);callback.searchParams.set('state',r.state);callback.searchParams.set('iss',f.config.issuer);if(p.get('choice')==='deny')callback.searchParams.set('error','access_denied');else{const code=randomBytes(24).toString('hex');codes.set(code,r);callback.searchParams.set('code',code);}res.writeHead(303,{Location:callback.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
  }
  if(u.pathname==='/__idp/token'&&req.method==='POST'){
   const p=await form(req),r=codes.get(p.get('code'));h.tokenCalls++;requireThat(f.sql.active===0&&r&&p.get('client_id')===f.config.audience&&p.get('redirect_uri')===origin+identityPaths.callback&&p.get('grant_type')==='authorization_code'&&pkceS256(p.get('code_verifier'))===r.code_challenge,'test_code','Test kodu geçersiz.',403);codes.delete(p.get('code'));await h.beforeToken();send(res,200,{id_token:await f.sign(h.patch,r.nonce)});return;
  }
  if(u.pathname==='/__idp/logout'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'"});res.end('<!doctype html><html lang="tr"><meta charset="utf-8"><h1>Sentetik sağlayıcı çıkışı</h1><form method="post"><button>Sentetik sağlayıcıdan çık</button></form></html>');return;}
  if(u.pathname==='/__idp/logout'&&req.method==='POST'){requireThat(req.headers.origin===providerOrigin,'test_origin','Test kaynağı geçersiz.',403);const r=await httpsRequest(origin,cert,identityPaths.backchannel,{method:'POST',form:{logout_token:await f.logoutToken()}});requireThat(r.status===200,'test_logout','Test çıkışı reddedildi.',503);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><html lang="tr"><meta charset="utf-8"><h1>Sentetik oturumlar kapatıldı</h1>');return;}
  send(res,404,{error:'Test yolu yok.'});
 }catch(e){send(res,e.status||500,{error:'Sentetik sağlayıcı isteği tamamlanamadı.'});}};
 const appHandler=async(req,res)=>{try{if(!identity)return send(res,503,{error:'Test hazırlanıyor.'});if(await identity.handle(req,res))return;const assets={'/assets/gazi-logo.svg':['image/svg+xml','gazi-logo.svg'],'/assets/unigo-logo-tr.png':['image/png','unigo-logo-tr.png']},asset=assets[req.url];if(asset&&req.method==='GET'){res.writeHead(200,{'Content-Type':asset[0]});res.end(await readFile(new URL('../../../assets/'+asset[1],import.meta.url)));return;}send(res,404,{error:'Bu deneme yalnız kurum girişi içindir.'});}catch{send(res,503,{error:'Deneme isteği işlenemedi.'});}};
 const server=https.createServer({key,cert,requestTimeout:10000},appHandler),providerServer=https.createServer({key,cert,requestTimeout:10000},providerHandler);
 h.close=async()=>{server.closeAllConnections();providerServer.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>providerServer.close(r))]);for(const close of closers)await close();};
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='https://127.0.0.1:'+server.address().port;await new Promise(r=>providerServer.listen(0,'127.0.0.1',r));providerOrigin='https://localhost:'+providerServer.address().port;
  f=await sqlIdentityFlow({after:fn=>closers.push(fn)},{clock,configPatch:{issuer:'https://test-idp.invalid'},redirectUri:origin+identityPaths.callback});await f.sql.db.exec(await readFile(new URL('../../myys/identity-http-schema.sql',import.meta.url),'utf8'));
  const make=(csrfKey,csrfKeyRevision=1)=>new LocalPostgresIdentityHttp({transactions:new PostgresIdentityTransactions({pool:f.sql.pool,tenant:f.config.tenant,issuer:f.config.issuer,audience:f.config.audience}),identityConfig:f.config,keyDriver:f.driver,origin,authorizationEndpoint:providerOrigin+'/__idp/authorize',csrfKey,csrfKeyRevision,clock:f.clock,limits,exchangeTimeoutMs,httpRequestLifetimeSeconds,exchangeCode:async({code,codeVerifier,redirectUri,signal})=>{const r=await httpsRequest(providerOrigin,cert,'/__idp/token',{method:'POST',form:{grant_type:'authorization_code',client_id:f.config.audience,code,code_verifier:codeVerifier,redirect_uri:redirectUri},signal});requireThat(r.status===200,'test_exchange','Test sağlayıcı yanıtı reddedildi.',403);return r.json().id_token;}});
  h.keys=[randomBytes(32),randomBytes(32),randomBytes(32)];identity=make(h.keys[0]);await identity.activateHttpKey({...f.control,expectedRevision:0});
  Object.assign(h,{f,origin,providerOrigin,identity,make,select:value=>{identity=value;h.identity=value;}});h.rotate=async(revision=2)=>{const next=make(h.keys[revision-1],revision);await next.activateHttpKey({...f.control,expectedRevision:revision-1});h.select(next);return next;};
  h.request=(path,options)=>{const u=new URL(path,origin);return httpsRequest(u.origin===providerOrigin?providerOrigin:origin,cert,u.href,options);};
  h.start=async()=>{const page=await h.request(identityPaths.login),cookie=page.headers['set-cookie'][0].split(';')[0],csrf=page.text.match(/name="csrf" value="([^"]+)"/)[1],start=await h.request(identityPaths.start,{method:'POST',headers:{cookie,origin},form:{csrf}});return {cookie,csrf,start};};
  h.callback=async(start,choice='accept')=>{const page=await h.request(start.headers.location),request=page.text.match(/name="request" value="([^"]+)"/)[1];return h.request(providerOrigin+'/__idp/authorize',{method:'POST',headers:{origin:providerOrigin},form:{request,choice}});};
  h.login=async()=>{const a=await h.start(),b=await h.callback(a.start),r=await h.request(b.headers.location,{headers:{cookie:a.cookie}});return {...a,callback:b,response:r,cookie:r.headers['set-cookie']?.[0].split(';')[0]};};return h;
 }catch(e){await h.close();throw e;}
}
