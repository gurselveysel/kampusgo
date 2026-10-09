import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,loadState,transition,eligibility,credentialJSON,badgeData} from './state.mjs';

test('Bozuk veya eski tarayıcı kaydı güvenle yenilenir',()=>{
  for(const raw of ['bozuk', '{}', '{"version":1}'])assert.equal(loadState({getItem:()=>raw}).version,2);
  assert.equal(loadState({getItem:()=>{throw Error('kapalı')}}).courses.length,4);
});
test('Öğrenme çıktısı ortak matrise eklenir, ilk veri değişmez ve tekrar önlenir',()=>{
 const original=initialState(),request=original.requests[0];
 const action={type:'outcome',payload:{course:request.course,text:'Veri kümelerindeki tutarsızlıkları açıklayabilir.',level:'Analiz',evidence:'Vaka analizi'}};
 const next=transition(original,action);
 assert.equal(next.courses.find(c=>c.id===request.course).outcomes.length,3);
 assert.equal(original.courses.find(c=>c.id===request.course).outcomes.length,2);
 assert.throws(()=>transition(next,action),/zaten tanımlı/);
});
test('Kurula sevk politika kontrolü gerektirir ve ikinci işlem engellenir',()=>{
 const s=initialState();assert.equal(eligibility(s.requests[0],s.policy),true);assert.equal(eligibility(s.requests[1],s.policy),false);
 assert.throws(()=>transition(s,{type:'request',payload:{id:s.requests[1].id,status:'board'}}),/politika/);
 assert.throws(()=>transition(s,{type:'request',payload:{id:s.requests[1].id,status:'rejected'}}),/gerekçe/);
 const next=transition(s,{type:'request',payload:{id:s.requests[0].id,status:'board'}});
 assert.equal(next.requests[0].status,'board');assert.equal(next.policy.recognizedEcts,20);
 assert.throws(()=>transition(next,{type:'request',payload:{id:s.requests[0].id,status:'board'}}),/daha önce/);
});
test('Aktarım provası hata sonrası yeniden denenir ve tamamlanan işlem tekrarlanmaz',()=>{
 let s=transition(initialState(),{type:'sync',payload:{id:'q1',fail:true}});
 assert.equal(s.queue[0].status,'failed');
 s=transition(s,{type:'sync',payload:{id:'q1',fail:false}});
 assert.equal(s.queue[0].status,'done');assert.equal(s.queue[0].attempts,2);
 assert.throws(()=>transition(s,{type:'sync',payload:{id:'q1'}}),/zaten tamamlandı/);
 let failed=initialState();for(let i=0;i<3;i++)failed=transition(failed,{type:'sync',payload:{id:'q1',fail:true}});
 assert.throws(()=>transition(failed,{type:'sync',payload:{id:'q1'}}),/Üç deneme/);
});
test('Gözetim incelemesi gerekçesiz kapanmaz',()=>{
 assert.throws(()=>transition(initialState(),{type:'review',payload:{id:'ev1'}}),/notu/);
 const s=transition(initialState(),{type:'review',payload:{id:'ev1',note:'Örnek olay incelendi.'}});
 assert.equal(s.events[0].status,'reviewed');
});
test('Rozet çıktısı açıkça imzasız örnektir ve e-Devlet taslağı tekildir',()=>{
 const data=credentialJSON(badgeData[0]);assert.equal(data.demo,true);assert.equal(data.proof,undefined);assert.match(data.imzaDurumu,/İmzalanmamış/);
 const action={type:'badge-queue',payload:badgeData[0]},s=transition(initialState(),action);
 assert.equal(s.queue.at(-1).target,'e-Devlet');assert.throws(()=>transition(s,action),/zaten var/);
});
