// No production route imports this module. HTTPS loopback acceptance only.
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {LocalAcceptanceStore,CoreError,hash,requireThat} from './store.mjs';
import {LocalIdentityFlow} from './identity-flow.mjs';
import {LocalIdentityRateLimit} from './identity-rate-limit.mjs';
export const identityPaths=Object.freeze({login:'/__identity/login',session:'/api/myys/kimlik/oturum',start:'/api/myys/kimlik/baslat',callback:'/api/myys/kimlik/donus',logout:'/api/myys/kimlik/cikis',backchannel:'/api/myys/kimlik/saglayici-cikis'});
export const identityCookie='__Host-myys-session';
export function localIdentityFailure(e){return {error:e.code==='identity_rate'?'Çok fazla giriş isteği. Bir dakika sonra yeniden deneyin.':'Yerel giriş isteği doğrulanamadı.',code:e.code,...(e.code==='session_required'?{scope:'local-acceptance',loginPath:identityPaths.login}:{})};}
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=()=>requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel giriş üretimde etkin değildir.',503);
function localUrl(value,hosts=['127.0.0.1']){let url;try{url=new URL(value);}catch{}requireThat(url&&url.protocol==='https:'&&hosts.includes(url.hostname)&&!url.username&&!url.password&&!url.search&&!url.hash,'identity_config','Sabit yerel HTTPS adresi gerekli.',503);return url;}
function cookie(req){const parts=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(identityCookie+'='));requireThat(parts.length<=1,'identity_cookie','Oturum çerezi belirsiz.',403);if(!parts.length)return null;const value=parts[0].slice(identityCookie.length+1);requireThat(opaque(value),'identity_cookie','Oturum çerezi geçersiz.',403);return value;}
function setCookie(res,value,seconds){res.setHeader('Set-Cookie',`${identityCookie}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`);}
function headers(res,formOrigin=''){res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');res.setHeader('Referrer-Policy',formOrigin?'same-origin':'no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',`default-src 'none'; form-action 'self' ${formOrigin}; frame-ancestors 'none'; base-uri 'none'`);}
function json(res,status,data){headers(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function redirect(res,path){headers(res);res.writeHead(303,{Location:path});res.end();}
async function body(req){
 let raw='';for await(const chunk of req){raw+=chunk;requireThat(Buffer.byteLength(raw)<=4096,'identity_body','Giriş isteği çok büyük.',413);}
 const type=(req.headers['content-type']||'').split(';')[0].trim();
 if(type==='application/json'){let value;try{value=JSON.parse(raw);}catch{}requireThat(value&&typeof value==='object'&&!Array.isArray(value),'identity_body','Giriş isteği geçersiz.',400);return value;}
 requireThat(type==='application/x-www-form-urlencoded','identity_body','Giriş formunun türü geçersiz.',415);const p=new URLSearchParams(raw);requireThat([...p.keys()].every(k=>p.getAll(k).length===1),'identity_body','Yinelenen giriş alanı.',400);return Object.fromEntries(p);
}
export class LocalIdentityHttp {
 #store;#config;#flow;#origin;#authorization;#key;#clock;#rate;
 constructor({store,identityConfig,origin,authorizationEndpoint,derivationKey,csrfKey,exchangeCode,clock=()=>new Date(),...limits}){
  local();requireThat(store instanceof LocalAcceptanceStore&&Buffer.isBuffer(csrfKey)&&csrfKey.length===32,'identity_config','Yerel kimlik HTTP yapılandırması eksik.',503);
  const app=localUrl(origin),authorization=localUrl(authorizationEndpoint,['127.0.0.1','localhost']);requireThat(app.origin===origin&&app.pathname==='/'&&authorization.pathname!=='/','identity_config','Tam origin ve yetkilendirme yolu gerekli.',503);
  this.#store=store;this.#origin=origin;this.#authorization=authorization.href;this.#config=structuredClone(identityConfig);this.#key=Buffer.from(csrfKey);this.#clock=clock;
  this.#flow=new LocalIdentityFlow({store,identityConfig,derivationKey,redirectUri:origin+identityPaths.callback,exchangeCode,clock,...limits});
  this.#rate=new LocalIdentityRateLimit({store,identityConfig,key:csrfKey,clock});
 }
 #check(req){
  local();requireThat(req.socket?.encrypted===true&&req.headers.host===new URL(this.#origin).host&&!req.headers['x-forwarded-host']&&!req.headers['x-forwarded-proto'],'identity_origin','Giriş kaynağı doğrulanamadı.',403);
  requireThat(typeof req.url==='string'&&req.url.startsWith('/')&&!req.url.startsWith('//')&&!req.url.includes('\\')&&req.url.length<=4096,'identity_url','Giriş yolu geçersiz.',400);
 }
 #csrf(token){return createHmac('sha256',this.#key).update(JSON.stringify(['csrf',this.#origin,this.#config.tenant,token])).digest('base64url');}
 #mutation(req,token,value){
  requireThat(token&&req.headers.origin===this.#origin&&(!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin'),'identity_origin','Giriş kaynağı doğrulanamadı.',403);
  requireThat(opaque(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(this.#csrf(token))),'identity_csrf','Giriş formu yenilenmeli.',403);
 }
 #principal(token){if(!token)return null;try{return this.#store.principal(hash(token),this.#config.tenant,this.#clock().toISOString());}catch(e){if(e instanceof CoreError)return null;throw e;}}
 authorizeRequest(req,{mutation=false}={}){
  this.#check(req);const token=cookie(req),principal=this.#principal(token);requireThat(principal,'session_required','Kişiye bağlı giriş gerekli.',401);if(mutation)this.#mutation(req,token,req.headers['x-myys-csrf']);
  return {sessionHash:hash(token),principal};
 }
 sessionInfo(req){const {principal,sessionHash}=this.authorizeRequest(req);const row=this.#store.db.prepare('SELECT expires FROM bindings WHERE session_hash=?').get(sessionHash);return {personId:principal.id,tenant:principal.tenant,expires:row.expires,csrf:this.#csrf(cookie(req)),scope:'local-acceptance',official:false};}
 async handle(req,res){
  const rawPath=typeof req.url==='string'?req.url.split('?')[0]:'';if(!Object.values(identityPaths).includes(rawPath))return false;
  try{
   this.#check(req);const url=new URL(req.url,this.#origin),path=url.pathname;
   if(path===identityPaths.backchannel){
    this.#rate.check({purpose:'backchannel',network:req.socket.remoteAddress});
    try{
     requireThat(req.method==='POST'&&!url.search&&(req.headers['content-type']||'').split(';')[0].trim()==='application/x-www-form-urlencoded','identity_logout','Oturum kapatma isteği geçersiz.',400);
     let raw='';for await(const chunk of req){raw+=chunk;requireThat(Buffer.byteLength(raw)<=24576,'identity_logout','Oturum kapatma isteği geçersiz.',400);}
     const form=new URLSearchParams(raw);requireThat(form.getAll('logout_token').length===1,'identity_logout','Oturum kapatma isteği geçersiz.',400);
     await this.#flow.backchannelLogout({logoutToken:form.get('logout_token')});json(res,200,{accepted:true});return true;
    }catch(e){json(res,400,{error:'invalid_request',error_description:'Oturum kapatma bildirimi işlenemedi.'});return true;}
   }
   let token=cookie(req);this.#rate.check({purpose:Object.keys(identityPaths).find(k=>identityPaths[k]===path),network:req.socket.remoteAddress,browserHash:token?hash(token):null});
   if(path===identityPaths.login&&req.method==='GET'){
    requireThat([...url.searchParams.keys()].every(k=>k==='result')&&url.searchParams.getAll('result').length<=1,'identity_url','Giriş yolu geçersiz.',400);
    if(!token){token=randomBytes(32).toString('base64url');setCookie(res,token,900);}
    const principal=this.#principal(token),csrf=this.#csrf(token),failed=url.searchParams.get('result')==='failed';headers(res,new URL(this.#authorization).origin);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MYYS yerel giriş kabulü</title><main><h1>Yerel kurum girişi kabulü</h1><p>Yalnız sentetik hesaplar. Gerçek kurum kimlik sağlayıcısı bağlı değildir.</p>${failed?'<p role="alert">Giriş isteği tamamlanamadı. Yeni bir giriş isteği başlatabilirsiniz.</p>':''}${principal?`<p>Bağlı kişi: ${escape(principal.id)}</p><p><a href="/#/academic">Akademik çalışma alanını aç</a></p>`:'<p>Giriş, tek kullanımlık istek ve çok faktörlü sentetik kimlik kanıtıyla sınanır.</p>'}<form method="post" action="${principal?identityPaths.logout:identityPaths.start}"><input type="hidden" name="csrf" value="${csrf}"><button type="submit">${principal?'Yerel oturumdan çık':'Sentetik kurum girişini başlat'}</button></form></main></html>`);return true;
   }
   if(path===identityPaths.session&&req.method==='GET'){requireThat(!url.search,'identity_url','Giriş yolu geçersiz.',400);json(res,200,{active:true,...this.sessionInfo(req)});return true;}
   if((path===identityPaths.start||path===identityPaths.logout)&&req.method==='POST'){
    requireThat(!url.search,'identity_url','Giriş yolu geçersiz.',400);const b=await body(req);requireThat(Object.keys(b).every(k=>['csrf','tenant'].includes(k))&&(!b.tenant||b.tenant===this.#config.tenant),'identity_body','Giriş formu geçersiz.',400);this.#mutation(req,token,req.headers['x-myys-csrf']||b.csrf);
    if(path===identityPaths.logout){this.#flow.logout({sessionHash:hash(token)});setCookie(res,'',0);if((req.headers['content-type']||'').startsWith('application/json'))json(res,200,{revoked:true,scope:'local-acceptance'});else redirect(res,identityPaths.login);return true;}
    const request=this.#flow.begin({browserSessionHash:hash(token)}),target=new URL(this.#authorization);for(const [key,value]of Object.entries(request))target.searchParams.set(key,value);redirect(res,target.href);return true;
   }
   if(path===identityPaths.callback&&req.method==='GET'){
    try{
     const p=url.searchParams;requireThat(token&&[...p.keys()].every(k=>['state','code','iss','error','error_description'].includes(k)&&p.getAll(k).length===1)&&p.has('state')&&p.has('iss')&&p.has('code')!==p.has('error')&&!(!p.has('error')&&p.has('error_description')),'identity_callback','Kimlik dönüş isteği geçersiz.',403);
     const common={state:p.get('state'),browserSessionHash:hash(token),issuer:p.get('iss'),redirectUri:this.#origin+identityPaths.callback};
     if(p.has('error')){this.#flow.cancel(common);redirect(res,identityPaths.login+'?result=failed');return true;}
     const result=await this.#flow.complete({...common,code:p.get('code')});setCookie(res,result.sessionToken,Math.max(1,Math.floor((Date.parse(result.expires)-this.#clock().getTime())/1000)));redirect(res,'/#/academic');return true;
    }catch(e){if(!(e instanceof CoreError))throw e;redirect(res,identityPaths.login+'?result=failed');return true;}
   }
   res.setHeader('Allow',[identityPaths.start,identityPaths.logout].includes(path)?'POST':'GET');json(res,405,{error:'Bu giriş yöntemi desteklenmiyor.'});return true;
  }catch(e){
   if(!(e instanceof CoreError))throw e;
   if(e.status===429){
    res.setHeader('Retry-After','60');
    if(rawPath!==identityPaths.backchannel&&(req.headers.accept||'').includes('text/html')){headers(res);res.writeHead(429,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Giriş isteği sınırı</title><main><h1>Giriş isteği sınırına ulaşıldı</h1><p role="alert">Çok fazla giriş isteği alındı. Bir dakika sonra yeniden deneyebilirsiniz.</p><p>Akademik kayıtlarınız korunur.</p><a href="${identityPaths.login}">Giriş ekranına dön</a></main></html>`);return true;}
   }
   json(res,e.status,localIdentityFailure(e));return true;
  }
 }
}
