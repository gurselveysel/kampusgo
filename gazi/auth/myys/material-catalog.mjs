import {curricula,lessonsFor,curriculumVersion} from './learning-data.mjs';
import {cases} from './learning-cases.mjs';
import {sources,programResources,moduleVideos,videos,contentVersion} from './learning-resources.mjs';
import {renderSlides,renderCaseCsv} from './learning-materials.mjs';
import {hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const digest=x=>hash(stableStringify(x));
// One canonical source serves both the existing pilot and the governed core.
// These are original pilot guides; third-party publications remain links only.
let cached;
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function materialCatalog(){return cached??=freeze(Object.entries(curricula).map(([id,modules])=>{
 const refs=programResources[id].map(key=>({key,...sources[key],delivery:'publisher-link-only',copyAuthorized:false}));
 const lessons=lessonsFor(id).map(l=>{const video=videos[l.id==='P06-L05'?'contrast':moduleVideos[l.moduleId]]||null;const files=materialFiles(id,l.id);return {...l,language:'Türkçe',sourceKeys:refs.map(r=>r.key),video,reviewState:'not-institutionally-reviewed',files:files.map(({content,...f})=>f),sha256:digest({lesson:l,case:cases[l.moduleId],refs,video,files:files.map(f=>f.sha256)})};});
 const baseline={id,curriculumVersion,contentVersion,modules:modules.map(m=>({id:m.id,title:m.title})),refs,lessons};return {...baseline,sha256:digest(baseline)};
}));}
export function materialFiles(catalogId,lessonId){const lesson=lessonsFor(catalogId).find(l=>l.id===lessonId);if(!lesson)return [];const refs=(programResources[catalogId]||[]).map(k=>sources[k]);return [{format:'slides',name:lesson.id+'-Sunum.html',mime:'text/html;charset=utf-8',content:renderSlides(lesson,refs)},{format:'case',name:lesson.moduleId+'-Vaka.csv',mime:'text/csv;charset=utf-8',content:renderCaseCsv(cases[lesson.moduleId])}].map(f=>({...f,sha256:hash(f.content),bytes:Buffer.byteLength(f.content)}));}
export const materialReference=c=>'urn:myys:original-pilot:'+c.id+':'+c.sha256;
