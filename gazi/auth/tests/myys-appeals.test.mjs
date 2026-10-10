import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {hash} from '../myys/store.mjs';
const reason='Kanıtlar ve ilk karar bağımsız inceleme kapsamında değerlendirildi.';
function addIndependent(f){
 f.s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run('teacher2','https://test-idp.invalid','teacher2');
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('test-gazi','teacher2','engineering','["instructor"]','2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash('teacher2'),'teacher2','2099-01-01T00:00:00.000Z');
}
const assessInput=(x,extra={})=>({enrollmentId:x.e.id,evidenceIds:[x.ev.id],scores:[{criterionId:'R1',score:4,reason}],reason,...extra});
const appeal=(f,d)=>f.run('student','appeal',{decisionId:d.id,reason});

test('itiraz görünümü sahibi ve MFA ile yetkili birime özeldir; bağımsız inceleme eylemi sunucudan gelir',()=>use(f=>{
 const x=f.passed(),a=appeal(f,x.d);
 assert.deepEqual(f.core.view(f.context('student')).appeals[0].allowedActions,[]);
 assert.deepEqual(f.core.view(f.context('reviewer')).appeals[0].allowedActions,['resolve']);
 assert.equal(f.core.view(f.context('other')).appeals.length,0);
 assert.equal(f.core.view(f.context('it')).appeals.length,0);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["coordinator","quality"]','author');
 assert.deepEqual(f.core.view(f.context('author')).appeals[0].allowedActions,[]);
 assert.throws(()=>f.run('author','resolve',{appealId:a.id,outcome:'upheld',reason}),e=>e.code==='separation');
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('reviewer');
 assert.equal(f.core.view(f.context('reviewer')).appeals.length,0);
 assert.throws(()=>f.core.view({...f.context('student'),tenant:'other-tenant'}),e=>e.code==='membership_required');
}));
test('açık itiraz başka bir değerlendirme veya önce hazırlanmış karar yolu ile aşılamaz',()=>use(f=>{
 const x=f.passed();addIndependent(f);
 const other=f.run('teacher2','assess',assessInput(x));
 const otherDecision=f.run('judge','decide',{assessmentId:other.id,outcome:'approved',reason});
 appeal(f,x.d);
 assert.throws(()=>f.run('teacher2','assess',assessInput(x)),e=>e.code==='review_pending');
 assert.throws(()=>f.run('issuer','issue',{decisionId:otherDecision.id}),e=>e.code==='decision_blocked');
 assert.ok(f.core.view(f.context('student')).decisions.every(d=>!d.usable));
}));
test('yeniden değerlendirme gerekçeleri ve kanıt zinciri korunur; eski karar belgeye ilerlemez',()=>use(f=>{
 const x=f.passed();addIndependent(f);const old={assessment:f.s.get('test-gazi','assessment',x.a.id),decision:f.s.get('test-gazi','decision',x.d.id)};
 const a=appeal(f,x.d),r=f.run('reviewer','resolve',{appealId:a.id,outcome:'reassessment',reason});
 assert.throws(()=>f.run('teacher','assess',assessInput(x,{resolutionId:r.id})),e=>e.code==='separation');
 assert.throws(()=>f.run('teacher2','assess',assessInput(x)),e=>e.code==='reassessment_required');
 assert.throws(()=>f.run('teacher2','assess',assessInput(x,{resolutionId:'foreign-resolution'})),e=>e.code==='reassessment_required');
 assert.throws(()=>f.run('teacher2','assess',assessInput(x,{resolutionId:r.id,evidenceIds:[]})),e=>e.code==='missing_evidence');
 const next=f.run('teacher2','assess',assessInput(x,{resolutionId:r.id}),'appeal-reassessment-001');
 assert.equal(next.supersedesAssessmentId,x.a.id);assert.equal(next.resolutionId,r.id);
 assert.throws(()=>f.run('teacher2','assess',assessInput(x,{resolutionId:r.id})),e=>e.code==='duplicate');
 const d=f.run('judge','decide',{assessmentId:next.id,outcome:'approved',reason});
 assert.throws(()=>f.run('issuer','issue',{decisionId:x.d.id}),e=>e.code==='decision_blocked');
 assert.equal(f.run('issuer','issue',{decisionId:d.id}).state,'awaiting-signature');
 assert.deepEqual(f.s.get('test-gazi','assessment',x.a.id),old.assessment);assert.deepEqual(f.s.get('test-gazi','decision',x.d.id),old.decision);
 const view=f.core.view(f.context('student'));assert.equal(view.appeals[0].resolution.id,r.id);assert.equal(view.resolutions.length,1);
 assert.equal(f.core.view(f.context('other')).resolutions.length,0);
}));
test('itirazı koruma sonucu başarı üretmez; yeniden değerlendirmede başarısız puan onaylanmaz',()=>use(f=>{
 const x=f.passed();addIndependent(f);const a=appeal(f,x.d),r=f.run('reviewer','resolve',{appealId:a.id,outcome:'reassessment',reason});
 const failed=f.run('teacher2','assess',assessInput(x,{resolutionId:r.id,scores:[{criterionId:'R1',score:1,reason}]}));
 assert.throws(()=>f.run('judge','decide',{assessmentId:failed.id,outcome:'approved',reason}),e=>e.code==='failed');
 const d=f.run('judge','decide',{assessmentId:failed.id,outcome:'rejected',reason}),second=appeal(f,d);
 f.run('reviewer','resolve',{appealId:second.id,outcome:'upheld',reason});
 assert.throws(()=>f.run('issuer','issue',{decisionId:d.id}),e=>e.code==='decision_blocked');
 assert.throws(()=>f.run('reviewer','resolve',{appealId:second.id,outcome:'upheld',reason}),e=>e.code==='duplicate');
}));

test('karar eylemi sunucudan gelir; önceki karar, açık itiraz, MFA ve görevler ayrılığı gözetilir',()=>use(f=>{
 const x=f.setup(),{ev,a}=f.assess(x);
 assert.deepEqual(f.core.view(f.context('judge')).assessments[0].allowedActions,['decide']);
 assert.deepEqual(f.core.view(f.context('student')).assessments[0].allowedActions,[]);
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["instructor","commission"]','teacher');
 assert.deepEqual(f.core.view(f.context('teacher')).assessments[0].allowedActions,[]);
 const d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason});
 assert.deepEqual(f.core.view(f.context('judge')).assessments[0].allowedActions,[]);
 addIndependent(f);const fresh=f.run('teacher2','assess',assessInput({...x,ev}));
 appeal(f,d);
 assert.deepEqual(f.core.view(f.context('judge')).assessments.find(r=>r.id===fresh.id).allowedActions,[]);
 assert.throws(()=>f.run('judge','decide',{assessmentId:fresh.id,outcome:'approved',reason}),e=>e.code==='review_pending');
}));
