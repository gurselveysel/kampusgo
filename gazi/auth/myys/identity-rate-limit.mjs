import {createHmac} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';

// Fixed-window limits for the disposable HTTPS acceptance service; no IP/header trust.
export class LocalIdentityRateLimit {
 #store;#tenant;#namespace;#key;#clock;#limits;#revision;#keyDigest;#limitsDigest;
 constructor({store,identityConfig,key,keyRevision=1,clock=()=>new Date(),limits={global:120,network:40,browser:10,seconds:60}}){
  requireThat(store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV&&Buffer.isBuffer(key)&&key.length===32,'local_only','Yerel giriş oran sınırı yapılandırması geçersiz.',503);
  requireThat(['global','network','browser','seconds'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>=1&&limits[k]<=3600),'identity_config','Oran sınırı geçersiz.',500);
  requireThat(Number.isSafeInteger(keyRevision)&&keyRevision>=1,'identity_config','Oran/CSRF anahtar revizyonu geçersiz.',500);
  this.#revision=keyRevision;this.#keyDigest=createHmac('sha256',key).update('myys-csrf-rate-key-check/1').digest('hex');this.#limitsDigest=hash(JSON.stringify(['global','network','browser','seconds'].map(k=>[k,limits[k]])));
  this.#store=store;this.#tenant=identityConfig.tenant;this.#namespace=hash(JSON.stringify([identityConfig.issuer,identityConfig.audience]));this.#key=Buffer.from(key);this.#clock=clock;this.#limits={...limits};
  store.db.exec(`CREATE TABLE IF NOT EXISTS identity_http_key_epochs(tenant TEXT NOT NULL,namespace TEXT NOT NULL,revision INTEGER NOT NULL,key_digest TEXT NOT NULL,limits_digest TEXT NOT NULL,activated INTEGER NOT NULL,PRIMARY KEY(tenant,namespace));
   CREATE TABLE IF NOT EXISTS identity_http_key_history(tenant TEXT NOT NULL,namespace TEXT NOT NULL,revision INTEGER NOT NULL,key_digest TEXT NOT NULL,activated INTEGER NOT NULL,PRIMARY KEY(tenant,namespace,revision),UNIQUE(tenant,namespace,key_digest));
   CREATE TABLE IF NOT EXISTS identity_rate_buckets(tenant TEXT NOT NULL,namespace TEXT NOT NULL,purpose TEXT NOT NULL,bucket TEXT NOT NULL,started INTEGER NOT NULL,ends INTEGER NOT NULL,used INTEGER NOT NULL,PRIMARY KEY(tenant,namespace,purpose,bucket));`);
 }
 // This is a local configuration fence, not a KMS/PKCE revocation barrier.
 // A new trusted revision waits for ALL namespace buckets to expire; changing
 // the HMAC key can therefore never reset a still-live request budget.
 #epoch(now){
  const db=this.#store.db,row=db.prepare('SELECT * FROM identity_http_key_epochs WHERE tenant=? AND namespace=?').get(this.#tenant,this.#namespace);
  if(row&&row.revision===this.#revision){requireThat(row.key_digest===this.#keyDigest&&row.limits_digest===this.#limitsDigest,'identity_key_epoch','Giriş güvenlik yapılandırması yenilenmeli.',503);requireThat(row.activated<=now,'identity_rate','Giriş zamanı doğrulanamadı.',429);return;}
  requireThat(row?this.#revision===row.revision+1:this.#revision===1,'identity_key_epoch','Güncel giriş güvenlik sürümü gerekli.',503);
  requireThat(!row||now>=row.activated,'identity_key_epoch','Giriş güvenlik zamanı doğrulanamadı.',503);
  requireThat(!db.prepare('SELECT 1 FROM identity_http_key_history WHERE tenant=? AND namespace=? AND key_digest=?').get(this.#tenant,this.#namespace,this.#keyDigest),'identity_key_epoch','Önceki giriş anahtarı yeniden etkinleştirilemez.',503);
  const active=db.prepare('SELECT 1 FROM identity_rate_buckets WHERE tenant=? AND namespace=? AND ends>? LIMIT 1').get(this.#tenant,this.#namespace,now);
  requireThat(!active,'identity_key_rotation_wait','Giriş güvenliği yenileniyor. Bir dakika sonra yeniden deneyin.',503);
  db.prepare('INSERT INTO identity_http_key_epochs VALUES(?,?,?,?,?,?) ON CONFLICT(tenant,namespace) DO UPDATE SET revision=excluded.revision,key_digest=excluded.key_digest,limits_digest=excluded.limits_digest,activated=excluded.activated').run(this.#tenant,this.#namespace,this.#revision,this.#keyDigest,this.#limitsDigest,now);
  db.prepare('INSERT INTO identity_http_key_history VALUES(?,?,?,?,?)').run(this.#tenant,this.#namespace,this.#revision,this.#keyDigest,now);
  db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(this.#tenant,'','identity.http-key-epoch',this.#namespace+':'+this.#revision,new Date(now).toISOString());
 }
 assertCurrent(){
  requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel giriş güvenliği üretimde etkin değildir.',503);
  const now=this.#clock().getTime();requireThat(Number.isFinite(now),'identity_clock','Geçerli sunucu zamanı gerekli.',500);
  return this.#store.transaction(()=>this.#epoch(now));
 }
 check({purpose,network,browserHash=null}){
  requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel giriş oran sınırı üretimde etkin değildir.',503);
  requireThat(['login','start','callback','session','logout','backchannel'].includes(purpose)&&typeof network==='string'&&network.length>0&&network.length<=128,'identity_rate','Doğrulanmış bağlantı kaynağı gerekli.',403);
  const now=this.#clock().getTime();requireThat(Number.isFinite(now),'identity_clock','Geçerli sunucu zamanı gerekli.',500);
  const span=this.#limits.seconds*1000,started=Math.floor(now/span)*span,ends=started+span;
  const key=(kind,value)=>createHmac('sha256',this.#key).update(JSON.stringify([this.#tenant,this.#namespace,purpose,kind,value])).digest('hex');
  const buckets=[['global','all'],['network',network],...(purpose==='start'&&browserHash?[['browser',browserHash]]:[])];
  this.#store.transaction(()=>{
   this.#epoch(now);
   const db=this.#store.db,scope=[this.#tenant,this.#namespace,purpose];
   db.prepare('DELETE FROM identity_rate_buckets WHERE tenant=? AND namespace=? AND ends<=?').run(this.#tenant,this.#namespace,now);
   const rows=buckets.map(([kind,value])=>({kind,bucket:key(kind,value)})).map(b=>({...b,row:db.prepare('SELECT * FROM identity_rate_buckets WHERE tenant=? AND namespace=? AND purpose=? AND bucket=?').get(...scope,b.bucket)}));
   requireThat(rows.every(b=>!b.row||(b.row.started<=now&&b.row.used<this.#limits[b.kind])),'identity_rate','Çok fazla giriş isteği. Kısa süre sonra yeniden deneyin.',429);
   for(const b of rows)db.prepare('INSERT INTO identity_rate_buckets VALUES(?,?,?,?,?,?,1) ON CONFLICT(tenant,namespace,purpose,bucket) DO UPDATE SET used=used+1').run(...scope,b.bucket,started,ends);
  });
 }
}
