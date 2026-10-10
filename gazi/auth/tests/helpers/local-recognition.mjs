// Synthetic policy only; never an institution-approved rule.
export const localRecognitionPolicy={unit:'engineering',code:'LOCAL-MICRO',title:'Sentetik yerel tanıma politikası',targetProgramCode:'LOCAL-DIP',targetProgramTitle:'Sentetik diploma programı',sourceReference:'Sentetik kurul kaydı; kurum kararı değildir',sourceArticle:'Yerel test maddesi',sourceVersion:'local-1',sourceDate:'2026-01-01',scope:'Yalnız sentetik tek ders başvurusu',priorCourseRule:'Önceki dersler insan tarafından incelenir',doubleCountingRule:'Aynı kazanım tekrar kredi oluşturmaz',appealRule:'Yalnız yerel test incelemesi',pathway:'micro',validFrom:'2020-01-01',validUntil:'2099-01-01',degreeCredits:240,creditCapPercent:10,remoteCapPercent:50,creditDenominator:'graduation-credits',remoteDenominator:'proposed-transfer-credits'};

export function localRecognitionCase(f){
 const {p:program,e}=f.setup(),policy=f.run('admin','recognition-policy',localRecognitionPolicy),reason='Sentetik kayıt yalnız izole yerel kabul için incelendi.';
 f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason});
 const request=f.run('student','recognition-request',{enrollmentId:e.id,policyId:policy.id,sourceTitle:'Sentetik dış eğitim belgesi',sourceIssuer:'Test sağlayıcı',sourceCredentialId:'TEST-CREDENTIAL-1',sourceOutcomeKey:'SOURCE-O1',sourceDigest:'a'.repeat(64),targetCourseCode:'COURSE-1',mappingReason:reason,requestedCredits:10,remoteCredits:5});
 f.run('it','recognition-technical',{requestId:request.id,outcome:'accepted',method:'issuer-record-reviewed',reportReference:'Sentetik teknik inceleme raporu',reason});
 const decide=(actor='judge',patch={})=>f.run(actor,'recognition-decide',{requestId:request.id,outcome:'full',credits:10,remoteCredits:5,reason,authorityReference:'Sentetik yerel kurul karar referansı',gainKey:'GAIN-1',priorCourseChecked:true,priorCourseReference:'Sentetik önceki ders incelemesi',...patch});
 const decision=decide();
 const revise=(old,actor='publisher',patch={outcome:'partial',credits:6,remoteCredits:3})=>{const appeal=f.run('student','recognition-appeal',{decisionId:old.id,reason});const resolution=f.run('reviewer','recognition-resolve',{appealId:appeal.id,outcome:'reassessment',reason});return decide(actor,{...patch,resolutionId:resolution.id});};
 return {program,e,policy,request,decision,decide,revise,reason};
}
