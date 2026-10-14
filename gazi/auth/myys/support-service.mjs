import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {validDay} from './appeal-policy-model.mjs';
import {supportCalendar,supportTargets} from './support-service-model.mjs';

const actions=['support-policy','support-policy-review','support-policy-hold'];
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const role=(a,u,r)=>!!a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Destek hizmet kuralı yalnız izole yerel kabulde çalışır.',503);
const digest=p=>hash(stableStringify(p));
const review=(s,t,id)=>s.list(t,'support-policy-review').find(r=>r.policyId===id);
const held=(s,t,id)=>s.list(t,'support-policy-hold').some(r=>r.policyId===id);
const today=now=>new Date(Date.parse(now)+3*3600000).toISOString().slice(0,10);
export function supportPolicyReplay(a,action,r){
 if(!actions.includes(action))return false;
 requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim destek hizmet kuralı kapalı.',503);
 requireThat(role(a,r.unit,action==='support-policy'?'admin':'quality'),'forbidden','Güncel birim hizmet kuralı yetkisi ve çok faktörlü oturum gerekli.',403);return true;
}
export function supportPolicyCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='support-policy'){
  requireThat(role(a,p.unit,'admin'),'forbidden','Kendi biriminizde yönetici yetkisi ve çok faktörlü oturum gerekli.',403);
  requireThat(p.scope==='local-acceptance'&&p.official===false,'support_policy_scope','Açık yerel prova kapsamı gerekli; resmî hizmet taahhüdü oluşturulmaz.');
  requireThat(text(p.title,5,160)&&text(p.reason)&&text(p.authorityReference),'support_policy','Başlık, gerekçe ve yerel yetki dayanağı gerekli.');
  const source=p.source;requireThat(source&&text(source.title,5)&&text(source.reference)&&text(source.version,3,100)&&validDay(source.date)&&source.date<=now.slice(0,10)&&text(source.readScope)&&source.officialApproval===false,'support_policy_source','Kaynak, sürüm, tarih, okunan kapsam ve resmî onay bulunmadığı kaydedilmeli.');
  const calendar=supportCalendar(p.calendar),targets=supportTargets(p.targets);requireThat(calendar.to>=today(now),'support_policy_expired','Geleceği kapsayan yerel takvim gerekli.');
  const versions=s.list(a.tenant,'support-policy').filter(r=>r.unit===p.unit),previous=versions.at(-1);
  requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'support_policy_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  return put('support-policy',{id:id(),unit:p.unit,owner:a.id,title:p.title,version:versions.length+1,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,calendar,targets,source:{title:source.title,reference:source.reference,version:source.version,date:source.date,readScope:source.readScope,officialApproval:false},authorityReference:p.authorityReference,reason:p.reason,scope:'local-acceptance',official:false});
 }
 const policy=s.get(a.tenant,'support-policy',p.policyId);requireThat(policy&&role(a,policy.unit,'quality'),'not_found','Yetkili birimde destek hizmet kuralı gerekli.',404);
 requireThat(a.id!==policy.createdBy,'separation','Hizmet kuralını hazırlayandan ayrı kalite incelemesi gerekli.',403);requireThat(text(p.reason),'support_policy_reason','Gerekçeli inceleme gerekli.');
 if(action==='support-policy-hold'){
  requireThat(review(s,a.tenant,policy.id)?.outcome==='accepted'&&!held(s,a.tenant,policy.id),'support_policy_changed','İncelenmiş ve durdurulmamış hizmet kuralı gerekli.',409);
  return put('support-policy-hold',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,policyDigest:digest(policy),reason:p.reason,existingTicketsChanged:false,official:false});
 }
 requireThat(s.list(a.tenant,'support-policy').filter(r=>r.unit===policy.unit).at(-1)?.id===policy.id&&!review(s,a.tenant,policy.id)&&['accepted','rejected'].includes(p.outcome),'support_policy_changed','Güncel, henüz incelenmemiş sürüm ve açık sonuç gerekli.',409);
 requireThat(p.outcome==='rejected'||policy.calendar.to>=today(now),'support_policy_expired','Süresi geçmiş hizmet kuralı kabul edilemez.',409);
 return put('support-policy-review',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,policyDigest:digest(policy),outcome:p.outcome,reason:p.reason,official:false});
}
export function bindSupportPolicy(s,t,unit,now){
 // A newer draft does not erase an existing accepted policy. A hold/expiry does not fall back to an older version.
 const day=today(now),chosen=s.list(t,'support-policy').filter(p=>p.unit===unit&&p.calendar.from<=day&&review(s,t,p.id)?.outcome==='accepted').at(-1);
 if(!chosen||held(s,t,chosen.id)||chosen.calendar.to<day)return null;
 const r=review(s,t,chosen.id);requireThat(r.policyDigest===digest(chosen),'support_policy_changed','Destek hizmet kuralı dayanağı eşleşmiyor.',409);
 return {id:chosen.id,version:chosen.version,digest:r.policyDigest,reviewId:r.id};
}
export function pinnedSupportPolicy(s,t,unit,binding){
 if(!binding)return null;const p=s.get(t,'support-policy',binding.id),r=p&&review(s,t,p.id);
 // Historical targets remain fixed after reviewer's role changes, hold, expiry, or a new version.
 return p&&p.unit===unit&&p.version===binding.version&&digest(p)===binding.digest&&r?.id===binding.reviewId&&r.outcome==='accepted'&&r.policyDigest===binding.digest?p:null;
}
export function supportPolicyView(s,a,now){
 return s.list(a.tenant,'support-policy').filter(p=>['admin','quality','it'].some(r=>role(a,p.unit,r))).map(p=>{
  const r=review(s,a.tenant,p.id),hold=held(s,a.tenant,p.id),current=s.list(a.tenant,'support-policy').filter(x=>x.unit===p.unit).at(-1)?.id===p.id,independent=role(a,p.unit,'quality')&&p.createdBy!==a.id;
  return {...p,review:r||null,held:hold,current,selectedForNewTickets:bindSupportPolicy(s,a.tenant,p.unit,now)?.id===p.id,canReview:independent&&current&&!r,canHold:independent&&r?.outcome==='accepted'&&!hold};
 });
}
