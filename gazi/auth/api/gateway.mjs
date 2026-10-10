import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {isIP} from 'node:net';
import {verifySync} from 'otplib';
import {badgeRoute} from '../lib/badge-service.mjs';

const COOKIE='__Host-gazi_demo_session';
const ROOT=process.cwd();
const STORE='https://xpjkrwzgimdxsasqszfi.supabase.co/functions/v1/gazi-demo-gate-store';
const sha=s=>createHash('sha256').update(s).digest('hex');
const types={'.csv':'text/csv; charset=utf-8','.vtt':'text/vtt; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf'};
const publicFiles=new Map([['/giris','login/index.html'],['/guvenlik/giris.css','login/giris.css'],['/guvenlik/giris.js','login/giris.js'],['/assets/gazi-logo.svg','private/assets/gazi-logo.svg'],['/assets/unigo-logo-tr.png','private/assets/unigo-logo-tr.png']]);
let files;
export const safeNext=s=>typeof s==='string'&&/^\/(?!\/)[a-zA-Z0-9_./-]*(?:#[a-zA-Z0-9_/-]*)?$/.test(s)&&!s.includes('..')&&!s.startsWith('/giris')&&!s.startsWith('/api/')?s:'/';
export function getToken(header=''){
 const matches=header.split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));
 if(matches.length!==1)return null;
 const value=matches[0].slice(COOKIE.length+1);return /^[a-f0-9]{64}$/.test(value)?value:null;
}
async function store(action,body={}){
 if(!process.env.GAZI_GATE_STORE_TOKEN||!process.env.GAZI_TOTP_SECRET||!process.env.GAZI_GATE_IP_KEY)throw Error('configuration');
 const r=await fetch(STORE,{method:'POST',headers:{'Content-Type':'application/json','x-gazi-gateway':process.env.GAZI_GATE_STORE_TOKEN},body:JSON.stringify({action,scope:process.env.VERCEL_ENV==='production'?'production':'preview',...body}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('storage:'+action+':'+r.status);return r.json();
}
function headers(res){
 const values={'Cache-Control':'private, no-store, max-age=0','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN','X-Robots-Tag':'noindex, nofollow','Strict-Transport-Security':'max-age=63072000; includeSubDomains','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' https://media.w3.org; frame-src 'self' https://www.youtube-nocookie.com; connect-src 'self' https://xpjkrwzgimdxsasqszfi.supabase.co; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"};
 for(const[k,v]of Object.entries(values))res.setHeader(k,v);
}
const json=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
const redirect=(res,to)=>{res.statusCode=303;res.setHeader('Location',to);res.end();};
const cookie=(res,token='',maxAge=0)=>res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`);
export function validOrigin(req){
 const hosts=['gazi.unigoturkiye.com','gazi-unigo-myys.vercel.app','gazi-unigo-myys-info-64116029s-projects.vercel.app',process.env.VERCEL_URL].filter(Boolean);
 return hosts.includes(req.headers.host)&&req.headers.origin==='https://'+req.headers.host&&(!req.headers['sec-fetch-site']||req.headers['sec-fetch-site']==='same-origin');
}
async function body(req,max=512){
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw Error('body');
 // Vercel may already parse JSON bodies before invoking the handler.
 if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>max)throw Error('body');return JSON.parse(raw);}
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>max)throw Error('body');}return JSON.parse(raw);
}
export default async function handler(req,res){
 headers(res);
 try{
  const url=new URL(req.url,'https://gazi.unigoturkiye.com');
  const path=decodeURIComponent(url.pathname);
  if(path.includes('..')||path.includes('\\')||path.includes('\0'))return json(res,404,{error:'Sayfa bulunamadı.'});
  const token=getToken(req.headers.cookie);
  if(path==='/api/erisim/giris'||path==='/api/erisim/cikis'){
   if(req.method!=='POST')return json(res,405,{error:'İzin verilmeyen işlem.'});
   if(!validOrigin(req))return json(res,403,{error:'İstek doğrulanamadı.'});
   let b;try{b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();}catch{return json(res,400,{error:'Geçerli bir kod girin.'});}
   if(path.endsWith('/cikis')){if(token)await store('logout',{hash:sha(token)});cookie(res);return json(res,200,{ok:true});}
   const ip=req.headers['x-vercel-forwarded-for'];
   const ipHash=createHmac('sha256',process.env.GAZI_GATE_IP_KEY||'').update(typeof ip==='string'&&isIP(ip)?ip:'unknown').digest('hex');
   if(!(await store('limit',{ip:ipHash})).allowed){res.setHeader('Retry-After','300');return json(res,429,{error:'Deneme sınırına ulaşıldı. 5 dakika sonra yeniden deneyin.'});}
   const result=typeof b.code==='string'&&/^\d{6}$/.test(b.code)?verifySync({secret:process.env.GAZI_TOTP_SECRET,token:b.code,epochTolerance:30,period:30,digits:6}):{valid:false};
   if(!result.valid)return json(res,401,{error:'Kod geçersiz veya kullanılmış. Uygulamadaki yeni kodu deneyin.'});
   const session=randomBytes(32).toString('hex');
   const {expires}=await store('consume',{step:result.timeStep,hash:sha(session)});
   if(!expires)return json(res,401,{error:'Kod geçersiz veya kullanılmış. Uygulamadaki yeni kodu deneyin.'});
   cookie(res,session,3600);return json(res,200,{ok:true,next:safeNext(b.next),expires});
  }
  if(path.startsWith('/api/rozet/')){
   const publicBadge=['/api/rozet/anahtarlar','/api/rozet/kurum','/api/rozet/durum','/api/rozet/gorsel.svg'].includes(path)&&req.method==='GET';
   let sessionHash=null,b;
   if(publicBadge)res.setHeader('Access-Control-Allow-Origin','*');
   if(!publicBadge){
    const session=token?await store('session',{hash:sha(token)}):null;
    if(!session?.expires||Date.parse(session.expires)<=Date.now())return json(res,401,{error:'Oturumunuz sona erdi.'});
    sessionHash=sha(token);
    if(req.method==='POST'){
     if(!validOrigin(req))return json(res,403,{error:'İstek doğrulanamadı.'});
     try{b=await body(req,32000);if(!b||typeof b!=='object'||Array.isArray(b))throw Error();}catch{return json(res,400,{error:'Geçerli bir rozet isteği gerekli.'});}
    }
   }
   return await badgeRoute({req,path,b,store,json,res,sessionHash});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'İzin verilmeyen işlem.'});
  let file=publicFiles.get(path);
  if(!file){
   const session=token?await store('session',{hash:sha(token)}):null;
   if(!session?.expires||Date.parse(session.expires)<=Date.now()){
    if(token)cookie(res);
    if(path.startsWith('/api/'))return json(res,401,{error:'Oturumunuz sona erdi.'});
    return redirect(res,'/giris?next='+encodeURIComponent(safeNext(path)));
   }
   if(path==='/api/erisim/oturum')return json(res,200,{expires:session.expires});
   if(path==='/guvenlik/oturum.js')file='login/oturum.js';
   else{
    files??=JSON.parse(await readFile(resolve(ROOT,'private/manifest.json'),'utf8'));
    const name=['/','/pilot.html'].includes(path)?'index.html':path.slice(1);
    if(!files.includes(name))return json(res,404,{error:'Sayfa bulunamadı.'});
    file='private/'+name;
   }
  }
  let data=await readFile(resolve(ROOT,file));
  if(file.startsWith('private/')&&!file.startsWith('private/content/')&&file.endsWith('.html'))data=Buffer.from(data.toString().replace('</body>','<script src="/guvenlik/oturum.js" defer></script></body>'));
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
  if(/^private\/content\/P\d{2}-(L\d{2}-Sunum\.html|M\d{2}-Vaka\.csv)$/.test(file))res.setHeader('Content-Disposition','attachment; filename="Unigo_'+file.slice(16)+'"');
  res.statusCode=200;res.end(req.method==='HEAD'?undefined:data);
 }catch(e){console.error(JSON.stringify({component:'gazi-gateway',type:e?.name||'Error',code:typeof e?.code==='string'?e.code.slice(0,60):'',stage:/^storage:[a-z_]+:[0-9]+$/.test(e?.message||'')?e.message:'request'}));json(res,503,{error:'Erişim şu anda doğrulanamıyor. Lütfen biraz sonra yeniden deneyin.'});}
}
