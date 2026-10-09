import {referenceFallback,validateReference} from './reference-model.mjs';
const URL='https://xpjkrwzgimdxsasqszfi.supabase.co/rest/v1/gazi_reference_records?select=kind,payload,revision&order=id&limit=1000';
const KEY="sb_publishable_v_AI0cizKIbiJqeqWYHDSQ__g2fSY4p";
export async function loadReference(signal){
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);let response;try{response=await fetch(URL,{headers:{apikey:KEY},signal:controller.signal});}catch(e){if(signal?.aborted)throw e;throw Error('Referans bağlantısı zaman aşımına uğradı veya kullanılamıyor.');}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 if(!response.ok)throw Error('Referans veritabanı yanıt vermedi ('+response.status+').');
 const rows=await response.json();
 if(!Array.isArray(rows)||rows.length>=1000)throw Error('Referans veri kapsamı doğrulanamadı.');
 const meta=rows.find(r=>r.kind==='metadata')?.payload;
 if(!meta||rows.some(r=>r.revision!==meta.version))throw Error('Karışık referans sürümü reddedildi.');
 const d={...meta};for(const kind of ['sources','frameworks','levels','types','programs','outcomes','qualifications'])d[kind]=rows.filter(r=>r.kind===kind).map(r=>r.payload);
 d.outcomes.sort((a,b)=>a.code.localeCompare(b.code,'tr',{numeric:true}));d.levels.sort((a,b)=>['tyc','eqf','tyyc'].indexOf(a.frameworkId)-['tyc','eqf','tyyc'].indexOf(b.frameworkId)||a.level-b.level);
 validateReference(d);return {data:d,count:rows.length,at:new Date().toISOString()};
}
export {referenceFallback};
