import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {signedFixture} from './helpers/local-signing.mjs';
import {downloadWalletCredential} from '../myys/wallet.mjs';
import {myysRoute,configuredCore} from '../myys/http.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
const purpose='Kişisel yerel kabul belgesinin sınırlı özet paylaşımı';
test('İmzalı cüzdan yalnız sahipte; teknik ve akademik roller belgeyi indiremez',()=>use(async f=>{
 const x=await signedFixture(f),view=f.core.view(f.context('student'));
 assert.equal(view.wallet[0].state,'signed');assert.equal(view.wallet[0].visibility,'private');
 const out=downloadWalletCredential(f.core,f.context('student'),x.issuance.id);assert.equal(out.jwt,x.signed.jwt);assert.equal(out.credential.academicDecision.id,x.d.id);
 for(const who of ['other','teacher','admin','it','issuer']){assert.equal(f.core.view(f.context(who)).wallet.length,0);assert.throws(()=>downloadWalletCredential(f.core,f.context(who),x.issuance.id),e=>e.code==='not_found');}
}));
test('İmzasız hazırlık indirilebilir veya paylaşılabilir belge gibi gösterilmez',()=>use(f=>{
 const {d}=f.passed(),r=f.run('issuer','issue',{decisionId:d.id}),w=f.core.view(f.context('student')).wallet[0];
 assert.equal(w.state,'awaiting-signature');assert.equal(w.canDownload,false);assert.equal(w.canShare,false);
 assert.throws(()=>downloadWalletCredential(f.core,f.context('student'),r.id),e=>e.code==='not_signed');
}));
test('Paylaşım anahtarı işlem önbelleği, görünüm veya denetim kaydına yazılmaz',()=>use(async f=>{
 const x=await signedFixture(f),commandId=randomUUID(),input={issuanceId:x.issuance.id,hours:1,purpose};
 const share=f.run('student','share',input,commandId),again=f.run('student','share',input,commandId);
 assert.equal(again.token,undefined);assert.equal(again.linkAlreadyCreated,true);
 const rows=f.s.db.prepare('SELECT result FROM commands').all();assert.ok(!JSON.stringify(rows).includes(share.token));
 assert.ok(!JSON.stringify(f.s.db.prepare('SELECT * FROM audit').all()).includes(share.token));
 const wallet=f.core.view(f.context('student')).wallet;assert.ok(!JSON.stringify(wallet).includes(share.token));assert.ok(!JSON.stringify(wallet).includes('tokenHash'));
 assert.equal(f.core.shared({tenant:'test-gazi',token:share.token}).state,'signed');
}));
test('Paylaşım iptali yeni anonim erişimi hemen keser; iptal tekrarı tek kayıttır',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose});
 const first=f.run('student','unshare',{shareId:share.id});assert.equal(f.run('student','unshare',{shareId:share.id}).id,first.id);
 assert.throws(()=>f.core.shared({tenant:'test-gazi',token:share.token}),e=>e.code==='not_found');
 assert.equal(f.core.view(f.context('student')).wallet[0].shares[0].state,'revoked');
}));
test('Paylaşım süresi, başka kurum, bozuk anahtar ve üyelikten ayrılma reddedilir',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose});
 for(const params of [{tenant:'other',token:share.token},{tenant:'test-gazi',token:null},{tenant:'test-gazi',token:'x'.repeat(5000)}])assert.throws(()=>f.core.shared(params),e=>e.code==='not_found');
 f.core.clock=()=>share.expires;assert.throws(()=>f.core.shared({tenant:'test-gazi',token:share.token}),e=>e.code==='not_found');
 f.core.clock=()=>new Date().toISOString();f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');assert.throws(()=>f.core.shared({tenant:'test-gazi',token:share.token}),e=>e.code==='not_found');
}));
test('Açık itiraz imzalı cüzdanı bloke eder; eski paylaşım güncel durumu gösterir',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose});
 f.run('student','appeal',{decisionId:x.d.id,reason:'Bu karardaki öğrenme kanıtını yeniden incelemenizi istiyorum.'});
 const wallet=f.core.view(f.context('student')).wallet[0];assert.equal(wallet.state,'blocked');assert.equal(wallet.canDownload,false);
 assert.equal(f.core.shared({tenant:'test-gazi',token:share.token}).state,'blocked');
 assert.throws(()=>f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose}),e=>e.code==='decision_blocked');
 assert.throws(()=>downloadWalletCredential(f.core,f.context('student'),x.issuance.id),e=>e.code==='decision_blocked');
}));
test('Cüzdan ve paylaşım durumları ayrı depo bağlantısında aynen görünür',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:24,purpose}),s2=new LocalAcceptanceStore(f.path);
 try{const core=new MyysCore(s2);assert.deepEqual(core.view(f.context('student')).wallet,f.core.view(f.context('student')).wallet);assert.equal(core.shared({tenant:'test-gazi',token:share.token}).state,'signed');}finally{s2.close();}
}));
test('Yerel anonim HTTP özeti yalnız beş izinli alan döndürür; kimlik ve kanıt yok',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose});let output;
 await myysRoute({req:{method:'POST'},path:'/api/myys/paylasim',b:{tenant:'test-gazi',token:share.token},sessionHash:null,core:f.core,json:(res,status,data)=>{output={status,data};}});
 assert.equal(output.status,200);assert.deepEqual(Object.keys(output.data).sort(),['issuer','official','pilot','state','title']);
 assert.ok(!JSON.stringify(output).includes(x.ev.content));assert.ok(!JSON.stringify(output).includes('student'));
}));
test('Üretim kapısı ve kimliksiz indirme kapalı kalır',()=>use(async f=>{
 let output;const json=(res,status,data)=>{output={status,data};};
 await myysRoute({req:{method:'POST'},path:'/api/myys/paylasim',b:{},core:null,json});assert.equal(output.status,503);
 await myysRoute({req:{method:'POST'},path:'/api/myys/cuzdan-indir',b:{},core:f.core,sessionHash:null,json});assert.equal(output.status,401);
 const previous=process.env.VERCEL;try{process.env.VERCEL='1';assert.equal(configuredCore(),null);}finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
}));
