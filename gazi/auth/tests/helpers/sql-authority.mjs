import {sqlProgram,sqlAcademicReason as reason} from './sql-academic.mjs';
import {authorityResponsibilities} from '../../myys/authority-model.mjs';
import {profileFields,profileSource,profileFormat} from '../../myys/credential-profile-model.mjs';
export const sqlAuthorityUpload=(authority,kind='senate-decision')=>({authorityId:authority.id,kind,title:'Sentetik '+kind,reference:'LOCAL-TEST-'+kind,version:'test-1',documentDate:'2026-01-01',readScope:reason,fileName:'Yetki-İncelemesi.txt',base64:Buffer.from(reason+' '+kind).toString('base64')});
export const sqlAuthorityInput=(f,p,authority,attachments)=>({programId:p.id,authorityId:authority.id,attachmentIds:attachments.map(a=>a.id),responsibilities:Object.fromEntries(Object.keys(authorityResponsibilities).map(k=>[k,{scope:reason,attachmentIds:attachments.map(a=>a.id)}])),validFrom:new Date(f.clock().getTime()-60000).toISOString(),validUntil:new Date(f.clock().getTime()+1800000).toISOString(),reason});
export const sqlProfileInput=(f,x)=>({programId:x.p.id,authorityId:x.authority.id,mode:'local-acceptance',sourceVersion:profileSource.version,format:profileFormat,acknowledgedFields:profileFields.map(f=>f.key),issuerPeople:['issuer'],expires:new Date(f.clock().getTime()+1200000).toISOString(),reason,scopeReference:reason});
export async function sqlAuthority(f,{program=null,reviewed=true}={}){
 const p=program||await f.run('author','program',sqlProgram()),authority=await f.run('admin','registry-draft',{unit:p.unit,type:'institution-authority',title:'Sentetik program yetki sicili',fields:{...p.responsibilities,pathway:p.pathway,authorityReference:reason}});
 await f.run('registrar','registry-review',{recordId:authority.id,outcome:'accepted',reason});
 const attachments=[];for(const kind of ['senate-decision','sem-dossier'])attachments.push(await f.run('admin','authority-attachment',sqlAuthorityUpload(authority,kind)));
 const dossier=await f.run('admin','authority-dossier',sqlAuthorityInput(f,p,authority,attachments));
 if(reviewed)await f.run('registrar','authority-review',{dossierId:dossier.id,outcome:'accepted',reason});
 return {p,authority,attachments,dossier};
}
export async function sqlCredentialProfile(f,x,{reviewed=true}={}){
 const profile=await f.run('admin','credential-profile',sqlProfileInput(f,x));
 if(reviewed)await f.run('publisher','credential-profile-review',{profileId:profile.id,outcome:'accepted',reason});
 return profile;
}
