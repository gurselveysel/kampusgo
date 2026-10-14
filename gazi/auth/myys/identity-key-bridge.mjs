// Server-only repository boundary. Unwired; no HTTP authority, schema installation or KMS selected.
import {randomUUID} from 'node:crypto';
import {CoreError,requireThat} from './store.mjs';
import {IdentityKeyProvider} from './identity-key-provider.mjs';
import {PostgresIdentityTransactions} from './identity-transactions.mjs';
const keys=['tenant','purpose','version','algorithm','state','notBefore','notAfter','retiredAt','revision'];
const atom=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const failure=()=>new CoreError('identity_key_barrier','Giriş güvenlik anahtarı değişti veya kullanılamıyor. Yeni giriş başlatın.',503);
const same=(a,b)=>keys.every(k=>a[k]===b[k]);
function metadata(value,tenant,now){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||!keys.every(k=>Object.hasOwn(value,k))||value.tenant!==tenant||!atom(value.version)||!['pkce','nonce'].includes(value.purpose)||value.algorithm!=='HMAC-SHA-256'||!Number.isSafeInteger(value.revision)||value.revision<1||!['active','retired','revoked'].includes(value.state)||!iso(value.notBefore)||!iso(value.notAfter)||value.notBefore>=value.notAfter)throw failure();
 if(value.state==='active'&&value.retiredAt!==null)throw failure();
 if(value.retiredAt!==null&&(!iso(value.retiredAt)||value.retiredAt<value.notBefore||value.retiredAt>now))throw failure();
 if(value.state==='retired'&&value.retiredAt===null)throw failure();
 return Object.freeze(structuredClone(value));
}
export class PostgresIdentityKeyBridge {
 #transactions;#provider;#scope;#contract;#clock;#receipts=new WeakMap();
 constructor({transactions,keyProvider,tenant,issuer,audience,contractDigest,clock=()=>new Date()}){
  requireThat(transactions instanceof PostgresIdentityTransactions&&keyProvider instanceof IdentityKeyProvider&&atom(tenant)&&typeof issuer==='string'&&typeof audience==='string'&&hex(contractDigest)&&typeof clock==='function','identity_key_bridge_config','Kimlik anahtar köprüsü yapılandırması geçersiz.',500);
  this.#transactions=transactions;this.#provider=keyProvider;this.#scope=Object.freeze({tenant,issuer,audience});this.#contract=contractDigest;this.#clock=clock;
 }
 #now(){const value=this.#clock();if(!(value instanceof Date)||!Number.isFinite(value.getTime()))throw failure();return value.toISOString();}
 #scopeCheck(tx){if(Object.keys(this.#scope).some(k=>this.#scope[k]!==tx.scope[k]))throw failure();}
 async #row(tx,purpose,version){
  this.#scopeCheck(tx);
  // Row locks are shared across issuer/audience scopes using the same tenant key.
  const result=await tx.query('SELECT metadata FROM myys_identity_key_barriers WHERE tenant=$1 AND purpose=$2 AND key_version=$3 FOR UPDATE',[this.#scope.tenant,purpose,version]);
  return result.rows.length===1?metadata(result.rows[0].metadata,this.#scope.tenant,this.#now()):null;
 }
 // Trusted control-plane call only. Authorize the operator outside this adapter.
 // Commit this barrier BEFORE changing provider state; fail closed during disagreement.
 async recordMetadata(value,{expectedRevision,operatorRef,authorityDigest}){
  const next=metadata(value,this.#scope.tenant,this.#now());
  requireThat(Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&atom(operatorRef)&&hex(authorityDigest),'identity_key_transition','Anahtar değişiklik dayanağı geçersiz.',400);
  const changeId=randomUUID();
  return this.#transactions.run(async tx=>{
   const old=await this.#row(tx,next.purpose,next.version);
   if(!old){if(expectedRevision!==0||next.revision!==1||next.state!=='active')throw failure();}
   else{
    if(old.revision!==expectedRevision||next.revision!==old.revision+1||!['active','retired'].includes(old.state)||!(old.state==='active'?['retired','revoked']:['revoked']).includes(next.state)||['tenant','purpose','version','algorithm','notBefore','notAfter'].some(k=>old[k]!==next[k])||(old.state==='retired'&&old.retiredAt!==next.retiredAt)||(old.state==='active'&&next.state==='revoked'&&next.retiredAt!==null))throw failure();
   }
   const fields=[next.tenant,next.purpose,next.version,next.revision,JSON.stringify(next)];
   if(old)await tx.query('UPDATE myys_identity_key_barriers SET revision=$4,metadata=$5::jsonb WHERE tenant=$1 AND purpose=$2 AND key_version=$3',fields);
   else await tx.query('INSERT INTO myys_identity_key_barriers (tenant,purpose,key_version,revision,metadata) VALUES ($1,$2,$3,$4,$5::jsonb)',fields);
   await tx.query('INSERT INTO myys_identity_key_audit (change_id,tenant,purpose,key_version,revision,issuer,audience,operator_ref,authority_digest,recorded_at,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)',[changeId,...fields.slice(0,4),this.#scope.issuer,this.#scope.audience,operatorRef,authorityDigest,this.#now(),JSON.stringify(next)]);
   return Object.freeze({changeId,revision:next.revision});
  },{retrySafe:true});
 }
 #valid(value,at){
  const {binding:b,metadata:m}=value;
  if(b.tenant!==this.#scope.tenant||b.contractDigest!==this.#contract||b.created>at||b.expires<=at||m.notBefore>at||m.notAfter<=at||!['active','retired'].includes(m.state)||(m.state==='retired'&&(m.retiredAt>at||b.created>=m.retiredAt)))throw failure();
 }
 async #check(tx,value){
  this.#valid(value,this.#now());
  const current=await this.#row(tx,value.binding.purpose,value.binding.version);
  if(!current||!same(current,value.metadata))throw failure();
  // Includes time spent waiting for the row lock/query.
  this.#valid(value,this.#now());
 }
 async #receipt(value){
  const copy=Object.freeze({mac:value.mac,binding:Object.freeze(structuredClone(value.binding)),metadata:metadata(value.metadata,this.#scope.tenant,this.#now())});
  await this.#transactions.run(tx=>this.#check(tx,copy),{retrySafe:true});
  const receipt=Object.freeze({mac:copy.mac,binding:copy.binding});
  this.#receipts.set(receipt,{value:copy,used:false});return receipt;
 }
 // Provider I/O finishes before the short database transaction starts.
 async start(input){return this.#receipt(await this.#provider.start(input));}
 async resume(binding){return this.#receipt(await this.#provider.resume(binding));}
 async verify(binding,expected){return this.#receipt(await this.#provider.verify(binding,expected));}
 async withKeys(receipts,work,{browserHash=null}={}){
  if(!Array.isArray(receipts)||receipts.length!==2||typeof work!=='function')throw failure();
  const entries=receipts.map(r=>this.#receipts.get(r));
  if(entries.some(e=>!e||e.used)||new Set(entries.map(e=>e.value.binding.purpose)).size!==2||entries[0].value.binding.context!==entries[1].value.binding.context)throw failure();
  // Consume even on failure/uncertain commit. Persisted challenge consumption is a separate requirement.
  for(const entry of entries)entry.used=true;
  entries.sort((a,b)=>a.value.binding.purpose.localeCompare(b.value.binding.purpose));
  return this.#transactions.run(async tx=>{
   for(const entry of entries)await this.#check(tx,entry.value);
   // SERVER-OWNED SQL ONLY. No IdP/KMS/HTTP, external side effects, COMMIT or DDL.
   const result=await work(tx);
   for(const entry of entries)await this.#check(tx,entry.value);
   return result;
  },{retrySafe:true,browserHash});
 }
}
