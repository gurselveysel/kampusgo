import {requireThat} from './store.mjs';

const queues={technical:'it',academic:'quality',privacy:'admin'};
const messageOk=v=>typeof v==='string'&&v.trim().length>=20&&v.length<=6000;
const member=(actor,unit)=>actor.memberships.some(m=>m.unit===unit);
const handler=(actor,ticket,category)=>!!actor.mfa&&actor.memberships.some(m=>m.unit===ticket.unit&&m.roles.includes(queues[category]));
export function supportState(store,tenant,ticket){
 const events=store.list(tenant,'support-event').filter(e=>e.ticketId===ticket.id);
 let state='open',category=ticket.category;
 for(const e of events){if(e.type==='resolve')state='resolved';if(e.type==='reopen')state='open';if(e.type==='escalate')category=e.category;}
 return {...ticket,state,category,revision:events.length,events};
}
export function canReadSupport(actor,ticket){return ticket.owner===actor.id&&member(actor,ticket.unit)||handler(actor,ticket,ticket.category);}
function actions(actor,ticket){
 const owner=ticket.owner===actor.id&&member(actor,ticket.unit),agent=handler(actor,ticket,ticket.category);
 return ticket.state==='resolved'?(owner?['reopen']:[]):[...(owner||agent?['reply']:[]),...(agent?['resolve','escalate']:[])];
}
export function supportView(store,actor){return store.list(actor.tenant,'support').map(t=>supportState(store,actor.tenant,t)).filter(t=>canReadSupport(actor,t)).map(t=>({...t,allowedActions:actions(actor,t)}));}
export function supportReplay(store,actor,result){
 const ticket=store.get(actor.tenant,'support',result.ticketId);
 requireThat(ticket,'not_found','Destek kaydı bulunamadı.',404);
 const current=supportState(store,actor.tenant,ticket);
 const owner=actor.id===current.owner&&member(actor,current.unit),agent=handler(actor,current,current.category);
 requireThat(canReadSupport(actor,current)&&(result.type==='reopen'?owner:result.type==='reply'?owner||agent:agent),'forbidden','Güncel destek yetkisi gerekli.',403);
}
export function supportCommand({action,p,a,s,put,id}){
 if(action!=='support-event')return null;
 const record=s.get(a.tenant,'support',p.ticketId),ticket=record&&supportState(s,a.tenant,record);
 requireThat(ticket&&canReadSupport(a,ticket),'not_found','Destek kaydı bulunamadı veya erişilemiyor.',404);
 requireThat(Number.isInteger(p.expectedRevision)&&p.expectedRevision===ticket.revision,'support_conflict','Destek kaydı değişti. Son durumu yenileyin.',409);
 requireThat(['reply','resolve','reopen','escalate'].includes(p.type)&&messageOk(p.message),'support_event','Geçerli işlem ve açıklama gerekli.');
 const owner=ticket.owner===a.id&&member(a,ticket.unit),agent=handler(a,ticket,ticket.category);
 requireThat(p.type==='reopen'?owner: p.type==='reply'?owner||agent:agent,'forbidden','Bu destek işlemi için yetkiniz yok.',403);
 requireThat(p.type==='reopen'?ticket.state==='resolved':ticket.state!=='resolved','support_state','Destek durumuna uygun işlem seçin.',409);
 if(p.type==='escalate')requireThat(Object.hasOwn(queues,p.category)&&p.category!==ticket.category,'support_queue','Farklı ve geçerli bir yetkili kuyruk seçin.');
 // An event only changes the support projection. No academic/grade command runs.
 return put('support-event',{id:id(),unit:ticket.unit,owner:ticket.owner,ticketId:ticket.id,type:p.type,message:p.message,category:p.type==='escalate'?p.category:ticket.category,revision:ticket.revision+1});
}
