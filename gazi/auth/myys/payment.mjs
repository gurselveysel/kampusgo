import {LocalAcceptanceStore,requireThat} from './store.mjs';
import {validDay} from './appeal-policy-model.mjs';
import {paymentAmount,paymentDigest,paymentProjection,validatePaymentEvent} from './payment-model.mjs';

const actions=['payment-plan','payment-plan-review','payment-plan-hold','payment-checkout','payment-refund','payment-simulate','payment-reconcile'];
const role=(a,u,r)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.includes(r));
const learner=(a,u)=>a.memberships.some(m=>m.unit===u&&m.roles.includes('learner'));
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Mali akış yalnız izole sentetik provada çalışır.',503);
const review=(s,t,id)=>s.list(t,'payment-plan-review').find(r=>r.planId===id);
const held=(s,t,id)=>s.list(t,'payment-plan-hold').some(r=>r.planId===id);
const latest=(s,t,programId)=>s.list(t,'payment-plan').filter(p=>p.programId===programId).at(-1);
const kinds={'institution-authority':'authorityId','data-flow':'dataFlowId','content-rights':'contentRightsId'};
function dependencies(s,t,u,refs){return Object.entries(kinds).map(([type,key])=>{const r=s.get(t,'registry',refs?.[key]),v=r&&s.list(t,'registry-review').find(v=>v.recordId===r.id);requireThat(r?.unit===u&&r.type===type&&v?.outcome==='accepted','payment_dependencies','Aynı birimde incelenmiş yetki, veri akışı ve içerik hakkı sicili gerekli.',409);return {type,key,id:r.id,digest:paymentDigest(r),reviewId:v.id,reviewDigest:paymentDigest(v)};});}
function planReady(s,t,plan,now){return !!plan&&paymentDigest(s.get(t,'program',plan.programId))===plan.programDigest&&plan.validUntil>now&&review(s,t,plan.id)?.outcome==='accepted'&&!held(s,t,plan.id)&&review(s,t,plan.id).planDigest===paymentDigest(plan)&&plan.dependencies.every(d=>{const r=s.get(t,'registry',d.id),v=s.get(t,'registry-review',d.reviewId);return r&&v&&paymentDigest(r)===d.digest&&paymentDigest(v)===d.reviewDigest;});}
function projection(s,t,order){return paymentProjection(order,s.list(t,'payment-refund').filter(r=>r.orderId===order.id),s.list(t,'payment-event').filter(r=>r.orderId===order.id));}
const readable=(a,o)=>o.owner===a.id&&learner(a,o.unit)||['finance','it'].some(r=>role(a,o.unit,r));
const shape=(p,keys)=>requireThat(Object.keys(p).every(k=>keys.includes(k)),'payment_fields','Yalnız mali prova alanları kabul edilir; kart veya hesap bilgisi gönderilmez.');
const reference=v=>typeof v==='string'&&/^local-[A-Za-z0-9-]{8,100}$/.test(v);
export function paymentReplay(a,action,r){
 if(!actions.includes(action))return false;
 requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim tahsilatı kapalı.',503);
 const allowed=action==='payment-checkout'?r.owner===a.id&&learner(a,r.unit):role(a,r.unit,action==='payment-plan'?'admin':action==='payment-simulate'?'it':'finance');
 requireThat(allowed,'forbidden','Güncel kişi, birim ve mali işlem yetkisi gerekli.',403);return true;
}
export function paymentCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='payment-plan'){
  const program=s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,'admin'),'not_found','Kendi biriminizde program ve yönetici yetkisi gerekli.',404);
  shape(p,['programId','title','amountMinor','currency','authorityReference','taxReference','refundReference','source','dependencyIds','validUntil','previousId','changeReason','scope','official']);
  requireThat(s.list(a.tenant,'publication').some(r=>r.programId===program.id),'payment_program','İncelenmiş program sürümü gerekli.',409);
  requireThat(p.scope==='local-acceptance'&&p.official===false&&p.currency==='TRY'&&paymentAmount(p.amountMinor)&&text(p.title,5,160),'payment_plan','Açık sentetik kapsam, başlık ve pozitif tam sayı kuruş tutarı gerekli.');
  requireThat(['authorityReference','taxReference','refundReference'].every(k=>text(p[k])),'payment_terms','Tahsilat, vergi ve iade dayanaklarının yerel kapsamını açıkça yazın.');
  const source=p.source;requireThat(source&&text(source.title,5)&&text(source.reference)&&text(source.version,3,100)&&validDay(source.date)&&source.date<=now.slice(0,10)&&text(source.readScope)&&source.officialApproval===false,'payment_source','Kaynak sürümü, tarihi ve okunan kapsam gerekli; kurum onayı varsayılmaz.');
  requireThat(typeof p.validUntil==='string'&&Number.isFinite(Date.parse(p.validUntil))&&new Date(p.validUntil).toISOString()===p.validUntil&&Date.parse(p.validUntil)>Date.parse(now)&&Date.parse(p.validUntil)-Date.parse(now)<=366*86400000,'payment_expiry','En çok366günlük açık yerel geçerlilik sonu gerekli.');
  const before=latest(s,a.tenant,program.id);requireThat((p.previousId||null)===(before?.id||null)&&(!before||text(p.changeReason)),'payment_plan_changed','Güncel önceki sürüm ve değişiklik gerekçesi gerekli.',409);
  return put('payment-plan',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programDigest:paymentDigest(program),title:p.title,amountMinor:p.amountMinor,currency:p.currency,version:(before?.version||0)+1,previousId:before?.id||null,changeReason:before?p.changeReason:null,authorityReference:p.authorityReference,taxReference:p.taxReference,refundReference:p.refundReference,source:{title:source.title,reference:source.reference,version:source.version,date:source.date,readScope:source.readScope,officialApproval:false},dependencies:dependencies(s,a.tenant,program.unit,p.dependencyIds),validUntil:p.validUntil,scope:'local-acceptance',official:false,collectionAuthorized:false,providerConnected:false});
 }
 if(['payment-plan-review','payment-plan-hold'].includes(action)){
  const plan=s.get(a.tenant,'payment-plan',p.planId);requireThat(plan&&role(a,plan.unit,'finance'),'not_found','Aynı birimde mali işler yetkisi gerekli.',404);requireThat(a.id!==plan.createdBy,'separation','Mali koşulları hazırlayandan ayrı inceleme gerekli.',403);requireThat(text(p.reason),'payment_reason','Mali inceleme gerekçesi gerekli.');
  if(action==='payment-plan-hold'){requireThat(review(s,a.tenant,plan.id)?.outcome==='accepted'&&!held(s,a.tenant,plan.id),'payment_plan_changed','Durdurulmamış incelenmiş sürüm gerekli.',409);return put('payment-plan-hold',{id:id(),unit:plan.unit,owner:plan.owner,planId:plan.id,reason:p.reason,existingOrdersChanged:false,official:false});}
  requireThat(latest(s,a.tenant,plan.programId)?.id===plan.id&&!review(s,a.tenant,plan.id)&&['accepted','rejected'].includes(p.outcome),'payment_plan_changed','Güncel incelenmemiş sürüm ve açık sonuç gerekli.',409);requireThat(p.outcome==='rejected'||plan.validUntil>now,'payment_expiry','Süresi geçmiş mali koşul kabul edilemez.',409);
  return put('payment-plan-review',{id:id(),unit:plan.unit,owner:plan.owner,planId:plan.id,planDigest:paymentDigest(plan),outcome:p.outcome,reason:p.reason,official:false});
 }
 if(action==='payment-checkout'){
  shape(p,['enrollmentId','confirm']);const enrollment=s.get(a.tenant,'enrollment',p.enrollmentId);requireThat(enrollment&&enrollment.owner===a.id&&learner(a,enrollment.unit),'not_found','Yalnız kendi program kaydınız için mali prova açabilirsiniz.',404);requireThat(p.confirm===true,'payment_confirm','Gerçek ödeme yapılmadığını açıkça teyit edin.');
  const existing=s.list(a.tenant,'payment-order').find(o=>o.enrollmentId===enrollment.id);if(existing)return existing; // One obligation per learner/program enrollment; a repeated click cannot charge again.
  const plan=latest(s,a.tenant,enrollment.programId);requireThat(planReady(s,a.tenant,plan,now),'payment_plan_closed','İncelenmiş güncel mali koşul bulunmadığından yeni ödeme provası kapalı.',409);
  return put('payment-order',{id:id(),unit:enrollment.unit,owner:a.id,enrollmentId:enrollment.id,programId:enrollment.programId,planId:plan.id,planVersion:plan.version,planDigest:paymentDigest(plan),amountMinor:plan.amountMinor,currency:plan.currency,provider:'local-simulator/1',checkoutReference:'local-'+id(),scope:'local-acceptance',official:false,collectionAuthorized:false,cardDataReceived:false,externalSubmitted:false});
 }
 const order=s.get(a.tenant,'payment-order',p.orderId),required=action==='payment-simulate'?'it':'finance';requireThat(order&&role(a,order.unit,required),'not_found','Aynı birimde ilgili mali prova görevi gerekli.',404);
 const current=projection(s,a.tenant,order);
 const lastTime=[order,...s.list(a.tenant,'payment-refund').filter(r=>r.orderId===order.id),...s.list(a.tenant,'payment-event').filter(r=>r.orderId===order.id)].reduce((n,r)=>Math.max(n,Date.parse(r.createdAt)),0);requireThat(Date.parse(now)>=lastTime,'payment_clock','Sunucu zamanı mali tarihçenin gerisine gidemez.',409);
 if(action==='payment-simulate'){
  shape(p,['orderId','expectedRevision','eventId','operationId','type','amountMinor','currency','checkoutReference','reason']);
  requireThat(reference(p.eventId)&&reference(p.operationId)&&p.checkoutReference===order.checkoutReference&&p.currency===order.currency&&paymentAmount(p.amountMinor)&&text(p.reason),'payment_packet','Sentetik olay/işlem kimliği, ödeme belirteci, tutar ve gerekçe eşleşmeli.');
  const normalized={provider:order.provider,orderId:order.id,checkoutReference:p.checkoutReference,eventId:p.eventId,operationId:p.operationId,type:p.type,amountMinor:p.amountMinor,currency:p.currency},digest=paymentDigest(normalized),prior=s.get(a.tenant,'payment-receipt',p.eventId);
  if(prior){requireThat(prior.normalizedDigest===digest,'payment_event_conflict','Aynı sağlayıcı olay kimliği farklı içerikle kullanılamaz.',409);return s.get(a.tenant,'payment-event',prior.eventRecordId);}
  const receipt=event=>{put('payment-receipt',{id:p.eventId,unit:order.unit,owner:order.owner,orderId:order.id,eventRecordId:event.id,normalizedDigest:digest,scope:'local-acceptance',official:false});return event;};
  const semantic=s.list(a.tenant,'payment-event').find(e=>e.orderId===order.id&&e.operationId===p.operationId&&e.type===p.type);
  if(semantic){requireThat(semantic.amountMinor===p.amountMinor&&semantic.currency===p.currency,'payment_event_conflict','Aynı mali durum farklı tutarla tekrar edilemez.',409);return receipt(semantic);}
  requireThat(p.expectedRevision===current.revision,'payment_changed','Mali işlem sırası değişti; güncel durumu yenileyin.',409);
  validatePaymentEvent(order,current,p);
  return receipt(put('payment-event',{id:id(),unit:order.unit,owner:order.owner,orderId:order.id,providerEventId:p.eventId,operationId:p.operationId,type:p.type,amountMinor:p.amountMinor,currency:p.currency,normalizedDigest:digest,reason:p.reason,providerSequence:s.list(a.tenant,'payment-event').filter(e=>e.orderId===order.id).length+1,scope:'local-acceptance',simulated:true,externalVerified:false,official:false}));
 }
 requireThat(Number.isInteger(p.expectedRevision)&&p.expectedRevision===current.revision,'payment_changed','Mali işlem değişti; güncel durumu yenileyin.',409);requireThat(text(p.reason),'payment_reason','Gerekçeli mali inceleme gerekli.');
 if(action==='payment-refund'){
  shape(p,['orderId','expectedRevision','amountMinor','reason']);requireThat(current.state==='captured'&&paymentAmount(p.amountMinor)&&p.amountMinor<=current.totals.available,'payment_balance','İade tutarı bekleyen/önceki iade ve ters ibrazlar sonrası kullanılabilir bakiyeyi aşamaz.',409);
  return put('payment-refund',{id:'local-'+id(),unit:order.unit,owner:order.owner,orderId:order.id,amountMinor:p.amountMinor,currency:order.currency,reason:p.reason,scope:'local-acceptance',official:false,externalSubmitted:false});
 }
 requireThat(!s.list(a.tenant,'payment-event').some(e=>e.orderId===order.id&&e.createdBy===a.id),'separation','Sağlayıcı olayını oluşturan kişi kendi mali mutabakatını onaylayamaz.',403);
 shape(p,['orderId','expectedRevision','snapshotDigest','observedTotals','outcome','reason']);requireThat(p.snapshotDigest===current.snapshotDigest,'payment_changed','Güncel işlem dayanağı gerekli.',409);
 const keys=Object.keys(current.totals),values=p.observedTotals;requireThat(values&&Object.keys(values).length===keys.length&&keys.every(k=>Number.isSafeInteger(values[k])&&values[k]>=0&&values[k]<=100000000),'payment_totals','Her mali toplam için geçerli tam sayı kuruş gerekli.');
 const equal=keys.every(k=>values[k]===current.totals[k]);requireThat(['matched','pending','difference'].includes(p.outcome)&&(p.outcome==='difference'?!equal:p.outcome==='pending'?equal&&current.pending:equal&&!current.pending),'payment_reconcile','Mutabakat sonucu kaynak tutarı ve bekleyen işlemlerle eşleşmiyor.',409);
 return put('payment-reconciliation',{id:id(),unit:order.unit,owner:order.owner,orderId:order.id,snapshotDigest:current.snapshotDigest,revision:current.revision,expectedTotals:current.totals,observedTotals:Object.fromEntries(keys.map(k=>[k,values[k]])),outcome:p.outcome,reason:p.reason,scope:'local-acceptance',official:false,bankSettlementVerified:false});
}
export function paymentView(s,a,now){
 const plans=s.list(a.tenant,'payment-plan').filter(p=>['admin','finance','it'].some(r=>role(a,p.unit,r))||s.list(a.tenant,'enrollment').some(e=>e.programId===p.programId&&e.owner===a.id&&learner(a,e.unit))).map(p=>{const r=review(s,a.tenant,p.id),current=latest(s,a.tenant,p.programId)?.id===p.id;return {...p,programTitle:s.get(a.tenant,'program',p.programId)?.title||p.programId,review:r||null,current,held:held(s,a.tenant,p.id),canCheckout:current&&planReady(s,a.tenant,p,now),canReview:current&&!r&&role(a,p.unit,'finance')&&p.createdBy!==a.id,canHold:r?.outcome==='accepted'&&!held(s,a.tenant,p.id)&&role(a,p.unit,'finance')&&p.createdBy!==a.id};});
 const orders=s.list(a.tenant,'payment-order').filter(o=>readable(a,o)).map(o=>{const current=projection(s,a.tenant,o),reviews=s.list(a.tenant,'payment-reconciliation').filter(r=>r.orderId===o.id);return {...o,programTitle:s.get(a.tenant,'program',o.programId)?.title||o.programId,...current,events:s.list(a.tenant,'payment-event').filter(e=>e.orderId===o.id),reconciliations:reviews.map(r=>({...r,current:r.id===reviews.at(-1)?.id&&r.snapshotDigest===current.snapshotDigest})),canSimulate:role(a,o.unit,'it'),canRefund:role(a,o.unit,'finance')&&current.state==='captured'&&current.totals.available>0,canReconcile:role(a,o.unit,'finance')&&!s.list(a.tenant,'payment-event').some(e=>e.orderId===o.id&&e.createdBy===a.id)};});
 const programs=s.list(a.tenant,'program').filter(p=>role(a,p.unit,'admin')&&s.list(a.tenant,'publication').some(x=>x.programId===p.id)).map(p=>({id:p.id,unit:p.unit,title:p.title,version:p.version}));
 return {programs,plans,orders,official:false,providerConnected:false,collectionAuthorized:false};
}
