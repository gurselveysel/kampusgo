import {hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const actions=['recognition-basis','recognition-basis-review','recognition-basis-hold'];
const digest=r=>hash(stableStringify(r));
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const role=(a,u,list)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>list.includes(r)));
const active=(s,t,person,unit,roles,now)=>{const r=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(t,person,unit,now);return !!r&&JSON.parse(r.roles).some(x=>roles.includes(x));};
const get=(s,a,k,id,roles)=>{const r=s.get(a.tenant,k,id);requireThat(r&&role(a,r.unit,roles),'not_found','Tanıma kaynak kaydı bulunamadı veya erişilemiyor.',404);return r;};
const latest=(s,t,id)=>s.list(t,'recognition-basis').filter(b=>b.policyId===id).at(-1);
const review=(s,t,id)=>s.list(t,'recognition-basis-review').find(r=>r.basisId===id);
const held=(s,t,id)=>s.list(t,'recognition-basis-hold').some(h=>h.basisId===id);
const rolesFor=action=>action==='recognition-basis'?['admin']:action==='recognition-basis-review'?['commission']:['admin','quality'];
function dependencies(s,t,b,now){const p=s.get(t,'recognition-policy',b.policyId),r=s.get(t,'registry',b.registryId),v=s.get(t,'registry-review',b.registryReviewId);return !!p&&!!r&&!!v&&digest(p)===b.policyDigest&&digest(r)===b.registryDigest&&digest(v)===b.registryReviewDigest&&v.outcome==='accepted'&&active(s,t,b.createdBy,b.unit,['admin'],now)&&active(s,t,v.createdBy,b.unit,['admin'],now);}
export function recognitionBasisState(s,t,p,now){
 const b=latest(s,t,p.id);if(!b)return {status:p.basisRequired?'missing':'legacy-local-test',canRequest:!p.basisRequired,canCredit:!p.basisRequired,official:false};
 const r=review(s,t,b.id);let status=held(s,t,b.id)?'held':!r?'pending':r.outcome==='rejected'?'rejected':!dependencies(s,t,b,now)||!active(s,t,r.createdBy,b.unit,['commission'],now)||r.basisDigest!==digest(b)?'source-changed':b.validFrom>now.slice(0,10)||b.validUntil<now.slice(0,10)?'expired':'reviewed';
 const accepted=status==='reviewed',supported=b.remoteMeasure==='credit-units'&&b.exceptionRoute==='none';if(accepted&&!supported)status='manual-only';
 return {status,canRequest:accepted,canCredit:accepted&&supported,basisId:b.id,version:b.version,remoteMeasure:b.remoteMeasure,exceptionRoute:b.exceptionRoute,official:false};
}
export function requireRecognitionBasis(s,a,p,now,{credit=false}={}){
 const state=recognitionBasisState(s,a.tenant,p,now);requireThat(credit?state.canCredit:state.canRequest,'recognition_basis',credit?'Kaynak incelemesi bu kredi hesabını açmıyor; ölçü birimi veya istisna için ayrı kurum incelemesi gerekli.':'Güncel ve bağımsız incelenmiş tanıma kaynak dosyası gerekli.',409);
 if(!state.basisId)return {status:'legacy-local-test',official:false};const b=latest(s,a.tenant,p.id),r=review(s,a.tenant,b.id);
 return {basisId:b.id,basisDigest:digest(b),reviewId:r.id,reviewDigest:digest(r),registryId:b.registryId,registryDigest:b.registryDigest,remoteMeasure:b.remoteMeasure,exceptionRoute:b.exceptionRoute,official:false};
}
export function recognitionBasisReplay(a,action,r){if(!actions.includes(action))return false;requireThat(role(a,r.unit,rolesFor(action)),'forbidden','Bu kaynak işleminde güncel birim yetkisi ve çok faktörlü doğrulama gerekli.',403);return true;}
export function recognitionBasisCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;const t=a.tenant;
 if(action==='recognition-basis'){
  const policy=get(s,a,'recognition-policy',p.policyId,['admin']),registry=get(s,a,'registry',p.registryId,['admin']),rr=s.list(t,'registry-review').find(r=>r.recordId===registry.id);
  requireThat(registry.unit===policy.unit&&registry.type==='recognition-policy'&&registry.fields.creditPath===policy.pathway&&rr?.outcome==='accepted'&&active(s,t,rr.createdBy,policy.unit,['admin'],now),'recognition_registry','Aynı birimde ve tanıma yolunda bağımsız incelenmiş politika sicili gerekli.',409);
  requireThat(['credit-units','training-count','hours','unresolved'].includes(p.remoteMeasure)&&['none','rpl-mandatory-language','rpl-graduate-publication','rpl-inservice','previous-course'].includes(p.exceptionRoute),'recognition_basis_fields','Ölçü birimi ve istisna yolu açıkça seçilmeli.');
  requireThat(p.exceptionRoute==='none'&&policy.pathway!=='previous-course'||p.exceptionRoute.startsWith('rpl-')&&policy.pathway==='rpl'||p.exceptionRoute==='previous-course'&&policy.pathway==='previous-course','recognition_basis_fields','İstisna yolu politika kapsamıyla eşleşmeli.');
  for(const key of ['readScope','measureReason','exceptionEligibility','curriculumReference','priorCourseReference','authorityDecisionReference','reason'])requireThat(text(p[key]),'recognition_basis_fields','Kaynak kapsamı, ölçü birimi, istisna, müfredat, önceki ders ve yetkili karar açıklamaları gerekli.');
  requireThat(/^[a-f0-9]{64}$/.test(p.sourceDigest)&&date(p.readOn)&&p.readOn<=now.slice(0,10)&&date(p.validFrom)&&date(p.validUntil)&&p.validFrom<=p.validUntil&&p.validFrom>=policy.validFrom&&p.validUntil<=policy.validUntil&&p.validUntil>=now.slice(0,10),'recognition_basis_fields','Kaynak SHA-256 özeti, okuma tarihi ve politika içindeki geçerlilik aralığı gerekli.');
  const prev=latest(s,t,policy.id);requireThat((p.previousId??null)===(prev?.id??null)&&(!prev||text(p.changeReason)),'version_conflict','Güncel kaynak sürümü ve değişiklik gerekçesi gerekli.',409);
  const keys=['remoteMeasure','exceptionRoute','readScope','measureReason','exceptionEligibility','curriculumReference','priorCourseReference','authorityDecisionReference','sourceDigest','readOn','validFrom','validUntil','reason'];
  return put('recognition-basis',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,policyDigest:digest(policy),registryId:registry.id,registryDigest:digest(registry),registryReviewId:rr.id,registryReviewDigest:digest(rr),version:(prev?.version||0)+1,previousId:prev?.id||null,changeReason:prev?p.changeReason:null,source:{reference:policy.sourceReference,article:policy.sourceArticle,version:policy.sourceVersion,date:policy.sourceDate},...Object.fromEntries(keys.map(k=>[k,p[k]])),sourceFileStored:false,authenticityVerified:false,official:false});
 }
 const b=get(s,a,'recognition-basis',p.basisId,rolesFor(action));requireThat(text(p.reason),'reason','Kaynak incelemesi gerekçesi gerekli.');
 if(action==='recognition-basis-hold'){
  requireThat(latest(s,t,b.policyId)?.id===b.id&&review(s,t,b.id)?.outcome==='accepted'&&!held(s,t,b.id),'version_conflict','Güncel, incelenmiş ve durdurulmamış kaynak gerekli.',409);
  return put('recognition-basis-hold',{id:id(),unit:b.unit,owner:b.owner,basisId:b.id,reason:p.reason,previousCreditsReversed:false,official:false});
 }
 const policy=s.get(t,'recognition-policy',b.policyId),registry=s.get(t,'registry',b.registryId),rr=s.get(t,'registry-review',b.registryReviewId);
 requireThat(![b.createdBy,policy?.createdBy,registry?.createdBy,rr?.createdBy].includes(a.id),'separation','Kaynak, politika veya sicili hazırlayan/inceleyen kişi bu bağımsız incelemeyi yapamaz.',403);
 requireThat(latest(s,t,b.policyId)?.id===b.id&&!review(s,t,b.id)&&['accepted','rejected'].includes(p.outcome),'version_conflict','Güncel ve incelenmemiş kaynak sürümü gerekli.',409);
 const fields=['sourceRead','scopeChecked','denominatorChecked','exceptionChecked'];
 requireThat(p.outcome==='rejected'||fields.every(k=>p[k]===true)&&dependencies(s,t,b,now)&&b.validFrom<=now.slice(0,10)&&b.validUntil>=now.slice(0,10),'recognition_basis_review','Kaynak, kapsam, ölçü birimi ve istisna ayrı ayrı incelenmeli; süre ve görevler güncel olmalı.',409);
 return put('recognition-basis-review',{id:id(),unit:b.unit,owner:b.owner,basisId:b.id,basisDigest:digest(b),outcome:p.outcome,reason:p.reason,checks:Object.fromEntries(fields.map(k=>[k,p[k]===true])),official:false,legalAuthorityVerified:false});
}
export function recognitionBasisView(s,a,now){
 const visible=r=>role(a,r.unit,['admin','commission','quality','coordinator']);
 const bases=s.list(a.tenant,'recognition-basis').filter(visible).map(b=>{const p=s.get(a.tenant,'recognition-policy',b.policyId),r=review(s,a.tenant,b.id),registry=s.get(a.tenant,'registry',b.registryId),rr=s.get(a.tenant,'registry-review',b.registryReviewId);return {...b,review:r||null,current:latest(s,a.tenant,b.policyId)?.id===b.id,state:recognitionBasisState(s,a.tenant,p,now),held:held(s,a.tenant,b.id),canReview:role(a,b.unit,['commission'])&&![b.createdBy,p.createdBy,registry?.createdBy,rr?.createdBy].includes(a.id)};});
 return {bases,registries:s.list(a.tenant,'registry').filter(r=>role(a,r.unit,['admin'])&&r.type==='recognition-policy').map(r=>({...r,review:s.list(a.tenant,'registry-review').find(v=>v.recordId===r.id)||null}))};
}
