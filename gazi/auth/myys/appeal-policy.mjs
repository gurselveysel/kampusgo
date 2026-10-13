import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {appealTiming,validDay} from './appeal-policy-model.mjs';
const actions=['appeal-policy','appeal-policy-review','appeal-policy-hold','decision-receive'];
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','İtiraz politikası yalnız izole yerel kabulde çalışır.',503);
const review=(s,t,id)=>s.list(t,'appeal-policy-review').find(x=>x.policyId===id);
const held=(s,t,id)=>s.list(t,'appeal-policy-hold').some(x=>x.policyId===id);
export function appealPolicyReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim itiraz politikası kapalı.',503);requireThat(action==='decision-receive'?r.owner===a.id&&role(a,r.unit,'learner'):role(a,r.unit,action==='appeal-policy'?'admin':'commission'),'forbidden','Güncel politika veya kişisel teslim yetkisi gerekli.',403);return true;}
export function appealPolicyCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='decision-receive'){
  const d=s.get(a.tenant,'decision',p.decisionId);requireThat(d&&d.owner===a.id&&role(a,d.unit,'learner'),'not_found','Kendi akademik kararınıza ve çok faktörlü oturuma erişim gerekli.',404);
  requireThat(p.confirm===true,'receipt','Kararı yerel ortamda gördüğünüzü açıkça belirtin.');
  const old=s.list(a.tenant,'decision-receipt').find(x=>x.decisionId===d.id);if(old)return old;
  return put('decision-receipt',{id:id(),unit:d.unit,owner:d.owner,decisionId:d.id,policyId:d.appealPolicy?.policy?.id||null,scope:'local-acceptance',official:false,officialNotificationAt:null});
 }
 if(action==='appeal-policy'){
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,'admin'),'not_found','Yetkili birimde program sürümü gerekli.',404);
  requireThat(p.scope==='local-acceptance'&&p.official===false&&p.effect==='suspend'&&p.lateAction==='independent-review'&&p.timeZone==='UTC+03:00'&&p.startRule==='next-local-day','policy_scope','Açık yerel kapsam, askı etkisi, ayrı süre incelemesi ve teknik zaman kuralı gerekli.');
  requireThat(['manual','calendar','business'].includes(p.mode)&&(p.mode==='manual'?p.days===null:Number.isInteger(p.days)&&p.days>=1&&p.days<=365),'policy_time','Manuel inceleme veya 1–365 günlük sentetik süre seçin.');
  const from=new Date(p.effectiveFrom),until=new Date(p.expires);requireThat(Number.isFinite(from.getTime())&&from.toISOString()===p.effectiveFrom&&Number.isFinite(until.getTime())&&until.toISOString()===p.expires&&p.expires>p.effectiveFrom&&p.expires>now,'policy_dates','Politika başlangıcı ve gelecek bitişi tam UTC biçiminde gerekli.');
  requireThat(text(p.reason)&&text(p.authorityReference)&&text(p.source?.title)&&text(p.source?.reference)&&typeof p.source?.version==='string'&&p.source.version.length>=3&&p.source.version.length<=100&&validDay(p.source.date)&&p.source.date<=now.slice(0,10)&&text(p.source.readScope)&&p.source.officialApproval===false,'policy_source','Kaynağın başlığı, referansı, sürümü, tarihi, okunan kapsamı ve yerel yetki dayanağı gerekli.');
  let calendar=null;if(p.mode==='business'){
   const c=p.calendar;requireThat(c&&validDay(c.from)&&validDay(c.to)&&c.to>=c.from&&c.weekend==='sat-sun'&&Array.isArray(c.excludedDays)&&c.excludedDays.length<=366&&new Set(c.excludedDays).size===c.excludedDays.length&&c.excludedDays.every(d=>validDay(d)&&d>=c.from&&d<=c.to)&&text(c.reference),'policy_calendar','Kapsamı, hafta sonu, hariç günleri ve dayanağı açık yerel takvim gerekli.');calendar={from:c.from,to:c.to,weekend:'sat-sun',excludedDays:[...c.excludedDays].sort(),reference:c.reference};
  }
  const versions=s.list(a.tenant,'appeal-policy').filter(x=>x.programId===program.id),previous=versions.at(-1);requireThat((previous?.id||null)===(p.previousId||null)&&(!previous||text(p.changeReason)),'policy_changed','Güncel önceki politika ve sürüm gerekçesi gerekli.',409);
  return put('appeal-policy',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programVersion:program.version,programDigest:hash(stableStringify(program)),version:versions.length+1,previousId:previous?.id||null,changeReason:previous?p.changeReason:null,mode:p.mode,days:p.days,calendar,timeZone:p.timeZone,startRule:p.startRule,effect:'suspend',lateAction:'independent-review',effectiveFrom:p.effectiveFrom,expires:p.expires,source:{title:p.source.title,reference:p.source.reference,version:p.source.version,date:p.source.date,readScope:p.source.readScope,officialApproval:false},reason:p.reason,authorityReference:p.authorityReference,scope:'local-acceptance',official:false});
 }
 const policy=s.get(a.tenant,'appeal-policy',p.policyId),program=policy&&s.get(a.tenant,'program',policy.programId);requireThat(policy&&role(a,policy.unit,'commission'),'not_found','Yetkili birimde itiraz politikası gerekli.',404);
 requireThat(![policy.createdBy,program.createdBy].includes(a.id),'separation','Politikayı hazırlayanlardan ayrı komisyon incelemeli.',403);requireThat(text(p.reason),'policy_review','Politika inceleme gerekçesi gerekli.');
 if(action==='appeal-policy-hold'){requireThat(review(s,a.tenant,policy.id)?.outcome==='accepted'&&!held(s,a.tenant,policy.id),'policy_changed','İncelenmiş ve durdurulmamış politika gerekli.',409);return put('appeal-policy-hold',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,reason:p.reason,existingDecisionsChanged:false,official:false});}
 requireThat(!review(s,a.tenant,policy.id)&&s.list(a.tenant,'appeal-policy').filter(x=>x.programId===policy.programId).at(-1)?.id===policy.id&&['accepted','rejected'].includes(p.outcome),'policy_changed','Güncel ve henüz incelenmemiş politika gerekli.',409);
 requireThat(p.outcome==='rejected'||policy.expires>now,'policy_expired','Süresi geçmiş politika kabul edilemez.',409);
 return put('appeal-policy-review',{id:id(),unit:policy.unit,owner:policy.owner,policyId:policy.id,outcome:p.outcome,reason:p.reason,official:false});
}
export function bindAppealPolicy(s,t,program,now){
 const chosen=s.list(t,'appeal-policy').filter(p=>p.programId===program.id&&p.effectiveFrom<=now&&review(s,t,p.id)?.outcome==='accepted').at(-1);
 if(!chosen||held(s,t,chosen.id)||chosen.expires<=now)return {policy:null,mode:'manual-review',scope:'local-acceptance',official:false,reason:'Uygulanabilir incelenmiş politika yok; süre bağımsız incelenir.'};
 requireThat(chosen.programDigest===hash(stableStringify(program)),'policy_changed','Program ve politika sürümü eşleşmiyor.',409);
 return {policy:chosen,digest:hash(stableStringify(chosen)),reviewId:review(s,t,chosen.id).id,review:review(s,t,chosen.id),scope:'local-acceptance',official:false};
}
export function decisionTiming(s,t,d,now){const receipt=s.list(t,'decision-receipt').find(x=>x.decisionId===d.id),policy=d.appealPolicy?.policy;return {...appealTiming(policy,receipt,now),policyId:policy?.id||null,policyVersion:policy?.version||null,effect:'suspend',automaticRejection:false};}
export function appealPolicyView(s,a){
 const programs=s.list(a.tenant,'program').filter(p=>role(a,p.unit,'admin')||role(a,p.unit,'commission')).map(p=>({id:p.id,title:p.title,unit:p.unit,version:p.version}));
 const policies=s.list(a.tenant,'appeal-policy').filter(p=>['admin','commission','quality'].some(r=>role(a,p.unit,r))).map(p=>{const r=review(s,a.tenant,p.id),hold=held(s,a.tenant,p.id),program=s.get(a.tenant,'program',p.programId),independent=role(a,p.unit,'commission')&&![p.createdBy,program.createdBy].includes(a.id),current=s.list(a.tenant,'appeal-policy').filter(x=>x.programId===p.programId).at(-1)?.id===p.id;return {...p,review:r||null,held:hold,hold:s.list(a.tenant,'appeal-policy-hold').find(x=>x.policyId===p.id)||null,current,canReview:independent&&!r&&current,canHold:independent&&r?.outcome==='accepted'&&!hold};});
 return {programs,policies};
}
