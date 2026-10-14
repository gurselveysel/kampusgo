import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {walletOptions,walletExternalChecks} from './wallet-study-model.mjs';
const actions=['wallet-study','wallet-study-review','wallet-study-hold'];
const digest=v=>hash(stableStringify(v));
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const staff=(a,u)=>['admin','quality','it'].some(r=>role(a,u,r));
const ownProgram=(s,a,p)=>role(a,p.unit,'learner')&&s.list(a.tenant,'enrollment').some(e=>e.programId===p.programId&&e.owner===a.id);
const reviews=(s,t,id)=>s.list(t,'wallet-study-review').filter(r=>r.studyId===id);
const held=(s,t,id)=>s.list(t,'wallet-study-hold').some(r=>r.studyId===id);
const latest=(s,t,pid)=>s.list(t,'wallet-study').filter(r=>r.programId===pid).at(-1);
const accepted=(s,t,p)=>{const r=reviews(s,t,p.id);return r.length===2&&r.every(r=>r.outcome==='accepted'&&r.studyDigest===digest(p))&&new Set(r.map(r=>r.createdBy)).size===2;};
const strict=(p,keys)=>requireThat(p&&Object.keys(p).every(k=>keys.includes(k)),'wallet_study_fields','Yalnız ihtiyaç ve seçenek kıyası alanları kabul edilir; bağlantı veya zincire yazma açılmaz.');
function dependency(s,t,u,id,type){const r=s.get(t,'registry',id),v=r&&s.list(t,'registry-review').find(x=>x.recordId===id);requireThat(r?.unit===u&&r.type===type&&v?.outcome==='accepted','wallet_study_dependencies','Aynı birimde incelenmiş veri akışı ve yetki dayanağı gerekli.',409);return {id,type,digest:digest(r),reviewId:v.id,reviewDigest:digest(v)};}
const currentDeps=(s,t,p)=>p.dependencies.every(d=>digest(s.get(t,'registry',d.id))===d.digest&&digest(s.get(t,'registry-review',d.reviewId))===d.reviewDigest)&&digest(s.get(t,'program',p.programId))===p.programDigest;
const flags={official:false,institutionNeedApproved:false,externalWalletAccepted:false,externalTransportEnabled:false,chainWriteEnabled:false,onChainPersonalData:false};
export function walletStudyReplay(a,action,r){
 if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Cüzdan keşfi üretimde kapalı.',503);
 requireThat(r.createdBy===a.id&&(action==='wallet-study'?role(a,r.unit,'admin'):action==='wallet-study-hold'?role(a,r.unit,'quality'):role(a,r.unit,r.discipline==='technical'?'it':'quality')),'forbidden','Güncel kişi, birim ve keşif görevi gerekli.',403);return true;
}
export function walletStudyCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Cüzdan seçenekleri yalnız izole yerel kabulde değerlendirilir.',503);
 if(action==='wallet-study'){
  strict(p,['programId','need','needReference','purpose','authorityReference','dataFlowId','authorityId','alternatives','recommendation','selectedOption','reason','reviewOn','previousId','changeReason','scope','official','onChainPersonalData']);
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,'admin'),'not_found','Kendi biriminizde program ve yönetici görevi gerekli.',404);
  requireThat(s.list(a.tenant,'publication').some(r=>r.programId===program.id),'wallet_study_program','İncelenmiş program sürümü gerekli.',409);
  requireThat(p.scope==='local-acceptance'&&p.official===false&&p.onChainPersonalData===false&&text(p.need)&&text(p.needReference)&&text(p.purpose)&&text(p.authorityReference)&&text(p.reason),'wallet_study_scope','Açık kullanıcı ihtiyacı/dayanağı, amaç, yetki referansı ve gerekçe gerekli; kişisel veri zincire yazılamaz.');
  requireThat(['defer','study-offchain'].includes(p.recommendation)&&(p.recommendation==='defer'?p.selectedOption===null:['private-wallet','open-protocol'].includes(p.selectedOption)),'wallet_study_recommendation','Yalnız gerekçeli erteleme veya zincirsiz ayrı keşif önerisi verilebilir.');
  requireThat(typeof p.reviewOn==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.reviewOn)&&Number.isFinite(Date.parse(p.reviewOn))&&new Date(p.reviewOn).toISOString().slice(0,10)===p.reviewOn&&p.reviewOn>=now.slice(0,10)&&Date.parse(p.reviewOn)-Date.parse(now)<=366*86400000,'wallet_study_date','En çok 366 gün içinde açık gözden geçirme günü gerekli.');
  requireThat(Array.isArray(p.alternatives)&&p.alternatives.length===walletOptions.length&&new Set(p.alternatives.map(x=>x?.id)).size===walletOptions.length&&walletOptions.every(o=>p.alternatives.some(x=>x?.id===o.id&&text(x.benefit)&&text(x.limit)&&text(x.privacy)&&text(x.remaining))),'wallet_study_alternatives','Mevcut özel cüzdan, açık protokol ve zincir için fayda, sınır, mahremiyet ve kalan kabul ayrı yazılmalı.');
  const alternatives=walletOptions.map(o=>{const x=p.alternatives.find(v=>v.id===o.id);strict(x,['id','benefit','limit','privacy','remaining']);return {id:o.id,benefit:x.benefit,limit:x.limit,privacy:x.privacy,remaining:x.remaining};});
  const before=latest(s,a.tenant,program.id);requireThat((before?.id||null)===(p.previousId||null)&&(!before||text(p.changeReason)),'wallet_study_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  const dependencies=[dependency(s,a.tenant,program.unit,p.dataFlowId,'data-flow'),dependency(s,a.tenant,program.unit,p.authorityId,'institution-authority')];
  requireThat(s.get(a.tenant,'registry',p.dataFlowId).fields.purpose===p.purpose&&s.get(a.tenant,'registry',p.dataFlowId).fields.recipient==='not-connected'&&s.get(a.tenant,'registry',p.authorityId).fields.authorityReference===p.authorityReference,'wallet_study_dependencies','Amaç tam veri akışıyla; yetki referansı tam sicille eşleşmeli. Dış alıcı bağlı gösterilemez.',409);
  return put(action,{id:id(),unit:program.unit,owner:a.id,programId:program.id,programVersion:program.version,programDigest:digest(program),version:(before?.version||0)+1,previousId:before?.id||null,changeReason:before?p.changeReason:null,...Object.fromEntries(['need','needReference','purpose','authorityReference','recommendation','selectedOption','reason','reviewOn'].map(k=>[k,p[k]])),alternatives,catalogVersion:'2026.10.14.38',catalog:walletOptions,dependencies,externalChecks:walletExternalChecks.map(c=>({...c,state:'not-run',realWallet:false})),scope:'local-acceptance',...flags});
 }
 const study=s.get(a.tenant,'wallet-study',p.studyId);requireThat(study&&staff(a,study.unit),'not_found','Bu cüzdan keşfine erişilemiyor.',404);
 requireThat(text(p.reason),'wallet_study_reason','Gerekçeli ayrı inceleme gerekli.');
 if(action==='wallet-study-hold'){
  strict(p,['studyId','reason']);requireThat(role(a,study.unit,'quality')&&a.id!==study.createdBy,'separation','Hazırlayandan ayrı kalite görevi gerekli.',403);
  requireThat(accepted(s,a.tenant,study)&&!held(s,a.tenant,study.id),'wallet_study_changed','Durdurulmamış yerel keşif incelemesi gerekli.',409);
  return put(action,{id:id(),unit:study.unit,owner:study.owner,studyId:study.id,reason:p.reason,...flags});
 }
 strict(p,['studyId','discipline','outcome','reason']);const prior=reviews(s,a.tenant,study.id);
 requireThat(['technical','privacy'].includes(p.discipline)&&role(a,study.unit,p.discipline==='technical'?'it':'quality')&&a.id!==study.createdBy&&!prior.some(r=>r.createdBy===a.id),'separation','Hazırlayan, teknik incelemeci ve mahremiyet incelemecisi ayrı kişiler olmalı.',403);
 requireThat(latest(s,a.tenant,study.programId)?.id===study.id&&!prior.some(r=>r.discipline===p.discipline)&&['accepted','rejected'].includes(p.outcome),'wallet_study_changed','Güncel sürümde tekrarlanmamış inceleme ve açık sonuç gerekli.',409);
 if(p.outcome==='accepted')requireThat(study.reviewOn>=now.slice(0,10)&&currentDeps(s,a.tenant,study),'wallet_study_changed','Gözden geçirme günü ve program/sicil dayanakları güncel olmalı.',409);
 return put(action,{id:id(),unit:study.unit,owner:study.owner,studyId:study.id,studyDigest:digest(study),discipline:p.discipline,outcome:p.outcome,reason:p.reason,...flags});
}
export function walletStudyView(s,a,now){
 const studies=s.list(a.tenant,'wallet-study').filter(p=>staff(a,p.unit)||ownProgram(s,a,p)&&accepted(s,a.tenant,p)).map(p=>{
  const r=reviews(s,a.tenant,p.id),full=staff(a,p.unit),isLatest=latest(s,a.tenant,p.programId)?.id===p.id,current=isLatest&&accepted(s,a.tenant,p)&&p.reviewOn>=now.slice(0,10)&&!held(s,a.tenant,p.id)&&currentDeps(s,a.tenant,p);
  const record=full?p:{id:p.id,unit:p.unit,programId:p.programId,programVersion:p.programVersion,version:p.version,need:p.need,purpose:p.purpose,alternatives:p.alternatives,catalog:p.catalog,recommendation:p.recommendation,selectedOption:p.selectedOption,reason:p.reason,reviewOn:p.reviewOn,externalChecks:p.externalChecks,scope:p.scope,...flags};
  return {...record,current,held:held(s,a.tenant,p.id),reviews:full?r:r.map(x=>({discipline:x.discipline,outcome:x.outcome})),canReview:full&&isLatest&&a.id!==p.createdBy&&!r.some(r=>r.createdBy===a.id)?['technical','privacy'].filter(d=>role(a,p.unit,d==='technical'?'it':'quality')&&!r.some(r=>r.discipline===d)):[],canHold:role(a,p.unit,'quality')&&a.id!==p.createdBy&&accepted(s,a.tenant,p)&&!held(s,a.tenant,p.id)};
 });
 const programs=s.list(a.tenant,'program').filter(p=>role(a,p.unit,'admin')&&s.list(a.tenant,'publication').some(r=>r.programId===p.id)).map(p=>({id:p.id,title:p.title,unit:p.unit,version:p.version})),units=[...new Set(programs.map(p=>p.unit))];
 const registries=s.list(a.tenant,'registry').filter(r=>units.includes(r.unit)&&['data-flow','institution-authority'].includes(r.type)&&s.list(a.tenant,'registry-review').some(v=>v.recordId===r.id&&v.outcome==='accepted')).map(r=>({id:r.id,unit:r.unit,type:r.type,title:r.title,purpose:r.fields.purpose,recipient:r.fields.recipient,authorityReference:r.fields.authorityReference}));
 return {studies,programs,registries,catalog:walletOptions,externalChecks:walletExternalChecks.map(c=>({...c,state:'not-run',realWallet:false})),...flags};
}
