import {activeRecognitionCredit} from './obs.mjs';
import {requireThat,hash,LocalAcceptanceStore} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {cohortGateRoles,cohortAxes,requiredCohortGates} from './cohort-model.mjs';
const staff=['coordinator','commission','studentAffairs','quality','it','admin'];
const role=(a,u,rs)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>rs.includes(r)));
const reason=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=2000;
const future=(v,now)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v>=now.slice(0,10);
const active=(s,tenant,person,unit,roles,now)=>{const m=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(tenant,person,unit,now);return !!m&&JSON.parse(m.roles).some(r=>roles.includes(r));};
const records=(s,t,k,c)=>s.list(t,k).filter(r=>r.cohortId===c.id);
function cohortState(core,a,c,now){
 const s=core.store,t=a.tenant,gates=requiredCohortGates(c.pathway,c.recognition,c.obs).map(key=>{const r=records(s,t,'cohort-gate',c).filter(x=>x.key===key).at(-1);return {key,record:r||null,accepted:r?.outcome==='accepted'&&active(s,t,r.createdBy,c.unit,cohortGateRoles[key],now)};});
 const issues=records(s,t,'cohort-issue',c).map(r=>{const last=records(s,t,'cohort-issue-review',c).filter(x=>x.issueId===r.id).at(-1);return {...r,state:last?.outcome||'open',review:last||null};});
 const source=c.enrollmentIds.map(id=>{const e=s.get(t,'enrollment',id);const valid=e&&e.programId===c.programId&&e.unit===c.unit&&active(s,t,e.owner,c.unit,['learner'],now);const evidence=s.list(t,'evidence').filter(r=>r.enrollmentId===id),assessments=s.list(t,'assessment').filter(r=>r.enrollmentId===id),decisions=s.list(t,'decision').filter(r=>r.enrollmentId===id),d=decisions.at(-1),usable=d?.outcome==='approved'&&core.decisionUsable(a,d);const signed=s.list(t,'issuance').filter(r=>r.enrollmentId===id||d&&r.decisionId===d.id).filter(r=>usable&&r.decisionId===d.id&&s.get(t,'signed',r.id)&&!s.list(t,'revocation').some(v=>v.issuanceId===r.id));const credits=s.list(t,'recognition-credit').filter(r=>s.get(t,'recognition-request',r.requestId)?.enrollmentId===id&&activeRecognitionCredit(s,t,r.id));const obs=credits.flatMap(r=>s.list(t,'obs-event').filter(e=>e.payload.creditId===r.id&&s.list(t,'obs-reconciliation').some(m=>m.eventId===e.id&&m.outcome==='matched')));return {id,credits:credits.map(r=>r.id),obs:obs.map(r=>r.id),active:!!valid,evidence:evidence.map(r=>r.id),assessments:assessments.map(r=>r.id),decisionId:d?.id||null,usable:!!usable,signed:signed.map(r=>r.id),complete:!!(valid&&evidence.length&&assessments.length&&usable&&signed.length&&(!c.recognition||credits.length)&&(!c.obs||credits.length&&credits.every(r=>obs.some(e=>e.payload.creditId===r.id))))};});
 const revision=hash(stableStringify({cohort:c.id,pause:records(s,t,'cohort-event',c).filter(e=>e.type!=='open').at(-1)?.id||null,gates:gates.map(g=>[g.key,g.record?.id||null,g.accepted]),issues:issues.map(i=>[i.id,i.review?.id||null,i.state]),source}));
 const axes=Object.entries(cohortAxes).map(([axis,definition])=>{const r=records(s,t,'cohort-review',c).filter(r=>r.axis===axis&&r.revision===revision).at(-1);return {axis,history:records(s,t,'cohort-review',c).filter(x=>x.axis===axis),record:r||null,accepted:r?.outcome==='accepted'&&active(s,t,r.createdBy,c.unit,definition.roles,now)};});
 const critical=issues.filter(i=>i.severity==='critical'&&i.state!=='resolved').length;
 const ready=gates.every(g=>g.accepted)&&critical===0&&source.every(r=>r.complete)&&future(records(s,t,'cohort-evaluation',c).at(-1)?.nextReviewOn||c.reviewOn,now)&&axes.every(r=>r.accepted)&&new Set(axes.map(r=>r.record?.createdBy)).size===3;
 const events=records(s,t,'cohort-event',c),last=events.at(-1);const opened=last?.type==='open'&&last.revision===revision&&ready;
 return {gates,issues,source,revision,axes,critical,ready,events,closed:last?.type==='close',opened,everOpened:events.some(e=>e.type==='open'),state:opened?'local-open':last?.type==='close'?'closed':events.some(e=>e.type==='open')?'held':'preparation'};
}
export function cohortReplay(a,action,r){if(typeof action!=='string'||!action.startsWith('cohort-'))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Grup kabulü yalnız izole yerel provada çalışır.',503);const roles=action==='cohort-gate'?cohortGateRoles[r.key]:action==='cohort-review'?cohortAxes[r.axis]?.roles:action==='cohort-create'||action==='cohort-open'?['coordinator','admin']:action==='cohort-evaluate'?['quality']:action==='cohort-issue-review'?['it','quality']:staff;requireThat(roles&&role(a,r.unit,roles),'forbidden','Güncel grup inceleme yetkisi gerekli.',403);return true;}
export function cohortCommand({action,p,a,s,put,id,now,core}){
 if(typeof action!=='string'||!action.startsWith('cohort-'))return null;
 requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Grup kabulü yalnız izole yerel provada çalışır.',503);
 if(action==='cohort-create'){
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,['coordinator','admin']),'not_found','Program veya grup hazırlama yetkisi bulunamadı.',404);
  requireThat(typeof p.title==='string'&&p.title.trim().length>=3&&p.title.length<=200&&future(p.reviewOn,now)&&typeof p.recognition==='boolean'&&typeof p.obs==='boolean'&&(!p.obs||p.recognition),'cohort_plan','Grup adı, inceleme tarihi ve tutarlı hizmet yolu gerekli.');
  requireThat(Array.isArray(p.enrollmentIds)&&p.enrollmentIds.length>0&&p.enrollmentIds.length<=50&&new Set(p.enrollmentIds).size===p.enrollmentIds.length&&p.enrollmentIds.every(id=>{const e=s.get(a.tenant,'enrollment',id);return e&&e.programId===program.id&&e.unit===program.unit&&active(s,a.tenant,e.owner,e.unit,['learner'],now); }),'cohort_members','Aynı program sürümünde 1–50 farklı etkin öğrenen kaydı gerekli.');
  return put('cohort',{id:id(),unit:program.unit,owner:a.id,title:p.title,programId:program.id,programVersion:program.version,pathway:program.pathway,enrollmentIds:p.enrollmentIds,reviewOn:p.reviewOn,recognition:p.recognition,obs:p.obs,scope:'local-acceptance',official:false,realActivation:false});
 }
 const c=s.get(a.tenant,'cohort',p.cohortId);requireThat(c&&role(a,c.unit,staff),'not_found','Grup bulunamadı veya inceleme yetkisi yok.',404);const state=cohortState(core,a,c,now),base={unit:c.unit,owner:c.owner,cohortId:c.id,official:false,realActivation:false};
 if(state.closed&&['cohort-gate','cohort-review','cohort-issue','cohort-issue-review'].includes(action))requireThat(false,'cohort_closed','Kapatılan grup salt okunurdur; yeni kapsam için yeni plan gerekir.',409);
 if(action==='cohort-gate'){
  const gate=state.gates.find(g=>g.key===p.key);requireThat(gate&&role(a,c.unit,cohortGateRoles[p.key]),'forbidden','Bu koşul için görev yetkiniz yok.',403);requireThat((gate.record?.id||null)===(p.previousId||null),'cohort_changed','Koşul kaydı değişti; yenileyin.',409);requireThat(['accepted','blocked'].includes(p.outcome)&&reason(p.reference)&&reason(p.reason),'cohort_gate','Yerel kanıt referansı, gerekçe ve sonuç gerekli.');return put('cohort-gate',{...base,id:id(),key:p.key,outcome:p.outcome,reference:p.reference,reason:p.reason,previousId:gate.record?.id||null});
 }
 if(action==='cohort-issue'){
  requireThat(['critical','major','minor'].includes(p.severity)&&reason(p.reason),'cohort_issue','Hata düzeyi ve açıklaması gerekli.');return put('cohort-issue',{...base,id:id(),severity:p.severity,reason:p.reason});
 }
 if(action==='cohort-issue-review'){
  const issue=state.issues.find(i=>i.id===p.issueId);requireThat(issue&&role(a,c.unit,['it','quality'])&&issue.createdBy!==a.id,'forbidden','Hatayı farklı yetkili incelemeli.',403);requireThat((issue.review?.id||null)===(p.previousId||null),'cohort_changed','Hata incelemesi değişti.',409);requireThat(['resolved','open'].includes(p.outcome)&&reason(p.reason),'cohort_issue','Gerekçeli hata incelemesi gerekli.');return put('cohort-issue-review',{...base,id:id(),issueId:issue.id,outcome:p.outcome,reason:p.reason,previousId:issue.review?.id||null});
 }
 if(action==='cohort-review'){
  requireThat(cohortAxes[p.axis]&&role(a,c.unit,cohortAxes[p.axis].roles)&&a.id!==c.createdBy&&!c.enrollmentIds.some(id=>s.get(a.tenant,'enrollment',id)?.owner===a.id),'forbidden','Grubu hazırlayan veya öğrenen kendi açılış incelemesini onaylayamaz.',403);
  requireThat(p.revision===state.revision,'cohort_changed','Grup dayanakları değişti; yenileyin.',409);const previous=state.axes.find(x=>x.axis===p.axis).record;requireThat((previous?.id||null)===(p.previousId||null),'cohort_changed','İnceleme sürümü değişti.',409);
  requireThat(['accepted','rejected'].includes(p.outcome)&&reason(p.reason),'cohort_review','İnceleme sonucu ve gerekçe gerekli.');
  if(p.outcome==='accepted'){requireThat(!state.axes.some(x=>x.axis!==p.axis&&x.record?.createdBy===a.id),'separation','Üç inceleme ayrı kişilerce yapılmalı.',403);requireThat(state.gates.every(g=>g.accepted)&&state.critical===0&&state.source.every(r=>r.complete),'cohort_not_ready','Koşullar, kritik hatalar ve yerel kayıt zinciri tamamlanmalı.',409);}
  return put('cohort-review',{...base,id:id(),axis:p.axis,revision:state.revision,outcome:p.outcome,reason:p.reason,previousId:previous?.id||null});
 }
 if(action==='cohort-open'){
  requireThat(role(a,c.unit,['coordinator','admin'])&&p.revision===state.revision,'cohort_changed','Yetki veya grup dayanağı değişti.',409);requireThat(state.ready&&!state.opened&&!state.closed,'cohort_not_ready','Üç ayrı inceleme, güncel üyelik, yerel zincir ve sıfır kritik hata gerekli.',409);requireThat(reason(p.reason),'reason','Açılış provası gerekçesi gerekli.');return put('cohort-event',{...base,id:id(),type:'open',revision:state.revision,reason:p.reason});
 }
 if(action==='cohort-evaluate'){
  requireThat(role(a,c.unit,['quality'])&&state.everOpened&&!state.closed,'forbidden','Açılış provası sonrası kalite incelemesi gerekli.',403);requireThat(['continue','hold','close'].includes(p.outcome)&&reason(p.reason)&&future(p.nextReviewOn,now),'cohort_evaluation','Dönem değerlendirmesi ve sonraki tarih gerekli.');requireThat(p.revision===state.revision,'cohort_changed','Grup dayanakları değişti.',409);
  requireThat(p.outcome!=='continue'||state.opened,'cohort_not_ready','Bekletilen veya kapalı grup devam ettirilmiş sayılamaz.',409);
  requireThat((records(s,a.tenant,'cohort-evaluation',c).at(-1)?.id||null)===(p.previousEvaluationId||null),'cohort_changed','Dönem değerlendirmesi değişti; yenileyin.',409);
  const evaluation=put('cohort-evaluation',{...base,id:id(),outcome:p.outcome,reason:p.reason,nextReviewOn:p.nextReviewOn,revision:state.revision,sourceSummary:{members:state.source.length,complete:state.source.filter(x=>x.complete).length,critical:state.critical},realObservationCompleted:false});
  if(p.outcome!=='continue')put('cohort-event',{...base,id:id(),type:p.outcome,revision:state.revision,reason:p.reason,evaluationId:evaluation.id});return evaluation;
 }
 requireThat(false,'cohort_action','Grup işlemi bulunamadı.');
}
export function cohortView(core,a,now){const s=core.store;return s.list(a.tenant,'cohort').filter(c=>role(a,c.unit,staff)).map(c=>{const state=cohortState(core,a,c,now),academic=role(a,c.unit,['coordinator','commission','quality','studentAffairs']);const {enrollmentIds,...summary}=c;return {...summary,...state,source:undefined,memberCount:enrollmentIds.length,completedChainCount:state.source.filter(r=>r.complete).length,...(academic?{enrollmentIds}:{}),gates:state.gates.map(g=>({...g,canRecord:!state.closed&&role(a,c.unit,cohortGateRoles[g.key])})),axes:state.axes.map(r=>({...r,canReview:!state.closed&&role(a,c.unit,cohortAxes[r.axis].roles)&&a.id!==c.createdBy})),issues:state.issues.map(i=>({...i,canReview:!state.closed&&role(a,c.unit,['it','quality'])&&i.createdBy!==a.id})),canOpen:role(a,c.unit,['coordinator','admin'])&&state.ready&&!state.opened&&!state.closed,canEvaluate:role(a,c.unit,['quality'])&&state.everOpened&&!state.closed,evaluations:records(s,a.tenant,'cohort-evaluation',c)};});}
