import {authorityResponsibilities} from '../../myys/authority-model.mjs';
export const authorityReason='Sentetik kurum dosyası denemesi; gerçek Senato veya SEM onayı değildir.';
export function authorityInput(program,authority,attachments){return {programId:program.id,authorityId:authority.id,attachmentIds:attachments.map(r=>r.id),responsibilities:Object.fromEntries(Object.keys(authorityResponsibilities).map(k=>[k,{scope:authorityReason,attachmentIds:attachments.map(r=>r.id)}])),validFrom:'2020-01-01T00:00:00.000Z',validUntil:'2091-01-01T00:00:00.000Z',reason:authorityReason};}
export function localAuthorityDossier(f,p,authority,{reviewed=true}={}){
 const attachments=['senate-decision','sem-dossier'].map(kind=>f.run('admin','authority-attachment',{authorityId:authority.id,kind,title:'Sentetik '+kind,reference:'LOCAL-'+kind,version:'local-1',documentDate:'2020-01-01',readScope:authorityReason,fileName:kind+'.txt',base64:Buffer.from(authorityReason+' '+kind).toString('base64')}));
 const dossier=f.run('admin','authority-dossier',authorityInput(p,authority,attachments));
 if(reviewed)f.run('authority','authority-review',{dossierId:dossier.id,outcome:'accepted',reason:authorityReason});
 return {dossier,attachments};
}
