import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {use} from './helpers/myys-fixture.mjs';
import {localExternalCredential} from './helpers/local-external-credential.mjs';
import {localRecognitionPolicy,localRecognitionBasis} from './helpers/local-recognition.mjs';
import {LocalExternalCredentialVerifier} from '../myys/recognition-verifier.mjs';
import {recognitionSourceIdentity,creditSourceIdentity} from '../myys/recognition-source-identity.mjs';
import {issuerDigest} from '../myys/recognition-issuer.mjs';
import {recognitionLedger} from '../myys/recognition.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
const error=code=>e=>e.code===code;
async function setup(f){
 const x=await localExternalCredential(f);
 const review=async(row,verifier=x.verifier)=>{const proof=await verifier.verify(f.context('it'),row.document.id);return f.run('it','recognition-technical',{requestId:row.request.id,outcome:'accepted',method:'verified-file-reviewed',verificationId:proof.id,statusChecked:true,statusOutcome:'active',statusReference:x.reason,reportReference:x.reason,reason:x.reason});};
 const input=(row,patch={})=>({requestId:row.request.id,outcome:'full',credits:10,remoteCredits:5,gainKey:'GAIN-'+row.request.targetCourseCode,priorCourseChecked:true,priorCourseReference:x.reason,authorityReference:x.reason,reason:x.reason,...patch});
 const decide=(row,patch={},who='judge')=>f.run(who,'recognition-decide',input(row,patch));
 const duplicate=async(changes={})=>{const row=x.deliver(await x.token(x.payload({name:'Yeni imzalı sentetik nüsha'})),changes);row.tech=await review(row);return row;};
 const tech=await review(x);return {...x,review,input,decide,duplicate,tech};
}
async function additionalSource(f,x,{issuer=x.config.issuer,version='local-2',previous=x.trust}={}){
 const pair=await generateKeyPair('RS256',{modulusLength:2048}),jwk={...await exportJWK(pair.publicKey),alg:'RS256',use:'sig',kid:issuer+'/keys#second'};
 const config={...structuredClone(x.config),id:previous?x.config.id:'distinct-external-issuer',issuer,version,keys:[{jwk,notBefore:'2000-01-01T00:00:00.000Z',notAfter:'2099-01-01T00:00:00.000Z'}]},verifier=new LocalExternalCredentialVerifier(f.core,config);
 const trust=f.run('it','recognition-issuer',{...x.issuerInput,descriptor:verifier.descriptor,...(previous?{previousId:previous.id,changeReason:x.reason}:{})});f.run('admin','recognition-issuer-review',x.reviewInput(trust));
 const jwt=await new SignJWT(x.payload({issuer,iss:issuer,name:'Başka anahtarla sentetik nüsha'})).setProtectedHeader({alg:'RS256',typ:'vc+jwt',kid:jwk.kid}).sign(pair.privateKey);
 const row=x.deliver(jwt);row.tech=await x.review(row,verifier);return row;
}
test('B21 yeniden imzalı aynı belge çıktısı yeni dosya/gain/ders ile ikinci kredi olamaz',()=>use(async f=>{
 const x=await setup(f),d=x.decide(x),next=await x.duplicate({sourceOutcomeKey:' ＥＸＴＥＲＮＡＬ-ＯＵＴＣＯＭＥ '});assert.notEqual(next.request.sourceDigest,x.request.sourceDigest);
 const before=JSON.stringify(recognitionLedger(f.s,x.config.tenant));assert.throws(()=>x.decide(next,{sourceIdentity:{scheme:'forged',key:'different'}}),error('double_counting'));assert.equal(JSON.stringify(recognitionLedger(f.s,x.config.tenant)),before);
 assert.equal(recognitionSourceIdentity(f.s,x.config.tenant,next.request,next.tech).key,creditSourceIdentity(f.s,x.config.tenant,recognitionLedger(f.s,x.config.tenant)[0]).key);
 const view=f.core.view(f.context('student')).recognition;assert.equal(view.requests.find(r=>r.id===next.request.id).sourceConflict,true);assert.equal(view.requests.find(r=>r.id===x.request.id).sourceConflict,false);assert.equal(view.decisions[0].id,d.id);
}));
test('B21 eski anahtar kapalı ve yeni anahtar incelenmiş olsa da eski etkin kredi sayılır',()=>use(async f=>{
 const x=await setup(f);x.decide(x);f.run('it','recognition-issuer-state',{issuerId:x.trust.id,basedOn:issuerDigest(x.trust),target:'key',kid:x.config.keys[0].jwk.kid,state:'compromised',expectedState:'active',incidentReference:x.reason,reason:x.reason});
 const row=await additionalSource(f,x);assert.equal(f.core.view(f.context('student')).recognition.credits[0].held,true);assert.throws(()=>x.decide(row),error('double_counting'));
}));
test('B21 eski kredinin kimliği son teknik rapordan değil kararın sabitlediği rapordan gelir',()=>use(async f=>{
 const x=await setup(f);x.decide(x);const row=await x.duplicate();f.run('it','recognition-technical',{requestId:x.request.id,previousTechnicalId:x.tech.id,changeReason:x.reason,outcome:'inconclusive',method:'issuer-record-reviewed',reportReference:x.reason,reason:x.reason});
 assert.equal(f.core.view(f.context('student')).recognition.credits[0].held,true);assert.throws(()=>x.decide(row),error('double_counting'));
}));
test('B21 yalnız bağımsız olumsuz karar ve ters kayıt eski belge çıktısını serbest bırakır',()=>use(async f=>{
 const x=await setup(f),d=x.decide(x),row=await x.duplicate(),ap=f.run('student','recognition-appeal',{decisionId:d.id,reason:x.reason});assert.throws(()=>x.decide(row),error('double_counting'));
 const res=f.run('reviewer','recognition-resolve',{appealId:ap.id,outcome:'reassessment',reason:x.reason});assert.throws(()=>x.decide(row),error('double_counting'));x.decide(x,{outcome:'rejected',credits:0,remoteCredits:0,resolutionId:res.id},'publisher');
 const fresh=x.decide(row);assert.equal(recognitionLedger(f.s,x.config.tenant).length,1);assert.equal(recognitionLedger(f.s,x.config.tenant)[0].decisionId,fresh.id);assert.equal(f.s.get(x.config.tenant,'recognition-decision',d.id).credits,10);
}));
test('B21 aynı doğrulanmış belgenin ayrı insan eşlemeli çıktı kimlikleri ayrı incelenebilir',()=>use(async f=>{
 const x=await setup(f);x.decide(x);const row=await x.duplicate({sourceOutcomeKey:'EXTERNAL-SECOND-OUTCOME'});x.decide(row);assert.equal(recognitionLedger(f.s,x.config.tenant).length,2);
}));
test('B21 farklı doğrulanmış düzenleyici aynı belge kimliğine sahip olabilir',()=>use(async f=>{
 const x=await setup(f);x.decide(x);const row=await additionalSource(f,x,{issuer:'https://second-credential.invalid',previous:null});assert.equal(row.request.sourceCredentialId,x.request.sourceCredentialId);x.decide(row);assert.equal(recognitionLedger(f.s,x.config.tenant).length,2);
}));
test('B21 aynı düzenleyicinin farklı belge kimlikleri aynı çıktı etiketiyle karıştırılmaz',()=>use(async f=>{
 const x=await setup(f);x.decide(x);const id=x.config.issuer+'/credentials/different',row=x.deliver(await x.token(x.payload({id,jti:id})),{sourceCredentialId:id});await x.review(row);x.decide(row);assert.equal(recognitionLedger(f.s,x.config.tenant).length,2);
}));
test('B21 aynı belge çıktısının başka kişiye geçerli eşlemesi ilk kişinin kredisiyle karışmaz',()=>use(async f=>{
 const x=await setup(f);x.decide(x);const e=f.run('author','enroll',{programId:x.initial.p.id,learnerId:'other'}),jwt=await x.token(x.payload({sub:'urn:synthetic:external-other',credentialSubject:{id:'urn:synthetic:external-other'}}));
 const request=f.run('other','recognition-request',{...x.request,enrollmentId:e.id,sourceDigest:hash(jwt),targetCourseCode:'OTHER-COURSE'}),document=f.run('other','recognition-document',{requestId:request.id,fileName:'other.jwt',base64:Buffer.from(jwt).toString('base64')});const row={request,document};await x.review(row);x.decide(row);assert.equal(recognitionLedger(f.s,x.config.tenant).length,2);assert.equal(f.core.view(f.context('other')).recognition.requests.length,1);
}));
test('B21 tek teklifte yeniden imzalı aynı çıktı ikinci satırda bütün işlemi geri alır',()=>use(async f=>{
 const x=await setup(f),policy=f.run('admin','recognition-policy',{...localRecognitionPolicy,code:'IDENTITY-GROUP',transferScope:'multi-course-offer'});localRecognitionBasis(f,policy);f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason:x.reason});
 const rows=[];for(let i=0;i<2;i++){const row=x.deliver(await x.token(x.payload({name:'Grup kopyası '+i})),{policyId:policy.id});await x.review(row);rows.push(row);}
 const offer=f.run('student','recognition-offer',{requestIds:rows.map(r=>r.request.id),title:'Aynı çıktı grubu',reason:x.reason}),audit=f.s.db.prepare('SELECT count(*) n FROM audit').get().n;
 assert.throws(()=>f.run('judge','recognition-offer-decide',{offerId:offer.id,previousDecisionId:null,reason:x.reason,authorityReference:x.reason,rows:rows.map(r=>x.input(r))}),error('double_counting'));
 assert.equal(recognitionLedger(f.s,x.config.tenant).length,0);assert.equal(f.s.list(x.config.tenant,'recognition-decision').length,0);assert.equal(f.s.list(x.config.tenant,'recognition-offer-decision').length,0);assert.equal(f.s.db.prepare('SELECT count(*) n FROM audit').get().n,audit);
}));
test('B21 ikinci SQLite bağlantısının eski formu ilk krediden sonra aynı çıktıyı yazamaz',()=>use(async f=>{
 const x=await setup(f),row=await x.duplicate(),s2=new LocalAcceptanceStore(f.path);try{const other=new MyysCore(s2),input=x.input(row);x.decide(x);assert.throws(()=>other.run({...f.context('judge'),commandId:'stale-second-credit',action:'recognition-decide',input}),error('double_counting'));assert.equal(recognitionLedger(f.s,x.config.tenant).length,1);}finally{s2.close();}
}));
test('B21 elle yazılmış düzenleyici ve kimlik alanları doğrulanmış kaynak kimliği üretmez',()=>use(async f=>{
 const x=await setup(f);const r=f.run('student','recognition-request',{...x.request,sourceDigest:'e'.repeat(64),targetCourseCode:'MANUAL-DECLARATION'}),t=f.run('it','recognition-technical',{requestId:r.id,outcome:'accepted',method:'issuer-record-reviewed',reportReference:x.reason,reason:x.reason,verificationId:x.tech.verification.id,sourceIdentity:{key:'forged'}});
 assert.equal(recognitionSourceIdentity(f.s,x.config.tenant,r,t),null);assert.equal(f.core.view(f.context('it')).recognition.requests.some(r=>'sourceConflict' in r),false);
}));
