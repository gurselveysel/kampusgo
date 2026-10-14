import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {identityHttpFixture} from './helpers/local-identity-http.mjs';
import {localPaymentSetup,localPaymentOrder,localPaymentRun,localPaymentView} from './helpers/local-payment.mjs';
import {localPortfolioSetup,portfolioPurpose,portfolioReason} from './helpers/local-portfolio.mjs';
import {localRecognitionCase} from './helpers/local-recognition.mjs';
import {subjectExport} from '../myys/privacy.mjs';
import {kindCategory,subjectFields,projectSubjectRecord} from '../myys/privacy-inventory-model.mjs';
import {hash} from '../myys/store.mjs';
const reason='Sentetik kişisel veri kapsamı; gerçek kurum saklama kabulü değildir.';
const out=(f,who='student')=>subjectExport(f.core,f.context(who)).payload;
const overview=(f,who='student')=>f.core.view(f.context(who)).privacy.inventory;

test('B28 veri envanteri oluşturulan 14 teknik tabloyu ve kaynakta anılan bütün kayıt türlerini kapsar',async()=>{
 const inventory=JSON.parse(readFileSync(new URL('../myys/data-inventory.json',import.meta.url))),h=await identityHttpFixture();try{
  const actual=h.f.s.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);assert.deepEqual(inventory.tables.map(t=>t.table),actual);
  for(const table of inventory.tables){assert.deepEqual(table.columns,h.f.s.db.prepare('PRAGMA table_info('+table.table+')').all().map(c=>c.name));assert.equal(table.approvedRetentionDays,null);assert.equal(table.productionAccepted,false);}
 }finally{await h.close();}
 const dir=new URL('../myys/',import.meta.url),kinds=new Set();
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.mjs'))){const text=readFileSync(new URL(file,dir),'utf8');for(const regex of [/\bput\('([a-z0-9-]+)'/g,/\.(?:put|list)\([^,]+,\s*'([a-z0-9-]+)'/g])for(const match of text.matchAll(regex))kinds.add(match[1]);}
 for(const kind of kinds)assert.ok(Object.hasOwn(kindCategory,kind),'Inventory missing '+kind);assert.equal(Object.keys(kindCategory).length,128);assert.equal(inventory.institutionApproved,false);
});

test('B28 destek yanıtı/kapanışı ve mali prova tam sayısal mutabakatı kişi özetine bağlanır',()=>use(f=>{
 const x=localPaymentSetup(f),o=localPaymentOrder(f,x);localPaymentRun(f,o,'captured');const pv=localPaymentView(f).orders[0];f.run('finance','payment-reconcile',{orderId:o.id,expectedRevision:pv.revision,snapshotDigest:pv.snapshotDigest,observedTotals:pv.totals,outcome:'matched',reason});
 const ticket=f.run('student','support',{unit:'engineering',category:'technical',subject:'Sentetik kapsam denemesi',message:reason});f.run('it','support-event',{ticketId:ticket.id,expectedRevision:0,type:'resolve',message:reason});f.run('student','support-event',{ticketId:ticket.id,expectedRevision:1,type:'confirm',message:reason,confirm:true});
 const p=out(f);assert.equal(p.format,'myys-subject-export/2');assert.equal(p.records.support[0].currentState,'closed');assert.equal(p.records['support-event'].length,2);assert.deepEqual(p.records['payment-reconciliation'][0].expectedTotals,pv.totals);assert.equal(p.records['payment-event'][0].amountMinor,10000);assert.equal(p.records['payment-order'][0].externalSubmitted,false);assert.equal(out(f,'other').records['payment-order'].length,0);
 assert.equal(p.inventory.categories.find(c=>c.key==='financial').summaryCount,4);assert.equal(p.inventory.retentionApproved,false);
}));

test('B28 tanıma/OBS öznesi işlem sahibinden ayrılır; görevliye başka kişinin kredi içeriği verilmez',()=>use(f=>{
 const x=localRecognitionCase(f),e=f.run('issuer','obs-prepare',{decisionId:x.decision.id}),r=f.run('it','obs-simulate',{eventId:e.id,receiptReference:'LOCAL-INVENTORY-1',outcome:'accepted',receivedPayloadHash:e.payloadHash,reason});f.run('issuer','obs-reconcile',{eventId:e.id,receiptId:r.id,reason});
 const p=out(f);assert.equal(p.records['recognition-technical'].length,1);assert.equal(p.records['obs-event'][0].credits,10);assert.equal(p.records['obs-reconciliation'][0].outcome,'matched');assert.equal(JSON.stringify(p).includes(e.payload.externalKey),false);assert.equal(out(f,'issuer').records['obs-event'].length,0);assert.equal(out(f,'it').records['obs-receipt'].length,0);assert.equal(out(f,'other').records['obs-event'].length,0);
 assert.equal(out(f,'issuer').inventory.categories.find(c=>c.key==='credentials').contributionCount,2);
}));

test('B28 alıcı kendi erişim/mesajını izin geri çekildikten sonra indirir; öğrencinin içeriği açılmaz',()=>use(async f=>{
 const x=await localPortfolioSetup(f),access=f.run('employer','portfolio-access',{grantId:x.grant.id,purpose:portfolioPurpose,confirm:true}),feedback=f.run('employer','portfolio-feedback',{grantId:x.grant.id,purpose:portfolioPurpose,accessId:access.id,kind:'strength',message:portfolioReason});f.run('student','portfolio-revoke',{grantId:x.grant.id,confirm:true});
 const p=out(f,'employer'),serialized=JSON.stringify(p),receipt=f.s.list('test-gazi','privacy-export').at(-1);assert.equal(receipt.recordCount,2);assert.equal(receipt.recipientRecordCount,2);assert.equal(receipt.ownRecordCount,0);assert.equal(p.recipientRecords['portfolio-access'][0].id,access.id);assert.equal(p.recipientRecords['portfolio-feedback'][0].message,feedback.message);for(const value of [x.ev.id,x.ev.content,x.issuance.id,x.grant.id,x.e.id,x.e.owner])assert.equal(serialized.includes(value),false,value);assert.equal(p.records['portfolio-grant'].length,0);assert.equal(p.records.evidence.length,0);assert.equal(out(f,'anotheremployer').recipientRecords['portfolio-feedback'].length,0);assert.equal(out(f).records['portfolio-feedback'][0].id,feedback.id);
}));

test('B28 pozitif alan şeması iç içe bilinmeyen veri ve sırları da dışarıda tutar',()=>use(f=>{
 const secret='PRIVATE_SENTINEL_NEVER_EXPORT',id=randomUUID();f.s.put('test-gazi','assessment',{id,unit:'engineering',owner:'student',scores:[{criterionId:'R1',score:4,reason,providerToken:secret}],evidenceIds:['own-evidence'],evidenceDigests:[{id:'own-evidence',sha256:'a'.repeat(64),alternative:{method:{method:'oral',providerToken:secret},moderation:{reason,jwt:secret}},source:{jwt:secret}}],reason:{token:secret},raw:secret});
 const p=out(f),r=p.records.assessment[0];assert.equal(JSON.stringify(p).includes(secret),false);assert.equal(r.scores[0].score,4);assert.equal(r.reason,undefined);assert.equal(r.evidenceDigests[0].alternative.method.method,'oral');
 for(const kind of Object.keys(subjectFields)){const r=projectSubjectRecord(kind,{id:'own',unit:'engineering',jwt:secret,sessionHash:secret,tokenHash:secret,createdBy:secret});assert.equal(JSON.stringify(r).includes(secret),false,kind);}
}));

test('B28 bilinmeyen kişisel kayıt kapalı kalır ve eksik kapsam açıkça sayılır',()=>use(f=>{
 const secret='UNMAPPED_PRIVATE_CONTENT';f.s.put('test-gazi','future-private-kind',{id:'u1',unit:'engineering',owner:'student',createdBy:'student',content:secret});f.s.put('test-gazi','future-private-kind',{id:'u2',unit:'elsewhere',owner:'student',createdBy:'student',content:secret});f.s.put('another','future-private-kind',{id:'u3',unit:'engineering',owner:'student',createdBy:'student',content:secret});
 const p=out(f);assert.equal(p.inventory.unknownOwnRecordCount,1);assert.equal(p.inventory.allDataExported,false);assert.equal(JSON.stringify(p).includes(secret),false);assert.equal(out(f,'other').inventory.unknownOwnRecordCount,0);assert.equal(overview(f).unknownOwnRecordCount,1);
}));

test('B28 envanter görev katkısını yalnız sayı verir; kişi, birim ve tenant kapsamı korunur',()=>use(f=>{
 const x=f.passed(),teacher=overview(f,'teacher');assert.equal(teacher.categories.find(c=>c.key==='learning').contributionCount,1);assert.equal(JSON.stringify(teacher).includes(x.ev.content),false);assert.equal(JSON.stringify(teacher).includes(x.a.id),false);assert.equal(out(f,'teacher').records.assessment.length,0);
 f.s.put('test-gazi','support',{id:'other-unit',unit:'elsewhere',owner:'student',createdBy:'student',message:'UNIT_PRIVATE_SENTINEL'});f.s.put('another','support',{id:'other-tenant',unit:'engineering',owner:'student',createdBy:'student',message:'TENANT_PRIVATE_SENTINEL'});assert.equal(JSON.stringify(out(f)).includes('PRIVATE_SENTINEL'),false);assert.throws(()=>subjectExport(f.core,{...f.context('student'),tenant:'another'}),e=>e.code==='identity_tenant');
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('student');assert.throws(()=>out(f),e=>e.code==='membership_required');
}));

test('B28 hesap sayacı gizli oturum değerini vermez; temizlik sonrası güncel sayıyı gösterir',()=>use(f=>{
 for(const [label,person,tenant,expires]of [['expired','student','test-gazi','2020-01-01T00:00:00.000Z'],['foreign','student','another','2020-01-01T00:00:00.000Z'],['someone','other','test-gazi','2020-01-01T00:00:00.000Z']]){f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(label),person,expires);f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(hash(label),tenant,'synthetic','2019-01-01T00:00:00.000Z');}
 assert.deepEqual(out(f).account.sessions,{active:1,expired:1,unitScope:'institution-only'});assert.equal(JSON.stringify(out(f)).includes(hash('expired')),false);
 const request=f.run('student','privacy-request',{unit:'engineering',type:'deletion',category:'account',description:reason}),response=f.run('admin','privacy-response',{requestId:request.id,outcome:'local-session-cleanup',response:reason,basisReference:reason,academicRetentionReference:reason,reviewOn:'2099-01-01'});f.run('student','privacy-cleanup',{requestId:request.id,responseId:response.id});assert.equal(overview(f).account.sessions.expired,0);assert.equal(overview(f).account.sessions.active,1);assert.equal(out(f).records['privacy-cleanup'][0].physicalDestructionVerified,false);
}));

test('B28 belge durum ve değiştirme özetleri imzalı belirteci veya güvenlik özetini açmaz',()=>use(async f=>{
 const x=await localPortfolioSetup(f);f.run('issuer','revoke',{issuanceId:x.issuance.id,reason});const p=out(f);assert.equal(p.records.signed[0].id,x.issuance.id);assert.equal(p.records.revocation[0].issuanceId,x.issuance.id);assert.equal(p.records.signed[0].jwt,undefined);assert.equal(p.records.signed[0].credential,undefined);assert.equal(p.records.signed[0].digest,undefined);assert.equal(p.account.fullAccountDeletionAvailable,false);
}));
