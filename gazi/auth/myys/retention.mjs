import {requireThat,hash,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {countryCodes,countrySource,flowStages,partyRoles} from './retention-model.mjs';
const role=(a,u,rs)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>rs.includes(r)));
const text=(v,min=20)=>typeof v==='string'&&v.trim().length>=min&&v.length<=2000;
const all=(s,t)=>s.list(t,'flow-policy');
const latest=(s,t,p)=>all(s,t).filter(r=>r.unit===p.unit&&r.flowKey===p.flowKey).at(-1);
const reviewed=(s,t,p)=>s.list(t,'flow-review').find(r=>r.policyId===p.id);
const activeReviewer=(s,t,p,now)=>{const r=reviewed(s,t,p);if(r?.outcome!=='accepted')return false;const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(t,r.createdBy,p.unit,now);return m&&JSON.parse(m.roles).includes('admin');};
const scope=(s,a,policyId,roles)=>{const p=s.get(a.tenant,'flow-policy',policyId);requireThat(p&&role(a,p.unit,roles),'not_found','Akış kuralı bulunamadı veya erişilemiyor.',404);return p;};
function candidates(s,t,p,cutoff){
 // A session has tenant scope but no unit scope. Multi-unit identities cannot
 // safely inherit the shortest unit retention rule, so they are never removed.
 const rows=s.db.prepare('SELECT b.session_hash,b.person FROM bindings b JOIN identity_scopes i ON i.session_hash=b.session_hash WHERE i.tenant=? AND b.expires<=? AND EXISTS (SELECT 1 FROM memberships m WHERE m.tenant=i.tenant AND m.person=b.person AND m.unit=?) ORDER BY b.session_hash').all(t,cutoff,p.unit);
 const eligible=rows.filter(r=>s.db.prepare('SELECT COUNT(*) AS n FROM memberships WHERE tenant=? AND person=?').get(t,r.person).n===1);
 const selected=eligible.slice(0,100).map(r=>r.session_hash);return {selected,digest:hash(stableStringify(selected)),eligibleCount:eligible.length,ambiguousCount:rows.length-eligible.length};
}
export function retentionReplay(a,action,r){if(!['flow-policy','flow-review','retention-preview','retention-run'].includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Saklama işlemi yalnız izole yerel kabulde çalışır.',503);requireThat(role(a,r.unit,action.startsWith('retention-')?['it']:['admin']),'forbidden','Güncel saklama görevi ve çok faktörlü doğrulama gerekli.',403);return true;}
export function retentionCommand({action,p,a,s,put,id,now}){
 if(!['flow-policy','flow-review','retention-preview','retention-run'].includes(action))return null;
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Akış ve saklama işlemleri yalnız izole yerel kabulde çalışır.',503);
 if(action==='flow-policy'){
  const registry=s.get(a.tenant,'registry',p.registryId);requireThat(registry?.type==='data-flow'&&role(a,registry.unit,['admin']),'not_found','Aynı birimdeki veri akışı sicili gerekli.',404);
  requireThat(text(p.provider,3)&&Object.hasOwn(flowStages,p.stage)&&Object.hasOwn(partyRoles,p.senderRole)&&Object.hasOwn(partyRoles,p.recipientRole),'flow_fields','Sağlayıcı, ayrı akış aşaması ve taraf rolleri gerekli.');
  requireThat(Array.isArray(p.countries)&&p.countries.length>0&&p.countries.length<=30&&new Set(p.countries).size===p.countries.length&&p.countries.every(c=>countryCodes.includes(c)),'flow_country','Kaynak kod listesinde bulunan farklı ülke/alan kodları gerekli.');
  requireThat(Number.isSafeInteger(p.retentionDays)&&p.retentionDays>=1&&p.retentionDays<=36500&&['session-expired','relationship-ended','record-created','institution-review'].includes(p.startEvent),'flow_duration','Pozitif gün sayısı ve saklamayı başlatan olay gerekli; yasal süre varsayılmaz.');
  requireThat(['review-only','expired-sessions'].includes(p.target)&&text(p.basisReference)&&text(p.academicRetention)&&text(p.locationReference)&&text(p.transferReference),'flow_fields','Dayanak, akademik saklama ayrımı, ülke/alıcı kanıtı ve aktarım değerlendirmesi gerekli.');
  requireThat(p.target!=='expired-sessions'||p.provider==='MYYS-local'&&p.stage==='session'&&p.startEvent==='session-expired','flow_target','Yerel temizleme yalnız MYYS-local oturum ve süre dolumu kapsamındadır.');
  const flowKey=p.provider.trim().toLowerCase()+'\0'+p.stage,versions=all(s,a.tenant).filter(r=>r.unit===registry.unit&&r.flowKey===flowKey),previous=versions.at(-1);
  requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'flow_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  return put('flow-policy',{id:id(),unit:registry.unit,owner:a.id,registryId:registry.id,registryDigest:hash(stableStringify(registry)),flowKey,provider:p.provider.trim(),stage:p.stage,senderRole:p.senderRole,recipientRole:p.recipientRole,countries:[...p.countries].sort(),countrySource:countrySource.version,retentionDays:p.retentionDays,startEvent:p.startEvent,target:p.target,basisReference:p.basisReference,academicRetention:p.academicRetention,locationReference:p.locationReference,transferReference:p.transferReference,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,version:versions.length+1,official:false,transferAuthorized:false});
 }
 if(action==='flow-review'){
  const policy=scope(s,a,p.policyId,['admin']);requireThat(policy.createdBy!==a.id,'separation','Saklama kuralını farklı yetkili incelemeli.',403);requireThat(!reviewed(s,a.tenant,policy)&&latest(s,a.tenant,policy)?.id===policy.id,'flow_changed','Güncel ve henüz incelenmemiş sürüm gerekli.',409);requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason),'flow_review','Gerekçeli yerel inceleme gerekli.');return put('flow-review',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,outcome:p.outcome,reason:p.reason,official:false,transferAuthorized:false});
 }
 const preview=action==='retention-run'?s.get(a.tenant,'retention-preview',p.previewId):null;
 const policy=scope(s,a,preview?.policyId||p.policyId,['it']);requireThat(latest(s,a.tenant,policy)?.id===policy.id&&activeReviewer(s,a.tenant,policy,now),'flow_changed','Güncel ve bağımsız incelenmiş saklama sürümü gerekli.',409);
 const review=reviewed(s,a.tenant,policy);requireThat(![policy.createdBy,review.createdBy].includes(a.id),'separation','Yerel temizleme hazırlayan ve inceleyen kişilerden ayrı BT görevlisine aittir.',403);
 requireThat(policy.target==='expired-sessions','flow_target','Bu akış yalnız inceleme sicilidir; yerel temizleme hedefi yok.');
 if(action==='retention-preview'){
  const cutoff=new Date(Date.parse(now)-policy.retentionDays*86400000).toISOString(),plan=candidates(s,a.tenant,policy,cutoff);
  return put('retention-preview',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,policyVersion:policy.version,reviewId:review.id,cutoff,candidateDigest:plan.digest,candidateCount:plan.selected.length,eligibleCount:plan.eligibleCount,ambiguousCount:plan.ambiguousCount,physicalDestructionVerified:false,official:false});
 }
 requireThat(preview&&preview.unit===policy.unit&&preview.reviewId===review.id&&p.confirm===true,'retention_preview','İlgili önizlemeyi ve sınırlı yerel temizlemeyi onaylayın.');
 const old=s.list(a.tenant,'retention-run').find(r=>r.previewId===preview.id);if(old)return old;
 requireThat(Date.parse(now)-Date.parse(preview.createdAt)>=0&&Date.parse(now)-Date.parse(preview.createdAt)<=900000,'retention_stale','Önizlemenin 15 dakikalık yerel işlem süresi doldu; yenileyin.',409);
 const plan=candidates(s,a.tenant,policy,preview.cutoff);requireThat(plan.digest===preview.candidateDigest&&plan.selected.length===preview.candidateCount&&plan.eligibleCount===preview.eligibleCount&&plan.ambiguousCount===preview.ambiguousCount,'retention_stale','Aday kümesi değişti; yeniden önizleyin.',409);
 let removed=0;for(const session of plan.selected)removed+=Number(s.db.prepare('DELETE FROM bindings WHERE session_hash=?').run(session).changes);
 return put('retention-run',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,previewId:preview.id,removedSessionRows:removed,academicRecordsDeleted:0,identityDeleted:false,externalAccountsChanged:false,physicalDestructionVerified:false,scope:'isolated-local-acceptance',official:false});
}
export function retentionView(s,a,now){const policies=all(s,a.tenant).filter(p=>role(a,p.unit,['admin','it']));return {policies:policies.map(p=>({...p,review:reviewed(s,a.tenant,p)||null,current:latest(s,a.tenant,p)?.id===p.id,canReview:role(a,p.unit,['admin'])&&p.createdBy!==a.id&&!reviewed(s,a.tenant,p)&&latest(s,a.tenant,p)?.id===p.id,canPreview:role(a,p.unit,['it'])&&p.target==='expired-sessions'&&latest(s,a.tenant,p)?.id===p.id&&activeReviewer(s,a.tenant,p,now)&&![p.createdBy,reviewed(s,a.tenant,p)?.createdBy].includes(a.id)})),previews:s.list(a.tenant,'retention-preview').filter(p=>role(a,p.unit,['it'])).map(p=>({...p,result:s.list(a.tenant,'retention-run').find(r=>r.previewId===p.id)||null,canRun:policies.some(x=>x.id===p.policyId&&latest(s,a.tenant,x)?.id===x.id&&activeReviewer(s,a.tenant,x,now)&&![x.createdBy,reviewed(s,a.tenant,x)?.createdBy].includes(a.id))&&Date.parse(now)-Date.parse(p.createdAt)>=0&&Date.parse(now)-Date.parse(p.createdAt)<=900000}))};}
