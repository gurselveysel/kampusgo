import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {authorityResponsibilities,authorityDocumentKinds,authorityFileLimit} from './authority-model.mjs';
const actions=['authority-attachment','authority-dossier','authority-review','authority-hold','authority-download'];
const digest=r=>hash(stableStringify(r));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const short=v=>typeof v==='string'&&v.trim().length>=3&&v.length<=200;
const role=(a,u)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes('admin'));
const active=(s,t,p,u,now)=>{const r=s.db.prepare('SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1').get(t,p,u,now);return !!r&&JSON.parse(r.roles).includes('admin');};
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yetki dosyası yalnız izole yerel kabulde kullanılabilir.',503);
const shape=(p,keys)=>requireThat(Object.keys(p).every(k=>keys.includes(k)),'authority_fields','Yetki dosyasında tanınmayan alan var.');
const utc=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const get=(s,a,k,id)=>{const r=s.get(a.tenant,k,id);requireThat(r&&role(a,r.unit),'not_found','Yetki dosyası bulunamadı veya erişilemiyor.',404);return r;};
const latest=(s,t,programId)=>s.list(t,'authority-dossier').filter(d=>d.programId===programId).at(-1);
const review=(s,t,id)=>s.list(t,'authority-review').find(r=>r.dossierId===id);
const held=(s,t,id)=>s.list(t,'authority-hold').some(r=>r.dossierId===id);
function file(s,t,attachment){
 const r=s.get(t,'authority-file',attachment.id);if(!r||r.unit!==attachment.unit||typeof r.base64!=='string')return null;
 const bytes=Buffer.from(r.base64,'base64');return bytes.length===attachment.bytes&&hash(bytes)===attachment.sha256&&bytes.toString('base64')===r.base64?r:null;
}
function dependencies(s,t,d,now){
 const p=s.get(t,'program',d.programId),a=s.get(t,'registry',d.authorityId),r=s.get(t,'registry-review',d.authorityReviewId);
 return !!p&&!!a&&!!r&&digest(p)===d.programDigest&&digest(a)===d.authorityDigest&&digest(r)===d.authorityReviewDigest&&r.outcome==='accepted'&&active(s,t,r.createdBy,d.unit,now)&&active(s,t,d.createdBy,d.unit,now)&&d.attachments.every(x=>{const a=s.get(t,'authority-attachment',x.id);return !!a&&a.unit===d.unit&&digest(a)===x.digest&&!!file(s,t,a);});
}
export function authorityReady(s,t,d,now){const r=d&&review(s,t,d.id);return !!d&&d.validFrom<=now&&d.validUntil>now&&latest(s,t,d.programId)?.id===d.id&&!held(s,t,d.id)&&r?.outcome==='accepted'&&r.dossierDigest===digest(d)&&active(s,t,r.createdBy,d.unit,now)&&dependencies(s,t,d,now);}
export function currentAuthorityDossier(s,t,programId,authorityId,now){const d=latest(s,t,programId);return d?.authorityId===authorityId&&authorityReady(s,t,d,now)?d:null;}
export function authorityReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yetki dosyası canlı ortamda kapalıdır.',503);requireThat(role(a,r.unit),'forbidden','Güncel birim yöneticiliği ve çok faktörlü doğrulama gerekli.',403);return true;}
export function authorityFileResult(s,a,receipt){local(s);const attachment=get(s,a,'authority-attachment',receipt.attachmentId),stored=file(s,a.tenant,attachment);requireThat(stored,'authority_file_changed','Ek dosyanın bütünlüğü doğrulanamadı.',409);return {...receipt,file:{name:attachment.fileName,base64:stored.base64,bytes:attachment.bytes,sha256:attachment.sha256}};}
export function authorityCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='authority-attachment'){
  shape(p,['authorityId','kind','title','reference','version','documentDate','readScope','fileName','base64']);const authority=get(s,a,'registry',p.authorityId);
  requireThat(authority.type==='institution-authority','authority_registry','Kurum yetki sicili gerekli.');
  requireThat(Object.hasOwn(authorityDocumentKinds,p.kind)&&short(p.title)&&short(p.reference)&&short(p.version)&&text(p.readScope),'authority_fields','Belge türü, başlık, referans, sürüm ve okunan kapsam gerekli.');
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(p.documentDate)&&utc(p.documentDate+'T00:00:00.000Z')&&p.documentDate<=now.slice(0,10),'authority_date','Geçerli ve ileri tarihli olmayan belge tarihi gerekli.');
  requireThat(typeof p.fileName==='string'&&/^[\p{L}\p{N} _.-]{1,120}\.(pdf|txt)$/iu.test(p.fileName)&&!p.fileName.startsWith('.'),'authority_file','PDF veya düz metin eki için güvenli dosya adı gerekli.');
  requireThat(typeof p.base64==='string'&&p.base64.length<=4*Math.ceil(authorityFileLimit/3)&&/^[A-Za-z0-9+/]+={0,2}$/.test(p.base64),'authority_file','Ek dosya boş olamaz ve 32 KiB sınırını aşamaz.');
  const bytes=Buffer.from(p.base64,'base64');requireThat(bytes.length>0&&bytes.length<=authorityFileLimit&&bytes.toString('base64')===p.base64,'authority_file','Ek dosya kodlaması veya boyutu geçersiz.');
  // Bytes are never parsed, executed or rendered inline. A filename is not MIME/authenticity proof.
  const attachment=put('authority-attachment',{id:id(),unit:authority.unit,owner:a.id,authorityId:authority.id,kind:p.kind,title:p.title,reference:p.reference,version:p.version,documentDate:p.documentDate,readScope:p.readScope,fileName:p.fileName,bytes:bytes.length,sha256:hash(bytes),official:false,authenticityVerified:false});
  put('authority-file',{id:attachment.id,unit:attachment.unit,owner:a.id,base64:p.base64});return attachment;
 }
 if(action==='authority-download'){
  shape(p,['attachmentId']);const attachment=get(s,a,'authority-attachment',p.attachmentId);
  const receipt=put('authority-download',{id:id(),unit:attachment.unit,owner:a.id,attachmentId:attachment.id,sha256:attachment.sha256,official:false});return authorityFileResult(s,a,receipt);
 }
 if(action==='authority-dossier'){
  shape(p,['programId','authorityId','attachmentIds','responsibilities','validFrom','validUntil','reason','previousId','changeReason']);
  const program=get(s,a,'program',p.programId),authority=get(s,a,'registry',p.authorityId),ar=s.list(a.tenant,'registry-review').find(r=>r.recordId===authority.id),keys=Object.keys(authorityResponsibilities);
  requireThat(authority.unit===program.unit&&authority.type==='institution-authority'&&authority.fields.pathway===program.pathway&&keys.every(k=>authority.fields[k]===program.responsibilities[k])&&new Set(keys.map(k=>authority.fields[k].trim().toLocaleLowerCase('tr'))).size===keys.length&&ar?.outcome==='accepted'&&active(s,a.tenant,ar.createdBy,program.unit,now),'authority_registry','Aynı program yolu ve dört ayrı sorumlulukla eşleşen, incelenmiş sicil gerekli.',409);
  requireThat(Array.isArray(p.attachmentIds)&&p.attachmentIds.length>=2&&p.attachmentIds.length<=12&&new Set(p.attachmentIds).size===p.attachmentIds.length,'authority_files','En az iki, en çok on iki tekil belge eki gerekli.');
  const attachments=p.attachmentIds.map(id=>get(s,a,'authority-attachment',id));
  requireThat(attachments.every(r=>r.unit===program.unit&&r.authorityId===authority.id&&file(s,a.tenant,r))&&['senate-decision','sem-dossier'].every(k=>attachments.some(r=>r.kind===k)),'authority_files','Bu sicile bağlı Senato dayanağı ve SEM kapsam dosyası ekleri gerekli.',409);
  requireThat(p.responsibilities&&Object.keys(p.responsibilities).length===keys.length&&keys.every(k=>{const v=p.responsibilities[k];return v&&Object.keys(v).every(x=>['scope','attachmentIds'].includes(x))&&text(v.scope)&&Array.isArray(v.attachmentIds)&&v.attachmentIds.length>0&&new Set(v.attachmentIds).size===v.attachmentIds.length&&v.attachmentIds.every(id=>p.attachmentIds.includes(id));}),'authority_scope','Dört sorumluluğun her biri açıklanmalı ve seçilen belge eklerine bağlanmalı.');
  requireThat(utc(p.validFrom)&&utc(p.validUntil)&&p.validFrom<p.validUntil&&p.validUntil>now&&text(p.reason),'authority_validity','Geçerli başlangıç, ileri bitiş ve gerekçe gerekli.');
  const previous=latest(s,a.tenant,program.id);requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'authority_changed','Güncel önceki dosya ve değişiklik gerekçesi gerekli.',409);
  return put('authority-dossier',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programVersion:program.version,programDigest:digest(program),authorityId:authority.id,authorityDigest:digest(authority),authorityReviewId:ar.id,authorityReviewDigest:digest(ar),version:(previous?.version||0)+1,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,attachments:attachments.map(r=>({id:r.id,digest:digest(r)})),responsibilities:Object.fromEntries(keys.map(k=>[k,{holder:authority.fields[k],scope:p.responsibilities[k].scope,attachmentIds:[...p.responsibilities[k].attachmentIds]}])),validFrom:p.validFrom,validUntil:p.validUntil,reason:p.reason,official:false,legalAuthorityVerified:false,externalSubmitted:false});
 }
 const dossier=get(s,a,'authority-dossier',p.dossierId);
 requireThat(text(p.reason),'authority_reason','Gerekçeli inceleme gerekli.');
 if(action==='authority-hold'){
  shape(p,['dossierId','reason']);requireThat(review(s,a.tenant,dossier.id)?.outcome==='accepted'&&!held(s,a.tenant,dossier.id),'authority_changed','İncelenmiş ve durdurulmamış dosya gerekli.',409);
  return put('authority-hold',{id:id(),unit:dossier.unit,owner:dossier.owner,dossierId:dossier.id,reason:p.reason,previousCredentialsRevoked:false,official:false});
 }
 shape(p,['dossierId','outcome','reason']);
 const program=s.get(a.tenant,'program',dossier.programId),authors=[dossier.createdBy,program?.createdBy,...dossier.attachments.map(r=>s.get(a.tenant,'authority-attachment',r.id)?.createdBy)];
 requireThat(!authors.includes(a.id),'separation','Dosyayı, programı veya eklerini hazırlayan kişi inceleyemez.',403);
 requireThat(latest(s,a.tenant,dossier.programId)?.id===dossier.id&&!review(s,a.tenant,dossier.id)&&['accepted','rejected'].includes(p.outcome),'authority_changed','Güncel ve incelenmemiş dosya gerekli.',409);
 requireThat(p.outcome==='rejected'||dossier.validFrom<=now&&dossier.validUntil>now&&dependencies(s,a.tenant,dossier,now),'authority_dependencies','Süre, kaynak belgeler ve sicil görevleri güncel olmalı.',409);
 return put('authority-review',{id:id(),unit:dossier.unit,owner:dossier.owner,dossierId:dossier.id,dossierDigest:digest(dossier),outcome:p.outcome,reason:p.reason,official:false,legalAuthorityVerified:false});
}
export function authorityView(s,a,now){
 const dossiers=s.list(a.tenant,'authority-dossier').filter(d=>role(a,d.unit)).map(d=>{const r=review(s,a.tenant,d.id),h=held(s,a.tenant,d.id),current=latest(s,a.tenant,d.programId)?.id===d.id,program=s.get(a.tenant,'program',d.programId);return {...d,review:r||null,held:h,current,usable:authorityReady(s,a.tenant,d,now),canReview:current&&!r&&![d.createdBy,program?.createdBy,...d.attachments.map(x=>s.get(a.tenant,'authority-attachment',x.id)?.createdBy)].includes(a.id),canHold:r?.outcome==='accepted'&&!h};});
 return {dossiers,attachments:s.list(a.tenant,'authority-attachment').filter(r=>role(a,r.unit)),programs:s.list(a.tenant,'program').filter(p=>role(a,p.unit)).map(p=>({id:p.id,title:p.title,unit:p.unit,version:p.version,pathway:p.pathway,responsibilities:p.responsibilities})),fileLimit:authorityFileLimit,official:false};
}
