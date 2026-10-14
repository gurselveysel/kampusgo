// Unwired server-only HTTP security boundary. No HTTP route, DDL, seed or credential provisioning.
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {PostgresIdentityTransactions} from './identity-transactions.mjs';
import {CoreError,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const token=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const atom=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(v);
const purposes=['login','start','callback','session','logout','backchannel'];
const failure=(code='identity_http_epoch',status=503)=>new CoreError(code,code==='identity_rate'?'Çok fazla giriş isteği. Kısa süre sonra yeniden deneyin.':'Giriş güvenlik yapılandırması değişti veya kullanılamıyor. Yeniden giriş başlatın.',status);
export class PostgresIdentityHttpSecurity {
 #transactions;#scope;#origin;#contract;#key;#revision;#fingerprint;#policy;#limits;#lifetime;#clock;#permits=new WeakMap();
 constructor({transactions,tenant,issuer,audience,origin,contractDigest,key,keyRevision=1,clock=()=>new Date(),limits={global:120,network:40,browser:10,seconds:60},requestLifetimeSeconds=30}){
  let app,idp;try{app=new URL(origin);idp=new URL(issuer);}catch{}
  requireThat(transactions instanceof PostgresIdentityTransactions&&atom(tenant)&&typeof audience==='string'&&audience.length>0&&audience.length<=512&&!/[\x00-\x1f]/.test(audience)&&app?.protocol==='https:'&&app.origin===origin&&idp?.protocol==='https:'&&!idp.username&&!idp.password&&!idp.search&&!idp.hash&&hex(contractDigest)&&Buffer.isBuffer(key)&&key.length===32&&Number.isSafeInteger(keyRevision)&&keyRevision>=1&&typeof clock==='function','identity_http_config','SQL giriş güvenliği yapılandırması geçersiz.',500);
  requireThat(limits&&Object.keys(limits).length===4&&['global','network','browser','seconds'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>=1&&limits[k]<=3600)&&Number.isSafeInteger(requestLifetimeSeconds)&&requestLifetimeSeconds>=1&&requestLifetimeSeconds<=60,'identity_http_config','Giriş sınırları geçersiz.',500);
  this.#transactions=transactions;this.#scope=Object.freeze({tenant,issuer,audience});this.#origin=origin;this.#contract=contractDigest;this.#key=Buffer.from(key);this.#revision=keyRevision;this.#clock=clock;this.#limits=Object.freeze({...limits});this.#lifetime=requestLifetimeSeconds*1000;
  this.#fingerprint=this.#mac(['myys-sql-http-key-check/1']);this.#policy=hash(stableStringify({limits:this.#limits,requestLifetimeSeconds}));
 }
 #mac(value){return createHmac('sha256',this.#key).update(JSON.stringify(value)).digest('hex');}
 #now(){const date=this.#clock(),n=date instanceof Date?date.getTime():NaN;if(!Number.isSafeInteger(n)||n<0)throw failure('identity_clock');return n;}
 #values(){return [this.#scope.tenant,this.#scope.issuer,this.#scope.audience];}
 #scopeCheck(tx){if(!this.#transactions.owns(tx)||Object.keys(this.#scope).some(k=>tx.scope[k]!==this.#scope[k]))throw failure('identity_http_scope');}
 async #row(tx){this.#scopeCheck(tx);return (await tx.query('SELECT * FROM myys_identity_http_epochs WHERE tenant=$1 AND issuer=$2 AND audience=$3 FOR UPDATE',this.#values())).rows[0];}
 async #current(tx){const row=await this.#row(tx);if(!row||Number(row.revision)!==this.#revision||row.key_digest!==this.#fingerprint||row.policy_digest!==this.#policy||row.origin!==this.#origin||row.contract_digest!==this.#contract||Number(row.activated)>this.#now())throw failure();return row;}
 // Trusted, separately authorized control-plane call. It never creates/changes a KMS key.
 async activate({expectedRevision,operatorRef,authorityDigest}={}){
  requireThat(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&this.#revision===expectedRevision+1&&atom(operatorRef)&&hex(authorityDigest),'identity_http_control','Giriş güvenliği değişiklik dayanağı geçersiz.',400);
  return this.#transactions.run(async tx=>{
   const old=await this.#row(tx),now=this.#now();if((old?Number(old.revision):0)!==expectedRevision||(old&&Number(old.activated)>now))throw failure();
   if((await tx.query('SELECT 1 FROM myys_identity_http_history WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND key_digest=$4', [...this.#values(),this.#fingerprint])).rows.length)throw failure();
   if((await tx.query('SELECT 1 FROM myys_identity_http_buckets WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND ends>$4 LIMIT 1',[...this.#values(),now])).rows.length)throw failure('identity_key_rotation_wait');
   const fields=[...this.#values(),this.#revision,this.#fingerprint,this.#policy,this.#origin,this.#contract,now];
   if(old)await tx.query('UPDATE myys_identity_http_epochs SET revision=$4,key_digest=$5,policy_digest=$6,origin=$7,contract_digest=$8,activated=$9 WHERE tenant=$1 AND issuer=$2 AND audience=$3',fields);
   else await tx.query('INSERT INTO myys_identity_http_epochs (tenant,issuer,audience,revision,key_digest,policy_digest,origin,contract_digest,activated) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',fields);
   const id=randomUUID();await tx.query('INSERT INTO myys_identity_http_history (id,tenant,issuer,audience,revision,key_digest,policy_digest,origin,contract_digest,activated,limits,operator_ref,authority_digest) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)',[id,...fields,JSON.stringify({...this.#limits,requestLifetimeSeconds:this.#lifetime/1000}),operatorRef,authorityDigest]);
   if(this.#now()<now)throw failure('identity_clock');return Object.freeze({id,revision:this.#revision});
  },{retrySafe:true});
 }
 async assertCurrent(){await this.#transactions.run(tx=>this.#current(tx),{retrySafe:true});}
 // network is the verified transport peer, never a client-controlled forwarding header.
 async check({purpose,network,browserHash=null}){
  requireThat(purposes.includes(purpose)&&typeof network==='string'&&isIP(network)!==0&&(browserHash===null||hex(browserHash)),'identity_rate_input','Doğrulanmış bağlantı ve tarayıcı kapsamı gerekli.',403);
  const value=await this.#transactions.run(async tx=>{
   await this.#current(tx);const issued=this.#now(),span=this.#limits.seconds*1000,started=Math.floor(issued/span)*span,ends=started+span,expires=issued+this.#lifetime;
   if(!Number.isSafeInteger(ends)||!Number.isSafeInteger(expires))throw failure('identity_clock');
   await tx.query('DELETE FROM myys_identity_http_buckets WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND ends<=$4',[...this.#values(),issued]);
   const buckets=[['global','all'],['network',network],...(purpose==='start'&&browserHash!==null?[['browser',browserHash]]:[])].map(([kind,value])=>({kind,bucket:this.#mac(['myys-sql-rate/1',...this.#values(),purpose,kind,value])}));
   for(const b of buckets){const row=(await tx.query('SELECT started,ends,used FROM myys_identity_http_buckets WHERE tenant=$1 AND issuer=$2 AND audience=$3 AND purpose=$4 AND kind=$5 AND bucket=$6 FOR UPDATE',[...this.#values(),purpose,b.kind,b.bucket])).rows[0];if(row&&(Number(row.started)>issued||Number(row.ends)<=issued||Number(row.used)>=this.#limits[b.kind]))throw failure('identity_rate',429);}
   for(const b of buckets)await tx.query('INSERT INTO myys_identity_http_buckets (tenant,issuer,audience,purpose,kind,bucket,started,ends,used) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1) ON CONFLICT(tenant,issuer,audience,purpose,kind,bucket) DO UPDATE SET used=myys_identity_http_buckets.used+1',[...this.#values(),purpose,b.kind,b.bucket,started,ends]);
   if(this.#now()<issued||this.#now()>=expires)throw failure('identity_clock');return {purpose,browserHash,issued,expires};
  },{retrySafe:true});
  const permit=Object.freeze({});this.#permits.set(permit,value);return permit;
 }
 #permit(permit){const p=this.#permits.get(permit),now=this.#now();if(!p||now<p.issued||now>=p.expires)throw failure('identity_http_permit');return p;}
 // One HTTP request may check the same opaque permit at claim and final SQL commit.
 // This is an epoch/budget guard, NOT identity, role or command authorization.
 async assertPermit(tx,permit,{purpose,browserHash=null}){
  this.#scopeCheck(tx);const p=this.#permit(permit);if(p.purpose!==purpose||p.browserHash!==browserHash)throw failure('identity_http_permit');await this.#current(tx);this.#permit(permit);
 }
 close(permit){this.#permits.delete(permit);}
 #csrfValue(browserToken){return createHmac('sha256',this.#key).update(JSON.stringify(['myys-sql-csrf/1',...this.#values(),this.#origin,this.#contract,this.#revision,browserToken])).digest('base64url');}
 async csrf(permit,browserToken){
  const p=this.#permit(permit);if(!['login','session'].includes(p.purpose)||!token(browserToken)||(p.purpose==='session'&&p.browserHash===null)||(p.browserHash!==null&&p.browserHash!==hash(browserToken)))throw failure('identity_csrf',403);
  return this.#transactions.run(async tx=>{await this.assertPermit(tx,permit,{purpose:p.purpose,browserHash:p.browserHash});return this.#csrfValue(browserToken);},{retrySafe:true});
 }
 async verifyCsrf(permit,browserToken,value){
  const p=this.#permit(permit);if(!['start','logout'].includes(p.purpose)||!token(browserToken)||p.browserHash!==hash(browserToken)||!token(value)||!timingSafeEqual(Buffer.from(value),Buffer.from(this.#csrfValue(browserToken))))throw failure('identity_csrf',403);
  await this.#transactions.run(tx=>this.assertPermit(tx,permit,{purpose:p.purpose,browserHash:p.browserHash}),{retrySafe:true});
 }
}
