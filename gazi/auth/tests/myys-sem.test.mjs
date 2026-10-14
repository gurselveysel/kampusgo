import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {semSetup,semInput,semReview,semPacket,semReason as reason} from './helpers/local-sem.mjs';
import {semDigest} from '../myys/sem-dossier.mjs';
import {stableStringify} from '../myys/program-model.mjs';
import {hash,LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
const create=(f,p,patch={})=>f.run('author','sem-dossier',semInput(p,patch));
const roles=(f,p,r)=>f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run(JSON.stringify(r),p);
const match=c=>e=>e.code===c;
test('SEM dosyası → ayrı inceleme → ayrı aktarım hazırlığı; dış gönderim/onay/yerel belge yok',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p),r=semReview(f,d),out=semPacket(f,d);assert.equal(out.payload.review.id,r.id);assert.equal(out.sha256,hash(stableStringify(out.payload)));assert.equal(out.payload.program.pathway,'sem-central');
 assert.equal(out.payload.externalSubmitted,false);assert.equal(out.payload.externalApproval,null);assert.equal(out.payload.centralIssuerVerified,false);assert.equal(out.payload.localIssuanceAllowed,false);assert.equal(f.core.view(f.context('issuer')).sem.dossiers[0].state,'prepared');assert.equal(f.s.list('test-gazi','issuance').length,0);
}));
test('Eksik kontrol hazır inceleme veya aktarım dosyasına ilerlemez; düzeltme gerekçesi kalır',()=>use(f=>{
 const {p}=semSetup(f),input=semInput(p);input.checklist[0].state='pending';const d=create(f,p,input);assert.throws(()=>semReview(f,d),match('sem_incomplete'));semReview(f,d,{outcome:'correction'});assert.throws(()=>semPacket(f,d),match('sem_not_ready'));assert.equal(f.core.view(f.context('author')).sem.dossiers[0].state,'correction');
}));
test('Kaynak, kontrol satırı ve gerçek gönderim/ihraç beyanları doğrulanır',()=>use(f=>{
 const {p}=semSetup(f);for(const [patch,code]of [[{localOnly:false},'sem_external'],[{externalSubmitted:true},'sem_external'],[{externalApproval:'approved'},'sem_external'],[{localIssuanceAllowed:true},'sem_external'],[{checklist:[]},'sem_checklist'],[{sources:{}},'sem_source'],[{reason:''},'sem_reason']])assert.throws(()=>create(f,p,patch),match(code));
 const input=semInput(p);input.sources.central.date='2099-01-01';assert.throws(()=>create(f,p,input),match('sem_source'));input.sources.central.date='2026-02-30';assert.throws(()=>create(f,p,input),match('sem_source'));
}));
test('Mikro yol SEM dosyası olamaz; yayımlanmamış SEM sürümü açılamaz',()=>use(f=>{
 const x=f.setup();assert.throws(()=>create(f,x.p),match('sem_pathway'));const p=f.run('author','program',{...x.p,code:'SEM-unpublished',pathway:'sem-central'});assert.throws(()=>create(f,p),match('sem_pathway'));
}));
test('Hazırlayan kendi incelemesini veya nihai aktarım hazırlığını yapamaz',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);roles(f,'author',['coordinator','commission','studentAffairs']);assert.throws(()=>f.run('author','sem-review',{dossierId:d.id,basedOn:semDigest(d),outcome:'ready',reason}),match('separation'));semReview(f,d);assert.throws(()=>f.run('author','sem-package',{dossierId:d.id,basedOn:semDigest(d)}),match('separation'));roles(f,'judge',['commission','studentAffairs']);assert.throws(()=>f.run('judge','sem-package',{dossierId:d.id,basedOn:semDigest(d)}),match('separation'));
}));
test('Yeni dosya sürümü eski incelemeyi ve paketi korur; yeni hazırlık ayrı inceleme ister',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);semReview(f,d);const out=semPacket(f,d);assert.throws(()=>create(f,p),match('sem_changed'));const next=create(f,p,{previousDossierId:d.id,changeReason:reason});assert.equal(next.version,2);assert.throws(()=>semPacket(f,next),match('sem_not_ready'));assert.throws(()=>semPacket(f,d),match('sem_changed'));const view=f.core.view(f.context('author')).sem;assert.equal(view.dossiers[0].state,'superseded');assert.equal(view.dossiers[0].canDownload,false);assert.equal(view.dossiers[0].packet.sha256,out.sha256);semReview(f,next);assert.ok(semPacket(f,next));
}));
test('Eski kaynak özeti ve tekrar inceleme reddedilir; aynı işlem kimliği tek kayıt döndürür',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p),commandId=randomUUID(),input={dossierId:d.id,basedOn:semDigest(d),outcome:'ready',reason};assert.throws(()=>semReview(f,d,{basedOn:'x'.repeat(64)}),match('sem_changed'));const r=f.run('judge','sem-review',input,commandId);assert.equal(f.run('judge','sem-review',input,commandId).id,r.id);assert.throws(()=>semReview(f,d),match('sem_reviewed'));semPacket(f,d);assert.throws(()=>semPacket(f,d),match('duplicate'));
}));
test('Hazırlayan/inceleyenin görevi kapanırsa yeni inceleme veya aktarım hazırlığı kapanır',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);roles(f,'author',['learner']);assert.throws(()=>semReview(f,d),match('sem_authority'));assert.equal(f.core.view(f.context('judge')).sem.dossiers[0].canReview,false);roles(f,'author',['coordinator']);semReview(f,d);roles(f,'judge',['learner']);assert.throws(()=>semPacket(f,d),match('sem_authority'));assert.equal(f.core.view(f.context('issuer')).sem.dossiers[0].canPreparePacket,false);
}));
test('Geri çekme dış iptal göndermez; eski dosya korunur ve yeni hazırlık kapalıdır',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);semReview(f,d);semPacket(f,d);const w=f.run('author','sem-withdraw',{dossierId:d.id,basedOn:semDigest(d),reason});assert.equal(w.externalWithdrawalSent,false);const v=f.core.view(f.context('author')).sem.dossiers[0];assert.equal(v.state,'withdrawn');assert.equal(v.canDownload,false);assert.ok(v.packet);assert.throws(()=>semPacket(f,d),match('sem_changed'));assert.throws(()=>semReview(f,d),match('sem_changed'));
}));
test('Öğrenen veya BT dosya içeriğini okuyamaz; başka birim aynı göreviyle erişemez',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);for(const who of ['student','other','it','finance']){if(who==='finance')continue;assert.deepEqual(f.core.view(f.context(who)).sem,{programs:[],dossiers:[]});}
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','judge');assert.throws(()=>semReview(f,d),match('not_found'));assert.equal(f.core.view(f.context('judge')).sem.dossiers.length,0);
}));
test('Hazırlık paketi denetimi başarısızsa tüm yazım geri alınır; iki bağlantı aynı sürümü görür',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);semReview(f,d);f.s.db.exec("CREATE TRIGGER sem_audit_failure BEFORE INSERT ON audit WHEN NEW.action='sem-package' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END;");assert.throws(()=>semPacket(f,d),/audit unavailable/);assert.equal(f.s.list('test-gazi','sem-package').length,0);f.s.db.exec('DROP TRIGGER sem_audit_failure');semPacket(f,d);const s=new LocalAcceptanceStore(f.path);try{assert.deepEqual(new MyysCore(s).view(f.context('issuer')).sem,f.core.view(f.context('issuer')).sem);}finally{s.close();}
}));
test('SEM başarı kararı ve hazırlık dosyası yerel resmî ihraç kapısını açmaz',()=>use(f=>{
 const {p}=semSetup(f),d=create(f,p);semReview(f,d);semPacket(f,d);const e=f.run('author','enroll',{programId:p.id,learnerId:'student'}),{a}=f.assess({e}),decision=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});assert.throws(()=>f.run('issuer','issue',{decisionId:decision.id}),match('issuer_pathway'));assert.equal(f.core.view(f.context('issuer')).decisions[0].canIssue,false);assert.equal(f.s.list('test-gazi','signed').length,0);
}));
