// Trusted local operator boundary. No public route, credential provisioning or KMS call.
import {createHmac} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';
const local=s=>requireThat(s instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Kimlik anahtar bariyeri yalnız izole yerel kabulde çalışır.',503);
const time=now=>{requireThat(now instanceof Date&&Number.isFinite(now.getTime()),'identity_clock','Geçerli sunucu zamanı gerekli.',500);return now.getTime();};
export function derivationKeyDigest(key){requireThat(Buffer.isBuffer(key)&&key.length===32,'identity_config','Yerel türetme anahtarı geçersiz.',500);return createHmac('sha256',key).update('myys-local-derivation-key-check/1').digest('hex');}
const scope=c=>{requireThat(c&&['tenant','issuer','audience'].every(k=>typeof c[k]==='string'&&c[k].length>0&&c[k].length<=2000),'identity_config','Kimlik anahtar kapsamı geçersiz.',500);return {tenant:c.tenant,namespace:hash(JSON.stringify([c.issuer,c.audience]))};};
export function installDerivationEpochs(s){local(s);s.db.exec(`
 CREATE TABLE IF NOT EXISTS identity_derivation_epochs(tenant TEXT NOT NULL,namespace TEXT NOT NULL,revision INTEGER NOT NULL,key_digest TEXT NOT NULL,activated INTEGER NOT NULL,PRIMARY KEY(tenant,namespace,revision),UNIQUE(tenant,namespace,key_digest));
 CREATE TABLE IF NOT EXISTS identity_derivation_blocks(key_digest TEXT PRIMARY KEY,blocked INTEGER NOT NULL);
 CREATE TRIGGER IF NOT EXISTS derivation_epochs_no_update BEFORE UPDATE ON identity_derivation_epochs BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER IF NOT EXISTS derivation_epochs_no_delete BEFORE DELETE ON identity_derivation_epochs BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER IF NOT EXISTS derivation_blocks_no_update BEFORE UPDATE ON identity_derivation_blocks BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER IF NOT EXISTS derivation_blocks_no_delete BEFORE DELETE ON identity_derivation_blocks BEGIN SELECT RAISE(ABORT,'immutable'); END;`);}
const current=(s,tenant,namespace)=>s.db.prepare('SELECT * FROM identity_derivation_epochs WHERE tenant=? AND namespace=? ORDER BY revision DESC LIMIT 1').get(tenant,namespace);
const blocked=(s,digest)=>!!s.db.prepare('SELECT key_digest FROM identity_derivation_blocks WHERE key_digest=?').get(digest);
const audit=(s,t,action,id,now)=>s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(t,'',action,id,now.toISOString());
export class LocalDerivationEpoch {
 #s;#scope;#revision;#digest;
 constructor({store,identityConfig,derivationKey,derivationRevision=1}){installDerivationEpochs(store);requireThat(Number.isSafeInteger(derivationRevision)&&derivationRevision>=1,'identity_config','Türetme anahtarı revizyonu geçersiz.',500);this.#s=store;this.#scope=scope(identityConfig);this.#revision=derivationRevision;this.#digest=derivationKeyDigest(derivationKey);}
 // Called inside the same BEGIN IMMEDIATE as challenge begin/claim/session commit.
 assertCurrent(now,{initialize=false}={}){local(this.#s);requireThat(this.#s.db.isTransaction===true,'identity_transaction','Anahtar denetimi oturum işlemi içinde yapılmalı.',500);const at=time(now),{tenant,namespace}=this.#scope;let row=current(this.#s,tenant,namespace);requireThat(!blocked(this.#s,this.#digest),'identity_key','Kimlik anahtarı durduruldu. Yeni giriş yapılandırması gerekli.',503);
  if(!row&&initialize){requireThat(this.#revision===1,'identity_key','İlk türetme anahtarı sürümü 1 olmalı.',503);this.#s.db.prepare('INSERT INTO identity_derivation_epochs VALUES(?,?,?,?,?)').run(tenant,namespace,1,this.#digest,at);audit(this.#s,tenant,'identity.key.activate',hash(JSON.stringify([namespace,1,this.#digest])),now);row=current(this.#s,tenant,namespace);}
  requireThat(row&&row.revision===this.#revision&&row.key_digest===this.#digest&&row.activated<=at,'identity_key','Kimlik anahtarı sürümü güncel değil.',503);
 }
 binding(){return {revision:this.#revision,keyDigest:this.#digest};}
}
export function activateLocalDerivationKey({store,identityConfig,derivationKey,revision,expectedRevision,now=new Date()}){
 installDerivationEpochs(store);const {tenant,namespace}=scope(identityConfig),digest=derivationKeyDigest(derivationKey),at=time(now);requireThat(Number.isSafeInteger(revision)&&revision>1&&Number.isSafeInteger(expectedRevision)&&expectedRevision===revision-1,'identity_key','Ardışık yeni sürüm ve beklenen önceki sürüm gerekli.',503);
 return store.transaction(()=>{const row=current(store,tenant,namespace);requireThat(row&&row.activated<=at&&!blocked(store,digest),'identity_key','Anahtar geçmişi veya yeni anahtar uygun değil.',503);if(row.revision===revision&&row.key_digest===digest)return {revision,activated:row.activated,duplicate:true};requireThat(row.revision===expectedRevision&&!store.db.prepare('SELECT 1 FROM identity_derivation_epochs WHERE tenant=? AND namespace=? AND key_digest=?').get(tenant,namespace,digest),'identity_key','Önceki sürüm değişti veya anahtar daha önce kullanıldı.',503);store.db.prepare('INSERT INTO identity_derivation_epochs VALUES(?,?,?,?,?)').run(tenant,namespace,revision,digest,at);audit(store,tenant,'identity.key.activate',hash(JSON.stringify([namespace,revision,digest])),now);return {revision,activated:at,duplicate:false};});
}
export function blockLocalDerivationKey({store,derivationKey,now=new Date()}){
 installDerivationEpochs(store);const digest=derivationKeyDigest(derivationKey),at=time(now);
 // A shared compromised key is blocked in every issuer/audience/tenant namespace.
 // This is a trusted operator action, not a tenant user's capability.
 return store.transaction(()=>{if(blocked(store,digest))return {blocked:true,duplicate:true};const rows=store.db.prepare('SELECT * FROM identity_derivation_epochs WHERE key_digest=?').all(digest);requireThat(rows.length&&rows.every(r=>r.activated<=at),'identity_key','Kayıtlı anahtar ve ileri sunucu zamanı gerekli.',503);store.db.prepare('INSERT INTO identity_derivation_blocks VALUES(?,?)').run(digest,at);for(const tenant of new Set(rows.map(r=>r.tenant)))audit(store,tenant,'identity.key.block',digest,now);return {blocked:true,duplicate:false};});
}
