import {requireThat} from './store.mjs';
import {validDay} from './appeal-policy-model.mjs';
import {supportCategories,supportQueues} from './support-service-labels.mjs';
export {supportCategories,supportQueues};
const dayMs=86400000,offsetMs=3*3600000;
const localDay=iso=>new Date(Date.parse(iso)+offsetMs).toISOString().slice(0,10);
export function supportCalendar(input){
 const c=input;
 requireThat(c&&c.timeZone==='UTC+03:00'&&validDay(c.from)&&validDay(c.to)&&c.to>=c.from&&Date.parse(c.to)-Date.parse(c.from)<=370*dayMs,'support_calendar','En fazla 371 günlük, açık UTC+03:00 kapsamlı yerel takvim gerekli.');
 requireThat(Array.isArray(c.weekdays)&&c.weekdays.length>=1&&c.weekdays.length<=7&&new Set(c.weekdays).size===c.weekdays.length&&c.weekdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6),'support_calendar','Benzersiz çalışma günleri gerekli.');
 requireThat(Array.isArray(c.windows)&&c.windows.length>=1&&c.windows.length<=6&&c.windows.every(w=>Array.isArray(w)&&w.length===2&&w.every(Number.isInteger)&&w[0]>=0&&w[1]<=1440&&w[1]>w[0]),'support_calendar','Aynı gün içinde geçerli çalışma aralıkları gerekli.');
 const windows=c.windows.map(w=>[...w]).sort((a,b)=>a[0]-b[0]);requireThat(windows.every((w,i)=>i===0||w[0]>=windows[i-1][1]),'support_calendar','Çalışma aralıkları çakışamaz.');
 requireThat(Array.isArray(c.excludedDays)&&c.excludedDays.length<=371&&new Set(c.excludedDays).size===c.excludedDays.length&&c.excludedDays.every(d=>validDay(d)&&d>=c.from&&d<=c.to),'support_calendar','Takvim kapsamındaki benzersiz kapalı günleri belirtin.');
 return {timeZone:'UTC+03:00',from:c.from,to:c.to,weekdays:[...c.weekdays].sort(),windows,excludedDays:[...c.excludedDays].sort()};
}
export function supportTargets(input){
 requireThat(input&&Object.keys(input).length===3&&Object.keys(input).every(x=>Object.hasOwn(supportCategories,x)),'support_targets','Üç destek kuyruğu için hedef gerekli.');
 return Object.fromEntries(Object.keys(supportCategories).map(category=>{
  const t=input[category];requireThat(t&&Number.isInteger(t.responseMinutes)&&t.responseMinutes>=1&&Number.isInteger(t.resolutionMinutes)&&t.resolutionMinutes>=t.responseMinutes&&t.resolutionMinutes<=129600,'support_targets','İlk yanıt ve çözüm hedefi çalışma dakikası cinsinden gerekli; çözüm yanıt hedefinden kısa olamaz.');
  requireThat(Array.isArray(t.escalateTo)&&t.escalateTo.length<=2&&new Set(t.escalateTo).size===t.escalateTo.length&&t.escalateTo.every(x=>Object.hasOwn(supportCategories,x)&&x!==category),'support_targets','Yalnız farklı mevcut yetkili kuyruklara yönlendirme tanımlanabilir.');
  return [category,{responseMinutes:t.responseMinutes,resolutionMinutes:t.resolutionMinutes,escalateTo:[...t.escalateTo].sort()}];
 }));
}
// Explicit synthetic calendar, not inferred working hours, a statutory deadline or a service promise.
export function supportDeadline(calendar,start,minutes){
 if(!calendar||!Number.isFinite(Date.parse(start))||!Number.isInteger(minutes)||minutes<1)return null;
 const startDay=localDay(start);if(startDay<calendar.from||startDay>calendar.to)return null;
 let remaining=minutes*60000;
 for(let day=startDay,attempt=0;day<=calendar.to&&attempt<372;day=new Date(Date.parse(day+'T00:00:00Z')+dayMs).toISOString().slice(0,10),attempt++){
  if(!calendar.weekdays.includes(new Date(day+'T00:00:00Z').getUTCDay())||calendar.excludedDays.includes(day))continue;
  const midnight=Date.parse(day+'T00:00:00Z')-offsetMs;
  for(const [begin,end] of calendar.windows){const a=Math.max(Date.parse(start),midnight+begin*60000),b=midnight+end*60000;if(a>=b)continue;if(remaining<=b-a)return new Date(a+remaining).toISOString();remaining-=b-a;}
 }
 return null; // Never extend the supplied calendar or silently fall back to 24/7.
}
const targetState=(due,at,now,finished)=>!due?{status:'unknown',due:null,at:at||null}:at?{status:Date.parse(at)<=Date.parse(due)?'met':'late',due,at}:finished?{status:'missing',due,at:null}:{status:Date.parse(now)>Date.parse(due)?'overdue':'waiting',due,at:null};
export function supportServiceCycles(ticket,now,policyFor){
 const cycles=[{start:ticket.createdAt,category:ticket.originalCategory||ticket.category,binding:ticket.servicePolicy||null,events:[]}];
 for(const event of ticket.events||[]){if(event.type==='reopen')cycles.push({start:event.createdAt,category:event.category,binding:event.servicePolicy||null,events:[]});else cycles.at(-1).events.push(event);}
 return cycles.map((cycle,index)=>{
  const policy=cycle.binding&&policyFor(cycle.binding),target=policy?.targets[cycle.category],validClock=Number.isFinite(Date.parse(now))&&Date.parse(now)>=Date.parse(cycle.start)&&cycle.events.every(e=>Date.parse(e.createdAt)<=Date.parse(now));
  const response=cycle.events.find(e=>['reply','resolve'].includes(e.type)&&e.createdBy!==ticket.owner&&(e.agentResponse===true||e.agentResponse===undefined)),resolution=cycle.events.find(e=>e.type==='resolve'),confirmation=cycle.events.find(e=>e.type==='confirm');
  const due=minutes=>policy&&validClock?supportDeadline(policy.calendar,cycle.start,minutes):null;
  return {cycle:index+1,startedAt:cycle.start,category:cycle.category,policy:policy?{id:policy.id,title:policy.title,version:policy.version,digest:cycle.binding.digest,calendar:policy.calendar,responseMinutes:target.responseMinutes,resolutionMinutes:target.resolutionMinutes}:null,response:targetState(target?due(target.responseMinutes):null,response?.createdAt,now,!!resolution),resolution:targetState(target?due(target.resolutionMinutes):null,resolution?.createdAt,now,false),confirmedAt:confirmation?.createdAt||null,official:false};
 });
}
