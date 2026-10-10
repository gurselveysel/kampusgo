import {hash,requireThat,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {recognitionLedger,recognitionView} from './recognition.mjs';
const allowed=(a,unit,roles)=>a.mfa&&a.memberships.some(m=>m.unit===unit&&m.roles.some(r=>roles.includes(r)));
const demand=(a,unit,roles)=>requireThat(allowed(a,unit,roles),'forbidden','Bu aktarım işleminde birim yetkisi ve çok faktörlü doğrulama gerekli.',403);
const read=(s,a,eventId,roles)=>{const e=s.get(a.tenant,'obs-event',eventId);requireThat(e&&allowed(a,e.unit,roles),'not_found','Aktarım kaydı bulunamadı veya erişilemiyor.',404);return e;};
const reason=p=>requireThat(typeof p.reason==='string'&&p.reason.trim().length>=20&&p.reason.length<=2000,'reason','Mutabakat gerekçesi 20–2000 karakter olmalı.');
function requestUsable(s,tenant,requestId){
 const appeals=s.list(tenant,'recognition-appeal').filter(x=>s.get(tenant,'recognition-decision',x.decisionId)?.requestId===requestId);
 return appeals.every(x=>{const res=s.list(tenant,'recognition-resolution').find(r=>r.appealId===x.id);return res&&(res.outcome==='upheld'||s.list(tenant,'recognition-decision').some(d=>d.resolutionId===res.id));});
}
const latestDecision=(s,t,requestId)=>s.list(t,'recognition-decision').filter(d=>d.requestId===requestId).at(-1);
const lastMatched=(s,t,requestId)=>s.list(t,'obs-event').filter(e=>e.requestId===requestId&&s.list(t,'obs-reconciliation').some(r=>r.eventId===e.id&&r.outcome==='matched')).at(-1);
export function activeRecognitionCredit(s,tenant,creditId){const c=recognitionLedger(s,tenant).find(x=>x.id===creditId);return !!c&&requestUsable(s,tenant,c.requestId);}
function current(s,tenant,e){
 if(e.payload.creditId)return activeRecognitionCredit(s,tenant,e.payload.creditId);
 return e.payload.operation==='cancel'&&latestDecision(s,tenant,e.requestId)?.id===e.payload.decisionId&&requestUsable(s,tenant,e.requestId)&&!recognitionLedger(s,tenant).some(c=>c.requestId===e.requestId);
}
const receipts=(s,t,eventId)=>s.list(t,'obs-receipt').filter(x=>x.eventId===eventId);
export function obsReplay(a,action,r){if(!['obs-prepare','obs-correction','obs-simulate','obs-reconcile'].includes(action))return false;demand(a,r.unit,action==='obs-simulate'?['it']:['studentAffairs']);return true;}
export function obsCommand({action,p,a,s,put,id,now}){
 if(!['obs-prepare','obs-correction','obs-simulate','obs-reconcile'].includes(action))return null;
 const tenant=a.tenant;
 if(action==='obs-prepare'||action==='obs-correction'){
  let credit,previous,correctionDecision;
  if(action==='obs-prepare'){
   credit=recognitionLedger(s,tenant).find(c=>c.decisionId===p.decisionId);requireThat(credit&&allowed(a,credit.unit,['studentAffairs']),'not_found','Aktarıma uygun kredi bulunamadı veya erişilemiyor.',404);
   requireThat(!lastMatched(s,tenant,credit.requestId),'obs_correction','Bu talebin önceki aktarımı var; düzeltme zincirini kullanın.',409);
   requireThat(activeRecognitionCredit(s,tenant,credit.id),'source_blocked','Kararda açık itiraz var; aktarım hazırlanamaz.',409);
  }else{
   previous=read(s,a,p.eventId,['studentAffairs']);
   requireThat(lastMatched(s,tenant,previous.requestId)?.id===previous.id,'obs_correction','Düzeltme son mutabık aktarım üzerinden hazırlanmalı.',409);
   correctionDecision=latestDecision(s,tenant,previous.requestId);
   requireThat(correctionDecision&&correctionDecision.id!==previous.payload.decisionId,'obs_correction','Önceki kaydı değiştiren yeni karar bulunamadı.',409);
   credit=recognitionLedger(s,tenant).find(x=>x.decisionId===correctionDecision.id);
   requireThat(requestUsable(s,tenant,previous.requestId)&&(!credit||activeRecognitionCredit(s,tenant,credit.id)),'source_blocked','Yeni karar henüz aktarıma uygun değil.',409);
  }
  const decision=s.get(tenant,'recognition-decision',credit?.decisionId||correctionDecision.id),request=s.get(tenant,'recognition-request',decision.requestId);
  demand(a,request.unit,['studentAffairs']);requireThat(a.id!==request.owner&&a.id!==decision.createdBy,'separation','Aktarım yetkilisi öğrenen ve akademik karar sahibinden ayrı olmalı.',403);
  const eventId=hash('local-obs/1\0'+tenant+'\0'+(previous?previous.id+'\0'+decision.id:credit.id));const existing=s.get(tenant,'obs-event',eventId);if(existing)return existing;
  const payload={schema:'local-obs/1',operation:previous?(credit?'replace':'cancel'):'credit',tenant,unit:request.unit,personId:request.owner,targetProgramCode:request.targetProgramCode,targetCourseCode:request.targetCourseCode,credits:credit?.credits||0,remoteCredits:credit?.remoteCredits||0,creditId:credit?.id||null,decisionId:decision.id,policyId:decision.policyId,previousEventId:previous?.id||null,externalKey:hash(tenant+'\0'+request.owner+'\0'+request.targetProgramCode+'\0'+request.targetCourseCode)};
  return put('obs-event',{id:eventId,unit:request.unit,owner:a.id,requestId:request.id,payload,payloadHash:hash(stableStringify(payload)),simulated:true,target:'unconfigured',official:false});
 }
 const e=read(s,a,p.eventId,action==='obs-simulate'?['it']:['studentAffairs']);
 if(action==='obs-simulate'){
  requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Alındı simülasyonu yalnız izole yerel kabulde çalışır.',503);
  requireThat(current(s,tenant,e),'source_blocked','Kaynak karar güncel değil veya itiraz nedeniyle bekletiliyor.',409);
  requireThat(['accepted','rejected'].includes(p.outcome)&&typeof p.receiptReference==='string'&&/^LOCAL-[A-Z0-9._-]{3,80}$/.test(p.receiptReference)&&/^[a-f0-9]{64}$/.test(p.receivedPayloadHash),'obs_receipt','Yerel alındı referansı, sonuç ve içerik özeti gerekli.');reason(p);
  const digest=hash(stableStringify(p)),old=s.list(tenant,'obs-receipt').find(r=>r.receiptReference===p.receiptReference);
  if(old){requireThat(old.eventId===e.id&&old.digest===digest,'idempotency_conflict','Alındı kimliği farklı içerikle tekrar kullanılamaz.',409);return old;}
  requireThat(!receipts(s,tenant,e.id).some(r=>r.outcome==='accepted'&&r.receivedPayloadHash===e.payloadHash),'duplicate','Bu olay için uygun alındı zaten var.',409);
  return put('obs-receipt',{id:id(),unit:e.unit,owner:a.id,eventId:e.id,receiptReference:p.receiptReference,outcome:p.outcome,receivedPayloadHash:p.receivedPayloadHash,reason:p.reason,digest,simulated:true});
 }
 reason(p);const receipt=s.get(tenant,'obs-receipt',p.receiptId);requireThat(receipt&&receipt.eventId===e.id,'obs_receipt','Olayla bağlı alındı gerekli.');
 const existing=s.list(tenant,'obs-reconciliation').find(r=>r.receiptId===receipt.id);if(existing)return existing;
 const outcome=receipt.outcome==='rejected'?'rejected':receipt.receivedPayloadHash!==e.payloadHash?'mismatch':!current(s,tenant,e)?'source-blocked':'matched';
 return put('obs-reconciliation',{id:id(),unit:e.unit,owner:a.id,eventId:e.id,receiptId:receipt.id,outcome,reason:p.reason,simulated:true,official:false});
}
export function obsView(s,a){
 const events=s.list(a.tenant,'obs-event').filter(e=>allowed(a,e.unit,['it','quality','studentAffairs'])).map(e=>{
  const rs=receipts(s,a.tenant,e.id),matches=s.list(a.tenant,'obs-reconciliation').filter(r=>r.eventId===e.id),canPrepare=allowed(a,e.unit,['studentAffairs']);
  return {id:e.id,unit:e.unit,payloadHash:e.payloadHash,operation:e.payload.operation,previousEventId:e.payload.previousEventId,createdAt:e.createdAt,simulated:true,sourceUsable:current(s,a.tenant,e),
   ...(canPrepare?{targetProgramCode:e.payload.targetProgramCode,targetCourseCode:e.payload.targetCourseCode,credits:e.payload.credits,decisionId:e.payload.decisionId}:{}),
   receipts:rs.map(r=>({id:r.id,receiptReference:r.receiptReference,outcome:r.outcome,reason:r.reason,matchesHash:r.receivedPayloadHash===e.payloadHash,reconciliation:matches.find(x=>x.receiptId===r.id)||null})),
   canSimulate:allowed(a,e.unit,['it'])&&current(s,a.tenant,e)&&!rs.some(r=>r.outcome==='accepted'&&r.receivedPayloadHash===e.payloadHash),canReconcile:canPrepare,
   canCorrect:canPrepare&&lastMatched(s,a.tenant,e.requestId)?.id===e.id&&latestDecision(s,a.tenant,e.requestId)?.id!==e.payload.decisionId&&requestUsable(s,a.tenant,e.requestId)&&!s.list(a.tenant,'obs-event').some(r=>r.payload.previousEventId===e.id&&r.payload.decisionId===latestDecision(s,a.tenant,e.requestId)?.id)};
 });
 const candidates=recognitionView(s,a).credits.filter(c=>allowed(a,c.unit,['studentAffairs'])&&!c.held&&!lastMatched(s,a.tenant,c.requestId)&&!events.some(e=>e.decisionId===c.decisionId)).map(c=>({decisionId:c.decisionId,targetProgramCode:c.targetProgramCode,targetCourseCode:c.targetCourseCode,credits:c.credits}));
 return {events,candidates};
}
