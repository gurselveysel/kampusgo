import {requireThat,hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
import {paymentEvents} from './payment-labels.mjs';
export const paymentDigest=value=>hash(stableStringify(value));
export const paymentAmount=value=>Number.isSafeInteger(value)&&value>0&&value<=100000000;
export function paymentProjection(order,refunds,events){
 let state='created',captured=0;const refundStates=new Map(refunds.map(r=>[r.id,{...r,state:'requested'}])),disputes=new Map();
 for(const event of events){
  if(['pending','captured','failed'].includes(event.type)){state=event.type;if(event.type==='captured')captured=event.amountMinor;}
  else if(event.type.startsWith('refund_')){const r=refundStates.get(event.operationId);requireThat(r,'payment_integrity','İade dayanağı eksik.',409);r.state=event.type.slice(7);}
  else if(event.type==='dispute_open')disputes.set(event.operationId,{id:event.operationId,amountMinor:event.amountMinor,state:'open'});
  else if(event.type.startsWith('dispute_')){const d=disputes.get(event.operationId);requireThat(d,'payment_integrity','Ters ibraz dayanağı eksik.',409);d.state=event.type.slice(8);}
 }
 const sum=(items,states)=>[...items.values()].filter(r=>states.includes(r.state)).reduce((n,r)=>n+r.amountMinor,0);
 const refunded=sum(refundStates,['succeeded']),refundHeld=sum(refundStates,['requested','pending']),disputeHeld=sum(disputes,['open']),chargedBack=sum(disputes,['lost']),available=captured-refunded-refundHeld-disputeHeld-chargedBack;
 requireThat(available>=0,'payment_integrity','Tutarlar işlem bakiyesini aşıyor.',409);
 const totals={captured,refunded,refundHeld,disputeHeld,chargedBack,available};
 const revision=refunds.length+events.length,pending=['created','pending'].includes(state)||refundHeld>0||disputeHeld>0;
 const snapshot={orderId:order.id,orderDigest:paymentDigest(order),revision,state,totals,refunds:refunds.map(paymentDigest),events:events.map(paymentDigest)};
 return {state,totals,revision,pending,refunds:[...refundStates.values()],disputes:[...disputes.values()],snapshotDigest:paymentDigest(snapshot)};
}
// Normalized synthetic event contract. Real PSP ordering/deduplication adapters are separate.
export function validatePaymentEvent(order,current,input){
 requireThat(Object.hasOwn(paymentEvents,input.type),'payment_event','Geçerli sentetik sağlayıcı olayı seçin.');
 const same=()=>requireThat(input.amountMinor===order.amountMinor,'payment_amount','Ödeme tutarı sabit sipariş tutarıyla eşleşmeli.');
 if(['pending','captured','failed'].includes(input.type)){
  requireThat(input.operationId===order.checkoutReference,'payment_reference','Olay aynı ödeme belirtecine bağlı olmalı.');same();
  requireThat(input.type==='pending'?current.state==='created':['created','pending'].includes(current.state),'payment_transition','Bu ödeme sonucu güncel duruma uygulanamaz.',409);return;
 }
 if(input.type.startsWith('refund_')){
  const refund=current.refunds.find(r=>r.id===input.operationId);requireThat(refund,'payment_reference','Aynı siparişte yetkili iade talebi gerekli.',404);requireThat(input.amountMinor===refund.amountMinor,'payment_amount','İade tutarı talep tutarıyla eşleşmeli.');
  const allowed={refund_pending:['requested'],refund_succeeded:['requested','pending'],refund_failed:['requested','pending','succeeded'],refund_reversed:['succeeded']};
  requireThat(allowed[input.type].includes(refund.state),'payment_transition','İade sonucu güncel talep durumuyla eşleşmiyor.',409);return;
 }
 const dispute=current.disputes.find(d=>d.id===input.operationId);
 if(input.type==='dispute_open'){
  requireThat(current.state==='captured'&&!dispute&&paymentAmount(input.amountMinor)&&input.amountMinor<=current.totals.available,'payment_balance','Ters ibraz tutarı kullanılabilir bakiyeyi aşıyor veya aynı inceleme zaten var.',409);return;
 }
 requireThat(dispute&&input.amountMinor===dispute.amountMinor,'payment_reference','Aynı ters ibraz ve tutar gerekli.',404);
 requireThat(input.type==='dispute_reversed'?dispute.state==='lost':dispute.state==='open','payment_transition','Ters ibraz sonucu mevcut duruma uygun değil.',409);
}
