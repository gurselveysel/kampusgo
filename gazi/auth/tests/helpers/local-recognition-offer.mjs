import {hash} from '../../myys/store.mjs';
import {localRecognitionPolicy,localRecognitionBasis} from './local-recognition.mjs';
export const offerReason='Sentetik çok dersli teklif bağımsız insan incelemesine sunuldu.';
export function localRecognitionOffer(f,{count=2,create=true,requestPatch={},technicalOutcomes=[]}={}){
 const {e}=f.setup(),policy=f.run('admin','recognition-policy',{...localRecognitionPolicy,transferScope:'multi-course-offer',scope:'Yalnız sentetik çok dersli transfer teklifi; kurum kararı değildir.'});
 localRecognitionBasis(f,policy);
 f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason:offerReason});
 const requests=Array.from({length:count},(_,i)=>f.run('student','recognition-request',{enrollmentId:e.id,policyId:policy.id,sourceTitle:'Sentetik teklif belgesi '+i,sourceIssuer:'Sentetik düzenleyici',sourceCredentialId:'LOCAL-OFFER-SOURCE',sourceDigest:hash('local-offer'),sourceOutcomeKey:'SOURCE-'+i,targetCourseCode:'COURSE-'+i,mappingReason:offerReason,requestedCredits:4,remoteCredits:i===0?4:0,...requestPatch}));
 const technical=requests.map((r,i)=>f.run('it','recognition-technical',{requestId:r.id,outcome:technicalOutcomes[i]||'accepted',method:'issuer-record-reviewed',reportReference:'Sentetik teklif teknik incelemesi',reason:offerReason}));
 const input={requestIds:requests.map(r=>r.id),title:'Sentetik çok dersli teklif',reason:offerReason};
 const offer=create?f.run('student','recognition-offer',input):null;
 const rows=requests.map((r,i)=>({requestId:r.id,expectedTechnicalId:technical[i].id,outcome:'full',credits:r.requestedCredits,remoteCredits:r.remoteCredits,gainKey:'GAIN-'+i,priorCourseReference:'Sentetik önceki kredi incelemesi',priorCourseChecked:true}));
 const decisionInput={offerId:offer?.id,previousDecisionId:null,rows,reason:offerReason,authorityReference:'Sentetik teklif kurul referansı'};
 const decide=(actor='judge',patch={},commandId)=>f.run(actor,'recognition-offer-decide',{...decisionInput,...patch},commandId);
 const appeal=decision=>f.run('student','recognition-offer-appeal',{decisionId:decision.id,reason:offerReason});
 const resolve=(ap,outcome='reassessment')=>f.run('reviewer','recognition-offer-resolve',{appealId:ap.id,outcome,reason:offerReason});
 return {e,policy,requests,offer,rows,input,decisionInput,decide,appeal,resolve};
}
