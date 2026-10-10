import test from 'node:test';
import assert from 'node:assert/strict';
import {supportBrief,supportScreens,supportTopics} from './support-model.mjs';
test('destek özeti yalnız izinli seçimleri taşır; kimlik ve serbest girdi dışa aktarılmaz',()=>{
 const brief=supportBrief({topicId:'appeal',screenId:'academic',impact:'blocked',email:'private@example.invalid',token:'secret'},new Date('2026-10-10T12:00:00Z'));
 assert.equal(brief.gonderildi,false);assert.equal(brief.onerilenBirim,'Bağımsız akademik inceleme');assert.equal(JSON.stringify(brief).includes('secret'),false);assert.equal(JSON.stringify(brief).includes('private@'),false);
 assert.match(brief.adimlar.join(' '),/itiraz başvurusu veya süre durdurma işlemi değildir/);
});
test('destek seçimleri doğrulanır; bütün konular mevcut ekranlara yönelir',()=>{
 for(const topic of supportTopics){assert.ok(supportScreens.some(s=>s[0]===topic.route));assert.equal(supportBrief({topicId:topic.id,screenId:topic.route,impact:'question'}).gonderildi,false);}
 assert.throws(()=>supportBrief({topicId:'unknown',screenId:'academic',impact:'blocked'}));
 assert.throws(()=>supportBrief({topicId:'privacy',screenId:'https://outside.invalid',impact:'blocked'}));
 assert.throws(()=>supportBrief({topicId:'privacy',screenId:'academic',impact:'constructor'}));
});
