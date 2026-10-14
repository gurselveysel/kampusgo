import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {createIdentityContract,logoutEvent} from '../myys/identity-contract.mjs';
import {LocalIdentityRateLimit} from '../myys/identity-rate-limit.mjs';
import {backchannelHarness} from './helpers/local-backchannel.mjs';
import {use} from './helpers/myys-fixture.mjs';
const is=code=>e=>e.code===code;
const receipts=f=>f.s.db.prepare('SELECT count(*) n FROM identity_logout_receipts').get().n;
const audits=f=>f.s.db.prepare("SELECT count(*) n FROM audit WHERE action='identity.backchannel'").get().n;

test('B07 giriş başlangıcı ve dönüşü başka kurumun mevcut tarayıcı bağını silemez',()=>use(async f=>{
 const h=backchannelHarness(f);f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','student','engineering','["learner"]','2099-01-01T00:00:00.000Z');const foreign=h.make(f.s,{tenant:'other-tenant'}),session=await h.login({flow:foreign});assert.throws(()=>h.begin({browser:hash(session.sessionToken)}),is('identity_tenant'));assert.equal(h.active(session,'other-tenant'),'student');
 const browser=hash('browser-claimed-before-foreign-binding'),input=h.begin({browser});h.hook=async()=>{f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(browser,'student','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(browser,'other-tenant','synthetic-fixture',h.now().toISOString());};await assert.rejects(()=>h.flow.complete(input),is('identity_callback'));assert.equal(f.s.principal(browser,'other-tenant',h.now().toISOString()).id,'student');
}));

test('B07 sub+sid yalnız eşleşen sağlayıcı oturumunu kapatır; diğer kişi ve cihaz korunur',()=>use(async f=>{
 const h=backchannelHarness(f),a=await h.login(),b=await h.login({sid:'provider-session-b'}),c=await h.login({sub:'other'});
 const result=await h.flow.backchannelLogout({logoutToken:await h.logout({sid:'provider-session-a'})});assert.deepEqual(result,{revoked:1,cancelledRequests:0,replayed:false});assert.equal(h.active(a),null);assert.equal(h.active(b),'student');assert.equal(h.active(c),'other');assert.equal(audits(f),1);
}));
test('B07 sub olmadan sid ve sid olmadan sub kapsamları ayrı doğrulanır',()=>use(async f=>{
 const h=backchannelHarness(f),a=await h.login(),b=await h.login({sid:'provider-session-b'});h.patch={sid:undefined};const c=await h.login();h.patch={};
 await h.flow.backchannelLogout({logoutToken:await h.logout({sub:undefined,sid:'provider-session-a'})});assert.equal(h.active(a),null);assert.equal(h.active(b),'student');assert.equal(h.active(c),'student');
 assert.equal((await h.flow.backchannelLogout({logoutToken:await h.logout()})).revoked,2);assert.equal(h.active(b),null);assert.equal(h.active(c),null);
}));
test('B07 aynı subject/sid başka kurum, issuer ve audience oturumlarını etkilemez',()=>use(async f=>{
 const h=backchannelHarness(f);f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('other-tenant','student','engineering','["learner"]','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run('federated-other','https://other-idp.invalid','student');f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run('test-gazi','federated-other','engineering','["learner"]','2099-01-01T00:00:00.000Z');
 const a=await h.login(),b=await h.login({flow:h.make(f.s,{tenant:'other-tenant'})}),c=await h.login({flow:h.make(f.s,{issuer:'https://other-idp.invalid'}),issuer:'https://other-idp.invalid'}),d=await h.login({flow:h.make(f.s,{audience:'other-client'})});
 await h.flow.backchannelLogout({logoutToken:await h.logout()});assert.equal(h.active(a),null);assert.equal(h.active(b,'other-tenant'),'student');assert.equal(h.active(c),'federated-other');assert.equal(h.active(d),'student');
}));
test('B07 eksik/bozuk imza profili ve Logout Token alanları oturum veya makbuz değiştirmez',()=>use(async f=>{
 const h=backchannelHarness(f),a=await h.login(),at=h.now().getTime()/1000;
 for(const patch of [{iss:'https://evil.invalid'},{aud:'other'},{aud:['logout-test','other']},{iat:at+1},{iat:at-121,exp:at+1},{exp:at},{exp:at+121},{iat:1.5},{jti:''},{sub:undefined},{sub:null},{sid:''},{sid:'bad space'},{nonce:null},{events:{}},{events:{[logoutEvent]:[]}},{events:{[logoutEvent]:null}},{exp:undefined},{jti:undefined}])await assert.rejects(()=>h.logout(patch).then(logoutToken=>h.flow.backchannelLogout({logoutToken})),is('identity_logout'));
 for(const header of [{typ:'JWT'},{typ:undefined},{kid:'unknown'},{jku:'https://evil.invalid/jwks'},{jwk:h.config.jwks.keys[0]}])await assert.rejects(()=>h.logout({},header).then(logoutToken=>h.flow.backchannelLogout({logoutToken})),is('identity_logout'));
 const valid=await h.logout();await assert.rejects(()=>h.flow.backchannelLogout({logoutToken:valid.slice(0,-20)+'A'.repeat(20)}),is('identity_logout'));assert.equal(h.active(a),'student');assert.equal(receipts(f),0);assert.equal(audits(f),0);
}));
test('B07 ID Token ile Logout Token birbirinin yerine kullanılamaz',()=>use(async f=>{
 const h=backchannelHarness(f);await h.login();await assert.rejects(()=>h.flow.backchannelLogout({logoutToken:h.lastToken}),is('identity_logout'));
 const contract=createIdentityContract(h.config),logoutToken=await h.logout();await assert.rejects(()=>contract.verify(logoutToken,{expectedNonce:'a'.repeat(43),now:h.now()}),is('identity_token'));
 for(const patch of [{sid:[]},{sid:'bad space'},{events:{[logoutEvent]:{}}}]){h.patch=patch;await assert.rejects(()=>h.login(),is('identity_callback'));}
}));
test('B07 iki bağlantıda aynı imzalı bildirim bir kez işler; farklı içerikli jti reddedilir',()=>use(async f=>{
 const h=backchannelHarness(f),a=await h.login(),second=new LocalAcceptanceStore(f.path),other=h.make(second),logoutToken=await h.logout({jti:'same-event'});
 try{const rs=await Promise.all([h.flow.backchannelLogout({logoutToken}),other.backchannelLogout({logoutToken})]);assert.equal(rs.filter(r=>r.replayed).length,1);assert.equal(rs.reduce((n,r)=>n+r.revoked,0),1);assert.equal(receipts(f),1);assert.equal(audits(f),1);assert.equal(h.active(a),null);await assert.rejects(()=>h.logout({jti:'same-event',sub:'other'}).then(logoutToken=>other.backchannelLogout({logoutToken})),is('identity_logout_replay'));}finally{second.close();}
}));
test('B07 yeniden açılan depo bildirimi hatırlar; bilinmeyen/önceden kapanmış oturum başarılıdır',()=>use(async f=>{
 const h=backchannelHarness(f),logoutToken=await h.logout({sub:'unknown-person'});assert.equal((await h.flow.backchannelLogout({logoutToken})).revoked,0);const second=new LocalAcceptanceStore(f.path);try{assert.equal((await h.make(second).backchannelLogout({logoutToken})).replayed,true);}finally{second.close();}assert.equal(audits(f),1);
}));
test('B07 sağlayıcı yanıtından önce gelen iptal geç tamamlanan girişi engeller',()=>use(async f=>{
 const h=backchannelHarness(f),input=h.begin();let release,reached;const entered=new Promise(r=>reached=r);h.hook=()=>new Promise(r=>{release=r;reached();});const pending=h.flow.complete(input);await entered;
 await h.flow.backchannelLogout({logoutToken:await h.logout()});h.advance(2000);release();await assert.rejects(()=>pending,is('identity_callback'));assert.equal(f.s.db.prepare('SELECT count(*) n FROM identity_provider_sessions').get().n,0);assert.equal(receipts(f),1);
}));
test('B07 mevcut cihazın iptali bekleyen yenilemeyi kapatır; akademik kayıtlar değişmez',()=>use(async f=>{
 f.passed();const records=JSON.stringify(f.s.db.prepare('SELECT * FROM records').all()),h=backchannelHarness(f),a=await h.login(),input=h.begin({browser:hash(a.sessionToken)});
 assert.equal((await h.flow.backchannelLogout({logoutToken:await h.logout({sid:'provider-session-a'})})).cancelledRequests,1);await assert.rejects(()=>h.flow.complete(input),is('identity_challenge'));assert.equal(JSON.stringify(f.s.db.prepare('SELECT * FROM records').all()),records);
}));
test('B07 iptalden sonraki yeni istek de eski auth_time kullanamaz; yeni doğrulama kabul edilir',()=>use(async f=>{
 const h=backchannelHarness(f),at=h.now().getTime()/1000;await h.flow.backchannelLogout({logoutToken:await h.logout()});h.advance(2000);h.patch={auth_time:at};await assert.rejects(()=>h.login(),is('identity_callback'));h.patch={};const fresh=await h.login();assert.equal(h.active(fresh),'student');
}));
test('B07 yeni oturum eski bildirimin mükerrer teslimiyle tekrar kapatılmaz',()=>use(async f=>{
 const h=backchannelHarness(f),token=await h.logout();await h.flow.backchannelLogout({logoutToken:token});h.advance(2000);const fresh=await h.login();assert.equal((await h.flow.backchannelLogout({logoutToken:token})).replayed,true);assert.equal(h.active(fresh),'student');
}));
test('B07 audit başarısızsa oturum, challenge ve logout makbuzu birlikte geri alınır',()=>use(async f=>{
 const h=backchannelHarness(f),a=await h.login(),input=h.begin({browser:hash(a.sessionToken)}),logoutToken=await h.logout();f.s.db.exec("CREATE TRIGGER reject_backchannel BEFORE INSERT ON audit WHEN NEW.action='identity.backchannel' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");await assert.rejects(()=>h.flow.backchannelLogout({logoutToken}));assert.equal(h.active(a),'student');assert.equal(receipts(f),0);assert.equal(f.s.db.prepare('SELECT status FROM identity_challenges WHERE state_hash=?').get(hash(input.state)).status,'pending');f.s.db.exec('DROP TRIGGER reject_backchannel');assert.equal((await h.flow.backchannelLogout({logoutToken})).revoked,1);
}));
test('B07 doğrulanmış kanıt süre dolunca veya sahte nesneyle commit edilemez; Vercel kapalı',()=>use(async f=>{
 const h=backchannelHarness(f),contract=createIdentityContract(h.config),proof=await contract.verifyLogout(await h.logout(),{now:h.now()});assert.throws(()=>contract.commitLocalLogout({},{store:f.s,now:h.now()},()=>{}),is('identity_logout'));h.advance(120000);assert.throws(()=>contract.commitLocalLogout(proof,{store:f.s,now:h.now()},()=>{}),is('identity_logout'));
 const old=process.env.VERCEL;try{process.env.VERCEL='1';await assert.rejects(()=>h.flow.backchannelLogout({logoutToken:'invalid'}),is('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('B07 kalıcı makbuzda ham Logout Token, jti, sid veya subject bulunmaz',()=>use(async f=>{
 const h=backchannelHarness(f);await h.login({sid:'private-provider-session'});const logoutToken=await h.logout({jti:'private-event-id',sid:'private-provider-session'});await h.flow.backchannelLogout({logoutToken});const saved=JSON.stringify(['identity_provider_sessions','identity_logout_receipts','audit'].map(t=>f.s.db.prepare('SELECT * FROM '+t).all()));for(const v of [logoutToken,'private-event-id','private-provider-session'])assert.ok(!saved.includes(v));assert.equal(f.s.db.prepare('SELECT subject_hash FROM identity_logout_receipts').get().subject_hash,hash('student'));
}));

test('B07 oran sınırı iki bağlantı ve yeniden açılışta ortak; süre bitince yeni pencere açılır',()=>use(f=>{
 const h=backchannelHarness(f),key=randomBytes(32),limits={global:5,network:2,browser:1,seconds:60},make=store=>new LocalIdentityRateLimit({store,identityConfig:h.config,key,clock:h.now,limits}),a=make(f.s),second=new LocalAcceptanceStore(f.path),b=make(second),req={purpose:'backchannel',network:'127.0.0.1'};
 try{a.check(req);b.check(req);assert.throws(()=>a.check(req),is('identity_rate'));assert.throws(()=>make(second).check(req),is('identity_rate'));h.advance(60000);b.check(req);assert.equal(f.s.db.prepare('SELECT max(used) n FROM identity_rate_buckets').get().n,1);}finally{second.close();}
}));
test('B07 çerez ve ağ değiştirme genel sınırı aşamaz; kurum ve işlem pencereleri ayrıdır',()=>use(f=>{
 const h=backchannelHarness(f),key=randomBytes(32),make=config=>new LocalIdentityRateLimit({store:f.s,identityConfig:config,key,clock:h.now,limits:{global:2,network:2,browser:1,seconds:60}}),a=make(h.config);
 a.check({purpose:'start',network:'127.0.0.1',browserHash:hash('one')});assert.throws(()=>a.check({purpose:'start',network:'127.0.0.1',browserHash:hash('one')}),is('identity_rate'));a.check({purpose:'start',network:'127.0.0.2',browserHash:hash('two')});assert.throws(()=>a.check({purpose:'start',network:'127.0.0.3',browserHash:hash('three')}),is('identity_rate'));a.check({purpose:'logout',network:'127.0.0.1'});make({...h.config,tenant:'other'}).check({purpose:'start',network:'127.0.0.1'});assert.ok(!JSON.stringify(f.s.db.prepare('SELECT * FROM identity_rate_buckets').all()).includes('127.0.0.1'));
}));
test('B07 oran deposu yazılamazsa veya saat geri giderse istek açık bırakılmaz',()=>use(f=>{
 const h=backchannelHarness(f),a=new LocalIdentityRateLimit({store:f.s,identityConfig:h.config,key:randomBytes(32),clock:h.now}),req={purpose:'backchannel',network:'127.0.0.1'};a.check(req);h.advance(-1);assert.throws(()=>a.check(req),is('identity_rate'));h.advance(1);f.s.db.exec("CREATE TRIGGER reject_limit BEFORE UPDATE ON identity_rate_buckets BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;");assert.throws(()=>a.check(req));assert.equal(f.s.db.prepare('SELECT max(used) n FROM identity_rate_buckets').get().n,1);
}));
