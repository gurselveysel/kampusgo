import {isLocalSqlAcademicStore} from './academic-sql-store.mjs';
import {createPublicKey} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
export const localIssuer='https://local-acceptance.invalid/api/rozet/kurum';
const actions=['key-register','key-review','key-state'];
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Anahtar sicili yalnız izole yerel kabulde çalışır.',503);
export function keyFingerprint(j){return hash(stableStringify({e:j.e,kty:j.kty,n:j.n}));}
export function keyStatus(s,t,k){
 const review=s.list(t,'key-review').find(r=>r.keyId===k.id),changes=s.list(t,'key-state').filter(r=>r.keyId===k.id);
 return {state:changes.at(-1)?.state||(review?.outcome==='accepted'?'active':review?.outcome==='rejected'?'rejected':'pending'),review,changes};
}
function publicKey(j){
 requireThat(j&&typeof j==='object'&&!Array.isArray(j)&&Object.keys(j).every(k=>['kty','n','e','kid','alg','use'].includes(k))&&j.kty==='RSA'&&j.e==='AQAB'&&(!j.alg||j.alg==='RS256')&&(!j.use||j.use==='sig')&&typeof j.n==='string'&&/^[A-Za-z0-9_-]{342,1366}$/.test(j.n)&&typeof j.kid==='string'&&/^https:\/\/local-acceptance\.invalid\/api\/rozet\/anahtarlar#[A-Za-z0-9_-]{3,80}$/.test(j.kid),'public_key','Yalnız yerel adresli RS256 açık JWK kabul edilir; özel anahtar alanı gönderilemez.');
 let key;try{key=createPublicKey({key:j,format:'jwk'});}catch{requireThat(false,'public_key','Açık anahtar okunamadı.');}
 requireThat(key.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=2048&&key.asymmetricKeyDetails.modulusLength<=8192&&Buffer.from(j.n,'base64url').toString('base64url')===j.n,'public_key','RSA anahtarı 2048–8192 bit ve kanonik biçimde olmalı.');
 return {kty:'RSA',n:j.n,e:j.e,kid:j.kid,alg:'RS256',use:'sig'};
}
export function keyReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel anahtar işlemi üretimde kapalı.',503);requireThat(role(a,r.unit,action==='key-review'?['admin']:['it']),'forbidden','Güncel anahtar görevi ve çok faktörlü doğrulama gerekli.',403);return true;}
export function keyCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;requireThat((s instanceof LocalAcceptanceStore||isLocalSqlAcademicStore(s))&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Anahtar sicili yalnız izole yerel kabulde çalışır.',503);
 if(action==='key-register'){
  requireThat(role(a,p.unit,['it']),'forbidden','Bu birimde anahtar hazırlama yetkisi gerekli.',403);
  requireThat(p.mode==='local-acceptance'&&p.issuer===localIssuer&&text(p.reason)&&text(p.custodyReference),'key_fields','Yerel düzenleyici, anahtar sorumluluğu dayanağı ve gerekçe gerekli.');
  requireThat(s.list(a.tenant,'key').filter(k=>k.unit===p.unit).length<100,'key_capacity','Yerel birim anahtar kapasitesine ulaşıldı.',409);
  const jwk=publicKey(p.publicJwk),fingerprint=keyFingerprint(jwk);
  requireThat(!s.list(a.tenant,'key').some(k=>k.jwk.kid===jwk.kid||k.fingerprint===fingerprint),'duplicate','Anahtar veya kimliği bu kurum sicilinde zaten var.',409);
  const replaced=p.replacesId?s.get(a.tenant,'key',p.replacesId):null;
  requireThat(!p.replacesId||replaced&&replaced.unit===p.unit&&keyStatus(s,a.tenant,replaced).review?.outcome==='accepted','key_previous','Önceki anahtar aynı birimde incelenmiş olmalı.');
  return put('key',{id:id(),unit:p.unit,owner:a.id,jwk,fingerprint,issuer:localIssuer,replacesId:replaced?.id||null,reason:p.reason,custodyReference:p.custodyReference,privateKeyStored:false,official:false,scope:'local-acceptance'});
 }
 const k=s.get(a.tenant,'key',p.keyId);requireThat(k&&role(a,k.unit,action==='key-review'?['admin']:['it']),'not_found','Yetkili birimde anahtar bulunamadı.',404);
 const status=keyStatus(s,a.tenant,k);requireThat(text(p.reason),'key_fields','Anahtar işlemi gerekçesi gerekli.');
 if(action==='key-review'){
  requireThat(k.createdBy!==a.id,'separation','Anahtarı hazırlayandan ayrı yönetici incelemeli.',403);
  requireThat(!status.review&&['accepted','rejected'].includes(p.outcome),'key_changed','Anahtar incelemesi zaten var veya sonucu geçersiz.',409);
  return put('key-review',{id:id(),unit:k.unit,owner:k.owner,keyId:k.id,outcome:p.outcome,reason:p.reason,official:false});
 }
 requireThat(status.review?.outcome==='accepted'&&['active','retired'].includes(status.state)&&['retired','compromised'].includes(p.state)&&p.state!==status.state&&p.expectedState===status.state,'key_changed','Güncel anahtar durumu değişti; ele geçirilmiş anahtar yeniden açılamaz.',409);
 requireThat(text(p.incidentReference),'key_fields','Rotasyon veya olay kaydı dayanağı gerekli.');
 return put('key-state',{id:id(),unit:k.unit,owner:k.owner,keyId:k.id,state:p.state,previousState:status.state,reason:p.reason,incidentReference:p.incidentReference,academicRecordsChanged:false,official:false});
}
export function signingKey(s,t,unit,material){
 local(s);const j=material?.jwk,k=s.list(t,'key').find(k=>k.unit===unit&&k.jwk.kid===j?.kid);
 requireThat(k&&k.fingerprint===keyFingerprint(j)&&keyStatus(s,t,k).state==='active','signing_key','Bağımsız incelenmiş, etkin ve eşleşen yerel imza anahtarı gerekli.',409);return k;
}
export function trustedSignedKey(s,t,r){
 if(!r)return true;const k=s.get(t,'key',r.keyId);if(!k||k.unit!==r.unit||k.jwk.kid!==r.kid||k.fingerprint!==r.keyFingerprint||k.issuer!==r.credential?.issuer?.id)return false;
 const status=keyStatus(s,t,k);return status.review?.outcome==='accepted'&&r.createdAt>=status.review.createdAt&&(status.state==='active'||status.state==='retired'&&r.createdAt<=status.changes.find(c=>c.state==='retired').createdAt);
}
export function credentialBlocked(core,t,r){
 const s=core.store,d=s.get(t,'decision',r.decisionId);return !d||d.outcome!=='approved'||!core.decisionUsable({tenant:t},d)||s.list(t,'revocation').some(x=>x.issuanceId===r.id)||!trustedSignedKey(s,t,s.get(t,'signed',r.id));
}
export function keyView(s,a){
 return s.list(a.tenant,'key').filter(k=>role(a,k.unit,['it','admin','studentAffairs','quality'])).map(k=>{const status=keyStatus(s,a.tenant,k);return {...k,...status,canReview:role(a,k.unit,['admin'])&&a.id!==k.createdBy&&!status.review,canChange:role(a,k.unit,['it'])&&['active','retired'].includes(status.state)};});
}
