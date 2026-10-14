import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
import {stableStringify,programBaseline} from './program-model.mjs';
import {semChecklist} from './sem-dossier-model.mjs';
const actions=['sem-dossier','sem-review','sem-package','sem-withdraw'];
const text=(v,min=20,max=2000)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const role=(a,u,roles)=>a.mfa&&a.memberships.some(m=>m.unit===u&&m.roles.some(r=>roles.includes(r)));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Merkezî SEM hazırlığı yalnız izole yerel kabulde çalışır.',503);
const rows=(s,t,kind)=>s.list(t,kind);
const latest=(s,t,d)=>rows(s,t,'sem-dossier').filter(r=>r.programId===d.programId).at(-1);
const review=(s,t,d)=>rows(s,t,'sem-review').find(r=>r.dossierId===d.id);
const withdrawn=(s,t,d)=>rows(s,t,'sem-withdrawal').find(r=>r.dossierId===d.id);
const packet=(s,t,d)=>rows(s,t,'sem-package').find(r=>r.dossierId===d.id);
const active=(s,t,person,unit,required,now)=>{const m=s.db.prepare('SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?').get(t,person,unit,now);return !!m&&JSON.parse(m.roles).includes(required);};
const incomplete=d=>Object.entries(semChecklist).filter(([key])=>d.checklist.find(r=>r.key===key)?.state!=='documented').map(([key,label])=>({key,label}));
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function source(v,now){requireThat(v&&text(v.title,3,200)&&text(v.reference,12,2000)&&text(v.version,1,80)&&text(v.readScope)&&validDay(v.date)&&v.date<=now.slice(0,10),'sem_source','Kaynağın başlığı, referansı, sürümü, tarihi ve okunan kapsam gerekli.');return {title:v.title,reference:v.reference,version:v.version,date:v.date,readScope:v.readScope,verification:'local-human-record',official:false};}
export const semDigest=d=>hash(stableStringify({id:d.id,programId:d.programId,programDigest:d.programDigest,version:d.version,checklist:d.checklist,sources:d.sources,reason:d.reason}));
const independent=(s,a,d)=>role(a,d.unit,['commission'])&&![d.createdBy,d.owner,s.get(a.tenant,'program',d.programId)?.createdBy].includes(a.id);
export function semReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Üretim SEM hazırlığı kapalı.',503);requireThat(role(a,r.unit,action==='sem-review'?['commission']:action==='sem-package'?['studentAffairs']:['coordinator']),'forbidden','Güncel birim görevi ve çok faktörlü oturum gerekli.',403);return true;}
export function semCommand({action,p,a,s,put,id,now}){
 if(!actions.includes(action))return null;local(s);
 if(action==='sem-dossier'){
  const program=typeof p.programId==='string'&&s.get(a.tenant,'program',p.programId);requireThat(program&&role(a,program.unit,['coordinator']),'not_found','Yetkili birimde program sürümü gerekli.',404);
  requireThat(program.pathway==='sem-central'&&program.mode==='pilot'&&rows(s,a.tenant,'publication').some(r=>r.programId===program.id),'sem_pathway','Yayımlanmış yerel merkezî SEM program sürümü gerekli; mikro yeterlilik yolu ayrı tutulur.');
  requireThat(p.localOnly===true&&!p.externalSubmitted&&!p.externalApproval&&!p.localIssuanceAllowed,'sem_external','Yerel hazırlık gerçek merkezî onay, gönderim veya ihraç değildir.');
  requireThat(text(p.reason),'sem_reason','Hazırlık gerekçesi gerekli.');
  const keys=Object.keys(semChecklist);requireThat(Array.isArray(p.checklist)&&p.checklist.length===keys.length&&new Set(p.checklist.map(r=>r.key)).size===keys.length&&p.checklist.every(r=>keys.includes(r.key)&&['pending','documented'].includes(r.state)&&text(r.reference,12)&&text(r.note,12)),'sem_checklist','Her iç kontrol satırı için durum, dayanak ve açıklama gerekli.');
  const previous=rows(s,a.tenant,'sem-dossier').filter(r=>r.programId===program.id).at(-1);requireThat(previous?p.previousDossierId===previous.id&&text(p.changeReason):!p.previousDossierId,'sem_changed','Yeni dosya sürümü güncel önceki sürüme ve gerekçeye bağlanmalı.',409);
  return put('sem-dossier',{id:id(),unit:program.unit,owner:a.id,programId:program.id,programSnapshot:programBaseline(program),programDigest:hash(stableStringify(programBaseline(program))),version:(previous?.version||0)+1,previousDossierId:previous?.id||null,changeReason:previous?p.changeReason:null,reason:p.reason,checklist:keys.map(key=>{const r=p.checklist.find(r=>r.key===key);return {key,state:r.state,reference:r.reference,note:r.note};}),sources:{central:source(p.sources?.central,now),institution:source(p.sources?.institution,now)},official:false,externalSubmitted:false,externalApproval:null,centralIssuerVerified:false,localIssuanceAllowed:false});
 }
 const d=typeof p.dossierId==='string'&&s.get(a.tenant,'sem-dossier',p.dossierId);const required=action==='sem-review'?['commission']:action==='sem-package'?['studentAffairs']:['coordinator'];requireThat(d&&role(a,d.unit,required),'not_found','Yetkili birimde SEM dosyası gerekli.',404);
 requireThat(latest(s,a.tenant,d)?.id===d.id&&!withdrawn(s,a.tenant,d),'sem_changed','Güncel ve geri çekilmemiş dosya sürümü gerekli.',409);
 requireThat(p.basedOn===semDigest(d),'sem_changed','Dosya dayanağı değişti; güncel sürümü açın.',409);
 if(action==='sem-withdraw'){requireThat(text(p.reason),'sem_reason','Geri çekme gerekçesi gerekli.');return put('sem-withdrawal',{id:id(),unit:d.unit,owner:d.owner,dossierId:d.id,reason:p.reason,externalWithdrawalSent:false,official:false});}
 if(action==='sem-review'){
  requireThat(independent(s,a,d),'separation','Dosyayı hazırlayan ve program hazırlayandan ayrı komisyon incelemeli.',403);
  requireThat(!review(s,a.tenant,d),'sem_reviewed','Bu dosya sürümü zaten incelendi.',409);
  requireThat(active(s,a.tenant,d.createdBy,d.unit,'coordinator',now),'sem_authority','Hazırlayanın güncel koordinatör görevi gerekli.',409);
  requireThat(['ready','correction'].includes(p.outcome)&&text(p.reason),'sem_review','Gerekçeli yerel dosya incelemesi gerekli.');
  requireThat(p.outcome!=='ready'||incomplete(d).length===0,'sem_incomplete','Eksik kontrol satırı olan dosya uygun sayılamaz.');
  return put('sem-review',{id:id(),unit:d.unit,owner:d.owner,dossierId:d.id,dossierDigest:p.basedOn,outcome:p.outcome,reason:p.reason,centralApproval:false,official:false});
 }
 const r=review(s,a.tenant,d);requireThat(r?.outcome==='ready'&&r.dossierDigest===semDigest(d)&&incomplete(d).length===0,'sem_not_ready','Ayrı incelemeden geçen eksiksiz yerel dosya gerekli.',409);
 requireThat(![d.createdBy,r.createdBy,s.get(a.tenant,'program',d.programId)?.createdBy].includes(a.id),'separation','Dosyayı hazırlayan ve inceleyenden ayrı öğrenci işleri görevlisi gerekli.',403);
 requireThat(active(s,a.tenant,d.createdBy,d.unit,'coordinator',now)&&active(s,a.tenant,r.createdBy,d.unit,'commission',now),'sem_authority','Hazırlayan ve inceleyenin güncel görevleri gerekli.',409);
 requireThat(!packet(s,a.tenant,d),'duplicate','Bu sürümün yerel aktarım dosyası zaten hazır.',409);
 const payload={format:'MYYS-LOCAL-SEM-DOSSIER-1',tenant:a.tenant,program:d.programSnapshot,programDigest:d.programDigest,dossier:d,review:r,scope:'local-preparation-only',official:false,externalSubmitted:false,externalApproval:null,centralIssuerVerified:false,localIssuanceAllowed:false};
 return put('sem-package',{id:id(),unit:d.unit,owner:d.owner,dossierId:d.id,payload,sha256:hash(stableStringify(payload)),signed:false,official:false});
}
export function semView(s,a,now){
 const permitted=r=>role(a,r.unit,['coordinator','commission','studentAffairs','quality','admin']);
 return {programs:rows(s,a.tenant,'program').filter(r=>r.pathway==='sem-central'&&permitted(r)).map(r=>({id:r.id,title:r.title,version:r.version,unit:r.unit,canPrepare:role(a,r.unit,['coordinator'])&&rows(s,a.tenant,'publication').some(x=>x.programId===r.id)})),dossiers:rows(s,a.tenant,'sem-dossier').filter(permitted).map(d=>{const r=review(s,a.tenant,d),p=packet(s,a.tenant,d),w=withdrawn(s,a.tenant,d),current=latest(s,a.tenant,d)?.id===d.id&&!w;return {...d,digest:semDigest(d),review:r||null,packet:p||null,withdrawal:w||null,missing:incomplete(d),state:w?'withdrawn':!current?'superseded':p?'prepared':r?.outcome==='ready'?'reviewed':r?'correction':'draft',canReview:current&&!r&&independent(s,a,d)&&active(s,a.tenant,d.createdBy,d.unit,'coordinator',now),canRevise:latest(s,a.tenant,d)?.id===d.id&&role(a,d.unit,['coordinator']),canWithdraw:current&&role(a,d.unit,['coordinator']),canPreparePacket:current&&!p&&r?.outcome==='ready'&&role(a,d.unit,['studentAffairs'])&&![d.createdBy,r.createdBy,s.get(a.tenant,'program',d.programId)?.createdBy].includes(a.id)&&active(s,a.tenant,d.createdBy,d.unit,'coordinator',now)&&active(s,a.tenant,r.createdBy,d.unit,'commission',now),canDownload:current&&!!p};})};
}
