// Provider-neutral MAC boundary. The injected server driver owns secret material and lifecycle.
// No KMS vendor, credential, network endpoint or production activation is selected here.
import {timingSafeEqual} from 'node:crypto';
import {CoreError,requireThat} from './store.mjs';
const purposes=['pkce','nonce'];
const atom=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const allowed=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const fail=()=>new CoreError('identity_key','Kimlik güvenlik anahtarı kullanılamıyor. Yeni bir giriş isteği başlatın.',503);
export class IdentityKeyProvider {
 #driver;#tenant;#contract;#clock;#timeout;
 constructor({driver,tenant,contractDigest,clock=()=>new Date(),timeoutMs=2000}){
  requireThat(driver&&typeof driver.describe==='function'&&typeof driver.mac==='function'&&atom(tenant)&&hex(contractDigest)&&typeof clock==='function'&&Number.isInteger(timeoutMs)&&timeoutMs>=10&&timeoutMs<=10000,'identity_key_config','Kimlik anahtar sağlayıcısı yapılandırması geçersiz.',500);
  this.#driver=driver;this.#tenant=tenant;this.#contract=contractDigest;this.#clock=clock;this.#timeout=timeoutMs;
 }
 #now(){const now=this.#clock();if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw fail();return now.toISOString();}
 async #call(method,input){
  const abort=new AbortController();let timer;
  try{return await Promise.race([Promise.resolve().then(()=>this.#driver[method](structuredClone(input),{signal:abort.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(fail());},this.#timeout);})]);}
  catch{throw fail();}finally{clearTimeout(timer);abort.abort();}
 }
 #metadata(m,purpose,version,at,mode,created){
  if(!allowed(m,['tenant','purpose','version','algorithm','state','notBefore','notAfter','retiredAt','revision'])||m.tenant!==this.#tenant||m.purpose!==purpose||!atom(m.version)||(version&&m.version!==version)||m.algorithm!=='HMAC-SHA-256'||!Number.isSafeInteger(m.revision)||m.revision<1||!iso(m.notBefore)||!iso(m.notAfter)||m.notBefore>at||m.notAfter<=at||!['active','retired'].includes(m.state))throw fail();
  if(m.state==='active'&&m.retiredAt!==null)throw fail();
  if(m.state==='retired'&&(mode!=='resume'||!iso(m.retiredAt)||m.retiredAt>at||created>=m.retiredAt))throw fail();
  return Object.freeze(structuredClone(m));
 }
 async #derive({purpose,version=null,context,mode,created,expires}){
  if(!purposes.includes(purpose)||!hex(context)||!iso(created)||!iso(expires)||created>=expires||Date.parse(expires)-Date.parse(created)>900000)throw fail();
  const at=this.#now();if(created>at||expires<=at)throw fail();
  const ref={tenant:this.#tenant,purpose,version};
  const before=this.#metadata(await this.#call('describe',ref),purpose,version,at,mode,created);
  const message=JSON.stringify(['myys-identity-mac/1',this.#tenant,this.#contract,purpose,before.version,context,created,expires]);
  const reply=await this.#call('mac',{tenant:this.#tenant,purpose,version:before.version,revision:before.revision,message});
  // Keys never cross this boundary. Reject accidental secret-bearing driver replies.
  if(!allowed(reply,['tenant','purpose','version','revision','mac'])||reply.tenant!==this.#tenant||reply.purpose!==purpose||reply.version!==before.version||reply.revision!==before.revision||typeof reply.mac!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(reply.mac)||Buffer.from(reply.mac,'base64url').toString('base64url')!==reply.mac)throw fail();
  const end=this.#now();if(expires<=end)throw fail();
  const after=this.#metadata(await this.#call('describe',{...ref,version:before.version}),purpose,before.version,this.#now(),mode,created);
  // Rotation/revocation while the provider is working cannot silently produce a usable result.
  if(Object.keys(before).some(k=>before[k]!==after[k])||Object.keys(after).some(k=>before[k]!==after[k])||expires<=this.#now())throw fail();
  // Public metadata is evidence for the SQL commit barrier, never key material.
  return {mac:reply.mac,metadata:after,binding:Object.freeze({format:'myys-identity-key-binding/1',tenant:this.#tenant,contractDigest:this.#contract,purpose,version:before.version,context,created,expires})};
 }
 async start({purpose,context,lifetimeSeconds=300}){
  if(!Number.isSafeInteger(lifetimeSeconds)||lifetimeSeconds<1||lifetimeSeconds>900)throw fail();
  const created=this.#now();return this.#derive({purpose,context,mode:'start',created,expires:new Date(Date.parse(created)+lifetimeSeconds*1000).toISOString()});
 }
 async resume(binding){
  // Binding is read from a trusted persisted challenge, never chosen by a browser claim.
  if(!allowed(binding,['format','tenant','contractDigest','purpose','version','context','created','expires'])||binding.format!=='myys-identity-key-binding/1'||binding.tenant!==this.#tenant||binding.contractDigest!==this.#contract||!atom(binding.version)||!['pkce','nonce'].includes(binding.purpose))throw fail();
  return this.#derive({...binding,mode:'resume'});
 }
 async verify(binding,expected){
  if(typeof expected!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(expected))throw fail();
  const value=await this.resume(binding);if(!timingSafeEqual(Buffer.from(value.mac),Buffer.from(expected)))throw fail();return value;
 }
}
