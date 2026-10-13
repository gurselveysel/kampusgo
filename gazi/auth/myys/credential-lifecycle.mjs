import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {issuanceProfile} from './credential-profile.mjs';
import {keyStatus} from './key-registry.mjs';
import {currentLmsEvidence} from './lms.mjs';
const actions=['replacement-propose','replacement-review','replacement-prepare','replacement-withdraw'];
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Belge durum değişikliği yalnız yerel kabulde çalışır.',503);
const review=(s,t,id)=>s.list(t,'replacement-review').find(x=>x.proposalId===id);
const withdrawn=(s,t,id)=>s.list(t,'replacement-withdraw').some(x=>x.proposalId===id);
const active=(s,t,person,unit,role,now)=>{const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1').get(t,person,unit,now);return !!m&&JSON.parse(m.roles).includes(role);};
function lineage(s,t,d){const rows=[],seen=new Set();let a=s.get(t,'assessment',d.assessmentId);while(a&&!seen.has(a.id)){seen.add(a.id);rows.push(a);a=a.supersedesAssessmentId?s.get(t,'assessment',a.supersedesAssessmentId):null;}return rows;}
function target(core,t,p){
 const s=core.store,old=s.get(t,'issuance',p.previousId),signed=old&&s.get(t,'signed',old.id),before=old&&s.get(t,'decision',old.decisionId),d=s.get(t,'decision',p.decisionId),program=d&&s.get(t,'program',d.programId);
 requireThat(old&&signed&&before&&d&&program&&old.unit===d.unit&&old.owner===d.owner&&old.programId===d.programId&&before.enrollmentId===d.enrollmentId,'replacement_target','İmzalı önceki belge ve aynı öğrenen/program kaydına bağlı karar gerekli.',409);
 requireThat(!s.list(t,'revocation').some(x=>x.issuanceId===old.id),'replacement_changed','Önceki belge zaten iptal edildi veya değiştirildi.',409);
 requireThat(s.list(t,'decision').filter(x=>x.enrollmentId===d.enrollmentId).at(-1)?.id===d.id,'replacement_changed','Öğrenen kaydının en güncel kararı gerekli.',409);
 const chain=lineage(s,t,d),assessment=chain[0],resolutionIds=new Set(chain.map(x=>x.resolutionId).filter(Boolean));
 const appeals=s.list(t,'appeal').filter(x=>s.get(t,'decision',x.decisionId)?.enrollmentId===d.enrollmentId);
 requireThat(assessment?.evidenceDigests.length&&assessment.evidenceDigests.every(x=>{const e=s.get(t,'evidence',x.id);return e&&hash(e.content)===x.sha256&&currentLmsEvidence(s,t,e);})&&appeals.every(x=>{const r=s.list(t,'resolution').find(r=>r.appealId===x.id);return r&&(r.outcome==='upheld'||r.outcome==='reassessment'&&resolutionIds.has(r.id));}),'replacement_pending','Açık itiraz veya eksik yeniden değerlendirme/kanıt varken belge değiştirilemez.',409);
 requireThat(['replace','cancel'].includes(p.operation)&&['academic-reassessment','key-reissue'].includes(p.reasonType),'replacement_fields','İşlem ve dayanak türü gerekli.');
 if(p.reasonType==='academic-reassessment')requireThat(d.id!==before.id&&chain.some(x=>x.id===before.assessmentId),'replacement_lineage','Yeni karar önceki belgenin bağımsız yeniden değerlendirme zincirinden gelmeli.',409);
 else{const key=s.get(t,'key',signed.keyId);requireThat(p.operation==='replace'&&d.id===before.id&&key&&['retired','compromised'].includes(keyStatus(s,t,key).state),'replacement_key','Teknik yeniden ihraç aynı akademik kararı ve emekli/ele geçirilmiş anahtar kaydını gerektirir.',409);}
 requireThat(p.operation==='replace'?d.outcome==='approved'&&core.decisionUsable({tenant:t},d):d.outcome==='rejected','replacement_outcome','Yeni onay değiştirmeye, yeni olumsuz karar gerekçeli iptale konu olabilir.',409);
 return {old,signed,before,d,program,assessment};
}
function independent(a,x,p){return role(a,x.old.unit,'commission')&&![p.createdBy,x.old.owner,x.signed.createdBy,x.before.createdBy,x.d.createdBy,x.program.createdBy,x.assessment.createdBy].includes(a.id);}
export function lifecycleReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim belge değişikliği kapalı.',503);requireThat(role(a,r.unit,action==='replacement-review'?'commission':'studentAffairs'),'forbidden','Güncel belge yaşam döngüsü görevi gerekli.',403);return true;}
export function lifecycleCommand({core,action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='replacement-propose'){
  const old=s.get(a.tenant,'issuance',p.previousId);requireThat(old&&role(a,old.unit,'studentAffairs'),'not_found','Yetkili birimde önceki belge gerekli.',404);
  const x=target(core,a.tenant,p);requireThat(![x.old.owner,x.d.createdBy,x.program.createdBy].includes(a.id),'separation','Belge görevlisi akademik karar ve program hazırlığından ayrı olmalı.',403);
  requireThat(p.scope==='local-acceptance'&&text(p.reason)&&text(p.authorityReference),'replacement_fields','Yerel kapsam, yetki dayanağı ve değişiklik gerekçesi gerekli.');
  requireThat(!s.list(a.tenant,'replacement-proposal').some(r=>r.previousId===old.id&&!withdrawn(s,a.tenant,r.id)&&review(s,a.tenant,r.id)?.outcome!=='rejected'),'replacement_pending','Önceki belge için açık değiştirme/iptal önerisi var.',409);
  const profile=p.operation==='replace'?issuanceProfile(s,a,x.program,now):null;
  return put('replacement-proposal',{id:id(),unit:old.unit,owner:old.owner,previousId:old.id,previousDigest:x.signed.digest,decisionId:x.d.id,operation:p.operation,reasonType:p.reasonType,reason:p.reason,authorityReference:p.authorityReference,profileId:profile?.id||null,profileDigest:profile?hash(stableStringify(profile)):null,official:false,scope:'local-acceptance'});
 }
 const proposal=s.get(a.tenant,'replacement-proposal',p.proposalId);requireThat(proposal&&role(a,proposal.unit,action==='replacement-review'?'commission':'studentAffairs'),'not_found','Yetkili birimde belge değişiklik önerisi gerekli.',404);
 requireThat(!withdrawn(s,a.tenant,proposal.id),'replacement_changed','Öneri geri çekildi.',409);
 const prepared=s.list(a.tenant,'issuance').find(x=>x.replacementProposalId===proposal.id),r=review(s,a.tenant,proposal.id);
 if(action==='replacement-withdraw'){
  requireThat(text(p.reason)&&(!prepared||!s.get(a.tenant,'signed',prepared.id))&&!s.list(a.tenant,'replacement-completion').some(x=>x.proposalId===proposal.id),'replacement_changed','Tamamlanan değişiklik geri çekilemez; gerekçe gerekli.',409);
  if(prepared&&!s.list(a.tenant,'revocation').some(x=>x.issuanceId===prepared.id))put('revocation',{id:id(),unit:prepared.unit,owner:prepared.owner,issuanceId:prepared.id,reason:p.reason,proposalId:proposal.id,kind:'unsigned-preparation-withdrawal'});
  return put('replacement-withdraw',{id:id(),unit:proposal.unit,owner:proposal.owner,proposalId:proposal.id,reason:p.reason,previousCredentialChanged:false});
 }
 const x=target(core,a.tenant,proposal);requireThat(x.signed.digest===proposal.previousDigest,'replacement_changed','Önceki imza özeti eşleşmiyor.',409);
 if(action==='replacement-review'){
  requireThat(!r&&independent(a,x,proposal),'separation','İnceleme ayrı komisyona aittir ve bir kez yapılır.',403);requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason),'replacement_fields','Gerekçeli inceleme sonucu gerekli.');
  requireThat(active(s,a.tenant,proposal.createdBy,proposal.unit,'studentAffairs',now),'replacement_authority','Öneriyi hazırlayanın görevi güncel değil.',409);
  return put('replacement-review',{id:id(),unit:proposal.unit,owner:proposal.owner,proposalId:proposal.id,outcome:p.outcome,reason:p.reason,official:false});
 }
 requireThat(!prepared&&r?.outcome==='accepted'&&active(s,a.tenant,r.createdBy,proposal.unit,'commission',now),'replacement_review','Güncel bağımsız kabul incelemesi ve henüz hazırlanmamış öneri gerekli.',409);
 requireThat(![x.old.owner,x.d.createdBy,x.program.createdBy,r.createdBy].includes(a.id),'separation','Belge işlemi bağımsız yetkili tarafından yürütülmeli.',403);
 if(proposal.operation==='cancel'){
  const revoked=put('revocation',{id:id(),unit:proposal.unit,owner:proposal.owner,issuanceId:x.old.id,reason:proposal.reason,proposalId:proposal.id,decisionId:x.d.id,kind:'reviewed-academic-cancellation'});
  return put('replacement-completion',{id:id(),unit:proposal.unit,owner:proposal.owner,proposalId:proposal.id,previousId:x.old.id,decisionId:x.d.id,revocationId:revoked.id,operation:'cancel',previousDigest:x.signed.digest,official:false});
 }
 const profile=issuanceProfile(s,a,x.program,now);requireThat(profile.id===proposal.profileId&&hash(stableStringify(profile))===proposal.profileDigest,'profile_changed','İncelenen belge profili eşleşmiyor.',409);
 return put('issuance',{id:id(),unit:x.d.unit,owner:x.d.owner,decisionId:x.d.id,programId:x.program.id,profileId:profile.id,profileVersion:profile.version,profileDigest:proposal.profileDigest,authorityId:profile.authorityId,fieldKeys:profile.fields,state:'awaiting-signature',pilot:true,issuer:profile.issuer,visibility:'private',replacesId:x.old.id,previousDigest:x.signed.digest,replacementProposalId:proposal.id,replacementReviewId:r.id});
}
export function replacementReady(core,a,issuance){
 if(!issuance.replacesId)return;local(core.store);const s=core.store,p=s.get(a.tenant,'replacement-proposal',issuance.replacementProposalId),r=p&&review(s,a.tenant,p.id);
 requireThat(p&&!withdrawn(s,a.tenant,p.id)&&r?.id===issuance.replacementReviewId&&r.outcome==='accepted'&&active(s,a.tenant,r.createdBy,issuance.unit,'commission',core.clock()),'replacement_review','Belge değiştirme incelemesi güncel değil.',409);
 const x=target(core,a.tenant,p);requireThat(x.old.id===issuance.replacesId&&x.signed.digest===issuance.previousDigest&&x.d.id===issuance.decisionId,'replacement_changed','Değiştirme zinciri veya önceki imza değişti.',409);
 requireThat(![r.createdBy,x.old.owner,x.d.createdBy,x.program.createdBy].includes(a.id),'separation','Yeni belgeyi incelemeciden ve akademik karar sahibinden ayrı görevli imzalamalı.',403);
}
// Caller holds the same transaction that inserts the new signed credential.
export function completeReplacement(core,a,issuance,newSigned){
 if(!issuance.replacesId)return;replacementReady(core,a,issuance);
 const s=core.store,now=core.clock(),p=s.get(a.tenant,'replacement-proposal',issuance.replacementProposalId);
 const old=s.get(a.tenant,'issuance',issuance.replacesId),put=(kind,r)=>s.put(a.tenant,kind,{...r,unit:old.unit,owner:old.owner,createdAt:now,createdBy:a.id});
 const revocationId='replacement:'+issuance.id;
 put('revocation',{id:revocationId,issuanceId:old.id,reason:p.reason,proposalId:p.id,decisionId:issuance.decisionId,replacementId:issuance.id,kind:'reviewed-credential-replacement'});
 put('replacement-completion',{id:issuance.id,proposalId:p.id,previousId:old.id,newId:issuance.id,decisionId:issuance.decisionId,revocationId,operation:'replace',previousDigest:issuance.previousDigest,newDigest:newSigned.digest,official:false});
 for(const [action,recordId] of [['credential-replaced',issuance.id],['revoke-replaced-credential',revocationId]])s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,action,recordId,now);
}
export function lifecycleView(core,a){
 const s=core.store,t=a.tenant,now=core.clock(),visible=r=>r.owner===a.id&&a.memberships.some(m=>m.unit===r.unit)||['studentAffairs','commission','quality'].some(roleName=>role(a,r.unit,roleName));
 const proposals=s.list(t,'replacement-proposal').filter(visible).map(p=>{
  const r=review(s,t,p.id),w=s.list(t,'replacement-withdraw').find(x=>x.proposalId===p.id),prepared=s.list(t,'issuance').find(x=>x.replacementProposalId===p.id),completion=s.list(t,'replacement-completion').find(x=>x.proposalId===p.id);
  let x,profileReady=p.operation==='cancel';try{x=target(core,t,p);if(p.operation==='replace'){const current=issuanceProfile(s,a,x.program,now);profileReady=current.id===p.profileId&&hash(stableStringify(current))===p.profileDigest;}}catch{}
  return {...p,review:r||null,withdrawal:w||null,preparedId:prepared?.id||null,completion:completion||null,canReview:!!x&&!w&&!r&&independent(a,x,p),canPrepare:!!x&&profileReady&&!w&&!prepared&&r?.outcome==='accepted'&&role(a,p.unit,'studentAffairs')&&active(s,t,r.createdBy,p.unit,'commission',now)&&![x.old.owner,x.d.createdBy,x.program.createdBy,r.createdBy].includes(a.id),canWithdraw:!w&&!completion&&(!prepared||!s.get(t,'signed',prepared.id))&&role(a,p.unit,'studentAffairs')};
 });
 const candidates=[];for(const old of s.list(t,'issuance').filter(r=>role(a,r.unit,'studentAffairs')&&s.get(t,'signed',r.id))){
  if(s.list(t,'replacement-proposal').some(p=>p.previousId===old.id&&!withdrawn(s,t,p.id)&&review(s,t,p.id)?.outcome!=='rejected'))continue;
  const before=s.get(t,'decision',old.decisionId),d=s.list(t,'decision').filter(d=>d.enrollmentId===before.enrollmentId).at(-1),p={previousId:old.id,decisionId:d.id,operation:d.outcome==='approved'?'replace':'cancel',reasonType:d.id===before.id?'key-reissue':'academic-reassessment'};
  try{const x=target(core,t,p);if([x.old.owner,x.d.createdBy,x.program.createdBy].includes(a.id))continue;if(p.operation==='replace')issuanceProfile(s,a,x.program,now);candidates.push({...p,unit:old.unit,owner:old.owner,title:x.program.title,previousDecisionId:before.id});}catch{}
 }
 return {proposals,candidates};
}
