import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from './helpers/myys-fixture.mjs';
import {LocalAcceptanceStore} from '../myys/store.mjs';
import {snapshotLocalStore,restoreLocalSnapshot} from '../scripts/lib/local-recovery.mjs';

const run=async fn=>{const f=fixture(),dir=mkdtempSync(join(tmpdir(),'myys-recovery-'));try{await fn(f,dir);}finally{f.close();rmSync(dir,{recursive:true,force:true});}};
test('yerel yedek karar, kanıt, denetim ve tekrar önleme kayıtlarını korur; oturumları geri açmaz',()=>run(async(f,dir)=>{
 const {d,ev}=f.passed();
 const records=f.s.db.prepare('SELECT * FROM records ORDER BY rowid').all();
 const audit=f.s.db.prepare('SELECT * FROM audit ORDER BY sequence').all();
 const commands=f.s.db.prepare('SELECT * FROM commands ORDER BY rowid').all();
 const sourceBindings=f.s.db.prepare('SELECT count(*) AS total FROM bindings').get().total;
 const snap=join(dir,'snapshot'),receipt=await snapshotLocalStore(f.s,snap);
 assert.equal(receipt.counts.bindings,0);assert.equal(receipt.scope,'local-acceptance-only');
 assert.equal(f.s.db.prepare('SELECT count(*) AS total FROM bindings').get().total,sourceBindings);
 const result=restoreLocalSnapshot(snap,join(dir,'restored'),receipt.digest),restored=new LocalAcceptanceStore(result.path);
 try{
  assert.deepEqual(restored.db.prepare('SELECT * FROM records ORDER BY rowid').all(),records);
  assert.deepEqual(restored.db.prepare('SELECT * FROM audit ORDER BY sequence').all(),audit);
  assert.deepEqual(restored.db.prepare('SELECT * FROM commands ORDER BY rowid').all(),commands);
  assert.equal(restored.get('test-gazi','decision',d.id).id,d.id);
  assert.equal(restored.get('test-gazi','evidence',ev.id).id,ev.id);
  assert.throws(()=>restored.principal(f.context('student').sessionHash,'test-gazi',new Date().toISOString()),e=>e.code==='identity_required');
  assert.throws(()=>restored.db.prepare('DELETE FROM records').run(),/immutable/);
  assert.equal(statSync(result.path).mode&0o777,0o600);
  assert.equal(statSync(join(dir,'restored')).mode&0o777,0o700);
 }finally{restored.close();}
}));
test('bozulmuş yedek ve eksik güvenilir özet hedef oluşturmadan reddedilir',()=>run(async(f,dir)=>{
 f.passed();const snap=join(dir,'snapshot'),receipt=await snapshotLocalStore(f.s,snap),target=join(dir,'restored');
 assert.throws(()=>restoreLocalSnapshot(snap,target),e=>e.code==='trusted_digest_required');
 const bytes=readFileSync(join(snap,'acceptance.sqlite'));bytes[100]^=1;writeFileSync(join(snap,'acceptance.sqlite'),bytes);
 assert.throws(()=>restoreLocalSnapshot(snap,target,receipt.digest),e=>e.code==='snapshot_digest');assert.equal(existsSync(target),false);
}));
test('yedek ve geri dönüş var olan dizini veya kaynak verisini değiştirmez',()=>run(async(f,dir)=>{
 f.passed();const snap=join(dir,'snapshot'),receipt=await snapshotLocalStore(f.s,snap);
 await assert.rejects(snapshotLocalStore(f.s,snap),e=>e.code==='EEXIST');
 const before=readFileSync(f.path);
 assert.throws(()=>restoreLocalSnapshot(snap,dir,receipt.digest),e=>e.code==='EEXIST');
 assert.deepEqual(readFileSync(f.path),before);assert.equal(existsSync(snap),true);
}));
test('üretim ortamında yerel yedek ve geri dönüş kapalıdır',()=>run(async(f,dir)=>{
 const old=process.env.VERCEL;process.env.VERCEL='1';
 try{
  await assert.rejects(snapshotLocalStore(f.s,join(dir,'snapshot')),e=>e.code==='local_only');
  assert.throws(()=>restoreLocalSnapshot(dir,join(dir,'restored'),'a'.repeat(64)),e=>e.code==='local_only');
 }finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
 assert.equal(existsSync(join(dir,'snapshot')),false);
}));
