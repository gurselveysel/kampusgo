// Local acceptance tooling only. Not imported by, or packaged with, the gateway.
import {backup, DatabaseSync} from 'node:sqlite';
import {mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync, lstatSync} from 'node:fs';
import {join} from 'node:path';
import {LocalAcceptanceStore, hash, requireThat} from '../../myys/store.mjs';

const localOnly=()=>requireThat(!process.env.VERCEL && !process.env.VERCEL_ENV,'local_only','Geri yükleme provası yalnız yerel kabul ortamında çalışır.',503);
const inventory=db=>Object.fromEntries(['persons','memberships','records','commands','audit','bindings'].map(table=>[table,db.prepare(`SELECT count(*) AS total FROM ${table}`).get().total]));
function inspect(db){
 requireThat(db.prepare('PRAGMA integrity_check').get().integrity_check==='ok','snapshot_integrity','Yedek bütünlük denetimi başarısız.');
 requireThat(db.prepare('PRAGMA foreign_key_check').all().length===0,'snapshot_relations','Yedek ilişkileri geçersiz.');
 const counts=inventory(db);
 requireThat(counts.bindings===0,'snapshot_sessions','Yedek eski oturumları geri açamaz.');
 return counts;
}

// A new private directory is mandatory: existing files are never replaced.
// The returned digest must be retained separately by the local test operator.
// It detects changed bytes; it is not a signature or a production backup policy.
export async function snapshotLocalStore(store,directory){
 localOnly();
 requireThat(store instanceof LocalAcceptanceStore,'local_store_required','Yerel kabul deposu gerekli.');
 mkdirSync(directory,{mode:0o700});
 const started=performance.now(),path=join(directory,'acceptance.sqlite');
 let db;
 try{
  await backup(store.db,path);chmodSync(path,0o600);
  db=new DatabaseSync(path);
  db.exec('DELETE FROM bindings');
  const counts=inspect(db);db.close();db=null;
  const digest=hash(readFileSync(path));
  const receipt={version:1,scope:'local-acceptance-only',createdAt:new Date().toISOString(),digest,counts,elapsedMs:performance.now()-started};
  writeFileSync(join(directory,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  return receipt;
 }catch(error){db?.close();rmSync(directory,{recursive:true,force:true});throw error;}
}

export function restoreLocalSnapshot(snapshotDirectory,directory,expectedDigest){
 localOnly();
 requireThat(typeof expectedDigest==='string' && /^[a-f0-9]{64}$/.test(expectedDigest),'trusted_digest_required','Ayrı saklanan yedek özeti gerekli.');
 const source=join(snapshotDirectory,'acceptance.sqlite');
 requireThat(lstatSync(source).isFile(),'snapshot_file','Yedek sıradan bir dosya olmalı.');
 const bytes=readFileSync(source);
 requireThat(hash(bytes)===expectedDigest,'snapshot_digest','Yedek özeti eşleşmiyor.');
 // No target exists until the exact bytes have passed verification.
 mkdirSync(directory,{mode:0o700});
 const path=join(directory,'acceptance.sqlite'),started=performance.now();let db;
 try{
  writeFileSync(path,bytes,{flag:'wx',mode:0o600});
  db=new DatabaseSync(path,{readOnly:true});const counts=inspect(db);db.close();db=null;
  return {path,counts,elapsedMs:performance.now()-started,scope:'local-acceptance-only'};
 }catch(error){db?.close();rmSync(directory,{recursive:true,force:true});throw error;}
}
