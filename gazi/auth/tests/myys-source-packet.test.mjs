import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {sourcePacketFixture} from './helpers/local-source-packet.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {stableStringify} from '../myys/program-model.mjs';
import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const is=code=>e=>e.code===code;
const snapshot=f=>JSON.stringify(f.s.db.prepare('SELECT * FROM records').all());

test('B09 imzası geçerli olsa da yinelenen JSON üyeleri veya farklı taşıma kodlaması reddedilir',()=>use(async f=>{
 const h=await sourcePacketFixture(f),p=h.payload(),raw=JSON.stringify(p),before=snapshot(f);
 for(const text of [raw.replace('{','{"sub":"forged",'),JSON.stringify(p,null,2)])await assert.rejects(()=>h.rawToken(text).then(t=>h.adapter.accept(f.context('it'),t)),is('source_signature'));
 const token=await h.token(p),parts=token.split('.');parts[1]+='=';await assert.rejects(()=>h.adapter.accept(f.context('it'),parts.join('.')),is('source_signature'));assert.equal(snapshot(f),before);
}));

test('B09 kaynak imzası olay kuyruğuna bağlanır; kabul/işleme/insan puanı/karar ayrı kalır',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),accepted=await h.adapter.accept(f.context('it'),token);assert.equal(accepted.processed,false);assert.equal(f.s.list('test-gazi','evidence').length,0);assert.equal(f.s.list('test-gazi','decision').length,0);assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:accepted.id}),is('lms_evidence'));
 const processed=h.adapter.process(f.context('it'),accepted.id);assert.equal(processed.receipt.state,'processed');const ev=f.run('teacher','import-lms-evidence',{eventId:accepted.id});assert.equal(ev.sha256,h.payload().event.contentSha256);assert.equal(f.s.get('test-gazi','lms-event',accepted.id).sourceProof.jwt,token);
 const a=f.run('teacher','assess',{enrollmentId:h.initial.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:2,reason:'Kaynak notundan bağımsız insan rubrik değerlendirmesi.'}],reason:'Güncel kaynak çalışması tam rubrik üzerinden incelendi.'});assert.equal(a.score,50);assert.equal(a.passed,false);const d=f.run('judge','decide',{assessmentId:a.id,outcome:'rejected',reason:'Kaynak puanı yerine rubrik ve bağımsız akademik inceleme esas alındı.'});assert.equal(d.outcome,'rejected');assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
test('B09 aynı imzalı dosya on defa tek olay üretir; değişmiş aynı kimlik çakışır',()=>use(async f=>{
 const h=await sourcePacketFixture(f),p=h.payload(),token=await h.token(p),rs=await Promise.all(Array.from({length:10},()=>h.adapter.accept(f.context('it'),token)));assert.equal(rs.filter(x=>!x.duplicate).length,1);assert.equal(f.s.list('test-gazi','lms-event').length,1);assert.equal(f.s.db.prepare("SELECT count(*) n FROM audit WHERE action='lms.accept'").get().n,1);
 p.event.grade=10;await assert.rejects(()=>h.token(p).then(t=>h.adapter.accept(f.context('it'),t)),is('idempotency_conflict'));
}));
test('B09 imza/tür/audience/issuer/süre/özel başlık bozulduğunda kayıt yazılmaz',()=>use(async f=>{
 const h=await sourcePacketFixture(f),before=snapshot(f);
 for(const mutate of [p=>p.iss='https://evil.invalid',p=>p.aud='other',p=>p.aud=[p.aud,'other'],p=>p.iat+=30,p=>p.exp=p.iat,p=>p.exp=p.iat+86401,p=>p.format='other',p=>p.sub='unknown',p=>p.scope.tenant='other',p=>p.scope.unit='other',p=>p.scope.courseId='unknown',p=>p.scope.sourceRubricVersion='v2',p=>p.nonce='identity-token-confusion']){const p=h.payload();mutate(p);await assert.rejects(()=>h.token(p).then(t=>h.adapter.accept(f.context('it'),t)));}
 for(const header of [{typ:'JWT'},{kid:'unknown'},{jku:'https://evil.invalid/keys'}])await assert.rejects(()=>h.token(h.payload(),header).then(t=>h.adapter.accept(f.context('it'),t)),is('source_signature'));
 const t=await h.token();await assert.rejects(()=>h.adapter.accept(f.context('it'),t.slice(0,-20)+'A'.repeat(20)),is('source_signature'));assert.equal(snapshot(f),before);
}));
test('B09 program/rubrik/görev ve teslim/hash/zaman bağları bağımsız denetlenir',()=>use(async f=>{
 const h=await sourcePacketFixture(f),before=snapshot(f);
 for(const mutate of [p=>p.binding.programId='wrong',p=>p.binding.programVersion++,p=>p.binding.programSha256='a'.repeat(64),p=>p.binding.rubricSha256='b'.repeat(64),p=>p.binding.taskSha256='c'.repeat(64),p=>p.event.content+=' değişti',p=>p.event.submissionId='',p=>p.event.submissionVersion++,p=>p.event.occurredAt='2099-01-01T00:00:00.000Z',p=>p.event.grade=null,p=>p.event.completed=true,p=>p.jti=randomUUID()]){const p=h.payload();mutate(p);await assert.rejects(()=>h.token(p).then(t=>h.adapter.accept(f.context('it'),t)));}assert.equal(snapshot(f),before);
}));
test('B09 doğru imza yanlış kişi/kurum/birim/MFA veya iptal üyelikle alınamaz',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),before=snapshot(f);for(const who of ['student','teacher','admin','judge'])await assert.rejects(()=>h.adapter.accept(f.context(who),token),is('forbidden'));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('it'));await assert.rejects(()=>h.adapter.accept(f.context('it'),token),is('forbidden'));f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE session_hash=?').run(hash('it'));
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','it');await assert.rejects(()=>h.adapter.accept(f.context('it'),token),is('forbidden'));f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('engineering','it');
 await assert.rejects(()=>h.adapter.accept({sessionHash:hash('it'),tenant:'other'},token),is('identity_tenant'));f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');await assert.rejects(()=>h.adapter.accept(f.context('it'),token),is('lms_identity'));assert.equal(snapshot(f),before);
}));
test('B09 iki bağlantıda aynı imzalı paket tek kayıttır; worker yeniden açılışta devam eder',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),second=new LocalAcceptanceStore(f.path);try{const other=h.make(second),rs=await Promise.all([h.adapter.accept(f.context('it'),token),other.accept(f.context('it'),token)]);assert.equal(rs.filter(r=>r.duplicate).length,1);assert.equal(other.process(f.context('it'),rs[0].id).receipt.state,'processed');assert.equal(h.adapter.process(f.context('it'),rs[0].id).claimed,false);}finally{second.close();}
}));
test('B09 audit hatası kaynak imzası ve olayı birlikte geri alır; aynı paket tekrar alınabilir',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),before=snapshot(f);f.s.db.exec("CREATE TRIGGER reject_source BEFORE INSERT ON audit WHEN NEW.action='lms.accept' BEGIN SELECT RAISE(ABORT,'synthetic audit'); END;");await assert.rejects(()=>h.adapter.accept(f.context('it'),token));assert.equal(snapshot(f),before);f.s.db.exec('DROP TRIGGER reject_source');assert.equal((await h.adapter.accept(f.context('it'),token)).duplicate,false);
}));
test('B09 güven kaydı dışarıdan değiştirilemez; özel/zayıf veya ele geçirilmiş anahtar kapalıdır',()=>use(async f=>{
 const h=await sourcePacketFixture(f);h.config.subjects['source-student']='other';h.config.keys[0].state='compromised';const a=await h.adapter.accept(f.context('it'),await h.token());assert.equal(f.s.get('test-gazi','lms-event',a.id).owner,'student');
 const compromisedToken=await h.token();await assert.rejects(()=>h.make().accept(f.context('it'),compromisedToken),is('source_signature'));
 const copy=h.adapter.contract;copy.keys[0].jwk.d='private';assert.throws(()=>h.make(f.s,copy),is('source_contract'));assert.equal(h.adapter.trust(f.context('it')).keys[0].jwk.d,undefined);assert.equal(h.adapter.view(f.s.principal(hash('student'),'test-gazi',f.core.clock())).length,0);
}));
test('B09 imzalı tamamlanma not veya belge yaratmaz; lisans iptali kanıt uygunluğunu kapatır',()=>use(async f=>{
 const h=await sourcePacketFixture(f),a=await h.adapter.accept(f.context('it'),await h.token());h.adapter.process(f.context('it'),a.id);const ev=f.run('teacher','import-lms-evidence',{eventId:a.id});
 const completion=await h.adapter.accept(f.context('it'),await h.token(h.payload({type:'completion',completed:false})));h.adapter.process(f.context('it'),completion.id);assert.equal(f.s.get('test-gazi','lms-event',completion.id).completed,false);assert.equal(f.s.list('test-gazi','assessment').length,0);
 await h.adapter.accept(f.context('it'),await h.token(h.payload({type:'license-revoked'})));assert.equal(f.core.view(f.context('teacher')).evidence.find(x=>x.id===ev.id).canAssess,false);assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
test('B09 kaynak düzeltmesi eski kararın imzalı dayanağını değiştirmez; bağımsız arşiv doğrulanır',()=>use(async f=>{
 const h=await sourcePacketFixture(f),accepted=await h.adapter.accept(f.context('it'),await h.token());h.adapter.process(f.context('it'),accepted.id);const ev=f.run('teacher','import-lms-evidence',{eventId:accepted.id});
 const assessment=f.run('teacher','assess',{enrollmentId:h.initial.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason:'Tam rubrik bağımsız insan incelemesiyle puanlandı.'}],reason:'İmzalı kaynak kanıtı ve program sürümleri insan tarafından incelendi.'}),decision=f.run('judge','decide',{assessmentId:assessment.id,outcome:'approved',reason:'İmzalı kanıtın insan değerlendirmesi bağımsız kurulca incelendi.'});
 const before=decisionArchive(f.core,f.context('student'),decision.id);assert.equal(before.sourceSignatures,1);assert.equal(before.signed,false);assert.equal(before.payload.assessment.evidenceDigests[0].source.proof.submissionVersion,1);
 const corrected=h.payload({revision:2,submissionVersion:2,grade:10}),later=await h.adapter.accept(f.context('it'),await h.token(corrected));assert.equal(f.core.view(f.context('student')).decisions[0].usable,false);h.adapter.process(f.context('it'),later.id);const after=decisionArchive(f.core,f.context('student'),decision.id);assert.equal(after.sha256,before.sha256);assert.deepEqual(after.payload,before.payload);assert.equal(after.currentUsable,false);
 const dir=dirname(f.path),archivePath=join(dir,'archive.json'),trustPath=join(dir,'trust.json'),script=fileURLToPath(new URL('../scripts/verify-source-archive.py',import.meta.url)),trust=h.adapter.trust(f.context('it'));
 function verify(archive=after,registry=trust){writeFileSync(archivePath,JSON.stringify(archive));writeFileSync(trustPath,JSON.stringify(registry));const r=spawnSync('python',[script,archivePath,'--trust',trustPath],{encoding:'utf8'});assert.ok(r.stdout,'Independent verifier returned no report');return {exit:r.status,report:JSON.parse(r.stdout)};}
 const ok=verify();assert.equal(ok.exit,0,JSON.stringify(ok));assert.equal(ok.report.validSourceSignatures,true);assert.equal(ok.report.score,100);assert.equal(ok.report.academicDecisionSignature,false);assert.equal(ok.report.currentEligibilityVerified,false);
 for(const modify of [a=>a.payload.evidence[0].content+=' tamper',a=>a.payload.program.rubric[0].weight=50,a=>a.payload.assessment.score=90,a=>a.payload.assessment.evidenceDigests[0].source.proof.jwt+='A',a=>delete a.payload.assessment.evidenceDigests[0].source,a=>a.payload.assessment.evidenceDigests[0].source.proof.submissionVersion++]){const bad=structuredClone(after);modify(bad);bad.sha256=hash(stableStringify(bad.payload));assert.notEqual(verify(bad).exit,0);}
 const compromised=structuredClone(trust);compromised.keys[0].state='compromised';assert.notEqual(verify(after,compromised).exit,0);const foreign=structuredClone(trust);foreign.tenant='other';assert.notEqual(verify(after,foreign).exit,0);const expired=structuredClone(trust);expired.expiresAt='2000-01-01T00:00:00.000Z';assert.notEqual(verify(after,expired).exit,0);
 assert.notEqual(spawnSync('python',[script,archivePath],{encoding:'utf8'}).status,0,'Separate trust must be required');
}));
test('B09 eski ve sırasız sürüm mevcut kanıt uygunluğunu geri açamaz',()=>use(async f=>{
 const h=await sourcePacketFixture(f),newer=await h.adapter.accept(f.context('it'),await h.token(h.payload({revision:2,submissionVersion:2}))),older=await h.adapter.accept(f.context('it'),await h.token(h.payload()));assert.equal(h.adapter.process(f.context('it'),older.id).receipt.state,'stale');assert.equal(h.adapter.process(f.context('it'),newer.id).receipt.state,'processed');assert.throws(()=>f.run('teacher','import-lms-evidence',{eventId:older.id}),is('lms_evidence'));assert.ok(f.run('teacher','import-lms-evidence',{eventId:newer.id}).sourceProofDigest);
}));
test('B09 kaynak işçisinin claim/finish/fail işlemleri güncel yetkiyi aynı transaction içinde denetler',()=>use(async f=>{
 const h=await sourcePacketFixture(f),accepted=await h.adapter.accept(f.context('it'),await h.token()),worker=h.adapter.worker(f.context('it'));f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('it');const before=snapshot(f);assert.throws(()=>worker.claim(accepted.id),is('membership_required'));assert.equal(snapshot(f),before);
 f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run('it');const claim=worker.claim(accepted.id);assert.ok(claim);f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('it');const claimed=snapshot(f);assert.throws(()=>worker.finish(claim),is('membership_required'));assert.throws(()=>worker.fail(claim,Error('failure')),is('membership_required'));assert.equal(snapshot(f),claimed);assert.equal(f.s.list('test-gazi','lms-receipt').length,0);
 f.s.db.prepare('UPDATE memberships SET active=1 WHERE person=?').run('it');assert.equal(worker.finish(claim).state,'processed');
}));
