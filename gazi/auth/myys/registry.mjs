import {requireThat} from './store.mjs';

const string=v=>typeof v==='string'&&v.trim().length>=3&&v.length<=2000;
const schemas={
 'data-flow':['purpose','controller','processor','country','recipient','dataCategories','retention','deletion','legalBasis'],
 'content-rights':['provider','userGroup','copying','republishing','brand','api','exit','postSubscription','sourceReference'],
 'recognition-policy':['authorityReference','creditPath','remoteDenominator','priorLearning','doubleCounting','appeal'],
 'lms-contract':['provider','version','identityMeaning','enrollmentMeaning','gradeMeaning','completionMeaning','permissions','quota','errors'],
 'institution-authority':['programOwner','decisionAuthority','legalIssuer','technicalSigner','pathway','authorityReference']
};
export const registryFields=Object.freeze(schemas);

// A recorded review is a local workflow result, never proof of legal authority.
export function registryCommand({action,p,a,s,put,id,guard,get}){
 if(action==='registry-draft'){
  guard(a,'policy',p.unit);
  const fields=schemas[p.type];
  requireThat(fields&&p.fields&&typeof p.fields==='object'&&!Array.isArray(p.fields),'registry','Sicil türü ve alanları gerekli.');
  requireThat(fields.every(k=>string(p.fields[k])),'registry','Sicilin tüm zorunlu alanlarını doldurun.');
  requireThat(string(p.title),'registry','Sicil başlığı gerekli.');
  return put('registry',{id:id(),unit:p.unit,owner:a.id,type:p.type,title:p.title,fields:Object.fromEntries(fields.map(k=>[k,p.fields[k]])),state:'draft',official:false});
 }
 if(action==='registry-review'){
  const r=get('registry',p.recordId);guard(a,'policy',r.unit);
  requireThat(a.id!==r.createdBy,'separation','Sicili hazırlayan kendi kaydını onaylayamaz.',403);
  requireThat(['accepted','rejected'].includes(p.outcome)&&string(p.reason),'registry','İnceleme sonucu ve gerekçesi gerekli.');
  requireThat(!s.list(a.tenant,'registry-review').some(x=>x.recordId===r.id),'duplicate','Bu sürüm zaten incelendi.',409);
  return put('registry-review',{id:id(),unit:r.unit,owner:r.owner,recordId:r.id,outcome:p.outcome,reason:p.reason,official:false});
 }
 return null;
}
