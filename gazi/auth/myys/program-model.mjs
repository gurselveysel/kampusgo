// Pure shared model: legacy one-output records remain readable without rewriting history.
export const outcomeIds=r=>Array.isArray(r.outcomeIds)?r.outcomeIds:[r.outcomeId];
export const criterionTasks=(r,tasks)=>Array.isArray(r.taskIds)?r.taskIds:tasks.filter(t=>outcomeIds(t).some(id=>outcomeIds(r).includes(id))).map(t=>t.id);
export const stableStringify=value=>JSON.stringify(canonical(value));
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,canonical(v[k])]));return v;}
export function programBaseline(p){
 const fields=['id','unit','code','title','version','createdAt','previousProgramId','changeReason','mode','pathway','responsibilities','outcomes','tasks','rubric','threshold','hours','ects','level','participation','quality','instructor','license','assessmentMethod'];
 return JSON.parse(JSON.stringify(Object.fromEntries(fields.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]))));
}
export function comparePrograms(a,b){
 const labels={title:'Program adı',outcomes:'Öğrenme Çıktıları',tasks:'Görevler ve çıktı ilişkileri',rubric:'Rubrik ve görev ilişkileri',threshold:'Başarı eşiği',hours:'İş yükü',ects:'AKTS',level:'Düzey',participation:'Katılım biçimi',quality:'Kalite güvencesi',instructor:'Eğitici',license:'İçerik lisansı',assessmentMethod:'Ölçme yöntemi',responsibilities:'Sorumluluklar',pathway:'Belgelendirme yolu'};
 return Object.entries(labels).filter(([key])=>stableStringify(a?.[key])!==stableStringify(b?.[key])).map(([key,label])=>({key,label,before:a?.[key]??null,after:b?.[key]??null}));
}
