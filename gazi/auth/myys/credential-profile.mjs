import {isLocalSqlAcademicStore} from './academic-sql-store.mjs';
import {authorityReady,currentAuthorityDossier} from './authority.mjs';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {profileSource,profileIssuer,profileFields,profileFormat} from './credential-profile-model.mjs';
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const active=(s,t,person,unit,role,now)=>{const m=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1').get(t,person,unit,now);return !!m&&JSON.parse(m.roles).includes(role);};
const versions=(s,t,p)=>s.list(t,'credential-profile').filter(x=>x.programId===p.id);
const review=(s,t,id)=>s.list(t,'credential-profile-review').find(x=>x.profileId===id);
const hold=(s,t,id)=>s.list(t,'credential-profile-hold').find(x=>x.profileId===id);
const get=(s,a,id,roles)=>{const p=s.get(a.tenant,'credential-profile',id);requireThat(p&&role(a,p.unit,roles),'not_found','Belge profili bulunamadı veya erişilemiyor.',404);return p;};
function usable(s,t,p,now){
 const r=review(s,t,p.id),ar=s.list(t,'registry-review').find(x=>x.recordId===p.authorityId),authority=s.get(t,'registry',p.authorityId);
 const dossier=s.get(t,'authority-dossier',p.authorityDossierId);
 return !!dossier&&dossier.authorityId===p.authorityId&&hash(stableStringify(dossier))===p.authorityDossierDigest&&authorityReady(s,t,dossier,now)&&p.expires<=dossier.validUntil&&p.expires>now&&!hold(s,t,p.id)&&r?.outcome==='accepted'&&active(s,t,r.createdBy,p.unit,'commission',now)&&authority&&hash(stableStringify(authority))===p.authorityDigest&&ar?.outcome==='accepted'&&active(s,t,ar.createdBy,p.unit,'admin',now);
}
// Internal read model: callers must enforce their own program read/export scope.
export function programProfileBinding(s,t,program,now){
 const p=versions(s,t,program).at(-1);
 return p&&p.programVersion===program.version&&p.programDigest===hash(stableStringify(program))&&usable(s,t,p,now)&&p.issuerPeople.some(person=>active(s,t,person,p.unit,'studentAffairs',now))?p:null;
}
export function issuanceProfile(s,a,program,now,profileId=null){
 requireThat((s instanceof LocalAcceptanceStore||isLocalSqlAcademicStore(s))&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel belge profili üretim ihracını etkinleştiremez.',503);
 const p=profileId?s.get(a.tenant,'credential-profile',profileId):versions(s,a.tenant,program).at(-1);
 requireThat(p&&p.programId===program.id&&p.programVersion===program.version&&p.programDigest===hash(stableStringify(program)),'profile_required','Bu program sürümüne bağlı belge profili gerekli.',409);
 requireThat(usable(s,a.tenant,p,now),'profile_blocked','Güncel yetki incelemesi, geçerli süre ve açık belge profili gerekli.',409);
 requireThat(p.issuerPeople.includes(a.id)&&role(a,p.unit,['studentAffairs']),'issuer_authority','Kişiye bağlı belge düzenleme yetkisi bu profilde bulunmuyor.',403);
 return p;
}
export function profileReplay(a,action,r){if(!['credential-profile','credential-profile-review','credential-profile-hold'].includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Belge profili işlemi yalnız yerel kabulde çalışır.',503);requireThat(role(a,r.unit,action==='credential-profile'?['admin']:['commission']),'forbidden','Güncel profil görevi ve çok faktörlü doğrulama gerekli.',403);return true;}
export function profileCommand({action,p,a,s,put,id,now}){
 if(!['credential-profile','credential-profile-review','credential-profile-hold'].includes(action))return null;
 requireThat((s instanceof LocalAcceptanceStore||isLocalSqlAcademicStore(s))&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Belge profili yalnız izole yerel kabulde hazırlanabilir.',503);
 if(action==='credential-profile'){
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,['admin']),'not_found','Yetkili birimde program sürümü gerekli.',404);
  requireThat(program.mode==='pilot'&&program.pathway==='micro'&&p.mode==='local-acceptance'&&p.sourceVersion===profileSource.version&&p.format===profileFormat&&!p.official,'official_disabled','Yalnız kaynak özetiyle yerel mikro yeterlilik profili hazırlanabilir.');
  const authority=s.get(a.tenant,'registry',p.authorityId),ar=s.list(a.tenant,'registry-review').find(x=>x.recordId===authority?.id);
  requireThat(authority?.type==='institution-authority'&&authority.unit===program.unit&&authority.fields.pathway===program.pathway&&['programOwner','decisionAuthority','legalIssuer','technicalSigner'].every(k=>authority.fields[k]===program.responsibilities[k])&&ar?.outcome==='accepted'&&active(s,a.tenant,ar.createdBy,program.unit,'admin',now),'issuer_registry','Aynı birimde bağımsız incelenmiş kurum yetki sicili gerekli.');
  const dossier=currentAuthorityDossier(s,a.tenant,program.id,authority.id,now);requireThat(dossier,'authority_required','Program sürümüne bağlı, ekleri ve kapsamı ayrı incelenmiş güncel yetki dosyası gerekli.',409);
  const fieldKeys=profileFields.map(x=>x.key);requireThat(Array.isArray(p.acknowledgedFields)&&p.acknowledgedFields.length===fieldKeys.length&&new Set(p.acknowledgedFields).size===fieldKeys.length&&fieldKeys.every(k=>p.acknowledgedFields.includes(k)),'profile_fields','Belge profilindeki bütün kaynak alanları ayrı ayrı incelenmeli.');
  requireThat(Array.isArray(p.issuerPeople)&&p.issuerPeople.length>0&&p.issuerPeople.length<=20&&new Set(p.issuerPeople).size===p.issuerPeople.length&&p.issuerPeople.every(person=>active(s,a.tenant,person,program.unit,'studentAffairs',now)&&person!==a.id&&person!==program.createdBy),'issuer_people','Programı veya profili hazırlayandan ayrı etkin belge görevlileri gerekli.');
  const expiry=new Date(p.expires);requireThat(typeof p.expires==='string'&&Number.isFinite(expiry.getTime())&&expiry.toISOString()===p.expires&&p.expires>now&&p.expires<=dossier.validUntil&&text(p.reason)&&text(p.scopeReference),'profile_fields','Gelecek UTC bitiş zamanı, kapsam dayanağı ve gerekçe gerekli.');
  const rows=versions(s,a.tenant,program),previous=rows.at(-1);requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'profile_changed','Güncel önceki profil ve değişiklik gerekçesi gerekli.',409);
  return put('credential-profile',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programVersion:program.version,programDigest:hash(stableStringify(program)),version:rows.length+1,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,authorityId:authority.id,authorityDigest:hash(stableStringify(authority)),authorityReviewId:ar.id,authorityDossierId:dossier.id,authorityDossierDigest:hash(stableStringify(dossier)),source:profileSource,format:profileFormat,issuer:profileIssuer,issuerPeople:[...p.issuerPeople].sort(),fields:fieldKeys,expires:p.expires,reason:p.reason,scopeReference:p.scopeReference,pilot:true,official:false});
 }
 const profile=get(s,a,p.profileId,['commission']),program=s.get(a.tenant,'program',profile.programId);
 requireThat(![profile.createdBy,program.createdBy,...profile.issuerPeople].includes(a.id),'separation','Profil incelemesi hazırlayanlardan ve belge görevlilerinden ayrı komisyona aittir.',403);
 requireThat(text(p.reason),'profile_review','Gerekçeli profil incelemesi gerekli.');
 if(action==='credential-profile-hold'){
  requireThat(review(s,a.tenant,profile.id)?.outcome==='accepted'&&!hold(s,a.tenant,profile.id),'profile_changed','Açık ve incelenmiş profil gerekli.',409);
  return put('credential-profile-hold',{id:id(),unit:profile.unit,owner:profile.owner,profileId:profile.id,reason:p.reason,previousCredentialsRevoked:false,official:false});
 }
 requireThat(!review(s,a.tenant,profile.id)&&versions(s,a.tenant,program).at(-1)?.id===profile.id,'profile_changed','Güncel ve henüz incelenmemiş profil gerekli.',409);
 requireThat(['accepted','rejected'].includes(p.outcome),'profile_review','İnceleme sonucu gerekli.');
 requireThat(p.outcome==='rejected'||authorityReady(s,a.tenant,s.get(a.tenant,'authority-dossier',profile.authorityDossierId),now)&&profile.expires>now&&active(s,a.tenant,profile.createdBy,profile.unit,'admin',now)&&profile.issuerPeople.every(person=>active(s,a.tenant,person,profile.unit,'studentAffairs',now)),'profile_authority','Hazırlayan, belge görevlileri ve süre güncel olmalı.',409);
 return put('credential-profile-review',{id:id(),unit:profile.unit,owner:profile.owner,profileId:profile.id,outcome:p.outcome,reason:p.reason,official:false});
}
export function profileView(s,a,now){
 const profiles=s.list(a.tenant,'credential-profile').filter(p=>role(a,p.unit,['admin','commission','studentAffairs'])).map(p=>{const r=review(s,a.tenant,p.id),h=hold(s,a.tenant,p.id),program=s.get(a.tenant,'program',p.programId),current=versions(s,a.tenant,program).at(-1)?.id===p.id,independent=role(a,p.unit,['commission'])&&![p.createdBy,program.createdBy,...p.issuerPeople].includes(a.id);return {...p,review:r||null,hold:h||null,current,usable:!!usable(s,a.tenant,p,now),canReview:independent&&!r&&current,canHold:independent&&r?.outcome==='accepted'&&!h};});
 const issuerPeople=s.db.prepare('SELECT person,unit,roles FROM memberships WHERE tenant=? AND active=1 AND expires>? AND person IN (SELECT id FROM persons WHERE active=1)').all(a.tenant,now).filter(m=>role(a,m.unit,['admin'])&&JSON.parse(m.roles).includes('studentAffairs')).map(m=>({person:m.person,unit:m.unit}));
 const programs=s.list(a.tenant,'program').filter(p=>role(a,p.unit,['admin','commission','studentAffairs'])).map(p=>({id:p.id,title:p.title,unit:p.unit,version:p.version,pathway:p.pathway}));
 return {profiles,issuerPeople,programs,source:profileSource,format:profileFormat};
}
