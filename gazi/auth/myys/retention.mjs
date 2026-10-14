import {requireThat,hash,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {countryCodes,countrySource,flowStages,partyRoles} from './retention-model.mjs';
import {unassignedLoginTarget,unassignedAuthority,requireUnassignedAuthority,unassignedPolicyAuthorCurrent,unassignedPolicyCurrent,unassignedLoginCandidates,removeUnassignedLoginCandidates} from './unassigned-login-retention.mjs';
const role=(a,u,rs)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>rs.includes(r)));
const text=(v,min=20)=>typeof v==='string'&&v.trim().length>=min&&v.length<=2000;
const all=(s,t)=>s.list(t,'flow-policy');
const latest=(s,t,p)=>all(s,t).filter(r=>(p.target===unassignedLoginTarget||r.unit===p.unit)&&r.flowKey===p.flowKey).at(-1);
const reviewed=(s,t,p)=>s.list(t,'flow-review').find(r=>r.policyId===p.id);
const activeReviewer=(s,t,p,now)=>{const r=reviewed(s,t,p);if(r?.outcome!=='accepted')return false;const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(t,r.createdBy,p.unit,now);return m&&JSON.parse(m.roles).includes('admin');};
const scope=(s,a,policyId,roles)=>{const p=typeof policyId==='string'&&s.get(a.tenant,'flow-policy',policyId);requireThat(p&&role(a,p.unit,roles),'not_found','Akış kuralı bulunamadı veya erişilemiyor.',404);return p;};
const institutionScope=p=>p.target===unassignedLoginTarget;
const canReadUnassigned=(s,a,p,now)=>!institutionScope(p)||['prepare','review','execute'].some(c=>unassignedAuthority(s,a,p.unit,c,now));
const canUse=(s,a,p,now)=>latest(s,a.tenant,p)?.id===p.id&&activeReviewer(s,a.tenant,p,now)&&(!institutionScope(p)||unassignedPolicyCurrent(s,a.tenant,p,reviewed(s,a.tenant,p),now));
function candidates(s,t,p,cutoff){
 // A session has tenant scope but no unit scope. Multi-unit identities cannot
 // safely inherit the shortest unit retention rule, so they are never removed.
 const rows=s.db.prepare('SELECT b.session_hash,b.person FROM bindings b JOIN identity_scopes i ON i.session_hash=b.session_hash WHERE i.tenant=? AND b.expires<=? AND EXISTS (SELECT 1 FROM memberships m WHERE m.tenant=i.tenant AND m.person=b.person AND m.unit=?) ORDER BY b.session_hash').all(t,cutoff,p.unit);
 const eligible=rows.filter(r=>s.db.prepare('SELECT COUNT(*) AS n FROM memberships WHERE tenant=? AND person=?').get(t,r.person).n===1);
 const selected=eligible.slice(0,100).map(r=>r.session_hash);return {selected,digest:hash(stableStringify(selected)),eligibleCount:eligible.length,ambiguousCount:rows.length-eligible.length};
}
export function retentionReplay(a,action,r,s,now){if(!['flow-policy','flow-review','retention-preview','retention-run'].includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Saklama işlemi yalnız izole yerel kabulde çalışır.',503);requireThat(role(a,r.unit,action.startsWith('retention-')?['it']:['admin']),'forbidden','Güncel saklama görevi ve çok faktörlü doğrulama gerekli.',403);const p=action==='flow-policy'?r:s.get(a.tenant,'flow-policy',r.policyId);if(institutionScope(p||{}))requireUnassignedAuthority(s,a,r.unit,action==='flow-policy'?'prepare':action==='flow-review'?'review':'execute',now);return true;}
export function retentionCommand({action,p,a,s,put,id,now}){
 if(!['flow-policy','flow-review','retention-preview','retention-run'].includes(action))return null;
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Akış ve saklama işlemleri yalnız izole yerel kabulde çalışır.',503);
 if(action==='flow-policy'){
  const registry=s.get(a.tenant,'registry',p.registryId);requireThat(registry?.type==='data-flow'&&role(a,registry.unit,['admin']),'not_found','Aynı birimdeki veri akışı sicili gerekli.',404);
  requireThat(text(p.provider,3)&&Object.hasOwn(flowStages,p.stage)&&Object.hasOwn(partyRoles,p.senderRole)&&Object.hasOwn(partyRoles,p.recipientRole),'flow_fields','Sağlayıcı, ayrı akış aşaması ve taraf rolleri gerekli.');
  requireThat(Array.isArray(p.countries)&&p.countries.length>0&&p.countries.length<=30&&new Set(p.countries).size===p.countries.length&&p.countries.every(c=>countryCodes.includes(c)),'flow_country','Kaynak kod listesinde bulunan farklı ülke/alan kodları gerekli.');
  requireThat(Number.isSafeInteger(p.retentionDays)&&p.retentionDays>=1&&p.retentionDays<=36500&&['session-expired','relationship-ended','record-created','institution-review','request-terminal-expired'].includes(p.startEvent),'flow_duration','Pozitif gün sayısı ve saklamayı başlatan olay gerekli; yasal süre varsayılmaz.');
  requireThat(['review-only','expired-sessions',unassignedLoginTarget].includes(p.target)&&text(p.basisReference)&&text(p.academicRetention)&&text(p.locationReference)&&text(p.transferReference),'flow_fields','Dayanak, akademik saklama ayrımı, ülke/alıcı kanıtı ve aktarım değerlendirmesi gerekli.');
  requireThat(p.target!=='expired-sessions'||p.provider==='MYYS-local'&&p.stage==='session'&&p.startEvent==='session-expired','flow_target','Yerel temizleme yalnız MYYS-local oturum ve süre dolumu kapsamındadır.');
  const unassigned=institutionScope(p),authorityDigest=unassigned?requireUnassignedAuthority(s,a,registry.unit,'prepare',now):null;
  requireThat(!unassigned||p.provider==='MYYS-local'&&p.stage==='login-security'&&p.startEvent==='request-terminal-expired','flow_target','Kurum kapsamlı hedef yalnız sona ermiş yerel giriş isteklerine aittir.');
  // Reserve this flow key for one institution-wide policy chain; another unit cannot choose a shorter competing rule.
  requireThat(p.stage!=='login-security'||unassigned,'flow_target','Giriş güvenliği aşaması açık kurum kapsamlı görevlendirme gerektirir.');
  const flowKey=p.provider.trim().toLowerCase()+'\0'+p.stage,versions=all(s,a.tenant).filter(r=>(unassigned||r.unit===registry.unit)&&r.flowKey===flowKey),previous=versions.at(-1);
  requireThat(!unassigned||!previous||previous.unit===registry.unit,'retention_authority','Kurum kapsamlı akışın yönetim birimi bu işlemle değiştirilemez.',403);
  requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'flow_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  return put('flow-policy',{id:id(),unit:registry.unit,owner:a.id,registryId:registry.id,registryDigest:hash(stableStringify(registry)),flowKey,provider:p.provider.trim(),stage:p.stage,senderRole:p.senderRole,recipientRole:p.recipientRole,countries:[...p.countries].sort(),countrySource:countrySource.version,retentionDays:p.retentionDays,startEvent:p.startEvent,target:p.target,...(unassigned?{authorityDigest,dataScope:'tenant-unassigned-identity-requests/1'}:{}),basisReference:p.basisReference,academicRetention:p.academicRetention,locationReference:p.locationReference,transferReference:p.transferReference,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,version:versions.length+1,official:false,transferAuthorized:false});
 }
 if(action==='flow-review'){
  const policy=scope(s,a,p.policyId,['admin']);requireThat(policy.createdBy!==a.id,'separation','Saklama kuralını farklı yetkili incelemeli.',403);requireThat(!reviewed(s,a.tenant,policy)&&latest(s,a.tenant,policy)?.id===policy.id,'flow_changed','Güncel ve henüz incelenmemiş sürüm gerekli.',409);requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason),'flow_review','Gerekçeli yerel inceleme gerekli.');const authorityDigest=institutionScope(policy)?requireUnassignedAuthority(s,a,policy.unit,'review',now):null;requireThat(!institutionScope(policy)||unassignedPolicyAuthorCurrent(s,a.tenant,policy,now),'flow_changed','Hazırlayanın görevlendirmesi değişti; güncel dayanakla yeni saklama sürümü gerekli.',409);return put('flow-review',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,outcome:p.outcome,reason:p.reason,...(authorityDigest?{authorityDigest}:{}),official:false,transferAuthorized:false});
 }
 const preview=action==='retention-run'&&typeof p.previewId==='string'?s.get(a.tenant,'retention-preview',p.previewId):null;
 requireThat(action!=='retention-run'||preview,'not_found','Önizleme bulunamadı veya erişilemiyor.',404);
 const policy=scope(s,a,preview?.policyId||p.policyId,['it']),unassigned=institutionScope(policy),authorityDigest=unassigned?requireUnassignedAuthority(s,a,policy.unit,'execute',now):null;requireThat(canUse(s,a,policy,now),'flow_changed','Güncel ve bağımsız incelenmiş saklama sürümü gerekli.',409);
 const review=reviewed(s,a.tenant,policy);requireThat(![policy.createdBy,review.createdBy].includes(a.id),'separation','Yerel temizleme hazırlayan ve inceleyen kişilerden ayrı BT görevlisine aittir.',403);
 requireThat(policy.target==='expired-sessions'||unassigned,'flow_target','Bu akış yalnız inceleme sicilidir; yerel temizleme hedefi yok.');
 const planAt=cutoff=>unassigned?unassignedLoginCandidates(s,a.tenant,cutoff):candidates(s,a.tenant,policy,cutoff);
 if(action==='retention-preview'){
  const cutoff=new Date(Date.parse(now)-policy.retentionDays*86400000).toISOString(),plan=planAt(cutoff);
  return put('retention-preview',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,policyVersion:policy.version,reviewId:review.id,cutoff,candidateDigest:plan.digest,candidateCount:plan.selected.length,eligibleCount:plan.eligibleCount,...(unassigned?{target:unassignedLoginTarget,authorityDigest,protectedCount:plan.protectedCount,dataScope:policy.dataScope}:{ambiguousCount:plan.ambiguousCount}),physicalDestructionVerified:false,official:false});
 }
 requireThat(preview&&preview.unit===policy.unit&&preview.reviewId===review.id&&p.confirm===true,'retention_preview','İlgili önizlemeyi ve sınırlı yerel temizlemeyi onaylayın.');
 if(unassigned)requireThat(preview.target===unassignedLoginTarget&&preview.owner===a.id&&preview.authorityDigest===authorityDigest,'retention_authority','Önizlemeyi hazırlayan güncel kurum görevlisi ve aynı görevlendirme gerekli.',403);
 const old=s.list(a.tenant,'retention-run').find(r=>r.previewId===preview.id);if(old)return old;
 requireThat(Date.parse(now)-Date.parse(preview.createdAt)>=0&&Date.parse(now)-Date.parse(preview.createdAt)<=900000,'retention_stale','Önizlemenin 15 dakikalık yerel işlem süresi doldu; yenileyin.',409);
 const plan=planAt(preview.cutoff);requireThat(plan.digest===preview.candidateDigest&&plan.selected.length===preview.candidateCount&&plan.eligibleCount===preview.eligibleCount&&(unassigned?plan.protectedCount===preview.protectedCount:plan.ambiguousCount===preview.ambiguousCount),'retention_stale','Aday kümesi değişti; yeniden önizleyin.',409);
 if(unassigned){requireThat(plan.selected.length>0,'retention_empty','Bu önizlemede temizlenecek giriş isteği yok.',409);const removedRequestRows=removeUnassignedLoginCandidates(s,a.tenant,plan.selected);return put('retention-run',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,previewId:preview.id,target:unassignedLoginTarget,dataScope:policy.dataScope,removedRequestRows,remainingEligibleRows:plan.eligibleCount-removedRequestRows,academicRecordsDeleted:0,sessionRowsDeleted:0,securityBarriersChanged:false,identityDeleted:false,externalAccountsChanged:false,physicalDestructionVerified:false,requestFullyFulfilled:false,scope:'isolated-local-acceptance',official:false});}
 let removed=0;for(const session of plan.selected)removed+=Number(s.db.prepare('DELETE FROM bindings WHERE session_hash=?').run(session).changes);
 return put('retention-run',{id:id(),unit:policy.unit,owner:a.id,policyId:policy.id,previewId:preview.id,removedSessionRows:removed,academicRecordsDeleted:0,identityDeleted:false,externalAccountsChanged:false,physicalDestructionVerified:false,scope:'isolated-local-acceptance',official:false});
}
export function retentionView(s,a,now){
 const policies=all(s,a.tenant).filter(p=>role(a,p.unit,['admin','it'])&&canReadUnassigned(s,a,p,now));
 const execute=p=>role(a,p.unit,['it'])&&(p.target==='expired-sessions'||institutionScope(p)&&unassignedAuthority(s,a,p.unit,'execute',now))&&canUse(s,a,p,now)&&![p.createdBy,reviewed(s,a.tenant,p)?.createdBy].includes(a.id);
 return {unassignedPreparationUnits:a.memberships.filter(m=>unassignedAuthority(s,a,m.unit,'prepare',now)).map(m=>m.unit),policies:policies.map(p=>({...p,review:reviewed(s,a.tenant,p)||null,current:latest(s,a.tenant,p)?.id===p.id,authorityCurrent:!institutionScope(p)||unassignedPolicyCurrent(s,a.tenant,p,reviewed(s,a.tenant,p),now),canPrepare:!institutionScope(p)||!!unassignedAuthority(s,a,p.unit,'prepare',now),canReview:role(a,p.unit,['admin'])&&p.createdBy!==a.id&&!reviewed(s,a.tenant,p)&&latest(s,a.tenant,p)?.id===p.id&&(!institutionScope(p)||unassignedPolicyAuthorCurrent(s,a.tenant,p,now)&&!!unassignedAuthority(s,a,p.unit,'review',now)),canPreview:!!execute(p)})),previews:s.list(a.tenant,'retention-preview').filter(p=>role(a,p.unit,['it'])&&policies.some(x=>x.id===p.policyId)&&(!institutionScope(p)||!!unassignedAuthority(s,a,p.unit,'execute',now))).map(p=>({...p,result:s.list(a.tenant,'retention-run').find(r=>r.previewId===p.id)||null,canRun:policies.some(x=>x.id===p.policyId&&execute(x))&&(!institutionScope(p)||p.owner===a.id&&p.authorityDigest===unassignedAuthority(s,a,p.unit,'execute',now))&&Date.parse(now)-Date.parse(p.createdAt)>=0&&Date.parse(now)-Date.parse(p.createdAt)<=900000}))};
}
