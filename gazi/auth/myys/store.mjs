// Isolated local acceptance store. Never opened in a Vercel deployment.
// The production persistence adapter and migration require separate approval.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {chmodSync} from 'node:fs';

export const hash = value => createHash('sha256').update(value).digest('hex');
export class CoreError extends Error {
 constructor(code,message,status=422){super(message);this.code=code;this.status=status;}
}
export const requireThat=(condition,code,message,status=422)=>{if(!condition)throw new CoreError(code,message,status);};

export class LocalAcceptanceStore {
 constructor(path){
  requireThat(!process.env.VERCEL && !process.env.VERCEL_ENV,'local_only','Yerel kabul deposu canlı ortamda açılamaz.',503);
  requireThat(path && path!==':memory:','persistent_path','Kalıcı yerel kabul dosyası gerekli.',503);
  this.db=new DatabaseSync(path);chmodSync(path,0o600);
  this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS persons(id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, active INTEGER NOT NULL, UNIQUE(issuer,subject));
   CREATE TABLE IF NOT EXISTS memberships(tenant TEXT NOT NULL,person TEXT NOT NULL REFERENCES persons(id),unit TEXT NOT NULL,roles TEXT NOT NULL,expires TEXT NOT NULL,active INTEGER NOT NULL,PRIMARY KEY(tenant,person,unit));
   CREATE TABLE IF NOT EXISTS bindings(session_hash TEXT PRIMARY KEY,person TEXT NOT NULL REFERENCES persons(id),expires TEXT NOT NULL,mfa INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS identity_scopes(session_hash TEXT PRIMARY KEY REFERENCES bindings(session_hash) ON DELETE CASCADE,tenant TEXT NOT NULL,contract_version TEXT NOT NULL,created_at TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS records(tenant TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,unit TEXT NOT NULL,owner TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(tenant,kind,id));
   CREATE TABLE IF NOT EXISTS commands(tenant TEXT NOT NULL,person TEXT NOT NULL,id TEXT NOT NULL,digest TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(tenant,person,id));
   CREATE TABLE IF NOT EXISTS audit(sequence INTEGER PRIMARY KEY AUTOINCREMENT,tenant TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,record_id TEXT NOT NULL,at TEXT NOT NULL);
   CREATE TRIGGER IF NOT EXISTS records_no_update BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'immutable'); END;
   CREATE TRIGGER IF NOT EXISTS records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'immutable'); END;
   CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'immutable'); END;
   CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'immutable'); END;`);
 }
 transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const out=fn();requireThat(!out?.then,'async_transaction','İşlem eş zamanlı tamamlanmalı.',500);this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 principal(sessionHash,tenant,now){
  const row=this.db.prepare('SELECT p.id,b.mfa FROM bindings b JOIN persons p ON p.id=b.person WHERE b.session_hash=? AND b.expires>? AND p.active=1').get(sessionHash,now);
  requireThat(row,'identity_required','Kişiye bağlı kurumsal oturum gerekli. Pilot rol seçimi yetki sağlamaz.',403);
  const scope=this.db.prepare('SELECT tenant FROM identity_scopes WHERE session_hash=?').get(sessionHash);
  requireThat(scope&&scope.tenant===tenant,'identity_tenant','Oturum bu kurum için açılamaz.',403);
  const memberships=this.db.prepare('SELECT unit,roles FROM memberships WHERE tenant=? AND person=? AND active=1 AND expires>?').all(tenant,row.id,now).map(m=>({...m,roles:JSON.parse(m.roles)}));
  requireThat(memberships.length,'membership_required','Kurum üyeliği yok veya süresi dolmuş.',403);
  return {id:row.id,mfa:!!row.mfa,tenant,memberships};
 }
 get(tenant,kind,id){const r=this.db.prepare('SELECT data FROM records WHERE tenant=? AND kind=? AND id=?').get(tenant,kind,id);return r?JSON.parse(r.data):null;}
 list(tenant,kind){return this.db.prepare('SELECT data FROM records WHERE tenant=? AND kind=? ORDER BY rowid').all(tenant,kind).map(r=>JSON.parse(r.data));}
 put(tenant,kind,record){this.db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)').run(tenant,kind,record.id,record.unit,record.owner||'',JSON.stringify(record));return record;}
 close(){this.db.close();}
}
