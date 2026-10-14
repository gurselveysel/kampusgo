import {sourceEventTrusted} from './source-trust.mjs';
export function sourceRegistrationState(s,t,contractId,owner,{unit,programId}){
 const events=s.list(t,'lms-event').filter(e=>e.contractId===contractId&&e.owner===owner&&e.unit===unit&&e.programId===programId&&e.type==='registration');
 const latest=events.reduce((a,e)=>!a||e.revision>a.revision?e:a,null);
 if(!latest)return {state:'unreported',event:null,events};
 const state=!sourceEventTrusted(s,t,latest)?'untrusted':!latest.registered?'cancelled':s.get(t,'lms-receipt',latest.id)?.state!=='processed'?'pending':'active';
 return {state,event:latest,events};
}
export function sourceRegistrationAllows(s,t,event){
 const registration=sourceRegistrationState(s,t,event.contractId,event.owner,event);
 if(registration.state==='unreported')return true; // Earlier synthetic profile; never label it confirmed registration.
 if(registration.state!=='active')return false;
 const bound=event.registrationEventId?s.get(t,'lms-event',event.registrationEventId):null;
 if(event.registrationEventId&&(!bound||bound.contractId!==event.contractId||bound.owner!==event.owner||bound.unit!==event.unit||bound.programId!==event.programId||bound.type!=='registration'||!bound.registered||s.get(t,'lms-receipt',bound.id)?.state!=='processed'||!sourceEventTrusted(s,t,bound)))return false;
 // A later re-registration must not revive evidence accepted before a withdrawal.
 return !registration.events.some(e=>e.registered===false&&e.revision>(bound?.revision||0));
}
export function sourceCourseProgress(s,t,events,current){
 const groups=new Map();for(const e of events){const key=JSON.stringify([e.contractId,e.owner,e.programId]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 return [...groups.values()].map(rows=>{
  const e=rows[0],program=s.get(t,'program',e.programId),reg=sourceRegistrationState(s,t,e.contractId,e.owner,e);
  const latest=type=>rows.filter(e=>e.type===type).reduce((a,e)=>!a||e.revision>a.revision?e:a,null);
  const completion=latest('completion'),grades=new Map();for(const g of rows.filter(e=>e.type==='grade'))if(!grades.has(g.taskId)||grades.get(g.taskId).revision<g.revision)grades.set(g.taskId,g);
  const source=e.sourceProof?s.get(t,'source-contract',e.sourceProof.trustRecordId)?.descriptor:null;
  return {id:JSON.stringify([e.contractId,e.owner,e.programId]),unit:e.unit,owner:e.owner,programId:e.programId,programTitle:program?.title||'Program kaydı',enrollmentId:e.enrollmentId,contractId:e.contractId,sourceName:source?.name||e.contractId,courseId:source?.courseId||null,
   registration:{state:reg.state,eventId:reg.event?.id||null,revision:reg.event?.revision||null,registrationId:reg.event?.registrationId||null},licenseRevoked:rows.some(x=>x.type==='license-revoked'),
   completion:completion?{eventId:completion.id,revision:completion.revision,completed:completion.completed,current:current(completion),processed:s.get(t,'lms-receipt',completion.id)?.state==='processed'}:null,
   tasks:[...grades.values()].map(g=>({taskId:g.taskId,title:program?.tasks.find(t=>t.id===g.taskId)?.title||g.taskId,eventId:g.id,revision:g.revision,grade:g.grade,current:current(g),processed:s.get(t,'lms-receipt',g.id)?.state==='processed',registrationEventId:g.registrationEventId||null})),
   history:rows.filter(e=>e.type==='registration').sort((a,b)=>b.revision-a.revision).map(x=>({eventId:x.id,revision:x.revision,registered:x.registered,occurredAt:x.occurredAt,processed:s.get(t,'lms-receipt',x.id)?.state==='processed'})),official:false};
 });
}
