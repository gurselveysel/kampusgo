// Disposable loopback-only UI acceptance fixture; never part of the deployed gateway.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fixture} from '../gazi/auth/tests/helpers/myys-fixture.mjs';
import {hash} from '../gazi/auth/myys/store.mjs';
import {myysRoute} from '../gazi/auth/myys/http.mjs';

if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Local acceptance only');
const f=fixture('gazi');
// The appeal scenario starts from an existing synthetic decision, never a real learner.
if(process.argv.includes('--appeals'))f.passed();else f.setup();
for(const [person,role] of [['independent','instructor'],['finance','finance']]){
 f.s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run(person,'https://test-idp.invalid',person);
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('gazi',person,'engineering',JSON.stringify([role]),'2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(person),person,'2099-01-01T00:00:00.000Z');
}
const root=fileURLToPath(new URL('../gazi/',import.meta.url));
const roles={author:'Program hazırlayan',publisher:'Program inceleyen',student:'Öğrenen',teacher:'İlk eğitici',independent:'Bağımsız eğitici',judge:'Akademik karar',issuer:'Belge yetkilisi',reviewer:'Kalite',admin:'Sicil yöneticisi',it:'Bilgi işlem',finance:'Mali işler',other:'Başka öğrenen'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=createServer(async(req,res)=>{
 try{
  const origin='http://'+req.headers.host;
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))return json(res,403,{error:'Yalnız yerel kabul.'});
  const url=new URL(req.url,origin);
  if(req.method==='POST'&&req.headers.origin!==origin)return json(res,403,{error:'Kaynak doğrulanamadı.'});
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>64000)return json(res,413,{error:'İstek çok büyük.'});}
  const b=raw?JSON.parse(raw):undefined;
  if(url.pathname==='/__acceptance/actor'&&req.method==='POST'){
   if(!Object.hasOwn(roles,b?.actor))return json(res,400,{error:'Sentetik rol yok.'});
   res.setHeader('Set-Cookie','myys_acceptance_actor='+b.actor+'; HttpOnly; SameSite=Strict; Path=/');return json(res,200,{ok:true});
  }
  if(url.pathname==='/__acceptance'&&req.method==='GET'){
   res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<!doctype html><html lang="tr"><meta charset="UTF-8"><title>MYYS izole yerel kabul</title><body><h1>İzole yerel kabul · Gerçek hesap değil</h1><p>Yalnız sentetik kişiler ve geçici yerel kayıtlar.</p><label>Test senaryosu <select id="actor">${Object.entries(roles).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><button id="open">Senaryoyu aç</button><script>document.querySelector('#open').onclick=async()=>{const r=await fetch('/__acceptance/actor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:document.querySelector('#actor').value})});if(r.ok)location.href='/#/academic';};</script></body></html>`);
  }
  if(url.pathname.startsWith('/api/myys/')){
   const actor=(req.headers.cookie||'').match(/(?:^|; )myys_acceptance_actor=([a-z]+)(?:;|$)/)?.[1];
   if(!actor||!Object.hasOwn(roles,actor))return json(res,401,{error:'Yerel test senaryosunu seçin.'});
   return await myysRoute({req,path:url.pathname,b,sessionHash:hash(actor),json,res,core:f.core});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Yöntem desteklenmiyor.'});
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  // Only static presentation files, never source auth code, SQLite or package files.
  const ext=extname(path),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv','.vtt':'text/vtt'};
  if(!path.startsWith(root)||!types[ext]||path.includes('/auth/')||path.includes('/portal/'))return json(res,404,{error:'Dosya yok.'});
  const content=await readFile(path);res.setHeader('Content-Type',types[ext]+'; charset=utf-8');res.end(req.method==='HEAD'?undefined:content);
 }catch(e){json(res,e.code==='ENOENT'?404:500,{error:'Yerel kabul isteği tamamlanamadı.'});}
});
server.listen(0,'127.0.0.1',()=>console.log('MYYS_LOCAL_ACCEPTANCE=http://127.0.0.1:'+server.address().port+'/__acceptance'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{f.close();process.exit(0);}));
