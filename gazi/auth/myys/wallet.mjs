import {credentialBlocked} from './key-registry.mjs';
import {requireThat} from './store.mjs';

const owns=(a,r)=>r.owner===a.id&&a.memberships.some(m=>m.unit===r.unit&&m.roles.includes('learner'));
export function walletView(core,a){
 const s=core.store,now=core.clock();
 return s.list(a.tenant,'issuance').filter(r=>owns(a,r)).map(r=>{
  const signed=s.get(a.tenant,'signed',r.id),d=s.get(a.tenant,'decision',r.decisionId),p=s.get(a.tenant,'program',r.programId);
  const blocked=credentialBlocked(core,a.tenant,r);
  return {id:r.id,title:p.title,programVersion:d.programVersion,createdAt:r.createdAt,visibility:'private',pilot:true,state:blocked?'blocked':signed?'signed':'awaiting-signature',
   canDownload:!!signed&&!blocked,canShare:!!signed&&!blocked,
   shares:s.list(a.tenant,'share').filter(x=>x.issuanceId===r.id).map(x=>({id:x.id,purpose:x.purpose,expires:x.expires,state:s.list(a.tenant,'share-revocation').some(v=>v.shareId===x.id)?'revoked':x.expires<=now?'expired':blocked?'blocked':'active'}))};
 });
}
export function downloadWalletCredential(core,context,issuanceId){
 return core.store.transaction(()=>{
  const a=core.store.principal(context.sessionHash,context.tenant,core.clock()),s=core.store,r=s.get(a.tenant,'issuance',issuanceId);
  requireThat(r&&owns(a,r),'not_found','Kişisel belge bulunamadı veya erişilemiyor.',404);
  const signed=s.get(a.tenant,'signed',r.id);requireThat(signed,'not_signed','Belge henüz imzalanmadı.',409);
  const d=s.get(a.tenant,'decision',r.decisionId);
  requireThat(!credentialBlocked(core,a.tenant,r),'decision_blocked','Belgenin güncel durumu indirmeye uygun değil.',409);
  return {id:r.id,jwt:signed.jwt,credential:signed.credential,scope:'local-acceptance',official:false};
 });
}
