import {sourceDescriptor} from './source-contract.mjs';
import {sourceAcceptTrust,sourceTrustDigest,sourceEventTrusted,sourceLifecycle,sourceKeyLifecycle} from './source-trust.mjs';
// Provider-neutral synthetic source packet. No production LMS endpoint or credential.
import {createPublicKey} from 'node:crypto';
import {createLocalJWKSet,decodeProtectedHeader,jwtVerify} from 'jose';
import {LocalAcceptanceStore,CoreError,hash,requireThat} from './store.mjs';
import {programBaseline,stableStringify} from './program-model.mjs';
import {acceptLmsEvent,processLmsEventInTransaction,LocalLmsWorker} from './lms.mjs';

export const sourcePacketFormat='myys-source-packet/1';
export const sourcePacketType='myys-source+jwt';
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=255;
const object=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(v,k));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','İmzalı kaynak alımı yalnız izole yerel kabulde çalışır.',503);
const can=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes('it'));
export function sourceBinding(program,taskId){
 const task=taskId?program.tasks.find(t=>t.id===taskId):null;
 return {programId:program.id,programVersion:program.version,programSha256:hash(stableStringify(programBaseline(program))),rubricSha256:hash(stableStringify(program.rubric)),taskId:taskId||null,taskSha256:task?hash(stableStringify(task)):null};
}

export class LocalSignedSourceAdapter {
 #store;#contract;#keys;#clock;
 constructor(store,contract,{clock=()=>new Date().toISOString()}={}){
  local(store);const c=structuredClone(contract);
  requireThat(c?.mode==='local-acceptance'&&['id','name','tenant','unit','programId','version','issuer','audience','courseId','sourceProgramVersion','sourceRubricVersion'].every(k=>text(c[k])),'source_contract','Yerel kaynak sözleşmesi eksik.',503);
  let uri;try{uri=new URL(c.issuer);}catch{}requireThat(uri&&uri.origin===c.issuer&&uri.protocol==='https:'&&!uri.port&&uri.hostname.endsWith('.invalid'),'source_contract','Yalnız sentetik kaynak düzenleyicisi kabul edilir.',503);
  requireThat(c.subjects&&typeof c.subjects==='object'&&!Array.isArray(c.subjects)&&Object.entries(c.subjects).length>0&&Object.entries(c.subjects).every(([k,v])=>text(k)&&text(v)),'source_contract','Sunucuya ait kişi eşlemesi gerekli.',503);
  requireThat(Array.isArray(c.keys)&&c.keys.length>=1&&c.keys.length<=8,'source_contract','Sınırlı güvenilen açık anahtar sicili gerekli.',503);
  const seen=new Set();for(const k of c.keys){
   const j=k.jwk;requireThat(j&&Object.keys(j).every(n=>['kty','n','e','kid','alg','use'].includes(n))&&j.kty==='RSA'&&j.e==='AQAB'&&j.alg==='RS256'&&j.use==='sig'&&text(j.kid)&&j.kid.startsWith(c.issuer+'/keys#')&&!seen.has(j.kid)&&['active','retired','compromised'].includes(k.state)&&iso(k.notBefore)&&iso(k.notAfter)&&k.notBefore<k.notAfter,'source_contract','Kaynak açık anahtar profili geçersiz.',503);
   let key;try{key=createPublicKey({key:j,format:'jwk'});}catch{}requireThat(key?.asymmetricKeyType==='rsa'&&key.asymmetricKeyDetails.modulusLength>=2048&&key.asymmetricKeyDetails.modulusLength<=8192,'source_contract','Kaynak RSA anahtarı 2048–8192 bit olmalı.',503);seen.add(j.kid);
   if(k.state==='retired')requireThat(iso(k.retiredAt),'source_contract','Kaynak anahtarının emeklilik zamanı gerekli.',503);
  }
  this.#store=store;this.#contract=c;this.#keys=createLocalJWKSet({keys:c.keys.map(k=>k.jwk)});this.#clock=clock;
 }
 get store(){return this.#store;}get contract(){return structuredClone(this.#contract);}get clock(){return this.#clock;}
 #actor(context){local(this.#store);const c=this.#contract,a=this.#store.principal(context.sessionHash,context.tenant,this.#clock());requireThat(a.tenant===c.tenant&&can(a,c.unit),'forbidden','Bu birimde imzalı kaynak alımı için bilgi işlem görevi ve çok faktörlü doğrulama gerekli.',403);return a;}
 view(a){const c=this.#contract;if(a.tenant!==c.tenant||!can(a,c.unit))return [];let canAccept=false;for(const k of c.keys)try{sourceAcceptTrust(this.#store,c,k.jwk.kid,this.#clock());canAccept=true;}catch{}return [{id:c.id,name:c.name,unit:c.unit,programId:c.programId,programTitle:this.#store.get(c.tenant,'program',c.programId)?.title||c.name,version:c.version,descriptor:sourceDescriptor(c),canPrepare:c.keys.every(k=>sourceKeyLifecycle(this.#store,c.tenant,{unit:c.unit},k).state!=='compromised')&&c.keys.some(k=>sourceKeyLifecycle(this.#store,c.tenant,{unit:c.unit},k).state==='active'),canExportTrust:this.#store.list(c.tenant,'source-contract').some(r=>r.unit===c.unit&&r.descriptor.id===c.id&&this.#store.list(c.tenant,'source-contract-review').some(v=>v.contractId===r.id&&v.outcome==='accepted')),canAccept,scope:'local-acceptance',official:false}];}
 trust(context,trustRecordId){
  this.#actor(context);const c=this.#contract,s=this.#store,all=s.list(c.tenant,'source-contract').filter(r=>r.unit===c.unit&&r.descriptor.id===c.id),r=trustRecordId?all.find(r=>r.id===trustRecordId):all.filter(r=>r.descriptorDigest===hash(stableStringify(sourceDescriptor(c)))).at(-1);
  requireThat(r,'source_trust','İndirilecek kaynak güven sürümü bulunamadı.',404);const d=r.descriptor,life=sourceLifecycle(s,c.tenant,r);
  const approvals=all.filter(x=>x.descriptorDigest===r.descriptorDigest).flatMap(x=>{const v=s.list(c.tenant,'source-contract-review').find(v=>v.contractId===x.id);return v?.outcome==='accepted'?[{id:x.id,digest:sourceTrustDigest(x),revision:x.revision,approvedAt:v.createdAt,validFrom:x.validFrom,expiresAt:x.expiresAt}]:[];});
  return {format:'myys-source-trust/1',scope:'local-acceptance',official:false,exportedAt:this.#clock(),expiresAt:new Date(Date.parse(this.#clock())+300000).toISOString(),contractId:d.id,contractVersion:d.version,tenant:d.tenant,unit:d.unit,programId:d.programId,issuer:d.issuer,audience:d.audience,courseId:d.courseId,sourceProgramVersion:d.sourceProgramVersion,sourceRubricVersion:d.sourceRubricVersion,contractState:life.state,contractClosedAt:life.createdAt,approvals,keys:d.keys.map(k=>{const state=sourceKeyLifecycle(s,c.tenant,r,k);return {...k,state:state.state,...(state.state==='retired'?{retiredAt:state.createdAt}:{})};})};
 }
 #binding(payload){
  const c=this.#contract,s=this.#store,program=s.get(c.tenant,'program',c.programId),e=payload.event;
  requireThat(program&&s.list(c.tenant,'publication').some(p=>p.programId===program.id),'source_program','Yayımlanmış yerel program sürümü gerekli.',409);
  requireThat(stableStringify(payload.binding)===stableStringify(sourceBinding(program,e.type==='grade'?e.taskId:null)),'source_binding','Program, rubrik veya görev sürümü kaynak paketiyle eşleşmiyor.',409);
 }
 async accept(context,token){
  this.#actor(context);const c=this.#contract,receivedAt=this.#clock();let p,header;
  try{
   if(typeof token!=='string'||token.length>50000||token.split('.').length!==3)throw Error();
   const parts=token.split('.');if(parts.some(v=>!/^[A-Za-z0-9_-]+$/.test(v)||Buffer.from(v,'base64url').toString('base64url')!==v))throw Error();header=decodeProtectedHeader(token);
   if(!object(header,['alg','kid','typ'])||header.alg!=='RS256'||header.typ!==sourcePacketType)throw Error();
   const key=c.keys.find(k=>k.jwk.kid===header.kid);if(!key||key.state==='compromised')throw Error();
   ({payload:p}=await jwtVerify(token,this.#keys,{issuer:c.issuer,audience:c.audience,algorithms:['RS256'],currentDate:new Date(receivedAt),maxTokenAge:86400,requiredClaims:['iss','aud','iat','exp','jti','sub','format','scope','binding','event']}));
   // Narrow local transport profile: compact JSON without duplicate members or alternate encodings.
   if(Buffer.from(parts[0],'base64url').toString('utf8')!==JSON.stringify(header)||Buffer.from(parts[1],'base64url').toString('utf8')!==JSON.stringify(p))throw Error();
   if(!object(p,['iss','aud','iat','exp','jti','sub','personId','format','scope','binding','event'])||p.aud!==c.audience||p.format!==sourcePacketFormat||!text(p.sub)||!text(p.jti)||![p.iat,p.exp].every(Number.isSafeInteger)||p.exp<=p.iat||p.exp-p.iat>86400)throw Error();
   if(!Object.hasOwn(c.subjects,p.sub)||p.personId!==c.subjects[p.sub])throw Error();
   const issued=p.iat*1000;if(issued<Date.parse(key.notBefore)||issued>=Date.parse(key.notAfter)||(key.state==='retired'&&issued>=Date.parse(key.retiredAt)))throw Error();
   const expectedScope={tenant:c.tenant,unit:c.unit,contractId:c.id,contractVersion:c.version,courseId:c.courseId,sourceProgramVersion:c.sourceProgramVersion,sourceRubricVersion:c.sourceRubricVersion};
   if(stableStringify(p.scope)!==stableStringify(expectedScope))throw Error();
   const e=p.event;if(!object(e,['id','revision','type','occurredAt','taskId','submissionId','submissionVersion','content','contentSha256','grade','completed'])||e.id!==p.jti||!text(e.submissionId)||e.submissionVersion!==e.revision||!Number.isSafeInteger(e.revision)||e.revision<1||!['grade','completion','license-revoked'].includes(e.type))throw Error();
   if(!iso(e.occurredAt)||Date.parse(e.occurredAt)>issued+999)throw Error();
   if(e.type==='grade'){if(!text(e.taskId)||typeof e.content!=='string'||e.contentSha256!==hash(e.content)||e.completed!==null)throw Error();}
   else if(e.taskId!==null||e.content!==null||e.contentSha256!==null||e.grade!==null||(e.type==='completion'?typeof e.completed!=='boolean':e.completed!==null))throw Error();
  }catch{throw new CoreError('source_signature','Kaynak dosyasının imzası, süresi veya sözleşmesi doğrulanamadı.',422);}
  const trust=sourceAcceptTrust(this.#store,c,header.kid,this.#clock());
  const digest=hash(token),proof={format:sourcePacketFormat,trustRecordId:trust.id,trustDigest:sourceTrustDigest(trust),jwt:token,sha256:digest,kid:header.kid,issuer:c.issuer,contractVersion:c.version,receivedAt,binding:structuredClone(p.binding),submissionId:p.event.submissionId,submissionVersion:p.event.submissionVersion,sourceProgramVersion:c.sourceProgramVersion,sourceRubricVersion:c.sourceRubricVersion,official:false};
  return acceptLmsEvent(this.#store,c,{...p.event,contractId:c.id,tenant:c.tenant,programId:c.programId,subject:p.sub},{digest,sourceProof:proof,clock:this.#clock,authorize:()=>{this.#actor(context);requireThat(sourceAcceptTrust(this.#store,c,header.kid,this.#clock()).id===trust.id,'source_trust','Kaynak güven sürümü değişti.',409);requireThat(Date.parse(this.#clock())<p.exp*1000,'source_expired','Kaynak dosyasının işleme süresi doldu.',409);this.#binding(p);}});
 }
 processInTransaction(eventId){requireThat(sourceEventTrusted(this.#store,this.#contract.tenant,this.#store.get(this.#contract.tenant,'lms-event',eventId)),'source_trust','Kaynak kanıtının güveni kullanıma kapalı.',409);return processLmsEventInTransaction(this.#store,this.#contract,eventId,this.#clock);}
 worker(context){this.#actor(context);return new LocalLmsWorker(this,{authorize:()=>this.#actor(context)});}
 process(context,eventId){return this.worker(context).run(eventId);}
}
