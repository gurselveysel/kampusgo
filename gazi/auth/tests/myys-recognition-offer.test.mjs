import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localRecognitionOffer,offerReason as reason} from './helpers/local-recognition-offer.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {recognitionLedger,recognitionRequestUsable} from '../myys/recognition.mjs';
import {subjectExport} from '../myys/privacy.mjs';
const list=(f,kind)=>f.s.list('test-gazi',kind);
const view=f=>f.core.view(f.context('student')).recognition;
const error=code=>e=>e.code===code;
test('B20 çok dersli politika açık; tekil karar/bypass alanları kapsamı aşamaz',()=>use(f=>{
 const x=localRecognitionOffer(f);assert.equal(x.offer.rows.length,2);assert.equal(x.offer.policyDigest.length,64);
 assert.throws(()=>f.run('judge','recognition-decide',{...x.rows[0],reason,authorityReference:reason,batch:{offer:x.offer,limits:{}}}),error('offer_required'));
 const d=x.decide();assert.equal(d.credits,8);assert.equal(d.remoteCredits,4);assert.equal(d.limits.remote.denominator,8);assert.equal(d.limits.credit.denominator,240);assert.equal(recognitionLedger(f.s,'test-gazi').length,2);assert.ok(x.requests.every(r=>recognitionRequestUsable(f.s,'test-gazi',r.id)));
}));
test('B20 ders eksiltme uzaktan payı yükseltir; toplam payda ve yerel sınır sunucuda denetlenir',()=>use(f=>{
 const x=localRecognitionOffer(f);
 assert.throws(()=>x.decide('judge',{rows:[x.rows[0],{...x.rows[1],outcome:'partial',credits:2}]}),error('remote_cap'));
 assert.throws(()=>x.decide('judge',{rows:[{...x.rows[0],remoteCredits:0},x.rows[1]]}),error('remote_credit'));
 assert.throws(()=>x.decide('judge',{rows:[x.rows[0]]}),error('offer_rows'));
 assert.equal(list(f,'recognition-decision').length,0);assert.equal(recognitionLedger(f.s,'test-gazi').length,0);
}));
test('B21 aynı teklif içinde kanonik kazanım ve belge çıktısı çifte kredi doğuramaz',()=>use(f=>{
 const x=localRecognitionOffer(f);assert.throws(()=>x.decide('judge',{rows:[x.rows[0],{...x.rows[1],gainKey:' gain-0 '}]}),error('double_counting'));assert.equal(list(f,'recognition-decision').length,0);
 const get=f.s.get.bind(f.s);f.s.get=(t,k,id)=>{const r=get(t,k,id);return k==='recognition-request'&&id===x.requests[1].id?{...r,sourceOutcomeKey:'CHANGED'}:r;};assert.throws(()=>x.decide(),error('version_conflict'));f.s.get=get;
}));
test('B21 karar teknik rapor değildir; başarısız ikinci satır ilk satırı da geri alır',()=>use(f=>{
 const x=localRecognitionOffer(f,{technicalOutcomes:['accepted','rejected']});assert.throws(()=>x.decide(),error('technical_review'));assert.equal(list(f,'recognition-decision').length,0);assert.equal(list(f,'recognition-credit').length,0);
 const d=x.decide('judge',{rows:x.rows.map(r=>({...r,outcome:'rejected',credits:0,remoteCredits:0}))});assert.equal(d.credits,0);assert.equal(d.limits,null);assert.equal(list(f,'recognition-credit').length,0);
}));
test('B21 teklif itirazı tüm kredileri ve OBS hazırlığını bekletir; aynı kişi yeniden karar veremez',()=>use(f=>{
 const x=localRecognitionOffer(f),d=x.decide(),ap=x.appeal(d);assert.equal(view(f).credits.filter(c=>c.held).length,2);
 for(const key of d.rowDecisionIds)assert.throws(()=>f.run('issuer','obs-prepare',{decisionId:key}),error('source_blocked'));
 assert.throws(()=>f.run('student','recognition-appeal',{decisionId:d.rowDecisionIds[0],reason}),error('offer_required'));
 const res=x.resolve(ap);assert.equal(view(f).credits.filter(c=>c.held).length,2);
 assert.throws(()=>x.decide('judge',{previousDecisionId:d.id,resolutionId:res.id}),error('separation'));
 const next=x.decide('publisher',{previousDecisionId:d.id,resolutionId:res.id,rows:x.rows.map(r=>({...r,outcome:'partial',credits:2,remoteCredits:r.remoteCredits?2:0}))});
 assert.equal(next.supersedesDecisionId,d.id);assert.equal(next.credits,4);assert.equal(list(f,'recognition-reversal').length,2);assert.equal(recognitionLedger(f.s,'test-gazi').length,2);assert.ok(view(f).credits.every(c=>!c.held&&c.credits===2));
 assert.throws(()=>x.appeal(d),error('version_conflict'));assert.throws(()=>x.decide('publisher',{previousDecisionId:d.id,resolutionId:res.id}),error('version_conflict'));
}));
test('B21 teklif itirazını koruma bütün satırları açar; görev ayrılığı her teknik raporu kapsar',()=>use(f=>{
 const x=localRecognitionOffer(f),d=x.decide(),ap=x.appeal(d);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["commission","quality"]','judge');assert.throws(()=>f.run('judge','recognition-offer-resolve',{appealId:ap.id,outcome:'upheld',reason}),error('separation'));
 x.resolve(ap,'upheld');assert.ok(view(f).credits.every(c=>!c.held));assert.throws(()=>x.resolve(ap),error('duplicate'));
}));
test('B21 OBS mutabakatı eski satırları korur; teklif yeniden kararı ayrı replace/cancel zinciri oluşturur',()=>use(f=>{
 const x=localRecognitionOffer(f),d=x.decide(),events=d.rowDecisionIds.map(decisionId=>f.run('issuer','obs-prepare',{decisionId}));
 for(const e of events){const r=f.run('it','obs-simulate',{eventId:e.id,receiptReference:'LOCAL-OFFER-'+e.id.toUpperCase(),outcome:'accepted',receivedPayloadHash:e.payloadHash,reason});f.run('issuer','obs-reconcile',{eventId:e.id,receiptId:r.id,reason});}
 const ap=x.appeal(d),res=x.resolve(ap),rows=[{...x.rows[0],outcome:'rejected',credits:0,remoteCredits:0},x.rows[1]],next=x.decide('publisher',{previousDecisionId:d.id,resolutionId:res.id,rows});
 const corrected=events.map(e=>f.run('issuer','obs-correction',{eventId:e.id,reason}));assert.deepEqual(corrected.map(e=>e.payload.operation),['cancel','replace']);assert.equal(corrected[1].payload.credits,4);assert.ok(corrected.every(e=>next.rowDecisionIds.includes(e.payload.decisionId)));
}));
test('B20 teklifi geri çekme dersleri serbest bırakır; karar yarışında eski pencere kapalı kalır',()=>use(f=>{
 const x=localRecognitionOffer(f),s2=new LocalAcceptanceStore(f.path);try{const c2=new MyysCore(s2);f.run('student','recognition-offer-withdraw',{offerId:x.offer.id,reason});assert.throws(()=>c2.run({...f.context('judge'),commandId:'offer-race-decision',action:'recognition-offer-decide',input:x.decisionInput}),error('offer_withdrawn'));
 const next=f.run('student','recognition-offer',x.input);const d=x.decide('judge',{offerId:next.id});assert.equal(d.credits,8);assert.throws(()=>f.run('student','recognition-offer-withdraw',{offerId:next.id,reason}),error('version_conflict'));assert.equal(list(f,'recognition-offer').length,2);
 }finally{s2.close();}
}));
test('B20 farklı öğrenci/program/politika, tekrarlı veya karar verilmiş ders teklife eklenemez',()=>use(f=>{
 const x=localRecognitionOffer(f,{create:false});assert.throws(()=>f.run('other','recognition-offer',x.input),error('not_found'));assert.throws(()=>f.run('student','recognition-offer',{...x.input,requestIds:[x.requests[0].id,x.requests[0].id]}),error('offer_rows'));
 const r=x.requests[1],another={...r,id:'synthetic-other-enrollment-row',enrollmentId:'other-enrollment'};f.s.put('test-gazi','recognition-request',another);assert.throws(()=>f.run('student','recognition-offer',{...x.input,requestIds:[x.requests[0].id,another.id]}),error('offer_rows'));const o=f.run('student','recognition-offer',x.input);assert.throws(()=>f.run('student','recognition-offer',x.input),error('version_conflict'));assert.equal(o.owner,'student');
}));
test('B20 karar tekrarında güncel MFA/rol; farklı kişi ve teknik rol akademik teklifi göremez',()=>use(f=>{
 const x=localRecognitionOffer(f),cid='offer-idempotent-decision',d=x.decide('judge',{},cid);assert.equal(x.decide('judge',{},cid).id,d.id);assert.equal(list(f,'recognition-credit').length,2);
 for(const who of ['it','other']){const v=f.core.view(f.context(who)).recognition;assert.equal(v.offers.length,0);assert.equal(v.offerDecisions.length,0);}
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["finance"]','judge');assert.throws(()=>x.decide('judge',{},cid),error('forbidden'));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('student'));assert.throws(()=>x.appeal(d),e=>['not_found','forbidden'].includes(e.code));
}));
test('B21 denetim hatası karar/kredi ve toplu itiraz/incelemeyi atomik geri alır',()=>use(f=>{
 const x=localRecognitionOffer(f);f.s.db.exec("CREATE TRIGGER fail_offer BEFORE INSERT ON audit WHEN NEW.action='recognition-offer-decide' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");assert.throws(()=>x.decide());assert.equal(list(f,'recognition-decision').length,0);assert.equal(list(f,'recognition-credit').length,0);f.s.db.exec('DROP TRIGGER fail_offer');const d=x.decide();
 f.s.db.exec("CREATE TRIGGER fail_offer BEFORE INSERT ON audit WHEN NEW.action='recognition-offer-appeal' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");assert.throws(()=>x.appeal(d));assert.equal(list(f,'recognition-appeal').length,0);f.s.db.exec('DROP TRIGGER fail_offer');const ap=x.appeal(d);
 f.s.db.exec("CREATE TRIGGER fail_offer BEFORE INSERT ON audit WHEN NEW.action='recognition-offer-resolve' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");assert.throws(()=>x.resolve(ap));assert.equal(list(f,'recognition-resolution').length,0);assert.ok(view(f).credits.every(c=>c.held));
}));
test('B28 çok dersli kişinin özeti yalnız kendi bağlantılarını verir; dosya ve görevli kimliği yok',()=>use(f=>{
 const x=localRecognitionOffer(f),d=x.decide(),ap=x.appeal(d);x.resolve(ap);
 const own=subjectExport(f.core,f.context('student')).payload;assert.equal(own.records['recognition-offer'][0].rows[0].requestId,x.requests[0].id);assert.equal(own.records['recognition-offer'][0].rows[0].requestDigest,undefined);assert.equal(own.records['recognition-offer-decision'][0].rowDecisionIds.length,2);assert.equal(own.records['recognition-offer-decision'][0].createdBy,undefined);assert.equal(subjectExport(f.core,f.context('other')).payload.records['recognition-offer'].length,0);
}));

test('B21 aynı belge çıktısı farklı ders adıyla aynı teklifte tekrar sayılamaz',()=>use(f=>{const x=localRecognitionOffer(f,{requestPatch:{sourceOutcomeKey:'SAME-SOURCE-OUTCOME'}});assert.throws(()=>x.decide(),error('double_counting'));assert.equal(recognitionLedger(f.s,'test-gazi').length,0);}));
