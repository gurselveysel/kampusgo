// Local public source contract. Raw person mappings and private keys are excluded.
import {createPublicKey} from 'node:crypto';
import {hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=255;
export const sourceIso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const sourceFingerprint=j=>hash(stableStringify({kty:j.kty,n:j.n,e:j.e}));
const fields=['id','name','tenant','unit','programId','version','issuer','audience','courseId','sourceProgramVersion','sourceRubricVersion'];
export function validateSourceDescriptor(c){
 requireThat(c&&Object.keys(c).every(k=>[...fields,'format','mappingDigest','mappingCount','keys'].includes(k))&&c.format==='myys-source-contract/1'&&fields.every(k=>text(c[k]))&&/^[a-f0-9]{64}$/.test(c.mappingDigest)&&Number.isInteger(c.mappingCount)&&c.mappingCount>0&&c.mappingCount<=10000,'source_contract','Kaynak sözleşmesi ve kişi eşleme özeti gerekli.');
 let uri;try{uri=new URL(c.issuer);}catch{}requireThat(uri&&uri.origin===c.issuer&&uri.protocol==='https:'&&!uri.port&&uri.hostname.endsWith('.invalid'),'source_contract','Yalnız sentetik kaynak düzenleyicisi kabul edilir.');
 requireThat(Array.isArray(c.keys)&&c.keys.length>=1&&c.keys.length<=8,'source_contract','Sınırlı açık anahtar kaydı gerekli.');
 const seen=new Set();for(const k of c.keys){
  requireThat(k&&typeof k==='object'&&!Array.isArray(k),'source_contract','Açık anahtar kaydı nesne olmalı.');
  const j=k.jwk;requireThat(Object.keys(k).every(n=>['jwk','state','notBefore','notAfter','retiredAt'].includes(n))&&j&&Object.keys(j).every(n=>['kty','n','e','kid','alg','use'].includes(n))&&j.kty==='RSA'&&j.e==='AQAB'&&j.alg==='RS256'&&j.use==='sig'&&text(j.kid)&&j.kid.startsWith(c.issuer+'/keys#')&&!seen.has(j.kid)&&['active','retired','compromised'].includes(k.state)&&sourceIso(k.notBefore)&&sourceIso(k.notAfter)&&k.notBefore<k.notAfter,'source_contract','Kaynak açık anahtar profili geçersiz.');
  let key;try{key=createPublicKey({key:j,format:'jwk'});}catch{}requireThat(key?.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=2048&&key.asymmetricKeyDetails.modulusLength<=8192&&Buffer.from(j.n,'base64url').toString('base64url')===j.n,'source_contract','Kanonik kaynak RSA anahtarı 2048–8192 bit olmalı.');seen.add(j.kid);
  if(k.state==='retired')requireThat(sourceIso(k.retiredAt),'source_contract','Kaynak anahtarı emeklilik zamanı gerekli.');
 }
 return structuredClone(c);
}
export function sourceDescriptor(c){
 requireThat(c?.subjects&&typeof c.subjects==='object'&&!Array.isArray(c.subjects),'source_contract','Sunucuya ait kişi eşlemesi gerekli.');
 const descriptor={format:'myys-source-contract/1',...Object.fromEntries(fields.map(k=>[k,c[k]])),mappingDigest:hash(stableStringify(c.subjects)),mappingCount:Object.keys(c.subjects).length,keys:structuredClone(c.keys)};
 return validateSourceDescriptor(descriptor);
}
