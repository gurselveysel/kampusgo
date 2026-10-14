import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localExternalCredential} from './helpers/local-external-credential.mjs';
import {localRecognitionPolicy,localRecognitionBasis} from './helpers/local-recognition.mjs';
import {latestRecognitionTechnical} from '../myys/recognition-review.mjs';
import {issuerDigest} from '../myys/recognition-issuer.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
const error=code=>e=>e.code===code;
async function setup(f,{reviewed=true}={}){
 const x=await localExternalCredential(f),t=x.config.tenant;
 const review=async(row=x,patch={})=>{const old=latestRecognitionTechnical(f.s,t,row.request.id),proof=await x.verifier.verify(f.context('it'),row.document.id);return f.run('it','recognition-technical',{requestId:row.request.id,outcome:'accepted',method:'verified-file-reviewed',verificationId:proof.id,statusChecked:true,statusOutcome:'active',statusReference:x.reason,reportReference:x.reason,reason:x.reason,...(old?{previousTechnicalId:old.id,changeReason:x.reason}:{}),...patch});};
 const input=(row=x,patch={})=>({requestId:row.request.id,expectedTechnicalId:latestRecognitionTechnical(f.s,t,row.request.id)?.id||null,outcome:'full',credits:10,remoteCredits:5,gainKey:'GAIN-'+row.request.targetCourseCode,priorCourseChecked:true,priorCourseReference:x.reason,authorityReference:x.reason,reason:x.reason,...patch});
 const tech=reviewed?await review():null;return {...x,review,input,tech};
}
test('B21 arşivli karar rapor sürümü olmadan veya başka sürümle kaydedilemez',()=>use(async f=>{
 const x=await setup(f),input=x.input();delete input.expectedTechnicalId;assert.throws(()=>f.run('judge','recognition-decide',input),error('technical_version'));
 for(const id of [null,'forged'])assert.throws(()=>f.run('judge','recognition-decide',x.input(x,{expectedTechnicalId:id})),error('technical_version'));
 const other=x.deliver(await x.token(x.payload({name:'Başka talep'}))),otherTech=await x.review(other);assert.throws(()=>f.run('judge','recognition-decide',x.input(x,{expectedTechnicalId:otherTech.id})),error('technical_version'));
 assert.equal(f.s.list(x.config.tenant,'recognition-decision').length,0);assert.equal(f.run('judge','recognition-decide',x.input()).technicalId,x.tech.id);
}));
test('B21 ikinci bağlantıdaki yeni olumlu rapor eski açık karar formunun yerine sessizce seçilmez',()=>use(async f=>{
 const x=await setup(f),old=x.input(),next=await x.review(),s2=new LocalAcceptanceStore(f.path);try{const core=new MyysCore(s2),audit=f.s.db.prepare('SELECT count(*) n FROM audit').get().n;assert.throws(()=>core.run({...f.context('judge'),commandId:'stale-technical-positive',action:'recognition-decide',input:old}),error('technical_version'));assert.equal(f.s.db.prepare('SELECT count(*) n FROM audit').get().n,audit);assert.equal(f.s.list(x.config.tenant,'recognition-credit').length,0);assert.equal(f.run('judge','recognition-decide',x.input()).technicalId,next.id);}finally{s2.close();}
}));
test('B21 imzası kapalı negatif karar da görülen rapora bağlıdır; geçerli imza şartı almaz',()=>use(async f=>{
 const x=await setup(f),old=x.input(x,{outcome:'rejected',credits:0,remoteCredits:0}),next=await x.review(x,{outcome:'inconclusive',method:'issuer-record-reviewed'});f.run('it','recognition-issuer-state',{issuerId:x.trust.id,basedOn:issuerDigest(x.trust),target:'key',kid:x.config.keys[0].jwk.kid,state:'compromised',expectedState:'active',incidentReference:x.reason,reason:x.reason});
 assert.throws(()=>f.run('judge','recognition-decide',old),error('technical_version'));const d=f.run('judge','recognition-decide',x.input(x,{outcome:'rejected',credits:0,remoteCredits:0}));assert.equal(d.technicalId,next.id);assert.equal(d.credits,0);
}));
test('B21 arşivli raporsuz negatif karar yokluğu açık null sürümüyle teyit eder',()=>use(async f=>{
 const x=await setup(f,{reviewed:false}),p=x.input(x,{outcome:'rejected',credits:0,remoteCredits:0});delete p.expectedTechnicalId;assert.throws(()=>f.run('judge','recognition-decide',p),error('technical_version'));const d=f.run('judge','recognition-decide',{...p,expectedTechnicalId:null});assert.equal(d.technicalId,null);assert.equal(d.credits,0);
}));
test('B21 arşivsiz yeni karar da açık rapor sürümü ister; eski rapor kaydı korunur',()=>use(async f=>{
 const x=await setup(f),manual=[];for(let i=0;i<2;i++){const r=f.run('student','recognition-request',{...x.request,sourceDigest:String(i+5).repeat(64),targetCourseCode:'MANUAL-'+i}),tech=f.run('it','recognition-technical',{requestId:r.id,outcome:'accepted',method:'issuer-record-reviewed',reportReference:x.reason,reason:x.reason});manual.push({request:r,tech});}
 const legacy=x.input(manual[0]);delete legacy.expectedTechnicalId;assert.throws(()=>f.run('judge','recognition-decide',legacy),error('technical_version'));assert.equal(f.run('judge','recognition-decide',x.input(manual[0])).technicalId,manual[0].tech.id);
 const stale=x.input(manual[1]),next=f.run('it','recognition-technical',{requestId:manual[1].request.id,previousTechnicalId:manual[1].tech.id,changeReason:x.reason,outcome:'accepted',method:'issuer-record-reviewed',reportReference:x.reason,reason:x.reason});assert.throws(()=>f.run('judge','recognition-decide',stale),error('technical_version'));assert.equal(f.run('judge','recognition-decide',x.input(manual[1])).technicalId,next.id);
}));
test('B21 teklifte her arşivli satır kendi rapor sürümünü ister; tek eski satır bütün kararı geri alır',()=>use(async f=>{
 const x=await setup(f),policy=f.run('admin','recognition-policy',{...localRecognitionPolicy,code:'VERSION-GROUP',transferScope:'multi-course-offer'});localRecognitionBasis(f,policy);f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason:x.reason});
 const rows=[];for(let i=0;i<2;i++){const r=x.deliver(await x.token(x.payload({name:'Ayrı çıktı '+i})),{policyId:policy.id,sourceOutcomeKey:'VERSION-OUTCOME-'+i});await x.review(r);rows.push(r);}
 const o=f.run('student','recognition-offer',{requestIds:rows.map(r=>r.request.id),title:'Rapor sürümü teklifi',reason:x.reason}),input={offerId:o.id,previousDecisionId:null,reason:x.reason,authorityReference:x.reason,rows:rows.map(r=>x.input(r))},missing=structuredClone(input);missing.expectedTechnicalId=input.rows[1].expectedTechnicalId;delete missing.rows[1].expectedTechnicalId;
 assert.throws(()=>f.run('judge','recognition-offer-decide',missing),error('technical_version'));const newer=await x.review(rows[1]),audit=f.s.db.prepare('SELECT count(*) n FROM audit').get().n;assert.throws(()=>f.run('judge','recognition-offer-decide',input),error('technical_version'));assert.equal(f.s.list(x.config.tenant,'recognition-decision').length,0);assert.equal(f.s.list(x.config.tenant,'recognition-credit').length,0);assert.equal(f.s.db.prepare('SELECT count(*) n FROM audit').get().n,audit);
 const d=f.run('judge','recognition-offer-decide',{...input,rows:rows.map(r=>x.input(r))});assert.equal(d.credits,20);assert.ok(d.rowDecisionIds.some(id=>f.s.get(x.config.tenant,'recognition-decision',id).technicalId===newer.id));
}));
