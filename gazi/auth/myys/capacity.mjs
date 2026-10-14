import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {cohortView} from './cohort.mjs';
const actions=['unit-capacity','unit-capacity-review','unit-capacity-hold'];
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const digest=x=>hash(stableStringify(x));
const latest=(s,t,u)=>s.list(t,'unit-capacity').filter(p=>p.unit===u).at(-1);
const review=(s,t,id)=>s.list(t,'unit-capacity-review').find(r=>r.capacityId===id);
const held=(s,t,id)=>s.list(t,'unit-capacity-hold').some(r=>r.capacityId===id);
export function unitUsage(s,t,u){return {enrollmentRecords:s.list(t,'enrollment').filter(r=>r.unit===u).length,queuedEvents:s.list(t,'lms-event').filter(r=>r.unit===u&&!s.get(t,'lms-receipt',r.id)).length};}
const bounds={enrollmentRecords:[1,2000],queuedEvents:[1,10000],batchRows:[1,100]};
function limits(input){requireThat(input&&Object.keys(input).length===3&&Object.entries(bounds).every(([key,[min,max]])=>Number.isInteger(input[key])&&input[key]>=min&&input[key]<=max),'capacity_limits','Kayıt, bekleyen kaynak ve toplu satır için geçerli yerel sınırlar gerekli.');return Object.fromEntries(Object.keys(bounds).map(k=>[k,input[k]]));}
function baseline(core,a,cohortId,now){const c=cohortView(core,a,now).find(c=>c.id===cohortId);requireThat(c?.opened,'capacity_baseline','İlk birimde güncel yerel grup kabulü gerekli; kurum açılışı varsayılmaz.',409);return {cohortId:c.id,unit:c.unit,programId:c.programId,programVersion:c.programVersion,revision:c.revision,memberCount:c.memberCount,completedChainCount:c.completedChainCount};}
const active=(s,t,p,now)=>review(s,t,p.id)?.outcome==='accepted'&&review(s,t,p.id).capacityDigest===digest(p)&&!held(s,t,p.id)&&p.validUntil>now;
export function guardUnitCapacity(s,t,u,kind,amount=1,{now=new Date().toISOString(),safetyClosure=false}={}){
 const p=latest(s,t,u);if(!p)return null; // Existing isolated pilot units keep their current behavior. No institutional capacity claim.
 const binding={capacityId:p.id,version:p.version,digest:digest(p),reviewId:review(s,t,p.id)?.id||null};
 if(kind==='queuedEvents'&&safetyClosure)return {...binding,exemption:'source-safety-closure'}; // Signed/authorized source revocation and registration cancellation must remain intakeable.
 requireThat(active(s,t,p,now),'capacity_closed','Bu birimde yeni kayıt alımı yerel kapasite incelemesini bekliyor.',409);
 requireThat(Number.isInteger(amount)&&amount>0&&Object.hasOwn(bounds,kind),'capacity_request','Geçerli kapasite isteği gerekli.');
 const used=kind==='batchRows'?0:unitUsage(s,t,u)[kind];requireThat(used+amount<=p.limits[kind],'capacity_exceeded','Bu birimin yerel kaynak kotası doldu; mevcut kayıtlar ve kabul edilmiş işler korunur.',429);return binding;
}
export function capacityReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Ölçekleme kabulü üretimde kapalı.',503);const required=action==='unit-capacity'?'admin':'quality';requireThat(role(a,r.unit,required)&&role(a,r.baselineUnit,required),'forbidden','İki birimde güncel ölçekleme inceleme görevi gerekli.',403);return true;}
export function capacityCommand({action,p,a,s,put,id,now,core}){
 if(!actions.includes(action))return null;requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Ölçekleme yalnız izole yerel kabulde çalışır.',503);
 if(action==='unit-capacity'){
  requireThat(role(a,p.unit,'admin'),'forbidden','Hedef birimde yönetici yetkisi gerekli.',403);
  const source=s.get(a.tenant,'cohort',p.baselineCohortId);requireThat(source&&role(a,source.unit,'admin')&&p.unit!==source.unit,'not_found','Farklı ilk birimde erişilebilir grup ve yönetici görevi gerekli.',404);
  requireThat(p.scope==='local-acceptance'&&p.official===false&&text(p.title,5,160)&&text(p.reason)&&text(p.authorityReference),'capacity_plan','Açık yerel kapsam, başlık, gerekçe ve yetki dayanağı gerekli.');
  requireThat(typeof p.validUntil==='string'&&Number.isFinite(Date.parse(p.validUntil))&&new Date(p.validUntil).toISOString()===p.validUntil&&Date.parse(p.validUntil)>Date.parse(now)&&Date.parse(p.validUntil)-Date.parse(now)<=366*86400000,'capacity_expiry','En çok 366 günlük açık yerel geçerlilik sonu gerekli.');
  const before=latest(s,a.tenant,p.unit);requireThat((before?.id||null)===(p.previousId||null)&&(!before||text(p.changeReason)),'capacity_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  const bound=baseline(core,a,p.baselineCohortId,now),quota=limits(p.limits),usage=unitUsage(s,a.tenant,p.unit);requireThat(Object.entries(usage).every(([k,n])=>n<=quota[k]),'capacity_below_usage','Yeni sınır mevcut kayıt veya kabul edilmiş olay sayısının altına inemez.',409);
  return put('unit-capacity',{id:id(),unit:p.unit,owner:a.id,title:p.title,version:(before?.version||0)+1,previousId:before?.id||null,changeReason:before?p.changeReason:null,baselineUnit:source.unit,baseline:bound,baselineDigest:digest(bound),limits:quota,usageAtPreparation:usage,validUntil:p.validUntil,reason:p.reason,authorityReference:p.authorityReference,scope:'local-acceptance',official:false,realUnitActivation:false});
 }
 const cap=s.get(a.tenant,'unit-capacity',p.capacityId);requireThat(cap&&role(a,cap.unit,'quality')&&role(a,cap.baselineUnit,'quality'),'not_found','İki birimde kalite inceleme yetkisi gerekli.',404);requireThat(a.id!==cap.createdBy,'separation','Ölçeklemeyi hazırlayandan ayrı inceleme gerekli.',403);requireThat(text(p.reason),'capacity_reason','Gerekçeli inceleme gerekli.');
 if(action==='unit-capacity-hold'){requireThat(review(s,a.tenant,cap.id)?.outcome==='accepted'&&!held(s,a.tenant,cap.id),'capacity_changed','Durdurulmamış kabul gerekli.',409);return put('unit-capacity-hold',{id:id(),unit:cap.unit,baselineUnit:cap.baselineUnit,owner:cap.owner,capacityId:cap.id,reason:p.reason,existingRightsChanged:false,acceptedWorkCancelled:false,official:false});}
 requireThat(latest(s,a.tenant,cap.unit)?.id===cap.id&&!review(s,a.tenant,cap.id)&&['accepted','rejected'].includes(p.outcome),'capacity_changed','Güncel incelenmemiş sürüm ve açık sonuç gerekli.',409);
 if(p.outcome==='accepted'){requireThat(cap.validUntil>now&&digest(baseline(core,a,cap.baseline.cohortId,now))===cap.baselineDigest,'capacity_baseline_changed','İlk grup dayanağı değişti; eski ölçekleme hazırlığı kabul edilemez.',409);const usage=unitUsage(s,a.tenant,cap.unit);requireThat(Object.entries(usage).every(([k,n])=>n<=cap.limits[k]),'capacity_below_usage','Kabul edilmiş işler yeni sınırın üzerinde; önce güncel hazırlık gerekir.',409);}
 return put('unit-capacity-review',{id:id(),unit:cap.unit,baselineUnit:cap.baselineUnit,owner:cap.owner,capacityId:cap.id,capacityDigest:digest(cap),baselineDigest:cap.baselineDigest,outcome:p.outcome,reason:p.reason,official:false,realUnitActivation:false});
}
export function capacityView(s,a,now){return s.list(a.tenant,'unit-capacity').filter(p=>['admin','quality','it'].some(r=>role(a,p.unit,r))).map(p=>{const full=['admin','quality'].some(r=>role(a,p.unit,r)&&role(a,p.baselineUnit,r)),r=review(s,a.tenant,p.id),current=latest(s,a.tenant,p.unit)?.id===p.id;const summary={id:p.id,unit:p.unit,title:p.title,version:p.version,limits:p.limits,validUntil:p.validUntil,scope:p.scope,official:false,realUnitActivation:false};return {...(full?p:summary),usage:unitUsage(s,a.tenant,p.unit),current,active:current&&active(s,a.tenant,p,now),held:held(s,a.tenant,p.id),review:full?r||null:r?{outcome:r.outcome}:null,canReview:full&&current&&!r&&role(a,p.unit,'quality')&&role(a,p.baselineUnit,'quality')&&a.id!==p.createdBy,canHold:full&&r?.outcome==='accepted'&&!held(s,a.tenant,p.id)&&role(a,p.unit,'quality')&&role(a,p.baselineUnit,'quality')&&a.id!==p.createdBy};});}
