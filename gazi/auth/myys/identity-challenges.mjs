// Server-only pending login repository. No person/session/HTTP activation, credentials or automatic DDL.
import {randomBytes,randomUUID} from 'node:crypto';
import {CoreError,hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {PostgresIdentityTransactions} from './identity-transactions.mjs';
import {PostgresIdentityKeyBridge} from './identity-key-bridge.mjs';
import {pkceS256} from './identity-flow.mjs';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v)&&Buffer.from(v,'base64url').toString('base64url')===v;
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const failure=()=>new CoreError('identity_challenge','Giriş isteği yok, kullanılmış veya süresi dolmuş. Yeni giriş başlatın.',403);
const digest=row=>hash(stableStringify(row));
export class PostgresIdentityChallenges {
 #transactions;#keys;#scope;#contract;#redirect;#clock;#lifetime;#handles=new WeakMap();
 constructor({transactions,keyBridge,tenant,issuer,audience,contractDigest,redirectUri,clock=()=>new Date(),requestLifetimeSeconds=300}){
  let uri;try{uri=new URL(redirectUri);}catch{}
  requireThat(transactions instanceof PostgresIdentityTransactions&&keyBridge instanceof PostgresIdentityKeyBridge&&[tenant,issuer,audience].every(v=>typeof v==='string'&&v.length>0&&v.length<=512)&&hex(contractDigest)&&uri?.protocol==='https:'&&!uri.username&&!uri.password&&!uri.search&&!uri.hash&&typeof clock==='function'&&Number.isSafeInteger(requestLifetimeSeconds)&&requestLifetimeSeconds>=1&&requestLifetimeSeconds<=900,'identity_challenge_config','Giriş isteği deposu yapılandırması geçersiz.',500);
  this.#transactions=transactions;this.#keys=keyBridge;this.#scope=Object.freeze({tenant,issuer,audience});this.#contract=contractDigest;this.#redirect=redirectUri;this.#clock=clock;this.#lifetime=requestLifetimeSeconds;
 }
 #now(){const at=this.#clock();if(!(at instanceof Date)||!Number.isFinite(at.getTime()))throw failure();return at.toISOString();}
 #scopeCheck(tx){if(Object.keys(this.#scope).some(k=>tx.scope[k]!==this.#scope[k]))throw failure();}
 #params(){return [this.#scope.tenant,this.#scope.issuer,this.#scope.audience];}
 #context(id,stateHash,browserHash){return hash(stableStringify({format:'myys-sql-login/1',id,stateHash,browserHash,...this.#scope,contractDigest:this.#contract,redirectUri:this.#redirect}));}
 #atFor(row){const at=this.#now();if(!row||!iso(row.created)||row.created>at||(row.claimed_at!==undefined&&row.claimed_at!==null&&(!iso(row.claimed_at)||row.claimed_at<row.created||row.claimed_at>at)))throw failure();return at;}
 #rowValid(row,status){
  const at=this.#atFor(row);if(row.status!==status||row.tenant!==this.#scope.tenant||row.issuer!==this.#scope.issuer||row.audience!==this.#scope.audience||row.contract_digest!==this.#contract||!iso(row.expires)||row.expires<=at||(status==='claimed'&&(!iso(row.claimed_at)||row.claimed_at>=row.expires)))throw failure();
  if(row.context_digest!==this.#context(row.id,row.state_hash,row.browser_hash))throw failure();
  for(const purpose of ['pkce','nonce']){const b=row[purpose+'_binding'];if(!b||b.tenant!==row.tenant||b.contractDigest!==row.contract_digest||b.purpose!==purpose||b.context!==row.context_digest||b.created<row.created||b.expires<row.expires)throw failure();}
 }
 async #audit(tx,row,event){
  this.#scopeCheck(tx);await tx.query('INSERT INTO myys_identity_challenge_audit (id,request_id,tenant,issuer,audience,event,recorded_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),row.id,...this.#params(),event,this.#atFor(row)]);
 }
 async #find(tx,id,browserHash){
  this.#scopeCheck(tx);const result=await tx.query('SELECT * FROM myys_identity_challenges WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND id=$4 AND browser_hash=$5 AND contract_digest=$6 FOR UPDATE',[...this.#params(),id,browserHash,this.#contract]);return result.rows[0];
 }
 #callback({state,browserHash,issuer,redirectUri}){
  if(!opaque(state)||!hex(browserHash)||issuer!==this.#scope.issuer||redirectUri!==this.#redirect)throw failure();
 }
 async begin({browserHash},{guard}={}){
  if(guard!==undefined&&typeof guard!=='function')throw failure();
  if(!hex(browserHash))throw failure();
  const id=randomUUID(),state=randomBytes(32).toString('base64url'),created=this.#now();
  const context=this.#context(id,hash(state),browserHash);
  // No request is persisted if provider work fails; no provider call occurs inside SQL.
  const receipts=[];for(const purpose of ['pkce','nonce'])receipts.push(await this.#keys.start({purpose,context,lifetimeSeconds:this.#lifetime}));
  if(receipts.some(r=>r.binding.tenant!==this.#scope.tenant||r.binding.contractDigest!==this.#contract||r.binding.context!==context))throw failure();
  const row={id,...this.#scope,created,expires:receipts.map(r=>r.binding.expires).sort()[0]};
  await this.#keys.withKeys(receipts,async tx=>{
   this.#scopeCheck(tx);if(guard)await guard(tx);const at=this.#now();if(created>at||row.expires<=at)throw failure();
   // Global browser advisory lock is taken by withKeys. Other scopes cannot share a pending login.
   const current=await tx.query("SELECT * FROM myys_identity_challenges WHERE browser_hash=$1 AND status IN ('pending','claimed') ORDER BY id FOR UPDATE",[browserHash]);
   if(current.rows.some(r=>r.expires>at&&(r.tenant!==this.#scope.tenant||r.issuer!==this.#scope.issuer||r.audience!==this.#scope.audience)))throw new CoreError('identity_browser_scope','Tarayıcıda başka kurumun giriş isteği sürüyor.',403);
   for(const old of current.rows.filter(r=>r.tenant===this.#scope.tenant&&r.issuer===this.#scope.issuer&&r.audience===this.#scope.audience)){
    await tx.query("UPDATE myys_identity_challenges SET status='cancelled',finished_at=$2 WHERE id=$1",[old.id,this.#atFor(old)]);await this.#audit(tx,old,'cancel');
   }
   await tx.query("INSERT INTO myys_identity_challenges (id,tenant,issuer,audience,contract_digest,state_hash,browser_hash,context_digest,created,expires,pkce_binding,nonce_binding,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,'pending')",[id,...this.#params(),this.#contract,hash(state),browserHash,context,created,row.expires,JSON.stringify(receipts[0].binding),JSON.stringify(receipts[1].binding)]);
   await this.#audit(tx,row,'begin');if(guard)await guard(tx);
  },{browserHash});
  return Object.freeze({state,nonce:receipts[1].mac,code_challenge:pkceS256(receipts[0].mac),code_challenge_method:'S256',client_id:this.#scope.audience,redirect_uri:this.#redirect,response_type:'code',scope:'openid'});
 }
 async #fail(row){
  return this.#transactions.run(async tx=>{
   const current=await this.#find(tx,row.id,row.browser_hash);if(!current||current.status!=='claimed')return false;
   await tx.query("UPDATE myys_identity_challenges SET status='failed',finished_at=$2 WHERE id=$1",[row.id,this.#atFor(current)]);await this.#audit(tx,current,'fail');return true;
  },{retrySafe:true,browserHash:row.browser_hash});
 }
 async claim(input,{guard}={}){
  if(guard!==undefined&&typeof guard!=='function')throw failure();
  this.#callback(input);const {state,browserHash}=input;
  // Irreversible request claim is committed BEFORE any resumed key/provider I/O.
  const row=await this.#transactions.run(async tx=>{
   this.#scopeCheck(tx);if(guard)await guard(tx);const result=await tx.query('SELECT * FROM myys_identity_challenges WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND state_hash=$4 AND browser_hash=$5 AND contract_digest=$6 FOR UPDATE',[...this.#params(),hash(state),browserHash,this.#contract]);
   const found=result.rows[0];this.#rowValid(found,'pending');
   const changed=await tx.query("UPDATE myys_identity_challenges SET status='claimed',claimed_at=$2 WHERE id=$1 AND status='pending' RETURNING *",[found.id,this.#now()]);
   if(changed.rows.length!==1)throw failure();await this.#audit(tx,found,'claim');if(guard)await guard(tx);return changed.rows[0];
  },{retrySafe:true,browserHash});
  try{
   const receipts=[];for(const purpose of ['pkce','nonce'])receipts.push(await this.#keys.resume(row[purpose+'_binding']));
   this.#rowValid(row,'claimed');const handle=Object.freeze({codeVerifier:receipts[0].mac,nonce:receipts[1].mac});
   this.#handles.set(handle,{row,receipts,used:false});return handle;
  }catch(e){if(e?.code!=='identity_commit_unknown')await this.#fail(row);throw failure();}
 }
 async finish(handle,work,{guard}={}){
  if(guard!==undefined&&typeof guard!=='function')throw failure();
  const entry=this.#handles.get(handle);if(!entry||entry.used||typeof work!=='function')throw failure();entry.used=true;
  try{return await this.#keys.withKeys(entry.receipts,async tx=>{
   if(guard)await guard(tx);
   const row=await this.#find(tx,entry.row.id,entry.row.browser_hash);this.#rowValid(row,'claimed');if(digest(row)!==digest(entry.row))throw failure();
   // Trusted SQL callback must separately validate opaque identity proof and current membership/session revocation.
   const result=await work(tx,Object.freeze({requestId:row.id,browserHash:row.browser_hash,created:row.created,expires:row.expires,contractDigest:row.contract_digest,...this.#scope}));this.#rowValid(row,'claimed');
   await tx.query("UPDATE myys_identity_challenges SET status='used',finished_at=$2 WHERE id=$1 AND status='claimed'",[row.id,this.#now()]);await this.#audit(tx,row,'use');if(guard)await guard(tx);return result;
  },{browserHash:entry.row.browser_hash});}
  catch(e){if(e?.code!=='identity_commit_unknown')await this.#fail(entry.row);throw e;}
 }
 async fail(handle){const entry=this.#handles.get(handle);if(!entry||entry.used)throw failure();entry.used=true;return this.#fail(entry.row);}
 async cancel(input,{guard}={}){
  if(guard!==undefined&&typeof guard!=='function')throw failure();
  this.#callback(input);const {state,browserHash}=input;
  return this.#transactions.run(async tx=>{
   this.#scopeCheck(tx);if(guard)await guard(tx);const result=await tx.query('SELECT * FROM myys_identity_challenges WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND state_hash=$4 AND browser_hash=$5 AND contract_digest=$6 FOR UPDATE',[...this.#params(),hash(state),browserHash,this.#contract]);
   const row=result.rows[0];this.#rowValid(row,'pending');await tx.query("UPDATE myys_identity_challenges SET status='cancelled',finished_at=$2 WHERE id=$1",[row.id,this.#now()]);await this.#audit(tx,row,'deny');if(guard)await guard(tx);return {cancelled:true};
  },{retrySafe:true,browserHash});
 }
 // Future authenticated logout calls this server-owned boundary; there is no anonymous HTTP endpoint.
 async cancelBrowser({browserHash}){
  if(!hex(browserHash))throw failure();return this.#transactions.run(tx=>this.cancelBrowserInTransaction(tx,{browserHash}),{retrySafe:true,browserHash});
 }
 // Server-owned session/logout repository only. Caller already holds its scope/browser transaction locks.
 async cancelBrowserInTransaction(tx,{browserHash}){
  if(!hex(browserHash))throw failure();this.#scopeCheck(tx);
  const result=await tx.query("SELECT * FROM myys_identity_challenges WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND browser_hash=$4 AND status IN ('pending','claimed') ORDER BY id FOR UPDATE",[...this.#params(),browserHash]);
  for(const row of result.rows){await tx.query("UPDATE myys_identity_challenges SET status='cancelled',finished_at=$2 WHERE id=$1",[row.id,this.#atFor(row)]);await this.#audit(tx,row,'cancel');}return {cancelled:result.rows.length};
 }
}
