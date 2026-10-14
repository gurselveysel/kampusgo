import {hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {externalVerificationSummary} from './recognition-issuer.mjs';
const digest=r=>hash(stableStringify(r));
const text=(v,min=20)=>typeof v==='string'&&v.trim().length>=min&&v.length<=2000;
export const latestRecognitionTechnical=(s,t,id)=>s.list(t,'recognition-technical').filter(r=>r.requestId===id).at(-1);
export function recognitionTechnicalReady(s,t,request,technical,now){
 if(!technical||technical.outcome!=='accepted'||technical.requestId!==request.id||technical.sourceDigest!==request.sourceDigest)return false;
 const document=s.list(t,'recognition-document').find(d=>d.requestId===request.id);
 if(!document)return !technical.verification;
 const summary=externalVerificationSummary(s,t,request,now),v=technical.verification&&s.get(t,'recognition-verification',technical.verification.id);
 return !!summary?.current&&summary.id===v?.id&&technical.verification.digest===digest(v)&&v.documentId===document.id&&technical.method==='verified-file-reviewed'&&technical.statusReview?.outcome==='active'&&text(technical.statusReview.reference,12);
}
export function recordRecognitionTechnical({s,a,p,r,put,id,now}){
 const prior=latestRecognitionTechnical(s,a.tenant,r.id),document=s.list(a.tenant,'recognition-document').find(d=>d.requestId===r.id);
 requireThat(['accepted','rejected','inconclusive'].includes(p.outcome)&&['issuer-record-reviewed','signature-report-reviewed','verified-file-reviewed'].includes(p.method)&&text(p.reportReference,12)&&text(p.reason),'technical_review','Teknik inceleme yöntemi, raporu ve gerekçesi gerekli.');
 requireThat(prior?p.previousTechnicalId===prior.id&&text(p.changeReason):!p.previousTechnicalId,'technical_version','Güncel önceki teknik inceleme ve değişiklik gerekçesi gerekli.',409);
 let verification=null,statusReview=null;
 if(p.outcome==='accepted'&&document){
  const summary=externalVerificationSummary(s,a.tenant,r,now),v=summary&&s.get(a.tenant,'recognition-verification',summary.id);
  requireThat(p.method==='verified-file-reviewed'&&summary?.current&&p.verificationId===summary.id&&v?.documentId===document.id,'technical_verification','Arşivdeki belge için güncel imza ve kişi eşleme makbuzu gerekli.',409);
  requireThat(p.statusChecked===true&&p.statusOutcome==='active'&&text(p.statusReference,12),'technical_status','Belgenin iptal/askı durumunu ayrıca inceleyip dayanağını kaydedin.');
  verification={id:v.id,digest:digest(v)};statusReview={outcome:'active',reference:p.statusReference,checkedAt:now,checkedBy:a.id,method:'human-source-review',automated:false};
 }else requireThat(p.method!=='verified-file-reviewed','technical_verification','Bu yöntem yalnız arşivli, güncel imza makbuzuna bağlı olumlu insan incelemesinde kullanılabilir.',409);
 return put('recognition-technical',{id:id(),unit:r.unit,owner:r.owner,requestId:r.id,sourceDigest:r.sourceDigest,outcome:p.outcome,method:p.method,reportReference:p.reportReference,reason:p.reason,version:(prior?(prior.version||1):0)+1,previousTechnicalId:prior?.id||null,changeReason:prior?p.changeReason:null,verification,statusReview,automatedVerification:false,humanReview:true});
}
