import {randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {recoveryChecks} from './recovery-model.mjs';
const actions=['recovery-plan','recovery-review'];
const text=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Kurtarma tatbikatı yalnız izole yerel kabulde çalışır.',503);
const rows=(s,t,k)=>s.list(t,k);
const resultFor=(s,t,p)=>rows(s,t,'recovery-result').filter(r=>r.planId===p.id).at(-1);
const attemptFor=(s,t,p)=>rows(s,t,'recovery-attempt').filter(r=>r.planId===p.id).at(-1);
export const recoveryDigest=r=>hash(stableStringify(r));
function getPlan(s,a,id,roles){const p=typeof id==='string'&&s.get(a.tenant,'recovery-plan',id);requireThat(p&&role(a,p.unit,roles),'not_found','Yetkili birimde tatbikat planı gerekli.',404);return p;}
export function recoveryReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim tatbikatı kapalı.',503);requireThat(role(a,r.unit,action==='recovery-review'?['admin']:['it']),'forbidden','Güncel birim görevi ve çok faktörlü oturum gerekli.',403);return true;}
export function recoveryCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='recovery-plan'){
  requireThat(role(a,p.unit,['it']),'forbidden','Bu birimde bilgi işlem görevi ve çok faktörlü oturum gerekli.',403);
  requireThat(p.syntheticOnly===true&&text(p.reason)&&Number.isInteger(p.rpoSeconds)&&p.rpoSeconds>=0&&p.rpoSeconds<=3600&&Number.isInteger(p.rtoSeconds)&&p.rtoSeconds>=1&&p.rtoSeconds<=3600,'recovery_plan','Sentetik kapsam, gerekçe ve geçerli yerel hedefler gerekli.');
  return put('recovery-plan',{id:id(),unit:p.unit,owner:a.id,reason:p.reason,rpoSeconds:p.rpoSeconds,rtoSeconds:p.rtoSeconds,syntheticOnly:true,official:false,productionAuthorized:false});
 }
 const plan=getPlan(s,a,p.planId,['admin']),result=resultFor(s,a.tenant,plan);
 requireThat(result&&p.resultId===result.id&&p.basedOn===recoveryDigest(result),'recovery_changed','Güncel tatbikat sonucu ve özeti gerekli.',409);
 requireThat(![plan.createdBy,result.createdBy].includes(a.id),'separation','Planı hazırlayan ve çalıştırandan ayrı yönetici incelemeli.',403);
 requireThat(!rows(s,a.tenant,'recovery-review').some(r=>r.resultId===result.id),'recovery_reviewed','Bu sonuç zaten incelendi.',409);
 requireThat(['accepted','correction'].includes(p.outcome)&&text(p.reason),'recovery_review','Gerekçeli inceleme gerekli.');
 requireThat(p.outcome!=='accepted'||result.state==='passed','recovery_failed','Başarısız tatbikat uygun sayılamaz.');
 return put('recovery-review',{id:id(),unit:plan.unit,owner:plan.owner,planId:plan.id,resultId:result.id,resultDigest:p.basedOn,outcome:p.outcome,reason:p.reason,official:false,productionAuthorized:false});
}
export function recoveryView(s,a,now){
 return {units:a.memberships.filter(m=>a.mfa&&m.roles.includes('it')).map(m=>m.unit),plans:rows(s,a.tenant,'recovery-plan').filter(p=>role(a,p.unit,['it','admin'])).map(p=>{
  const result=resultFor(s,a.tenant,p),attempt=attemptFor(s,a.tenant,p),review=result&&rows(s,a.tenant,'recovery-review').find(r=>r.resultId===result.id),open=attempt&&(!result||result.attemptId!==attempt.id)&&attempt.leaseUntil>now;
  return {...p,result:result?{...result,digest:recoveryDigest(result)}:null,review:review||null,running:!!open,canRun:role(a,p.unit,['it'])&&!open&&(!result||result.state==='failed')&&rows(s,a.tenant,'recovery-attempt').filter(r=>r.planId===p.id).length<3,canReview:!!result&&!review&&role(a,p.unit,['admin'])&&![p.createdBy,result.createdBy].includes(a.id)};
 })};
}
const reportKeys=['format','scenarioVersion','checks','backupMs','restoreMs','recoveryMs','recoveryPointGapMs','lostRecords','restoredRecords','restoredSessions','checkpointDigest','archiveDigest','sourceSignatureCount','syntheticLeaseAdvanceMs','productionRpoRtoVerified','official'];
function safeReport(r){
 requireThat(r&&Object.keys(r).length===reportKeys.length&&reportKeys.every(k=>Object.hasOwn(r,k))&&r.format==='myys-recovery-report/1'&&r.scenarioVersion==='2026.10.14.1'&&r.official===false&&r.productionRpoRtoVerified===false,'recovery_report','Tatbikat sonuç biçimi doğrulanamadı.',503);
 requireThat(Object.keys(r.checks||{}).length===Object.keys(recoveryChecks).length&&Object.keys(recoveryChecks).every(k=>typeof r.checks[k]==='boolean')&&['backupMs','restoreMs','recoveryMs','recoveryPointGapMs'].every(k=>Number.isFinite(r[k])&&r[k]>=0)&&['lostRecords','restoredRecords','restoredSessions','sourceSignatureCount','syntheticLeaseAdvanceMs'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&['checkpointDigest','archiveDigest'].every(k=>/^[a-f0-9]{64}$/.test(r[k])),'recovery_report','Tatbikat ölçümleri doğrulanamadı.',503);
 return structuredClone(r);
}
// Injected only by the disposable local server. No production/default runner.
export class LocalRecoveryService{
 constructor(core,{rehearse}){local(core.store);requireThat(typeof rehearse==='function','recovery_config','Yerel tatbikat çalıştırıcısı gerekli.',503);this.core=core;this.rehearse=rehearse;}
 async run(context,planId){
  const {core}=this,s=core.store;local(s);
  const claim=s.transaction(()=>{
   const now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now),plan=getPlan(s,a,planId,['it']),result=resultFor(s,a.tenant,plan),attempt=attemptFor(s,a.tenant,plan);
   if(result?.state==='passed')return {saved:result};
   requireThat(!attempt||result?.attemptId===attempt.id||attempt.leaseUntil<=now,'recovery_busy','Bu tatbikat hâlen çalışıyor; sonucu yenileyin.',409);
   requireThat(rows(s,a.tenant,'recovery-attempt').filter(r=>r.planId===plan.id).length<3,'recovery_limit','Üç deneme sınırına ulaşıldı; yeni gerekçeli plan gerekli.',409);
   const r=s.put(a.tenant,'recovery-attempt',{id:randomUUID(),unit:plan.unit,owner:plan.owner,planId:plan.id,createdBy:a.id,createdAt:now,leaseUntil:new Date(Date.parse(now)+120000).toISOString()});
   s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'recovery.start',r.id,now);return {attempt:r,plan};
  });
  if(claim.saved)return claim.saved;
  let report=null;try{report=safeReport(await this.rehearse());}catch{ /* Deliberately exclude raw exceptions, paths and fixture data. */ }
  return s.transaction(()=>{
   local(s);const now=core.clock(),a=s.principal(context.sessionHash,context.tenant,now),plan=getPlan(s,a,planId,['it']);
   requireThat(a.id===claim.attempt.createdBy,'recovery_actor','Tatbikatı başlatan kişi oturumu gerekli.',403);
   requireThat(attemptFor(s,a.tenant,plan)?.id===claim.attempt.id&&claim.attempt.leaseUntil>now,'recovery_lease','Tatbikat sahipliği veya süresi sona erdi; güncel sonucu açın.',409);
   const passed=!!report&&Object.values(report.checks).every(Boolean)&&report.restoredSessions===0&&report.lostRecords===0&&report.recoveryPointGapMs<=plan.rpoSeconds*1000&&report.recoveryMs+report.syntheticLeaseAdvanceMs<=plan.rtoSeconds*1000;
   const r=s.put(a.tenant,'recovery-result',{id:randomUUID(),unit:plan.unit,owner:plan.owner,planId:plan.id,attemptId:claim.attempt.id,createdBy:a.id,createdAt:now,state:passed?'passed':'failed',report,failureCode:report?null:'exercise_failed',official:false,productionAuthorized:false});
   s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(a.tenant,a.id,'recovery.finish',r.id,now);return r;
  });
 }
}
