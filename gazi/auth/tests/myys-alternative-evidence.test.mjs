import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {alternativeDigest} from '../myys/alternative-evidence.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {subjectExport} from '../myys/privacy.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
const reason='Sentetik uygulama kanıtı ve yöntem dayanağı ayrıntıları incelendi.';
const proposal=(f,x,patch={})=>f.run('teacher','alternative-evidence',{enrollmentId:x.e.id,taskId:'T1',method:'oral',content:'Sentetik sözlü uygulamada eksik veriler ve seçilen yöntem gerekçelendirildi.',sourceReference:'Yerel kabul gözlem tutanağı A-01',methodReference:'Sentetik yöntem planı v1; resmî kurum kuralı değildir.',observedAt:'2026-01-01T10:00:00.000Z',reason,localOnly:true,...patch});
const moderate=(f,ev,patch={},actor='reviewer')=>f.run(actor,'evidence-moderate',{evidenceId:ev.id,basedOn:alternativeDigest(ev),outcome:'accepted',reason,verificationReference:'Sentetik gözlem tutanağı ve görev kapsamı karşılaştırıldı.',...patch});
const assess=(f,x,ev,patch={})=>f.run('teacher','assess',{enrollmentId:x.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason,...patch});
const decide=(f,a,actor='judge')=>f.run(actor,'decide',{assessmentId:a.id,outcome:'approved',reason});
const roles=(f,p,r)=>f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run(JSON.stringify(r),p);
const match=code=>e=>e.code===code;
test('B10 alternatif kanıt → bağımsız inceleme → tam rubrik → ayrı karar → belge hazırlığı ve arşiv',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x),m=moderate(f,ev),a=assess(f,x,ev),d=decide(f,a),i=f.run('issuer','issue',{decisionId:d.id});
 assert.equal(a.evidenceDigests[0].alternative.moderation.id,m.id);assert.equal(a.evidenceDigests[0].alternative.method.version,1);assert.equal(a.score,100);assert.equal(i.state,'awaiting-signature');
 const archive=decisionArchive(f.core,f.context('student'),d.id);assert.equal(archive.payload.assessment.evidenceDigests[0].alternative.moderation.reason,reason);
 const own=subjectExport(f.core,f.context('student')).payload.records;assert.equal(own['evidence-moderation'][0].id,m.id);assert.equal(own.evidence[0].alternative.method,'oral');
}));
test('İncelemesiz veya reddedilmiş alternatif kanıt değerlendirmeye ilerlemez',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);assert.throws(()=>assess(f,x,ev),match('missing_evidence'));moderate(f,ev,{outcome:'rejected'});assert.throws(()=>assess(f,x,ev),match('missing_evidence'));assert.equal(f.s.list('test-gazi','assessment').length,0);
}));
test('Alternatif kanıt null puanı, eksik kanıtı veya başarısız sonucu elle başarıya dönüştürmez',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);moderate(f,ev);assert.throws(()=>assess(f,x,ev,{evidenceIds:[]}),match('missing_evidence'));assert.throws(()=>assess(f,x,ev,{scores:[{criterionId:'R1',score:null,reason}]}),match('scores'));
 const a=assess(f,x,ev,{scores:[{criterionId:'R1',score:1,reason}],passed:true,score:100});assert.equal(a.passed,false);assert.equal(a.score,25);assert.throws(()=>decide(f,a),match('failed'));assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
test('Dört alternatif biçim yalnız kayıtlı yöntem ve bağımsız inceleme ile seçilebilir',()=>use(f=>{
 const x=f.setup();let previous;for(const method of ['oral','practical','portfolio','accessible']){const ev=proposal(f,x,{method,...(previous?{previousEvidenceId:previous.id,changeReason:reason}:{})});moderate(f,ev);assert.equal(assess(f,x,ev).evidenceDigests[0].alternative.method.method,method);previous=ev;}
}));
test('Hazırlayan, program sahibi ve öğrenen kendi kanıtını inceleyemez; moderatör nihai karar veya itiraz incelemesi yapamaz',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);roles(f,'teacher',['instructor','quality']);roles(f,'author',['coordinator','quality']);roles(f,'student',['learner','quality','instructor']);for(const person of ['teacher','author','student'])assert.throws(()=>moderate(f,ev,{},person),match('separation'));
 assert.throws(()=>f.run('student','alternative-evidence',{enrollmentId:x.e.id}),match('separation'));
 moderate(f,ev);const a=assess(f,x,ev);roles(f,'reviewer',['quality','commission','instructor']);assert.throws(()=>decide(f,a,'reviewer'),match('separation'));assert.equal(f.core.view(f.context('reviewer')).assessments[0].allowedActions.length,0);
 const d=decide(f,a),appeal=f.run('student','appeal',{decisionId:d.id,reason});assert.throws(()=>f.run('reviewer','resolve',{appealId:appeal.id,outcome:'upheld',reason}),match('separation'));
 roles(f,'authority',['quality']);const resolution=f.run('authority','resolve',{appealId:appeal.id,outcome:'reassessment',reason});assert.throws(()=>f.run('reviewer','assess',{enrollmentId:x.e.id,resolutionId:resolution.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason}),match('separation'));
}));
test('Yeni sürüm, eskimiş inceleme ve yanlış dayanak özeti reddedilir; inceleme tekildir',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);assert.throws(()=>moderate(f,ev,{basedOn:'x'.repeat(64)}),match('alternative_integrity'));assert.throws(()=>proposal(f,x),match('alternative_changed'));
 const next=proposal(f,x,{previousEvidenceId:ev.id,changeReason:reason});assert.throws(()=>moderate(f,ev),match('alternative_changed'));moderate(f,next);assert.throws(()=>moderate(f,next),match('alternative_changed'));assert.equal(next.alternative.version,2);
}));
test('Yeni incelenmiş sürüm yeni ölçmede kullanılır; eski karar ve arşiv aynı kanıt/inceleme dayanağını korur',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);moderate(f,ev);const a=assess(f,x,ev),d=decide(f,a),archive=decisionArchive(f.core,f.context('student'),d.id);
 const next=proposal(f,x,{previousEvidenceId:ev.id,changeReason:reason,method:'practical',content:'İkinci sentetik sürümde veri temizleme uygulaması doğrudan gözlendi.'});assert.ok(assess(f,x,ev));moderate(f,next);
 assert.throws(()=>assess(f,x,ev),match('missing_evidence'));assert.equal(assess(f,x,next).evidenceDigests[0].alternative.method.version,2);
 assert.equal(f.core.decisionUsable({tenant:'test-gazi'},d),true);assert.equal(decisionArchive(f.core,f.context('student'),d.id).sha256,archive.sha256);
 assert.equal(f.s.get('test-gazi','assessment',a.id).evidenceDigests[0].alternative.method.version,1);assert.deepEqual(f.core.view(f.context('student')).decisions[0].alternativeVersionUpdates,[{evidenceId:ev.id,usedVersion:1,laterVersion:2,historyChanged:false}]);
}));
test('Reddedilmiş yeni sürüm geçerli eski incelemeyi değiştirmez',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);moderate(f,ev);const next=proposal(f,x,{previousEvidenceId:ev.id,changeReason:reason});moderate(f,next,{outcome:'rejected'});assert.ok(assess(f,x,ev));assert.throws(()=>assess(f,x,next),match('missing_evidence'));
}));
test('Zaman, yöntem, yerel kapsam ve dayanak alanları doğrulanır; istemci hazır başarı beyan edemez',()=>use(f=>{
 const x=f.setup();for(const [patch,code]of [[{observedAt:'2099-01-01T00:00:00.000Z'},'alternative_time'],[{method:'automatic-pass'},'alternative_method'],[{sourceReference:''},'alternative_fields'],[{methodReference:''},'alternative_fields'],[{content:null},'alternative_fields'],[{localOnly:false},'alternative_claim'],[{grade:100},'alternative_claim'],[{verified:true},'alternative_claim']])assert.throws(()=>proposal(f,x,patch),match(code));
}));
test('Hazırlayanın görevi incelemeden önce kapanırsa kanıt kabul edilemez',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);roles(f,'teacher',['learner']);assert.throws(()=>moderate(f,ev),match('alternative_authority'));assert.equal(f.core.view(f.context('reviewer')).evidence[0].canModerate,false);
}));
test('Denetim yazımı başarısızsa moderasyon ve komut kaydı atomik geri alınır',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);f.s.db.exec("CREATE TRIGGER moderation_audit_failure BEFORE INSERT ON audit WHEN NEW.action='evidence-moderate' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");
 assert.throws(()=>moderate(f,ev),/audit unavailable/);assert.equal(f.s.list('test-gazi','evidence-moderation').length,0);f.s.db.exec('DROP TRIGGER moderation_audit_failure');assert.ok(moderate(f,ev));
}));
test('İki depo bağlantısı aynı kanıt sürümü ve incelemeyi görür; işlem kimliği tekrarı ikinci inceleme yazmaz',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x),commandId=randomUUID(),input={evidenceId:ev.id,basedOn:alternativeDigest(ev),outcome:'accepted',reason,verificationReference:reason};const m=f.run('reviewer','evidence-moderate',input,commandId);assert.equal(f.run('reviewer','evidence-moderate',input,commandId).id,m.id);
 const s=new LocalAcceptanceStore(f.path);try{assert.deepEqual(new MyysCore(s).view(f.context('student')).evidence,f.core.view(f.context('student')).evidence);}finally{s.close();}
}));
test('Alternatif inceleme snapshotı olmayan sahte değerlendirme karar veya belgeye ilerlemez',()=>use(f=>{
 const x=f.setup(),ev=proposal(f,x);moderate(f,ev);const real=assess(f,x,ev),fake={...real,id:randomUUID(),evidenceDigests:[{id:ev.id,sha256:ev.sha256}]};f.s.put('test-gazi','assessment',fake);assert.throws(()=>decide(f,fake),match('missing_evidence'));assert.equal(f.core.decisionUsable({tenant:'test-gazi'},{assessmentId:fake.id,enrollmentId:x.e.id}),false);
}));
