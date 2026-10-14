import test from 'node:test';
import assert from 'node:assert/strict';
import {sqlIdentityFlow} from './helpers/sql-identity-flow.mjs';
import {hash} from '../myys/store.mjs';
import {createIdentityContract} from '../myys/identity-contract.mjs';
const match=code=>e=>e.code===code;
test('B06/B07 imzalı SQL giriş aynı kişiyi ve sunucu rollerini döndürür; ham token saklanmaz',async t=>{
 const h=await sqlIdentityFlow(t),session=await h.login({email:'changed@example.invalid',roles:['admin'],tenant:'foreign',mfa:false});
 assert.equal(session.personId,'student');assert.deepEqual((await h.principal(session)).memberships,[{unit:'engineering',roles:['learner']}]);
 const rows=await h.rows('myys_identity_sessions');assert.equal(rows.length,1);assert.equal(rows[0].session_hash,hash(session.sessionToken));assert.ok(!JSON.stringify(rows).includes(session.sessionToken));assert.equal((await h.rows('myys_identity_challenges'))[0].status,'used');
 assert.equal((await h.rows('myys_identity_session_audit')).filter(r=>r.event==='accept').length,1);assert.equal((await h.rows('myys_identity_persons')).length,2);
});
test('B07 hatalı issuer/audience/nonce ve eksik MFA SQL oturumu oluşturamaz',async t=>{
 const h=await sqlIdentityFlow(t);
 for(const patch of [{iss:'https://foreign.invalid'},{aud:'foreign'},{nonce:'wrong-server-nonce-0000000000000000000'},{amr:['pwd']},{acr:'unknown'}])await assert.rejects(()=>h.login(patch),match('identity_callback'));
 assert.equal((await h.rows('myys_identity_sessions')).length,0);assert.ok((await h.rows('myys_identity_challenges')).every(r=>r.status==='failed'));
});
test('B06 bilinmeyen subject otomatik kişi oluşturmaz; aktif olmayan kişi kabul edilmez',async t=>{
 const h=await sqlIdentityFlow(t);await assert.rejects(()=>h.login({sub:'unknown'}),match('identity_callback'));await h.putPerson(h.person('student',{active:false,revision:2}),1);
 await assert.rejects(()=>h.login(),match('identity_callback'));assert.equal((await h.rows('myys_identity_persons')).length,2);assert.equal((await h.rows('myys_identity_sessions')).length,0);
});
test('B06 ayrılan kişi yeniden açılsa da eski session person revision nedeniyle canlanmaz',async t=>{
 const h=await sqlIdentityFlow(t),old=await h.login();await h.putPerson(h.person('student',{active:false,revision:2}),1);await assert.rejects(()=>h.principal(old),match('identity_member'));
 await h.putPerson(h.person('student',{active:true,revision:3}),2);await assert.rejects(()=>h.principal(old),match('identity_required'));assert.equal((await h.principal(await h.login())).id,'student');
});
test('B06 üyelik kapatıp açma veya rol değişimi eski sessiona yeni yetki vermez',async t=>{
 const h=await sqlIdentityFlow(t),old=await h.login();await h.putMembership(h.membership('student',{active:false,revision:2}),1);await assert.rejects(()=>h.principal(old),match('membership_required'));
 await h.putMembership(h.membership('student',{active:true,roles:['coordinator'],revision:3}),2);await assert.rejects(()=>h.principal(old),match('identity_required'));
 const next=await h.login();assert.deepEqual((await h.principal(next)).memberships,[{unit:'engineering',roles:['coordinator']}]);
});
test('B06 gelecek/süresi dolmuş veya başka kurum üyeliği yetki sağlamaz',async t=>{
 const h=await sqlIdentityFlow(t);await h.putMembership(h.membership('student',{notBefore:'2026-10-14T10:01:00.000Z',revision:2}),1);await assert.rejects(()=>h.login(),match('identity_callback'));
 await h.putMembership(h.membership('student',{notBefore:'2026-10-14T08:00:00.000Z',expires:'2026-10-14T09:00:00.000Z',revision:3}),2);await assert.rejects(()=>h.login(),match('identity_callback'));
 const other=h.newFlow({identityConfig:{...h.config,tenant:'other-tenant'}});await h.putMembership(h.membership('student'),0,other);await assert.rejects(()=>h.login(),match('identity_callback'));
});
test('B07 token doğrulaması beklerken üyelik kaldırılırsa commit güncel kaydı kullanır',async t=>{
 const h=await sqlIdentityFlow(t);h.exchangeHook=()=>h.putMembership(h.membership('student',{active:false,revision:2}),1);
 await assert.rejects(()=>h.login(),match('identity_callback'));assert.equal((await h.rows('myys_identity_sessions')).length,0);assert.equal((await h.rows('myys_identity_challenges'))[0].status,'failed');
});
test('B07 session en erken kimlik/üyelik süresinde kapanır ve saat geriye gidemez',async t=>{
 const h=await sqlIdentityFlow(t);await h.putMembership(h.membership('student',{expires:'2026-10-14T10:00:02.000Z',revision:2}),1);const s=await h.login();assert.equal(s.expires,'2026-10-14T10:00:02.000Z');h.advance(-1);await assert.rejects(()=>h.principal(s),match('identity_required'));h.advance(2001);await assert.rejects(()=>h.principal(s),match('identity_required'));
});
test('B07 başka tenant/audience/contract session okuyamaz veya aynı cookieyle giriş başlatamaz',async t=>{
 const h=await sqlIdentityFlow(t),s=await h.login();
 for(const patch of [{tenant:'other-tenant'},{audience:'other-audience'}]){const other=h.newFlow({identityConfig:{...h.config,...patch}});await assert.rejects(()=>h.principal(s,other),match('identity_tenant'));await assert.rejects(()=>h.begin(other,hash(s.sessionToken)),match('identity_tenant'));}
 const changed=h.newFlow({identityConfig:{...h.config,version:'test-sql-v2'}});await assert.rejects(()=>h.principal(s,changed),match('identity_required'));assert.equal((await h.principal(s)).id,'student');
});
test('B07 cookie döndürülür; yoldaki eski cookieyle çıkış alt sessionı da kapatır',async t=>{
 const h=await sqlIdentityFlow(t),first=await h.login(),parent=hash(first.sessionToken),second=await h.login({},h.flow,parent);
 assert.notEqual(first.sessionToken,second.sessionToken);await assert.rejects(()=>h.principal(first),match('identity_required'));assert.equal((await h.principal(second)).id,'student');
 assert.deepEqual(await h.flow.logout({sessionHash:parent}),{revoked:1,cancelledRequests:0});await assert.rejects(()=>h.principal(second),match('identity_required'));assert.deepEqual(await h.flow.logout({sessionHash:parent}),{revoked:0,cancelledRequests:0});
});
test('B07 çıkış provider bekleyen claimed isteği kapatır; gecikmiş token oturum oluşturamaz',async t=>{
 const h=await sqlIdentityFlow(t),s=await h.login(),parent=hash(s.sessionToken),start=await h.begin(h.flow,parent);let entered,release;const ready=new Promise(r=>{entered=r;}),gate=new Promise(r=>{release=r;});h.exchangeHook=async()=>{entered();await gate;};
 const pending=h.complete(start,{},h.flow,parent);await ready;assert.deepEqual(await h.flow.logout({sessionHash:parent}),{revoked:1,cancelledRequests:1});release();await assert.rejects(()=>pending,match('identity_callback'));assert.ok((await h.rows('myys_identity_sessions')).every(r=>r.status==='revoked'));
});
test('B07 session audit hatası yeni session ve challenge use kaydını birlikte geri alır',async t=>{
 const h=await sqlIdentityFlow(t);await h.sql.db.exec("ALTER TABLE myys_identity_session_audit ADD CHECK (event <> 'accept')");await assert.rejects(()=>h.login(),match('identity_callback'));
 assert.equal((await h.rows('myys_identity_sessions')).length,0);assert.equal((await h.rows('myys_identity_challenges'))[0].status,'failed');assert.ok(!(await h.rows('myys_identity_challenge_audit')).some(r=>r.event==='use'));
});
test('B06 kişi/üyelik güncellemesi audit başarısızsa atomik geri alınır',async t=>{
 const h=await sqlIdentityFlow(t),s=await h.login();let fault=true;h.sql.fault=({text,values})=>{if(fault&&text.startsWith('INSERT INTO myys_identity_session_audit')&&values[5]==='membership'){fault=false;throw Object.assign(Error('audit failure'),{code:'23514'});}};
 await assert.rejects(()=>h.putMembership(h.membership('student',{active:false,revision:2}),1),match('identity_store'));assert.equal((await h.principal(s)).id,'student');
 fault=true;h.sql.fault=({text,values})=>{if(fault&&text.startsWith('INSERT INTO myys_identity_session_audit')&&values[5]==='person'){fault=false;throw Object.assign(Error('audit failure'),{code:'23514'});}};
 await assert.rejects(()=>h.putPerson(h.person('student',{active:false,revision:2}),1),match('identity_store'));assert.equal((await h.principal(s)).id,'student');
 for(const patch of [{roles:['unknown'],revision:2},{roles:['learner','learner'],revision:2},{revision:3}])await assert.rejects(()=>h.putMembership(h.membership('student',patch),1),match('identity_directory_control'));
 await assert.rejects(()=>h.putPerson(h.person('student',{subject:'swapped',revision:2}),1),match('identity_directory_revision'));
});
test('B07 gerçek final COMMIT belirsizse token dönmez, session yeniden yazılmaz',async t=>{
 const h=await sqlIdentityFlow(t);let commits=0;h.sql.fault=async({text,db})=>{if(text==='COMMIT'&&(await db.query("SELECT count(*)::int AS n FROM myys_identity_sessions WHERE status='active'")).rows[0].n){commits++;await db.query('COMMIT');throw Object.assign(Error('transport'),{code:'ECONNRESET'});}};
 await assert.rejects(()=>h.login(),match('identity_commit_unknown'));assert.equal(commits,1);assert.equal((await h.rows('myys_identity_sessions')).length,1);assert.equal((await h.rows('myys_identity_challenges'))[0].status,'used');assert.equal(h.exchanges,1);
});
test('B07 sağlayıcı timeout geç tokenı kullanmaz; claimed yeniden açılmaz',async t=>{
 const h=await sqlIdentityFlow(t),fast=h.newFlow({exchangeTimeoutMs:10});let release,signal;const gate=new Promise(r=>{release=r;});h.exchangeHook=async ref=>{signal=ref.signal;await gate;};
 await assert.rejects(()=>h.login({},fast),match('identity_callback'));assert.equal(signal.aborted,true);release();await new Promise(r=>setImmediate(r));assert.equal((await h.rows('myys_identity_sessions')).length,0);assert.equal((await h.rows('myys_identity_challenges'))[0].status,'failed');
});
test('B07 imzalı logout subject/sid AND eşleşir; JTI replay tek makbuzdur',async t=>{
 const h=await sqlIdentityFlow(t),a=await h.login(),b=await h.login({sid:'sid-second'},h.flow,hash('second-browser')),other=await h.login({sub:'other',sid:'sid-other'},h.flow,hash('third-browser'));
 const token=await h.logoutToken({sid:'sid-student',jti:'one-logout'});assert.deepEqual(await h.flow.backchannelLogout({logoutToken:token}),{revoked:1,cancelledRequests:0,replayed:false});await assert.rejects(()=>h.principal(a),match('identity_required'));assert.equal((await h.principal(b)).id,'student');assert.equal((await h.principal(other)).id,'other');
 assert.deepEqual(await h.flow.backchannelLogout({logoutToken:token}),{revoked:0,cancelledRequests:0,replayed:true});assert.equal((await h.rows('myys_identity_logout_receipts')).length,1);
 await assert.rejects(async()=>h.flow.backchannelLogout({logoutToken:await h.logoutToken({sid:'sid-second',jti:'one-logout'})}),match('identity_logout_replay'));
});
test('B07 session oluşmadan gelen logout gecikmiş callbacki durdurur; yeni auth gerekir',async t=>{
 const h=await sqlIdentityFlow(t),start=await h.begin();let entered,release;const ready=new Promise(r=>{entered=r;}),gate=new Promise(r=>{release=r;});h.exchangeHook=async()=>{entered();await gate;};
 const pending=h.complete(start);await ready;assert.deepEqual(await h.flow.backchannelLogout({logoutToken:await h.logoutToken()}),{revoked:0,cancelledRequests:0,replayed:false});release();await assert.rejects(()=>pending,match('identity_callback'));assert.equal((await h.rows('myys_identity_sessions')).length,0);
 h.exchangeHook=async()=>{};h.advance(1000);assert.equal((await h.principal(await h.login())).id,'student');
});
test('B07 logout audit hatası iptal makbuzu ve session değişimini geri alır',async t=>{
 const h=await sqlIdentityFlow(t),s=await h.login(),token=await h.logoutToken();await h.sql.db.exec("ALTER TABLE myys_identity_session_audit ADD CHECK (event <> 'backchannel')");
 await assert.rejects(()=>h.flow.backchannelLogout({logoutToken:token}),match('identity_store'));assert.equal((await h.rows('myys_identity_logout_receipts')).length,0);assert.equal((await h.principal(s)).id,'student');
});
test('B07 provider anahtarı kapanırken bekleyen imzalı cevap sessionı açamaz',async t=>{
 const h=await sqlIdentityFlow(t);h.exchangeHook=()=>h.revokeKey('nonce');await assert.rejects(()=>h.login(),match('identity_callback'));assert.equal((await h.rows('myys_identity_sessions')).length,0);
});
test('B07 async kanıt köprüsü başka contract veya plain claimi kabul etmez; MFA zamanını uzatmaz',async t=>{
 const h=await sqlIdentityFlow(t),c=createIdentityContract(h.config),other=createIdentityContract(h.config),nonce='test-expected-nonce-00000000000000000000';
 const proof=await c.verify(await h.sign({},nonce),{expectedNonce:nonce,now:h.clock()});let called=false;
 assert.throws(()=>other.withVerifiedIdentity(proof,{now:h.clock()},()=>{called=true;}),match('identity_proof'));assert.throws(()=>c.withVerifiedIdentity({subject:'student',mfa:true},{now:h.clock()},()=>{called=true;}),match('identity_proof'));assert.equal(called,false);
 const grant=await c.withVerifiedIdentity(proof,{now:h.clock()},async v=>v);assert.equal(grant.subject,'student');assert.equal(Object.isFrozen(grant),true);
 const logout=await c.verifyLogout(await h.logoutToken(),{now:h.clock()});assert.throws(()=>other.withVerifiedLogout(logout,{now:h.clock()},()=>{}),match('identity_logout'));assert.throws(()=>c.withVerifiedLogout({subjectHash:hash('student')},{now:h.clock()},()=>{}),match('identity_logout'));assert.equal((await c.withVerifiedLogout(logout,{now:h.clock()},async v=>v)).tenant,h.config.tenant);
 h.advance(300000);assert.throws(()=>c.withVerifiedIdentity(proof,{now:h.clock()},()=>{}),match('identity_proof'));assert.throws(()=>c.withVerifiedLogout(logout,{now:h.clock()},()=>{}),match('identity_logout'));
});
test('B07 iki SQL flow aynı callbacki denerse tek exchange ve tek session oluşur',async t=>{
 const h=await sqlIdentityFlow(t),start=await h.begin(),other=h.newFlow();const results=await Promise.allSettled([h.complete(start),h.complete(start,{},other)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='identity_challenge').length,1);assert.equal(h.exchanges,1);assert.equal((await h.rows('myys_identity_sessions')).length,1);
 const s=results.find(r=>r.status==='fulfilled').value;assert.equal((await h.principal(s,other)).id,'student');
});
