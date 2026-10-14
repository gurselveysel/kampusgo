import {LocalAcceptanceStore,hash,requireThat} from './store.mjs';
import {stableStringify,programBaseline} from './program-model.mjs';
import {sourceDescriptor,validateSourceDescriptor,sourceFingerprint,sourceIso} from './source-contract.mjs';
const actions=['source-contract','source-contract-review','source-trust-state'];
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Kaynak güven sicili yalnız izole yerel kabulde çalışır.',503);
const rows=(s,t,k)=>s.list(t,k),contracts=(s,t)=>rows(s,t,'source-contract');
const latest=(s,t,id)=>contracts(s,t).filter(r=>r.descriptor.id===id).at(-1);
const review=(s,t,r)=>rows(s,t,'source-contract-review').find(x=>x.contractId===r.id);
export const sourceTrustDigest=r=>hash(stableStringify(r));
export function sourceLifecycle(s,t,r){return rows(s,t,'source-trust-state').filter(x=>x.unit===r.unit&&x.target==='contract'&&x.sourceId===r.descriptor.id).at(-1)||{state:'active',createdAt:null};}
export function sourceKeyLifecycle(s,t,r,k){return rows(s,t,'source-trust-state').filter(x=>x.unit===r.unit&&x.target==='key'&&x.fingerprint===sourceFingerprint(k.jwk)).at(-1)||{state:k.state,createdAt:k.retiredAt||null};}
const independent=(a,r)=>role(a,r.unit,['admin'])&&a.id!==r.createdBy;
export function sourceTrustReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim kaynak güven sicili kapalı.',503);requireThat(role(a,r.unit,action==='source-contract-review'?['admin']:['it']),'forbidden','Güncel birim görevi ve çok faktörlü oturum gerekli.',403);return true;}
export function sourceTrustCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='source-contract'){
  requireThat(role(a,p.descriptor?.unit,['it']),'forbidden','Bu birimde bilgi işlem görevi gerekli.',403);
  const d=validateSourceDescriptor(p.descriptor);requireThat(d.tenant===a.tenant,'source_scope','Kaynak sözleşmesi bu kuruma ait olmalı.',403);
  const program=s.get(a.tenant,'program',d.programId);requireThat(program&&program.unit===d.unit&&rows(s,a.tenant,'publication').some(x=>x.programId===program.id),'source_program','Yayımlanmış aynı birim programı gerekli.',404);
  requireThat(p.localOnly===true&&text(p.reason)&&text(p.sourceReference)&&text(p.mappingReference)&&sourceIso(p.validFrom)&&sourceIso(p.expiresAt)&&p.validFrom<p.expiresAt&&p.expiresAt>now,'source_fields','Yerel kapsam, kaynak/eşleme dayanağı ve geçerli tarih aralığı gerekli.');
  requireThat(d.keys.every(k=>k.state==='active'&&!k.retiredAt),'source_key_state','Yeni sözleşme açık anahtarları etkin başlangıçla kaydeder; kapanış ayrı sicil işlemidir.');
  const all=contracts(s,a.tenant),previous=latest(s,a.tenant,d.id);
  requireThat(previous?p.previousId===previous.id&&previous.unit===d.unit&&previous.descriptor.programId===d.programId&&previous.descriptor.issuer===d.issuer&&previous.descriptor.audience===d.audience&&previous.descriptor.courseId===d.courseId&&text(p.changeReason)&&sourceLifecycle(s,a.tenant,previous).state==='active':!p.previousId,'source_changed','Güncel önceki sürüm, aynı kapsam ve değişiklik gerekçesi gerekli; kapalı sözleşme yeniden açılamaz.',409);
  requireThat(!all.some(r=>r.descriptor.id!==d.id&&r.descriptor.issuer===d.issuer&&r.descriptor.audience===d.audience&&r.descriptor.courseId===d.courseId&&r.descriptor.programId===d.programId),'source_duplicate','Aynı kaynak/ders/program için mevcut sözleşme zincirini kullanın.',409);
  for(const k of d.keys)for(const r of all)for(const other of r.descriptor.keys){
   const fp=sourceFingerprint(k.jwk),op=sourceFingerprint(other.jwk);
   requireThat(k.jwk.kid!==other.jwk.kid||fp===op,'source_key_conflict','Aynı kaynak anahtar kimliği başka açık anahtarla kullanılamaz.',409);
   requireThat(fp!==op||r.unit===d.unit,'source_key_scope','Yerel kaynak anahtarı birimler arasında paylaştırılamaz.',409);
   if(fp===op)requireThat(sourceKeyLifecycle(s,a.tenant,r,other).state!=='compromised','source_key_closed','Riskli kaynak anahtarı yeni sürümde yeniden açılamaz.',409);
  }
  return put('source-contract',{id:id(),unit:d.unit,owner:a.id,descriptor:d,descriptorDigest:hash(stableStringify(d)),programDigest:hash(stableStringify(programBaseline(program))),revision:(previous?.revision||0)+1,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,reason:p.reason,sourceReference:p.sourceReference,mappingReference:p.mappingReference,validFrom:p.validFrom,expiresAt:p.expiresAt,official:false});
 }
 const r=typeof p.contractId==='string'&&s.get(a.tenant,'source-contract',p.contractId);requireThat(r&&role(a,r.unit,action==='source-contract-review'?['admin']:['it']),'not_found','Yetkili birimde kaynak sözleşmesi gerekli.',404);
 requireThat(p.basedOn===sourceTrustDigest(r)&&text(p.reason),'source_changed','Tam kaynak sürümü ve gerekçesi gerekli.',409);
 if(action==='source-contract-review'){
  requireThat(independent(a,r),'separation','Kaynak sözleşmesini hazırlayandan ayrı yönetici incelemeli.',403);
  requireThat(latest(s,a.tenant,r.descriptor.id)?.id===r.id&&!review(s,a.tenant,r)&&['accepted','rejected'].includes(p.outcome),'source_changed','Güncel ve henüz incelenmemiş sürüm gerekli.',409);
  requireThat(p.outcome!=='accepted'||r.expiresAt>now&&sourceLifecycle(s,a.tenant,r).state==='active'&&r.descriptor.keys.some(k=>sourceKeyLifecycle(s,a.tenant,r,k).state==='active'),'source_closed','Süresi bitmiş veya güveni kapalı sözleşme kabul edilemez.');
  return put('source-contract-review',{id:id(),unit:r.unit,owner:r.owner,contractId:r.id,contractDigest:p.basedOn,outcome:p.outcome,reason:p.reason,official:false});
 }
 requireThat(review(s,a.tenant,r)?.outcome==='accepted'&&['contract','key'].includes(p.target)&&text(p.incidentReference),'source_state','İncelenmiş kaynak, işlem hedefi ve olay dayanağı gerekli.');
 const k=p.target==='key'?r.descriptor.keys.find(k=>k.jwk.kid===p.kid):null;requireThat(p.target!=='key'||k,'source_key','Sözleşmedeki açık kaynak anahtarı gerekli.');
 const current=k?sourceKeyLifecycle(s,a.tenant,r,k):sourceLifecycle(s,a.tenant,r),terminal=k?'compromised':'revoked';
 requireThat(['active','retired'].includes(current.state)&&p.expectedState===current.state&&['retired',terminal].includes(p.state)&&p.state!==current.state,'source_changed','Kaynak güven durumu değişti; kapanış geri alınamaz.',409);
 return put('source-trust-state',{id:id(),unit:r.unit,owner:r.owner,contractId:r.id,sourceId:r.descriptor.id,target:p.target,kid:k?.jwk.kid||null,fingerprint:k?sourceFingerprint(k.jwk):null,state:p.state,previousState:current.state,reason:p.reason,incidentReference:p.incidentReference,academicRecordsChanged:false,official:false});
}
export function sourceAcceptTrust(s,c,kid,now){
 const r=latest(s,c.tenant,c.id),d=sourceDescriptor(c),k=r?.descriptor.keys.find(k=>k.jwk.kid===kid),v=r&&review(s,c.tenant,r);
 requireThat(r&&r.unit===c.unit&&r.descriptorDigest===hash(stableStringify(d))&&v?.outcome==='accepted'&&v.contractDigest===sourceTrustDigest(r)&&r.validFrom<=now&&now<r.expiresAt&&sourceLifecycle(s,c.tenant,r).state==='active'&&k&&sourceKeyLifecycle(s,c.tenant,r,k).state==='active','source_trust','Kaynağın güncel sürümü, ayrı incelemesi veya etkin güveni eksik.',409);
 return r;
}
export function sourceEventTrusted(s,t,event){
 if(!event?.sourceProof)return true;
 const p=event.sourceProof,r=typeof p.trustRecordId==='string'?s.get(t,'source-contract',p.trustRecordId):null,v=r&&review(s,t,r),k=r?.descriptor.keys.find(k=>k.jwk.kid===p.kid);
 if(!r||!k||!sourceIso(p.receivedAt)||r.unit!==event.unit||r.descriptor.id!==event.contractId||r.descriptor.programId!==event.programId||r.descriptor.issuer!==p.issuer||r.descriptor.version!==p.contractVersion||p.trustDigest!==sourceTrustDigest(r)||v?.outcome!=='accepted'||v.contractDigest!==p.trustDigest||v.createdAt>p.receivedAt||p.receivedAt<r.validFrom||p.receivedAt>=r.expiresAt)return false;
 const cs=sourceLifecycle(s,t,r),ks=sourceKeyLifecycle(s,t,r,k);
 return cs.state!=='revoked'&&ks.state!=='compromised'&&['active','retired'].includes(ks.state)&&(cs.state!=='retired'||p.receivedAt<=cs.createdAt)&&(ks.state!=='retired'||p.receivedAt<=ks.createdAt);
}
export function sourceTrustView(s,a,now){return contracts(s,a.tenant).filter(r=>role(a,r.unit,['it','admin'])).map(r=>{
 const v=review(s,a.tenant,r),life=sourceLifecycle(s,a.tenant,r),current=latest(s,a.tenant,r.descriptor.id)?.id===r.id;
 return {...r,digest:sourceTrustDigest(r),review:v||null,current,contractState:life.state,expired:now>=r.expiresAt,notYetValid:now<r.validFrom,keys:r.descriptor.keys.map(k=>({...k,fingerprint:sourceFingerprint(k.jwk),...sourceKeyLifecycle(s,a.tenant,r,k)})),canReview:current&&!v&&independent(a,r),canAcceptReview:r.expiresAt>now&&life.state==='active'&&r.descriptor.keys.some(k=>sourceKeyLifecycle(s,a.tenant,r,k).state==='active'),canChange:role(a,r.unit,['it'])&&v?.outcome==='accepted',canRevise:current&&role(a,r.unit,['it'])&&life.state==='active'};
});}
