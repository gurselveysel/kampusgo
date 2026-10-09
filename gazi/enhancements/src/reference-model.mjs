import bundled from '../../data/reference.json' with {type:'json'};
export const referenceFallback=bundled;
export const referenceEditors=['coordinator','instructor','commission','quality'];
export function validateReference(d){
 if(!d||typeof d.version!=='string'||!['sources','frameworks','levels','types','programs','outcomes','qualifications'].every(k=>Array.isArray(d[k])))throw Error('Referans paketi biçimi geçersiz.');
 for(const key of ['sources','frameworks','levels','types','programs','outcomes','qualifications']){if(d[key].length>10000||new Set(d[key].map(x=>x.id)).size!==d[key].length)throw Error('Referans kimlikleri tekil olmalı.');}
 const src=new Set(d.sources.map(s=>s.id)),fw=new Set(d.frameworks.map(x=>x.id)),pg=new Set(d.programs.map(x=>x.id));
 for(const s of d.sources)if(!/^https:\/\//.test(s.url))throw Error('Kaynak için güvenli adres gerekli.');
 for(const l of d.levels)if(!fw.has(l.frameworkId)||!src.has(l.sourceId)||!Number.isInteger(l.level)||l.level<1||l.level>8||!['knowledge','skills','competence'].every(k=>typeof l[k]==='string'))throw Error('Seviye referansı geçersiz.');
 for(const o of d.outcomes)if(!pg.has(o.programId)||!src.has(o.sourceId)||typeof o.text!=='string')throw Error('Program çıktısı referansı geçersiz.');
 if(d.policy.hoursPerEcts!==25)throw Error('Bu kaynak sürümü için AKTS katsayısı desteklenmiyor.');
 return d;
}
export function initialDesign(a,d=bundled){return {applicationId:a.id,version:1,referenceVersion:d.version,programId:'gazi-tf-bm',title:a.title,rows:a.outcomes.map((text,i)=>({id:`O${i+1}`,text,targetId:'',levelId:'tyc-6',dimension:'skills',strength:0,reason:'',evidenceId:''})),rubric:a.outcomes.map((text,i)=>({id:`R${i+1}`,outcomeId:`O${i+1}`,title:text,weight:Math.floor(100/a.outcomes.length)+(i===0?100%a.outcomes.length:0),score:null,feedback:''})),workload:[{id:'ders',title:'Ders ve rehberli öğrenme',count:1,hours:Math.min(25,a.hours)},{id:'uygulama',title:'Uygulama ve proje',count:1,hours:Math.max(0,a.hours-Math.min(25,a.hours))},{id:'bireysel',title:'Bireysel çalışma',count:1,hours:0},{id:'olcme',title:'Ölçme ve değerlendirme',count:1,hours:0}],evidence:[],issuerChecked:false,reviewed:false,reviewReason:'',updatedAt:null};}
export function ensureReferenceState(s){s.referenceWork??={version:1,designs:{},history:[]};return s.referenceWork;}
export function workloadResult(d){const total=d.workload.reduce((n,x)=>{if(!Number.isFinite(x.count)||!Number.isFinite(x.hours)||x.count<0||x.hours<0||x.count>365||x.hours>1800)throw Error('İş yükü alanları geçerli ve negatif olmayan sayılar olmalı.');return n+x.count*x.hours;},0);if(total>1800)throw Error('İş yükü 1800 saati geçemez.');return {hours:total,ects:Math.round(total/25*100)/100};}
export function assessDesign(d,ref=bundled){
 const errors=[],targets=new Set(ref.outcomes.filter(o=>o.programId===d.programId).map(o=>o.id)),levels=new Set(ref.levels.map(l=>l.id));
 let workload={hours:0,ects:0};try{workload=workloadResult(d);}catch(e){errors.push(e.message);}
 if(!workload.hours)errors.push('İş yükü girilmedi.');
 if(d.referenceVersion!==ref.version)errors.push('Kaynak sürümü değişti; yeni sürümle inceleme gerekli.');
 if(!d.rows.length)errors.push('En az bir öğrenme çıktısı gerekli.');
 const mapped=d.rows.filter(r=>targets.has(r.targetId)&&levels.has(r.levelId)&&['knowledge','skills','competence'].includes(r.dimension)&&Number.isInteger(r.strength)&&r.strength>=1&&r.strength<=3&&r.reason.trim().length>=12);
 const covered=mapped.filter(r=>d.evidence.some(e=>e.id===r.evidenceId&&/^[a-f0-9]{64}$/.test(e.hash)));
 const coverage=d.rows.length?Math.round(100*covered.length/d.rows.length):0;
 if(coverage<70)errors.push('Kanıtlı öğrenme çıktısı kapsamı %70 altında.');
 const weights=d.rubric.reduce((n,r)=>n+r.weight,0);
 if(weights!==100||d.rubric.some(r=>!Number.isFinite(r.weight)||r.weight<=0))errors.push('Rubrik ağırlıkları pozitif olmalı ve toplamı %100 olmalı.');
 const scoresValid=d.rubric.length===d.rows.length&&new Set(d.rubric.map(r=>r.outcomeId)).size===d.rows.length&&d.rubric.every(r=>d.rows.some(o=>o.id===r.outcomeId)&&Number.isInteger(r.score)&&r.score>=0&&r.score<=4&&r.feedback.trim().length>=8);
 if(!scoresValid)errors.push('Tüm rubrik ölçütlerine puan ve gerekçe girin.');
 const score=scoresValid&&weights===100?Math.round(d.rubric.reduce((n,r)=>n+r.score/4*r.weight,0)*100)/100:null;
 if(score!==null&&score<70)errors.push('Rubrik puanı pilot %70 eşiğinin altında.');
 if(!d.issuerChecked)errors.push('Düzenleyen kurum teyidi bekleniyor.');
 if(!d.reviewed||d.reviewReason.trim().length<20)errors.push('Gerekçeli insan incelemesi tamamlanmadı.');
 return {...workload,coverage,covered:covered.length,total:d.rows.length,mapped:mapped.length,weights,score,errors,eligible:errors.length===0};
}
export function saveDesign(s,d,ref=bundled){if(!referenceEditors.includes(s.role))throw Error('Bu rol tasarım kaydedemez.');const a=s.applications.find(x=>x.id===d.applicationId);if(!a||['commission','approved','rejected'].includes(a.status))throw Error('Kurula sevk edilen veya karara bağlanan dosya değiştirilemez.');const work=ensureReferenceState(s);if(d.referenceVersion!==ref.version)throw Error('Kaynak sürümünü inceleyip güncelleyin.');const copy=structuredClone(d);copy.version=(work.designs[a.id]?.version||0)+1;copy.updatedAt=new Date().toISOString();work.designs[a.id]=copy;work.history.unshift({applicationId:a.id,version:copy.version,at:copy.updatedAt,role:s.role,score:assessDesign(copy,ref).score});if(a.referenceTrace){a.match=null;a.referenceTrace=null;}return copy;}
export function applyDesign(s,d,ref=bundled){if(!['coordinator','commission'].includes(s.role))throw Error('Eşlemeyi Koordinatörlük veya Komisyon dosyaya uygulayabilir.');const a=s.applications.find(x=>x.id===d.applicationId);if(!a||!['review','revision'].includes(a.status))throw Error('Dosya akademik inceleme aşamasında olmalı.');const result=assessDesign(d,ref);if(!result.eligible)throw Error(result.errors[0]);const saved=saveDesign(s,d,ref);a.hours=result.hours;a.evidence=true;a.issuerChecked=true;a.target=ref.programs.find(p=>p.id===saved.programId).title;a.match={...result,policyVersion:s.policy.version,recommendation:'Kaynak, matris ve rubrik ile kurula hazır',gaps:[]};a.referenceTrace={referenceVersion:ref.version,designVersion:saved.version,programId:saved.programId,sourceIds:[...new Set(saved.rows.map(r=>ref.levels.find(l=>l.id===r.levelId).sourceId).concat('gazi-pc','gazi-akts'))],matrix:structuredClone(saved.rows),rubric:structuredClone(saved.rubric),evidence:structuredClone(saved.evidence),workload:structuredClone(saved.workload),score:result.score,reviewReason:saved.reviewReason,officialDecision:false};return result;}
export async function digestEvidence(text,cryptoApi=globalThis.crypto){if(text.trim().length<20)throw Error('Kanıt açıklaması en az 20 karakter olmalı.');const bytes=await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
