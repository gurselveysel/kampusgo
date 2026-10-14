import {activateLocalDerivationKey,blockLocalDerivationKey} from '../../myys/identity-derivation-epoch.mjs';
// Disposable synthetic HTTPS provider and app. Never included in deployment files.
import https from 'node:https';
import {checkServerIdentity} from 'node:tls';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash,X509Certificate} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {fixture} from './myys-fixture.mjs';
import {LocalIdentityHttp,identityPaths,localIdentityFailure} from '../../myys/identity-http.mjs';
import {pkceS256} from '../../myys/identity-flow.mjs';
import {logoutEvent} from '../../myys/identity-contract.mjs';
import {myysRoute} from '../../myys/http.mjs';
import {requireThat,CoreError} from '../../myys/store.mjs';
export function httpsRequest(origin,cert,path,{method='GET',headers={},form,body,signal}={}){
 const target=new URL(path,origin);if(target.origin!==origin)throw Error('Synthetic request must stay on configured loopback origin');
 const raw=form?new URLSearchParams(form).toString():body===undefined?null:JSON.stringify(body);
 return new Promise((resolve,reject)=>{
  const req=https.request(target,{method,ca:cert,checkServerIdentity:(_,certificate)=>checkServerIdentity(target.hostname,certificate),signal,headers:{...headers,...(raw!==null?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json','Content-Length':Buffer.byteLength(raw)}:{})}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text:data,json:()=>JSON.parse(data)}));});req.on('error',reject);req.end(raw);
 });
}
export async function identityHttpFixture({tenant='test-gazi',sessionLifetimeSeconds=300,exchangeTimeoutMs=1000,clock=()=>new Date()}={}){
 if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Local acceptance only');
 const f=fixture(tenant),initial=f.passed(),dir=mkdtempSync(join(tmpdir(),'myys-https-'));
 const result=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-noenc','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-sha256','-days','1','-subj','/CN=MYYS synthetic loopback','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'],{stdio:'ignore'});
 if(result.status!==0){f.close();rmSync(dir,{recursive:true,force:true});throw Error('Synthetic certificate creation failed');}
 const key=readFileSync(join(dir,'key.pem')),cert=readFileSync(join(dir,'cert.pem'));rmSync(dir,{recursive:true,force:true});
 const pair=await generateKeyPair('ES256'),jwk={...await exportJWK(pair.publicKey),alg:'ES256',kid:'https-local-identity'},pending=new Map(),codes=new Map();
 let origin,providerOrigin,identity;
 const h={f,initial,cert,spki:createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64'),tokenCalls:0,patch:{},beforeToken:async()=>{},lastToken:null};
 h.logoutToken=async(patch={})=>{const at=Math.floor(clock().getTime()/1000);return new SignJWT({iss:'https://test-idp.invalid',aud:'myys-http-test',iat:at,exp:at+120,jti:randomBytes(24).toString('hex'),events:{[logoutEvent]:{}},sub:'student',...patch}).setProtectedHeader({alg:'ES256',kid:jwk.kid,typ:'logout+jwt'}).sign(pair.privateKey);};
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function form(req){let s='';for await(const c of req){s+=c;requireThat(s.length<=64000,'size','Test isteği çok büyük.',413);}return new URLSearchParams(s);}
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const handler=async(req,res)=>{
  try{
   const url=new URL(req.url,origin),provider=req.headers.host===new URL(providerOrigin).host;
   if(url.pathname.startsWith('/__idp/')&&!provider||provider&&!url.pathname.startsWith('/__idp/'))return send(res,404,{error:'Sentetik servis yolu yok.'});
   if(url.pathname==='/__idp/logout'&&req.method==='GET'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end('<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentetik sağlayıcı çıkışı</title><h1>Sentetik sağlayıcı çıkışı</h1><p>Yalnız yerel kabul: sentetik öğrenenin uygulama oturumları kapatılır. Akademik kayıtları korunur.</p><form method="post"><button>Sentetik sağlayıcıdan çık</button></form></html>');return;
   }
   if(url.pathname==='/__idp/logout'&&req.method==='POST'){
    requireThat(req.headers.origin===providerOrigin,'test_provider','Sentetik sağlayıcı kaynağı geçersiz.',403);await form(req);const logout_token=await h.logoutToken();const reply=await httpsRequest(origin,cert,identityPaths.backchannel,{method:'POST',form:{logout_token}});requireThat(reply.status===200,'test_provider','Yerel uygulama iptali doğrulayamadı.',503);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});res.end('<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentetik oturumlar kapatıldı</title><h1>Sentetik oturumlar kapatıldı</h1><p>Uygulamanın bir sonraki isteği yeniden giriş gerektirir.</p></html>');return;
   }
   if(url.pathname==='/__idp/authorize'&&req.method==='GET'){
    const p=url.searchParams;requireThat(p.get('client_id')==='myys-http-test'&&p.get('redirect_uri')===origin+identityPaths.callback&&p.get('scope')==='openid'&&p.get('response_type')==='code'&&p.get('code_challenge_method')==='S256'&&['nonce','state','code_challenge'].every(k=>/^[A-Za-z0-9_-]{43}$/.test(p.get(k))),'test_provider','Sentetik sağlayıcı isteği geçersiz.',400);
    const id=randomBytes(24).toString('hex');pending.set(id,Object.fromEntries(p));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','Content-Security-Policy':`default-src 'none'; form-action 'self' ${origin}; frame-ancestors 'none'; base-uri 'none'`});res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sentetik kimlik sağlayıcısı</title><h1>Sentetik kimlik sağlayıcısı</h1><p>Gerçek hesap, parola veya doğrulama kodu kullanılmaz.</p><form method="post"><input type="hidden" name="request" value="${id}"><button name="choice" value="accept">Sentetik öğrenenle devam et</button><button name="choice" value="deny">Sentetik girişi iptal et</button></form></html>`);return;
   }
   if(url.pathname==='/__idp/authorize'&&req.method==='POST'){
    requireThat(req.headers.origin===providerOrigin,'test_provider','Sentetik sağlayıcı kaynağı geçersiz.',403);const p=await form(req),request=pending.get(p.get('request'));requireThat(request&&['accept','deny'].includes(p.get('choice')),'test_provider','Sentetik istek bulunamadı.',403);pending.delete(p.get('request'));
    const callback=new URL(origin+identityPaths.callback);callback.searchParams.set('state',request.state);callback.searchParams.set('iss','https://test-idp.invalid');if(p.get('choice')==='deny')callback.searchParams.set('error','access_denied');else{const code=randomBytes(32).toString('hex');codes.set(code,request);callback.searchParams.set('code',code);}res.writeHead(303,{Location:callback.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
   }
   if(url.pathname==='/__idp/token'&&req.method==='POST'){
    const p=await form(req),r=codes.get(p.get('code'));h.tokenCalls++;requireThat(r&&p.get('grant_type')==='authorization_code'&&p.get('client_id')==='myys-http-test'&&p.get('redirect_uri')===origin+identityPaths.callback&&pkceS256(p.get('code_verifier'))===r.code_challenge,'test_provider','Sentetik kod doğrulanamadı.',403);codes.delete(p.get('code'));await h.beforeToken();
    const at=Math.floor(clock().getTime()/1000);h.lastToken=await new SignJWT({iss:'https://test-idp.invalid',sub:'student',sid:randomBytes(24).toString('hex'),aud:'myys-http-test',iat:at,exp:at+300,auth_time:at,nonce:r.nonce,acr:'urn:test:strong',amr:['pwd','otp'],...h.patch}).setProtectedHeader({alg:'ES256',kid:jwk.kid,typ:'JWT'}).sign(pair.privateKey);send(res,200,{id_token:h.lastToken});return;
   }
   if(await identity.handle(req,res))return;
   if(url.pathname.startsWith('/api/myys/')){
    const auth=identity.authorizeRequest(req,{mutation:req.method!=='GET'});let raw='';for await(const c of req){raw+=c;requireThat(raw.length<=64000,'size','İstek çok büyük.',413);}const b=raw?JSON.parse(raw):undefined;
    return await myysRoute({req,path:url.pathname,b,sessionHash:auth.sessionHash,res,core:f.core,json:(res,status,data)=>send(res,status,url.pathname==='/api/myys/calisma'&&status===200?{...data,identitySession:identity.sessionInfo(req)}:data)});
   }
   if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Yöntem yok.'});
   const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname)),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv','.vtt':'text/vtt'};
   requireThat(path.startsWith(root)&&types[extname(path)]&&!path.includes('/auth/')&&!path.includes('/portal/'),'not_found','Dosya yok.',404);res.writeHead(200,{'Content-Type':types[extname(path)]});res.end(req.method==='HEAD'?undefined:readFileSync(path));
  }catch(e){if(e instanceof CoreError)send(res,e.status,localIdentityFailure(e));else send(res,500,{error:'Sentetik test sunucusu isteği tamamlanamadı.'});}
 };
 const server=https.createServer({key,cert},handler),providerServer=https.createServer({key,cert},handler);
 await new Promise(resolve=>providerServer.listen(0,'127.0.0.1',resolve));providerOrigin='https://localhost:'+providerServer.address().port;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='https://127.0.0.1:'+server.address().port;
 const config={version:'local-http-2026.10.13.1',tenant,issuer:'https://test-idp.invalid',audience:'myys-http-test',algorithms:['ES256'],jwks:{keys:[jwk]},mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}],maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0};
 const derivationKey=randomBytes(32),initialCsrfKey=randomBytes(32);
 let activeDerivationKey=derivationKey,activeDerivationRevision=1,activeCsrfKey=initialCsrfKey,activeCsrfRevision=1;
 const makeIdentity=(csrfKey,csrfKeyRevision)=>new LocalIdentityHttp({store:f.s,identityConfig:config,origin,authorizationEndpoint:providerOrigin+'/__idp/authorize',derivationKey:activeDerivationKey,derivationRevision:activeDerivationRevision,csrfKey,csrfKeyRevision,clock,sessionLifetimeSeconds,exchangeTimeoutMs,exchangeCode:async({code,codeVerifier,redirectUri,signal})=>{const r=await httpsRequest(providerOrigin,cert,'/__idp/token',{method:'POST',form:{grant_type:'authorization_code',code,code_verifier:codeVerifier,redirect_uri:redirectUri,client_id:config.audience},signal});requireThat(r.status===200,'test_provider','Sentetik sağlayıcı hatası.',403);return r.json().id_token;}});
 identity=makeIdentity(initialCsrfKey,1);
 h.rotateCsrf=(csrfKey,revision)=>{activeCsrfKey=csrfKey;activeCsrfRevision=revision;identity=makeIdentity(csrfKey,revision);h.identity=identity;return identity;};
 h.rotateDerivation=(key,revision)=>{activateLocalDerivationKey({store:f.s,identityConfig:config,derivationKey:key,revision,expectedRevision:revision-1,now:clock()});activeDerivationKey=key;activeDerivationRevision=revision;identity=makeIdentity(activeCsrfKey,activeCsrfRevision);h.identity=identity;return identity;};
 h.blockDerivation=()=>blockLocalDerivationKey({store:f.s,derivationKey:activeDerivationKey,now:clock()});
 h.selectIdentity=value=>{identity=value;h.identity=value;};
 h.origin=origin;h.providerOrigin=providerOrigin;h.identity=identity;h.request=(path,options)=>{const target=new URL(path,origin);return httpsRequest(target.origin===providerOrigin?providerOrigin:origin,cert,target.href,options);};
 h.close=async()=>{server.closeAllConnections();providerServer.closeAllConnections();await Promise.all([new Promise(resolve=>server.close(resolve)),new Promise(resolve=>providerServer.close(resolve))]);f.close();};return h;
}
