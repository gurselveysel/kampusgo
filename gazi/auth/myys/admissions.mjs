import {requireThat} from './store.mjs';
const member=(a,u,roles)=>a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const manages=(a,u)=>a.mfa&&member(a,u,['coordinator','studentAffairs']);
const reason=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
export function admissionsReplay(a,action,r){if(!['application','application-review','credential-receive'].includes(action))return false;requireThat(action==='application-review'?manages(a,r.unit)&&a.id!==r.owner:r.owner===a.id&&member(a,r.unit,['learner'])&&(action!=='credential-receive'||a.mfa),'forbidden','Bu işlem için güncel yetki gerekli.',403);return true;}
export function admissionsCommand({action,p,a,s,put,id,execute,core}){
 if(action==='application'){
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&member(a,program.unit,['learner'])&&s.list(a.tenant,'publication').some(r=>r.programId===program.id),'not_found','Başvuruya açık program bulunamadı.',404);
  requireThat(reason(p.reason),'reason','Başvuru açıklaması gerekli.');
  requireThat(!s.list(a.tenant,'enrollment').some(r=>r.owner===a.id&&r.programId===program.id)&&!s.list(a.tenant,'application').some(r=>r.owner===a.id&&r.programId===program.id),'duplicate','Bu sürümde kayıt veya başvuru zaten var.',409);
  return put('application',{id:id(),unit:program.unit,owner:a.id,programId:program.id,reason:p.reason,official:false});
 }
 if(action==='application-review'){
  const r=s.get(a.tenant,'application',p.applicationId);requireThat(r&&manages(a,r.unit)&&r.owner!==a.id,'not_found','Başvuru bulunamadı veya işlem yetkisi yok.',404);
  requireThat(['accepted','rejected'].includes(p.outcome)&&reason(p.reason),'application_review','İnceleme sonucu ve gerekçe gerekli.');
  requireThat(!s.list(a.tenant,'application-review').some(x=>x.applicationId===r.id),'duplicate','Başvuru zaten incelendi.',409);
  const enrollment=p.outcome==='accepted'?execute('enroll',{programId:r.programId,learnerId:r.owner}):null;
  return put('application-review',{id:id(),unit:r.unit,owner:r.owner,programId:r.programId,applicationId:r.id,outcome:p.outcome,reason:p.reason,enrollmentId:enrollment?.id||null,official:false});
 }
 if(action==='credential-receive'){
  const r=s.get(a.tenant,'issuance',p.issuanceId),d=r&&s.get(a.tenant,'decision',r.decisionId);
  requireThat(r&&r.owner===a.id&&member(a,r.unit,['learner'])&&a.mfa,'not_found','Kendi belge kaydınıza erişim gerekli.',404);
  requireThat(s.get(a.tenant,'signed',r.id)&&d&&core.decisionUsable(a,d)&&!s.list(a.tenant,'revocation').some(x=>x.issuanceId===r.id),'credential_blocked','Güncel ve imzalı yerel belge gerekli.',409);
  const old=s.list(a.tenant,'credential-receipt').find(x=>x.issuanceId===r.id);if(old)return old;
  requireThat(p.confirm===true,'receipt','Belgeyi teslim aldığınızı açıkça belirtin.');
  return put('credential-receipt',{id:id(),unit:r.unit,owner:a.id,programId:r.programId,issuanceId:r.id,kind:'owner-local-acknowledgement',externalAcceptance:false,official:false});
 }
 return null;
}
export function admissionsView(s,a){
 const applications=s.list(a.tenant,'application').filter(r=>r.owner===a.id&&member(a,r.unit,['learner'])||manages(a,r.unit)||a.mfa&&member(a,r.unit,['quality'])).map(r=>({...r,review:s.list(a.tenant,'application-review').find(x=>x.applicationId===r.id)||null,canReview:manages(a,r.unit)&&r.owner!==a.id}));
 const catalog=s.list(a.tenant,'program').filter(p=>member(a,p.unit,['learner'])&&s.list(a.tenant,'publication').some(r=>r.programId===p.id)).map(p=>({id:p.id,title:p.title,code:p.code,version:p.version,unit:p.unit,canApply:!s.list(a.tenant,'enrollment').some(r=>r.owner===a.id&&r.programId===p.id)&&!applications.some(r=>r.programId===p.id)}));
 return {applications,applicationCatalog:catalog};
}
