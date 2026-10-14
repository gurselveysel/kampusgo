import {randomUUID} from 'node:crypto';
import {requireThat,hash,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {privacyLoginCommand} from './privacy-login-cleanup.mjs';
import {subjectSnapshot,subjectInventory} from './privacy-inventory.mjs';
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const member=(a,u)=>a.memberships.some(m=>m.unit===u);
const reviewer=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes('admin'));
const get=(s,a,kind,id)=>{const r=s.get(a.tenant,kind,id);requireThat(r&&member(a,r.unit)&&(r.owner===a.id||reviewer(a,r.unit)),'not_found','Veri talebi bulunamadı veya erişilemiyor.',404);return r;};
const lastResponse=(s,tenant,requestId)=>s.list(tenant,'privacy-response').filter(r=>r.requestId===requestId).at(-1);
const kinds=['access','correction','deletion','restriction','account-exit'];
const categories=['account','learning','sharing','support','all'];
export function privacyReplay(a,action,r){if(!['privacy-request','privacy-response','privacy-acknowledge','privacy-withdraw-shares','privacy-cleanup','privacy-login-preview','privacy-login-cleanup'].includes(action))return false;requireThat(member(a,r.unit)&&(action==='privacy-response'?reviewer(a,r.unit)&&r.owner!==a.id:r.owner===a.id)&&(!['privacy-cleanup','privacy-login-preview','privacy-login-cleanup'].includes(action)||a.mfa),'forbidden','Bu veri talebinde işlem yetkiniz yok.',403);if(['privacy-cleanup','privacy-login-preview','privacy-login-cleanup'].includes(action))requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Temizleme yalnız izole yerel kabulde çalışır.',503);return true;}
export function privacyCommand({action,p,a,s,put,id,now}){
 const loginCleanup=privacyLoginCommand({action,p,a,s,put,id,now});if(loginCleanup)return loginCleanup;
 if(action==='privacy-request'){
  requireThat(member(a,p.unit),'forbidden','Bu birimde veri talebi açma yetkiniz yok.',403);
  requireThat(kinds.includes(p.type)&&categories.includes(p.category)&&text(p.description),'privacy_request','Birim, talep türü, kapsam ve açıklama gerekli.');
  return put('privacy-request',{id:id(),unit:p.unit,owner:a.id,type:p.type,category:p.category,description:p.description,submission:'local-acceptance',officialReceivedAt:null,official:false});
 }
 if(action==='privacy-response'){
  const r=get(s,a,'privacy-request',p.requestId);requireThat(reviewer(a,r.unit)&&r.owner!==a.id,'forbidden','Veri talebini ayrı ve yetkili bir kişi incelemeli.',403);
  const previous=lastResponse(s,a.tenant,r.id);requireThat((previous?.id||null)===(p.previousResponseId||null),'privacy_changed','Talebin yanıtı değişti; kaydı yenileyin.',409);
  requireThat(['information','source-correction-required','retained-with-basis','local-session-cleanup','local-login-cleanup','institution-action-required','rejected'].includes(p.outcome)&&text(p.response)&&text(p.basisReference,12)&&text(p.academicRetentionReference,12),'privacy_response','Yazılı yanıt, dayanak ve akademik saklama ayrımı gerekli.');
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(p.reviewOn)&&Number.isFinite(Date.parse(p.reviewOn))&&new Date(p.reviewOn).toISOString().slice(0,10)===p.reviewOn&&p.reviewOn>=now.slice(0,10),'privacy_response','Geçerli sonraki inceleme tarihi gerekli.');
  requireThat(!['local-session-cleanup','local-login-cleanup'].includes(p.outcome)||['account','all'].includes(r.category),'privacy_scope','Giriş ve oturum temizliği yalnız hesap kapsamı için hazırlanabilir.');
  return put('privacy-response',{id:id(),unit:r.unit,owner:r.owner,requestId:r.id,previousResponseId:previous?.id||null,outcome:p.outcome,response:p.response,basisReference:p.basisReference,academicRetentionReference:p.academicRetentionReference,reviewOn:p.reviewOn,notification:'available-in-local-portal',official:false});
 }
 if(action==='privacy-acknowledge'){
  const r=get(s,a,'privacy-response',p.responseId);requireThat(r.owner===a.id,'forbidden','Yalnız kendi yanıtınızın görüntülendiğini kaydedebilirsiniz.',403);
  const old=s.list(a.tenant,'privacy-read').find(x=>x.responseId===r.id);if(old)return old;
  return put('privacy-read',{id:id(),unit:r.unit,owner:a.id,responseId:r.id,requestId:r.requestId,notification:'local-read-acknowledgement',official:false});
 }
 if(action==='privacy-withdraw-shares'){
  requireThat(member(a,p.unit),'forbidden','Bu birimde paylaşım yönetme yetkiniz yok.',403);
  requireThat(p.confirm===true,'privacy_scope','Paylaşımı geri çekme kapsamını açıkça onaylayın.');
  const shares=s.list(a.tenant,'share').filter(r=>r.owner===a.id&&r.unit===p.unit&&!s.list(a.tenant,'share-revocation').some(x=>x.shareId===r.id));
  for(const share of shares)put('share-revocation',{id:id(),unit:p.unit,owner:a.id,shareId:share.id});
  const portfolios=s.list(a.tenant,'portfolio-grant').filter(r=>r.owner===a.id&&r.unit===p.unit&&!s.list(a.tenant,'portfolio-revocation').some(x=>x.grantId===r.id));
  for(const grant of portfolios)put('portfolio-revocation',{id:id(),unit:p.unit,owner:a.id,grantId:grant.id,reason:'privacy-withdrawal',academicRecordsChanged:false,externalCopiesDeleted:false,official:false});
  return put('privacy-withdrawal',{id:id(),unit:p.unit,owner:a.id,revokedCount:shares.length+portfolios.length,revokedLinkCount:shares.length,revokedPortfolioCount:portfolios.length,academicRecordsDeleted:0,externalAccountsChanged:false});
 }
 if(action==='privacy-cleanup'){
  const request=get(s,a,'privacy-request',p.requestId),response=lastResponse(s,a.tenant,request.id);
  requireThat(request.owner===a.id&&a.mfa,'forbidden','Kendi hesap verisi temizliğiniz için çok faktörlü doğrulama gerekli.',403);
  requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Temizleme yalnız izole yerel kabulde çalışır.',503);
  requireThat(response?.id===p.responseId&&response.outcome==='local-session-cleanup','privacy_response','Güncel, kapsamı belirli temizlik yanıtı gerekli.',409);
  const old=s.list(a.tenant,'privacy-cleanup').find(r=>r.responseId===response.id);if(old)return old;
  // Remove only expired sessions explicitly scoped to this tenant. Academic records,
  // identity subjects, other institutions, live and legacy unscoped sessions remain.
  const result=s.db.prepare('DELETE FROM bindings WHERE session_hash IN (SELECT b.session_hash FROM bindings b JOIN identity_scopes i ON i.session_hash=b.session_hash WHERE b.person=? AND i.tenant=? AND b.expires<=?)').run(a.id,a.tenant,now);
  return put('privacy-cleanup',{id:id(),unit:request.unit,owner:a.id,requestId:request.id,responseId:response.id,scope:'expired-tenant-sessions',deletedSessionRows:Number(result.changes),academicRecordsDeleted:0,identityDeleted:false,externalAccountsChanged:false,physicalDestructionVerified:false,requestFullyFulfilled:false});
 }
 return null;
}
export function privacyView(s,a,now=new Date().toISOString()){
 const requests=s.list(a.tenant,'privacy-request').filter(r=>member(a,r.unit)&&(r.owner===a.id||reviewer(a,r.unit))).map(r=>({...r,responses:s.list(a.tenant,'privacy-response').filter(x=>x.requestId===r.id).map(x=>({...x,read:s.list(a.tenant,'privacy-read').find(v=>v.responseId===x.id)||null,cleanup:s.list(a.tenant,'privacy-cleanup').find(v=>v.responseId===x.id)||null,loginPreviews:s.list(a.tenant,'privacy-login-preview').filter(v=>v.responseId===x.id).map(v=>({...v,result:s.list(a.tenant,'privacy-login-cleanup').find(z=>z.previewId===v.id)||null,withinWindow:Date.parse(now)-Date.parse(v.createdAt)>=0&&Date.parse(now)-Date.parse(v.createdAt)<=900000}))})),canRespond:reviewer(a,r.unit)&&r.owner!==a.id}));
 return {inventory:subjectInventory(s,a,now),requests,units:a.memberships.map(m=>m.unit),withdrawals:s.list(a.tenant,'privacy-withdrawal').filter(r=>r.owner===a.id&&member(a,r.unit))};
}
export function subjectExport(core,context){return core.store.transaction(()=>{
 const s=core.store,now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now);requireThat(a.mfa,'mfa_required','Kişisel kayıt dışa aktarımı için çok faktörlü doğrulama gerekli.',403);
 const snapshot=subjectSnapshot(s,a,now);
 const payload={format:'myys-subject-export/2',tenant:a.tenant,personId:a.id,at:now,...snapshot,scope:'local-acceptance',official:false,limits:['Yalnız bu kurumda etkin birim üyeliğiniz kapsamında, yerel MYYS kayıtlarının izinli alan özetleri.','Gizli oturum/paylaşım değerleri, imzalı belirteçler ve başka kişinin kayıtları dışa aktarılmaz.','Görevli katkıları yalnız sayıdır; alıcı işlemleri öğrencinin kanıtını yeniden açmaz.','Bilinmeyen kayıt türleri içerik olarak verilmez; ayrı inceleme gerekir.','Bu indirme hesabı veya akademik kaydı silmez; resmî başvuru yanıtı değildir.']};
 const exportId=randomUUID(),digest=hash(stableStringify(payload)),ownRecordCount=Object.values(snapshot.records).reduce((n,rs)=>n+rs.length,0),recipientRecordCount=Object.values(snapshot.recipientRecords).reduce((n,rs)=>n+rs.length,0);s.put(a.tenant,'privacy-export',{id:exportId,unit:a.memberships[0].unit,owner:a.id,createdAt:now,sha256:digest,recordCount:ownRecordCount+recipientRecordCount,ownRecordCount,recipientRecordCount});s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'privacy-export',exportId,now);return {payload,sha256:digest};
 });}
