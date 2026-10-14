// Unwired server-only SQL identity flow. No HTTP endpoint, production migration, credential or seed.
import {randomBytes,randomUUID} from 'node:crypto';
import {CoreError,hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {ROLES} from './core.mjs';
import {createIdentityContract} from './identity-contract.mjs';
import {PostgresIdentityTransactions} from './identity-transactions.mjs';
import {IdentityKeyProvider} from './identity-key-provider.mjs';
import {PostgresIdentityKeyBridge} from './identity-key-bridge.mjs';
import {PostgresIdentityChallenges} from './identity-challenges.mjs';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const atom=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(v);
const subject=v=>typeof v==='string'&&/^[\x21-\x7e]{1,255}$/.test(v);
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const revision=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
const denied=(code='identity_required')=>new CoreError(code,'Kurum oturumu doğrulanamadı. Yeniden giriş yapın.',403);
export const identitySqlContractDigest=(identityConfig,redirectUri)=>hash(stableStringify({format:'myys-sql-identity/1',identityConfig,redirectUri}));
export class PostgresIdentityFlow {
 #transactions;#contract;#config;#digest;#keys;#requests;#clock;#exchange;#sessionMs;#timeout;
 constructor({transactions,identityConfig,keyDriver,redirectUri,exchangeCode,clock=()=>new Date(),requestLifetimeSeconds=300,sessionLifetimeSeconds=300,exchangeTimeoutMs=5000}){
  requireThat(transactions instanceof PostgresIdentityTransactions&&typeof exchangeCode==='function'&&typeof clock==='function'&&Number.isSafeInteger(sessionLifetimeSeconds)&&sessionLifetimeSeconds>=1&&sessionLifetimeSeconds<=900&&Number.isSafeInteger(exchangeTimeoutMs)&&exchangeTimeoutMs>=10&&exchangeTimeoutMs<=10000,'identity_sql_config','SQL kimlik akışı yapılandırması geçersiz.',500);
  this.#config=structuredClone(identityConfig);this.#contract=createIdentityContract(this.#config);this.#digest=identitySqlContractDigest(this.#config,redirectUri);this.#transactions=transactions;this.#clock=clock;this.#exchange=exchangeCode;this.#sessionMs=sessionLifetimeSeconds*1000;this.#timeout=exchangeTimeoutMs;
  const scope={tenant:this.#config.tenant,issuer:this.#config.issuer,audience:this.#config.audience};
  const provider=new IdentityKeyProvider({driver:keyDriver,tenant:scope.tenant,contractDigest:this.#digest,clock});
  this.#keys=new PostgresIdentityKeyBridge({transactions,keyProvider:provider,...scope,contractDigest:this.#digest,clock});
  this.#requests=new PostgresIdentityChallenges({transactions,keyBridge:this.#keys,...scope,contractDigest:this.#digest,redirectUri,clock,requestLifetimeSeconds});
 }
 #now(){const at=this.#clock();if(!(at instanceof Date)||!Number.isFinite(at.getTime()))throw denied('identity_clock');return at.toISOString();}
 #scope(){return [this.#config.tenant,this.#config.issuer,this.#config.audience];}
 #check(tx){if(['tenant','issuer','audience'].some(k=>tx.scope[k]!==this.#config[k]))throw denied('identity_tenant');}
 #control({expectedRevision,operatorRef,authorityDigest}={}){requireThat(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&atom(operatorRef)&&hex(authorityDigest),'identity_directory_control','Kişi kaydı değişiklik dayanağı geçersiz.',400);return {expectedRevision,operatorRef,authorityDigest};}
 async #audit(tx,event,record,actor='',authority=null){this.#check(tx);await tx.query('INSERT INTO myys_identity_session_audit (id,tenant,issuer,audience,actor_ref,event,record_ref,authority_digest,recorded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),...this.#scope(),actor,event,record,authority,this.#now()]);}
 // These three methods are trusted control-plane APIs, NEVER browser role/provisioning inputs.
 recordKeyMetadata(value,control){return this.#keys.recordMetadata(value,control);}
 async putPerson(value,control){
  const c=this.#control(control),v=structuredClone(value);
  requireThat(v&&Object.keys(v).every(k=>['id','issuer','subject','active','revision'].includes(k))&&atom(v.id)&&v.issuer===this.#config.issuer&&subject(v.subject)&&typeof v.active==='boolean'&&revision(v.revision)&&v.revision===c.expectedRevision+1,'identity_directory_control','Kişi kaydı geçersiz.',400);
  return this.#transactions.run(async tx=>{
   this.#check(tx);const result=await tx.query('SELECT * FROM myys_identity_persons WHERE id=$1 FOR UPDATE',[v.id]),old=result.rows[0];
   if(old?Number(old.revision)!==c.expectedRevision||old.issuer!==v.issuer||old.subject!==v.subject:c.expectedRevision!==0)throw denied('identity_directory_revision');
   if(old)await tx.query('UPDATE myys_identity_persons SET active=$2,revision=$3 WHERE id=$1',[v.id,v.active,v.revision]);
   else await tx.query('INSERT INTO myys_identity_persons (id,issuer,subject,active,revision) VALUES ($1,$2,$3,$4,$5)',[v.id,v.issuer,v.subject,v.active,v.revision]);
   await this.#audit(tx,'person',v.id,c.operatorRef,c.authorityDigest);return {id:v.id,revision:v.revision};
  },{retrySafe:true});
 }
 async putMembership(value,control){
  const c=this.#control(control),v=structuredClone(value);
  requireThat(v&&Object.keys(v).every(k=>['personId','unit','roles','active','notBefore','expires','revision'].includes(k))&&atom(v.personId)&&atom(v.unit)&&Array.isArray(v.roles)&&v.roles.length>0&&v.roles.every(r=>ROLES.includes(r))&&new Set(v.roles).size===v.roles.length&&typeof v.active==='boolean'&&iso(v.notBefore)&&iso(v.expires)&&v.notBefore<v.expires&&revision(v.revision)&&v.revision===c.expectedRevision+1,'identity_directory_control','Kurum üyeliği kaydı geçersiz.',400);v.roles.sort();
  return this.#transactions.run(async tx=>{
   this.#check(tx);const p=await tx.query('SELECT * FROM myys_identity_persons WHERE id=$1 AND issuer=$2 FOR UPDATE',[v.personId,this.#config.issuer]);if(!p.rows.length)throw denied('identity_member');
   const result=await tx.query('SELECT * FROM myys_identity_memberships WHERE tenant=$1 AND person_id=$2 AND unit=$3 FOR UPDATE',[this.#config.tenant,v.personId,v.unit]),old=result.rows[0];
   if(old?Number(old.revision)!==c.expectedRevision:c.expectedRevision!==0)throw denied('identity_directory_revision');
   const values=[this.#config.tenant,v.personId,v.unit,JSON.stringify(v.roles),v.active,v.notBefore,v.expires,v.revision];
   if(old)await tx.query('UPDATE myys_identity_memberships SET roles=$4::jsonb,active=$5,not_before=$6,expires=$7,revision=$8 WHERE tenant=$1 AND person_id=$2 AND unit=$3',values);
   else await tx.query('INSERT INTO myys_identity_memberships (tenant,person_id,unit,roles,active,not_before,expires,revision) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)',values);
   await this.#audit(tx,'membership',hash(stableStringify(values.slice(0,3))),c.operatorRef,c.authorityDigest);return {personId:v.personId,unit:v.unit,revision:v.revision};
  },{retrySafe:true});
 }
 async #directory(tx,{providerSubject=null,personId=null}){
  this.#check(tx);const result=providerSubject!==null?await tx.query('SELECT * FROM myys_identity_persons WHERE issuer=$1 AND subject=$2 FOR UPDATE',[this.#config.issuer,providerSubject]):await tx.query('SELECT * FROM myys_identity_persons WHERE issuer=$1 AND id=$2 FOR UPDATE',[this.#config.issuer,personId]);
  const person=result.rows[0];if(!person||person.active!==true||!revision(person.revision))throw denied('identity_member');
  const rows=await tx.query('SELECT * FROM myys_identity_memberships WHERE tenant=$1 AND person_id=$2 ORDER BY unit FOR UPDATE',[this.#config.tenant,person.id]);const at=this.#now();
  for(const m of rows.rows)if(typeof m.active!=='boolean'||!iso(m.not_before)||!iso(m.expires)||m.not_before>=m.expires||!revision(m.revision)||!atom(m.unit)||!Array.isArray(m.roles)||!m.roles.length||m.roles.some(r=>!ROLES.includes(r))||new Set(m.roles).size!==m.roles.length)throw denied('identity_directory');
  const active=rows.rows.filter(m=>m.active&&m.not_before<=at&&m.expires>at);if(!active.length)throw denied('membership_required');
  const snapshot=active.map(m=>({unit:m.unit,roles:[...m.roles].sort(),revision:String(m.revision),notBefore:m.not_before,expires:m.expires}));
  return {person,digest:hash(stableStringify(snapshot)),expires:active.map(m=>m.expires).sort()[0],memberships:snapshot.map(({unit,roles})=>({unit,roles}))};
 }
 async #browser(tx,sessionHash){
  this.#check(tx);const result=await tx.query('SELECT * FROM myys_identity_sessions WHERE session_hash=$1 FOR UPDATE',[sessionHash]),row=result.rows[0];
  if(row&&['tenant','issuer','audience'].some(k=>row[k]!==this.#config[k]))throw denied('identity_tenant');return row;
 }
 async begin({browserSessionHash}){
  if(!hex(browserSessionHash))throw denied();await this.#transactions.run(tx=>this.#browser(tx,browserSessionHash),{retrySafe:true,browserHash:browserSessionHash});return this.#requests.begin({browserHash:browserSessionHash});
 }
 cancel(input){return this.#requests.cancel({state:input.state,browserHash:input.browserSessionHash,issuer:input.issuer,redirectUri:input.redirectUri});}
 async #revocationCheck(tx,grant,request){
  const result=await tx.query('SELECT issued,received FROM myys_identity_logout_receipts WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND (subject_hash IS NULL OR subject_hash=$4) AND (sid_hash IS NULL OR sid_hash=$5)',[...this.#scope(),hash(grant.subject),grant.providerSessionId===null?null:hash(grant.providerSessionId)]);
  if(result.rows.some(r=>!iso(r.received)||request.created<=r.received||grant.issuedAt<=Number(r.issued)||grant.authenticatedAt<=Number(r.issued)))throw denied('identity_revoked');
 }
 async complete({state,code,browserSessionHash,issuer,redirectUri}){
  requireThat(typeof code==='string'&&/^[\x21-\x7e]{8,2048}$/.test(code),'identity_callback','Kimlik dönüş isteği geçersiz.',403);
  const handle=await this.#requests.claim({state,browserHash:browserSessionHash,issuer,redirectUri});const abort=new AbortController();let timer,finishing=false;
  try{
   const token=await Promise.race([Promise.resolve().then(()=>this.#exchange({code,codeVerifier:handle.codeVerifier,issuer:this.#config.issuer,audience:this.#config.audience,redirectUri,signal:abort.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(denied('identity_exchange'));},this.#timeout);})]);clearTimeout(timer);
   const proof=await this.#contract.verify(token,{expectedNonce:handle.nonce,now:new Date(this.#now())});finishing=true;
   return await this.#requests.finish(handle,async(tx,request)=>{
    this.#check(tx);if(request.contractDigest!==this.#digest)throw denied('identity_proof');
    const parent=await this.#browser(tx,request.browserHash);
    let grant=this.#contract.withVerifiedIdentity(proof,{now:new Date(this.#now())},v=>v);
    const directory=await this.#directory(tx,{providerSubject:grant.subject});await this.#revocationCheck(tx,grant,request);
    grant=this.#contract.withVerifiedIdentity(proof,{now:new Date(this.#now())},v=>v);
    const at=this.#now(),expires=new Date(Math.min(Date.parse(at)+this.#sessionMs,Date.parse(grant.expiresAt),Date.parse(directory.expires))).toISOString();if(expires<=at||parent?.created>at)throw denied();
    const sessionToken=randomBytes(32).toString('base64url'),sessionHash=hash(sessionToken);
    if(parent?.status==='active')await tx.query("UPDATE myys_identity_sessions SET status='revoked',revoked_at=$2 WHERE session_hash=$1",[parent.session_hash,at]);
    await tx.query("INSERT INTO myys_identity_sessions (session_hash,tenant,issuer,audience,contract_digest,contract_version,person_id,person_revision,membership_digest,parent_hash,request_id,subject_hash,sid_hash,issued,authenticated,mfa,created,expires,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'active')",[sessionHash,...this.#scope(),this.#digest,grant.contractVersion,directory.person.id,directory.person.revision,directory.digest,request.browserHash,request.requestId,hash(grant.subject),grant.providerSessionId===null?null:hash(grant.providerSessionId),grant.issuedAt,grant.authenticatedAt,grant.mfa,at,expires]);
    await this.#audit(tx,'accept',request.requestId,directory.person.id);
    this.#contract.withVerifiedIdentity(proof,{now:new Date(this.#now())},()=>{});const end=this.#now();if(expires<=end||at>end)throw denied();
    return {sessionToken,expires,personId:directory.person.id,tenant:this.#config.tenant};
   });
  }catch(e){if(!finishing)await this.#requests.fail(handle);if(e?.code==='identity_commit_unknown')throw e;throw denied('identity_callback');}
  finally{clearTimeout(timer);abort.abort();}
 }
 async principal({sessionHash}){
  if(!hex(sessionHash))throw denied();return this.#transactions.run(async tx=>{
   const row=await this.#browser(tx,sessionHash),at=this.#now();if(!row||row.status!=='active'||row.contract_digest!==this.#digest||row.mfa!==true||!iso(row.created)||!iso(row.expires)||row.created>at||row.expires<=at)throw denied();
   const current=await this.#directory(tx,{personId:row.person_id}),end=this.#now();if(String(current.person.revision)!==String(row.person_revision)||current.digest!==row.membership_digest||row.expires<=end||row.created>end)throw denied();
   return {id:row.person_id,tenant:this.#config.tenant,mfa:true,memberships:current.memberships,expires:row.expires};
  },{retrySafe:true,browserHash:sessionHash});
 }
 async logout({sessionHash}){
  if(!hex(sessionHash))throw denied();return this.#transactions.run(async tx=>{
   await this.#browser(tx,sessionHash);
   const family=await tx.query('WITH RECURSIVE family(h) AS (SELECT $4::text UNION SELECT s.session_hash FROM myys_identity_sessions s JOIN family f ON s.parent_hash=f.h WHERE s.tenant=$1 AND s.issuer=$2 AND s.audience=$3) SELECT h FROM family',[...this.#scope(),sessionHash]);
   let revoked=0,cancelledRequests=0;
   for(const {h} of family.rows){
    cancelledRequests+=(await this.#requests.cancelBrowserInTransaction(tx,{browserHash:h})).cancelled;
    const changed=await tx.query("UPDATE myys_identity_sessions SET status='revoked',revoked_at=$5 WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND session_hash=$4 AND status='active' RETURNING session_hash",[...this.#scope(),h,this.#now()]);revoked+=changed.rows.length;
   }
   if(revoked||cancelledRequests)await this.#audit(tx,'logout',hash(sessionHash));return {revoked,cancelledRequests};
  },{retrySafe:true,browserHash:sessionHash});
 }
 async backchannelLogout({logoutToken}){
  const proof=await this.#contract.verifyLogout(logoutToken,{now:new Date(this.#now())});
  return this.#transactions.run(async tx=>{
   this.#check(tx);const grant=this.#contract.withVerifiedLogout(proof,{now:new Date(this.#now())},v=>v);
   const old=await tx.query('SELECT digest FROM myys_identity_logout_receipts WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND jti_hash=$4',[...this.#scope(),grant.jtiHash]);
   if(old.rows.length){if(old.rows[0].digest!==grant.digest)throw new CoreError('identity_logout_replay','Oturum kapatma bildiriminin kimliği daha önce kullanılmış.',400);return {revoked:0,cancelledRequests:0,replayed:true};}
   await tx.query('INSERT INTO myys_identity_logout_receipts (tenant,issuer,audience,jti_hash,digest,subject_hash,sid_hash,issued,expires,received) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[...this.#scope(),grant.jtiHash,grant.digest,grant.subjectHash,grant.sidHash,grant.issued,grant.expires,this.#now()]);
   const rows=await tx.query("SELECT session_hash FROM myys_identity_sessions WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND status='active' AND ($4::text IS NULL OR subject_hash=$4) AND ($5::text IS NULL OR sid_hash=$5) ORDER BY session_hash FOR UPDATE",[...this.#scope(),grant.subjectHash,grant.sidHash]);
   let cancelledRequests=0;for(const row of rows.rows){cancelledRequests+=(await this.#requests.cancelBrowserInTransaction(tx,{browserHash:row.session_hash})).cancelled;await tx.query("UPDATE myys_identity_sessions SET status='revoked',revoked_at=$2 WHERE session_hash=$1",[row.session_hash,this.#now()]);}
   await this.#audit(tx,'backchannel',grant.jtiHash);this.#contract.withVerifiedLogout(proof,{now:new Date(this.#now())},()=>{});return {revoked:rows.rows.length,cancelledRequests,replayed:false};
  },{retrySafe:true});
 }
}
