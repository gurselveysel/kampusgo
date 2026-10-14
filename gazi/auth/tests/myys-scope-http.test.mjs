import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {signedFixture} from './helpers/local-signing.mjs';
import {hash} from '../myys/store.mjs';
import {myysRoute} from '../myys/http.mjs';
import {publishStatusSnapshot} from '../myys/status-list.mjs';

const tenant='test-gazi',unit='engineering',otherTenant='scope-http-tenant-b';
const cases=[
 ['program-paketi','author'],['calisma','student','GET'],['karar-arsivi','student'],['cuzdan-indir','student'],
 ['dogrulama-paketi','student'],['veri-ozetim','student'],['guven-sicili','it'],
 ['durum-yayinla','it'],['imzala','issuer'],['dogrula','student'],['toplu-hazirlik','issuer']
];
const invoke=async(f,x,name,context,input={},method='POST')=>{
 let response;const path='/api/myys/'+name;
 await myysRoute({req:{method,url:path+'?kurum='+encodeURIComponent(context.tenant)},path,b:{tenant:context.tenant,...input},sessionHash:context.sessionHash,core:f.core,
  signer:{base:x.base,material:x.material,keyring:[{state:'active',material:x.material}]},json:(res,status,data)=>{response={status,data};}});
 return response;
};
const snapshot=s=>JSON.stringify(s.db.prepare('SELECT * FROM records ORDER BY tenant,kind,id').all());
function noForeignIds(value,ids){
 if(typeof value==='string')assert.ok(!ids.has(value),'Foreign record ID escaped through an HTTP response');
 if(Array.isArray(value))value.forEach(v=>noForeignIds(v,ids));
 else if(value&&typeof value==='object')Object.values(value).forEach(v=>noForeignIds(v,ids));
}
for(const [name,who,method]of cases)test('HTTP kapsam matrisi: '+name+' — olumlu kontrol, başka birim, geçerli başka kurum ve kurum uyuşmazlığı',()=>use(async f=>{
 const x=await signedFixture(f);
 const enrolled=f.run('author','enroll',{programId:x.p.id,learnerId:'other'});
 const ev=f.run('other','evidence',{enrollmentId:enrolled.id,taskId:'T1',content:'İkinci sentetik öğrencinin özgün ve gerekçeli veri analizi kanıtı.'});
 const assessment=f.run('teacher','assess',{enrollmentId:enrolled.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason:'Bağımsız kanıt içeriği rubrikle incelendi.'}],reason:'İkinci öğrencinin tüm görevleri ve ölçme dayanakları incelendi.'});
 const decision=f.run('judge','decide',{assessmentId:assessment.id,outcome:'approved',reason:'İkinci öğrencinin ölçme sonuçları bağımsız incelendi.'});
 await publishStatusSnapshot(f.core,f.context('it'),unit,x.material);
 const input={programId:x.p.id,decisionId:x.d.id,issuanceId:x.issuance.id,unit,jwt:x.signed.jwt,rows:[{commandId:randomUUID(),decisionId:decision.id}]};
 const positive=await invoke(f,x,name,f.context(who),input,method);assert.equal(positive.status,200,JSON.stringify(positive));
 if(name==='calisma')assert.equal(positive.data.wallet[0].id,x.issuance.id);
 if(name==='program-paketi')assert.equal(positive.data.payload.program.id,x.p.id);
 if(name==='karar-arsivi')assert.equal(positive.data.payload.decision.id,x.d.id);
 if(name==='cuzdan-indir')assert.equal(positive.data.jwt,x.signed.jwt);
 if(name==='dogrulama-paketi')assert.equal(positive.data.credential,x.signed.jwt);
 if(name==='veri-ozetim')assert.ok(positive.data.payload.records.evidence.some(r=>r.id===x.ev.id));
 if(name==='guven-sicili')assert.equal(positive.data.keys.length,1);
 if(name==='durum-yayinla')assert.equal(positive.data.allocationCount,1);
 if(name==='imzala')assert.equal(positive.data.jwt,x.signed.jwt);
 if(name==='dogrula')assert.equal(positive.data.valid,true);
 if(name==='toplu-hazirlik')assert.equal(positive.data.prepared,1);
 const roles=f.s.principal(f.context(who).sessionHash,tenant,f.core.clock()).memberships[0].roles;
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE tenant=? AND person=?').run(tenant,who);
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(tenant,who,'scope-http-other-unit',JSON.stringify(roles),'2099-01-01T00:00:00.000Z');
 const otherHash=hash(randomUUID());
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(otherTenant,who,unit,JSON.stringify(roles),'2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(otherHash,who,'2099-01-01T00:00:00.000Z');
 f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(otherHash,otherTenant,'scope-http',f.core.clock());
 const ids=new Set(f.s.db.prepare('SELECT id FROM records WHERE tenant=?').all(tenant).map(r=>r.id));
 for(const [scope,context]of [['unit',f.context(who)],['valid-tenant',{tenant:otherTenant,sessionHash:otherHash}],['mismatched-tenant',{tenant:otherTenant,sessionHash:f.context(who).sessionHash}]]){
  const before=snapshot(f.s),out=await invoke(f,x,name,context,input,method);
  if(name==='toplu-hazirlik'){
   assert.equal(out.status,200);assert.equal(out.data.prepared,0);assert.equal(out.data.results[0].status,'rejected');assert.equal(out.data.results[0].id,undefined);
   // Reusing the successful row ID cannot bypass current authorization; neither can a new one.
   const fresh=await invoke(f,x,name,context,{rows:[{...input.rows[0],commandId:randomUUID()}]});assert.equal(fresh.data.prepared,0);assert.equal(fresh.data.results[0].status,'rejected');
  }else if(scope==='mismatched-tenant')assert.equal(out.status,403);
  else if(name==='calisma'){
   assert.equal(out.status,200);assert.equal(out.data.wallet.length,0);assert.equal(out.data.decisions.length,0);
  }else if(name==='veri-ozetim'){
   assert.equal(out.status,200);assert.equal(Object.values(out.data.payload.records).flat().length,0);assert.equal(out.data.payload.programs.length,0);
  }else if(name==='guven-sicili'&&scope==='valid-tenant'){
   assert.equal(out.status,200);assert.deepEqual(out.data.keys,[]);
  }else if(name==='dogrula'&&scope==='valid-tenant'){
   assert.equal(out.status,200);assert.equal(out.data.valid,false);assert.equal(out.data.credential,undefined);
  }else if(name==='durum-yayinla'&&scope==='valid-tenant'){
   assert.equal(out.status,409);assert.equal(out.data.code,'signing_key');
  }else assert.ok([403,404].includes(out.status),`${name}/${scope}: ${JSON.stringify(out)}`);
  // Own scoped export audit is intentional; no source records or secrets are returned.
  if(!(name==='veri-ozetim'&&scope!=='mismatched-tenant'))assert.equal(snapshot(f.s),before,'Rejected/read route mutated records');
  noForeignIds(out,ids);assert.ok(!JSON.stringify(out).includes(x.signed.jwt));assert.ok(!JSON.stringify(out).includes(x.ev.content));
 }
}));
test('Anonim paylaşım kapsam istisnası: beş alan; başka kurum, sahip üyelik kaybı ve iptal erişimi keser',()=>use(async f=>{
 const x=await signedFixture(f),share=f.run('student','share',{issuanceId:x.issuance.id,hours:1,purpose:'Yerel kabul özetini sınırlı süreyle paylaşma kontrolü.'});
 const publicCall=t=>invoke(f,x,'paylasim',{tenant:t,sessionHash:null},{token:share.token});
 const positive=await publicCall(tenant);assert.equal(positive.status,200);assert.deepEqual(Object.keys(positive.data).sort(),['issuer','official','pilot','state','title']);
 assert.equal((await publicCall(otherTenant)).status,404);
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE tenant=? AND person=?').run(tenant,'student');assert.equal((await publicCall(tenant)).status,404);
 f.s.db.prepare('UPDATE memberships SET active=1 WHERE tenant=? AND person=?').run(tenant,'student');
 f.run('student','unshare',{shareId:share.id});assert.equal((await publicCall(tenant)).status,404);
}));
test('Her özel HTTP yolu oturumsuz kapalıdır; kapalı üretim deposu veri veya imza vermez',()=>use(async f=>{
 for(const [name,,method]of [...cases,['islem','student']]){
  const path='/api/myys/'+name;let out;const json=(res,status,data)=>{out={status,data};};
  await myysRoute({req:{method:method||'POST',url:path},path,b:{tenant},sessionHash:null,core:f.core,json});assert.equal(out.status,401,name);
  await myysRoute({req:{method:method||'POST',url:path},path,b:{tenant},sessionHash:f.context('student').sessionHash,core:null,json});assert.equal(out.status,503,name);
 }
}));
