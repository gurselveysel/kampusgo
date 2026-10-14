import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const actions=['privacy-login-preview','privacy-login-cleanup'];
const member=(a,u)=>a.memberships.some(m=>m.unit===u);
const own=(s,a,kind,id)=>{const r=typeof id==='string'&&s.get(a.tenant,kind,id);requireThat(r&&r.owner===a.id&&member(a,r.unit),'not_found','Kendi veri talebinizin güncel kaydı gerekli.',404);return r;};
function response(s,a,requestId,responseId){
 const request=own(s,a,'privacy-request',requestId),latest=s.list(a.tenant,'privacy-response').filter(r=>r.requestId===request.id).at(-1);
 requireThat(latest&&latest.id===responseId&&latest.owner===a.id&&latest.unit===request.unit&&latest.outcome==='local-login-cleanup'&&['account','all'].includes(request.category),'privacy_response','Tamamlanmış giriş istekleri için güncel ve kapsamı belirli yanıt gerekli.',409);
 return {request,response:latest};
}
function candidates(s,a,cutoff){
 const exists=s.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='identity_challenges'").get();
 const rows=exists?s.db.prepare(`SELECT c.id,c.state_hash,c.browser_hash,c.contract_digest,c.created,c.expires,c.finished FROM identity_challenges c
 WHERE c.tenant=? AND c.status='used' AND c.created>=0 AND c.created<c.expires AND c.created<=c.finished AND c.finished<c.expires AND c.finished<=? AND c.expires<=?
 AND EXISTS(SELECT 1 FROM audit a WHERE a.tenant=c.tenant AND a.record_id=c.id AND a.action='identity.accept' AND a.actor=?)
 AND NOT EXISTS(SELECT 1 FROM audit a WHERE a.tenant=c.tenant AND a.record_id=c.id AND a.action='identity.accept' AND a.actor<>?)
 ORDER BY c.id`).all(a.tenant,Date.parse(cutoff),Date.parse(cutoff),a.id,a.id):[];
 const selected=rows.slice(0,100);return {selected,eligibleCount:rows.length,digest:hash(stableStringify({tenant:a.tenant,person:a.id,cutoff,eligibleCount:rows.length,rows:selected}))};
}
export function privacyLoginCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;
 requireThat(a.mfa,'mfa_required','Giriş isteği temizliği için çok faktörlü doğrulama gerekli.',403);
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Giriş isteği temizliği yalnız izole yerel kabulde çalışır.',503);
 const fields=action==='privacy-login-preview'?['requestId','responseId']:['previewId','confirm'];requireThat(Object.keys(p).every(k=>fields.includes(k)),'privacy_cleanup_fields','Yalnız belirtilen temizlik kapsamı kullanılabilir.');
 requireThat(Number.isFinite(Date.parse(now)),'privacy_clock','Geçerli işlem zamanı gerekli.',500);
 if(action==='privacy-login-preview'){
  const {request,response:reply}=response(s,a,p.requestId,p.responseId),plan=candidates(s,a,now);
  return put(action,{id:id(),unit:request.unit,owner:a.id,requestId:request.id,responseId:reply.id,scope:'expired-completed-identity-requests/1',cutoff:now,candidateCount:plan.selected.length,eligibleCount:plan.eligibleCount,candidateDigest:plan.digest,maxRows:100,official:false,physicalDestructionVerified:false});
 }
 const preview=own(s,a,'privacy-login-preview',p.previewId);response(s,a,preview.requestId,preview.responseId);
 requireThat(preview.scope==='expired-completed-identity-requests/1'&&preview.maxRows===100,'privacy_cleanup_scope','Tanımlı giriş isteği temizleme sürümü gerekli.',409);
 requireThat(p.confirm===true,'privacy_cleanup_confirm','Tamamlanmış ve süresi dolmuş kendi giriş isteklerinizin temizliğini teyit edin.');
 const existing=s.list(a.tenant,'privacy-login-cleanup').find(r=>r.previewId===preview.id);if(existing)return existing;
 const age=Date.parse(now)-Date.parse(preview.createdAt);requireThat(Number.isFinite(age)&&age>=0&&age<=900000,'privacy_cleanup_stale','Önizlemenin işlem süresi doldu; adayları yeniden görün.',409);
 const plan=candidates(s,a,preview.cutoff);requireThat(plan.digest===preview.candidateDigest&&plan.selected.length===preview.candidateCount&&plan.eligibleCount===preview.eligibleCount,'privacy_cleanup_stale','Aday kayıtlar değişti; yeni önizleme gerekli.',409);
 requireThat(plan.selected.length>0,'privacy_cleanup_empty','Bu önizlemede temizlenebilecek giriş isteği yok.',409);
 let removedRequestRows=0;
 for(const row of plan.selected){const n=Number(s.db.prepare("DELETE FROM identity_challenges WHERE tenant=? AND id=? AND status='used'").run(a.tenant,row.id).changes);requireThat(n===1,'privacy_cleanup_stale','Giriş isteği değişti; yeni önizleme gerekli.',409);removedRequestRows+=n;}
 return put(action,{id:id(),unit:preview.unit,owner:a.id,requestId:preview.requestId,responseId:preview.responseId,previewId:preview.id,scope:preview.scope,removedRequestRows,remainingEligibleRows:plan.eligibleCount-removedRequestRows,academicRecordsDeleted:0,identityDeleted:false,sessionRowsDeleted:0,securityBarriersChanged:false,externalAccountsChanged:false,physicalDestructionVerified:false,requestFullyFulfilled:false,official:false});
}
