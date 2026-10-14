import {localAuthorityDossier} from './local-authority.mjs';
import {profileFields,profileFormat,profileSource} from '../../myys/credential-profile-model.mjs';
// Synthetic workflow records only. These fixtures cannot grant university authority.
export function localCredentialProfile(f,p,{reviewed=true}={}){
 const reason='Sentetik yerel belge profili; gerçek kurum onayı veya belge yetkisi değildir.';
 const authority=f.run('admin','registry-draft',{unit:p.unit,type:'institution-authority',title:'Sentetik düzenleme yetkisi',fields:{...p.responsibilities,pathway:p.pathway,authorityReference:reason}});
 f.run('authority','registry-review',{recordId:authority.id,outcome:'accepted',reason});
 localAuthorityDossier(f,p,authority);
 const profile=f.run('admin','credential-profile',{programId:p.id,authorityId:authority.id,mode:'local-acceptance',sourceVersion:profileSource.version,format:profileFormat,acknowledgedFields:profileFields.map(f=>f.key),issuerPeople:['issuer'],expires:'2090-01-01T00:00:00.000Z',reason,scopeReference:reason});
 if(reviewed)f.run('publisher','credential-profile-review',{profileId:profile.id,outcome:'accepted',reason});
 return {profile,authority};
}
