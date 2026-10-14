import {isLocalSqlAcademicStore} from './academic-sql-store.mjs';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {programBaseline,stableStringify} from './program-model.mjs';
import {programProfileBinding} from './credential-profile.mjs';
const staff=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>['coordinator','instructor','commission','quality'].includes(r)));
const full=v=>typeof v==='string'&&v.trim().length>=3;
function currentPublication(s,t,p,now){
 const publication=s.list(t,'publication').find(r=>r.programId===p.id&&r.unit===p.unit);if(!publication||publication.createdBy===p.createdBy)return null;
 const member=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1').get(t,publication.createdBy,p.unit,now);
 return member&&JSON.parse(member.roles).includes('commission')?publication:null;
}
export function programPackageSummary(s,a,p,now){
 const profile=programProfileBinding(s,a.tenant,p,now),publication=currentPublication(s,a.tenant,p,now);
 const checks=[
  {key:'outcomes',label:'Öğrenme Çıktıları',ready:!!p.outcomes?.length},
  {key:'workload',label:'İş yükü',ready:Number.isFinite(p.hours)&&p.hours>0&&Number.isFinite(p.ects)&&p.ects>0&&p.hours===p.ects*25},
  {key:'rubric',label:'Görev ve rubrik',ready:!!p.tasks?.length&&!!p.rubric?.length},
  {key:'instructor',label:'Eğitici bilgisi',ready:full(p.instructor)},
  {key:'license',label:'İçerik lisansı beyanı',ready:full(p.license)},
  {key:'publication',label:'Ayrı program incelemesi',ready:!!publication},
  {key:'profile',label:'Güncel belge profili ve yetki dosyası',ready:!!profile}
 ];
 const ready=p.pathway==='micro'&&checks.every(c=>c.ready);
 return {state:p.pathway==='sem-central'?'central-path':ready?'local-ready':'needs-review',asOf:now,checks,canDownload:ready&&staff(a,p.unit),institutionApproved:false,licenseRightsVerified:false,official:false};
}
export function programPackageForPrincipal(s,a,programId,now){
 requireThat((s instanceof LocalAcceptanceStore||isLocalSqlAcademicStore(s))&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Program bilgi paketi yalnız izole yerel kabulde hazırlanabilir.',503);
 const p=s.get(a.tenant,'program',programId);
  requireThat(p&&staff(a,p.unit),'not_found','Program bilgi paketi bulunamadı veya erişilemiyor.',404);
  const state=programPackageSummary(s,a,p,now);requireThat(state.canDownload,'program_package_blocked','Güncel program incelemesi, belge profili ve yetki dosyası gerekli. Merkezi SEM yolu bu paketten düzenlenemez.',409);
  const publication=currentPublication(s,a.tenant,p,now),profile=programProfileBinding(s,a.tenant,p,now);
  const payload={format:'myys-program-information/1',tenant:a.tenant,program:programBaseline(p),programDigest:hash(stableStringify(programBaseline(p))),publication:{id:publication.id,reason:publication.reason,createdAt:publication.createdAt,sha256:hash(stableStringify(publication))},credentialProfile:{id:profile.id,version:profile.version,programVersion:profile.programVersion,fields:profile.fields,source:profile.source,format:profile.format,issuer:profile.issuer,expires:profile.expires,sha256:hash(stableStringify(profile)),authorityDossierId:profile.authorityDossierId,authorityDossierDigest:profile.authorityDossierDigest}};
  // Administrative actors, issuer assignments and attachment bytes are not exported.
  // Source digests are references to private records, not self-contained signatures.
  return {payload,sha256:hash(stableStringify(payload)),checkedAt:now,scope:'local-acceptance',signed:false,official:false,institutionApproved:false,licenseRightsVerified:false,externalSubmitted:false};
}
export function exportProgramPackage(core,context,programId){
 requireThat(core.store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Program bilgi paketi yalnız izole yerel kabulde hazırlanabilir.',503);
 return core.store.transaction(()=>{const now=core.clock(),a=core.store.principal(context.sessionHash,context.tenant,now);return programPackageForPrincipal(core.store,a,programId,now);});
}
