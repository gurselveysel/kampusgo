import {signingKey,trustedSignedKey,credentialBlocked,keyFingerprint} from './key-registry.mjs';
import {issuanceProfile} from './credential-profile.mjs';
import {stableStringify} from './program-model.mjs';
import {makeCredential,LEARNERS} from '../lib/badge-model.mjs';
import {signCredential,verifyCredential,digest} from '../lib/badge-service.mjs';
import {requireThat,hash} from './store.mjs';
import {decodeProtectedHeader} from 'jose';

const permitted=(actor,unit)=>actor.mfa&&actor.memberships.some(m=>m.unit===unit&&m.roles.includes('studentAffairs'));
function ready(core,context,issuanceId){
 const s=core.store,a=s.principal(context.sessionHash,context.tenant,core.clock()),r=s.get(a.tenant,'issuance',issuanceId);
 requireThat(r&&permitted(a,r.unit),'forbidden','Bu birimde belge imzalama yetkisi yok.',403);
 const d=s.get(a.tenant,'decision',r.decisionId),p=s.get(a.tenant,'program',r.programId);
 requireThat(![d.owner,d.createdBy,p.createdBy].includes(a.id),'separation','Belge imzalayan görevler ayrılığını sağlamalı.',403);
 requireThat(p.mode==='pilot'&&p.pathway==='micro'&&d.outcome==='approved'&&core.decisionUsable(a,d)&&!credentialBlocked(core,a.tenant,r),'decision_blocked','Karar veya ihraç yetkisi artık geçerli değil.');
 const profile=issuanceProfile(s,a,p,core.clock(),r.profileId);requireThat(r.profileId&&r.profileDigest===hash(stableStringify(profile)),'profile_changed','İhraç yetkisinin belge profili eşleşmiyor.',409);
 return {a,r,d,p,profile};
}
export function canSignApproved(core,context,id,material){try{const {a,r}=ready(core,context,id);if(core.store.get(a.tenant,'signed',id))return false;signingKey(core.store,a.tenant,r.unit,material);return true;}catch{return false;}}
export async function signApproved(core,context,issuanceId,material,base){
 requireThat(base==='https://local-acceptance.invalid','local_only','Yerel kabul imzası gerçek kurum adresi kullanamaz.',503);
 const prepared=core.store.transaction(()=>{
  const {a,r,d,p}=ready(core,context,issuanceId),existing=core.store.get(a.tenant,'signed',r.id);
  if(existing)return {existing};
  const key=signingKey(core.store,a.tenant,r.unit,material);
  const date=new Date(Math.floor(Date.parse(core.clock())/1000)*1000).toISOString();
  const draft={id:'universite',learner:LEARNERS[0].id,title:p.title,hours:p.hours,ects:p.ects,level:p.level,participation:p.participation,outcomes:p.outcomes.map(o=>o.text).join('\n'),assessment:p.assessmentMethod,criteria:`Rubrik puanı en az ${p.threshold}/100; zorunlu görev kanıtları ve bağımsız akademik karar.`,quality:p.quality,evidence:'İzole yerel kabul değerlendirmesi; gerçek kurum belgesi değildir.'};
  const vc=makeCredential(draft,{id:r.id,index:0,base,date});
  vc.credentialSubject.id='urn:unigo:local-acceptance:'+encodeURIComponent(a.tenant)+':'+encodeURIComponent(r.owner);
  vc.pilotMetadata.learner='Yerel kabul öğreneni · '+r.owner;
  vc.credentialStatus.id=base+'/api/rozet/durum#0';
  // This isolated store has no public status-list endpoint. Do not promise one.
  delete vc.credentialStatus;
  vc['@context'].push({academicDecision:{'@id':base+'/vocab/academicDecision','@type':'@json'}});
  vc.academicDecision={id:d.id,programVersion:p.version,assessmentId:d.assessmentId,scope:'local-acceptance',profileId:r.profileId,profileVersion:r.profileVersion,authorityId:r.authorityId,profileDigest:r.profileDigest};
  return {vc,a,r,d,date,key};
 });
 if(prepared.existing)return prepared.existing;
 const jwt=await signCredential(prepared.vc,material);
 requireThat(jwt.length<=24000,'credential_size','Belge metni doğrulama sınırını aşıyor; içerik kısaltılarak yeni akademik sürüm hazırlanmalı.',422);
 // Signature is not released if membership, appeal or revocation changed while signing.
 return core.store.transaction(()=>{
  const {a,r,d}=ready(core,context,issuanceId),existing=core.store.get(a.tenant,'signed',r.id);if(existing)return existing;
  const key=signingKey(core.store,a.tenant,r.unit,material);requireThat(key.id===prepared.key.id,'signing_key','İmzalama sırasında anahtar değişti.',409);
  requireThat(d.id===prepared.d.id,'decision_changed','Karar değişti.',409);
  const record={id:r.id,unit:r.unit,owner:r.owner,decisionId:d.id,credential:prepared.vc,jwt,digest:digest(jwt),createdAt:core.clock(),createdBy:a.id,keyId:key.id,kid:key.jwk.kid,keyFingerprint:key.fingerprint,pilot:true,scope:'local-acceptance'};
  core.store.put(a.tenant,'signed',record);
  core.store.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'sign',r.id,core.clock());
  return record;
 });
}
export async function verifyApproved(core,context,jwt,material,base){
 core.store.principal(context.sessionHash,context.tenant,core.clock());
 const lookup=id=>{
  const actor=core.store.principal(context.sessionHash,context.tenant,core.clock());
  const r=core.store.get(actor.tenant,'signed',id);if(!r)return null;
  requireThat(r.owner===actor.id&&actor.memberships.some(m=>m.unit===r.unit)||permitted(actor,r.unit),'forbidden','Bu belge size ait değil.',403);
  const d=core.store.get(actor.tenant,'decision',r.decisionId);
  if(!trustedSignedKey(core.store,actor.tenant,r)||r.keyFingerprint!==keyFingerprint(material.jwk))return null;
  const blocked=credentialBlocked(core,actor.tenant,core.store.get(actor.tenant,'issuance',r.id));
  return {...r,revoked_at:blocked?core.clock():null};
 };
 const result=await verifyCredential(jwt,material,base,lookup);
 if(result.valid){const current=lookup(result.id);if(!current||current.revoked_at)return {valid:false,error:'Belgenin güven veya akademik durumu doğrulama sırasında değişti.'};}
 return result;
}

// Keys come only from the server's trusted registry, never a credential URL.
export async function verifyWithKeyring(core,context,jwt,keyring,base){
 let header;try{header=decodeProtectedHeader(jwt);}catch{return {valid:false,error:'İmzalı belge okunamadı.'};}
 const trusted=keyring.find(k=>k.material.jwk.kid===header.kid);
 if(!trusted||trusted.state==='compromised'||!['active','retired'].includes(trusted.state))return {valid:false,error:'İmza anahtarı güvenilir değil.'};
 return verifyApproved(core,context,jwt,trusted.material,base);
}

export function prepareBatch(core,context,rows){
 requireThat(Array.isArray(rows)&&rows.length>0&&rows.length<=100,'batch','Toplu işlem 1–100 satır olmalı.');
 const results=rows.map((row,index)=>{
  try{requireThat(row&&typeof row==='object','batch_row','Satır biçimi geçersiz.');const record=core.run({...context,commandId:row.commandId,action:'issue',input:{decisionId:row.decisionId}});return {row:index+1,status:'prepared',id:record.id};}
  catch(e){if(!e.code)throw e;return {row:index+1,status:'rejected',code:e.code,error:e.message};}
 });
 return {received:rows.length,prepared:new Set(results.filter(x=>x.status==='prepared').map(x=>x.id)).size,signed:0,results};
}
