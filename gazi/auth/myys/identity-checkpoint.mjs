// Unwired checkpoint protocol. The trusted external journal MUST survive SQL restore independently.
// No credential, migration, recovery override or production service is created here.
import {createHash} from 'node:crypto';
import {CoreError,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
export const identityCheckpointProfile='myys-sql-identity-checkpoint/1';
export const identityCheckpointTables=Object.freeze([
 'myys_identity_challenge_audit','myys_identity_challenges','myys_identity_http_buckets',
 'myys_identity_http_epochs','myys_identity_http_history','myys_identity_key_audit',
 'myys_identity_key_barriers','myys_identity_logout_receipts','myys_identity_memberships',
 'myys_identity_persons','myys_identity_session_audit','myys_identity_sessions'
]);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const keys=(v,list)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...list].sort().join('|');
const headKeys=['journalId','profile','fence','operationId','stateDigest'];
export const validIdentityCheckpointHead=h=>keys(h,headKeys)&&uuid(h.journalId)&&h.profile===identityCheckpointProfile&&Number.isSafeInteger(h.fence)&&h.fence>0&&uuid(h.operationId)&&hex(h.stateDigest);
const equal=(a,b)=>stableStringify(a)===stableStringify(b);
const closed=()=>new CoreError('identity_checkpoint','Kimlik güvenlik kaydının güncelliği doğrulanamadı. Erişim kapalı.',503);
const check=condition=>{if(!condition)throw closed();};
const rowHead=r=>r?{journalId:r.journal_id,profile:r.profile,fence:Number(r.fence),operationId:r.operation_id,stateDigest:r.state_digest}:null;
export class PostgresIdentityCheckpoint {
 #driver;#id;#timeout;#tickets=new WeakMap();
 constructor({journalDriver,journalId,timeoutMs=2000}){
  requireThat(journalDriver&&['reserve','commit','abort'].every(k=>typeof journalDriver[k]==='function')&&uuid(journalId)&&Number.isSafeInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=10000,'identity_checkpoint_config','Güvenlik kontrol kaydı yapılandırması geçersiz.',500);
  this.#driver=journalDriver;this.#id=journalId;this.#timeout=timeoutMs;
 }
 async #call(method,value){
  const abort=new AbortController();let timer;
  try{return structuredClone(await Promise.race([Promise.resolve().then(()=>this.#driver[method](structuredClone(value),{signal:abort.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(closed());},this.#timeout);})]));}
  catch{throw closed();}finally{clearTimeout(timer);abort.abort();}
 }
 // Called before opening any SQL transaction. No lease expiry or automatic pending-operation release.
 async reserve(control=null){
  if(control!==null)requireThat(keys(control,['operatorRef','authorityDigest'])&&/^[A-Za-z0-9._:-]{1,160}$/.test(control.operatorRef)&&hex(control.authorityDigest),'identity_checkpoint_control','İlk güvenlik kaydı için yetkili işlem dayanağı gerekli.',400);
  const kind=control===null?'operation':'initialize',r=await this.#call('reserve',{journalId:this.#id,profile:identityCheckpointProfile,kind,control});
  check(keys(r,['journalId','profile','kind','fence','operationId','base'])&&r.journalId===this.#id&&r.profile===identityCheckpointProfile&&r.kind===kind&&Number.isSafeInteger(r.fence)&&r.fence>0&&uuid(r.operationId));
  check(kind==='initialize'?r.base===null:validIdentityCheckpointHead(r.base)&&r.base.journalId===this.#id&&r.fence>r.base.fence);
  const ticket=Object.freeze({});this.#tickets.set(ticket,{reservation:r,next:null,checked:false});return ticket;
 }
 #ticket(ticket){const t=this.#tickets.get(ticket);check(t);return t;}
 async #head(tx){const r=await tx.query('SELECT * FROM public.myys_identity_checkpoint_head FOR UPDATE');check(r.rows.length<=1);const h=rowHead(r.rows[0]);check(h===null||validIdentityCheckpointHead(h));return h;}
 async #snapshot(tx){
  const names=(await tx.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND left(tablename,14)='myys_identity_' ORDER BY tablename COLLATE \"C\" ")).rows.map(r=>r.tablename);
  check(equal(names,[...identityCheckpointTables,'myys_identity_checkpoint_head'].sort()));
  const sha=createHash('sha256');sha.update(identityCheckpointProfile);let total=0,bytes=0;
  // Deliberately bounded acceptance profile, not a scalable production incremental digest.
  for(const name of identityCheckpointTables){
   const rows=(await tx.query(`SELECT to_jsonb(t)::text AS record FROM public.${name} t ORDER BY to_jsonb(t)::text COLLATE "C" LIMIT 10001`)).rows;
   check(rows.length<=10000);total+=rows.length;sha.update('\0'+name+'\0'+rows.length+'\0');
   for(const {record} of rows){check(typeof record==='string');const n=Buffer.byteLength(record);bytes+=n;check(bytes<=16*1024*1024);sha.update(String(n)+':');sha.update(record);}
  }
  return {digest:sha.digest('hex'),total};
 }
 async before(tx,ticket){
  const t=this.#ticket(ticket);t.next=null;t.checked=false;
  await tx.query("SELECT set_config('search_path','pg_catalog,public',true)");
  const h=await this.#head(tx),s=await this.#snapshot(tx);
  check(equal(h,t.reservation.base));
  check(h===null?t.reservation.kind==='initialize'&&s.total===0:s.digest===h.stateDigest);
  t.checked=true;
 }
 async prepare(tx,ticket){
  const t=this.#ticket(ticket);check(t.checked&&equal(await this.#head(tx),t.reservation.base));
  const s=await this.#snapshot(tx),r=t.reservation;
  const next={journalId:this.#id,profile:identityCheckpointProfile,fence:r.fence,operationId:r.operationId,stateDigest:s.digest};
  const v=[next.journalId,next.profile,next.fence,next.operationId,next.stateDigest];
  const result=r.base===null?await tx.query('INSERT INTO public.myys_identity_checkpoint_head(singleton,journal_id,profile,fence,operation_id,state_digest) VALUES(true,$1,$2,$3,$4,$5) RETURNING fence',v):await tx.query('UPDATE public.myys_identity_checkpoint_head SET journal_id=$1,profile=$2,fence=$3,operation_id=$4,state_digest=$5 WHERE singleton=true AND fence=$6 AND operation_id=$7 RETURNING fence',[...v,r.base.fence,r.base.operationId]);
  check(result.rows.length===1);t.next=next;
 }
 // Only the transaction owner calls these, after confirmed SQL COMMIT or confirmed ROLLBACK.
 async committed(ticket){const t=this.#ticket(ticket);check(validIdentityCheckpointHead(t.next));try{check(equal(await this.#call('commit',{reservation:t.reservation,next:t.next}),t.next));}finally{this.#tickets.delete(ticket);}}
 async rolledBack(ticket){const t=this.#ticket(ticket);try{check(equal(await this.#call('abort',{reservation:t.reservation}),{aborted:true,base:t.reservation.base}));}finally{this.#tickets.delete(ticket);}}
 // Unknown SQL outcomes keep the durable reservation pending; there is intentionally no resume/reset API.
 abandon(ticket){this.#tickets.delete(ticket);}
}
