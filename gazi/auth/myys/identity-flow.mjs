import {LocalDerivationEpoch} from './identity-derivation-epoch.mjs';
// Isolated synthetic acceptance adapter. HTTP/cookie boundary is in identity-http.mjs.
import {randomBytes, randomUUID, createHmac, createHash} from 'node:crypto';
import {LocalAcceptanceStore, CoreError, hash, requireThat} from './store.mjs';
import {createIdentityContract} from './identity-contract.mjs';
import {LocalIdentityRevocation} from './identity-revocation.mjs';

export function pkceS256(verifier) {
 requireThat(typeof verifier === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(verifier), 'identity_pkce', 'PKCE doğrulama verisi geçersiz.', 403);
 return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}
const sessionHashValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const responseValue = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export class LocalIdentityFlow {
 #store; #config; #contract; #key; #clock; #exchange; #redirect; #digest; #requestMs; #sessionMs; #timeout; #revocation; #epoch;
 constructor({store, identityConfig, derivationKey, derivationRevision=1, redirectUri, exchangeCode, clock = () => new Date(), requestLifetimeSeconds = 300, sessionLifetimeSeconds = 300, exchangeTimeoutMs = 5000}) {
  requireThat(store instanceof LocalAcceptanceStore && !process.env.VERCEL && !process.env.VERCEL_ENV, 'local_only', 'Kimlik akışı yalnız izole yerel kabulde çalışır.', 503);
  requireThat(Buffer.isBuffer(derivationKey) && derivationKey.length === 32 && typeof exchangeCode === 'function' && typeof clock === 'function', 'identity_config', 'Yerel kimlik akışı yapılandırması eksik.', 500);
  let uri;
  try { uri = new URL(redirectUri); } catch { throw new CoreError('identity_config', 'Yerel dönüş adresi geçersiz.', 500); }
  requireThat(['http:','https:'].includes(uri.protocol) && uri.hostname === '127.0.0.1' && !uri.username && !uri.password && !uri.search && !uri.hash, 'local_only', 'Dönüş adresi yalnız yerel kabul adresi olabilir.', 503);
  requireThat([requestLifetimeSeconds,sessionLifetimeSeconds].every(n => Number.isInteger(n) && n >= 1 && n <= 900) && Number.isInteger(exchangeTimeoutMs) && exchangeTimeoutMs >= 10 && exchangeTimeoutMs <= 10000, 'identity_config', 'Kimlik akışı zaman sınırları geçersiz.', 500);
  this.#store=store; this.#config=structuredClone(identityConfig); this.#contract=createIdentityContract(this.#config);
  this.#key=Buffer.from(derivationKey); this.#exchange=exchangeCode; this.#clock=clock; this.#redirect=redirectUri;
  this.#epoch=new LocalDerivationEpoch({store,identityConfig:this.#config,derivationKey,derivationRevision});
  this.#digest=hash(JSON.stringify({identityConfig:this.#config,redirectUri,derivation:this.#epoch.binding()}));
  this.#requestMs=requestLifetimeSeconds*1000; this.#sessionMs=sessionLifetimeSeconds*1000; this.#timeout=exchangeTimeoutMs;
  store.db.exec(`CREATE TABLE IF NOT EXISTS identity_challenges(
   id TEXT PRIMARY KEY,state_hash TEXT NOT NULL UNIQUE,browser_hash TEXT NOT NULL,tenant TEXT NOT NULL,
   contract_digest TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,
   status TEXT NOT NULL CHECK(status IN ('pending','claimed','used','failed','cancelled')),finished INTEGER);
   CREATE INDEX IF NOT EXISTS identity_challenges_browser ON identity_challenges(tenant,browser_hash,status);
   CREATE TABLE IF NOT EXISTS identity_session_links(tenant TEXT NOT NULL,browser_hash TEXT NOT NULL,session_hash TEXT NOT NULL,expires TEXT NOT NULL,PRIMARY KEY(tenant,session_hash));
   CREATE INDEX IF NOT EXISTS identity_links_parent ON identity_session_links(tenant,browser_hash);`);
  this.#revocation=new LocalIdentityRevocation(store);
 }
 #now() {
  requireThat(!process.env.VERCEL && !process.env.VERCEL_ENV, 'local_only', 'Kimlik akışı canlı ortamda açılamaz.', 503);
  const value=this.#clock();
  requireThat(value instanceof Date && Number.isFinite(value.getTime()), 'identity_clock', 'Geçerli sunucu zamanı gerekli.', 500);
  return new Date(value.getTime());
 }
 #derive(kind,id) {return createHmac('sha256',this.#key).update(JSON.stringify([kind,id,this.#config.tenant,this.#digest])).digest('base64url');}
 #audit(action,id,now,actor='') {this.#store.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(this.#config.tenant,actor,action,id,now.toISOString());}
 #browserScope(sessionHash){
  const bound=this.#store.db.prepare('SELECT s.tenant FROM bindings b LEFT JOIN identity_scopes s ON s.session_hash=b.session_hash WHERE b.session_hash=?').get(sessionHash);
  requireThat(!bound||bound.tenant===this.#config.tenant,'identity_tenant','Tarayıcı oturumu başka bir kurum için bağlı.',403);
 }
 begin({browserSessionHash}) {
  const now=this.#now();
  requireThat(sessionHashValid(browserSessionHash), 'identity_browser', 'Sunucunun bağladığı tarayıcı oturumu gerekli.', 403);
  const id=randomUUID(),state=randomBytes(32).toString('base64url');
  this.#store.transaction(()=>{
   this.#browserScope(browserSessionHash);
   this.#epoch.assertCurrent(now,{initialize:true});
   const old=this.#store.db.prepare("SELECT id FROM identity_challenges WHERE tenant=? AND browser_hash=? AND status IN ('pending','claimed')").all(this.#config.tenant,browserSessionHash);
   for(const row of old) {this.#store.db.prepare("UPDATE identity_challenges SET status='cancelled',finished=? WHERE id=?").run(now.getTime(),row.id);this.#audit('identity.cancel',row.id,now);}
   this.#store.db.prepare("INSERT INTO identity_challenges VALUES(?,?,?,?,?,?,?,'pending',NULL)").run(id,hash(state),browserSessionHash,this.#config.tenant,this.#digest,now.getTime(),now.getTime()+this.#requestMs);
   this.#audit('identity.begin',id,now);
  });
  return {state,nonce:this.#derive('nonce',id),code_challenge:pkceS256(this.#derive('verifier',id)),code_challenge_method:'S256',client_id:this.#config.audience,redirect_uri:this.#redirect,response_type:'code',scope:'openid'};
 }
 async complete({state,code,browserSessionHash,issuer,redirectUri}) {
  const started=this.#now();
  requireThat(responseValue(state) && sessionHashValid(browserSessionHash) && typeof code==='string' && /^[\x21-\x7e]{8,2048}$/.test(code), 'identity_callback', 'Kimlik dönüş isteği geçersiz.', 403);
  requireThat(issuer===this.#config.issuer && redirectUri===this.#redirect, 'identity_callback', 'Kimlik sağlayıcısı veya dönüş adresi uyuşmuyor.', 403);
  // Commit the claim BEFORE the async exchange: two workers cannot redeem the same request.
  const request=this.#store.transaction(()=>{
   const row=this.#store.db.prepare('SELECT * FROM identity_challenges WHERE state_hash=? AND browser_hash=? AND tenant=? AND contract_digest=?').get(hash(state),browserSessionHash,this.#config.tenant,this.#digest);
   requireThat(row && row.status==='pending' && row.created<=started.getTime() && row.expires>started.getTime(), 'identity_challenge', 'Kimlik isteği yok, kullanılmış veya süresi dolmuş.', 403);
   this.#epoch.assertCurrent(started);
   this.#store.db.prepare("UPDATE identity_challenges SET status='claimed' WHERE id=? AND status='pending'").run(row.id);
   this.#audit('identity.claim',row.id,started);
   return row;
  });
  const controller=new AbortController();let timer;
  try {
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CoreError('identity_exchange','Kimlik yanıtı zamanında alınamadı.',503));},this.#timeout);});
   const token=await Promise.race([Promise.resolve().then(()=>this.#exchange({code,codeVerifier:this.#derive('verifier',request.id),redirectUri:this.#redirect,issuer:this.#config.issuer,audience:this.#config.audience,signal:controller.signal})),timeout]);
   clearTimeout(timer);
   const proof=await this.#contract.verify(token,{expectedNonce:this.#derive('nonce',request.id),now:this.#now()});
   const now=this.#now(),sessionToken=randomBytes(32).toString('base64url'),sessionHash=hash(sessionToken);
   return this.#contract.commitLocalMember(proof,{store:this.#store,now},(actor,grant)=>{
    this.#browserScope(browserSessionHash);
    this.#epoch.assertCurrent(now);
    const changed=this.#store.db.prepare("UPDATE identity_challenges SET status='used',finished=? WHERE id=? AND status='claimed' AND created<=? AND expires>?").run(now.getTime(),request.id,now.getTime(),now.getTime());
    requireThat(changed.changes===1, 'identity_challenge', 'Kimlik isteği artık kullanılamıyor.', 403);
    const expires=new Date(Math.min(now.getTime()+this.#sessionMs,Date.parse(grant.expiresAt))).toISOString();
    // Rotate a pre-existing local binding; never turn a caller-supplied token into a session.
    this.#store.db.prepare('DELETE FROM bindings WHERE session_hash=?').run(browserSessionHash);
    this.#store.db.prepare('INSERT INTO bindings VALUES(?,?,?,?)').run(sessionHash,actor.id,expires,actor.mfa?1:0);
    this.#store.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(sessionHash,actor.tenant,grant.contractVersion,now.toISOString());
    this.#revocation.bind({tenant:actor.tenant,sessionHash,grant,requestCreated:request.created});
    this.#store.db.prepare('INSERT INTO identity_session_links VALUES(?,?,?,?)').run(actor.tenant,browserSessionHash,sessionHash,expires);
    this.#audit('identity.accept',request.id,now,actor.id);
    return {sessionToken,expires,personId:actor.id,tenant:actor.tenant};
   });
  } catch {
   // No retry on the same challenge, including timeout/uncertain provider outcomes.
   const now=this.#now();
   this.#store.transaction(()=>{
    const changed=this.#store.db.prepare("UPDATE identity_challenges SET status='failed',finished=? WHERE id=? AND status='claimed'").run(now.getTime(),request.id);
    if(changed.changes) this.#audit('identity.fail',request.id,now);
   });
   throw new CoreError('identity_callback','Kimlik isteği tamamlanamadı. Yeni bir giriş isteği başlatın.',403);
  } finally {clearTimeout(timer);controller.abort();}
 }
 cancel({state,browserSessionHash,issuer,redirectUri}) {
  const now=this.#now();requireThat(responseValue(state)&&sessionHashValid(browserSessionHash)&&issuer===this.#config.issuer&&redirectUri===this.#redirect,'identity_callback','Kimlik dönüş isteği geçersiz.',403);
  return this.#store.transaction(()=>{
   const row=this.#store.db.prepare("SELECT id FROM identity_challenges WHERE state_hash=? AND browser_hash=? AND tenant=? AND contract_digest=? AND status='pending' AND created<=? AND expires>?").get(hash(state),browserSessionHash,this.#config.tenant,this.#digest,now.getTime(),now.getTime());
   requireThat(row,'identity_challenge','Kimlik isteği yok, kullanılmış veya süresi dolmuş.',403);
   this.#store.db.prepare("UPDATE identity_challenges SET status='cancelled',finished=? WHERE id=?").run(now.getTime(),row.id);this.#audit('identity.deny',row.id,now);return {cancelled:true};
  });
 }
 async backchannelLogout({logoutToken}) {
  const proof=await this.#contract.verifyLogout(logoutToken,{now:this.#now()}),now=this.#now();
  return this.#contract.commitLocalLogout(proof,{store:this.#store,now},grant=>this.#revocation.apply(grant,now));
 }
 logout({sessionHash}) {
  const now=this.#now();
  requireThat(sessionHashValid(sessionHash),'identity_browser','Sunucunun bağladığı oturum gerekli.',403);
  return this.#store.transaction(()=>{
   const scope=this.#store.db.prepare('SELECT s.tenant,b.person FROM identity_scopes s JOIN bindings b ON b.session_hash=s.session_hash WHERE s.session_hash=?').get(sessionHash);
   requireThat(!scope || scope.tenant===this.#config.tenant,'identity_tenant','Oturum bu kuruma ait değil.',403);
   // A logout already in flight may carry the cookie rotated by a callback.
   // Revoke its local descendants as well, without touching another tenant.
   const family=this.#store.db.prepare('WITH RECURSIVE family(h) AS (SELECT ? UNION SELECT l.session_hash FROM identity_session_links l JOIN family f ON l.browser_hash=f.h WHERE l.tenant=? AND l.expires>?) SELECT h FROM family').all(sessionHash,this.#config.tenant,now.toISOString());
   let revoked=false,cancelledRequests=0;
   for(const {h} of family){
    const requests=this.#store.db.prepare("SELECT id FROM identity_challenges WHERE tenant=? AND browser_hash=? AND status IN ('pending','claimed')").all(this.#config.tenant,h);
    for(const row of requests){this.#store.db.prepare("UPDATE identity_challenges SET status='cancelled',finished=? WHERE id=?").run(now.getTime(),row.id);this.#audit('identity.cancel',row.id,now);cancelledRequests++;}
    const binding=this.#store.db.prepare('SELECT b.person FROM identity_scopes s JOIN bindings b ON b.session_hash=s.session_hash WHERE s.session_hash=? AND s.tenant=?').get(h,this.#config.tenant);
    if(binding){this.#store.db.prepare('DELETE FROM bindings WHERE session_hash=?').run(h);this.#audit('identity.logout',randomUUID(),now,binding.person);revoked=true;}
   }
   return {revoked,cancelledRequests};
  });
 }
}
