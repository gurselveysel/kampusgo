import {hash} from '../../myys/store.mjs';
// Synthetic policy only; never an institution-approved rule.
export const localRecognitionPolicy={unit:'engineering',code:'LOCAL-MICRO',title:'Sentetik yerel tanıma politikası',targetProgramCode:'LOCAL-DIP',targetProgramTitle:'Sentetik diploma programı',sourceReference:'Sentetik kurul kaydı; kurum kararı değildir',sourceArticle:'Yerel test maddesi',sourceVersion:'local-1',sourceDate:'2026-01-01',scope:'Yalnız sentetik tek ders başvurusu',priorCourseRule:'Önceki dersler insan tarafından incelenir',doubleCountingRule:'Aynı kazanım tekrar kredi oluşturmaz',appealRule:'Yalnız yerel test incelemesi',pathway:'micro',validFrom:'2020-01-01',validUntil:'2099-01-01',degreeCredits:240,creditCapPercent:10,remoteCapPercent:50,creditDenominator:'graduation-credits',remoteDenominator:'proposed-transfer-credits'};

export function localRecognitionCase(f){
 const {p:program,e}=f.setup(),policy=f.run('admin','recognition-policy',localRecognitionPolicy),reason='Sentetik kayıt yalnız izole yerel kabul için incelendi.';
 localRecognitionBasis(f,policy);
 f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason});
 const request=f.run('student','recognition-request',{enrollmentId:e.id,policyId:policy.id,sourceTitle:'Sentetik dış eğitim belgesi',sourceIssuer:'Test sağlayıcı',sourceCredentialId:'TEST-CREDENTIAL-1',sourceOutcomeKey:'SOURCE-O1',sourceDigest:'a'.repeat(64),targetCourseCode:'COURSE-1',mappingReason:reason,requestedCredits:10,remoteCredits:5});
 const technical=f.run('it','recognition-technical',{requestId:request.id,outcome:'accepted',method:'issuer-record-reviewed',reportReference:'Sentetik teknik inceleme raporu',reason});
 const decide=(actor='judge',patch={})=>f.run(actor,'recognition-decide',{requestId:request.id,expectedTechnicalId:technical.id,outcome:'full',credits:10,remoteCredits:5,reason,authorityReference:'Sentetik yerel kurul karar referansı',gainKey:'GAIN-1',priorCourseChecked:true,priorCourseReference:'Sentetik önceki ders incelemesi',...patch});
 const decision=decide();
 const revise=(old,actor='publisher',patch={outcome:'partial',credits:6,remoteCredits:3})=>{const appeal=f.run('student','recognition-appeal',{decisionId:old.id,reason});const resolution=f.run('reviewer','recognition-resolve',{appealId:appeal.id,outcome:'reassessment',reason});return decide(actor,{...patch,resolutionId:resolution.id});};
 return {program,e,policy,request,decision,decide,revise,reason};
}

// Explicit synthetic source workflow for tests; no institution decision or source file is implied.
export function localRecognitionBasis(f,policy,{patch={},review=true}={}){
 const reason='Sentetik kaynak incelemesi; gerçek kurum yetkisi veya kararını kanıtlamaz.';
 const registry=f.run('admin','registry-draft',{unit:policy.unit,type:'recognition-policy',title:'Sentetik tanıma kaynak sicili',fields:{authorityReference:reason,creditPath:policy.pathway,remoteDenominator:reason,priorLearning:reason,doubleCounting:reason,appeal:reason}});
 f.run('authority','registry-review',{recordId:registry.id,outcome:'accepted',reason});
 const input={policyId:policy.id,registryId:registry.id,remoteMeasure:'credit-units',exceptionRoute:policy.pathway==='previous-course'?'previous-course':'none',readScope:reason,measureReason:reason,exceptionEligibility:reason,curriculumReference:reason,priorCourseReference:reason,authorityDecisionReference:reason,sourceDigest:hash('synthetic-source-document'),readOn:'2026-01-01',validFrom:policy.validFrom,validUntil:policy.validUntil,reason,...patch};
 const basis=f.run('admin','recognition-basis',input);
 if(review)f.run('publisher','recognition-basis-review',{basisId:basis.id,outcome:'accepted',reason,sourceRead:true,scopeChecked:true,denominatorChecked:true,exceptionChecked:true});
 return {registry,basis,input,reason};
}
