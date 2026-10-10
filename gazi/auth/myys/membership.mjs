import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {memberRoles} from './membership-model.mjs';
const allowed=(a,unit)=>a.mfa&&a.memberships.some(m=>m.unit===unit&&m.roles.includes('admin'));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const read=(s,t,person,unit)=>{const m=s.db.prepare('SELECT m.person,m.unit,m.roles,m.expires,m.active,p.active AS personActive FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=?').get(t,person,unit);return m?{...m,roles:JSON.parse(m.roles).sort(),active:!!m.active,personActive:!!m.personActive,revision:s.list(t,'membership-review').filter(r=>r.personId===person&&r.unit===unit&&r.outcome==='accepted').at(-1)?.id||null}:null;};
const digest=m=>hash(stableStringify(m));
const review=(s,t,id)=>s.list(t,'membership-review').find(r=>r.proposalId===id);
const activeAdmin=(s,t,person,unit,now)=>{const m=read(s,t,person,unit);return m?.active&&m.personActive&&m.expires>now&&m.roles.includes('admin');};
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üyelik değişimi yalnız izole yerel kabulde çalışır.',503);
export function membershipReplay(a,action,r){if(!['membership-propose','membership-review'].includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel üyelik işlemi canlıda kapalıdır.',503);requireThat(allowed(a,r.unit),'forbidden','Güncel birim yöneticisi ve çok faktörlü doğrulama gerekli.',403);return true;}
export function membershipCommand({action,p,a,s,put,id,now}){
 if(!['membership-propose','membership-review'].includes(action))return null;local(s);
 if(action==='membership-propose'){
  requireThat(allowed(a,p.unit),'forbidden','Bu birimde üyelik yönetimi yetkiniz yok.',403);
  const current=read(s,a.tenant,p.personId,p.unit);requireThat(current?.personActive,'not_found','Bu birimde mevcut etkin kişi kaydı gerekli.',404);
  requireThat(p.personId!==a.id,'separation','Kendi üyeliğinizi değiştiremezsiniz.',403);
  requireThat(p.basedOn===digest(current),'membership_changed','Üyelik değişti; güncel kaydı yeniden açın.',409);
  requireThat(['replace','revoke'].includes(p.operation)&&text(p.reason)&&text(p.authorityReference),'membership_fields','İşlem, gerekçe ve yetki dayanağı gerekli.');
  let roles=current.roles,expires=current.expires;
  if(p.operation==='replace'){
   requireThat(Array.isArray(p.roles)&&p.roles.length>0&&p.roles.length<=9&&new Set(p.roles).size===p.roles.length&&p.roles.every(r=>Object.hasOwn(memberRoles,r)),'membership_roles','Geçerli ve farklı görevler seçin.');
   const date=new Date(p.expires);requireThat(typeof p.expires==='string'&&Number.isFinite(date.getTime())&&date.toISOString()===p.expires&&p.expires>now,'membership_expiry','Gelecekteki açık üyelik bitiş zamanı gerekli.');
   roles=[...p.roles].sort();expires=p.expires;
  }else requireThat(current.active,'membership_changed','Üyelik zaten kapalı.',409);
  const next={...current,roles,expires,active:p.operation==='replace'};requireThat(digest(current)!==digest(next),'membership_unchanged','Aynı üyelik için değişiklik oluşturulamaz.');
  return put('membership-proposal',{id:id(),unit:p.unit,owner:p.personId,personId:p.personId,operation:p.operation,basedOn:p.basedOn,before:current,after:next,reason:p.reason,authorityReference:p.authorityReference,official:false});
 }
 const proposal=s.get(a.tenant,'membership-proposal',p.proposalId);requireThat(proposal&&allowed(a,proposal.unit),'not_found','Üyelik önerisi bulunamadı veya erişilemiyor.',404);
 requireThat(![proposal.createdBy,proposal.personId].includes(a.id),'separation','Hazırlayan ve hedef kişiden ayrı yönetici incelemeli.',403);
 requireThat(!review(s,a.tenant,proposal.id),'membership_reviewed','Öneri zaten incelendi.',409);
 requireThat(['accepted','rejected'].includes(p.outcome)&&text(p.reason),'membership_review','Gerekçeli inceleme sonucu gerekli.');
 let revokedSessions=0,cancelledRequests=0;
 if(p.outcome==='accepted'){
  requireThat(activeAdmin(s,a.tenant,proposal.createdBy,proposal.unit,now),'membership_authority','Hazırlayanın güncel birim yetkisi gerekli.',409);
  const current=read(s,a.tenant,proposal.personId,proposal.unit);requireThat(current?.personActive&&digest(current)===proposal.basedOn,'membership_changed','Üyelik değişti; yeni öneri hazırlayın.',409);
  requireThat(proposal.operation==='revoke'||proposal.after.expires>now,'membership_expiry','Önerilen üyelik süresi doldu.');
  s.db.prepare('UPDATE memberships SET roles=?,expires=?,active=? WHERE tenant=? AND person=? AND unit=?').run(JSON.stringify(proposal.after.roles),proposal.after.expires,proposal.after.active?1:0,a.tenant,proposal.personId,proposal.unit);
  // Sessions are tenant-scoped, so a unit role change invalidates every local
  // session of that person in this tenant. Other tenants and identity stay intact.
  const sessions=s.db.prepare('SELECT b.session_hash FROM bindings b JOIN identity_scopes i ON i.session_hash=b.session_hash WHERE b.person=? AND i.tenant=?').all(proposal.personId,a.tenant);
  const hasChallenges=s.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='identity_challenges'").get();
  for(const x of sessions){if(hasChallenges){const requests=s.db.prepare("SELECT id FROM identity_challenges WHERE tenant=? AND browser_hash=? AND status IN ('pending','claimed')").all(a.tenant,x.session_hash);for(const request of requests){cancelledRequests+=Number(s.db.prepare("UPDATE identity_challenges SET status='cancelled',finished=? WHERE id=?").run(Date.parse(now),request.id).changes);s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'identity.cancel',request.id,now);}}revokedSessions+=Number(s.db.prepare('DELETE FROM bindings WHERE session_hash=?').run(x.session_hash).changes);}
 }
 const version=s.list(a.tenant,'membership-review').filter(r=>r.personId===proposal.personId&&r.unit===proposal.unit&&r.outcome==='accepted').length+(p.outcome==='accepted'?1:0);
 return put('membership-review',{id:id(),unit:proposal.unit,owner:proposal.personId,personId:proposal.personId,proposalId:proposal.id,outcome:p.outcome,reason:p.reason,version,revokedSessions,cancelledRequests,freshLoginRequired:p.outcome==='accepted',academicRecordsChanged:false,externalIdentityChanged:false,official:false});
}
export function membershipView(s,a,now){
 const rows=s.db.prepare('SELECT person,unit FROM memberships WHERE tenant=? ORDER BY unit,person').all(a.tenant).filter(x=>x.person===a.id||allowed(a,x.unit));
 const members=rows.map(x=>{const m=read(s,a.tenant,x.person,x.unit);return {...m,basedOn:digest(m),current:m.active&&m.personActive&&m.expires>now,canPropose:allowed(a,m.unit)&&m.person!==a.id&&m.personActive};});
 const proposals=s.list(a.tenant,'membership-proposal').filter(p=>p.personId===a.id&&a.memberships.some(m=>m.unit===p.unit)||allowed(a,p.unit)).map(p=>{const r=review(s,a.tenant,p.id),current=read(s,a.tenant,p.personId,p.unit);return {...p,review:r||null,stale:!current||digest(current)!==p.basedOn,canReview:allowed(a,p.unit)&&![p.createdBy,p.personId].includes(a.id)&&!r,canAccept:activeAdmin(s,a.tenant,p.createdBy,p.unit,now)&&!!current&&current.personActive&&digest(current)===p.basedOn&&(p.operation==='revoke'||p.after.expires>now)};});
 return {members,proposals};
}
