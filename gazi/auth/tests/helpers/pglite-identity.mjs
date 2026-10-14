// Test-only single-connection PostgreSQL WASM engine. This is NOT a native multi-session pool.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
export async function pgliteIdentity(dataDir){
 const db=await PGlite.create(dataDir);let tail=Promise.resolve(),active=0;
 const h={db,calls:[],releases:[],fault:null,get active(){return active;}};
 h.pool={connect:async()=>{
  const before=tail;let unlock;tail=new Promise(r=>{unlock=r;});await before;active++;
  let released=false;
  return {query:async(text,values=[])=>{
   h.calls.push({text,values});
   if(h.fault)await h.fault({text,values,db});
   return db.query(text,values);
  },release:destroy=>{if(!released){released=true;active--;h.releases.push(!!destroy);unlock();}}};
 }};
 h.install=()=>readFile(new URL('../../myys/identity-key-schema.sql',import.meta.url),'utf8').then(sql=>db.exec(sql));
 h.close=()=>db.close();return h;
}
