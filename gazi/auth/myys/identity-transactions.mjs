// Unwired PostgreSQL boundary. No connection, credential, schema or production route is created.
import {createHash} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
import {CoreError,requireThat} from './store.mjs';
import {PostgresIdentityCheckpoint} from './identity-checkpoint.mjs';
const nesting=new AsyncLocalStorage();
const safeText=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\x00-\x1f]/.test(v);
const failure=(uncertain=false)=>new CoreError(uncertain?'identity_commit_unknown':'identity_store',uncertain?'Giriş işleminin sonucu doğrulanamadı. Yeni bir giriş isteği başlatın.':'Kimlik deposuna güvenli erişim sağlanamadı.',503);
const lockKey=value=>BigInt.asIntN(64,BigInt('0x'+createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16))).toString();
const retryable=e=>['40001','40P01'].includes(e?.code);
export class PostgresIdentityTransactions {
 #pool;#timeout;#retries;#scope;#lock;#checkpoint;#activeTransactions=new WeakSet();
 constructor({pool,tenant,issuer,audience,statementTimeoutMs=3000,maxRetries=2,checkpoint=null}){
  requireThat(pool&&typeof pool.connect==='function'&&[tenant,issuer,audience].every(safeText)&&Number.isInteger(statementTimeoutMs)&&statementTimeoutMs>=50&&statementTimeoutMs<=10000&&Number.isInteger(maxRetries)&&maxRetries>=0&&maxRetries<=3,'identity_store_config','Kimlik işlem adaptörü yapılandırması geçersiz.',500);
  let url;try{url=new URL(issuer);}catch{}requireThat(url?.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash,'identity_store_config','Kimlik işlem kapsamı geçersiz.',500);
  requireThat(checkpoint===null||checkpoint instanceof PostgresIdentityCheckpoint,'identity_checkpoint_config','Güvenlik kontrol kaydı yapılandırması geçersiz.',500);
  this.#checkpoint=checkpoint;this.#pool=pool;this.#timeout=statementTimeoutMs;this.#retries=maxRetries;this.#scope=Object.freeze({tenant,issuer,audience});this.#lock=lockKey(['myys-identity-scope-v1',tenant,issuer,audience]);
 }
 // Repository guards can require this exact active transaction, not a forged/cross-pool scope object.
 owns(tx){return this.#activeTransactions.has(tx);}
 // The callback is SERVER-OWNED database work only. No IdP/KMS/HTTP call belongs here.
 // Retries are opt-in and apply only to complete, side-effect-free SQL callbacks.
 run(work,options={}){return this.#run(work,options);}
 // Trusted empty-database commissioning only. Not an HTTP operation or an automatic constructor action.
 initializeCheckpoint(control){requireThat(this.#checkpoint&&control,'identity_checkpoint_control','Açık ilk güvenlik kaydı ve yetkili dayanak gerekli.',400);return this.#run(()=>null,{},control);}
 async #run(work,{retrySafe=false,browserHash=null}={},control=null){
  requireThat(typeof work==='function'&&typeof retrySafe==='boolean'&&(browserHash===null||/^[a-f0-9]{64}$/.test(browserHash))&&!nesting.getStore(),'identity_transaction','Kimlik işlemi iç içe veya belirsiz çalıştırılamaz.',500);
  return nesting.run(true,async()=>{
   const ticket=this.#checkpoint?await this.#checkpoint.reserve(control):null;
   const outcome={rolledBack:false,committed:false};
   try{
    const value=await this.#sql(work,{retrySafe,browserHash,ticket,outcome});
    outcome.committed=true;
    if(ticket)await this.#checkpoint.committed(ticket);
    return value;
   }catch(error){
    if(ticket){
     if(!outcome.committed&&outcome.rolledBack)await this.#checkpoint.rolledBack(ticket);
     else this.#checkpoint.abandon(ticket);
    }
    throw error;
   }
  });
 }
 async #sql(work,{retrySafe,browserHash,ticket,outcome}){
   for(let attempt=0;;attempt++){
    outcome.rolledBack=false;
    let client,phase='connect',open=false,destroy=false,escaped,pendingQuery=false,driverError=null;
    try{
     client=await this.#pool.connect();
     requireThat(client&&typeof client.query==='function'&&typeof client.release==='function','identity_store_config','Kimlik depo sürücüsü geçersiz.',500);
     phase='begin';await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');open=true;
     // Transaction-local settings; unnamed parameterized queries also work with transaction pooling.
     await client.query("SELECT set_config('statement_timeout',$1,true),set_config('lock_timeout',$1,true),set_config('idle_in_transaction_session_timeout',$1,true)",[String(this.#timeout)]);
     // Shared scope serializes logout/session acceptance. A global browser lock serializes the repository's cross-tenant binding checks.
     const locks=[this.#lock,...(browserHash?[lockKey(['myys-identity-browser-v1',browserHash])]:[])].sort((a,b)=>BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0);
     for(const key of [...new Set(locks)])await client.query('SELECT pg_advisory_xact_lock($1::bigint)',[key]);
     phase='work';let active=true,busy=false,poison=null;
     const tx=Object.freeze({scope:this.#scope,attempt,
      query(text,values=[]){
       requireThat(active&&!busy&&!poison,'identity_transaction','İşlem sorgusu artık kullanılamaz.',500);
       // This is not a SQL authorization parser. Only trusted repository statements may be supplied.
       requireThat(typeof text==='string'&&text.length>0&&text.length<=50000&&Array.isArray(values)&&values.length<=100,'identity_transaction','Geçerli sunucu sorgusu gerekli.',500);
       busy=true;pendingQuery=true;
       const result=Promise.resolve().then(()=>client.query(text,values)).catch(e=>{poison=e;driverError=e;throw e;}).finally(()=>{busy=false;pendingQuery=false;});
       result.catch(()=>{});return result;
      }
     });
     this.#activeTransactions.add(tx);
     escaped=()=>{active=false;this.#activeTransactions.delete(tx);};
     let value;
     try{
      if(ticket)await this.#checkpoint.before(tx,ticket);
      value=await work(tx);requireThat(!busy&&!poison,'identity_transaction','Bütün kimlik sorguları tamamlanmalı.',500);
      if(ticket)await this.#checkpoint.prepare(tx,ticket);
     }finally{active=false;this.#activeTransactions.delete(tx);}
     phase='commit';await client.query('COMMIT');open=false;phase='done';
     return value;
    }catch(e){
     escaped?.();
     // COMMIT transport failure may have committed. Never repeat it or return a session.
     const uncertain=phase==='commit'&&!retryable(e);
     let rolledBack=false;
     if(pendingQuery)destroy=true;
     if(open&&!uncertain&&!pendingQuery){try{await client.query('ROLLBACK');rolledBack=true;open=false;}catch{destroy=true;}}
     outcome.rolledBack=rolledBack;
     if(uncertain||phase==='begin'||phase==='connect')destroy=true;
     if(retrySafe&&retryable(e)&&rolledBack&&attempt<this.#retries)continue;
     // Do not leak SQL, values, host, connection string or provider error details.
     if(e instanceof CoreError&&e!==driverError&&phase==='work'&&!uncertain)throw e;
     throw failure(uncertain);
    }finally{
     escaped?.();
     if(client&&typeof client.release==='function'){try{client.release(destroy||open);}catch{/* successful COMMIT is not undone by pool cleanup */}}
    }
   }
 }
}
