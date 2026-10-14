import {localAuthorityDossier} from '../gazi/auth/tests/helpers/local-authority.mjs';
import {seedLoginRequest} from '../gazi/auth/tests/helpers/local-login-cleanup.mjs';
import {localWalletStudySetup} from '../gazi/auth/tests/helpers/local-wallet-study.mjs';
import {localAdviceSetup} from '../gazi/auth/tests/helpers/local-advice.mjs';
import {localPortfolioSetup,portfolioPurpose,portfolioReason} from '../gazi/auth/tests/helpers/local-portfolio.mjs';
import {localSkillMapSetup} from '../gazi/auth/tests/helpers/local-skill-map.mjs';
import {localCapacitySetup,capacityActors} from '../gazi/auth/tests/helpers/local-capacity.mjs';
import {localPaymentSetup,localPaymentOrder,localPaymentRun} from '../gazi/auth/tests/helpers/local-payment.mjs';
import {LocalRecoveryService} from '../gazi/auth/myys/recovery.mjs';
import {runSyntheticRecoveryDrill} from '../gazi/auth/scripts/lib/integrated-recovery.mjs';
import {sourcePacketFixture} from '../gazi/auth/tests/helpers/local-source-packet.mjs';
import {semSetup} from '../gazi/auth/tests/helpers/local-sem.mjs';
import {generateKeyPairSync} from 'node:crypto';
import {importJWK} from '../gazi/auth/node_modules/jose/dist/webapi/index.js';
import {registryFields} from '../gazi/auth/myys/registry.mjs';
import {localRecognitionPolicy,localRecognitionCase} from '../gazi/auth/tests/helpers/local-recognition.mjs';
// Disposable loopback-only UI acceptance fixture; never part of the deployed gateway.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {signedFixture} from '../gazi/auth/tests/helpers/local-signing.mjs';
import {fixture} from '../gazi/auth/tests/helpers/myys-fixture.mjs';
import {randomBytes,createHmac} from 'node:crypto';
import {LocalLmsAdapter,LocalLmsWorker} from '../gazi/auth/myys/lms.mjs';
import {hash} from '../gazi/auth/myys/store.mjs';
import {myysRoute} from '../gazi/auth/myys/http.mjs';

if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error('Local acceptance only');
const f=fixture('gazi');
let supportClock=process.argv.includes('--support')?Date.parse('2026-10-14T06:00:00.000Z'):null;
if(supportClock!==null)f.core.clock=()=>new Date(supportClock).toISOString();
const recoveryService=process.argv.includes('--recovery')?new LocalRecoveryService(f.core,{rehearse:runSyntheticRecoveryDrill}):null;
// The appeal scenario starts from an existing synthetic decision, never a real learner.
const initial=process.argv.includes('--sem')?semSetup(f):process.argv.includes('--keys')?f.passed():process.argv.includes('--profiles')||process.argv.includes('--authority')?f.passed({withProfile:false}):process.argv.includes('--obs')?localRecognitionCase(f):process.argv.includes('--replacement')||process.argv.includes('--wallet')||process.argv.includes('--privacy')||process.argv.includes('--quality')||process.argv.includes('--cohort')||process.argv.includes('--capacity')||process.argv.includes('--portfolios')?await signedFixture(f):process.argv.includes('--appeals')||process.argv.includes('--operations')||process.argv.includes('--skill-maps')||process.argv.includes('--advice')||process.argv.includes('--wallet-study')?f.passed():f.setup();
const sourceFixture=process.argv.includes('--source-packets')||process.argv.includes('--source-trust')?await sourcePacketFixture(f,{initial,registered:!process.argv.includes('--source-trust')}):null;
if(process.argv.includes('--appeal-policies'))f.assess(initial);
if(process.argv.includes('--profiles')||process.argv.includes('--authority')){const reason='Sentetik düzenleme yetki kaydı, gerçek kurum kararı değildir.';const authority=f.run('admin','registry-draft',{unit:initial.p.unit,type:'institution-authority',title:'Sentetik düzenleme yetkisi',fields:{...initial.p.responsibilities,pathway:initial.p.pathway,authorityReference:reason}});f.run('authority','registry-review',{recordId:authority.id,outcome:'accepted',reason});if(!process.argv.includes('--authority'))localAuthorityDossier(f,initial.p,authority);}
if(process.argv.includes('--quality')){
 const p=f.run('author','program',{...initial.p,code:'P02',title:'Yerel Araştırma Yöntemleri'});f.run('publisher','publish',{programId:p.id,reason:'Sentetik başvuru ve gösterge kaynağı incelemesi.'});
 const key=randomBytes(32),c={id:'local-quality',tenant:'gazi',unit:'engineering',programId:initial.p.id,subjects:{source:'student'},mode:'local-acceptance',key},a=new LocalLmsAdapter(f.s,c),raw=JSON.stringify({id:'quality-completion-1',contractId:c.id,tenant:'gazi',programId:c.programId,subject:'source',type:'completion',revision:1,completed:true,occurredAt:new Date().toISOString()});const event=a.accept(raw,createHmac('sha256',key).update(raw).digest('hex'));new LocalLmsWorker(a).run(event.id);
 const t=f.run('student','support',{unit:'engineering',category:'technical',subject:'Sentetik kaynak kontrolü',message:'Yerel gösterge için sentetik destek kaydı.'});f.run('it','support-event',{ticketId:t.id,expectedRevision:0,type:'resolve',message:'Sentetik destek kaynağı yerel kabulde çözüldü.'});
}
if(process.argv.includes('--privacy')||process.argv.includes('--retention')){const h=hash('privacy-expired-session');f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(h,'student','2020-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(h,'gazi','local-test','2019-01-01T00:00:00.000Z');}
if(process.argv.includes('--membership'))f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','reviewer');
if(process.argv.includes('--retention')){f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','reviewer');f.run('admin','registry-draft',{type:'data-flow',unit:'engineering',title:'Yerel oturum saklama sicili',fields:Object.fromEntries(registryFields['data-flow'].map(k=>[k,'Sentetik yerel sicil; gerçek kurum kararı değildir.']))});}
if(process.argv.includes('--recognition')){const p=f.run('admin','recognition-policy',localRecognitionPolicy);f.run('publisher','recognition-policy-review',{policyId:p.id,outcome:'accepted',reason:'Sentetik politika yalnız izole yerel kabul için incelendi.'});}
if(process.argv.includes('--operations')){
 const key=randomBytes(32),contract={id:'Yerel kabul kaynağı',tenant:'gazi',unit:'engineering',programId:initial.p.id,mode:'local-acceptance',subjects:{source:'student'},key};
 const adapter=new LocalLmsAdapter(f.s,contract);
 for(let i=1;i<=2;i++){const raw=JSON.stringify({id:'acceptance-event-0'+i,contractId:contract.id,tenant:'gazi',programId:initial.p.id,subject:'source',revision:i,type:'grade',taskId:'T1',content:'Sentetik öğrenme ürünü: gerçek öğrenci verisi içermez.',grade:80,occurredAt:new Date().toISOString()});const event=adapter.accept(raw,createHmac('sha256',key).update(raw).digest('hex'));
  if(i===2)new LocalLmsWorker(adapter,{beforeProcess(){throw Object.assign(Error('Sentetik kaynak hatası'),{code:'idempotency_conflict'});}}).run(event.id);
 }
}
for(const [person,role] of [['independent','instructor'],['finance','finance']]){
 f.s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run(person,'https://test-idp.invalid',person);
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('gazi',person,'engineering',JSON.stringify([role]),'2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(person),person,'2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(hash(person),'gazi','synthetic-fixture','2026-01-01T00:00:00.000Z');
}
if(process.argv.includes('--privacy-inventory')){
 const x=localPaymentSetup(f,{initial}),o=localPaymentOrder(f,x);localPaymentRun(f,o,'captured');
 const ticket=f.run('student','support',{unit:'engineering',category:'technical',subject:'Kayıt özeti denemesi',message:'Sentetik kayıt özetinde destek geçmişimi incelemek istiyorum.'});f.run('it','support-event',{ticketId:ticket.id,expectedRevision:0,type:'resolve',message:'Sentetik veri kapsamı incelemesi tamamlandı.'});
 const p=await localPortfolioSetup(f,{initial}),access=f.run('employer','portfolio-access',{grantId:p.grant.id,purpose:portfolioPurpose,confirm:true});f.run('employer','portfolio-feedback',{grantId:p.grant.id,purpose:portfolioPurpose,accessId:access.id,kind:'strength',message:portfolioReason});f.run('student','portfolio-revoke',{grantId:p.grant.id,confirm:true});
}
if(process.argv.includes('--login-cleanup')){seedLoginRequest(f);seedLoginRequest(f);seedLoginRequest(f,{status:'pending'});seedLoginRequest(f,{person:'other'});}
if(process.argv.includes('--wallet-study'))localWalletStudySetup(f,{initial,prepared:false});
if(process.argv.includes('--advice'))localAdviceSetup(f,{initial,prepared:false});
if(process.argv.includes('--portfolios'))await localPortfolioSetup(f,{initial,prepared:false});
if(process.argv.includes('--skill-maps'))localSkillMapSetup(f,{initial,prepared:false});
if(process.argv.includes('--capacity'))await localCapacitySetup(f,{initial,prepared:false});
if(process.argv.includes('--payments'))localPaymentSetup(f,{initial,seedOnly:true});
let localSigner=process.argv.includes('--replacement')?{base:initial.base,material:initial.material,keyring:[{state:'active',material:initial.material}]}:null;
if(process.argv.includes('--keys')){const pair=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'https://local-acceptance.invalid/api/rozet/anahtarlar#synthetic-browser'};localSigner={base:'https://local-acceptance.invalid',material:{privateKey:await importJWK(pair.privateKey.export({format:'jwk'}),'RS256'),jwk}};localSigner.keyring=[{state:'active',material:localSigner.material}];f.run('issuer','issue',{decisionId:initial.d.id});}
const root=fileURLToPath(new URL('../gazi/',import.meta.url));
const roles={author:'Program hazırlayan',publisher:'Program inceleyen',student:'Öğrenen',teacher:'İlk eğitici',independent:'Bağımsız eğitici',judge:'Akademik karar',issuer:'Belge yetkilisi',reviewer:'Kalite',admin:'Sicil yöneticisi',authority:'Bağımsız sicil yöneticisi',it:'Bilgi işlem',finance:'Mali işler',other:'Başka öğrenen'};
if(process.argv.includes('--capacity'))Object.assign(roles,Object.fromEntries(Object.entries(capacityActors).map(([person,role])=>[person,'İkinci birim · '+role+' · '+person])));
if(process.argv.includes('--portfolios')||process.argv.includes('--privacy-inventory'))Object.assign(roles,{employer:'Amaçlı portfolyo alıcısı',anotheremployer:'Başka portfolyo alıcısı'});
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=createServer(async(req,res)=>{
 try{
  const origin='http://'+req.headers.host;
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))return json(res,403,{error:'Yalnız yerel kabul.'});
  const url=new URL(req.url,origin);
  if(req.method==='POST'&&req.headers.origin!==origin)return json(res,403,{error:'Kaynak doğrulanamadı.'});
  let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>64000)return json(res,413,{error:'İstek çok büyük.'});}
  const b=raw?JSON.parse(raw):undefined;
  if(url.pathname==='/__acceptance/support-clock'&&req.method==='POST'&&supportClock!==null){
   if(!Number.isInteger(b?.minutes)||b.minutes<1||b.minutes>10080)return json(res,400,{error:'Geçerli ileri zaman aralığı gerekli.'});
   supportClock+=b.minutes*60000;return json(res,200,{now:new Date(supportClock).toISOString()});
  }
  if(url.pathname==='/__acceptance/actor'&&req.method==='POST'){
   if(!Object.hasOwn(roles,b?.actor))return json(res,400,{error:'Sentetik rol yok.'});
   res.setHeader('Set-Cookie','myys_acceptance_actor='+b.actor+'; HttpOnly; SameSite=Strict; Path=/');return json(res,200,{ok:true});
  }
  if(url.pathname==='/__acceptance/source-packet'&&req.method==='GET'&&sourceFixture){const revision=Number(url.searchParams.get('revision')||1),type=url.searchParams.get('type')||'grade';if(![1,2,3,4].includes(revision)||!['registration','grade','completion','license-revoked'].includes(type))return json(res,400,{error:'Sentetik sürüm yok.'});const payload=sourceFixture.payload({revision,submissionVersion:revision,type,...(type==='registration'?{registered:url.searchParams.get('registered')!=='false'}:{}),...(type==='completion'?{completed:url.searchParams.get('completed')!=='false'}:{})});return json(res,200,{format:'myys-source-upload/1',token:await sourceFixture.token(payload)});}
  if(url.pathname==='/__acceptance/public-key'&&req.method==='GET'&&localSigner)return json(res,200,localSigner.material.jwk);
  if(url.pathname==='/__acceptance'&&req.method==='GET'){
   res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<!doctype html><html lang="tr"><meta charset="UTF-8"><title>MYYS izole yerel kabul</title><body><h1>İzole yerel kabul · Gerçek hesap değil</h1><p>Yalnız sentetik kişiler ve geçici yerel kayıtlar.</p><label>Test senaryosu <select id="actor">${Object.entries(roles).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><button id="open">Senaryoyu aç</button><script>document.querySelector('#open').onclick=async()=>{const r=await fetch('/__acceptance/actor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:document.querySelector('#actor').value})});if(r.ok)location.href='/#/academic';};</script></body></html>`);
  }
  if(url.pathname.startsWith('/api/myys/')){
   const actor=(req.headers.cookie||'').match(/(?:^|; )myys_acceptance_actor=([a-z]+)(?:;|$)/)?.[1];
   if(url.pathname==='/api/myys/paylasim')return await myysRoute({req,path:url.pathname,b,sessionHash:null,json,res,core:f.core});
   if(!actor||!Object.hasOwn(roles,actor))return json(res,401,{error:'Yerel test senaryosunu seçin.'});
   return await myysRoute({req,path:url.pathname,b,sessionHash:hash(actor),json,res,core:f.core,signer:localSigner,sourceAdapter:sourceFixture?.adapter,recoveryService});
  }
  if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Yöntem desteklenmiyor.'});
  const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  // Only static presentation files, never source auth code, SQLite or package files.
  const ext=extname(path),types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv','.vtt':'text/vtt',...(url.pathname==='/data/reference.json'?{'.json':'application/json'}:{})};
  if(!path.startsWith(root)||!types[ext]||path.includes('/auth/')||path.includes('/portal/'))return json(res,404,{error:'Dosya yok.'});
  const content=await readFile(path);res.setHeader('Content-Type',types[ext]+'; charset=utf-8');res.end(req.method==='HEAD'?undefined:content);
 }catch(e){json(res,e.code==='ENOENT'?404:500,{error:'Yerel kabul isteği tamamlanamadı.'});}
});
server.listen(0,'127.0.0.1',()=>console.log('MYYS_LOCAL_ACCEPTANCE=http://127.0.0.1:'+server.address().port+'/__acceptance'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{f.close();process.exit(0);}));
