import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {LocalRecoveryService,recoveryDigest} from '../myys/recovery.mjs';
import {recoveryChecks} from '../myys/recovery-model.mjs';
import {runSyntheticRecoveryDrill} from '../scripts/lib/integrated-recovery.mjs';
import {myysRoute} from '../myys/http.mjs';
const reason='Yalnız sentetik yerel kurtarma tatbikatının gerekçeli incelemesi.';
const input={unit:'engineering',syntheticOnly:true,rpoSeconds:0,rtoSeconds:60,reason};
const report=await runSyntheticRecoveryDrill();
const service=f=>new LocalRecoveryService(f.core,{rehearse:async()=>structuredClone(report)});
const plan=f=>f.run('it','recovery-plan',input);
const review=(f,p,r,patch={})=>f.run('admin','recovery-review',{planId:p.id,resultId:r.id,basedOn:recoveryDigest(r),outcome:'accepted',reason,...patch});
const snapshot=f=>JSON.stringify(['records','commands','audit'].map(t=>f.s.db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()));
const is=code=>e=>e.code===code;
test('B27 gerçek sentetik yedek, iptal, anahtar, kaynak arşivi ve kesilmiş kuyruk bir arada doğrulanır',()=>{
 assert.deepEqual(Object.keys(report.checks).sort(),Object.keys(recoveryChecks).sort());assert.ok(Object.values(report.checks).every(Boolean));assert.equal(report.lostRecords,0);assert.equal(report.restoredSessions,0);assert.equal(report.sourceSignatureCount,1);assert.ok(report.recoveryMs>0);assert.equal(report.productionRpoRtoVerified,false);assert.equal(report.official,false);assert.ok(!JSON.stringify(report).includes('sessionToken'));
});
test('B27 plan → sunucu ölçümü → ayrı yönetici incelemesi değişmez ve tekrar güvenlidir',()=>use(async f=>{
 const p=plan(f),svc=service(f),r=await svc.run(f.context('it'),p.id),before=snapshot(f);assert.equal(r.state,'passed');assert.deepEqual(await svc.run(f.context('it'),p.id),r);assert.equal(snapshot(f),before);
 const v=review(f,p,r);assert.equal(v.productionAuthorized,false);assert.equal(f.core.view(f.context('admin')).recovery.plans[0].review.id,v.id);assert.equal(f.core.view(f.context('student')).recovery.plans.length,0);assert.throws(()=>review(f,p,r),is('recovery_reviewed'));assert.throws(()=>f.s.db.prepare('UPDATE records SET owner=? WHERE id=?').run('other',r.id),/immutable/);
}));
test('B27 hedef, sentetik kapsam, rol ve MFA doğrulanır; istemci sonuç yazamaz',()=>use(async f=>{
 for(const patch of [{syntheticOnly:false},{rpoSeconds:-1},{rpoSeconds:1.2},{rtoSeconds:0},{rtoSeconds:3601},{reason:'kısa'}])assert.throws(()=>f.run('it','recovery-plan',{...input,...patch}),is('recovery_plan'));
 for(const who of ['student','author','admin','issuer'])assert.throws(()=>f.run(who,'recovery-plan',input),is('forbidden'));
 const p=plan(f);for(const who of ['student','admin','teacher'])await assert.rejects(()=>service(f).run(f.context(who),p.id),is('not_found'));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('it');await assert.rejects(()=>service(f).run(f.context('it'),p.id),is('not_found'));assert.equal(f.s.list('test-gazi','recovery-result').length,0);
}));
test('B27 hazırlayanın yönetici rolü olsa bile kendi sonucunu inceleyemez; özet değişikliği reddedilir',()=>use(async f=>{
 const p=plan(f),r=await service(f).run(f.context('it'),p.id);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["it","admin"]','it');assert.throws(()=>f.run('it','recovery-review',{planId:p.id,resultId:r.id,basedOn:recoveryDigest(r),outcome:'accepted',reason}),is('separation'));assert.throws(()=>review(f,p,r,{basedOn:'a'.repeat(64)}),is('recovery_changed'));review(f,p,r);
}));
test('B27 hedef aşımı veya eksik denetim uygun sayılamaz; başarısız sonuç yeniden denenebilir',()=>use(async f=>{
 const p=plan(f),svc=new LocalRecoveryService(f.core,{rehearse:async()=>({...report,recoveryMs:60001})}),r=await svc.run(f.context('it'),p.id);assert.equal(r.state,'failed');assert.throws(()=>review(f,p,r),is('recovery_failed'));review(f,p,r,{outcome:'correction'});const next=await service(f).run(f.context('it'),p.id);assert.equal(next.state,'passed');assert.notEqual(next.id,r.id);assert.equal(f.s.list('test-gazi','recovery-result').length,2);review(f,p,next);
}));
test('B27 hata ayrıntıları ve beklenmeyen dosya alanları kayda veya yanıta taşınmaz',()=>use(async f=>{
 const p=plan(f);for(const rehearse of [async()=>{throw Error('/private/path SECRET');},async()=>({...report,path:'/private/path SECRET'}),async()=>({...report,checks:{...report.checks,queue:'yes'}})]){const r=await new LocalRecoveryService(f.core,{rehearse}).run(f.context('it'),p.id);assert.equal(r.state,'failed');assert.equal(r.report,null);assert.ok(!JSON.stringify(r).includes('SECRET'));}
 await assert.rejects(()=>service(f).run(f.context('it'),p.id),is('recovery_limit'));
}));
test('B27 iki bağlantı eşzamanlı ikinci denemeyi durdurur; süre dolan sahip sonuç yazamaz',()=>use(async f=>{
 const p=plan(f),second=new LocalAcceptanceStore(f.path);let release;const pending=new LocalRecoveryService(f.core,{rehearse:()=>new Promise(r=>release=r)}).run(f.context('it'),p.id);
 try{await assert.rejects(()=>new LocalRecoveryService(new MyysCore(second),{rehearse:async()=>report}).run(f.context('it'),p.id),is('recovery_busy'));const at=Date.now()+121000;f.core.clock=()=>new Date(at).toISOString();const next=await service(f).run(f.context('it'),p.id);release(report);await assert.rejects(()=>pending,is('recovery_lease'));assert.equal(f.s.list('test-gazi','recovery-result').length,1);assert.equal(next.state,'passed');}finally{second.close();}
}));
test('B27 çalışırken rol/oturum kaybı sonuç ve bitiş denetimi yazamaz',()=>use(async f=>{
 const p=plan(f);let release;const pending=new LocalRecoveryService(f.core,{rehearse:()=>new Promise(r=>release=r)}).run(f.context('it'),p.id);f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('it');release(report);await assert.rejects(()=>pending,is('membership_required'));assert.equal(f.s.list('test-gazi','recovery-result').length,0);assert.equal(f.s.db.prepare("SELECT count(*) n FROM audit WHERE action='recovery.finish'").get().n,0);
}));
test('B27 sonuç ve denetim aynı işlemde geri alınır; başlangıç makbuzu korunur',()=>use(async f=>{
 const p=plan(f);f.s.db.exec("CREATE TRIGGER fail_recovery BEFORE INSERT ON audit WHEN NEW.action='recovery.finish' BEGIN SELECT RAISE(ABORT,'test audit'); END;");await assert.rejects(()=>service(f).run(f.context('it'),p.id),/test audit/);assert.equal(f.s.list('test-gazi','recovery-result').length,0);assert.equal(f.s.list('test-gazi','recovery-attempt').length,1);
}));
test('B27 idempotent plan ve inceleme tekrarları güncel yetkiyi zorunlu tutar',()=>use(async f=>{
 const id=randomUUID(),p=f.run('it','recovery-plan',input,id),r=await service(f).run(f.context('it'),p.id),rid=randomUUID(),ri={planId:p.id,resultId:r.id,basedOn:recoveryDigest(r),outcome:'accepted',reason};f.run('admin','recovery-review',ri,rid);
 for(const [who,action,args,key] of [['it','recovery-plan',input,id],['admin','recovery-review',ri,rid]]){f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]',who);assert.throws(()=>f.run(who,action,args,key),is('forbidden'));}
}));
test('B27 HTTP olumlu çalıştırma; başka rol/birim/geçerli kurum ve kapalı hizmet matrisi',()=>use(async f=>{
 const p=plan(f),svc=service(f);async function invoke(context,options={}){let r;await myysRoute({req:{method:'POST',url:'/api/myys/kurtarma-dene'},path:'/api/myys/kurtarma-dene',b:{tenant:context.tenant,planId:p.id,report:{fake:true}},sessionHash:context.sessionHash,core:f.core,recoveryService:svc,json:(res,status,data)=>r={status,data},...options});return r;}
 assert.equal((await invoke(f.context('it'))).status,200);const saved=snapshot(f);
 for(const who of ['student','admin','teacher'])assert.equal((await invoke(f.context(who))).status,404);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('arts','it');assert.equal((await invoke(f.context('it'))).status,404);assert.equal(f.core.view(f.context('it')).recovery.plans.length,0);f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('engineering','it');
 const tenant='recovery-tenant-b',sessionHash=hash('recovery-foreign');f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(tenant,'it','engineering','["it"]','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(sessionHash,'it','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(sessionHash,tenant,'test',f.core.clock());assert.equal((await invoke({tenant,sessionHash})).status,404);assert.equal((await invoke({tenant,sessionHash:hash('it')})).status,403);assert.equal(snapshot(f),saved);
 assert.equal((await invoke({...f.context('it'),sessionHash:null})).status,401);assert.equal((await invoke(f.context('it'),{core:null})).status,503);assert.equal((await invoke(f.context('it'),{recoveryService:null})).status,503);
}));
test('B27 üretimde plan, prova ve sonuç yürütmesi kapalıdır',()=>use(async f=>{
 const p=plan(f),svc=service(f),old=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>plan(f),is('local_only'));await assert.rejects(()=>svc.run(f.context('it'),p.id),is('local_only'));await assert.rejects(()=>runSyntheticRecoveryDrill(),is('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
