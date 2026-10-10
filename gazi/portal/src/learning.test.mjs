import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../../model.mjs';
import {curricula,lessonsFor} from './learning-data.mjs';
import {LEARNING_KEY,LEGACY_KEY,emptyLearning,readEnrollment,readLearning,updateLearning,persistLearning,progress,continueLesson,lessonRecord} from './learning-model.mjs';
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
const action=(extra={})=>({owner:'DEMO-001',program:'P01',lesson:'P01-L01',kind:'complete',value:true,...extra});

test('existing enrollment is reused without enrolling unrelated programs or changing legacy records',()=>{
 const s=storage(),legacy=seed();legacy.enrollments=['P06'];s.setItem(LEGACY_KEY,JSON.stringify(legacy));
 assert.deepEqual(readEnrollment(s).map(p=>p.id),['P06']);
 persistLearning(s,action({program:'P06',lesson:'P06-L01'}));
 assert.deepEqual(JSON.parse(s.getItem(LEGACY_KEY)),legacy);
 assert.equal(s.getItem('unigo-gazi-portal-v2'),null);
});
test('all six existing programs have complete stable module trees and distinct lesson identifiers',()=>{
 const ids=[];for(const p of seed().programs){assert.ok(curricula[p.id]?.length);for(const l of lessonsFor(p.id)){ids.push(l.id);assert.ok(l.title&&l.outcome&&l.brief&&l.task);assert.ok(l.minutes>0);}}
 assert.equal(ids.length,66);assert.equal(new Set(ids).size,ids.length);
});
test('first launch shows only the two existing planned programs and zero invented progress',()=>{
 const s=storage();assert.deepEqual(readEnrollment(s).map(p=>p.id),['P01','P06']);
 assert.deepEqual(progress(readLearning(s),'DEMO-001','P01'),{total:15,completed:0,percent:0});
});
test('completion is reversible and idempotent, preserves notes, and never issues credentials',()=>{
 let s=emptyLearning();s=updateLearning(s,action({kind:'note',value:'Çalışma yanıtım'}),['P01']);
 s=updateLearning(s,action(),['P01']);s=updateLearning(s,action(),['P01']);
 assert.equal(progress(s,'DEMO-001','P01').completed,1);
 s=updateLearning(s,action({value:false}),['P01']);
 assert.equal(progress(s,'DEMO-001','P01').completed,0);
 assert.equal(lessonRecord(s,'DEMO-001','P01','P01-L01').note,'Çalışma yanıtım');
 assert.deepEqual(Object.keys(s).sort(),['learners','version']);
});
test('progress remains separate for each learner and each program',()=>{
 const original=emptyLearning(),s=updateLearning(original,action(),['P01','P06']);
 assert.equal(progress(s,'DEMO-002','P01').completed,0);
 assert.equal(progress(s,'DEMO-001','P06').completed,0);
 assert.equal(progress(original,'DEMO-001','P01').completed,0);
});
test('all lessons can be visited without artificial prerequisite locks',()=>{
 const s=updateLearning(emptyLearning(),action({kind:'visit',lesson:'P01-L15'}),['P01']);
 assert.equal(continueLesson(s,'DEMO-001','P01').id,'P01-L15');
 assert.equal(progress(s,'DEMO-001','P01').completed,0);
});
test('continue selects next incomplete lesson after the last visit is completed',()=>{
 const s=updateLearning(emptyLearning(),action(),['P01']);
 assert.equal(continueLesson(s,'DEMO-001','P01').id,'P01-L02');
});
test('unknown lessons, unenrolled programs and invalid payloads are rejected',()=>{
 assert.throws(()=>updateLearning(emptyLearning(),action(),['P06']));
 assert.throws(()=>updateLearning(emptyLearning(),action({lesson:'unknown'}),['P01']));
 assert.throws(()=>updateLearning(emptyLearning(),action({value:'yes'}),['P01']));
 assert.throws(()=>updateLearning(emptyLearning(),action({kind:'note',value:'a'.repeat(6001)}),['P01']));
});
test('writes merge the latest saved state and survive reload, plan removal and re-addition',()=>{
 const s=storage();persistLearning(s,action({kind:'note',value:'Birinci not'}));
 persistLearning(s,action({lesson:'P01-L02',kind:'bookmark',value:true}));
 const legacy=seed();legacy.enrollments=[];s.setItem(LEGACY_KEY,JSON.stringify(legacy));
 assert.deepEqual(readEnrollment(s),[]);assert.throws(()=>persistLearning(s,action()));
 legacy.enrollments=['P01'];s.setItem(LEGACY_KEY,JSON.stringify(legacy));
 const r=readLearning(s);assert.equal(lessonRecord(r,'DEMO-001','P01','P01-L01').note,'Birinci not');
 assert.equal(lessonRecord(r,'DEMO-001','P01','P01-L02').bookmarked,true);
});
test('corrupt storage is reported and never silently replaced',()=>{
 const s=storage();s.setItem(LEARNING_KEY,'invalid');
 assert.throws(()=>persistLearning(s,action()));assert.equal(s.getItem(LEARNING_KEY),'invalid');
 s.setItem(LEGACY_KEY,'{}');assert.throws(()=>readEnrollment(s));assert.equal(s.getItem(LEGACY_KEY),'{}');
});
test('only valid current lessons contribute to percentage; all completed equals 100',()=>{
 let s=emptyLearning();for(const l of lessonsFor('P06'))s=updateLearning(s,action({program:'P06',lesson:l.id}),['P06']);
 s.learners['DEMO-001'].programs.P06.lessons.removed={completed:true};
 assert.deepEqual(progress(s,'DEMO-001','P06'),{total:9,completed:9,percent:100});
 assert.ok(continueLesson(s,'DEMO-001','P06'));
});
