import {LocalAcceptanceStore,hash,requireThat} from './store.mjs';
import {stableStringify} from './program-model.mjs';
export const recognitionDocumentLimit=32768;
export const recognitionDocumentQuota={person:25,tenant:250};
const actions=['recognition-document','recognition-document-download'];
const digest=r=>hash(stableStringify(r));
const learner=(a,r)=>a.mfa&&a.id===r.owner&&a.memberships.some(m=>m.unit===r.unit&&m.roles.includes('learner'));
const reader=(a,r)=>learner(a,r)||a.mfa&&a.memberships.some(m=>m.unit===r.unit&&m.roles.some(role=>['it','commission','quality','studentAffairs'].includes(role)));
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Belge teslimi yalnız izole yerel kabulde kullanılabilir.',503);
const shape=(p,keys)=>requireThat(Object.keys(p).every(k=>keys.includes(k)),'document_fields','Belge tesliminde tanınmayan alan var.');
function request(s,a,id,write=false){const r=s.get(a.tenant,'recognition-request',id);requireThat(r&&(write?learner(a,r):reader(a,r)),'not_found','Tanıma talebi bulunamadı veya erişilemiyor.',404);return r;}
function storedFile(s,a,d){
 const r=request(s,a,d.requestId),f=s.get(a.tenant,'recognition-document-file',d.id);
 requireThat(d.owner===r.owner&&d.unit===r.unit&&digest(r)===d.requestDigest&&d.sha256===r.sourceDigest&&f?.owner===d.owner&&f.unit===d.unit&&typeof f.base64==='string','document_changed','Belge ile talep arasındaki bağ doğrulanamadı.',409);
 const bytes=Buffer.from(f.base64,'base64');requireThat(bytes.length===d.bytes&&bytes.length<=recognitionDocumentLimit&&hash(bytes)===d.sha256&&bytes.toString('base64')===f.base64,'document_changed','Arşivdeki belgenin bütünlüğü doğrulanamadı.',409);return f;
}
export function recognitionDocumentReplay(a,action,r){if(!actions.includes(action))return false;requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Belge teslimi canlı ortamda kapalıdır.',503);requireThat(action==='recognition-document'?learner(a,r):a.mfa&&a.id===r.owner&&a.memberships.some(m=>m.unit===r.unit),'forbidden','Güncel kişi, birim ve çok faktörlü doğrulama gerekli.',403);return true;}
export function recognitionDocumentFileResult(s,a,receipt){
 local(s);const d=s.get(a.tenant,'recognition-document',receipt.documentId);requireThat(d&&reader(a,d)&&receipt.owner===a.id&&receipt.requestId===d.requestId&&receipt.sha256===d.sha256,'not_found','Belge bulunamadı veya erişilemiyor.',404);
 const f=storedFile(s,a,d);return {...receipt,file:{name:'MYYS_dis-belge_'+d.id+'.jwt',base64:f.base64,bytes:d.bytes,sha256:d.sha256,mediaType:'application/octet-stream'}};
}
// Internal adapter access; never exposed as an unaudited HTTP download.
export function readRecognitionDocument(s,a,id){local(s);const d=s.get(a.tenant,'recognition-document',id);requireThat(d&&reader(a,d),'not_found','Belge bulunamadı veya erişilemiyor.',404);return {document:d,request:request(s,a,d.requestId),base64:storedFile(s,a,d).base64};}
export function recognitionDocumentCommand({action,p,a,s,put,id}){
 if(!actions.includes(action))return null;local(s);
 if(action==='recognition-document-download'){
  shape(p,['documentId']);const d=s.get(a.tenant,'recognition-document',p.documentId);requireThat(d&&reader(a,d),'not_found','Belge bulunamadı veya erişilemiyor.',404);
  storedFile(s,a,d);const receipt=put('recognition-document-download',{id:id(),unit:d.unit,owner:a.id,documentId:d.id,requestId:d.requestId,sha256:d.sha256,official:false});return recognitionDocumentFileResult(s,a,receipt);
 }
 shape(p,['requestId','fileName','base64']);const r=request(s,a,p.requestId,true);
 requireThat(!s.list(a.tenant,'recognition-technical').some(x=>x.requestId===r.id)&&!s.list(a.tenant,'recognition-decision').some(x=>x.requestId===r.id),'document_review_started','İncelemesi başlamış talebin belgesi değiştirilemez. Yeni belge için yeni talep hazırlayın.',409);
 const documents=s.list(a.tenant,'recognition-document');requireThat(!documents.some(x=>x.requestId===r.id),'duplicate','Bu talebin belgesi zaten teslim edildi.',409);
 requireThat(documents.length<recognitionDocumentQuota.tenant&&documents.filter(x=>x.owner===a.id).length<recognitionDocumentQuota.person,'document_quota','Yerel belge arşivinin kişi veya kurum kotası doldu.',409);
 requireThat(typeof p.fileName==='string'&&/^[\p{L}\p{N} _.-]{1,120}\.jwt$/iu.test(p.fileName)&&!p.fileName.startsWith('.'),'document_format','Bu teslim yolu yalnız JWT dosyası kabul eder.');
 requireThat(typeof p.base64==='string'&&p.base64.length<=4*Math.ceil(recognitionDocumentLimit/3)&&/^[A-Za-z0-9+/]+={0,2}$/.test(p.base64),'document_size','Belge boş olamaz ve 32 KiB sınırını aşamaz.');
 const bytes=Buffer.from(p.base64,'base64');requireThat(bytes.length>0&&bytes.length<=recognitionDocumentLimit&&bytes.toString('base64')===p.base64,'document_size','Belgenin kodlaması veya boyutu geçersiz.');
 // Compact-token syntax is only a storage allowlist, never signature/issuer/subject validation.
 requireThat(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(bytes.toString('ascii'))&&bytes.every(b=>b<128),'document_format','Belge üç parçalı JWT metni olmalı; başında veya sonunda boşluk bulunmamalı.');
 requireThat(hash(bytes)===r.sourceDigest,'document_digest','Seçilen dosya talepteki dosya özetiyle aynı değil.',409);
 const d=put('recognition-document',{id:id(),unit:r.unit,owner:r.owner,requestId:r.id,requestDigest:digest(r),fileName:p.fileName,bytes:bytes.length,sha256:hash(bytes),format:'compact-jwt',authenticityVerified:false,subjectVerified:false,malwareScanned:false,official:false});
 put('recognition-document-file',{id:d.id,unit:d.unit,owner:d.owner,base64:p.base64});return d;
}
export function recognitionDocumentView(s,a,requests){
 const documents=s.list(a.tenant,'recognition-document');return requests.map(r=>{const d=documents.find(x=>x.requestId===r.id),started=['recognition-technical','recognition-decision'].some(k=>s.list(a.tenant,k).some(x=>x.requestId===r.id));return {...r,document:d?{...d,canDownload:reader(a,d)}:null,canDeliverDocument:learner(a,r)&&!d&&!started};});
}
