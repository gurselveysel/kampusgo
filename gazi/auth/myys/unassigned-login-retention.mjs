// Local acceptance only. No HTTP route grants institution-wide security-data authority.
import {randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
export const unassignedLoginTarget='unassigned-expired-logins';
const scope='tenant-unassigned-identity-requests/1';
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Giriş saklama görevi yalnız izole yerel kabulde çalışır.',503);
const atom=v=>typeof v==='string'&&/^[A-Za-z0-9._:-]{1,160}$/.test(v);
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const grant=(s,tenant,person,unit)=>s.list(tenant,'retention-authority').filter(r=>r.personId===person&&r.unit===unit).at(-1);
const current=(s,tenant,person,unit,capability,now)=>{
 const g=grant(s,tenant,person,unit);if(!g||g.scope!==scope||!g.active||!iso(now)||g.notBefore>now||g.expires<=now||!g.capabilities.includes(capability))return null;
 const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(tenant,person,unit,now);
 return m&&JSON.parse(m.roles).includes(capability==='execute'?'it':'admin')?g:null;
};
// Trusted, separately authorized local operator API. Operator metadata is not itself authorization.
// Existing roles cannot call this through core.run or HTTP, and there is no default grant.
export function recordLocalRetentionAuthority({store:s,tenant,personId,unit,capabilities,active,notBefore,expires,revision,expectedRevision,operatorRef,authorityDigest,now=new Date().toISOString()}){
 local(s);requireThat([tenant,personId,unit,operatorRef].every(atom)&&Array.isArray(capabilities)&&capabilities.length>0&&capabilities.length<=3&&new Set(capabilities).size===capabilities.length&&capabilities.every(c=>['prepare','review','execute'].includes(c))&&typeof active==='boolean'&&[now,notBefore,expires].every(iso)&&notBefore<expires&&Number.isSafeInteger(revision)&&Number.isSafeInteger(expectedRevision)&&expectedRevision>=0&&revision===expectedRevision+1&&typeof authorityDigest==='string'&&/^[a-f0-9]{64}$/.test(authorityDigest),'retention_authority_control','Kurum kapsamlı görevlendirme, süre ve sürüm dayanağı gerekli.',400);
 return s.transaction(()=>{
  const prior=grant(s,tenant,personId,unit);requireThat((prior?.revision||0)===expectedRevision&&(!prior||prior.createdAt<=now),'retention_authority_changed','Görevlendirme sürümü değişti.',409);
  requireThat(s.db.prepare('SELECT 1 FROM memberships WHERE tenant=? AND person=? AND unit=?').get(tenant,personId,unit),'retention_authority_control','Görevlendirilen kişinin bu yönetim biriminde üyeliği gerekli.',400);
  const r={id:randomUUID(),unit,owner:personId,personId,scope,capabilities:[...capabilities].sort(),active,notBefore,expires,revision,previousId:prior?.id||null,authorityDigest,createdAt:now,createdBy:operatorRef,official:false};
  s.put(tenant,'retention-authority',r);s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(tenant,operatorRef,'retention.authority',r.id,now);return r;
 });
}
export function unassignedAuthority(s,a,unit,capability,now){local(s);if(!a.mfa||!a.memberships.some(m=>m.unit===unit))return null;const g=current(s,a.tenant,a.id,unit,capability,now);return g?hash(stableStringify(g)):null;}
export function requireUnassignedAuthority(s,a,unit,capability,now){const digest=unassignedAuthority(s,a,unit,capability,now);requireThat(digest,'retention_authority','Bu işlem için güncel kurum kapsamlı giriş saklama görevlendirmesi gerekli.',403);return digest;}
export function unassignedPolicyAuthorCurrent(s,tenant,policy,now){const author=current(s,tenant,policy.createdBy,policy.unit,'prepare',now);return !!(author&&hash(stableStringify(author))===policy.authorityDigest);}
export function unassignedPolicyCurrent(s,tenant,policy,review,now){
 const checker=review&&current(s,tenant,review.createdBy,policy.unit,'review',now);
 return !!(unassignedPolicyAuthorCurrent(s,tenant,policy,now)&&checker&&hash(stableStringify(checker))===review.authorityDigest);
}
export function unassignedLoginCandidates(s,tenant,cutoff){
 local(s);requireThat(iso(cutoff),'retention_clock','Geçerli saklama eşiği gerekli.',500);
 const has=table=>!!s.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
 if(!has('identity_challenges'))return {selected:[],eligibleCount:0,protectedCount:0,digest:hash(stableStringify({scope,tenant,cutoff,rows:[],protectedCount:0,eligibleCount:0}))};
 const rows=s.db.prepare("SELECT * FROM identity_challenges WHERE tenant=? AND status IN ('failed','cancelled') AND created>=0 AND created<expires AND finished>=created AND expires<=? AND finished<=? ORDER BY id").all(tenant,Date.parse(cutoff),Date.parse(cutoff));
 const linked=(table,where,values)=>has(table)&&!!s.db.prepare('SELECT 1 FROM '+table+' WHERE '+where+' LIMIT 1').get(...values);
 const eligible=rows.filter(r=>!linked('audit',"record_id=? AND action='identity.accept'",[r.id])&&!linked('bindings','session_hash=?',[r.browser_hash])&&!linked('identity_scopes','session_hash=?',[r.browser_hash])&&!linked('identity_provider_sessions','session_hash=?',[r.browser_hash])&&!linked('identity_session_links','browser_hash=? OR session_hash=?',[r.browser_hash,r.browser_hash]));
 const selected=eligible.slice(0,100),protectedCount=rows.length-eligible.length;
 return {selected,eligibleCount:eligible.length,protectedCount,digest:hash(stableStringify({scope,tenant,cutoff,eligibleCount:eligible.length,protectedCount,rows:selected}))};
}
export function removeUnassignedLoginCandidates(s,tenant,selected){
 local(s);requireThat(s.db.isTransaction===true,'retention_transaction','Silme aynı denetimli işlem içinde yapılmalı.',500);let removed=0;
 for(const row of selected){const n=Number(s.db.prepare("DELETE FROM identity_challenges WHERE tenant=? AND id=? AND status IN ('failed','cancelled')").run(tenant,row.id).changes);requireThat(n===1,'retention_stale','Giriş adayları değişti; yeniden önizleyin.',409);removed+=n;}return removed;
}
