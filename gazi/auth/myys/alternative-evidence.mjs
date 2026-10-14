import {isLocalSqlAcademicStore} from './academic-sql-store.mjs';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {programBaseline,stableStringify} from './program-model.mjs';
import {alternativeMethods} from './alternative-evidence-model.mjs';
const actions=['alternative-evidence','evidence-moderate'];
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const activeRole=(s,t,person,u,r,now)=>{const m=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(t,person,u,now);return !!(m&&JSON.parse(m.roles).includes(r));};
const review=(s,t,e)=>s.list(t,'evidence-moderation').find(r=>r.evidenceId===e.id);
const alternatives=(s,t,e)=>s.list(t,'evidence').filter(r=>r.source==='alternative-local'&&r.enrollmentId===e.enrollmentId&&r.taskId===e.taskId);
export const alternativeDigest=e=>hash(stableStringify({id:e.id,enrollmentId:e.enrollmentId,programId:e.programId,taskId:e.taskId,sha256:e.sha256,alternative:e.alternative}));
function accepted(s,t,e){const r=review(s,t,e);return r?.outcome==='accepted'&&r.evidenceDigest===alternativeDigest(e)&&hash(e.content)===e.sha256?r:null;}
const independent=(s,a,e)=>role(a,e.unit,'quality')&&![e.owner,e.createdBy,s.get(a.tenant,'program',e.programId)?.createdBy].includes(a.id);
export function alternativeReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim alternatif ölçme yolu kapalı.',503);requireThat(role(a,r.unit,action==='alternative-evidence'?'instructor':'quality'),'forbidden','Güncel alternatif ölçme görevi ve çok faktörlü oturum gerekli.',403);return true;}
export function alternativeCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;requireThat((s instanceof LocalAcceptanceStore||isLocalSqlAcademicStore(s))&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Alternatif ölçme yalnız izole yerel kabulde çalışır.',503);
 if(action==='alternative-evidence'){
  const e=typeof p.enrollmentId==='string'&&s.get(a.tenant,'enrollment',p.enrollmentId);requireThat(e&&role(a,e.unit,'instructor'),'not_found','Yetkili birimde öğrenen kaydı gerekli.',404);
  requireThat(e.owner!==a.id,'separation','Kendi alternatif kanıtınızı eğitici olarak hazırlayamazsınız.',403);
  requireThat(activeRole(s,a.tenant,e.owner,e.unit,'learner',now),'learner','Etkin öğrenen üyeliği gerekli.',409);
  const program=s.get(a.tenant,'program',e.programId);
  requireThat(program.tasks.some(t=>t.id===p.taskId)&&Object.hasOwn(alternativeMethods,p.method),'alternative_method','Görev ve tanımlı alternatif ölçme biçimi gerekli.');
  requireThat(text(p.content,20,20000)&&text(p.reason)&&text(p.sourceReference,12)&&text(p.methodReference,12),'alternative_fields','Gözlem/ürün içeriği, kanıt dayanağı, yöntem dayanağı ve gerekçe gerekli.');
  requireThat(typeof p.observedAt==='string'&&Number.isFinite(Date.parse(p.observedAt))&&new Date(p.observedAt).toISOString()===p.observedAt&&p.observedAt<=now,'alternative_time','Gelecekte olmayan açık gözlem zamanı gerekli.');
  requireThat(p.localOnly===true&&!p.verified&&!p.grade&&!p.passed&&!p.source,'alternative_claim','Yalnız yerel inceleme kaydı oluşturulabilir; hazır başarı veya doğrulama beyanı kabul edilmez.');
  const previous=alternatives(s,a.tenant,{enrollmentId:e.id,taskId:p.taskId}).at(-1);
  requireThat(previous?p.previousEvidenceId===previous.id&&text(p.changeReason):!p.previousEvidenceId,'alternative_changed','Yeni kanıt sürümü güncel önceki sürüme ve değişiklik gerekçesine bağlanmalı.',409);
  return put('evidence',{id:id(),unit:e.unit,owner:e.owner,enrollmentId:e.id,programId:program.id,taskId:p.taskId,content:p.content,sha256:hash(p.content),source:'alternative-local',alternative:{method:p.method,methodReference:p.methodReference,sourceReference:p.sourceReference,observedAt:p.observedAt,reason:p.reason,version:(previous?.alternative.version||0)+1,previousEvidenceId:previous?.id||null,changeReason:previous?p.changeReason:null,programDigest:hash(stableStringify(programBaseline(program))),official:false}});
 }
 const e=typeof p.evidenceId==='string'&&s.get(a.tenant,'evidence',p.evidenceId);requireThat(e?.source==='alternative-local'&&role(a,e.unit,'quality'),'not_found','Yetkili birimde alternatif ölçme kanıtı gerekli.',404);
 requireThat(independent(s,a,e),'separation','Kanıt hazırlayan, öğrenen ve program hazırlayandan ayrı kalite incelemesi gerekli.',403);
 requireThat(activeRole(s,a.tenant,e.createdBy,e.unit,'instructor',now),'alternative_authority','Kanıt hazırlayanın güncel eğitici görevi gerekli.',409);
 requireThat(!review(s,a.tenant,e)&&alternatives(s,a.tenant,e).at(-1)?.id===e.id,'alternative_changed','Güncel ve henüz incelenmemiş kanıt sürümü gerekli.',409);
 requireThat(p.basedOn===alternativeDigest(e)&&hash(e.content)===e.sha256&&e.alternative.programDigest===hash(stableStringify(programBaseline(s.get(a.tenant,'program',e.programId)))),'alternative_integrity','Kanıt, yöntem veya program dayanağı değişti.',409);
 requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason)&&text(p.verificationReference,12),'moderation_fields','İnceleme sonucu, gerekçesi ve kanıtın nasıl kontrol edildiği gerekli.');
 return put('evidence-moderation',{id:id(),unit:e.unit,owner:e.owner,evidenceId:e.id,enrollmentId:e.enrollmentId,programId:e.programId,evidenceDigest:p.basedOn,outcome:p.outcome,reason:p.reason,verificationReference:p.verificationReference,version:1,official:false});
}
export function alternativeCanAssess(s,t,e){if(e.source!=='alternative-local')return true;const r=accepted(s,t,e);if(!r)return false;return !alternatives(s,t,e).some(x=>x.alternative.version>e.alternative.version&&accepted(s,t,x));}
export function alternativeSnapshot(s,t,e){if(e.source!=='alternative-local')return null;const r=accepted(s,t,e);return r?{method:e.alternative,authorId:e.createdBy,moderation:r,moderationDigest:hash(stableStringify(r))}:null;}
export function alternativeSnapshotValid(s,t,e,snapshot){
 if(e.source!=='alternative-local')return !snapshot;
 const current=alternativeSnapshot(s,t,e);return !!(current&&snapshot&&stableStringify(current)===stableStringify(snapshot));
}
export function alternativeDecisionIndependent(a,assessment){return (assessment.evidenceDigests||[]).every(r=>!r.alternative||![r.alternative.authorId,r.alternative.moderation.createdBy].includes(a.id));}
export function alternativeProjection(s,a,e,now){
 if(e.source!=='alternative-local')return {canAssess:true};
 const r=review(s,a.tenant,e),latest=alternatives(s,a.tenant,e).at(-1);
 return {moderation:r||null,evidenceDigest:alternativeDigest(e),canAssess:alternativeCanAssess(s,a.tenant,e),canModerate:latest?.id===e.id&&!r&&independent(s,a,e)&&activeRole(s,a.tenant,e.createdBy,e.unit,'instructor',now),canRevise:latest?.id===e.id&&role(a,e.unit,'instructor')&&e.owner!==a.id};
}

export function alternativeVersionUpdates(s,t,assessment){return (assessment.evidenceDigests||[]).filter(r=>r.alternative).flatMap(r=>{const e=s.get(t,'evidence',r.id),latest=e&&alternatives(s,t,e).at(-1);return latest&&latest.alternative.version>r.alternative.method.version?[{evidenceId:r.id,usedVersion:r.alternative.method.version,laterVersion:latest.alternative.version,historyChanged:false}]:[];});}
