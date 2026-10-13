import {randomUUID} from 'node:crypto';
import {requireThat,hash,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const member=(a,u)=>a.memberships.some(m=>m.unit===u);
const reviewer=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes('admin'));
const get=(s,a,kind,id)=>{const r=s.get(a.tenant,kind,id);requireThat(r&&member(a,r.unit)&&(r.owner===a.id||reviewer(a,r.unit)),'not_found','Veri talebi bulunamadı veya erişilemiyor.',404);return r;};
const lastResponse=(s,tenant,requestId)=>s.list(tenant,'privacy-response').filter(r=>r.requestId===requestId).at(-1);
const kinds=['access','correction','deletion','restriction','account-exit'];
const categories=['account','learning','sharing','support','all'];
export function privacyReplay(a,action,r){if(!['privacy-request','privacy-response','privacy-acknowledge','privacy-withdraw-shares','privacy-cleanup'].includes(action))return false;requireThat(member(a,r.unit)&&(action==='privacy-response'?reviewer(a,r.unit)&&r.owner!==a.id:r.owner===a.id)&&(action!=='privacy-cleanup'||a.mfa),'forbidden','Bu veri talebinde işlem yetkiniz yok.',403);if(action==='privacy-cleanup')requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Temizleme yalnız izole yerel kabulde çalışır.',503);return true;}
export function privacyCommand({action,p,a,s,put,id,now}){
 if(action==='privacy-request'){
  requireThat(member(a,p.unit),'forbidden','Bu birimde veri talebi açma yetkiniz yok.',403);
  requireThat(kinds.includes(p.type)&&categories.includes(p.category)&&text(p.description),'privacy_request','Birim, talep türü, kapsam ve açıklama gerekli.');
  return put('privacy-request',{id:id(),unit:p.unit,owner:a.id,type:p.type,category:p.category,description:p.description,submission:'local-acceptance',officialReceivedAt:null,official:false});
 }
 if(action==='privacy-response'){
  const r=get(s,a,'privacy-request',p.requestId);requireThat(reviewer(a,r.unit)&&r.owner!==a.id,'forbidden','Veri talebini ayrı ve yetkili bir kişi incelemeli.',403);
  const previous=lastResponse(s,a.tenant,r.id);requireThat((previous?.id||null)===(p.previousResponseId||null),'privacy_changed','Talebin yanıtı değişti; kaydı yenileyin.',409);
  requireThat(['information','source-correction-required','retained-with-basis','local-session-cleanup','institution-action-required','rejected'].includes(p.outcome)&&text(p.response)&&text(p.basisReference,12)&&text(p.academicRetentionReference,12),'privacy_response','Yazılı yanıt, dayanak ve akademik saklama ayrımı gerekli.');
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(p.reviewOn)&&Number.isFinite(Date.parse(p.reviewOn))&&new Date(p.reviewOn).toISOString().slice(0,10)===p.reviewOn&&p.reviewOn>=now.slice(0,10),'privacy_response','Geçerli sonraki inceleme tarihi gerekli.');
  requireThat(p.outcome!=='local-session-cleanup'||['account','all'].includes(r.category),'privacy_scope','Oturum temizliği yalnız hesap kapsamı için hazırlanabilir.');
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
  return put('privacy-withdrawal',{id:id(),unit:p.unit,owner:a.id,revokedCount:shares.length,academicRecordsDeleted:0,externalAccountsChanged:false});
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
export function privacyView(s,a){
 const requests=s.list(a.tenant,'privacy-request').filter(r=>member(a,r.unit)&&(r.owner===a.id||reviewer(a,r.unit))).map(r=>({...r,responses:s.list(a.tenant,'privacy-response').filter(x=>x.requestId===r.id).map(x=>({...x,read:s.list(a.tenant,'privacy-read').find(v=>v.responseId===x.id)||null,cleanup:s.list(a.tenant,'privacy-cleanup').find(v=>v.responseId===x.id)||null})),canRespond:reviewer(a,r.unit)&&r.owner!==a.id}));
 return {requests,units:a.memberships.map(m=>m.unit),withdrawals:s.list(a.tenant,'privacy-withdrawal').filter(r=>r.owner===a.id&&member(a,r.unit))};
}
const exportFields={
 application:['id','unit','programId','reason','createdAt'],
 'application-review':['id','unit','programId','applicationId','outcome','reason','enrollmentId','createdAt'],
 'credential-receipt':['id','unit','programId','issuanceId','kind','externalAcceptance','createdAt'],
 enrollment:['id','unit','programId','createdAt'],
 evidence:['id','unit','programId','enrollmentId','taskId','content','sha256','source','createdAt'],
 assessment:['id','unit','programId','enrollmentId','evidenceIds','scores','score','passed','reason','createdAt'],
 decision:['id','unit','programId','enrollmentId','assessmentId','outcome','reason','score','programVersion','createdAt'],
 appeal:['id','unit','decisionId','reason','createdAt'],resolution:['id','unit','appealId','decisionId','outcome','reason','createdAt'],
 issuance:['id','unit','programId','decisionId','state','issuer','createdAt'],
 share:['id','unit','issuanceId','purpose','expires','createdAt'],'share-revocation':['id','unit','shareId','createdAt'],
 support:['id','unit','subject','message','category','state','createdAt'],
 'recognition-request':['id','unit','enrollmentId','policyId','sourceTitle','sourceIssuer','sourceCredentialId','sourceOutcomeKey','sourceDigest','targetProgramCode','targetCourseCode','requestedCredits','remoteCredits','mappingReason','createdAt'],
 'recognition-decision':['id','unit','requestId','policyId','outcome','credits','remoteCredits','reason','authorityReference','createdAt'],
 'recognition-credit':['id','unit','decisionId','requestId','targetProgramCode','targetCourseCode','credits','createdAt'],
 'recognition-reversal':['id','unit','creditId','decisionId','reason','createdAt'],
 'privacy-request':['id','unit','type','category','description','submission','createdAt'],
 'privacy-response':['id','unit','requestId','outcome','response','basisReference','academicRetentionReference','reviewOn','createdAt'],
 'privacy-cleanup':['id','unit','scope','deletedSessionRows','academicRecordsDeleted','requestFullyFulfilled','createdAt']
};
export function subjectExport(core,context){return core.store.transaction(()=>{
 const s=core.store,now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now);requireThat(a.mfa,'mfa_required','Kişisel kayıt dışa aktarımı için çok faktörlü doğrulama gerekli.',403);
 const records=Object.fromEntries(Object.entries(exportFields).map(([kind,fields])=>[kind,s.list(a.tenant,kind).filter(r=>r.owner===a.id&&member(a,r.unit)).map(r=>Object.fromEntries(fields.filter(k=>r[k]!==undefined).map(k=>[k,r[k]])))]));
 const programIds=new Set(records.enrollment.map(r=>r.programId));const programs=s.list(a.tenant,'program').filter(p=>programIds.has(p.id)).map(p=>({id:p.id,code:p.code,title:p.title,version:p.version}));
 const payload={format:'myys-subject-export/1',tenant:a.tenant,personId:a.id,at:now,records,programs,scope:'local-acceptance',official:false,limits:['Yalnız MYYS yerel kabul kayıtları; kurum veya dış platformların tüm verileri değildir.','Gizli oturum ve paylaşım anahtarları dışa aktarılmaz.','Bu indirme hesabı veya akademik kaydı silmez.']};
 const exportId=randomUUID(),digest=hash(stableStringify(payload));s.put(a.tenant,'privacy-export',{id:exportId,unit:a.memberships[0].unit,owner:a.id,createdAt:now,sha256:digest,recordCount:Object.values(records).reduce((n,rs)=>n+rs.length,0)});s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'privacy-export',exportId,now);return {payload,sha256:digest};
 });}
