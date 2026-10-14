import {guardUnitCapacity} from './capacity.mjs';
import {sourceEventTrusted} from './source-trust.mjs';
import {requireThat,CoreError} from './store.mjs';
import {queueState} from './lms.mjs';
import {parseTransferCsv} from './transfer-csv.mjs';

const allowed=(a,roles,unit)=>a.mfa&&a.memberships.some(m=>m.unit===unit&&m.roles.some(r=>roles.includes(r)));
const batchAllowed=(a,unit)=>allowed(a,['studentAffairs'],unit);
const queueAllowed=(a,unit)=>allowed(a,['it','quality'],unit);
export function operationsReplay(a,action,r){
 if(!['batch-create','batch-process','lms-quarantine-review'].includes(action))return false;
 requireThat(action==='lms-quarantine-review'?allowed(a,['it'],r.unit):batchAllowed(a,r.unit),'forbidden','Bu birimde işlem yetkiniz yok.',403);return true;
}
export function operationsCommand({action,p,a,s,put,id,now,execute}){
 if(action==='batch-create'){
  requireThat(batchAllowed(a,p.unit),'forbidden','Bu birimde toplu belge hazırlama yetkiniz yok.',403);
  requireThat(typeof p.title==='string'&&p.title.trim().length>=3&&p.title.length<=200,'batch','Toplu işlem adı 3–200 karakter olmalı.');
  let rows=p.rows;if(p.csv!==undefined){try{rows=parseTransferCsv(p.csv);}catch(e){throw new CoreError('batch_csv',e.message);}}
  requireThat(Array.isArray(rows)&&rows.length>0&&rows.length<=100,'batch','Toplu işlem 1–100 satır olmalı.');
  const capacityBinding=guardUnitCapacity(s,a.tenant,p.unit,'batchRows',rows.length,{now});
  const seen=new Set();
  const normalized=rows.map((row,index)=>{
   const decisionId=typeof row?.decisionId==='string'&&row.decisionId.length<=100?row.decisionId.trim():'';
   const label=typeof row?.label==='string'?row.label.slice(0,200):'';
   const d=decisionId&&s.get(a.tenant,'decision',decisionId);
   // Never disclose another unit's learner, decision or presence.
   const scoped=d&&d.unit===p.unit;let code=!decisionId||row?.inputError?'invalid_row':!scoped?'not_found':null;
   const key=scoped?d.owner+'\0'+d.programId:null;
   if(!code&&seen.has(key))code='duplicate_learner';if(key)seen.add(key);
   return {row:index+1,label,decisionId:scoped?decisionId:null,owner:scoped?d.owner:null,code};
  });
  return put('batch',{id:id(),unit:p.unit,owner:a.id,title:p.title,rows:normalized,...(capacityBinding?{capacityBinding}:{}),scope:'local-acceptance',official:false});
 }
 if(action==='batch-process'){
  const batch=s.get(a.tenant,'batch',p.batchId);
  requireThat(batch&&batchAllowed(a,batch.unit),'not_found','Toplu işlem bulunamadı veya erişilemiyor.',404);
  const row=batch.rows.find(r=>r.row===p.row);requireThat(row,'batch_row','Satır bulunamadı.',404);
  const existing=s.get(a.tenant,'batch-result',batch.id+':'+row.row);if(existing)return existing;
  let issuance,code=row.code;
  if(!code){try{issuance=execute('issue',{decisionId:row.decisionId});}catch(e){if(!(e instanceof CoreError))throw e;code=e.code;}}
  return put('batch-result',{id:batch.id+':'+row.row,unit:batch.unit,owner:batch.owner,batchId:batch.id,row:row.row,status:issuance?'prepared':'rejected',issuanceId:issuance?.id||null,code:code||null});
 }
 if(action==='lms-quarantine-review'){
  const event=s.get(a.tenant,'lms-event',p.eventId);
  requireThat(event&&allowed(a,['it'],event.unit),'not_found','Olay bulunamadı veya erişilemiyor.',404);
  const q=queueState(s,a.tenant,event,now);
  requireThat(q.state==='quarantined'&&q.lastId===p.expectedStateId,'queue_changed','Karantina durumu değişti; kaydı yenileyin.',409);
  requireThat(typeof p.reason==='string'&&p.reason.trim().length>=20&&p.reason.length<=2000,'reason','İnceleme gerekçesi 20–2000 karakter olmalı.');
  requireThat(!s.list(a.tenant,'lms-review').some(x=>x.stateId===q.lastId),'duplicate','Bu karantina zaten incelendi.',409);
  return put('lms-review',{id:id(),unit:event.unit,owner:event.owner,eventId:event.id,stateId:q.lastId,reason:p.reason,outcome:'source-correction-required'});
 }
 return null;
}
export function operationsView(s,a,now){
 const reviews=s.list(a.tenant,'lms-review');
 const queue=s.list(a.tenant,'lms-event').filter(e=>queueAllowed(a,e.unit)).map(e=>{
  const q=queueState(s,a.tenant,e,now),review=reviews.find(r=>r.stateId===q.lastId);
  return {id:e.id,unit:e.unit,contractId:e.contractId,type:e.type,revision:e.revision,receivedAt:e.receivedAt,sourceSigned:!!e.sourceProof,sourceTrusted:sourceEventTrusted(s,a.tenant,e),sourceSubmissionVersion:e.sourceProof?.submissionVersion||null,
   state:q.state,stateId:q.lastId,attempt:q.attempt,nextAttemptAt:q.nextAttemptAt,errorCode:q.errorCode,leaseExpired:q.leaseExpired,review:review?{reason:review.reason,createdAt:review.createdAt}:null,
   history:q.history.map(h=>({state:h.state,at:h.at,errorCode:h.errorCode||null})),
   allowedActions:q.state==='quarantined'&&!review&&allowed(a,['it'],e.unit)?['lms-quarantine-review']:[]};
 });
 const batches=s.list(a.tenant,'batch').filter(b=>batchAllowed(a,b.unit)).map(b=>{
  const rows=b.rows.map(row=>{const result=s.get(a.tenant,'batch-result',b.id+':'+row.row);return {...row,status:result?.status||(row.code?'rejected':'accepted'),processed:!!result,code:result?.code||row.code,issuanceId:result?.issuanceId||null,signed:!!result?.issuanceId&&!!s.get(a.tenant,'signed',result.issuanceId),delivered:false};});
  return {...b,rows,counts:{submitted:rows.length,accepted:rows.filter(r=>!b.rows[r.row-1].code).length,processed:rows.filter(r=>r.processed).length,rejected:rows.filter(r=>r.status==='rejected').length,prepared:rows.filter(r=>r.status==='prepared').length,signed:rows.filter(r=>r.signed).length,delivered:0}};
 });
 return {queue,batches,batchUnits:a.memberships.filter(m=>batchAllowed(a,m.unit)).map(m=>m.unit)};
}
