import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localAdviceSetup,adviceReason as reason} from './helpers/local-advice.mjs';
import {hash} from '../myys/store.mjs';
const view=(f,who='student')=>f.core.view(f.context(who)).advice;
const academic=f=>hash(JSON.stringify(f.s.db.prepare("SELECT * FROM records WHERE kind IN ('program','enrollment','evidence','assessment','decision','issuance','signed') ORDER BY rowid").all()));
const compare=(f,x,patch={})=>f.run('publisher','advice-compare',{sampleId:x.sample.id,expertScores:[{criterionId:'R1',score:3,reason}],reason,...patch});
const contest=(f,x)=>f.run('student','advice-contest',{sampleId:x.sample.id,comparisonId:x.comparison.id,reason});
const resolve=(f,x,i,outcome='corrected')=>f.run('reviewer','advice-resolve',{sampleId:x.sample.id,contestId:i.id,outcome,...(outcome==='corrected'?{correctedScores:[{criterionId:'R1',score:4,reason}]}:{}),reason});

test('Protokol incelenmiş hak/veri akışı, tam amaç ve ayrı görev gerektirir',()=>use(f=>{
 const x=localAdviceSetup(f,{prepared:false});
 for(const patch of [{purpose:'Başka amaç için içerik kullanımı talebi.'},{sourceReference:'https://another.invalid/content'},{dataFlowId:x.input.contentRightsId},{expertPersonId:'author'},{syntheticOnly:false},{language:'en'},{automaticDecision:true},{validUntil:'2099-01-01T00:00:00.000Z'}])assert.throws(()=>f.run('admin','advice-protocol',{...x.input,...patch}));
 const p=f.run('admin','advice-protocol',x.input);assert.equal(p.providerConnected,false);assert.equal(p.providerPlanLanguageVerified,false);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','admin');
 assert.throws(()=>f.run('admin','advice-protocol-review',{protocolId:p.id,outcome:'accepted',reason}),e=>e.code==='separation');
 f.run('reviewer','advice-protocol-review',{protocolId:p.id,outcome:'accepted',reason});assert.equal(view(f,'admin').protocols[0].ready,true);
}));
test('Kıyas yalnız atanmış ayrı uzmanla tam rubrik ve sunucuda hesaplanan farkları kaydeder',()=>use(f=>{
 const x=localAdviceSetup(f),before=academic(f);
 assert.throws(()=>f.run('judge','advice-compare',{sampleId:x.sample.id,expertScores:[{criterionId:'R1',score:3,reason}],reason}),e=>e.code==='separation');
 for(const patch of [{expertScores:[]},{expertScores:[{criterionId:'R1',score:3,reason},{criterionId:'R1',score:2,reason}]},{expertScores:[{criterionId:'R1',score:4.2,reason}]},{expertScores:[{criterionId:'R1',score:3,reason,autoApply:true}]},{score:100}])assert.throws(()=>compare(f,x,patch));
 const c=compare(f,x);assert.equal(c.rows[0].baselineScore,4);assert.equal(c.rows[0].suggestionScore,1);assert.equal(c.rows[0].score,3);assert.equal(c.rows[0].suggestionDelta,-2);assert.equal(c.rows[0].baselineDelta,1);assert.equal(c.metrics.meanAbsoluteSuggestionDelta,2);assert.equal(c.metrics.sampleCount,1);assert.equal(c.providerEfficacyVerified,false);assert.equal(academic(f),before);
}));
test('Öneri otomatik not/başarı/ret alanlarını ve başka programın değerlendirmesini reddeder',()=>use(f=>{
 const x=localAdviceSetup(f,{sampled:false}),before=academic(f);
 for(const patch of [{syntheticConfirmed:false},{suggestion:[]},{outcome:'rejected'},{autoApply:true},{suggestion:[{criterionId:'R1',score:0,reason,decision:'failed'}]}])assert.throws(()=>f.run('teacher','advice-sample',{...x.sampleInput,...patch}));
 f.run('teacher','advice-sample',x.sampleInput);assert.equal(academic(f),before);assert.equal(view(f).samples[0].origin,'manual-synthetic');
 const second=f.run('author','program',{...x.p,code:'P2'});f.run('publisher','publish',{programId:second.id,reason});const e=f.run('author','enroll',{programId:second.id,learnerId:'student'}),a=f.assess({e}).a;
 assert.throws(()=>f.run('teacher','advice-sample',{...x.sampleInput,assessmentId:a.id}),e=>e.status===404);
}));
test('Öğrenenin kıyas itirazı bağımsız insan düzeltmesiyle kapanır; eski kıyas ve akademik arşiv korunur',()=>use(f=>{
 const x=localAdviceSetup(f,{compared:true}),before=academic(f),old=hash(JSON.stringify(x.comparison)),i=contest(f,x);
 assert.throws(()=>f.run('other','advice-contest',{sampleId:x.sample.id,comparisonId:x.comparison.id,reason}),e=>e.status===404||e.status===403);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["commission","quality"]','publisher');
 assert.throws(()=>f.run('publisher','advice-resolve',{sampleId:x.sample.id,contestId:i.id,outcome:'retained',reason}),e=>e.code==='separation');
 const r=resolve(f,x,i);assert.equal(r.correctedScores[0].score,4);assert.equal(r.academicRecordsChanged,false);assert.equal(hash(JSON.stringify(f.s.get('test-gazi','advice-compare',x.comparison.id))),old);assert.equal(academic(f),before);assert.equal(view(f).samples[0].contest.resolution.id,r.id);assert.throws(()=>resolve(f,x,i),e=>e.code==='advice_resolution');
}));
test('Durdurulmuş veya süresi bitmiş protokol yeni kıyası kapatır; itiraz çözümü açık kalır',()=>use(f=>{
 const x=localAdviceSetup(f,{compared:true}),i=contest(f,x);f.run('reviewer','advice-protocol-hold',{protocolId:x.protocol.id,reason});
 assert.equal(view(f).samples[0].current,false);resolve(f,x,i,'withdrawn');assert.equal(view(f).samples[0].contest.resolution.outcome,'withdrawn');
 const p=f.run('admin','advice-protocol',{...x.input,previousId:x.protocol.id,changeReason:reason});f.run('reviewer','advice-protocol-review',{protocolId:p.id,outcome:'accepted',reason});
 const sample=f.run('teacher','advice-sample',{...x.sampleInput,protocolId:p.id});f.core.clock=()=>new Date(Date.parse(p.validUntil)+1).toISOString();assert.throws(()=>compare(f,{sample}),e=>e.code==='advice_closed');assert.equal(view(f,'admin').protocols.some(p=>p.ready),false);
}));
test('Yeni protokol taslağı önceki kabulü silmez; kabul sürümü değişirse eski örneğe yeni kıyas kapalı',()=>use(f=>{
 const x=localAdviceSetup(f),p=f.run('admin','advice-protocol',{...x.input,previousId:x.protocol.id,changeReason:reason});assert.equal(view(f).samples[0].current,true);
 f.run('reviewer','advice-protocol-review',{protocolId:p.id,outcome:'accepted',reason});assert.equal(view(f).samples[0].canCompare,false);assert.throws(()=>compare(f,x),e=>e.code==='advice_closed');
 const sample=f.run('teacher','advice-sample',{...x.sampleInput,protocolId:p.id});compare(f,{sample});assert.equal(view(f).samples.length,2);
}));
test('Sabit kanıt kaydı değiştirilemez; öneri ve kıyas özgün dayanağı korur',()=>use(f=>{
 const x=localAdviceSetup(f),before=academic(f);assert.throws(()=>f.s.db.prepare("UPDATE records SET data=json_set(data,'$.content',?) WHERE id=?").run('Değişmiş sentetik kanıt metni',x.ev.id),/immutable/);
 compare(f,x);assert.equal(academic(f),before);assert.equal(view(f).samples[0].current,true);assert.equal(view(f).samples[0].suggestion[0].score,1);
}));
test('Başka öğrenen, teknik görev, yönetici ve başka birim kişisel kıyas kaydı göremez',()=>use(f=>{
 const x=localAdviceSetup(f,{compared:true});contest(f,x);
 for(const who of ['other','it','admin'])assert.equal(view(f,who).samples.length,0);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('another-unit','publisher');assert.equal(view(f,'publisher').samples.length,0);assert.throws(()=>compare(f,x),e=>e.status===404);assert.equal(view(f,'student').programs.length,0);assert.equal(view(f,'student').registries.length,0);
}));
test('MFA ve uzman üyeliği her işlemde denetlenir; eski komut başka role taşınmaz',()=>use(f=>{
 const x=localAdviceSetup(f,{sampled:false});f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('teacher'));
 assert.throws(()=>f.run('teacher','advice-sample',x.sampleInput),e=>e.status===404);f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE session_hash=?').run(hash('teacher'));
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('publisher');assert.throws(()=>f.run('teacher','advice-sample',x.sampleInput),e=>e.code==='advice_expert');
 f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run('publisher');const r=f.run('teacher','advice-sample',x.sampleInput,'one-advice');assert.equal(f.run('teacher','advice-sample',x.sampleInput,'one-advice').id,r.id);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it"]','teacher');assert.throws(()=>f.run('teacher','advice-sample',x.sampleInput,'one-advice'),e=>e.status===403);
}));
test('Örnek, kıyas ve itiraz tekrarları tekildir; başarısız denetim kaydı atomik geri alınır',()=>use(f=>{
 const x=localAdviceSetup(f);assert.throws(()=>f.run('teacher','advice-sample',x.sampleInput),e=>e.code==='duplicate');
 f.s.db.exec("CREATE TRIGGER advice_audit_fail BEFORE INSERT ON audit WHEN NEW.action='advice-compare' BEGIN SELECT RAISE(ABORT,'synthetic'); END");assert.throws(()=>compare(f,x));assert.equal(view(f).samples[0].comparison,null);
 f.s.db.exec('DROP TRIGGER advice_audit_fail');x.comparison=compare(f,x);assert.throws(()=>compare(f,x),e=>e.code==='duplicate');const i=contest(f,x);assert.throws(()=>contest(f,x),e=>e.code==='advice_contest');resolve(f,x,i,'retained');
}));
test('Yerel işlem ortam değişkeniyle üretimde açılamaz',()=>use(f=>{
 const x=localAdviceSetup(f,{prepared:false}),old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>f.run('admin','advice-protocol',x.input),e=>e.code==='local_only');}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('Çok ölçütlü kıyasta fark paydası rubrik ölçüt sayısıdır; başarı yüzdesi üretilmez',()=>use(f=>{
 const original=f.program(),p=f.run('author','program',{...original,code:'P02',rubric:[{id:'R1',outcomeId:'O1',weight:40},{id:'R2',outcomeId:'O1',weight:60}]});f.run('publisher','publish',{programId:p.id,reason});const e=f.run('author','enroll',{programId:p.id,learnerId:'student'}),ev=f.run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:reason}),a=f.run('teacher','assess',{enrollmentId:e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason},{criterionId:'R2',score:2,reason}],reason});
 const x=localAdviceSetup(f,{initial:{p,e,ev,a},sampled:false});x.sample=f.run('teacher','advice-sample',x.sampleInput);const c=compare(f,x,{expertScores:[{criterionId:'R2',score:2,reason},{criterionId:'R1',score:4,reason}]});assert.equal(c.metrics.criterionCount,2);assert.equal(c.metrics.meanAbsoluteSuggestionDelta,2);assert.deepEqual(c.rows.map(r=>r.criterionId),['R1','R2']);assert.equal(c.passed,undefined);assert.equal(c.accuracy,undefined);assert.equal(c.rows[0].suggestionDelta,-3);assert.equal(c.rows[1].suggestionDelta,-1);
}));
test('Kişisel veri özeti kendi öneri/itirazını kapsar; başka öğrenenin kaydını veya oturum sırrını vermez',()=>use(async f=>{
 const {subjectExport}=await import('../myys/privacy.mjs'),x=localAdviceSetup(f,{compared:true}),i=contest(f,x);resolve(f,x,i);
 const mine=JSON.stringify(subjectExport(f.core,f.context('student'))),other=JSON.stringify(subjectExport(f.core,f.context('other')));assert.ok(mine.includes(x.sample.id));assert.ok(mine.includes(i.id));assert.equal(other.includes(x.sample.id),false);assert.equal(mine.includes(hash('student')),false);assert.equal(mine.includes('comparisonDigest'),false);
}));
