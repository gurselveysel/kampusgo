import {hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {credentialBlocked} from './key-registry.mjs';
import {skillMapView} from './skill-map.mjs';
import {skillsProjection} from './projections.mjs';
import {currentLmsEvidence} from './lms.mjs';
import {alternativeCanAssess} from './alternative-evidence.mjs';
export const portfolioDigest=x=>hash(stableStringify(x));
export const portfolioRole=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
export const portfolioMember=(s,t,u,person,now)=>s.db.prepare('SELECT p.id,p.issuer,p.subject,m.roles FROM persons p JOIN memberships m ON m.person=p.id WHERE p.id=? AND p.active=1 AND m.tenant=? AND m.unit=? AND m.active=1 AND m.expires>?').get(person,t,u,now);
export const portfolioReview=(s,t,id)=>s.list(t,'portfolio-policy-review').find(r=>r.policyId===id);
export const portfolioLatest=(s,t,u,recipient)=>s.list(t,'portfolio-policy').filter(r=>r.unit===u&&r.recipient.personId===recipient).at(-1);
export const portfolioAccepted=(s,t,u,recipient)=>s.list(t,'portfolio-policy').filter(r=>r.unit===u&&r.recipient.personId===recipient&&portfolioReview(s,t,r.id)?.outcome==='accepted').at(-1);
export function portfolioPolicyReady(s,t,p,now){if(!p)return false;const recipient=portfolioMember(s,t,p.unit,p.recipient.personId,now),r=portfolioReview(s,t,p.id);return !!recipient&&recipient.issuer===p.recipient.issuer&&hash(recipient.subject)===p.recipient.subjectDigest&&p.validUntil>now&&r?.outcome==='accepted'&&r.policyDigest===portfolioDigest(p)&&portfolioAccepted(s,t,p.unit,p.recipient.personId)?.id===p.id&&!s.list(t,'portfolio-policy-hold').some(h=>h.policyId===p.id)&&portfolioDigest(s.get(t,'registry',p.dataFlow.id))===p.dataFlow.digest&&portfolioDigest(s.get(t,'registry-review',p.dataFlow.reviewId))===p.dataFlow.reviewDigest;}
export function portfolioSelection(core,t,{owner,enrollmentId,issuanceId,skillLinks,evidenceIds},now){
 const s=core.store,e=s.get(t,'enrollment',enrollmentId),i=s.get(t,'issuance',issuanceId),signed=i&&s.get(t,'signed',i.id),d=i&&s.get(t,'decision',i.decisionId),p=e&&s.get(t,'program',e.programId),member=e&&portfolioMember(s,t,e.unit,owner,now);
 requireThat(e&&e.owner===owner&&member&&JSON.parse(member.roles).includes('learner')&&i?.owner===owner&&i.programId===e.programId&&d?.enrollmentId===e.id&&signed&&!credentialBlocked(core,t,i),'portfolio_source','Kendi etkin program kaydınızda güncel kullanılabilir yerel imzalı belge gerekli.',409);
 // This narrow owner projection is used only after the capability's owner/enrollment
 // check above. It is not an alternative authentication principal or public view.
 const actor={id:owner,tenant:t,mfa:false,memberships:[{unit:e.unit,roles:['learner']}]},maps=skillMapView(s,actor,now),assessment=s.get(t,'assessment',d.assessmentId),evidence=s.list(t,'evidence').filter(v=>v.enrollmentId===e.id&&v.owner===owner);
 const projected=skillsProjection({enrollments:[e],programs:[p],evidence,assessments:[assessment],decisions:[{...d,usable:true}],skillMaps:maps});
 requireThat(Array.isArray(skillLinks)&&skillLinks.length>=1&&skillLinks.length<=30&&new Set(skillLinks.map(l=>l.mapId+':'+l.linkId)).size===skillLinks.length,'portfolio_skills','Bir ile otuz arasında tekil ve incelenmiş beceri ilişkisi seçin.');
 const skills=skillLinks.map(ref=>{const row=projected.find(row=>row.taxonomyLinks.some(l=>l.mapId===ref.mapId&&l.linkId===ref.linkId&&l.usable)),link=row?.taxonomyLinks.find(l=>l.mapId===ref.mapId&&l.linkId===ref.linkId&&l.usable);requireThat(link,'portfolio_skill_closed','Seçilen beceri ilişkisi artık bu programda kullanıma açık değil.',409);return {mapId:link.mapId,mapVersion:link.mapVersion,linkId:link.linkId,conceptId:link.conceptId,label:link.label,sourceVersion:link.sourceVersion,state:link.state,outcomeId:row.outcomeId,outcome:row.label};});
 requireThat(Array.isArray(evidenceIds)&&evidenceIds.length<=10&&new Set(evidenceIds).size===evidenceIds.length,'portfolio_evidence','En çok on tekil çalışma kanıtı seçin.');
 const selected=evidenceIds.map(id=>{const r=evidence.find(r=>r.id===id);requireThat(r&&assessment.evidenceIds.includes(r.id)&&hash(r.content)===r.sha256&&currentLmsEvidence(s,t,r)&&alternativeCanAssess(s,t,r),'portfolio_evidence_closed','Çalışma kanıtı aynı kararın güncel ve erişilebilir dayanağı olmalı.',409);return {id:r.id,taskId:r.taskId,content:r.content,sha256:r.sha256};});
 const content={program:{title:p.title,version:p.version},credential:{title:p.title,programVersion:d.programVersion,issuedAt:signed.createdAt,scope:'local-acceptance',official:false},skills,evidence:selected};
 return {enrollment:e,issuance:i,content,selectionDigest:portfolioDigest({enrollmentId:e.id,issuanceId:i.id,signedDigest:signed.digest,content})};
}
export function portfolioActive(core,t,g,now){const s=core.store,p=g&&s.get(t,'portfolio-policy',g.policyId);if(!g||g.expires<=now||s.list(t,'portfolio-revocation').some(r=>r.grantId===g.id)||!portfolioPolicyReady(s,t,p,now)||g.policyDigest!==portfolioDigest(p)||g.purpose!==p.purpose)return null;try{const selection=portfolioSelection(core,t,g,now);return selection.selectionDigest===g.selectionDigest?{policy:p,...selection}:null;}catch{return null;}}
