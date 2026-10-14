import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {currentLmsEvidence,sourceSnapshotValid} from './lms.mjs';
import {alternativeSnapshotValid} from './alternative-evidence.mjs';

const actions=['advice-protocol','advice-protocol-review','advice-protocol-hold','advice-sample','advice-compare','advice-contest','advice-resolve'];
const digest=value=>hash(stableStringify(value));
const text=(value,min=20,max=2000)=>typeof value==='string'&&value.trim().length>=min&&value.length<=max;
const role=(actor,unit,name)=>actor.mfa&&actor.memberships.some(m=>m.unit===unit&&m.roles.includes(name));
const staff=(actor,unit)=>['instructor','coordinator','commission','quality'].some(r=>role(actor,unit,r));
const own=(actor,record)=>record.owner===actor.id&&role(actor,record.unit,'learner');
const visible=(actor,record)=>own(actor,record)||staff(actor,record.unit);
const review=(s,t,id)=>s.list(t,'advice-protocol-review').find(r=>r.protocolId===id);
const held=(s,t,id)=>s.list(t,'advice-protocol-hold').some(r=>r.protocolId===id);
const latest=(s,t,pid)=>s.list(t,'advice-protocol').filter(r=>r.programId===pid).at(-1);
const accepted=(s,t,pid)=>s.list(t,'advice-protocol').filter(r=>r.programId===pid&&review(s,t,r.id)?.outcome==='accepted').at(-1);
const comparison=(s,t,id)=>s.list(t,'advice-compare').find(r=>r.sampleId===id);
const contest=(s,t,id)=>s.list(t,'advice-contest').find(r=>r.sampleId===id);
const resolution=(s,t,id)=>s.list(t,'advice-resolve').find(r=>r.contestId===id);
const strict=(p,keys)=>requireThat(p&&Object.keys(p).every(k=>keys.includes(k)),'advice_fields','Yalnız açık öneri ve insan incelemesi alanları kabul edilir. Otomatik not veya karar alanı yok.');
function dependency(s,t,u,id,type){
 const record=s.get(t,'registry',id),r=record&&s.list(t,'registry-review').find(v=>v.recordId===id);
 requireThat(record?.unit===u&&record.type===type&&r?.outcome==='accepted','advice_dependencies','Aynı birimde incelenmiş veri akışı ve içerik hakkı sicili gerekli.',409);
 return {id,type,digest:digest(record),reviewId:r.id,reviewDigest:digest(r)};
}
const dependenciesCurrent=(s,t,p)=>p.dependencies.every(d=>digest(s.get(t,'registry',d.id))===d.digest&&digest(s.get(t,'registry-review',d.reviewId))===d.reviewDigest);
const ready=(s,t,p,now)=>!!p&&p.validUntil>now&&review(s,t,p.id)?.outcome==='accepted'&&review(s,t,p.id).protocolDigest===digest(p)&&!held(s,t,p.id)&&dependenciesCurrent(s,t,p)&&digest(s.get(t,'program',p.programId))===p.programDigest;
function expertActive(s,t,unit,person,now){
 const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.unit=? AND m.person=? AND m.active=1 AND m.expires>? AND p.active=1').get(t,unit,person,now);
 return !!m&&JSON.parse(m.roles).includes('commission');
}
function scores(input,rubric){
 requireThat(Array.isArray(input)&&input.length===rubric.length&&new Set(input.map(x=>x?.criterionId)).size===rubric.length&&rubric.every(c=>input.some(x=>x?.criterionId===c.id&&Number.isInteger(x.score)&&x.score>=0&&x.score<=4&&text(x.reason,12))),'advice_scores','Her rubrik ölçütü için tekil 0–4 puanı ve ayrı gerekçe gerekli.');
 return rubric.map(c=>{const x=input.find(v=>v.criterionId===c.id);strict(x,['criterionId','score','reason']);return {criterionId:c.id,score:x.score,reason:x.reason};});
}
function baselineCurrent(s,t,sample){
 const a=s.get(t,'assessment',sample.assessmentId);
 return !!a&&digest(a)===sample.assessmentDigest&&digest(s.get(t,'program',a.programId))===sample.programDigest&&a.evidenceDigests.every(x=>{const e=s.get(t,'evidence',x.id);return e&&e.enrollmentId===a.enrollmentId&&hash(e.content)===x.sha256&&currentLmsEvidence(s,t,e)&&alternativeSnapshotValid(s,t,e,x.alternative)&&sourceSnapshotValid(s,t,e,x.source);});
}
function independent(a,sample,baseline,program){return a.id===sample.expertPersonId&&role(a,sample.unit,'commission')&&![sample.owner,sample.createdBy,baseline.createdBy,program.createdBy].includes(a.id);}
const canResolve=(a,sample,c)=>role(a,sample.unit,'quality')&&![sample.owner,sample.createdBy,sample.baselineCreatedBy,c?.createdBy].includes(a.id);
export function adviceReplay(a,action,r){
 if(!actions.includes(action))return false;
 requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Öneri kıyası üretimde kapalı.',503);
 const allowed=action==='advice-protocol'?role(a,r.unit,'admin'):['advice-protocol-review','advice-protocol-hold','advice-resolve'].includes(action)?role(a,r.unit,'quality'):action==='advice-sample'?role(a,r.unit,'instructor'):action==='advice-compare'?role(a,r.unit,'commission'):own(a,r);
 requireThat(allowed&&r.createdBy===a.id,'forbidden','Güncel kişi, birim ve işlem görevi gerekli.',403);return true;
}
export function adviceCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Öneri kıyası yalnız izole sentetik kabulde çalışır.',503);
 if(action==='advice-protocol'){
  strict(p,['programId','dataFlowId','contentRightsId','sourceReference','purpose','candidate','planReference','language','languageTestReference','expertPersonId','expertReference','validUntil','reason','previousId','changeReason','scope','official','syntheticOnly']);
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,'admin'),'not_found','Kendi biriminizde program ve yönetici görevi gerekli.',404);
  requireThat(s.list(a.tenant,'publication').some(r=>r.programId===program.id),'advice_program','İncelenmiş program sürümü gerekli.',409);
  requireThat(p.scope==='local-acceptance'&&p.official===false&&p.syntheticOnly===true&&text(p.reason)&&text(p.purpose)&&text(p.sourceReference)&&text(p.candidate,3,160)&&text(p.planReference)&&p.language==='tr'&&text(p.languageTestReference)&&text(p.expertReference),'advice_protocol','Sentetik kapsam, amaç, kaynak, aday araç/plan ve Türkçe deneme dayanakları gerekli.');
  requireThat(expertActive(s,a.tenant,program.unit,p.expertPersonId,now)&&![a.id,program.createdBy].includes(p.expertPersonId),'advice_expert','Program ve protokolü hazırlayandan ayrı etkin komisyon incelemecisi gerekli.',403);
  requireThat(typeof p.validUntil==='string'&&Number.isFinite(Date.parse(p.validUntil))&&new Date(p.validUntil).toISOString()===p.validUntil&&p.validUntil>now&&Date.parse(p.validUntil)-Date.parse(now)<=366*86400000,'advice_expiry','En çok 366 günlük açık yerel geçerlilik sonu gerekli.');
  const before=latest(s,a.tenant,program.id);requireThat((before?.id||null)===(p.previousId||null)&&(!before||text(p.changeReason)),'advice_changed','Güncel önceki protokol ve değişiklik gerekçesi gerekli.',409);
  const dependencies=[dependency(s,a.tenant,program.unit,p.dataFlowId,'data-flow'),dependency(s,a.tenant,program.unit,p.contentRightsId,'content-rights')];
  requireThat(s.get(a.tenant,'registry',p.dataFlowId).fields.purpose===p.purpose&&s.get(a.tenant,'registry',p.dataFlowId).fields.recipient==='local-simulator'&&s.get(a.tenant,'registry',p.contentRightsId).fields.sourceReference===p.sourceReference,'advice_rights_scope','Veri akışı tam amacı ve yerel benzeticiyi; içerik hakkı tam kaynağı karşılamalı.',409);
  return put('advice-protocol',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programVersion:program.version,programDigest:digest(program),version:(before?.version||0)+1,previousId:before?.id||null,changeReason:before?p.changeReason:null,...Object.fromEntries(['purpose','sourceReference','candidate','planReference','language','languageTestReference','expertPersonId','expertReference','validUntil','reason'].map(k=>[k,p[k]])),dependencies,scope:'local-acceptance',official:false,syntheticOnly:true,providerConnected:false,providerPlanLanguageVerified:false});
 }
 if(['advice-protocol-review','advice-protocol-hold'].includes(action)){
  strict(p,['protocolId','reason',...(action==='advice-protocol-review'?['outcome']:[])]);
  const protocol=s.get(a.tenant,'advice-protocol',p.protocolId);requireThat(protocol&&role(a,protocol.unit,'quality'),'not_found','Bu protokol için kalite görevi gerekli.',404);
  requireThat(![protocol.createdBy,protocol.expertPersonId].includes(a.id),'separation','Protokol hazırlayan ve örneklem uzmanından ayrı kalite incelemesi gerekli.',403);
  requireThat(text(p.reason),'advice_reason','Gerekçeli inceleme gerekli.');
  if(action==='advice-protocol-hold'){
   requireThat(review(s,a.tenant,protocol.id)?.outcome==='accepted'&&!held(s,a.tenant,protocol.id),'advice_changed','Durdurulmamış kabul sürümü gerekli.',409);
   return put(action,{id:id(),unit:protocol.unit,owner:protocol.owner,protocolId:protocol.id,reason:p.reason,official:false});
  }
  requireThat(latest(s,a.tenant,protocol.programId)?.id===protocol.id&&!review(s,a.tenant,protocol.id)&&['accepted','rejected'].includes(p.outcome),'advice_changed','Güncel incelenmemiş protokol ve açık sonuç gerekli.',409);
  if(p.outcome==='accepted')requireThat(protocol.validUntil>now&&dependenciesCurrent(s,a.tenant,protocol)&&digest(s.get(a.tenant,'program',protocol.programId))===protocol.programDigest&&expertActive(s,a.tenant,protocol.unit,protocol.expertPersonId,now),'advice_changed','Protokol dayanakları, uzman üyeliği ve süresi yeniden denetlenmeli.',409);
  return put(action,{id:id(),unit:protocol.unit,owner:protocol.owner,protocolId:protocol.id,protocolDigest:digest(protocol),outcome:p.outcome,reason:p.reason,official:false,providerPlanLanguageVerified:false});
 }
 if(action==='advice-sample'){
  strict(p,['protocolId','assessmentId','suggestion','reason','syntheticConfirmed']);
  const protocol=s.get(a.tenant,'advice-protocol',p.protocolId),baseline=s.get(a.tenant,'assessment',p.assessmentId);
  requireThat(protocol&&baseline&&baseline.programId===protocol.programId&&role(a,protocol.unit,'instructor'),'not_found','Aynı programda insan değerlendirmesi ve eğitici görevi gerekli.',404);
  requireThat(ready(s,a.tenant,protocol,now)&&accepted(s,a.tenant,protocol.programId)?.id===protocol.id,'advice_closed','Güncel ve incelenmiş yerel deneme protokolü gerekli.',409);
  requireThat(p.syntheticConfirmed===true&&text(p.reason),'advice_synthetic','Yalnız sentetik örnek ve elle girilen benzetim çıktısı teyit edilmeli.');
  requireThat(expertActive(s,a.tenant,protocol.unit,protocol.expertPersonId,now)&&![a.id,baseline.owner,baseline.createdBy].includes(protocol.expertPersonId),'advice_expert','Öneriyi giren ve insan değerlendirmesini yapandan ayrı atanmış uzman gerekli.',403);
  requireThat(!s.list(a.tenant,'advice-sample').some(x=>x.protocolId===protocol.id&&x.assessmentId===baseline.id),'duplicate','Bu protokol ve insan değerlendirmesi için örnek zaten kayıtlı.',409);
  const sample={id:id(),unit:baseline.unit,owner:baseline.owner,enrollmentId:baseline.enrollmentId,programId:baseline.programId,programDigest:protocol.programDigest,assessmentId:baseline.id,assessmentDigest:digest(baseline),baselineCreatedBy:baseline.createdBy,baselineScores:baseline.scores,rubric:baseline.rubricSnapshot,protocolId:protocol.id,protocolVersion:protocol.version,protocolDigest:digest(protocol),expertPersonId:protocol.expertPersonId,suggestion:scores(p.suggestion,baseline.rubricSnapshot),reason:p.reason,origin:'manual-synthetic',language:protocol.language,scope:'local-acceptance',official:false,syntheticOnly:true,providerConnected:false,academicRecordsChanged:false};
  requireThat(baselineCurrent(s,a.tenant,sample),'advice_baseline','İnsan değerlendirmesinin sabit kanıt ve rubrik dayanakları doğrulanamadı.',409);
  return put(action,sample);
 }
 const sample=s.get(a.tenant,'advice-sample',p.sampleId);requireThat(sample&&visible(a,sample),'not_found','Bu öneri örneğine erişilemiyor.',404);
 requireThat(text(p.reason),'advice_reason','Gerekçeli insan incelemesi veya itiraz gerekli.');
 const c=comparison(s,a.tenant,sample.id),issue=contest(s,a.tenant,sample.id);
 if(action==='advice-compare'){
  strict(p,['sampleId','expertScores','reason']);
  const baseline=s.get(a.tenant,'assessment',sample.assessmentId),program=s.get(a.tenant,'program',sample.programId),protocol=s.get(a.tenant,'advice-protocol',sample.protocolId);
  requireThat(independent(a,sample,baseline,program),'separation','Atanmış ve önceki değerlendirmeden ayrı komisyon uzmanı gerekli.',403);
  requireThat(!c,'duplicate','Bu örneğin uzman kıyası zaten kayıtlı.',409);
  requireThat(ready(s,a.tenant,protocol,now)&&accepted(s,a.tenant,protocol.programId)?.id===protocol.id&&digest(protocol)===sample.protocolDigest&&baselineCurrent(s,a.tenant,sample),'advice_closed','Protokol ve kanıt dayanakları güncel değil; yeni kıyas kapalı.',409);
  const expertScores=scores(p.expertScores,sample.rubric),rows=expertScores.map(e=>{const baselineScore=sample.baselineScores.find(x=>x.criterionId===e.criterionId).score,suggestionScore=sample.suggestion.find(x=>x.criterionId===e.criterionId).score;return {...e,baselineScore,suggestionScore,suggestionDelta:suggestionScore-e.score,baselineDelta:baselineScore-e.score};});
  return put(action,{id:id(),unit:sample.unit,owner:sample.owner,programId:sample.programId,sampleId:sample.id,sampleDigest:digest(sample),assessmentId:sample.assessmentId,rows,metrics:{sampleCount:1,criterionCount:rows.length,meanAbsoluteSuggestionDelta:rows.reduce((n,r)=>n+Math.abs(r.suggestionDelta),0)/rows.length},reason:p.reason,official:false,providerEfficacyVerified:false,academicRecordsChanged:false});
 }
 if(action==='advice-contest'){
  strict(p,['sampleId','comparisonId','reason']);requireThat(own(a,sample),'forbidden','Yalnız önerinin sahibi öğrenen itiraz edebilir.',403);
  requireThat(c&&c.id===p.comparisonId&&!issue,'advice_contest','Güncel uzman kıyasına tekil itiraz gerekli.',409);
  return put(action,{id:id(),unit:sample.unit,owner:sample.owner,programId:sample.programId,sampleId:sample.id,comparisonId:c.id,comparisonDigest:digest(c),reason:p.reason,official:false,formalNotificationAt:null,academicRecordsChanged:false});
 }
 strict(p,['sampleId','contestId','outcome','correctedScores','reason']);
 requireThat(c&&canResolve(a,sample,c),'separation','Öğrenen, öneri hazırlayan, değerlendirici ve kıyas uzmanından ayrı kalite incelemecisi gerekli.',403);
 requireThat(issue&&issue.id===p.contestId&&issue.comparisonDigest===digest(c)&&!resolution(s,a.tenant,issue.id)&&['retained','withdrawn','corrected'].includes(p.outcome),'advice_resolution','Çözülmemiş öneri itirazı ve açık insan inceleme sonucu gerekli.',409);
 requireThat(p.outcome==='corrected'||p.correctedScores===undefined,'advice_fields','Düzeltme puanı yalnız açık düzeltme sonucunda verilebilir.');
 return put(action,{id:id(),unit:sample.unit,owner:sample.owner,programId:sample.programId,sampleId:sample.id,contestId:issue.id,comparisonId:c.id,outcome:p.outcome,correctedScores:p.outcome==='corrected'?scores(p.correctedScores,sample.rubric):null,reason:p.reason,official:false,academicRecordsChanged:false});
}
export function adviceView(s,a,now){
 const protocols=s.list(a.tenant,'advice-protocol').filter(p=>role(a,p.unit,'admin')||staff(a,p.unit)).map(p=>({...p,review:review(s,a.tenant,p.id)||null,held:held(s,a.tenant,p.id),ready:accepted(s,a.tenant,p.programId)?.id===p.id&&ready(s,a.tenant,p,now),canReview:role(a,p.unit,'quality')&&![p.createdBy,p.expertPersonId].includes(a.id)&&!review(s,a.tenant,p.id)&&latest(s,a.tenant,p.programId)?.id===p.id,canHold:role(a,p.unit,'quality')&&![p.createdBy,p.expertPersonId].includes(a.id)&&review(s,a.tenant,p.id)?.outcome==='accepted'&&!held(s,a.tenant,p.id)}));
 const samples=s.list(a.tenant,'advice-sample').filter(r=>visible(a,r)).map(r=>{const c=comparison(s,a.tenant,r.id),issue=contest(s,a.tenant,r.id),resolved=issue&&resolution(s,a.tenant,issue.id),protocol=s.get(a.tenant,'advice-protocol',r.protocolId),baseline=s.get(a.tenant,'assessment',r.assessmentId),program=s.get(a.tenant,'program',r.programId),current=ready(s,a.tenant,protocol,now)&&accepted(s,a.tenant,r.programId)?.id===protocol.id&&baselineCurrent(s,a.tenant,r);return {...r,current,comparison:c||null,contest:issue?{...issue,resolution:resolved||null}:null,canCompare:!c&&current&&independent(a,r,baseline,program),canContest:own(a,r)&&!!c&&!issue,canResolve:!!issue&&!resolved&&canResolve(a,r,c)};});
 const programs=s.list(a.tenant,'program').filter(p=>role(a,p.unit,'admin')&&s.list(a.tenant,'publication').some(r=>r.programId===p.id)).map(p=>({id:p.id,title:p.title,unit:p.unit,version:p.version,createdBy:p.createdBy})),units=[...new Set(programs.map(p=>p.unit))];
 const experts=units.flatMap(unit=>s.db.prepare('SELECT m.person,m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1').all(a.tenant,unit,now).filter(m=>JSON.parse(m.roles).includes('commission')).map(m=>({unit,personId:m.person})));
 const registries=s.list(a.tenant,'registry').filter(r=>units.includes(r.unit)&&['data-flow','content-rights'].includes(r.type)&&s.list(a.tenant,'registry-review').some(v=>v.recordId===r.id&&v.outcome==='accepted')).map(r=>({id:r.id,unit:r.unit,type:r.type,title:r.title,purpose:r.fields.purpose,recipient:r.fields.recipient,sourceReference:r.fields.sourceReference}));
 const baselines=s.list(a.tenant,'assessment').filter(b=>role(a,b.unit,'instructor')).map(b=>({id:b.id,programId:b.programId,owner:b.owner,rubric:b.rubricSnapshot}));
 return {protocols,samples,programs,experts,registries,baselines,providerConnected:false,providerPlanLanguageVerified:false,official:false};
}
