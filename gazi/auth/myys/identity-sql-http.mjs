import {LocalPostgresAcademicCore} from './academic-sql.mjs';
// Isolated SQL HTTPS acceptance. No production route imports this module; no DDL or provisioning.
import {randomBytes,createHash} from 'node:crypto';
import {CoreError,hash,requireThat} from './store.mjs';
import {PostgresIdentityFlow,identitySqlContractDigest} from './identity-sql-flow.mjs';
import {PostgresIdentityHttpSecurity} from './identity-http-security.mjs';
import {identityPaths,identityCookie} from './identity-http.mjs';
export {identityPaths,identityCookie};
const local=()=>requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Deneme girişi üretimde açık değildir.',503);
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v)&&Buffer.from(v,'base64url').toString('base64url')===v;
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style="*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#172b4d;font:1rem/1.6 system-ui,sans-serif}main{max-width:42rem;margin:4vh auto;padding:1.5rem;background:#fff;border-radius:1rem;overflow-wrap:anywhere}header{display:flex;align-items:center;gap:1rem}header img{width:64px;height:64px}h1{font-size:1.8rem;line-height:1.3}button{font:inherit;font-weight:600;min-height:48px;max-width:100%;white-space:normal;padding:.6rem 1rem;background:#173e6c;color:white;border:0;border-radius:.5rem;cursor:pointer}a{color:#174a82}a:focus-visible,button:focus-visible{outline:3px solid #0763cb;outline-offset:4px}dt{font-weight:700}dd{margin:0 0 .75rem}footer{margin-top:2rem;font-size:.875rem}footer img{display:block;width:78px;height:auto;margin-bottom:.5rem}@media(max-width:480px){main{margin:0;padding:1rem;border-radius:0}h1{font-size:1.5rem}}";
const styleHash=createHash('sha256').update(style).digest('base64');
function localUrl(value,hosts=['127.0.0.1']){let u;try{u=new URL(value);}catch{}requireThat(u?.protocol==='https:'&&hosts.includes(u.hostname)&&!u.username&&!u.password&&!u.search&&!u.hash,'identity_http_config','Sabit yerel HTTPS adresi gerekli.',503);return u;}
function cookie(req){const parts=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(identityCookie+'='));requireThat(parts.length<=1,'identity_cookie','Oturum çerezi belirsiz.',403);if(!parts.length)return null;const token=parts[0].slice(identityCookie.length+1);requireThat(opaque(token),'identity_cookie','Oturum çerezi geçersiz.',403);return token;}
function setCookie(res,token,seconds){res.setHeader('Set-Cookie',`${identityCookie}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`);}
function headers(res,formOrigin=''){res.setHeader('Cache-Control','no-store');res.setHeader('Pragma','no-cache');res.setHeader('Referrer-Policy',formOrigin?'same-origin':'no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',`default-src 'none'; img-src 'self'; style-src 'sha256-${styleHash}'; form-action 'self' ${formOrigin}; frame-ancestors 'none'; base-uri 'none'`);}
function json(res,status,value){headers(res);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
function redirect(res,path){headers(res);res.writeHead(303,{Location:path});res.end();}
function html(res,status,title,body,formOrigin=''){headers(res,formOrigin);res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · Gazi Üniversitesi</title><style>${style}</style></head><body><main><header><img src="/assets/gazi-logo.svg" alt="Gazi Üniversitesi amblemi"><strong>Gazi Üniversitesi</strong></header><h1>${escape(title)}</h1>${body}<footer><img src="/assets/unigo-logo-tr.png" alt="ÜniGO"><span>MYYS · Yerel giriş denemesi</span></footer></main></body></html>`);}
async function form(req,max=4096){requireThat((req.headers['content-type']||'').split(';')[0].trim()==='application/x-www-form-urlencoded','identity_body','Giriş formunun türü geçersiz.',415);let bytes=0,parts=[];for await(const chunk of req){const b=Buffer.from(chunk);bytes+=b.length;requireThat(bytes<=max,'identity_body','Giriş isteği çok büyük.',413);parts.push(b);}let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts));}catch{throw new CoreError('identity_body','Giriş formu geçersiz.',400);}requireThat(!/%(?![0-9a-f]{2})/i.test(raw),'identity_body','Giriş formu geçersiz.',400);const p=new URLSearchParams(raw);requireThat([...p.keys()].every(k=>p.getAll(k).length===1),'identity_body','Yinelenen giriş alanı.',400);return Object.fromEntries(p);}
async function jsonBody(req,max=64000){
 requireThat((req.headers['content-type']||'').split(';')[0].trim()==='application/json','academic_body','JSON istek biçimi gerekli.',415);let n=0,parts=[];for await(const c of req){const b=Buffer.from(c);n+=b.length;requireThat(n<=max,'academic_body','Akademik istek çok büyük.',413);parts.push(b);}let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));}catch{throw new CoreError('academic_body','Akademik istek okunamadı.',400);}requireThat(value&&typeof value==='object'&&!Array.isArray(value),'academic_body','Akademik istek nesnesi gerekli.',400);return value;
}
const roleNames={learner:'Öğrenci',instructor:'Eğitici',commission:'Komisyon üyesi',quality:'Kalite sorumlusu',coordinator:'Koordinatör',studentAffairs:'Öğrenci işleri',it:'Bilgi işlem',admin:'Sistem yöneticisi',finance:'Mali işler'};
export class LocalPostgresIdentityHttp {
 #flow;#security;#origin;#authorization;#config;#clock;#window;#academic;
 constructor({transactions,identityConfig,keyDriver,origin,authorizationEndpoint,csrfKey,csrfKeyRevision=1,exchangeCode,clock=()=>new Date(),limits,requestLifetimeSeconds=300,sessionLifetimeSeconds=300,exchangeTimeoutMs=5000,httpRequestLifetimeSeconds=30,academic=false}){
  local();requireThat(typeof academic==='boolean','academic_config','Akademik deneme kapsamı geçersiz.',503);const app=localUrl(origin),idp=localUrl(authorizationEndpoint,['127.0.0.1','localhost']);requireThat(app.origin===origin&&idp.pathname!=='/','identity_http_config','Tam origin ve yetkilendirme yolu gerekli.',503);
  this.#origin=origin;this.#authorization=idp.href;this.#config=structuredClone(identityConfig);this.#clock=clock;this.#window=limits?.seconds??60;
  const redirectUri=origin+identityPaths.callback,contractDigest=identitySqlContractDigest(identityConfig,redirectUri);
  this.#security=new PostgresIdentityHttpSecurity({transactions,tenant:identityConfig.tenant,issuer:identityConfig.issuer,audience:identityConfig.audience,origin,contractDigest,key:csrfKey,keyRevision:csrfKeyRevision,clock,...(limits?{limits}:{}),requestLifetimeSeconds:httpRequestLifetimeSeconds,allowAcademic:academic});
  this.#flow=new PostgresIdentityFlow({transactions,identityConfig,keyDriver,redirectUri,exchangeCode,clock,requestLifetimeSeconds,sessionLifetimeSeconds,exchangeTimeoutMs,httpSecurity:this.#security});
  this.#academic=academic?new LocalPostgresAcademicCore({identity:this.#flow,clock}):null;
 }
 // Trusted fixture/control-plane only. These are NOT HTTP routes or normal user powers.
 activateHttpKey(control){local();return this.#security.activate(control);}
 recordKeyMetadata(value,control){local();return this.#flow.recordKeyMetadata(value,control);}
 putPerson(value,control){local();return this.#flow.putPerson(value,control);}
 putMembership(value,control){local();return this.#flow.putMembership(value,control);}
 #check(req){local();requireThat(req.socket?.encrypted===true&&req.headers.host===new URL(this.#origin).host&&!['forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for'].some(k=>req.headers[k]),'identity_origin','Giriş kaynağı doğrulanamadı.',403);requireThat(typeof req.url==='string'&&req.url.startsWith('/')&&!req.url.startsWith('//')&&!req.url.includes('\\')&&req.url.length<=4096,'identity_url','Giriş yolu geçersiz.',400);}
 #mutation(req,token){requireThat(token&&req.headers.origin===this.#origin&&(!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin'),'identity_origin','Giriş kaynağı doğrulanamadı.',403);}
 async #principal(token,permit,purpose){if(!token)return null;try{return await this.#flow.principal({sessionHash:hash(token),permit,purpose});}catch(e){if(e instanceof CoreError&&['identity_required','identity_member','membership_required'].includes(e.code))return null;throw e;}}
 async handle(req,res){
  const rawPath=typeof req.url==='string'?req.url.split('?')[0]:'',purpose=Object.keys(identityPaths).find(k=>identityPaths[k]===rawPath)||(this.#academic?({'/api/myys/calisma':'academic-read','/api/myys/islem':'academic-write'}[rawPath]):null);if(!purpose)return false;let permit;
  try{
   this.#check(req);const url=new URL(req.url,this.#origin);requireThat(url.pathname===rawPath,'identity_url','Giriş yolu geçersiz.',400);
   let token=purpose==='backchannel'?null:cookie(req);permit=await this.#security.check({purpose,network:req.socket.remoteAddress,browserHash:token?hash(token):null});
   const method=['start','logout','backchannel','academic-write'].includes(purpose)?'POST':'GET';if(req.method!==method){res.setHeader('Allow',method);json(res,405,{error:'Bu giriş yöntemi desteklenmiyor.'});return true;}
   if(purpose==='academic-read'||purpose==='academic-write'){
    requireThat(token,'session_required','Kurum oturumu kapalı. Yeniden giriş yapın.',401);
    const sessionHash=hash(token);let result;
    if(purpose==='academic-read'){
     requireThat([...url.searchParams.keys()].every(k=>k==='kurum')&&url.searchParams.getAll('kurum').length===1&&url.searchParams.get('kurum')===this.#config.tenant,'academic_scope','Bu kurum kapsamına erişilemiyor.',404);
     result=await this.#academic.view({sessionHash,tenant:this.#config.tenant,permit});
     const csrf=await this.#security.csrf(permit,token);result.identitySession={scope:'isolated-sql-acceptance',personId:result.personId,expires:result.sessionExpires,csrf};
    }else{
     requireThat(!url.search,'academic_body','Akademik işlem yolu geçersiz.',400);this.#mutation(req,token);const b=await jsonBody(req);
     requireThat(Object.keys(b).every(k=>['tenant','commandId','action','input'].includes(k))&&b.tenant===this.#config.tenant,'academic_scope','Akademik kurum kapsamı geçersiz.',400);
     await this.#security.verifyCsrf(permit,token,req.headers['x-myys-csrf']);
     result=await this.#academic.run({sessionHash,permit,...b});
    }
    json(res,200,result);return true;
   }
   if(purpose==='backchannel'){
    try{requireThat(!url.search,'identity_logout','İstek geçersiz.',400);const b=await form(req,24576);requireThat(Object.keys(b).length===1&&typeof b.logout_token==='string','identity_logout','İstek geçersiz.',400);await this.#flow.backchannelLogout({logoutToken:b.logout_token,permit});json(res,200,{accepted:true});}catch{json(res,400,{error:'invalid_request',error_description:'Oturum kapatma bildirimi işlenemedi.'});}return true;
   }
   if(purpose==='login'){
    requireThat([...url.searchParams.keys()].every(k=>k==='result')&&url.searchParams.getAll('result').length<=1&&(!url.searchParams.has('result')||url.searchParams.get('result')==='failed'),'identity_url','Giriş yolu geçersiz.',400);
    const principal=await this.#principal(token,permit,'login');if(!token){token=randomBytes(32).toString('base64url');}
    const csrf=await this.#security.csrf(permit,token);if(!cookie(req))setCookie(res,token,900);
    const account=principal?`<dl><dt>Bağlı kişi</dt><dd>${escape(principal.id)}</dd><dt>Kurum</dt><dd>${escape(principal.tenant)}</dd><dt>Birim ve rol</dt><dd>${principal.memberships.map(m=>escape(m.unit)+' · '+m.roles.map(r=>escape(roleNames[r]||r)).join(', ')).join('<br>')}</dd><dt>Oturum bitişi</dt><dd>${escape(new Date(principal.expires).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}))} (Türkiye saati)</dd></dl>${this.#academic?'<p><a href="/#/academic">Akademik çalışma alanını aç</a></p>':'<p>Akademik işlem erişimi bu deneme oturumunda açık değildir.</p>'}`:'<p>Bu ekran yalnız deneme hesapları içindir. Gerçek kurum girişi henüz açık değildir.</p>';
    html(res,200,principal?'Kurum oturumu denemesi':'Kurum girişi denemesi',`${url.searchParams.has('result')?'<p role="alert">Giriş tamamlanamadı. Yeni bir giriş isteği başlatabilirsiniz.</p>':''}${account}<form method="post" action="${principal?identityPaths.logout:identityPaths.start}"><input type="hidden" name="csrf" value="${csrf}"><button>${principal?'Deneme oturumundan çık':'Deneme girişini başlat'}</button></form>`,new URL(this.#authorization).origin);return true;
   }
   if(purpose==='session'){
    requireThat(!url.search,'identity_url','Giriş yolu geçersiz.',400);const p=await this.#principal(token,permit,'session');requireThat(p,'session_required','Kurum oturumu kapalı. Yeniden giriş yapın.',401);const csrf=await this.#security.csrf(permit,token);json(res,200,{active:true,personId:p.id,tenant:p.tenant,expires:p.expires,memberships:p.memberships,csrf,scope:'isolated-sql-acceptance',official:false,academicAccess:!!this.#academic});return true;
   }
   if(purpose==='start'||purpose==='logout'){
    requireThat(!url.search,'identity_url','Giriş yolu geçersiz.',400);this.#mutation(req,token);const jsonLogout=purpose==='logout'&&this.#academic&&(req.headers['content-type']||'').split(';')[0].trim()==='application/json';const b=jsonLogout?await jsonBody(req,4096):await form(req);requireThat(Object.keys(b).every(k=>['csrf','tenant'].includes(k))&&(!('tenant'in b)||b.tenant===this.#config.tenant),'identity_body','Giriş formu geçersiz.',400);const header=req.headers['x-myys-csrf'];requireThat(!header||!b.csrf||header===b.csrf,'identity_csrf','Giriş formu yenilenmeli.',403);await this.#security.verifyCsrf(permit,token,header||b.csrf);
    if(purpose==='logout'){await this.#flow.logout({sessionHash:hash(token),permit});setCookie(res,'',0);if(jsonLogout)json(res,200,{active:false,official:false});else redirect(res,identityPaths.login);return true;}
    const request=await this.#flow.begin({browserSessionHash:hash(token),permit}),target=new URL(this.#authorization);for(const [k,v]of Object.entries(request))target.searchParams.set(k,v);redirect(res,target.href);return true;
   }
   if(purpose==='callback'){
    try{
     const p=url.searchParams;requireThat(token&&[...p.keys()].every(k=>['state','code','iss','error','error_description'].includes(k)&&p.getAll(k).length===1)&&p.has('state')&&p.has('iss')&&p.has('code')!==p.has('error')&&!(!p.has('error')&&p.has('error_description')),'identity_callback','Dönüş isteği geçersiz.',403);
     const input={state:p.get('state'),browserSessionHash:hash(token),issuer:p.get('iss'),redirectUri:this.#origin+identityPaths.callback,permit};
     if(p.has('error')){await this.#flow.cancel(input);redirect(res,identityPaths.login+'?result=failed');return true;}
     const result=await this.#flow.complete({...input,code:p.get('code')}),seconds=Math.floor((Date.parse(result.expires)-this.#clock().getTime())/1000);requireThat(Number.isSafeInteger(seconds)&&seconds>0,'identity_callback','Oturum süresi doldu.',403);setCookie(res,result.sessionToken,Math.min(seconds,900));redirect(res,this.#academic?'/#/academic':identityPaths.login);return true;
    }catch(e){if(!(e instanceof CoreError))throw e;redirect(res,identityPaths.login+'?result=failed');return true;}
   }
  }catch(e){
   const status=e instanceof CoreError?(['academic-read','academic-write'].includes(purpose)&&['identity_required','identity_member','membership_required'].includes(e.code)?401:e.status):503,code=e instanceof CoreError?e.code:'identity_unavailable',rate=status===429;res.removeHeader('Set-Cookie');if(rate||code==='identity_key_rotation_wait')res.setHeader('Retry-After',String(this.#window));
   const title=rate?'Giriş isteği sınırına ulaşıldı':status===401?'Kurum oturumu kapalı':'Giriş tamamlanamadı',message=rate?'Çok fazla istek alındı. Kısa süre sonra yeniden deneyebilirsiniz.':'Giriş isteği doğrulanamadı. Giriş ekranından yeniden deneyebilirsiniz.';
   if((req.headers.accept||'').includes('text/html')&&!['backchannel','session','academic-read','academic-write'].includes(purpose))html(res,status,title,`<p role="alert">${message}</p><a href="${identityPaths.login}">Giriş ekranına dön</a>`);else json(res,status,{error:['academic-read','academic-write'].includes(purpose)&&e instanceof CoreError&&status<500?e.message:message,code,scope:'isolated-sql-acceptance',official:false,loginPath:identityPaths.login});return true;
  }finally{if(permit)this.#security.close(permit);}
 }
}
