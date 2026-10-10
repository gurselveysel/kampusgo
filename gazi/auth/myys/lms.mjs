import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {hash,requireThat,LocalAcceptanceStore} from './store.mjs';

// Internal synthetic adapter contract. It does not implement a vendor API or LTI.
export class LocalLmsAdapter {
 constructor(store,contract,{clock=()=>new Date().toISOString()}={}){
  requireThat(store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','LMS kabul adaptörü yalnız izole yerel depoda çalışır.',503);
  requireThat(contract?.mode==='local-acceptance'&&Buffer.isBuffer(contract.key)&&contract.key.length>=32,'lms_contract','İzole sözleşme ve en az 32 bayt test anahtarı gerekli.');
  requireThat(['id','tenant','unit','programId'].every(k=>typeof contract[k]==='string'&&contract[k]),'lms_contract','Sözleşme kapsamı eksik.');
  requireThat(contract.subjects&&typeof contract.subjects==='object','lms_contract','Sunucu tarafında kişi eşlemesi gerekli.');
  this.store=store;this.contract=contract;this.clock=clock;
 }
 accept(raw,signature){
  requireThat(typeof raw==='string'&&Buffer.byteLength(raw)<=50000&&typeof signature==='string'&&/^[a-f0-9]{64}$/.test(signature),'lms_signature','Olay biçimi veya imzası geçersiz.',401);
  const expected=createHmac('sha256',this.contract.key).update(raw).digest();
  requireThat(timingSafeEqual(expected,Buffer.from(signature,'hex')),'lms_signature','Olay imzası doğrulanamadı.',401);
  let event;try{event=JSON.parse(raw);}catch{requireThat(false,'lms_event','Olay JSON biçiminde olmalı.');}
  const c=this.contract,s=this.store;
  requireThat(event&&event.contractId===c.id&&event.tenant===c.tenant&&event.programId===c.programId,'lms_scope','Olay kurum veya program kapsamı dışında.',403);
  requireThat(typeof event.id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(event.id)&&Number.isSafeInteger(event.revision)&&event.revision>0,'lms_event','Olay kimliği ve artan kaynak sürümü gerekli.');
  requireThat(['grade','completion','license-revoked'].includes(event.type)&&typeof event.subject==='string','lms_event','Olay türü veya kaynak kişi kimliği geçersiz.');
  const person=Object.hasOwn(c.subjects,event.subject)?c.subjects[event.subject]:null;
  requireThat(person,'lms_identity','Kaynak kişi güvenilir eşlemede yok.',403);
  requireThat(Number.isFinite(Date.parse(event.occurredAt))&&Date.parse(event.occurredAt)<=Date.parse(this.clock())+300000,'lms_time','Olay zamanı geçersiz.');
  return s.transaction(()=>{
   const eventId=hash(c.id+'\0'+event.id),digest=hash(raw),old=s.get(c.tenant,'lms-event',eventId);
   if(old){requireThat(old.digest===digest,'idempotency_conflict','Aynı olay kimliği farklı içerikle tekrarlandı.',409);return {id:old.id,status:'accepted',duplicate:true,processed:!!s.get(c.tenant,'lms-receipt',old.id)};}
   const member=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(c.tenant,person,c.unit,this.clock());
   requireThat(member&&JSON.parse(member.roles).includes('learner'),'lms_identity','Etkin öğrenen üyeliği bulunamadı.',403);
   const program=s.get(c.tenant,'program',c.programId),enrollment=s.list(c.tenant,'enrollment').find(e=>e.programId===c.programId&&e.owner===person&&e.unit===c.unit);
   requireThat(program&&enrollment,'lms_enrollment','Önceden yetkilendirilmiş program kaydı gerekli.');
   if(event.type==='grade')requireThat(program.tasks.some(t=>t.id===event.taskId)&&typeof event.content==='string'&&event.content.trim().length>=20&&event.content.length<=20000&&typeof event.grade==='number'&&Number.isFinite(event.grade)&&event.grade>=0&&event.grade<=100,'lms_evidence','Görev, çalışma ve 0–100 kaynak notu gerekli.');
   const stream=c.id+':'+person+':'+(event.type==='grade'?'grade:'+event.taskId:event.type);
   requireThat(!s.list(c.tenant,'lms-event').some(e=>e.stream===stream&&e.revision===event.revision),'lms_revision_conflict','Bu kaynak sürümü başka bir olayla kayıtlı.',409);
   const record={id:eventId,unit:c.unit,owner:person,contractId:c.id,programId:c.programId,enrollmentId:enrollment.id,stream,revision:event.revision,type:event.type,taskId:event.type==='grade'?event.taskId:null,content:event.type==='grade'?event.content:null,grade:event.type==='grade'?event.grade:null,occurredAt:event.occurredAt,receivedAt:this.clock(),digest,state:'accepted'};
   s.put(c.tenant,'lms-event',record);
   s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(c.tenant,'adapter:'+c.id,'lms.accept',record.id,this.clock());
   return {id:eventId,status:'accepted',duplicate:false,processed:false};
  });
 }
 process(eventId){
  return this.store.transaction(()=>this.processInTransaction(eventId));
 }
 processInTransaction(eventId){
   const s=this.store,c=this.contract;
   const e=s.get(c.tenant,'lms-event',eventId);requireThat(e&&e.contractId===c.id,'lms_event','Kuyruk olayı bulunamadı.',404);
   const prior=s.get(c.tenant,'lms-receipt',eventId);if(prior)return prior;
   const member=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(c.tenant,e.owner,e.unit,this.clock());
   requireThat(member&&JSON.parse(member.roles).includes('learner'),'lms_identity','İşleme sırasında etkin öğrenen üyeliği bulunamadı.',403);
   requireThat(e.unit===c.unit&&e.programId===c.programId,'lms_scope','İşleme sözleşmesi olay kapsamıyla eşleşmiyor.',403);
   const later=s.list(c.tenant,'lms-event').some(x=>x.stream===e.stream&&x.revision>e.revision);
   return s.put(c.tenant,'lms-receipt',{id:eventId,unit:e.unit,owner:e.owner,eventId:e.id,contractId:c.id,state:later?'stale':'processed',processedAt:this.clock(),academicDecision:false,issued:false});
 }
}

// Append-only local worker history. Lease acquisition, completion and the receipt
// are separate durable transactions; no remote side effect is performed here.
export function queueState(store,tenant,event,now){
 const receipt=store.get(tenant,'lms-receipt',event.id);
 const history=store.list(tenant,'lms-job').filter(x=>x.eventId===event.id),last=history.at(-1);
 const state=receipt?.state||last?.state||'accepted';
 return {state,attempt:history.filter(x=>x.state==='processing').length,lastId:last?.id||null,
  leaseExpired:state==='processing'&&last.leaseUntil<=now,nextAttemptAt:last?.nextAttemptAt||null,
  errorCode:last?.errorCode||null,retryable:last?.retryable===true,history,receipt};
}
export class LocalLmsWorker {
 constructor(adapter,{clock=adapter.clock,maxAttempts=3,leaseMs=30000,retryMs=1000,beforeProcess=()=>{}}={}){
  requireThat(Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=10&&Number.isInteger(leaseMs)&&leaseMs>=100&&leaseMs<=300000&&Number.isInteger(retryMs)&&retryMs>=100&&retryMs<=3600000,'worker_config','İşçi sınırları geçersiz.');
  this.adapter=adapter;this.store=adapter.store;this.contract=adapter.contract;this.clock=clock;this.maxAttempts=maxAttempts;this.leaseMs=leaseMs;this.retryMs=retryMs;this.beforeProcess=beforeProcess;
 }
 event(eventId){const e=this.store.get(this.contract.tenant,'lms-event',eventId);requireThat(e&&e.contractId===this.contract.id&&e.unit===this.contract.unit,'not_found','Olay bulunamadı veya erişilemiyor.',404);return e;}
 append(e,state,extra={}){const r=this.store.put(this.contract.tenant,'lms-job',{id:randomUUID(),unit:e.unit,owner:e.owner,eventId:e.id,contractId:e.contractId,state,at:this.clock(),...extra});this.store.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(this.contract.tenant,'worker:'+this.contract.id,'lms.'+state,r.id,r.at);return r;}
 claim(eventId){return this.store.transaction(()=>{
  const e=this.event(eventId),q=queueState(this.store,this.contract.tenant,e,this.clock());
  if(q.receipt||q.state==='quarantined'||q.state==='processing'&&!q.leaseExpired||q.state==='retry-wait'&&q.nextAttemptAt>this.clock())return null;
  if(q.attempt>=this.maxAttempts){this.append(e,'quarantined',{errorCode:'attempt_limit',retryable:false});return null;}
  return this.append(e,'processing',{leaseUntil:new Date(Date.parse(this.clock())+this.leaseMs).toISOString(),attempt:q.attempt+1});
 });}
 finish(claim){return this.store.transaction(()=>{
  const e=this.event(claim.eventId),q=queueState(this.store,this.contract.tenant,e,this.clock());
  // An expired/replaced claimant must never commit a late result.
  requireThat(q.lastId===claim.id&&q.state==='processing'&&!q.leaseExpired,'lease_lost','İşleme süresi veya sahipliği sona erdi.',409);
  const hook=this.beforeProcess(e);requireThat(!hook?.then,'async_worker','Yerel işçi dış ağ işlemi çalıştıramaz.',503);
  const receipt=this.adapter.processInTransaction(e.id);this.append(e,receipt.state,{claimId:claim.id});return receipt;
 });}
 fail(claim,error){return this.store.transaction(()=>{
  const e=this.event(claim.eventId),q=queueState(this.store,this.contract.tenant,e,this.clock());
  if(q.lastId!==claim.id||q.receipt||q.leaseExpired)return null;
  const transient=['source_temporarily_unavailable','SQLITE_BUSY','ETIMEDOUT'].includes(error?.code);
  const retryable=transient&&q.attempt<this.maxAttempts;
  // Never persist provider messages, stack traces, credentials or raw payloads.
  const errorCode=transient?'temporary_failure':['lms_identity','lms_scope','idempotency_conflict','lms_revision_conflict'].includes(error?.code)?error.code:'processing_failed';
  return this.append(e,retryable?'retry-wait':'quarantined',{claimId:claim.id,errorCode,retryable,nextAttemptAt:retryable?new Date(Date.parse(this.clock())+this.retryMs*2**(q.attempt-1)).toISOString():null});
 });}
 run(eventId){const claim=this.claim(eventId);if(!claim)return {claimed:false};try{return {claimed:true,receipt:this.finish(claim)};}catch(e){if(e.code==='lease_lost')return {claimed:true,leaseLost:true};return {claimed:true,failure:this.fail(claim,e)};}}
 drain(limit=25){requireThat(Number.isInteger(limit)&&limit>=1&&limit<=100,'worker_limit','İşçi sınırı 1–100 olmalı.');return this.store.list(this.contract.tenant,'lms-event').filter(e=>e.contractId===this.contract.id).filter(e=>{const q=queueState(this.store,this.contract.tenant,e,this.clock());return !q.receipt&&q.state!=='quarantined'&&(q.state!=='processing'||q.leaseExpired)&&(q.state!=='retry-wait'||q.nextAttemptAt<=this.clock());}).slice(0,limit).map(e=>this.run(e.id));}
}

// A newly accepted correction immediately closes eligibility, even before a worker runs.
export function currentLmsEvidence(store,tenant,evidence){
 if(evidence.source!=='signed-lms-local')return true;
 const e=store.get(tenant,'lms-event',evidence.sourceEventId),r=e&&store.get(tenant,'lms-receipt',e.id);
 if(!e||r?.state!=='processed'||e.digest!==evidence.sourceDigest)return false;
 return !store.list(tenant,'lms-event').some(x=>x.contractId===e.contractId&&x.owner===e.owner&&(x.type==='license-revoked'||x.stream===e.stream&&x.revision>e.revision));
}
