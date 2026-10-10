import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE_KEY,GUIDE_VERSION,guideRoles,guideLessons,emptyGuide,loadGuide,answerGuide,guideProgress} from './guide-model.mjs';
test('Rehber dokuz sunum sorumluluğunu kapsar; her ders geçerli hedef ve kontrol içerir',()=>{
 assert.equal(guideRoles.length,9);const roles=new Set(guideLessons.flatMap(l=>l.roles));assert.ok(guideRoles.every(([id])=>roles.has(id)));
 assert.equal(new Set(guideLessons.map(l=>l.id)).size,guideLessons.length);
 for(const l of guideLessons){assert.ok(l.steps.length>=4);assert.ok(l.options[l.answer]);assert.ok(['learning','academic','badges','connections'].includes(l.route));}
});
test('Yanlış yanıt ilerleme yaratmaz; doğru yanıt tekrarda iki kez sayılmaz',()=>{
 const l=guideLessons[0];let s=answerGuide(emptyGuide(),l.id,(l.answer+1)%l.options.length);assert.equal(guideProgress(s).correct,0);
 s=answerGuide(s,l.id,l.answer);s=answerGuide(s,l.id,l.answer);assert.equal(guideProgress(s).correct,1);assert.equal(guideProgress(s).official,false);
});
test('Rehber eski sürümü, bozuk kaydı ve geçersiz yanıtı güvenli biçimde ele alır',()=>{
 for(const value of ['invalid',JSON.stringify({version:'old',answers:{learn:1}})])assert.deepEqual(loadGuide({getItem:()=>value}),emptyGuide());
 const s=loadGuide({getItem:key=>{assert.equal(key,GUIDE_KEY);return JSON.stringify({version:GUIDE_VERSION,answers:{learn:999,design:1,unknown:0}});}});assert.deepEqual(s.answers,{design:1});
 assert.throws(()=>answerGuide(s,'unknown',0));assert.throws(()=>answerGuide(s,'learn',null));
});
test('Rehber veri okuması diğer ders/rol/rozet depolarına dokunmaz',()=>{
 const reads=[];loadGuide({getItem:key=>{reads.push(key);throw Error('storage disabled');}});assert.deepEqual(reads,[GUIDE_KEY]);
 const all=guideLessons.reduce((s,l)=>answerGuide(s,l.id,l.answer),emptyGuide());assert.equal(guideProgress(all).correct,6);
 assert.equal(guideProgress({...all,version:'old'}).correct,0);
});
