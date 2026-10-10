import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localRecognitionCase} from './helpers/local-recognition.mjs';
const reason='Sentetik alındı ve aktarım satırı yerel ortamda karşılaştırıldı.';
const prepare=(f,d)=>f.run('issuer','obs-prepare',{decisionId:d.id});
const ack=(f,e,patch={})=>f.run('it','obs-simulate',{eventId:e.id,receiptReference:'LOCAL-'+e.id.slice(0,12).toUpperCase(),outcome:'accepted',receivedPayloadHash:e.payloadHash,reason,...patch});
const reconcile=(f,e,r)=>f.run('issuer','obs-reconcile',{eventId:e.id,receiptId:r.id,reason});
test('yetkili karar yalnız yerel outbox hazırlar; aynı kredi ikinci olay oluşturmaz',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);assert.equal(e.simulated,true);assert.equal(e.target,'unconfigured');assert.equal(e.payload.credits,10);assert.equal(prepare(f,x.decision).id,e.id);assert.equal(f.s.list('test-gazi','obs-event').length,1);assert.equal(f.s.list('test-gazi','obs-receipt').length,0);
}));
test('aktarım rol/birim/karar sahibi ayrılığı; IT görünümü kişi ve kredi içermez',()=>use(f=>{
 const x=localRecognitionCase(f);for(const actor of ['student','it','admin','judge'])assert.throws(()=>f.run(actor,'obs-prepare',{decisionId:x.decision.id}),e=>e.code==='not_found');
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["commission","studentAffairs"]','judge');assert.throws(()=>f.run('judge','obs-prepare',{decisionId:x.decision.id}),e=>e.code==='separation');const event=prepare(f,x.decision),view=f.core.view(f.context('it')).obs.events[0];assert.equal(view.payload,undefined);assert.equal(view.credits,undefined);assert.equal(view.owner,undefined);assert.equal(f.core.view(f.context('student')).obs.events.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','it');assert.throws(()=>ack(f,event),e=>e.code==='not_found');
}));
test('alındı kabulü ve hash mutabakatı ayrı; tekrarlanan alındı etkisi tekil',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision),r=ack(f,e);assert.equal(ack(f,e).id,r.id);assert.equal(f.s.list('test-gazi','obs-reconciliation').length,0);const m=reconcile(f,e,r);assert.equal(m.outcome,'matched');assert.equal(reconcile(f,e,r).id,m.id);assert.equal(f.s.list('test-gazi','obs-reconciliation').length,1);
}));
test('red ve hash uyuşmazlığı yanlış başarı sayılmaz; farklı alındı ile yeniden sınanır',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision),rejected=ack(f,e,{outcome:'rejected',receiptReference:'LOCAL-REJECTED'});assert.equal(reconcile(f,e,rejected).outcome,'rejected');const bad=ack(f,e,{receivedPayloadHash:'b'.repeat(64),receiptReference:'LOCAL-WRONG-HASH'});assert.equal(reconcile(f,e,bad).outcome,'mismatch');const good=ack(f,e);assert.equal(reconcile(f,e,good).outcome,'matched');assert.throws(()=>ack(f,e,{outcome:'rejected'}),x=>x.code==='idempotency_conflict');
}));
test('hazırlıktan sonra itiraz kaynağı bekletir; alındı ve mutabakat kapıları yeniden denetler',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision),r=ack(f,e);f.run('student','recognition-appeal',{decisionId:x.decision.id,reason});assert.throws(()=>ack(f,e,{receiptReference:'LOCAL-SECOND'}),x=>x.code==='source_blocked');assert.equal(reconcile(f,e,r).outcome,'source-blocked');assert.equal(f.core.view(f.context('issuer')).obs.events[0].sourceUsable,false);
}));
test('yeni kredi eski mutabakatı atlayamaz; düzeltme önceki olayla bağlıdır',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);reconcile(f,e,ack(f,e));const next=x.revise(x.decision);assert.throws(()=>prepare(f,next),e=>e.code==='obs_correction');const correction=f.run('issuer','obs-correction',{eventId:e.id});assert.equal(correction.payload.operation,'replace');assert.equal(correction.payload.credits,6);assert.equal(correction.payload.previousEventId,e.id);assert.equal(f.run('issuer','obs-correction',{eventId:e.id}).id,correction.id);assert.equal(reconcile(f,correction,ack(f,correction)).outcome,'matched');
 assert.equal(f.s.list('test-gazi','obs-event').length,2);
}));
test('birden çok karar değişikliğinde en güncel karar hazırlanır ve dallanma önlenir',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);reconcile(f,e,ack(f,e));const second=x.revise(x.decision),third=x.revise(second,'judge',{outcome:'partial',credits:4,remoteCredits:2});const correction=f.run('issuer','obs-correction',{eventId:e.id});assert.equal(correction.payload.decisionId,third.id);assert.equal(correction.payload.credits,4);reconcile(f,correction,ack(f,correction));assert.throws(()=>f.run('issuer','obs-correction',{eventId:e.id}),e=>e.code==='obs_correction');
}));
test('iptal düzeltmesi sıfır krediyle bağlı; yeniden kabul eski iptal alındısını kullanmaz',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);reconcile(f,e,ack(f,e));const rejected=x.revise(x.decision,'publisher',{outcome:'rejected',credits:0,remoteCredits:0});const cancel=f.run('issuer','obs-correction',{eventId:e.id});assert.equal(cancel.payload.operation,'cancel');assert.equal(cancel.payload.credits,0);reconcile(f,cancel,ack(f,cancel));const reinstated=x.revise(rejected,'judge');const correction=f.run('issuer','obs-correction',{eventId:cancel.id});assert.equal(correction.payload.operation,'replace');assert.equal(correction.payload.decisionId,reinstated.id);assert.equal(correction.payload.previousEventId,cancel.id);
}));
test('denetim hatasında alındı yazımı geri alınır; resmî hedef/alındı iddiası kabul edilmez',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);assert.throws(()=>ack(f,e,{receiptReference:'REAL-123'}),x=>x.code==='obs_receipt');f.s.db.exec("CREATE TRIGGER fail_obs_audit BEFORE INSERT ON audit WHEN NEW.action='obs-simulate' BEGIN SELECT RAISE(ABORT,'test audit failure'); END;");assert.throws(()=>ack(f,e));assert.equal(f.s.list('test-gazi','obs-receipt').length,0);
}));

test('yerel simülasyon Vercel ortamı işaretlenirse mevcut depo ile de kapanır',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision),before=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>ack(f,e),x=>x.code==='local_only');}finally{if(before===undefined)delete process.env.VERCEL;else process.env.VERCEL=before;}assert.equal(f.s.list('test-gazi','obs-receipt').length,0);
}));
test('hazırlanmış düzeltme eskirse alındı reddedilir ve güncel düzeltme ayrı hazırlanır',()=>use(f=>{
 const x=localRecognitionCase(f),e=prepare(f,x.decision);reconcile(f,e,ack(f,e));const second=x.revise(x.decision),oldCorrection=f.run('issuer','obs-correction',{eventId:e.id}),third=x.revise(second,'judge',{outcome:'partial',credits:4,remoteCredits:2});assert.throws(()=>ack(f,oldCorrection),x=>x.code==='source_blocked');const fresh=f.run('issuer','obs-correction',{eventId:e.id});assert.notEqual(fresh.id,oldCorrection.id);assert.equal(fresh.payload.decisionId,third.id);
}));
