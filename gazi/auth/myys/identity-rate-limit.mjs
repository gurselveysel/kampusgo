import {createHmac} from 'node:crypto';
import {LocalAcceptanceStore,requireThat,hash} from './store.mjs';

// Fixed-window limits for the disposable HTTPS acceptance service; no IP/header trust.
export class LocalIdentityRateLimit {
 #store;#tenant;#namespace;#key;#clock;#limits;
 constructor({store,identityConfig,key,clock=()=>new Date(),limits={global:120,network:40,browser:10,seconds:60}}){
  requireThat(store instanceof LocalAcceptanceStore&&!process.env.VERCEL&&!process.env.VERCEL_ENV&&Buffer.isBuffer(key)&&key.length===32,'local_only','Yerel giriş oran sınırı yapılandırması geçersiz.',503);
  requireThat(['global','network','browser','seconds'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>=1&&limits[k]<=3600),'identity_config','Oran sınırı geçersiz.',500);
  this.#store=store;this.#tenant=identityConfig.tenant;this.#namespace=hash(JSON.stringify([identityConfig.issuer,identityConfig.audience]));this.#key=Buffer.from(key);this.#clock=clock;this.#limits={...limits};
  store.db.exec(`CREATE TABLE IF NOT EXISTS identity_rate_buckets(tenant TEXT NOT NULL,namespace TEXT NOT NULL,purpose TEXT NOT NULL,bucket TEXT NOT NULL,started INTEGER NOT NULL,ends INTEGER NOT NULL,used INTEGER NOT NULL,PRIMARY KEY(tenant,namespace,purpose,bucket));`);
 }
 check({purpose,network,browserHash=null}){
  requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Yerel giriş oran sınırı üretimde etkin değildir.',503);
  requireThat(['login','start','callback','session','logout','backchannel'].includes(purpose)&&typeof network==='string'&&network.length>0&&network.length<=128,'identity_rate','Doğrulanmış bağlantı kaynağı gerekli.',403);
  const now=this.#clock().getTime();requireThat(Number.isFinite(now),'identity_clock','Geçerli sunucu zamanı gerekli.',500);
  const span=this.#limits.seconds*1000,started=Math.floor(now/span)*span,ends=started+span;
  const key=(kind,value)=>createHmac('sha256',this.#key).update(JSON.stringify([this.#tenant,this.#namespace,purpose,kind,value])).digest('hex');
  const buckets=[['global','all'],['network',network],...(purpose==='start'&&browserHash?[['browser',browserHash]]:[])];
  this.#store.transaction(()=>{
   const db=this.#store.db,scope=[this.#tenant,this.#namespace,purpose];
   db.prepare('DELETE FROM identity_rate_buckets WHERE tenant=? AND namespace=? AND ends<=?').run(this.#tenant,this.#namespace,now);
   const rows=buckets.map(([kind,value])=>({kind,bucket:key(kind,value)})).map(b=>({...b,row:db.prepare('SELECT * FROM identity_rate_buckets WHERE tenant=? AND namespace=? AND purpose=? AND bucket=?').get(...scope,b.bucket)}));
   requireThat(rows.every(b=>!b.row||(b.row.started<=now&&b.row.used<this.#limits[b.kind])),'identity_rate','Çok fazla giriş isteği. Kısa süre sonra yeniden deneyin.',429);
   for(const b of rows)db.prepare('INSERT INTO identity_rate_buckets VALUES(?,?,?,?,?,?,1) ON CONFLICT(tenant,namespace,purpose,bucket) DO UPDATE SET used=used+1').run(...scope,b.bucket,started,ends);
  });
 }
}
