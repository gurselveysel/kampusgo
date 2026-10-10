import test from 'node:test';
import assert from 'node:assert/strict';
import {curricula,lessonsFor} from './learning-data.mjs';
import {cases,slidesFor} from './learning-cases.mjs';
import {sources,videos,programResources,moduleVideos} from './learning-resources.mjs';
test('Every enrolled curriculum has substantive lesson slides, case data and an answerable check',()=>{
 let count=0;
 for(const id of Object.keys(curricula))for(const lesson of lessonsFor(id)){
  const x=cases[lesson.moduleId];assert.ok(x,lesson.id);assert.equal(slidesFor(lesson).length,6);assert.ok(x.context.length>65);assert.equal(x.rows.length,4);assert.equal(x.steps.length,3);assert.ok(x.steps.every(s=>s.length>40));assert.ok(x.options[x.answer]);assert.ok(x.feedback.length>50);assert.ok(slidesFor(lesson).some(s=>s.text===lesson.task));count++;
 }
 assert.equal(count,66);assert.equal(Object.keys(cases).length,22);
});
test('Sources carry explicit licence, publisher, language and secure publisher URLs',()=>{
 for(const id of Object.keys(curricula)){assert.ok(programResources[id].length>=2);for(const key of programResources[id])assert.ok(sources[key]);}
 for(const s of Object.values(sources)){assert.ok(s.publisher&&s.language&&s.license);assert.equal(new URL(s.url).protocol,'https:');if(s.download)assert.equal(new URL(s.download).protocol,'https:');}
 for(const key of Object.values(moduleVideos))assert.ok(videos[key]);
 for(const v of Object.values(videos)){assert.ok(v.note&&v.license);if(v.kind==='youtube')assert.match(v.id,/^[A-Za-z0-9_-]{11}$/);if(v.kind==='video')assert.equal(new URL(v.src).hostname,'media.w3.org');}
});
test('Auth allows only the required educational media hosts and keeps the session gate',async()=>{
 const {readFile}=await import('node:fs/promises');const gateway=await readFile(new URL('../../auth/api/gateway.mjs',import.meta.url),'utf8');
 assert.ok(gateway.includes("media-src 'self' https://media.w3.org"));assert.ok(gateway.includes("frame-src 'self' https://www.youtube-nocookie.com"));assert.ok(gateway.includes("frame-ancestors 'self'"));assert.ok(!gateway.includes("script-src 'self' 'unsafe-inline'"));
});
