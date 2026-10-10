import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {recognitionLimits,recognitionLedger} from '../myys/recognition.mjs';
import {hash} from '../myys/store.mjs';
const reason='Sentetik başvuru ve kazanımlar insan tarafından incelendi.';
import {localRecognitionPolicy as policyInput} from './helpers/local-recognition.mjs';
const setup=f=>{const {e}=f.setup(),p=f.run('admin','recognition-policy',policyInput);f.run('publisher','recognition-policy-review',{policyId:p.id,outcome:'accepted',reason});return {e,p};};
const request=(f,x,patch={})=>f.run('student','recognition-request',{enrollmentId:x.e.id,policyId:x.p.id,sourceTitle:'Sentetik dış eğitim belgesi',sourceIssuer:'Test sağlayıcı',sourceCredentialId:'TEST-CREDENTIAL-1',sourceOutcomeKey:'SOURCE-O1',sourceDigest:hash('synthetic-document'),targetCourseCode:'COURSE-1',mappingReason:reason,requestedCredits:10,remoteCredits:5,...patch});
const technical=(f,r,outcome='accepted')=>f.run('it','recognition-technical',{requestId:r.id,outcome,method:'issuer-record-reviewed',reportReference:'Sentetik kaynak inceleme raporu',reason});
const decide=(f,r,patch={},actor='judge')=>f.run(actor,'recognition-decide',{requestId:r.id,outcome:'full',credits:r.requestedCredits,remoteCredits:r.remoteCredits,reason,authorityReference:'Yerel kabul kurulu kayıt referansı',gainKey:'GAIN-1',priorCourseChecked:true,priorCourseReference:'Sentetik önceki ders incelemesi',...patch});
test('politika paydaları ayrı; uzaktan oran mezuniyet kredisine bölünmez',()=>{
 assert.deepEqual(recognitionLimits(policyInput,{credit:10,remoteCredit:5,existing:14}),{credit:{numerator:24,denominator:240,capPercent:10},remote:{numerator:5,denominator:10,capPercent:50}});
 assert.throws(()=>recognitionLimits(policyInput,{credit:10,remoteCredit:6,existing:0}),e=>e.code==='remote_cap');assert.throws(()=>recognitionLimits(policyInput,{credit:10,remoteCredit:5,existing:14.01}),e=>e.code==='credit_cap');assert.throws(()=>recognitionLimits({...policyInput,remoteDenominator:'graduation-credits'},{credit:10,remoteCredit:0,existing:0}),e=>e.code==='denominator');
});
test('kaynak veya doğru payda olmadan politika oluşturulamaz; hazırlayan onaylayamaz',()=>use(f=>{
 assert.throws(()=>f.run('admin','recognition-policy',{...policyInput,sourceArticle:''}),e=>e.code==='recognition_policy');assert.throws(()=>f.run('admin','recognition-policy',{...policyInput,remoteDenominator:'graduation-credits'}),e=>e.code==='denominator');const p=f.run('admin','recognition-policy',policyInput);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","commission"]','admin');assert.throws(()=>f.run('admin','recognition-policy-review',{policyId:p.id,outcome:'accepted',reason}),e=>e.code==='separation');
}));
test('talep gerçek aynı kişi kaydına bağlı; teknik inceleme tek başına kredi üretmez',()=>use(f=>{
 const x=setup(f),r=request(f,x);assert.throws(()=>f.run('other','recognition-request',{...r}),e=>e.code==='not_found'||e.code==='forbidden');const t=technical(f,r);assert.equal(t.automatedVerification,false);assert.equal(recognitionLedger(f.s,'test-gazi').length,0);assert.throws(()=>decide(f,r,{priorCourseChecked:false}),e=>e.code==='double_counting');
}));
test('tam tanıma yalnız ayrı insan kararıyla tek kredi oluşturur; tekrar reddedilir',()=>use(f=>{
 const x=setup(f),r=request(f,x);assert.throws(()=>decide(f,r),e=>e.code==='technical_review');technical(f,r);const d=decide(f,r);assert.equal(d.outcome,'full');assert.equal(recognitionLedger(f.s,'test-gazi').length,1);assert.throws(()=>decide(f,r),e=>e.code==='duplicate');
}));
test('kısmi ve red işlemleri kredi tutarıyla tutarlıdır; red teknik başarısızlığı aşmaz',()=>use(f=>{
 const x=setup(f),r=request(f,x);technical(f,r,'rejected');assert.throws(()=>decide(f,r),e=>e.code==='technical_review');const d=decide(f,r,{outcome:'rejected',credits:0,remoteCredits:0});assert.equal(d.credits,0);assert.equal(recognitionLedger(f.s,'test-gazi').length,0);
 const second=request(f,x,{sourceDigest:hash('other'),targetCourseCode:'COURSE-2'});technical(f,second);assert.throws(()=>decide(f,second,{outcome:'partial',credits:10}),e=>e.code==='credits');const partial=decide(f,second,{outcome:'partial',credits:4,remoteCredits:2});assert.equal(partial.credits,4);
}));
test('eşdeğer kazanım, aynı hedef ders ve aynı belge ikinci kredi oluşturamaz',()=>use(f=>{
 const x=setup(f),r=request(f,x);technical(f,r);decide(f,r);
 for(const [index,patch,decisionPatch]of [[1,{sourceDigest:hash('other'),targetCourseCode:'OTHER-COURSE'},{}],[2,{sourceDigest:hash('other2')},{gainKey:'GAIN-2'}],[3,{targetCourseCode:'THIRD-COURSE'},{gainKey:'GAIN-3'}]]){const r2=request(f,x,{sourceCredentialId:'TEST-'+index,...patch});technical(f,r2);assert.throws(()=>decide(f,r2,decisionPatch),e=>e.code==='double_counting');}
 assert.equal(recognitionLedger(f.s,'test-gazi').length,1);
}));
test('itiraz kredi satırını bekletir; bağımsız yeniden karar eski satırı atomik tersler',()=>use(f=>{
 const x=setup(f),r=request(f,x);technical(f,r);const d=decide(f,r),appeal=f.run('student','recognition-appeal',{decisionId:d.id,reason});assert.equal(f.core.view(f.context('student')).recognition.credits[0].held,true);
 const res=f.run('reviewer','recognition-resolve',{appealId:appeal.id,outcome:'reassessment',reason});assert.throws(()=>decide(f,r,{outcome:'partial',credits:6,remoteCredits:3,resolutionId:res.id}),e=>e.code==='separation');
 const next=decide(f,r,{outcome:'partial',credits:6,remoteCredits:3,resolutionId:res.id},'publisher');assert.equal(next.supersedesDecisionId,d.id);const ledger=recognitionLedger(f.s,'test-gazi');assert.equal(ledger.length,1);assert.equal(ledger[0].credits,6);assert.equal(f.s.list('test-gazi','recognition-credit').length,2);assert.equal(f.s.list('test-gazi','recognition-reversal').length,1);assert.equal(f.core.view(f.context('student')).recognition.credits[0].held,false);
}));
test('teknik/karar/itiraz görevleri ayrıdır; farklı öğrenen göremez',()=>use(f=>{
 const x=setup(f),r=request(f,x);technical(f,r);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it","commission"]','it');assert.throws(()=>decide(f,r,{},'it'),e=>e.code==='separation');const d=decide(f,r),appeal=f.run('student','recognition-appeal',{decisionId:d.id,reason});f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["commission","quality"]','judge');assert.throws(()=>f.run('judge','recognition-resolve',{appealId:appeal.id,outcome:'upheld',reason}),e=>e.code==='separation');assert.equal(f.core.view(f.context('other')).recognition.requests.length,0);assert.equal(f.core.view(f.context('other')).recognition.credits.length,0);
}));
test('denetim hatasında karar ve kredi birlikte geri alınır',()=>use(f=>{
 const x=setup(f),r=request(f,x);technical(f,r);f.s.db.exec("CREATE TRIGGER fail_recognition_audit BEFORE INSERT ON audit WHEN NEW.action='recognition-decide' BEGIN SELECT RAISE(ABORT,'test audit failure'); END;");assert.throws(()=>decide(f,r));assert.equal(f.s.list('test-gazi','recognition-decision').length,0);assert.equal(recognitionLedger(f.s,'test-gazi').length,0);
}));
test('politika yeni sürümü eski başvuruyu değiştirmez ve toplam sınırı sıfırlamaz',()=>use(f=>{
 const x=setup(f),r=request(f,x,{requestedCredits:20,remoteCredits:0});technical(f,r);decide(f,r);const next=f.run('admin','recognition-policy',{...policyInput,previousPolicyId:x.p.id,changeReason:reason});f.run('publisher','recognition-policy-review',{policyId:next.id,outcome:'accepted',reason});const second=request(f,{...x,p:next},{sourceDigest:hash('new'),targetCourseCode:'COURSE-2',remoteCredits:0});technical(f,second);assert.throws(()=>decide(f,second,{gainKey:'GAIN-2'}),e=>e.code==='credit_cap');assert.equal(f.s.get('test-gazi','recognition-request',r.id).policyId,x.p.id);
}));

test('farklı belge çıktısı farklı kazanımla tanınabilir; kazanım anahtarının harf ve boşluk biçimi tekrarı aşmaz',()=>use(f=>{const x=setup(f),r=request(f,x);technical(f,r);decide(f,r);const second=request(f,x,{targetCourseCode:'COURSE-2',sourceOutcomeKey:'SOURCE-O2'});technical(f,second);assert.throws(()=>decide(f,second,{gainKey:' gain-1 '}),e=>e.code==='double_counting');decide(f,second,{gainKey:'GAIN-2'});assert.equal(recognitionLedger(f.s,'test-gazi').length,2);}));

test('politika tarihleri geçerli olmalı ve yol değişimi eski sürüme gizlenemez',()=>use(f=>{
 assert.throws(()=>f.run('admin','recognition-policy',{...policyInput,validFrom:'2026-02-30'}),e=>e.code==='recognition_policy');const x=setup(f);assert.throws(()=>f.run('admin','recognition-policy',{...policyInput,previousPolicyId:x.p.id,changeReason:reason,pathway:'rpl'}),e=>e.code==='version_conflict');
}));
test('kurum/birim kapsamı ve tekrar yetkisi güncel üyelikten denetlenir',()=>use(f=>{
 const x=setup(f),r=request(f,x),commandId='recognition-review-command';const payload={requestId:r.id,outcome:'accepted',method:'issuer-record-reviewed',reportReference:'Sentetik kaynak inceleme raporu',reason};f.run('it','recognition-technical',payload,commandId);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["finance"]','it');assert.throws(()=>f.run('it','recognition-technical',payload,commandId),e=>e.code==='forbidden');
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','judge');assert.throws(()=>decide(f,r),e=>e.code==='not_found');assert.equal(f.core.view(f.context('judge')).recognition.requests.length,0);assert.throws(()=>f.core.run({...f.context('student'),tenant:'other-tenant',commandId:'recognition-cross-tenant',action:'recognition-appeal',input:{decisionId:'fake',reason}}),e=>e.code==='identity_tenant');
}));

test("teknik incelemeci akademik karar kredi ve eşleme gerekçesini göremez",()=>use(f=>{const x=setup(f),r=request(f,x);technical(f,r);decide(f,r);const v=f.core.view(f.context("it")).recognition;assert.equal(v.decisions.length,0);assert.equal(v.credits.length,0);assert.equal(v.requests[0].technicalOnly,true);assert.equal(v.requests[0].mappingReason,undefined);assert.equal(v.requests[0].requestedCredits,undefined);}));
