import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,generateKeyPairSync} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {LocalIdentityFlow} from '../myys/identity-flow.mjs';
import {subjectExport} from '../myys/privacy.mjs';
import {decisionArchive} from '../myys/archive.mjs';
import {downloadWalletCredential} from '../myys/wallet.mjs';
import {prepareBatch,signApproved} from '../myys/credentials.mjs';
const reason='Sentetik üyelik yetkisi bağımsız yerel kabul kapsamında incelendi.';
const match=code=>e=>e.code===code;
const init=f=>f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','reviewer');
const member=(f,person='student',unit='engineering')=>f.core.view(f.context('admin')).membership.members.find(m=>m.person===person&&m.unit===unit);
const propose=(f,patch={})=>f.run('admin','membership-propose',{personId:'student',unit:'engineering',basedOn:member(f).basedOn,operation:'replace',roles:['learner','instructor'],expires:'2028-01-01T00:00:00.000Z',reason,authorityReference:reason,...patch});
const accept=(f,p,patch={})=>f.run('reviewer','membership-review',{proposalId:p.id,outcome:'accepted',reason,...patch});
const bind=(f,token,person='student',tenant='test-gazi')=>{f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(token),person,'2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(hash(token),tenant,'synthetic-fixture','2026-01-01T00:00:00.000Z');return {sessionHash:hash(token),tenant};};
test('B06 mevcut kişi üzerinde öneri/ayrı inceleme görevleri değiştirir; eski oturum kapanır, akademik kayıt korunur',()=>use(f=>{
 init(f);const x=f.passed(),old=JSON.stringify(f.s.list('test-gazi','decision')),p=propose(f);assert.deepEqual(member(f).roles,['learner']);
 assert.throws(()=>f.run('admin','membership-review',{proposalId:p.id,outcome:'accepted',reason}),match('separation'));
 const r=accept(f,p);assert.equal(r.version,1);assert.equal(r.revokedSessions,1);assert.equal(r.freshLoginRequired,true);assert.equal(r.academicRecordsChanged,false);
 assert.throws(()=>f.core.view(f.context('student')),match('identity_required'));assert.equal(JSON.stringify(f.s.list('test-gazi','decision')),old);
 const c=bind(f,'fresh-local-session');assert.deepEqual(f.core.view(c).memberships[0].roles,['instructor','learner']);assert.equal(f.core.view(c).enrollments[0].id,x.e.id);assert.equal(f.s.db.prepare('SELECT count(*) AS n FROM persons WHERE id=?').get('student').n,1);
}));
test('B06 görev ve süre zorunludur; bilinmeyen/tekrarlı görev, geçmiş tarih ve aynı değer reddedilir',()=>use(f=>{
 for(const patch of [{roles:[]},{roles:['root']},{roles:['learner','learner']},{expires:'2020-01-01T00:00:00.000Z'},{expires:'bad'},{reason:'kısa'},{authorityReference:''},{roles:['learner'],expires:'2099-01-01T00:00:00.000Z'}])assert.throws(()=>propose(f,patch));assert.equal(f.s.list('test-gazi','membership-proposal').length,0);
 assert.throws(()=>propose(f,{personId:'absent'}),match('not_found'));assert.throws(()=>propose(f,{personId:'admin',basedOn:member(f,'admin').basedOn}),match('separation'));
}));
test('B06 hedef kişi kendi yetkisini inceleyemez; başka birim, MFA ve güncel hazırlayan yetkisi denetlenir',()=>use(f=>{
 init(f);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin"]','student');const p=propose(f);
 assert.throws(()=>f.run('student','membership-review',{proposalId:p.id,outcome:'accepted',reason}),match('separation'));
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('reviewer');assert.throws(()=>accept(f,p),match('not_found'));f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE person=?').run('reviewer');
 f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('admin');assert.throws(()=>accept(f,p),match('membership_authority'));assert.equal(accept(f,p,{outcome:'rejected'}).revokedSessions,0);
}));
test('B06 incelemede yarış ve eski kaynak reddi; üyelik değerleri geri dönse de eski öneri canlanmaz',()=>use(f=>{
 init(f);const a=propose(f),b=propose(f,{roles:['learner','quality']});accept(f,a);assert.throws(()=>accept(f,b),match('membership_changed'));
 const back=propose(f,{roles:['learner'],expires:'2099-01-01T00:00:00.000Z'});accept(f,back);assert.throws(()=>accept(f,b),match('membership_changed'));assert.equal(member(f).current,true);
}));
test('B06 üyelik geri çekme tüm aynı kurum oturumlarını kapatır, başka kurum ve birimi bozmaz',()=>use(f=>{
 init(f);const x=f.passed();bind(f,'second-session');f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','student','engineering','["learner"]','2099-01-01T00:00:00.000Z');const other=bind(f,'other-tenant-session','student','other-tenant');
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('test-gazi','student','arts','["learner"]','2099-01-01T00:00:00.000Z');
 const p=propose(f,{operation:'revoke'}),r=accept(f,p);assert.equal(r.revokedSessions,2);assert.equal(f.core.view(other).personId,'student');assert.equal(f.s.db.prepare('SELECT active FROM memberships WHERE tenant=? AND person=? AND unit=?').get('test-gazi','student','arts').active,1);assert.ok(f.s.get('test-gazi','enrollment',x.e.id));assert.equal(member(f).current,false);
}));
test('B06 reddetme ve tekrarlanan onay ikinci etki yaratmaz; yeniden açılan depoda geçmiş korunur',()=>use(f=>{
 init(f);const p=propose(f),input={proposalId:p.id,outcome:'accepted',reason},id=randomUUID(),r=f.run('reviewer','membership-review',input,id);assert.deepEqual(f.run('reviewer','membership-review',input,id),r);assert.throws(()=>accept(f,p),match('membership_reviewed'));
 const second=new LocalAcceptanceStore(f.path);try{const view=new MyysCore(second).view(f.context('reviewer'));assert.equal(view.membership.proposals[0].review.id,r.id);}finally{second.close();}
 const q=propose(f,{roles:['learner']});assert.equal(accept(f,q,{outcome:'rejected'}).revokedSessions,0);assert.deepEqual(member(f).roles,['instructor','learner']);
}));
test('B06 denetim hatası üyelik, öneri incelemesi ve oturum iptalini atomik geri alır',()=>use(f=>{
 init(f);const p=propose(f),before=JSON.stringify(['memberships','bindings','identity_scopes'].map(t=>f.s.db.prepare('SELECT * FROM '+t).all()));f.s.db.exec("CREATE TRIGGER reject_membership_audit BEFORE INSERT ON audit WHEN NEW.action='membership-review' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END;");assert.throws(()=>accept(f,p),/synthetic audit failure/);assert.equal(JSON.stringify(['memberships','bindings','identity_scopes'].map(t=>f.s.db.prepare('SELECT * FROM '+t).all())),before);assert.equal(f.s.list('test-gazi','membership-review').length,0);
}));
test('B06 süre dolumu ve kişinin kapanması sonraki okumada uygulanır; inceleme süresi dolmuş atamayı açmaz',()=>use(f=>{
 init(f);const p=propose(f);f.core.clock=()=> '2028-01-01T00:00:00.000Z';assert.throws(()=>accept(f,p),match('membership_expiry'));f.s.db.prepare('UPDATE memberships SET expires=? WHERE person=?').run(f.core.clock(),'student');assert.throws(()=>f.core.view(f.context('student')),match('membership_required'));f.s.db.prepare('UPDATE persons SET active=0 WHERE id=?').run('other');assert.throws(()=>f.core.view(f.context('other')),match('identity_required'));
}));
test('B06/B08 kişi rosteri öğrenende yalnız kendisini; yöneticide yalnız yetkili birimi gösterir',()=>use(f=>{
 init(f);propose(f);assert.deepEqual(f.core.view(f.context('student')).membership.members.map(x=>x.person),['student']);assert.equal(f.core.view(f.context('other')).membership.proposals.length,0);
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('test-gazi','other','arts','["instructor"]','2099-01-01T00:00:00.000Z');assert.ok(!f.core.view(f.context('admin')).membership.members.some(m=>m.unit==='arts'));
 const output=JSON.stringify(f.core.view(f.context('admin')).membership);for(const forbidden of ['test-idp.invalid','"session_hash":','"subject":','"issuer":','@'])assert.ok(!output.includes(forbidden));
}));
test('B08 kurum bağı olmayan eski oturum reddedilir; aynı kişi iki kurum üyesi olsa da kurum değiştirilemez',()=>use(f=>{
 f.s.db.prepare('DELETE FROM identity_scopes WHERE session_hash=?').run(hash('student'));assert.throws(()=>f.core.view(f.context('student')),match('identity_tenant'));
 f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','admin','engineering','["admin"]','2099-01-01T00:00:00.000Z');const c=bind(f,'other-admin','admin','other-tenant');assert.equal(f.core.view(c).personId,'admin');assert.throws(()=>f.core.view({...c,tenant:'test-gazi'}),match('identity_tenant'));assert.throws(()=>f.core.view({...f.context('admin'),tenant:'other-tenant'}),match('identity_tenant'));
}));
test('B08 yanlış kurum bağı okuma, yazma, kişisel/arşiv/cüzdan dışa aktarma, toplu ve imza yolunda reddedilir',()=>use(async f=>{
 const x=f.passed(),foreign={...f.context('issuer'),tenant:'other-tenant'};f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','issuer','engineering','["admin","studentAffairs"]','2099-01-01T00:00:00.000Z');
 for(const action of ['program','publish','enroll','evidence','assess','decide','appeal','resolve','issue','revoke','membership-propose','membership-review','flow-policy','retention-run','cohort-open','recognition-decide','obs-prepare','privacy-request','support'])assert.throws(()=>f.core.run({...foreign,commandId:randomUUID(),action,input:{unit:'engineering',decisionId:x.d.id}}),match('identity_tenant'));
 for(const call of [()=>f.core.view(foreign),()=>subjectExport(f.core,foreign),()=>decisionArchive(f.core,foreign,x.d.id),()=>downloadWalletCredential(f.core,foreign,'unknown')])assert.throws(call,match('identity_tenant'));
 const batch=prepareBatch(f.core,foreign,[{decisionId:x.d.id,commandId:randomUUID()}]);assert.equal(batch.prepared,0);assert.equal(batch.results[0].code,'identity_tenant');await assert.rejects(()=>signApproved(f.core,foreign,'unknown',{},'https://local-acceptance.invalid'),match('identity_tenant'));
}));
test('B08 aynı kurum başka birimde üyelik önerisi/incelemesi ve akademik ihracat reddedilir',()=>use(f=>{
 init(f);const x=f.passed(),p=propose(f);f.s.db.prepare('UPDATE memberships SET unit=? WHERE person IN (?,?)').run('arts','admin','reviewer');assert.throws(()=>accept(f,p),match('not_found'));assert.throws(()=>f.run('admin','membership-propose',{personId:'student',unit:'engineering',basedOn:p.basedOn}),match('forbidden'));assert.equal(f.core.view(f.context('admin')).membership.proposals.length,0);assert.throws(()=>decisionArchive(f.core,f.context('reviewer'),x.d.id),match('not_found'));
}));
test('B06 canlı ortam ve yetki geri çekildikten sonraki komut tekrarı kapalıdır',()=>use(f=>{
 init(f);const input={personId:'student',unit:'engineering',basedOn:member(f).basedOn,operation:'revoke',reason,authorityReference:reason},id=randomUUID();f.run('admin','membership-propose',input,id);f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["quality"]','admin');assert.throws(()=>f.run('admin','membership-propose',input,id),match('forbidden'));
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin"]','admin');const old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>f.run('admin','membership-propose',input,id),match('local_only'));assert.throws(()=>propose(f),match('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('B06 üyelik değişimi bilinen eski oturuma bağlı bekleyen girişi denetim iziyle iptal eder',()=>use(f=>{
 init(f);const keys=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk={...keys.publicKey.export({format:'jwk'}),kid:'membership-test',alg:'ES256'};
 const flow=new LocalIdentityFlow({store:f.s,identityConfig:{version:'local-membership-test',tenant:'test-gazi',issuer:'https://test-idp.invalid',audience:'local-member-client',algorithms:['ES256'],jwks:{keys:[jwk]},mfaProfiles:[],maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0},derivationKey:randomBytes(32),redirectUri:'http://127.0.0.1:43000/callback',exchangeCode:async()=>{throw Error('not called');}});
 flow.begin({browserSessionHash:hash('student')});const result=accept(f,propose(f));assert.equal(result.cancelledRequests,1);const challenge=f.s.db.prepare('SELECT id,status FROM identity_challenges').get();assert.equal(challenge.status,'cancelled');assert.equal(f.s.db.prepare('SELECT count(*) AS n FROM audit WHERE action=? AND record_id=?').get('identity.cancel',challenge.id).n,1);
}));
