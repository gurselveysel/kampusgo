import {requireThat} from './store.mjs';
import {bindSupportPolicy,pinnedSupportPolicy} from './support-service.mjs';
import {supportServiceCycles,supportQueues} from './support-service-model.mjs';

const queues=supportQueues;
const messageOk=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=6000;
const member=(actor,unit)=>actor.memberships.some(m=>m.unit===unit);
const handler=(actor,ticket,category)=>!!actor.mfa&&actor.memberships.some(m=>m.unit===ticket.unit&&m.roles.includes(queues[category]));
export function supportState(store,tenant,ticket){
 const events=store.list(tenant,'support-event').filter(e=>e.ticketId===ticket.id);
 let state='open',category=ticket.category;
 for(const e of events){if(e.type==='resolve')state='resolved';if(e.type==='confirm')state='closed';if(e.type==='reopen')state='open';if(e.type==='escalate')category=e.category;}
 return {...ticket,originalCategory:ticket.category,state,category,revision:events.length,events};
}
export function canReadSupport(actor,ticket){return ticket.owner===actor.id&&member(actor,ticket.unit)||handler(actor,ticket,ticket.category);}
function currentBinding(ticket){const reopen=ticket.events.filter(e=>e.type==='reopen').at(-1);return reopen?reopen.servicePolicy||null:ticket.servicePolicy||null;}
function targets(store,tenant,ticket){const binding=currentBinding(ticket),p=pinnedSupportPolicy(store,tenant,ticket.unit,binding);return p?p.targets[ticket.category].escalateTo:binding?[]:Object.keys(queues).filter(k=>k!==ticket.category);}
function actions(actor,ticket,escalations){
 const owner=ticket.owner===actor.id&&member(actor,ticket.unit),agent=handler(actor,ticket,ticket.category);
 if(ticket.state==='closed')return owner?['reopen']:[];
 return ticket.state==='resolved'?(owner?['confirm','reopen']:[]):[...(owner||agent?['reply']:[]),...(agent?['resolve',...(escalations.length?['escalate']:[])]:[])];
}
export function supportView(store,actor,now=new Date().toISOString()){return store.list(actor.tenant,'support').map(t=>supportState(store,actor.tenant,t)).filter(t=>canReadSupport(actor,t)).map(t=>{const allowedEscalations=targets(store,actor.tenant,t);return {...t,allowedEscalations,allowedActions:actions(actor,t,allowedEscalations),serviceCycles:supportServiceCycles(t,now,b=>pinnedSupportPolicy(store,actor.tenant,t.unit,b))};});}
export function supportReplay(store,actor,result){
 const ticket=store.get(actor.tenant,'support',result.ticketId);
 requireThat(ticket,'not_found','Destek kaydı bulunamadı.',404);
 const current=supportState(store,actor.tenant,ticket);
 const owner=actor.id===current.owner&&member(actor,current.unit),agent=handler(actor,current,current.category);
 requireThat(canReadSupport(actor,current)&&(['reopen','confirm'].includes(result.type)?owner:result.type==='reply'?owner||agent:agent),'forbidden','Güncel destek yetkisi gerekli.',403);
}
export function supportCommand({action,p,a,s,put,id,now}){
 if(action!=='support-event')return null;
 const record=s.get(a.tenant,'support',p.ticketId),ticket=record&&supportState(s,a.tenant,record);
 requireThat(ticket&&canReadSupport(a,ticket),'not_found','Destek kaydı bulunamadı veya erişilemiyor.',404);
 requireThat(Number.isInteger(p.expectedRevision)&&p.expectedRevision===ticket.revision,'support_conflict','Destek kaydı değişti. Son durumu yenileyin.',409);
 requireThat(['reply','resolve','reopen','escalate','confirm'].includes(p.type)&&messageOk(p.message),'support_event','Geçerli işlem ve açıklama gerekli.');
 requireThat(Date.parse(now)>=Date.parse(ticket.events.at(-1)?.createdAt||ticket.createdAt),'support_clock','Sunucu zamanı destek tarihçesinin gerisine gidemez.',409);
 const owner=ticket.owner===a.id&&member(a,ticket.unit),agent=handler(a,ticket,ticket.category);
 requireThat(['reopen','confirm'].includes(p.type)?owner:p.type==='reply'?owner||agent:agent,'forbidden','Bu destek işlemi için yetkiniz yok.',403);
 requireThat(p.type==='reopen'?['resolved','closed'].includes(ticket.state):p.type==='confirm'?ticket.state==='resolved':ticket.state==='open','support_state','Destek durumuna uygun işlem seçin.',409);
 if(p.type==='confirm')requireThat(p.confirm===true,'support_confirm','Çözümün size ulaştığını ve kaydı kapatmak istediğinizi açıkça teyit edin.');
 if(p.type==='escalate')requireThat(targets(s,a.tenant,ticket).includes(p.category),'support_queue','Bu kayıt sürümünün izin verdiği farklı yetkili kuyruğu seçin.');
 // An event only changes the support projection. No academic/grade command runs.
 return put('support-event',{id:id(),unit:ticket.unit,owner:ticket.owner,ticketId:ticket.id,type:p.type,message:p.message,category:p.type==='escalate'?p.category:ticket.category,revision:ticket.revision+1,agentResponse:agent&&!owner&&['reply','resolve'].includes(p.type),...(p.type==='reopen'?{servicePolicy:bindSupportPolicy(s,a.tenant,ticket.unit,now)}:{}),...(p.type==='confirm'?{confirmed:true}:{})});
}
