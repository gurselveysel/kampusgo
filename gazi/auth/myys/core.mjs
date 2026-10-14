import {adviceCommand,adviceReplay,adviceView} from './advice.mjs';
import {portfolioCommand,portfolioReplay,portfolioView} from './portfolio.mjs';
import {skillMapCommand,skillMapReplay,skillMapView} from './skill-map.mjs';
import {capacityCommand,capacityReplay,capacityView,guardUnitCapacity} from './capacity.mjs';
import {paymentCommand,paymentReplay,paymentView} from './payment.mjs';
import {supportPolicyCommand,supportPolicyReplay,supportPolicyView,bindSupportPolicy} from './support-service.mjs';
import {sourceCourseProgress} from './lms-registration.mjs';
import {sourceTrustCommand,sourceTrustReplay,sourceTrustView} from './source-trust.mjs';
import {recoveryCommand,recoveryReplay,recoveryView} from './recovery.mjs';
import {semCommand,semReplay,semView} from './sem-dossier.mjs';
import {alternativeCommand,alternativeReplay,alternativeCanAssess,alternativeSnapshot,alternativeSnapshotValid,alternativeDecisionIndependent,alternativeProjection,alternativeVersionUpdates} from './alternative-evidence.mjs';
import {appealPolicyCommand,appealPolicyReplay,appealPolicyView,bindAppealPolicy,decisionTiming} from './appeal-policy.mjs';
import {lifecycleCommand,lifecycleReplay,lifecycleView} from './credential-lifecycle.mjs';
import {keyCommand,keyReplay,keyView,credentialBlocked} from './key-registry.mjs';
import {profileCommand,profileReplay,profileView,issuanceProfile} from './credential-profile.mjs';
import {membershipCommand,membershipReplay,membershipView} from './membership.mjs';
import {retentionCommand,retentionReplay,retentionView} from './retention.mjs';
import {cohortCommand,cohortReplay,cohortView} from './cohort.mjs';
import {admissionsCommand,admissionsReplay,admissionsView} from './admissions.mjs';
import {randomUUID} from 'node:crypto';
import {hash,requireThat,CoreError} from './store.mjs';
import {registryCommand} from './registry.mjs';
import {currentLmsEvidence,sourceEvidenceSnapshot,sourceSnapshotValid} from './lms.mjs';
import {supportCommand,supportReplay,supportView} from './support.mjs';
import {operationsCommand,operationsReplay,operationsView} from './operations.mjs';
import {walletView} from './wallet.mjs';
import {privacyCommand,privacyReplay,privacyView} from './privacy.mjs';
import {obsCommand,obsReplay,obsView} from './obs.mjs';
import {recognitionCommand,recognitionReplay,recognitionView} from './recognition.mjs';
import {outcomeIds,criterionTasks,programBaseline,stableStringify} from './program-model.mjs';

export const ROLES=['learner','instructor','coordinator','commission','studentAffairs','quality','it','finance','admin'];
const permissions={program:['instructor','coordinator'],publish:['commission'],enroll:['coordinator','studentAffairs'],assess:['instructor'],decide:['commission'],resolve:['quality'],issue:['studentAffairs'],revoke:['studentAffairs'],read:['coordinator','instructor','commission','studentAffairs','quality'],policy:['admin'],support:['it'],recognize:['commission']};
const text=(v,min=1,max=6000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const copy=x=>JSON.parse(JSON.stringify(x));
const allow=(actor,action,unit)=>actor.memberships.some(m=>m.unit===unit&&m.roles.some(r=>(permissions[action]||[]).includes(r)))&&actor.mfa;
const ownUnit=(actor,unit)=>actor.memberships.some(m=>m.unit===unit);
const roleLearnerReceipt=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes('learner'));
const learner=(actor,unit)=>actor.memberships.some(m=>m.unit===unit&&m.roles.includes('learner'));
const guard=(actor,action,unit)=>requireThat(allow(actor,action,unit),'forbidden','Bu birimde işlem yetkiniz veya çok faktörlü doğrulamanız yok.',403);
const readable=(actor,r)=>r.owner===actor.id&&ownUnit(actor,r.unit)||allow(actor,'read',r.unit);
const fetchRecord=(store,actor,kind,id)=>{
 const r=store.get(actor.tenant,kind,id);requireThat(r&&readable(actor,r),'not_found','Kayıt bulunamadı veya erişilemiyor.',404);return r;
};
const appealRecords=(s,tenant,enrollmentId)=>s.list(tenant,'appeal').filter(r=>s.get(tenant,'decision',r.decisionId)?.enrollmentId===enrollmentId);
const resolutionFor=(s,tenant,appealId)=>s.list(tenant,'resolution').find(r=>r.appealId===appealId);
function independentReviewer(s,a,appeal){
 const d=s.get(a.tenant,'decision',appeal.decisionId),assessment=d&&s.get(a.tenant,'assessment',d.assessmentId),program=d&&s.get(a.tenant,'program',d.programId);
 return !!(d&&assessment&&program&&allow(a,'resolve',appeal.unit)&&alternativeDecisionIndependent(a,assessment)&&![appeal.owner,d.createdBy,assessment.createdBy,program.createdBy].includes(a.id));
}
function appealChainReady(s,tenant,assessment){
 const lineage=new Set(),seen=new Set();let current=assessment;
 while(current&&!seen.has(current.id)){seen.add(current.id);if(current.resolutionId)lineage.add(current.resolutionId);current=current.supersedesAssessmentId?s.get(tenant,'assessment',current.supersedesAssessmentId):null;}
 return appealRecords(s,tenant,assessment.enrollmentId).every(appeal=>{const r=resolutionFor(s,tenant,appeal.id);return r&&(r.outcome==='upheld'||r.outcome==='reassessment'&&lineage.has(r.id));});
}

function validLinks(r,ids){const links=outcomeIds(r);return links.length>0&&links.length<=30&&new Set(links).size===links.length&&links.every(id=>ids.has(id))&&(!r.outcomeId||links.length===1&&links[0]===r.outcomeId);}
function validateProgram(p){
 requireThat(text(p.title,3,200)&&text(p.code,2,60)&&text(p.unit,1,80),'program_fields','Program adı, kodu ve birimi gerekli.');
 requireThat(p.mode==='pilot','official_disabled','Resmî belge yolu kurumsal kabul olmadan açılamaz.');
 requireThat(['micro','sem-central'].includes(p.pathway),'pathway','Mikro yeterlilik ve merkezi SEM yolu ayrı seçilmeli.');
 for(const key of ['programOwner','decisionAuthority','legalIssuer','technicalSigner'])requireThat(text(p.responsibilities?.[key],3,200),'responsibility','Dört ayrı sorumluluk alanını doldurun.');
 requireThat(Array.isArray(p.outcomes)&&p.outcomes.length>0&&p.outcomes.length<=30,'outcomes','Öğrenme çıktıları gerekli.');
 const ids=new Set(p.outcomes.map(o=>o.id));requireThat(ids.size===p.outcomes.length&&p.outcomes.every(o=>text(o.id,1,60)&&text(o.text,12,1000)),'outcomes','Çıktı kimlikleri tekil, açıklamaları yeterli olmalı.');
 requireThat(Array.isArray(p.tasks)&&p.tasks.length>0&&p.tasks.length<=50&&new Set(p.tasks.map(t=>t.id)).size===p.tasks.length&&p.tasks.every(t=>text(t.id,1,60)&&text(t.title,3,200)&&validLinks(t,ids)),'tasks','Görevleri öğrenme çıktılarına bağlayın.');
 requireThat(Array.isArray(p.rubric)&&p.rubric.length>0&&p.rubric.length<=50&&new Set(p.rubric.map(r=>r.id)).size===p.rubric.length&&p.rubric.every(r=>text(r.id,1,60)&&validLinks(r,ids)&&finite(r.weight,1,100))&&p.rubric.reduce((n,r)=>n+r.weight,0)===100,'rubric','Rubrik ağırlıkları toplamı 100 olmalı.');
 requireThat([...ids].every(id=>p.tasks.some(t=>outcomeIds(t).includes(id))&&p.rubric.some(r=>outcomeIds(r).includes(id))),'coverage','Her çıktı görev ve rubrik ile kapsanmalı.');
 const taskIds=new Set(p.tasks.map(t=>t.id));
 requireThat(p.rubric.every(r=>{const links=criterionTasks(r,p.tasks);return links.length>0&&new Set(links).size===links.length&&links.every(id=>taskIds.has(id)&&outcomeIds(p.tasks.find(t=>t.id===id)).some(o=>outcomeIds(r).includes(o)))&&outcomeIds(r).every(o=>p.tasks.some(t=>links.includes(t.id)&&outcomeIds(t).includes(o)));})&&p.tasks.every(t=>p.rubric.some(r=>criterionTasks(r,p.tasks).includes(t.id))),'rubric_tasks','Her görev en az bir ilgili rubrik ölçütüne bağlanmalı.');
 requireThat(finite(p.threshold,1,100)&&finite(p.hours,1,750)&&finite(p.ects,0.04,30)&&p.hours===p.ects*25,'workload','İş yükü ve başarı eşiği tutarlı olmalı (pilot: 25 saat/AKTS).');
 requireThat(['5','6','7','8'].includes(p.level)&&['Yüz yüze','Uzaktan','Karma'].includes(p.participation),'program_fields','Düzey ve katılım biçimi geçersiz.');
 for(const key of ['quality','instructor','license','assessmentMethod'])requireThat(text(p[key],3,2000),'program_fields','Düzey, katılım, kalite, eğitici, lisans ve ölçme yöntemi gerekli.');
}

export class MyysCore {
 constructor(store,{clock=()=>new Date().toISOString()}={}){this.store=store;this.clock=clock;}
 run({sessionHash,tenant,commandId,action,input={}}){
  requireThat(text(tenant,1,80)&&text(commandId,8,100),'command','Kurum ve tekil işlem kimliği gerekli.');
  requireThat(input&&typeof input==='object'&&!Array.isArray(input)&&JSON.stringify(input).length<=60000,'payload','İstek boyutu veya biçimi geçersiz.');
  return this.store.transaction(()=>{
   const now=this.clock(),actor=this.store.principal(sessionHash,tenant,now);
   const digest=hash(JSON.stringify({action,input}));
   const old=this.store.db.prepare('SELECT digest,result FROM commands WHERE tenant=? AND person=? AND id=?').get(tenant,actor.id,commandId);
   // Recheck current permission even for an idempotent replay.
   if(old){requireThat(old.digest===digest,'idempotency_conflict','Aynı işlem kimliği farklı içerikle kullanılamaz.',409);const saved=JSON.parse(old.result);this.authorizeReplay(actor,action,saved);if(action==='share'){delete saved.token;return {...saved,linkAlreadyCreated:true};}return saved;}
   const result=this.execute(actor,action,copy(input),now);
   const storedResult={...result};if(action==='share')delete storedResult.token;
   this.store.db.prepare('INSERT INTO commands VALUES(?,?,?,?,?)').run(tenant,actor.id,commandId,digest,JSON.stringify(storedResult));
   this.store.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(tenant,actor.id,action,result.id,now);
   return result;
  });
 }
 authorizeReplay(a,action,r){
  if(adviceReplay(a,action,r))return;
  if(portfolioReplay(this,a,action,r,this.clock()))return;
  if(skillMapReplay(a,action,r))return;
  if(capacityReplay(a,action,r))return;
  if(paymentReplay(a,action,r))return;
  if(supportPolicyReplay(a,action,r))return;
  if(sourceTrustReplay(a,action,r))return;
  if(recoveryReplay(a,action,r))return;
  if(semReplay(a,action,r))return;
  if(alternativeReplay(a,action,r))return;
  if(appealPolicyReplay(a,action,r))return;
  if(lifecycleReplay(a,action,r))return;
  if(keyReplay(a,action,r))return;
  if(profileReplay(a,action,r))return;
  if(membershipReplay(a,action,r))return;
  if(retentionReplay(a,action,r))return;
  if(cohortReplay(a,action,r))return;
  if(admissionsReplay(a,action,r))return;
  if(privacyReplay(a,action,r))return;
  if(obsReplay(a,action,r))return;
  if(recognitionReplay(a,action,r))return;
  if(operationsReplay(a,action,r))return;
  if(action==='support-event')return supportReplay(this.store,a,r);
  const permission={program:'program',publish:'publish',enroll:'enroll',assess:'assess',decide:'decide',resolve:'resolve',issue:'issue',revoke:'revoke',policy:'policy',recognize:'recognize','registry-draft':'policy','registry-review':'policy','import-lms-evidence':'assess'}[action];
  if(permission)guard(a,permission,r.unit);else requireThat(r.owner===a.id&&ownUnit(a,r.unit),'forbidden','Bu kayda erişim yetkiniz yok.',403);
 }
 execute(a,action,p,now){
  const s=this.store,get=(kind,id)=>fetchRecord(s,a,kind,id),put=(kind,r)=>s.put(a.tenant,kind,{...r,createdAt:now,createdBy:a.id}),id=()=>randomUUID();
  const advice=adviceCommand({action,p,a,s,put,id,now});if(advice)return advice;
  const portfolio=portfolioCommand({action,p,a,s,put,id,now,core:this});if(portfolio)return portfolio;
  const skillMap=skillMapCommand({action,p,a,s,put,id,now});if(skillMap)return skillMap;
  const capacity=capacityCommand({action,p,a,s,put,id,now,core:this});if(capacity)return capacity;
  const payment=paymentCommand({action,p,a,s,put,id,now});if(payment)return payment;
  const servicePolicy=supportPolicyCommand({action,p,a,s,put,id,now});if(servicePolicy)return servicePolicy;
  const sourceTrust=sourceTrustCommand({action,p,a,s,put,id,now});if(sourceTrust)return sourceTrust;
  const recovery=recoveryCommand({action,p,a,s,put,id,now});if(recovery)return recovery;
  const sem=semCommand({action,p,a,s,put,id,now});if(sem)return sem;
  const alternative=alternativeCommand({action,p,a,s,put,id,now});if(alternative)return alternative;
  const appealPolicy=appealPolicyCommand({action,p,a,s,put,id,now});if(appealPolicy)return appealPolicy;
  const lifecycle=lifecycleCommand({core:this,action,p,a,s,put,id,now});if(lifecycle)return lifecycle;
  const key=keyCommand({action,p,a,s,put,id,now});if(key)return key;
  const profile=profileCommand({action,p,a,s,put,id,now});if(profile)return profile;
  const membership=membershipCommand({action,p,a,s,put,id,now});if(membership)return membership;
  const retention=retentionCommand({action,p,a,s,put,id,now});if(retention)return retention;
  const cohort=cohortCommand({action,p,a,s,put,id,now,core:this});if(cohort)return cohort;
  const admissions=admissionsCommand({action,p,a,s,put,id,execute:(next,input)=>this.execute(a,next,input,now),core:this});if(admissions)return admissions;
  const privacy=privacyCommand({action,p,a,s,put,id,now});if(privacy)return privacy;
  const obs=obsCommand({action,p,a,s,put,id,now});if(obs)return obs;
  const recognition=recognitionCommand({action,p,a,s,put,id,now});if(recognition)return recognition;
  const registry=registryCommand({action,p,a,s,put,id,guard,get:(kind,recordId)=>{const r=s.get(a.tenant,kind,recordId);requireThat(r&&allow(a,'policy',r.unit),'not_found','Sicil kaydı bulunamadı veya erişilemiyor.',404);return r;}});
  if(registry)return registry;
  const support=supportCommand({action,p,a,s,put,id,now});if(support)return support;
  const operations=operationsCommand({action,p,a,s,put,id,now,execute:(next,input)=>this.execute(a,next,input,now)});if(operations)return operations;
  if(action==='program'){
   validateProgram(p);guard(a,'program',p.unit);
   const versions=s.list(a.tenant,'program').filter(r=>r.code===p.code&&r.unit===p.unit).sort((a,b)=>a.version-b.version),previous=versions.at(-1);
   requireThat(!previous||p.previousProgramId===previous.id&&text(p.changeReason,20),'version_conflict','Yeni sürüm güncel önceki kayda ve değişiklik gerekçesine bağlı olmalı.',409);
   requireThat(previous||!p.previousProgramId,'version_conflict','Önceki sürüm aynı program ve birimde bulunmalı.',409);
   return put('program',{id:id(),unit:p.unit,owner:a.id,code:p.code,title:p.title,mode:'pilot',pathway:p.pathway,responsibilities:p.responsibilities,outcomes:p.outcomes,tasks:p.tasks,rubric:p.rubric,threshold:p.threshold,hours:p.hours,ects:p.ects,level:p.level,participation:p.participation,quality:p.quality,instructor:p.instructor,license:p.license,assessmentMethod:p.assessmentMethod,version:versions.length+1,...(previous?{previousProgramId:previous.id,changeReason:p.changeReason}:{})});
  }
  if(action==='publish'){
   const program=get('program',p.programId);guard(a,'publish',program.unit);
   requireThat(program.createdBy!==a.id,'separation','Hazırlayan kendi programını tek başına yayımlayamaz.',403);
   requireThat(text(p.reason,20),'reason','Gerekçeli program incelemesi gerekli.');
   requireThat(!s.list(a.tenant,'publication').some(r=>r.programId===program.id),'duplicate','Bu sürüm zaten yayımlandı.',409);
   return put('publication',{id:id(),unit:program.unit,owner:program.owner,programId:program.id,reason:p.reason,pilot:true});
  }
  if(action==='enroll'){
   const program=get('program',p.programId);guard(a,'enroll',program.unit);
   requireThat(s.list(a.tenant,'publication').some(r=>r.programId===program.id),'unpublished','Yayımlanmış pilot sürümü gerekli.');
   const member=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(a.tenant,p.learnerId,program.unit,now);
   requireThat(member&&JSON.parse(member.roles).includes('learner'),'learner','Etkin öğrenen üyeliği gerekli.');
   requireThat(!s.list(a.tenant,'enrollment').some(r=>r.programId===program.id&&r.owner===p.learnerId),'duplicate','Öğrenen bu sürüme zaten kayıtlı.',409);
   const capacityBinding=guardUnitCapacity(s,a.tenant,program.unit,'enrollmentRecords',1,{now});
   return put('enrollment',{id:id(),unit:program.unit,owner:p.learnerId,programId:program.id,...(capacityBinding?{capacityBinding}:{})});
  }
  if(action==='evidence'){
   const enrollment=get('enrollment',p.enrollmentId),program=s.get(a.tenant,'program',enrollment.programId);
   requireThat(enrollment.owner===a.id&&learner(a,enrollment.unit),'forbidden','Yalnız kendi öğrenme kanıtınızı sunabilirsiniz.',403);
   requireThat(program.tasks.some(t=>t.id===p.taskId)&&text(p.content,20,20000),'evidence','Geçerli görev ve boş olmayan çalışma gerekli.');
   // Browser assertions never establish LMS authenticity, grades or achievement.
   requireThat(!p.verified&&!p.source&&!p.grade,'source','Dış kaynak doğrulaması istemciden kabul edilmez.');
   return put('evidence',{id:id(),unit:enrollment.unit,owner:a.id,enrollmentId:enrollment.id,programId:program.id,taskId:p.taskId,content:p.content,sha256:hash(p.content),source:'authenticated-submission'});
  }
  if(action==='assess'){
   const e=get('enrollment',p.enrollmentId),program=s.get(a.tenant,'program',e.programId);guard(a,'assess',e.unit);
   requireThat(a.id!==e.owner,'separation','Kendi çalışmanızı değerlendiremezsiniz.',403);
   const appeals=appealRecords(s,a.tenant,e.id),resolutions=appeals.map(x=>resolutionFor(s,a.tenant,x.id));
   requireThat(resolutions.every(Boolean),'review_pending','Açık itiraz önce bağımsız yetkili tarafından incelenmeli.',409);
   const required=resolutions.filter(r=>r.outcome==='reassessment');let supersedes;
   if(required.length||p.resolutionId){
    const resolution=required.find(r=>r.id===p.resolutionId);
    requireThat(resolution,'reassessment_required','Yeniden değerlendirme için bu öğrenen kaydına ait inceleme kararı gerekli.');
    const decision=get('decision',resolution.decisionId);supersedes=get('assessment',decision.assessmentId);
    requireThat(![supersedes.createdBy,decision.createdBy,resolution.createdBy,e.owner,program.createdBy].includes(a.id)&&alternativeDecisionIndependent(a,supersedes),'separation','Yeniden değerlendirmeyi önceki işlemlerden bağımsız bir eğitici yapmalı.',403);
    requireThat(!s.list(a.tenant,'assessment').some(x=>x.resolutionId===resolution.id),'duplicate','Bu inceleme kararı için yeniden değerlendirme zaten kayıtlı.',409);
   }
   requireThat(Array.isArray(p.evidenceIds)&&p.evidenceIds.length<=100&&new Set(p.evidenceIds).size===p.evidenceIds.length,'evidence','Kanıt listesi tekil olmalı.');
   const evidence=p.evidenceIds.map(eid=>get('evidence',eid));
   requireThat(evidence.length&&evidence.every(x=>x.enrollmentId===e.id&&hash(x.content)===x.sha256&&currentLmsEvidence(s,a.tenant,x)&&alternativeCanAssess(s,a.tenant,x))&&program.tasks.every(t=>evidence.some(x=>x.taskId===t.id)),'missing_evidence','Tüm zorunlu görevlerin doğrulanabilir kanıtı gerekli.');
   requireThat(Array.isArray(p.scores)&&p.scores.length===program.rubric.length&&new Set(p.scores.map(x=>x.criterionId)).size===p.scores.length,'scores','Bütün rubrik ölçütleri puanlanmalı.');
   const score=program.rubric.reduce((sum,r)=>{const v=p.scores.find(x=>x.criterionId===r.id);requireThat(v&&Number.isInteger(v.score)&&v.score>=0&&v.score<=4&&text(v.reason,12),'scores','Her ölçüt için 0–4 puan ve gerekçe gerekli.');return sum+r.weight*v.score/4;},0);
   requireThat(text(p.reason,20),'reason','Değerlendirme gerekçesi gerekli.');
   return put('assessment',{id:id(),unit:e.unit,owner:e.owner,enrollmentId:e.id,programId:program.id,evidenceIds:p.evidenceIds,evidenceDigests:evidence.map(x=>({id:x.id,sha256:x.sha256,...(x.source==='alternative-local'?{alternative:alternativeSnapshot(s,a.tenant,x)}:{}),...(x.sourceProofDigest?{source:sourceEvidenceSnapshot(s,a.tenant,x)}:{})})),scores:p.scores,score,passed:score>=program.threshold,reason:p.reason,rubricSnapshot:program.rubric,programSnapshot:programBaseline(program),programDigest:hash(stableStringify(programBaseline(program))),...(supersedes?{resolutionId:p.resolutionId,supersedesAssessmentId:supersedes.id}:{})});
  }
  if(action==='decide'){
   const assessment=get('assessment',p.assessmentId),program=s.get(a.tenant,'program',assessment.programId);guard(a,'decide',assessment.unit);
   requireThat(![assessment.owner,assessment.createdBy,program.createdBy].includes(a.id)&&alternativeDecisionIndependent(a,assessment),'separation','Bağımsız akademik karar sahibi gerekli.',403);
   requireThat(text(p.reason,20)&&['approved','rejected'].includes(p.outcome),'decision','Gerekçe ve karar gerekli.');
   requireThat(p.outcome!=='approved'||assessment.passed,'failed','Başarısız değerlendirme onaylanamaz.');
   requireThat(appealChainReady(s,a.tenant,assessment),'review_pending','Açık itiraz veya yeniden değerlendirme zinciri tamamlanmadan karar verilemez.',409);
   requireThat(assessment.evidenceIds.length&&assessment.evidenceDigests.every(x=>{const e=s.get(a.tenant,'evidence',x.id);return e&&hash(e.content)===x.sha256&&currentLmsEvidence(s,a.tenant,e)&&alternativeSnapshotValid(s,a.tenant,e,x.alternative)&&sourceSnapshotValid(s,a.tenant,e,x.source);}),'missing_evidence','Karar kanıtı doğrulanamadı.');
   requireThat(!s.list(a.tenant,'decision').some(x=>x.assessmentId===assessment.id),'duplicate','Değerlendirme için karar zaten var.',409);
   return put('decision',{id:id(),unit:assessment.unit,owner:assessment.owner,assessmentId:assessment.id,programId:program.id,enrollmentId:assessment.enrollmentId,outcome:p.outcome,reason:p.reason,score:assessment.score,programVersion:program.version,evidenceDigests:assessment.evidenceDigests,appealPolicy:bindAppealPolicy(s,a.tenant,program,now),pilot:true});
  }
  if(action==='appeal'){
   const d=get('decision',p.decisionId);requireThat(d.owner===a.id&&learner(a,d.unit),'forbidden','Yalnız kendi kararınıza itiraz edebilirsiniz.',403);
   requireThat(text(p.reason,20),'reason','İtiraz gerekçesi gerekli.');
   requireThat(!s.list(a.tenant,'appeal').some(x=>x.decisionId===d.id),'duplicate','Bu kararın itirazı zaten kayıtlı.',409);
   return put('appeal',{id:id(),unit:d.unit,owner:a.id,decisionId:d.id,reason:p.reason,timing:decisionTiming(s,a.tenant,d,now)});
  }
  if(action==='resolve'){
   const appeal=get('appeal',p.appealId),d=get('decision',appeal.decisionId),assessment=get('assessment',d.assessmentId);guard(a,'resolve',appeal.unit);
   requireThat(independentReviewer(s,a,appeal),'separation','İtirazı bağımsız bir yetkili incelemeli.',403);
   requireThat(text(p.reason,20)&&['upheld','reassessment'].includes(p.outcome),'resolution','Gerekçe ve itiraz sonucu gerekli.');
   requireThat(!s.list(a.tenant,'resolution').some(x=>x.appealId===appeal.id),'duplicate','İtiraz zaten sonuçlandırıldı.',409);
   if(appeal.timing?.policyId&&appeal.timing.classification!=='within-local-window')requireThat(p.timeReview==='admitted-local-review'&&text(p.timeReason,20,2000),'appeal_time_review','Belirsiz veya geçmiş yerel süre bağımsız gerekçeli inceleme gerektirir; otomatik ret uygulanmaz.');
   // Reassessment never manufactures a new passing grade.
   return put('resolution',{id:id(),unit:appeal.unit,owner:appeal.owner,appealId:appeal.id,decisionId:d.id,outcome:p.outcome,reason:p.reason,...(appeal.timing?.policyId?{timeReview:appeal.timing.classification==='within-local-window'?'within-local-window':'admitted-local-review',timeReason:appeal.timing.classification==='within-local-window'?null:p.timeReason,policyId:appeal.timing.policyId,policyVersion:appeal.timing.policyVersion}:{})});
  }
  if(action==='issue'){
   const d=get('decision',p.decisionId);guard(a,'issue',d.unit);const program=get('program',d.programId);
   requireThat(![d.createdBy,d.owner,program.createdBy].includes(a.id),'separation','Belge yetkilisi karar sahibinden ve hazırlayandan ayrı olmalı.',403);
   requireThat(program.pathway==='micro'&&program.mode==='pilot','issuer_pathway','Merkezi SEM belgesi yerel olarak düzenlenemez.');
   requireThat(d.outcome==='approved'&&this.decisionUsable(a,d),'decision_blocked','Başarı kararı yok, itiraz açık veya yeniden değerlendirme gerekli.');
   requireThat(!s.list(a.tenant,'issuance').some(x=>s.get(a.tenant,'decision',x.decisionId)?.enrollmentId===d.enrollmentId),'duplicate','Bu öğrenen kaydına bağlı ihraç zaten var; değiştirme süreci gerekli.',409);
   const profile=issuanceProfile(s,a,program,now);
   // This is an immutable issuance authorization, not a signed credential.
   return put('issuance',{id:id(),unit:d.unit,owner:d.owner,decisionId:d.id,programId:program.id,profileId:profile.id,profileVersion:profile.version,profileDigest:hash(stableStringify(profile)),authorityId:profile.authorityId,fieldKeys:profile.fields,state:'awaiting-signature',pilot:true,issuer:profile.issuer,visibility:'private'});
  }
  if(action==='revoke'){
   const issuance=get('issuance',p.issuanceId);guard(a,'revoke',issuance.unit);requireThat(text(p.reason,20),'reason','İptal gerekçesi gerekli.');
   requireThat(!s.list(a.tenant,'revocation').some(x=>x.issuanceId===issuance.id),'duplicate','İhraç yetkisi zaten iptal.',409);
   return put('revocation',{id:id(),unit:issuance.unit,owner:issuance.owner,issuanceId:issuance.id,reason:p.reason});
  }
  if(action==='share'){
   const issuance=get('issuance',p.issuanceId);requireThat(issuance.owner===a.id&&learner(a,issuance.unit),'forbidden','Yalnız kendi kaydınızı paylaşabilirsiniz.',403);
   const decision=s.get(a.tenant,'decision',issuance.decisionId);
   requireThat(!credentialBlocked(this,a.tenant,issuance),'decision_blocked','Belgenin güncel durumu paylaşıma uygun değil.',409);
   requireThat(finite(p.hours,1,168)&&text(p.purpose,12,500),'sharing','Paylaşım amacı ve en fazla 7 günlük süre gerekli.');
   const token=randomUUID()+randomUUID();
   const r=put('share',{id:id(),unit:issuance.unit,owner:a.id,issuanceId:issuance.id,tokenHash:hash(token),expires:new Date(Date.parse(now)+p.hours*3600000).toISOString(),purpose:p.purpose});
   // The token is returned only to its owner, never logged.
   return {...r,token};
  }
  if(action==='unshare'){
   const share=get('share',p.shareId);requireThat(share.owner===a.id,'forbidden','Paylaşım size ait değil.',403);
   const old=s.list(a.tenant,'share-revocation').find(x=>x.shareId===share.id);if(old)return old;
   return put('share-revocation',{id:id(),unit:share.unit,owner:a.id,shareId:share.id});
  }
  if(action==='support'){
   requireThat(ownUnit(a,p.unit),'forbidden','Bu birimde destek talebi açma yetkiniz yok.',403);
   requireThat(text(p.subject,5,200)&&text(p.message,20),'support','Destek birimi, konusu ve açıklaması gerekli.');
   requireThat(['technical','academic','privacy'].includes(p.category),'support','Geçerli destek türünü seçin.');
   return put('support',{id:id(),unit:p.unit,owner:a.id,subject:p.subject,message:p.message,category:p.category,state:'open',servicePolicy:bindSupportPolicy(s,a.tenant,p.unit,now)});
  }
  if(action==='import-lms-evidence'){
   const event=get('lms-event',p.eventId);guard(a,'assess',event.unit);
   requireThat(event.owner!==a.id,'separation','Kendi dış kanıtınızı onaylayamazsınız.',403);
   const evidence={id:id(),unit:event.unit,owner:event.owner,enrollmentId:event.enrollmentId,programId:event.programId,taskId:event.taskId,content:event.content,sha256:event.content?hash(event.content):null,source:'signed-lms-local',sourceEventId:event.id,sourceDigest:event.digest,...(event.sourceProof?{sourceProofDigest:hash(stableStringify(event.sourceProof)),sourceSubmissionId:event.sourceProof.submissionId,sourceSubmissionVersion:event.sourceProof.submissionVersion}:{})};
   requireThat(event.type==='grade'&&currentLmsEvidence(s,a.tenant,evidence),'lms_evidence','İşlenmiş, güncel ve lisansı açık görev kanıtı gerekli.');
   requireThat(!s.list(a.tenant,'evidence').some(x=>x.sourceEventId===event.id),'duplicate','Bu olayın kanıtı zaten aktarıldı.',409);
   return put('evidence',evidence);
  }
  throw new CoreError('unknown_action','İşlem desteklenmiyor.',404);
 }
 authorizedRecord(actor,kind,id){return fetchRecord(this.store,actor,kind,id);}
 decisionUsable(a,d){
  const s=this.store,assessment=s.get(a.tenant,'assessment',d.assessmentId);
  if(!assessment?.passed||!assessment.evidenceDigests.length||!assessment.evidenceDigests.every(x=>{const e=s.get(a.tenant,'evidence',x.id);return e&&e.enrollmentId===d.enrollmentId&&hash(e.content)===x.sha256&&currentLmsEvidence(s,a.tenant,e)&&alternativeSnapshotValid(s,a.tenant,e,x.alternative)&&sourceSnapshotValid(s,a.tenant,e,x.source);}))return false;
  return appealChainReady(s,a.tenant,assessment);
 }
 view({sessionHash,tenant}){
  return this.store.transaction(()=>{
   const a=this.store.principal(sessionHash,tenant,this.clock()),s=this.store,visible=kind=>s.list(tenant,kind).filter(r=>readable(a,r));
   const sourceCurrent=e=>currentLmsEvidence(s,tenant,{source:'signed-lms-local',sourceEventId:e.id,sourceDigest:e.digest,...(e.sourceProof?{sourceProofDigest:hash(stableStringify(e.sourceProof))}:{})});
   const progressEvents=s.list(tenant,'lms-event').filter(e=>readable(a,e)||a.mfa&&a.memberships.some(m=>m.unit===e.unit&&m.roles.includes('it')));
   return {advice:adviceView(s,a,this.clock()),portfolios:portfolioView(this,a,this.clock()),skillMaps:skillMapView(s,a,this.clock()),capacities:capacityView(s,a,this.clock()),payments:paymentView(s,a,this.clock()),lmsProgress:sourceCourseProgress(s,tenant,progressEvents,sourceCurrent),sourceTrust:sourceTrustView(s,a,this.clock()),recovery:recoveryView(s,a,this.clock()),sem:semView(s,a,this.clock()),appealPolicies:appealPolicyView(s,a),credentialLifecycle:lifecycleView(this,a),keys:keyView(s,a),credentialProfiles:profileView(s,a,this.clock()),membership:membershipView(s,a,this.clock()),retention:retentionView(s,a,this.clock()),cohorts:cohortView(this,a,this.clock()),...admissionsView(s,a),lmsReceipts:visible('lms-receipt'),credentialReceipts:visible('credential-receipt'),privacy:privacyView(s,a),obs:obsView(s,a),recognition:recognitionView(s,a),wallet:walletView(this,a),...operationsView(s,a,this.clock()),mode:'local-acceptance',official:false,personId:a.id,memberships:a.memberships,registry:s.list(tenant,'registry').filter(r=>allow(a,'policy',r.unit)),registryReviews:s.list(tenant,'registry-review').filter(r=>allow(a,'policy',r.unit)),lmsEvents:visible('lms-event').map(e=>({...e,currentSource:sourceCurrent(e),canImport:a.mfa&&allow(a,'assess',e.unit)&&e.owner!==a.id&&e.type==='grade'&&!s.list(tenant,'evidence').some(x=>x.sourceEventId===e.id)&&currentLmsEvidence(s,tenant,{source:'signed-lms-local',sourceEventId:e.id,sourceDigest:e.digest,...(e.sourceProof?{sourceProofDigest:hash(stableStringify(e.sourceProof))}:{})})})),publications:visible('publication'),programs:s.list(tenant,'program').filter(r=>readable(a,r)||ownUnit(a,r.unit)&&s.list(tenant,'enrollment').some(e=>e.programId===r.id&&e.owner===a.id)),enrollments:visible('enrollment'),evidence:visible('evidence').map(r=>({...r,...alternativeProjection(s,a,r,this.clock()),canAssess:currentLmsEvidence(s,tenant,r)&&alternativeCanAssess(s,tenant,r)})),assessments:visible('assessment').map(r=>({...r,alternativeVersionUpdates:alternativeVersionUpdates(s,tenant,r),allowedActions:allow(a,'decide',r.unit)&&![r.owner,r.createdBy,s.get(tenant,'program',r.programId)?.createdBy].includes(a.id)&&alternativeDecisionIndependent(a,r)&&!s.list(tenant,'decision').some(d=>d.assessmentId===r.id)&&appealChainReady(s,tenant,r)?['decide']:[]})),decisions:visible('decision').map(d=>{let profileReady=false;try{issuanceProfile(s,a,s.get(tenant,'program',d.programId),this.clock());profileReady=true;}catch{}return {...d,alternativeVersionUpdates:alternativeVersionUpdates(s,tenant,s.get(tenant,'assessment',d.assessmentId)),appealWindow:decisionTiming(s,tenant,d,this.clock()),canReceive:d.owner===a.id&&roleLearnerReceipt(a,d.unit)&&!s.list(tenant,'decision-receipt').some(r=>r.decisionId===d.id),usable:d.outcome==='approved'&&this.decisionUsable(a,d),canIssue:profileReady&&d.outcome==='approved'&&this.decisionUsable(a,d)&&![d.createdBy,d.owner,s.get(tenant,'program',d.programId)?.createdBy].includes(a.id)&&!s.list(tenant,'issuance').some(x=>s.get(tenant,'decision',x.decisionId)?.enrollmentId===d.enrollmentId)};}),appeals:visible('appeal').map(r=>({...r,resolution:resolutionFor(s,tenant,r.id)||null,allowedActions:!resolutionFor(s,tenant,r.id)&&independentReviewer(s,a,r)?['resolve']:[]})),resolutions:visible('resolution'),issuances:visible('issuance').map(r=>({...r,signed:!!s.get(tenant,'signed',r.id),blocked:credentialBlocked(this,tenant,r)})),supportAsOf:this.clock(),supportPolicies:supportPolicyView(s,a,this.clock()),support:supportView(s,a,this.clock())};
  });
 }
 shared({tenant,token}){
  requireThat(typeof tenant==='string'&&tenant.length<=80&&typeof token==='string'&&/^[a-f0-9-]{72}$/.test(token),'not_found','Paylaşım bulunamadı veya sona erdi.',404);
  return this.store.transaction(()=>{
   const s=this.store,share=s.list(tenant,'share').find(r=>r.tokenHash===hash(token));
   requireThat(share&&share.expires>this.clock()&&!s.list(tenant,'share-revocation').some(x=>x.shareId===share.id),'not_found','Paylaşım bulunamadı veya sona erdi.',404);
   const issuance=s.get(tenant,'issuance',share.issuanceId),d=s.get(tenant,'decision',issuance.decisionId),program=s.get(tenant,'program',issuance.programId);
   const member=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(tenant,share.owner,share.unit,this.clock());
   requireThat(member&&JSON.parse(member.roles).includes('learner'),'not_found','Paylaşım bulunamadı veya sona erdi.',404);
   const blocked=credentialBlocked(this,tenant,issuance);
   return {title:program.title,pilot:true,state:blocked?'blocked':s.get(tenant,'signed',issuance.id)?'signed':issuance.state,issuer:issuance.issuer,official:false};
  });
 }
}
