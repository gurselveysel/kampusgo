import {randomInt,randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {encodedStatus,signCredential} from '../lib/badge-service.mjs';
import {localIssuer,signingKey,trustedSignedKey,keyStatus} from './key-registry.mjs';
export const bundleFormat='MYYS-LOCAL-OB3-JWT-BUNDLE-1';
const base='https://local-acceptance.invalid';
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Durum listesi yalnız izole yerel kabulde çalışır.',503);
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const listURL=(t,u,purpose)=>base+'/myys/status/'+hash(t+'\n'+u)+'/'+purpose;
export function allocateStatus(s,t,r,actor,now){
 local(s);const old=s.get(t,'status-allocation',r.id);if(old)return old;
 const rows=s.list(t,'status-allocation').filter(x=>x.unit===r.unit),used=new Set(rows.map(x=>x.index));requireThat(used.size<10000,'status_capacity','Yerel durum listesi kapasitesine ulaşıldı.',409);
 let index=randomInt(131072);for(let i=0;used.has(index)&&i<131072;i++)index=(index+1)%131072;
 const record={id:r.id,unit:r.unit,owner:r.owner,index,createdAt:now,createdBy:actor};s.put(t,'status-allocation',record);s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(t,actor,'status-allocate',r.id,now);return record;
}
export function statusEntries(t,allocation){return ['revocation','suspension'].map(purpose=>({id:listURL(t,allocation.unit,purpose)+'#'+allocation.index,type:'BitstringStatusListEntry',statusPurpose:purpose,statusListIndex:String(allocation.index),statusListCredential:listURL(t,allocation.unit,purpose)}));}
function source(core,t,u){
 const s=core.store,allocations=s.list(t,'status-allocation').filter(x=>x.unit===u);
 const rows=allocations.map(x=>{const r=s.get(t,'issuance',x.id),d=r&&s.get(t,'decision',r.decisionId);return {id:x.id,index:x.index,revoked:s.list(t,'revocation').some(v=>v.issuanceId===x.id),suspended:!d||d.outcome!=='approved'||!core.decisionUsable({tenant:t},d)};});
 // Include immutable key and academic records so a concurrent change cannot publish an older status.
 const kinds=['issuance','signed','decision','assessment','evidence','appeal','resolution','revocation','key','key-review','key-state'];
 const digest=hash(stableStringify({rows,records:kinds.map(kind=>[kind,s.list(t,kind).filter(r=>r.unit===u)])}));return {rows,digest};
}
function snapshotTrusted(s,t,r){return trustedSignedKey(s,t,{...r,keyFingerprint:r.keyFingerprint,credential:{issuer:{id:localIssuer}}});}
export function currentStatusSnapshot(core,t,u){
 const s=core.store,r=s.list(t,'status-snapshot').filter(r=>r.unit===u).at(-1);
 return r&&r.validFrom<=core.clock()&&r.validUntil>core.clock()&&r.sourceDigest===source(core,t,u).digest&&snapshotTrusted(s,t,r)?r:null;
}
export async function publishStatusSnapshot(core,context,unit,material){
 const s=core.store;local(s);
 const prepare=()=>{const now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now);requireThat(role(a,unit,['it']),'forbidden','Durum listesini yalnız bu birimin bilgi işlem görevlisi hazırlayabilir.',403);return {a,key:signingKey(s,a.tenant,unit,material),src:source(core,a.tenant,unit),now};};
 const initial=s.transaction(prepare),validFrom=new Date(Math.floor(Date.parse(initial.now)/1000)*1000).toISOString(),validUntil=new Date(Date.parse(validFrom)+300000).toISOString();
 const lists=[];for(const purpose of ['revocation','suspension']){
  const id=listURL(initial.a.tenant,unit,purpose),credential={'@context':['https://www.w3.org/ns/credentials/v2'],id,type:['VerifiableCredential','BitstringStatusListCredential'],issuer:localIssuer,validFrom,validUntil,credentialSubject:{id:id+'#list',type:'BitstringStatusList',statusPurpose:purpose,encodedList:encodedStatus(initial.src.rows.filter(r=>purpose==='revocation'?r.revoked:r.suspended).map(r=>r.index)),ttl:60000}};
  lists.push({id,jwt:await signCredential(credential,material)});
 }
 return s.transaction(()=>{const latest=prepare();requireThat(latest.key.id===initial.key.id&&latest.src.digest===initial.src.digest&&latest.now<validUntil,'status_changed','İmzalama sırasında kaynak veya anahtar değişti; durum listesini yeniden hazırlayın.',409);const record={id:randomUUID(),unit,owner:latest.a.id,createdBy:latest.a.id,createdAt:latest.now,validFrom,validUntil,keyId:latest.key.id,kid:latest.key.jwk.kid,keyFingerprint:latest.key.fingerprint,sourceDigest:latest.src.digest,allocationCount:latest.src.rows.length,lists,official:false,scope:'local-acceptance'};s.put(latest.a.tenant,'status-snapshot',record);s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(latest.a.tenant,latest.a.id,'status-publish',record.id,latest.now);return {id:record.id,unit,validFrom,validUntil,allocationCount:record.allocationCount,official:false};});
}
export function statusView(core,a){
 return a.memberships.filter(m=>role(a,m.unit,['it','admin','studentAffairs'])).map(m=>{const r=currentStatusSnapshot(core,a.tenant,m.unit);return {unit:m.unit,current:!!r,validUntil:r?.validUntil||null,allocationCount:core.store.list(a.tenant,'status-allocation').filter(x=>x.unit===m.unit).length,canPublish:role(a,m.unit,['it']),canExportTrust:role(a,m.unit,['it','admin'])};});
}
export function exportPublicTrust(core,context,unit){
 const s=core.store;local(s);return s.transaction(()=>{const now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now);requireThat(role(a,unit,['it','admin']),'forbidden','Bu birimde açık güven siciline erişim gerekli.',403);return {format:'MYYS-LOCAL-TRUST-1',issuer:localIssuer,generatedAt:now,validUntil:new Date(Date.parse(now)+300000).toISOString(),keys:s.list(a.tenant,'key').filter(k=>k.unit===unit&&keyStatus(s,a.tenant,k).review?.outcome==='accepted').map(k=>{const st=keyStatus(s,a.tenant,k);return {jwk:k.jwk,state:st.state,acceptedAt:st.review.createdAt,retiredAt:st.changes.find(c=>c.state==='retired')?.createdAt||null};}),official:false};});
}
export function exportVerificationBundle(core,context,id){
 const s=core.store;local(s);return s.transaction(()=>{const a=s.principal(context.sessionHash,context.tenant,core.clock()),r=s.get(a.tenant,'issuance',id);requireThat(r&&r.owner===a.id&&a.mfa&&a.memberships.some(m=>m.unit===r.unit&&m.roles.includes('learner')),'not_found','Kendi belgenize ve çok faktörlü oturuma erişim gerekli.',404);const signed=s.get(a.tenant,'signed',id),allocation=s.get(a.tenant,'status-allocation',id);requireThat(signed&&allocation&&Array.isArray(signed.credential.credentialStatus),'status_missing','Bu belge imzalı durum listesi profiliyle hazırlanmadı.',409);const snapshot=currentStatusSnapshot(core,a.tenant,r.unit);requireThat(snapshot,'status_stale','BT tarafından güncel durum listesi hazırlanmalı.',409);return {format:bundleFormat,credential:signed.jwt,statusLists:snapshot.lists,exportedAt:core.clock(),official:false,scope:'local-acceptance',trustIncluded:false};});
}
