// Disposable synthetic rehearsal; no production data or identity provider.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../tests/helpers/myys-fixture.mjs';
import {snapshotLocalStore,restoreLocalSnapshot} from './lib/local-recovery.mjs';

const f=fixture(),dir=mkdtempSync(join(tmpdir(),'myys-recovery-drill-'));
try{
 f.passed();
 const receipt=await snapshotLocalStore(f.s,join(dir,'snapshot'));
 // A later synthetic write makes the loss boundary explicit, not silently zero.
 f.program();
 const currentRecords=f.s.db.prepare('SELECT count(*) AS total FROM records').get().total;
 const restored=restoreLocalSnapshot(join(dir,'snapshot'),join(dir,'restored'),receipt.digest);
 console.log(JSON.stringify({scope:'Yalnız sentetik yerel kabul provası',at:new Date().toISOString(),backupMs:receipt.elapsedMs,restoreMs:restored.elapsedMs,restoredCounts:restored.counts,recordsAfterSnapshot:currentRecords-restored.counts.records,sessionsRestored:restored.counts.bindings,productionRpoRtoVerified:false,note:'Ölçümler üretim hizmet taahhüdü değildir. Haricî kimlik, anahtar kasası, kuyruk ve üretim geri dönüşü kapsam dışıdır.'},null,2));
}finally{f.close();rmSync(dir,{recursive:true,force:true});}
