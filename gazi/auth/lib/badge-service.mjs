import {createHash,randomUUID} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {SignJWT,importJWK,jwtVerify,decodeProtectedHeader} from 'jose';
import {makeCredential,validateDraft,ISSUER_NAME,FIELDS} from './badge-model.mjs';
export const digest=t=>createHash('sha256').update(t).digest('hex');
export const baseURL=()=>process.env.VERCEL_ENV==='production'?'https://gazi.unigoturkiye.com':'https://'+(process.env.VERCEL_URL||'preview.invalid');
export function publicJwk(jwk){return {kty:jwk.kty,n:jwk.n,e:jwk.e,alg:'RS256',use:'sig',kid:jwk.kid};}
export async function signingMaterial(){
 const jwk=JSON.parse(process.env.GAZI_BADGE_SIGNING_JWK||'null');
 if(!jwk?.d||!jwk.kid)throw Error('signing unavailable');
 return {privateKey:await importJWK(jwk,'RS256'),jwk:{...publicJwk(jwk),kid:baseURL()+'/api/rozet/anahtarlar#'+jwk.kid}};
}
export async function signCredential(vc,material){
 const payload={...vc,iss:typeof vc.issuer==='string'?vc.issuer:vc.issuer.id,jti:vc.id,sub:vc.credentialSubject.id,nbf:Math.floor(Date.parse(vc.validFrom)/1000)};
 if(vc.validUntil)payload.exp=Math.floor(Date.parse(vc.validUntil)/1000);
 return new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:material.jwk.kid,typ:'JWT'}).sign(material.privateKey);
}
export async function verifyCredential(token,material,base,lookup){
 if(typeof token!=='string'||token.length>24000||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token))return {valid:false,error:'İmzalı .jwt rozeti bekleniyor.'};
 let p;try{
  const h=decodeProtectedHeader(token);if(h.alg!=='RS256'||h.kid!==material.jwk.kid||h.jwk||h.jku||h.x5u)throw Error();
  ({payload:p}=await jwtVerify(token,await importJWK(material.jwk,'RS256'),{algorithms:['RS256'],issuer:base+'/api/rozet/kurum',clockTolerance:2}));
  if(!FIELDS.every(([k])=>typeof p.pilotMetadata?.[k]==='string'&&p.pilotMetadata[k].trim())||!p.type?.includes('OpenBadgeCredential')||!p.pilotMetadata?.pilot||p.jti!==p.id||p.sub!==p.credentialSubject?.id||p.nbf!==Math.floor(Date.parse(p.validFrom)/1000)||p.issuer?.id!==p.iss)throw Error();
 }catch{return {valid:false,error:'İmza, üretici veya geçerlilik zamanı doğrulanamadı. Dosya değiştirilmiş ya da farklı bir üreticiye ait olabilir.'};}
 const uuid=p.id.slice((base+'/api/rozet/kayit/').length);
 if(!p.id.startsWith(base+'/api/rozet/kayit/')||!/^[a-f0-9-]{36}$/.test(uuid))return {valid:false,error:'Belge kimliği geçersiz.'};
 const r=await lookup(uuid);
 if(!r||r.digest!==digest(token))return {valid:false,error:'Belge sunucu sicilinde eşleşmedi.'};
 if(r.revoked_at)return {valid:false,revoked:true,error:'Bu pilot rozet iptal edilmiş.',revokedAt:r.revoked_at};
 return {valid:true,credential:p,id:uuid,digest:r.digest,checkedAt:new Date().toISOString()};
}
export function encodedStatus(indices){const bits=Buffer.alloc(16384);for(const i of indices){if(!Number.isInteger(i)||i<0||i>=131072)throw Error('index');bits[Math.floor(i/8)]|=1<<(7-i%8);}return 'u'+gzipSync(bits).toString('base64url');}
export async function badgeRoute({req,path,b,store,json,res,sessionHash}){
 if(req.method==='GET'&&path==='/api/rozet/gorsel.svg'){
  res.statusCode=200;res.setHeader('Content-Type','image/svg+xml');return res.end('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360"><defs><linearGradient id="m" x2="1" y2="1"><stop stop-color="#f0f7ff"/><stop offset=".4" stop-color="#719ed1"/><stop offset=".7" stop-color="#e4f2ff"/><stop offset="1" stop-color="#5b86b7"/></linearGradient><radialGradient id="b" cx=".3" cy=".2"><stop stop-color="#436f9e"/><stop offset="1" stop-color="#102e50"/></radialGradient></defs><path d="m92 260 65 13-15 77-30-23-32 7zM228 260l-65 13 15 77 30-23 32 7z" fill="url(#m)"/><path d="m160 15 115 58 25 138-73 80H93l-73-80L45 73z" fill="url(#m)"/><path d="m160 30 103 52 22 124-65 71H100l-65-71L57 82z" fill="url(#b)"/><circle cx="160" cy="130" r="47" fill="none" stroke="#dceeff" stroke-width="3"/><path d="m160 98 9 20 22 3-16 16 4 23-19-11-19 11 4-23-16-16 22-3z" fill="#e5f3ff"/><text x="160" y="207" fill="white" font-family="Arial,sans-serif" font-size="25" font-weight="700" text-anchor="middle">ÜniGO</text><text x="160" y="234" fill="#b8d4f1" font-family="Arial,sans-serif" font-size="12" letter-spacing="4" text-anchor="middle">PİLOT ROZET</text></svg>');
 }
 const base=baseURL(),material=await signingMaterial();
 if(req.method==='GET'&&path==='/api/rozet/anahtarlar')return json(res,200,{keys:[material.jwk]});
 if(req.method==='GET'&&path==='/api/rozet/kurum')return json(res,200,{'@context':['https://www.w3.org/ns/credentials/v2','https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'],id:base+'/api/rozet/kurum',type:['Profile'],name:ISSUER_NAME,url:base,description:'Yalnız sentetik pilot belgeleri üretir. Resmî Gazi veya MEB belgesi değildir.',publicKey:base+'/api/rozet/anahtarlar'});
 if(req.method==='GET'&&path==='/api/rozet/durum'){
  const rows=await store('badge_status');const date=new Date(Math.floor(Date.now()/1000)*1000).toISOString();
  const vc={'@context':['https://www.w3.org/ns/credentials/v2'],id:base+'/api/rozet/durum',type:['VerifiableCredential','BitstringStatusListCredential'],issuer:base+'/api/rozet/kurum',validFrom:date,validUntil:new Date(Date.parse(date)+300000).toISOString(),credentialSubject:{id:base+'/api/rozet/durum#liste',type:'BitstringStatusList',statusPurpose:'revocation',encodedList:encodedStatus(rows.indices),ttl:60000}};
  res.statusCode=200;res.setHeader('Content-Type','application/vc+jwt');return res.end(await signCredential(vc,material));
 }
 if(!sessionHash)return json(res,401,{error:'Oturumunuz sona erdi.'});
 if(req.method==='GET'&&path==='/api/rozet/liste')return json(res,200,await store('badge_list',{hash:sessionHash}));
 if(req.method==='GET'&&/^\/api\/rozet\/kayit\/[a-f0-9-]{36}$/.test(path)){
  const row=await store('badge_get',{hash:sessionHash,id:path.split('/').pop()});return json(res,row.record?200:404,row.record||{error:'Kayıt bulunamadı.'});
 }
 if(req.method!=='POST')return json(res,405,{error:'İzin verilmeyen işlem.'});
 if(!(await store('badge_limit',{hash:sessionHash})).allowed)return json(res,429,{error:'İşlem sınırına ulaşıldı. Bir dakika sonra deneyin.'});
 if(path==='/api/rozet/uret'){
  const errors=validateDraft(b?.draft);if(Object.keys(errors).length)return json(res,422,{error:'Eksik veya tutarsız bilgileri tamamlayın.',fields:errors});
  if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))return json(res,400,{error:'İşlem kimliği geçersiz.'});
  const existing=await store('badge_get',{hash:sessionHash,id:b.requestId});if(existing.record)return json(res,200,existing.record);
  const {index}=await store('badge_index',{hash:sessionHash});
  const date=new Date(Math.floor(Date.now()/1000)*1000).toISOString();
  const credential=makeCredential(b.draft,{id:b.requestId,index,base,date}),jwt=await signCredential(credential,material);
  if(jwt.length>24000)return json(res,422,{error:'Belge metni çok uzun. Öğrenme çıktıları ve açıklamaları kısaltın.'});
  const record={id:b.requestId,index,title:credential.name,learner:credential.pilotMetadata.learner,created_at:date,credential,jwt,digest:digest(jwt)};
  return json(res,201,await store('badge_create',{hash:sessionHash,record}));
 }
 if(path==='/api/rozet/dogrula')return json(res,200,await verifyCredential(b?.jwt,material,base,async id=>(await store('badge_get',{hash:sessionHash,id})).record));
 if(path==='/api/rozet/iptal'&&/^[a-f0-9-]{36}$/.test(b?.id||''))return json(res,200,await store('badge_revoke',{hash:sessionHash,id:b.id}));
 return json(res,404,{error:'İşlem bulunamadı.'});
}
