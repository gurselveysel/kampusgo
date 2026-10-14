import {hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const digest=r=>hash(stableStringify(r));
const canonicalKey=v=>typeof v==='string'?v.trim().normalize('NFKC').toUpperCase():v;
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const text=(v,min=3,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const roles=(a,unit,list)=>a.mfa&&a.memberships.some(m=>m.unit===unit&&m.roles.some(r=>list.includes(r)));
const student=(a,r)=>a.mfa&&r.owner===a.id&&a.memberships.some(m=>m.unit===r.unit&&m.roles.includes('learner'));
const staff=(a,r)=>roles(a,r.unit,['commission','quality','studentAffairs','coordinator','it']);
const canRead=(a,r)=>student(a,r)||staff(a,r);
const academicRead=(a,r)=>student(a,r)||roles(a,r.unit,['commission','quality','studentAffairs','coordinator']);
const need=(a,r,list)=>requireThat(roles(a,r.unit,list),'forbidden','Bu tanıma işleminde birim yetkisi ve çok faktörlü doğrulama gerekli.',403);
const get=(s,a,kind,id)=>{const r=s.get(a.tenant,kind,id);requireThat(r&&(canRead(a,r)||roles(a,r.unit,['admin'])),'not_found','Tanıma kaydı bulunamadı veya erişilemiyor.',404);return r;};
export function creditUnits(n){requireThat(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1000&&Math.abs(n*100-Math.round(n*100))<1e-7,'credits','Kredi 0–1000 aralığında, en çok iki ondalık basamaklı olmalı.');return Math.round(n*100);}
const decisions=(s,t,requestId)=>s.list(t,'recognition-decision').filter(x=>x.requestId===requestId);
const appeals=(s,t,requestId)=>s.list(t,'recognition-appeal').filter(x=>s.get(t,'recognition-decision',x.decisionId)?.requestId===requestId);
const resolution=(s,t,appealId)=>s.list(t,'recognition-resolution').find(x=>x.appealId===appealId);
export function recognitionLedger(s,tenant){const reversed=new Set(s.list(tenant,'recognition-reversal').map(x=>x.creditId));return s.list(tenant,'recognition-credit').filter(x=>!reversed.has(x.id));}
export function recognitionLimits(policy,{credit,remoteCredit,existing}){
 const denominator=creditUnits(policy.degreeCredits),n=creditUnits(credit),remote=creditUnits(remoteCredit),prior=creditUnits(existing);
 requireThat(policy.creditDenominator==='graduation-credits'&&denominator>0&&policy.remoteDenominator==='proposed-transfer-credits','denominator','Tanıma paydaları açık ve sürümlü olmalı.');
 requireThat(remote<=n,'remote_credit','Uzaktan kredi kabul edilecek toplam krediyi aşamaz.');
 requireThat((prior+n)*100<=denominator*policy.creditCapPercent,'credit_cap','Bu yolun toplam kredi sınırı aşılır.',409);
 requireThat(policy.remoteCapPercent===null?remote===0:remote*100<=n*policy.remoteCapPercent,'remote_cap','Transfer teklifindeki uzaktan kredi payı sınırı aşılır veya bu yolda tanımlanmamıştır.',409);
 return {credit:{numerator:(prior+n)/100,denominator:denominator/100,capPercent:policy.creditCapPercent},remote:{numerator:remote/100,denominator:n/100,capPercent:policy.remoteCapPercent}};
}
export function recognitionReplay(a,action,r){
 if(typeof action!=='string'||!action.startsWith('recognition-'))return false;
 const map={'recognition-policy':['admin'],'recognition-policy-review':['commission'],'recognition-technical':['it'],'recognition-decide':['commission'],'recognition-resolve':['quality'],'recognition-offer-decide':['commission'],'recognition-offer-resolve':['quality']};
 if(map[action])need(a,r,map[action]);else requireThat(student(a,r),'forbidden','Yalnız kendi tanıma kaydınıza erişebilirsiniz.',403);return true;
}
export function recognitionCommand(ctx){return executeRecognition(ctx,null);}
function executeRecognition(ctx,batch){
 const {action,p,a,s,put,id,now}=ctx;
 if(typeof action!=='string'||!action.startsWith('recognition-'))return null;
 const tenant=a.tenant;
 if(action.startsWith('recognition-offer'))return offerCommand(ctx);
 for(const key of ['code','targetProgramCode','targetCourseCode','gainKey','sourceOutcomeKey'])if(p[key]!==undefined)p[key]=canonicalKey(p[key]);
 if(action==='recognition-policy'){
  need(a,p,['admin']);
  for(const key of ['code','title','targetProgramCode','targetProgramTitle','sourceReference','sourceArticle','sourceVersion','scope','priorCourseRule','doubleCountingRule','appealRule'])requireThat(text(p[key]),'recognition_policy','Kaynak, kapsam, önceki ders, çift sayım ve itiraz alanları gerekli.');
  requireThat(['micro','rpl','previous-course'].includes(p.pathway),'recognition_policy','Tanıma yolu ayrı seçilmeli.');
  requireThat(validDate(p.sourceDate)&&validDate(p.validFrom)&&validDate(p.validUntil)&&p.validFrom<=p.validUntil,'recognition_policy','Kaynak tarihi ve geçerlilik aralığı gerekli.');
  requireThat(creditUnits(p.degreeCredits)>0&&Number.isInteger(p.creditCapPercent)&&p.creditCapPercent>0&&p.creditCapPercent<=100&&(p.remoteCapPercent===null||Number.isInteger(p.remoteCapPercent)&&p.remoteCapPercent>=0&&p.remoteCapPercent<=100),'recognition_policy','Mezuniyet kredisi ve açık sınırlar gerekli.');
  requireThat(p.creditDenominator==='graduation-credits'&&p.remoteDenominator==='proposed-transfer-credits','denominator','Kredi ve uzaktan eğitim paydalarını karıştırmayın.');
  p.transferScope??='single-course';requireThat(['single-course','multi-course-offer'].includes(p.transferScope),'recognition_policy','Teklif kapsamı açıkça seçilmeli.');
  const previous=s.list(tenant,'recognition-policy').filter(x=>x.unit===p.unit&&x.code===p.code).at(-1);
  requireThat(!previous||p.previousPolicyId===previous.id&&previous.targetProgramCode===p.targetProgramCode&&previous.pathway===p.pathway&&text(p.changeReason,20),'version_conflict','Güncel politika sürümü ve değişiklik gerekçesi gerekli.',409);
  requireThat(previous||!p.previousPolicyId,'version_conflict','Önceki politika aynı kapsamda olmalı.',409);
  const keys=['transferScope','unit','code','title','targetProgramCode','targetProgramTitle','sourceReference','sourceArticle','sourceVersion','sourceDate','scope','priorCourseRule','doubleCountingRule','appealRule','pathway','validFrom','validUntil','degreeCredits','creditCapPercent','remoteCapPercent','creditDenominator','remoteDenominator'];
  return put('recognition-policy',{...Object.fromEntries(keys.map(k=>[k,p[k]])),id:id(),owner:a.id,version:(previous?.version||0)+1,...(previous?{previousPolicyId:previous.id,changeReason:p.changeReason}:{}),official:false});
 }
 if(action==='recognition-policy-review'){
  const r=get(s,a,'recognition-policy',p.policyId);need(a,r,['commission']);requireThat(r.createdBy!==a.id,'separation','Politikayı hazırlayan inceleme yapamaz.',403);
  requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason,20),'recognition_policy','İnceleme sonucu ve gerekçe gerekli.');requireThat(!s.list(tenant,'recognition-policy-review').some(x=>x.policyId===r.id),'duplicate','Politika sürümü zaten incelendi.',409);
  return put('recognition-policy-review',{id:id(),unit:r.unit,owner:r.owner,policyId:r.id,outcome:p.outcome,reason:p.reason,official:false});
 }
 if(action==='recognition-request'){
  const e=get(s,a,'enrollment',p.enrollmentId);requireThat(student(a,e),'forbidden','Yalnız kendi program kaydınız için talep hazırlayabilirsiniz.',403);
  const policy=s.get(tenant,'recognition-policy',p.policyId);requireThat(policy&&policy.unit===e.unit&&policy.validFrom<=now.slice(0,10)&&policy.validUntil>=now.slice(0,10)&&s.list(tenant,'recognition-policy-review').some(x=>x.policyId===policy.id&&x.outcome==='accepted'),'recognition_policy','Geçerli ve yerelde incelenmiş politika gerekli.');
  for(const key of ['sourceTitle','sourceIssuer','sourceCredentialId','sourceOutcomeKey','targetCourseCode','mappingReason'])requireThat(text(p[key],key==='mappingReason'?20:3),'recognition_request','Belge, ders ve öğrenme çıktısı eşlemesi açıklanmalı.');
  requireThat(/^[a-f0-9]{64}$/.test(p.sourceDigest),'recognition_request','Dosyanın SHA-256 özeti gerekli.');
  requireThat(creditUnits(p.requestedCredits)>0&&creditUnits(p.remoteCredits)<=creditUnits(p.requestedCredits),'credits','Talep kredisi ve uzaktan kredi tutarlı olmalı.');
  requireThat(!s.list(tenant,'recognition-request').some(x=>x.owner===a.id&&x.targetProgramCode===policy.targetProgramCode&&x.targetCourseCode===p.targetCourseCode&&x.sourceDigest===p.sourceDigest),'duplicate','Bu belge ve ders için talep zaten var.',409);
  return put('recognition-request',{id:id(),unit:e.unit,owner:a.id,enrollmentId:e.id,policyId:policy.id,targetProgramCode:policy.targetProgramCode,sourceTitle:p.sourceTitle,sourceIssuer:p.sourceIssuer,sourceCredentialId:p.sourceCredentialId,sourceOutcomeKey:p.sourceOutcomeKey,sourceDigest:p.sourceDigest,targetCourseCode:p.targetCourseCode,mappingReason:p.mappingReason,requestedCredits:p.requestedCredits,remoteCredits:p.remoteCredits,official:false});
 }
 if(action==='recognition-technical'){
  const r=get(s,a,'recognition-request',p.requestId);need(a,r,['it']);requireThat(a.id!==r.owner,'separation','Kendi belgenizi teknik incelemeden geçiremezsiniz.',403);
  requireThat(['accepted','rejected','inconclusive'].includes(p.outcome)&&['issuer-record-reviewed','signature-report-reviewed'].includes(p.method)&&text(p.reportReference,12)&&text(p.reason,20),'technical_review','Teknik inceleme yöntemi, raporu ve gerekçesi gerekli.');
  requireThat(!s.list(tenant,'recognition-technical').some(x=>x.requestId===r.id),'duplicate','Teknik inceleme kayıtlı; yeni belge sürümü için yeni talep gerekli.',409);
  return put('recognition-technical',{id:id(),unit:r.unit,owner:r.owner,requestId:r.id,sourceDigest:r.sourceDigest,outcome:p.outcome,method:p.method,reportReference:p.reportReference,reason:p.reason,automatedVerification:false});
 }
 if(action==='recognition-decide'){
  const r=get(s,a,'recognition-request',p.requestId),policy=get(s,a,'recognition-policy',r.policyId);need(a,r,['commission']);
  requireOfferBatch(s,tenant,r.id,batch);
  requireThat(policy.transferScope!=='multi-course-offer'||batch,'offer_required','Bu politika çok dersli teklif kararı gerektirir.',409);
  const technical=s.list(tenant,'recognition-technical').find(x=>x.requestId===r.id),prior=decisions(s,tenant,r.id).at(-1);
  requireThat(![r.owner,technical?.createdBy,policy.createdBy].includes(a.id),'separation','Teknik inceleme ve akademik karar ayrı kişilerce yürütülmeli.',403);
  let res;
  if(prior){res=s.list(tenant,'recognition-resolution').find(x=>x.decisionId===prior.id&&x.outcome==='reassessment'&&x.id===p.resolutionId);requireThat(res&&!s.list(tenant,'recognition-decision').some(x=>x.resolutionId===res.id),'duplicate','Önceki kararı değiştirmek için bağımsız yeniden inceleme gerekli.',409);requireThat(![prior.createdBy,res.createdBy].includes(a.id),'separation','Yeni karar önceki karar sahibi ve incelemeciden bağımsız olmalı.',403);}
  requireThat(appeals(s,tenant,r.id).every(x=>resolution(s,tenant,x.id)),'review_pending','Açık itiraz önce incelenmeli.',409);
  requireThat(['full','partial','rejected'].includes(p.outcome)&&text(p.reason,20)&&text(p.authorityReference,12),'recognition_decision','Gerekçe, yetkili yerel karar referansı ve sonuç gerekli.');
  const units=creditUnits(p.credits),remote=creditUnits(p.remoteCredits),requested=creditUnits(r.requestedCredits);
  requireThat(p.outcome==='rejected'?units===0&&remote===0:p.outcome==='full'?units===requested:units>0&&units<requested,'credits','Tam, kısmi ve red kredileri taleple tutarlı olmalı.');
  requireThat(remote<=creditUnits(r.remoteCredits),'remote_credit','Talepte bulunmayan uzaktan kredi eklenemez.');
  requireThat(remote<=units&&units-remote<=requested-creditUnits(r.remoteCredits),'remote_credit','Kabul edilen uzaktan ve yüz yüze kredi, talebin ilgili paylarını aşamaz.');
  let limits=null;
  if(units){
   requireThat(technical?.outcome==='accepted'&&technical.sourceDigest===r.sourceDigest,'technical_review','Kabul edilmiş, aynı belgeye bağlı teknik inceleme gerekli.',409);
   requireThat(text(p.gainKey,3,100)&&p.priorCourseChecked===true&&text(p.priorCourseReference,12),'double_counting','Önceki ders ve kanonik kazanım inceleme kaydı gerekli.');
   requireThat(policy.validFrom<=now.slice(0,10)&&policy.validUntil>=now.slice(0,10),'recognition_policy','Politikanın geçerliliği dolmuş.',409);
   const existing=recognitionLedger(s,tenant).filter(x=>x.owner===r.owner&&x.targetProgramCode===r.targetProgramCode&&x.decisionId!==prior?.id&&!batch?.priorDecisionIds.includes(x.decisionId));
   requireThat(!existing.some(x=>x.gainKey===p.gainKey||x.targetCourseCode===r.targetCourseCode||x.sourceDigest===r.sourceDigest&&x.sourceOutcomeKey===r.sourceOutcomeKey),'double_counting','Aynı kazanım, ders veya belge çıktısı ikinci kredi oluşturamaz.',409);
   limits=batch?.limits||recognitionLimits(policy,{credit:p.credits,remoteCredit:p.remoteCredits,existing:existing.filter(x=>x.pathway===policy.pathway).reduce((n,x)=>n+creditUnits(x.credits),0)/100});
  }
  const decision=put('recognition-decision',{id:id(),...(batch?{offerId:batch.offer.id,offerDecisionId:batch.decisionId}:{}),unit:r.unit,owner:r.owner,requestId:r.id,policyId:policy.id,technicalId:technical?.id||null,outcome:p.outcome,credits:p.credits,remoteCredits:p.remoteCredits,reason:p.reason,authorityReference:p.authorityReference,gainKey:units?p.gainKey:null,priorCourseReference:units?p.priorCourseReference:null,limits,...(res?{resolutionId:res.id,supersedesDecisionId:prior.id}:{}),official:false});
  if(prior)for(const c of recognitionLedger(s,tenant).filter(x=>x.decisionId===prior.id))put('recognition-reversal',{id:id(),unit:c.unit,owner:c.owner,creditId:c.id,decisionId:decision.id,reason:'Bağımsız yeniden inceleme kararı'});
  if(units)put('recognition-credit',{id:id(),...(batch?{offerId:batch.offer.id,offerDecisionId:batch.decisionId}:{}),unit:r.unit,owner:r.owner,decisionId:decision.id,requestId:r.id,policyId:policy.id,pathway:policy.pathway,targetProgramCode:r.targetProgramCode,targetCourseCode:r.targetCourseCode,gainKey:p.gainKey,sourceDigest:r.sourceDigest,sourceOutcomeKey:r.sourceOutcomeKey,credits:p.credits,remoteCredits:p.remoteCredits,official:false});
  return decision;
 }
 if(action==='recognition-appeal'){
  const d=get(s,a,'recognition-decision',p.decisionId);requireThat(student(a,d),'forbidden','Yalnız kendi kararınıza itiraz edebilirsiniz.',403);
  requireOfferBatch(s,tenant,d.requestId,batch);
  requireThat(decisions(s,tenant,d.requestId).at(-1)?.id===d.id,'version_conflict','İtiraz güncel karara bağlı olmalı.',409);
  requireThat(text(p.reason,20),'reason','İtiraz gerekçesi gerekli.');requireThat(!s.list(tenant,'recognition-appeal').some(x=>x.decisionId===d.id),'duplicate','Karara itiraz zaten kayıtlı.',409);
  return put('recognition-appeal',{id:id(),unit:d.unit,owner:d.owner,decisionId:d.id,reason:p.reason,official:false});
 }
 if(action==='recognition-resolve'){
  const appeal=get(s,a,'recognition-appeal',p.appealId),d=get(s,a,'recognition-decision',appeal.decisionId),tech=d.technicalId&&s.get(tenant,'recognition-technical',d.technicalId);need(a,appeal,['quality']);
  requireOfferBatch(s,tenant,d.requestId,batch);
  requireThat(![appeal.owner,d.createdBy,tech?.createdBy].includes(a.id),'separation','İtiraz incelemesi bağımsız olmalı.',403);
  requireThat(['upheld','reassessment'].includes(p.outcome)&&text(p.reason,20),'resolution','İnceleme sonucu ve gerekçe gerekli.');requireThat(!resolution(s,tenant,appeal.id),'duplicate','İtiraz zaten incelendi.',409);
  return put('recognition-resolution',{id:id(),unit:appeal.unit,owner:appeal.owner,appealId:appeal.id,decisionId:d.id,outcome:p.outcome,reason:p.reason,official:false});
 }
 return null;
}
export function recognitionView(s,a){
 const scoped=kind=>s.list(a.tenant,kind).filter(r=>canRead(a,r));
 const policies=s.list(a.tenant,'recognition-policy').filter(r=>a.memberships.some(m=>m.unit===r.unit));
 const reviews=s.list(a.tenant,'recognition-policy-review').filter(r=>policies.some(p=>p.id===r.policyId));
 const ds=scoped('recognition-decision').filter(r=>academicRead(a,r));
 const credits=recognitionLedger(s,a.tenant).filter(r=>academicRead(a,r)).map(c=>({...c,held:!recognitionRequestUsable(s,a.tenant,c.requestId)}));
 const offers=scoped('recognition-offer').filter(r=>academicRead(a,r));
 return {offers,offerWithdrawals:scoped('recognition-offer-withdrawal').filter(r=>academicRead(a,r)),offerDecisions:scoped('recognition-offer-decision').filter(r=>academicRead(a,r)),offerAppeals:scoped('recognition-offer-appeal').filter(r=>academicRead(a,r)),offerResolutions:scoped('recognition-offer-resolution').filter(r=>academicRead(a,r)),policies:policies.map(p=>({...p,review:reviews.find(x=>x.policyId===p.id)||null})),requests:scoped('recognition-request').map(r=>academicRead(a,r)?r:{...Object.fromEntries(['id','unit','owner','enrollmentId','policyId','targetProgramCode','targetCourseCode','sourceTitle','sourceIssuer','sourceCredentialId','sourceOutcomeKey','sourceDigest'].map(k=>[k,r[k]])),technicalOnly:true}),technical:scoped('recognition-technical'),decisions:ds,appeals:scoped('recognition-appeal').filter(r=>academicRead(a,r)),resolutions:scoped('recognition-resolution').filter(r=>academicRead(a,r)),credits};
}

// Batch context is constructed only here, never read from a browser field.
const withdrawn=(s,t,offerId)=>s.list(t,'recognition-offer-withdrawal').some(w=>w.offerId===offerId);
const offerFor=(s,t,requestId)=>s.list(t,'recognition-offer').find(o=>!withdrawn(s,t,o.id)&&o.rows.some(r=>r.requestId===requestId));
const offerDecisions=(s,t,offerId)=>s.list(t,'recognition-offer-decision').filter(d=>d.offerId===offerId);
function requireOfferBatch(s,t,requestId,batch){const o=offerFor(s,t,requestId);requireThat(!o||batch?.offer.id===o.id,'offer_required','Bu ders çok dersli teklife bağlı; karar ve itiraz teklifin bütününden yürütülmeli.',409);}
export function recognitionRequestUsable(s,t,requestId){
 const ready=id=>appeals(s,t,id).every(ap=>{const res=resolution(s,t,ap.id);return res&&(res.outcome==='upheld'||decisions(s,t,id).some(d=>d.resolutionId===res.id));});
 const o=offerFor(s,t,requestId);if(!o)return ready(requestId);
 const d=offerDecisions(s,t,o.id).at(-1);
 return !!d&&d.rowDecisionIds.length===o.rows.length&&o.rows.every(r=>{const latest=decisions(s,t,r.requestId).at(-1);return latest?.offerDecisionId===d.id&&d.rowDecisionIds.includes(latest.id)&&ready(r.requestId);});
}
function offerSnapshot(s,a,o){
 requireThat(!withdrawn(s,a.tenant,o.id),'offer_withdrawn','Teklif geri çekilmiş; karar verilemez.',409);
 const policy=get(s,a,'recognition-policy',o.policyId),review=s.list(a.tenant,'recognition-policy-review').find(r=>r.policyId===policy.id&&r.outcome==='accepted');
 requireThat(digest(policy)===o.policyDigest&&review&&digest(review)===o.reviewDigest,'version_conflict','Teklifin politika veya inceleme kaydı değişmiş.',409);
 const requests=o.rows.map(row=>{const r=get(s,a,'recognition-request',row.requestId);requireThat(digest(r)===row.requestDigest,'version_conflict','Teklifin ders talebi değişmiş.',409);return r;});
 return {policy,requests};
}
function offerCommand(ctx){
 const {action,p,a,s,put,id,now}=ctx,t=a.tenant;
 if(action==='recognition-offer'){
  requireThat(Array.isArray(p.requestIds)&&p.requestIds.length>=2&&p.requestIds.length<=10&&new Set(p.requestIds).size===p.requestIds.length,'offer_rows','Teklif 2–10 ayrı ders talebi içermeli.');
  const rows=p.requestIds.map(key=>get(s,a,'recognition-request',key)),r=rows[0];
  requireThat(rows.every(x=>student(a,x)),'forbidden','Yalnız kendi ders taleplerinizi birleştirebilirsiniz.',403);
  requireThat(rows.every(x=>x.unit===r.unit&&x.enrollmentId===r.enrollmentId&&x.policyId===r.policyId&&x.targetProgramCode===r.targetProgramCode),'offer_rows','Dersler aynı program kaydı ve politika sürümüne bağlı olmalı.');
  requireThat(new Set(rows.map(x=>x.targetCourseCode)).size===rows.length,'double_counting','Teklifte aynı hedef ders tekrarlanamaz.',409);
  requireThat(rows.every(x=>!decisions(s,t,x.id).length&&!offerFor(s,t,x.id)),'version_conflict','Karar verilmiş veya başka teklife bağlanmış ders kullanılamaz.',409);
  requireThat(text(p.title,3,200)&&text(p.reason,20),'offer_fields','Teklif adı ve ortak gerekçe gerekli.');
  const policy=s.get(t,'recognition-policy',r.policyId);requireThat(policy&&policy.unit===r.unit,'not_found','Teklif politikası bulunamadı.',404);const review=s.list(t,'recognition-policy-review').find(x=>x.policyId===policy.id&&x.outcome==='accepted');
  requireThat(review&&policy.validFrom<=now.slice(0,10)&&policy.validUntil>=now.slice(0,10),'recognition_policy','Geçerli, incelenmiş politika gerekli.',409);
  requireThat(policy.transferScope==='multi-course-offer','recognition_policy','Politika bu çok dersli teklif kapsamını açıkça içermeli.',409);
  return put('recognition-offer',{id:id(),unit:r.unit,owner:a.id,enrollmentId:r.enrollmentId,policyId:policy.id,policyDigest:digest(policy),reviewDigest:digest(review),targetProgramCode:r.targetProgramCode,title:p.title,reason:p.reason,rows:rows.map(x=>({requestId:x.id,requestDigest:digest(x)})),official:false});
 }
 if(action==='recognition-offer-withdraw'){
  const o=get(s,a,'recognition-offer',p.offerId);requireThat(student(a,o),'forbidden','Yalnız kendi teklifinizi geri çekebilirsiniz.',403);
  requireThat(!offerDecisions(s,t,o.id).length&&!withdrawn(s,t,o.id),'version_conflict','Karar verilen veya geri çekilen teklif değiştirilemez.',409);requireThat(text(p.reason,20),'reason','Geri çekme gerekçesi gerekli.');
  return put('recognition-offer-withdrawal',{id:id(),unit:o.unit,owner:o.owner,offerId:o.id,reason:p.reason,official:false});
 }
 if(action==='recognition-offer-decide'){
  const o=get(s,a,'recognition-offer',p.offerId);need(a,o,['commission']);const {policy,requests}=offerSnapshot(s,a,o),prior=offerDecisions(s,t,o.id).at(-1);
  requireThat((p.previousDecisionId??null)===(prior?.id??null),'version_conflict','Teklifin güncel kararını yeniden yükleyin.',409);
  requireThat(Array.isArray(p.rows)&&p.rows.length===requests.length&&new Set(p.rows.map(r=>r.requestId)).size===requests.length&&p.rows.every(r=>requests.some(x=>x.id===r.requestId)),'offer_rows','Her ders için tam bir karar satırı gerekli.');
  requireThat(text(p.reason,20)&&text(p.authorityReference,12),'recognition_decision','Teklifin gerekçesi ve karar referansı gerekli.');
  let res;
  if(prior){res=s.list(t,'recognition-offer-resolution').find(r=>r.id===p.resolutionId&&r.decisionId===prior.id&&r.outcome==='reassessment');requireThat(res&&!offerDecisions(s,t,o.id).some(d=>d.resolutionId===res.id),'duplicate','Teklif için bağımsız yeniden inceleme gerekli.',409);}
  const priorDecisionIds=prior?.rowDecisionIds||[],existing=recognitionLedger(s,t).filter(x=>x.owner===o.owner&&x.targetProgramCode===o.targetProgramCode&&x.pathway===policy.pathway&&!priorDecisionIds.includes(x.decisionId));
  const credits=p.rows.reduce((n,r)=>n+creditUnits(r.credits),0)/100,remoteCredits=p.rows.reduce((n,r)=>n+creditUnits(r.remoteCredits),0)/100;
  // Rejecting an entire offer needs no new credit authorization. A zero denominator is displayed as not applicable.
  const limits=credits?recognitionLimits(policy,{credit:credits,remoteCredit:remoteCredits,existing:existing.reduce((n,r)=>n+creditUnits(r.credits),0)/100}):null;
  const decisionId=id(),batch={offer:o,decisionId,priorDecisionIds,limits};
  const ds=requests.map(r=>{const row=p.rows.find(x=>x.requestId===r.id),resolutionId=res?.rowResolutionIds.find(key=>s.get(t,'recognition-resolution',key)?.decisionId===decisions(s,t,r.id).at(-1)?.id);return executeRecognition({...ctx,action:'recognition-decide',p:{requestId:r.id,outcome:row.outcome,credits:row.credits,remoteCredits:row.remoteCredits,gainKey:canonicalKey(row.gainKey),priorCourseChecked:row.priorCourseChecked,priorCourseReference:row.priorCourseReference,reason:p.reason,authorityReference:p.authorityReference,...(resolutionId?{resolutionId}:{})}},batch);});
  return put('recognition-offer-decision',{id:decisionId,unit:o.unit,owner:o.owner,offerId:o.id,rowDecisionIds:ds.map(d=>d.id),credits,remoteCredits,limits,reason:p.reason,authorityReference:p.authorityReference,...(res?{resolutionId:res.id,supersedesDecisionId:prior.id}:{}),official:false});
 }
 if(action==='recognition-offer-appeal'){
  const d=get(s,a,'recognition-offer-decision',p.decisionId),o=get(s,a,'recognition-offer',d.offerId);requireThat(student(a,o),'forbidden','Yalnız kendi teklif kararınıza itiraz edebilirsiniz.',403);
  requireThat(offerDecisions(s,t,o.id).at(-1)?.id===d.id,'version_conflict','İtiraz güncel teklif kararına bağlı olmalı.',409);
  requireThat(!s.list(t,'recognition-offer-appeal').some(ap=>ap.decisionId===d.id),'duplicate','Teklif itirazı zaten kayıtlı.',409);
  const aps=d.rowDecisionIds.map(decisionId=>executeRecognition({...ctx,action:'recognition-appeal',p:{decisionId,reason:p.reason}},{offer:o}));
  return put('recognition-offer-appeal',{id:id(),unit:o.unit,owner:o.owner,offerId:o.id,decisionId:d.id,rowAppealIds:aps.map(ap=>ap.id),reason:p.reason,official:false});
 }
 if(action==='recognition-offer-resolve'){
  const ap=get(s,a,'recognition-offer-appeal',p.appealId),o=get(s,a,'recognition-offer',ap.offerId);need(a,o,['quality']);
  requireThat(!s.list(t,'recognition-offer-resolution').some(r=>r.appealId===ap.id),'duplicate','Teklif itirazı zaten incelendi.',409);
  const rs=ap.rowAppealIds.map(appealId=>executeRecognition({...ctx,action:'recognition-resolve',p:{appealId,outcome:p.outcome,reason:p.reason}},{offer:o}));
  return put('recognition-offer-resolution',{id:id(),unit:o.unit,owner:o.owner,offerId:o.id,appealId:ap.id,decisionId:ap.decisionId,rowResolutionIds:rs.map(r=>r.id),outcome:p.outcome,reason:p.reason,official:false});
 }
 return null;
}
