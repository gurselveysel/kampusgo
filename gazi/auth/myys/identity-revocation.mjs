// Local SQL acceptance implementation; never an enabled production adapter.
import {randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,hash,requireThat} from './store.mjs';

export class LocalIdentityRevocation {
 #store;
 constructor(store){
  requireThat(store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Oturum iptali yalnız yerel kabulde çalışır.',503);this.#store=store;
  store.db.exec(`CREATE TABLE IF NOT EXISTS identity_provider_sessions(
   session_hash TEXT PRIMARY KEY REFERENCES bindings(session_hash) ON DELETE CASCADE,
   tenant TEXT NOT NULL,issuer TEXT NOT NULL,audience TEXT NOT NULL,subject_hash TEXT NOT NULL,sid_hash TEXT,
   issued INTEGER NOT NULL,authenticated INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS identity_provider_subject ON identity_provider_sessions(tenant,issuer,audience,subject_hash);
   CREATE INDEX IF NOT EXISTS identity_provider_sid ON identity_provider_sessions(tenant,issuer,audience,sid_hash);
   CREATE TABLE IF NOT EXISTS identity_logout_receipts(
   tenant TEXT NOT NULL,issuer TEXT NOT NULL,audience TEXT NOT NULL,jti_hash TEXT NOT NULL,
   digest TEXT NOT NULL,subject_hash TEXT,sid_hash TEXT,issued INTEGER NOT NULL,expires INTEGER NOT NULL,received INTEGER NOT NULL,
   PRIMARY KEY(tenant,issuer,audience,jti_hash));
   CREATE INDEX IF NOT EXISTS identity_logout_subject ON identity_logout_receipts(tenant,issuer,audience,subject_hash);
   CREATE INDEX IF NOT EXISTS identity_logout_sid ON identity_logout_receipts(tenant,issuer,audience,sid_hash);`);
 }
 // Called inside the same synchronous transaction as the challenge/session/audit commit.
 bind({tenant,sessionHash,grant,requestCreated}){
  const db=this.#store.db,subjectHash=hash(grant.subject),sidHash=grant.providerSessionId===null?null:hash(grant.providerSessionId);
  const prior=db.prepare(`SELECT issued,received FROM identity_logout_receipts WHERE tenant=? AND issuer=? AND audience=?
   AND (subject_hash IS NULL OR subject_hash=?) AND (sid_hash IS NULL OR sid_hash=?)`).all(tenant,grant.issuer,grant.audience,subjectHash,sidHash);
  requireThat(prior.every(r=>requestCreated>r.received&&grant.issuedAt>r.issued&&grant.authenticatedAt>r.issued),'identity_revoked','Giriş isteği iptal edilmiş; yeni kimlik doğrulaması gerekli.',403);
  db.prepare('INSERT INTO identity_provider_sessions VALUES(?,?,?,?,?,?,?,?)').run(sessionHash,tenant,grant.issuer,grant.audience,subjectHash,sidHash,grant.issuedAt,grant.authenticatedAt);
 }
 // Caller must supply a verified opaque proof through contract.commitLocalLogout.
 apply(grant,now){
  const db=this.#store.db,scope=[grant.tenant,grant.issuer,grant.audience],prior=db.prepare('SELECT digest FROM identity_logout_receipts WHERE tenant=? AND issuer=? AND audience=? AND jti_hash=?').get(...scope,grant.jtiHash);
  if(prior){requireThat(prior.digest===grant.digest,'identity_logout_replay','Oturum kapatma bildiriminin kimliği daha önce kullanılmış.',400);return {revoked:0,cancelledRequests:0,replayed:true};}
  db.prepare('INSERT INTO identity_logout_receipts VALUES(?,?,?,?,?,?,?,?,?,?)').run(...scope,grant.jtiHash,grant.digest,grant.subjectHash,grant.sidHash,grant.issued,grant.expires,now.getTime());
  const rows=db.prepare(`SELECT p.session_hash,b.person FROM identity_provider_sessions p JOIN bindings b ON b.session_hash=p.session_hash
   WHERE p.tenant=? AND p.issuer=? AND p.audience=? AND (? IS NULL OR p.subject_hash=?) AND (? IS NULL OR p.sid_hash=?)`).all(...scope,grant.subjectHash,grant.subjectHash,grant.sidHash,grant.sidHash);
  let cancelledRequests=0;
  for(const row of rows){
   cancelledRequests+=db.prepare("UPDATE identity_challenges SET status='cancelled',finished=? WHERE tenant=? AND browser_hash=? AND status IN ('pending','claimed')").run(now.getTime(),grant.tenant,row.session_hash).changes;
   db.prepare('DELETE FROM bindings WHERE session_hash=?').run(row.session_hash);
  }
  db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(grant.tenant,'','identity.backchannel',randomUUID(),now.toISOString());
  return {revoked:rows.length,cancelledRequests,replayed:false};
 }
}
