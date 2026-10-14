// Disposable synthetic rehearsal only. Not imported or packaged by the live gateway.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../../tests/helpers/myys-fixture.mjs';
import {localCredentialProfile} from '../../tests/helpers/local-credential-profile.mjs';
import {signedFixture} from '../../tests/helpers/local-signing.mjs';
import {sourcePacketFixture} from '../../tests/helpers/local-source-packet.mjs';
import {backchannelHarness} from '../../tests/helpers/local-backchannel.mjs';
import {snapshotLocalStore,restoreLocalSnapshot} from './local-recovery.mjs';
import {LocalAcceptanceStore,hash,requireThat} from '../../myys/store.mjs';
import {MyysCore} from '../../myys/core.mjs';
import {decisionArchive} from '../../myys/archive.mjs';
import {signApproved} from '../../myys/credentials.mjs';
import {keyStatus,credentialBlocked} from '../../myys/key-registry.mjs';
import {recoveryChecks} from '../../myys/recovery-model.mjs';

const reason='Sentetik kesinti ve kurtarma tatbikatı; gerçek kurum işlemi değildir.';
const dump=s=>JSON.stringify(['records','commands','audit','identity_logout_receipts'].map(t=>s.db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()));
export async function runSyntheticRecoveryDrill(){
 requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Tatbikat yalnız izole yerel kabulde çalışır.',503);
 const f=fixture(),directory=mkdtempSync(join(tmpdir(),'myys-integrated-recovery-'));let restored;
 const checks={};const check=(id,fn)=>{fn();checks[id]=true;};
 try{
  const h=backchannelHarness(f);f.core.clock=()=>h.now().toISOString();
  const x=await signedFixture(f),p=f.run('author','program',{...x.p,code:'P02',title:'Sentetik kaynak kurtarma programı'});f.run('publisher','publish',{programId:p.id,reason});localCredentialProfile(f,p);const e=f.run('author','enroll',{programId:p.id,learnerId:'student'});
  const source=await sourcePacketFixture(f,{initial:{p,e}}),c=f.context('it'),t=c.tenant;
  const p1=source.payload(),token1=await source.token(p1),event1=await source.adapter.accept(c,token1);source.adapter.process(c,event1.id);
  const ev=f.run('teacher','import-lms-evidence',{eventId:event1.id});
  const a=f.run('teacher','assess',{enrollmentId:source.initial.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason}],reason});
  const d=f.run('judge','decide',{assessmentId:a.id,outcome:'approved',reason}),issuance=f.run('issuer','issue',{decisionId:d.id});
  await signApproved(f.core,f.context('issuer'),issuance.id,x.material,x.base);
  const archive=decisionArchive(f.core,f.context('student'),d.id);
  const active=await h.login(),pending=h.begin({sub:'other'});
  const token2=await source.token(source.payload({revision:2,submissionVersion:2})),event2=await source.adapter.accept(c,token2);
  const interrupted=source.adapter.worker(c).claim(event2.id);
  assert.ok(interrupted);
  const oldDir=join(directory,'old'),old=await snapshotLocalStore(f.s,oldDir);
  f.run('issuer','revoke',{issuanceId:issuance.id,reason});
  f.run('it','key-state',{keyId:x.signed.keyId,state:'compromised',expectedState:'active',reason,incidentReference:reason});
  const logoutToken=await h.logout();await h.flow.backchannelLogout({logoutToken});
  const currentDir=join(directory,'current'),receipt=await snapshotLocalStore(f.s,currentDir),expected=dump(f.s);
  // This trusted checkpoint lives outside the restored database. The old receipt
  // alone is insufficient: no security tail is reconstructed or invented.
  const latestDigest=receipt.digest;
  const started=performance.now();
  check('staleBackup',()=>{assert.notEqual(old.digest,latestDigest);assert.throws(()=>restoreLocalSnapshot(oldDir,join(directory,'stale'),latestDigest),e=>e.code==='snapshot_digest');assert.equal(existsSync(join(directory,'stale')),false);});
  const bytes=readFileSync(join(currentDir,'acceptance.sqlite')),bad=Buffer.from(bytes);bad[100]^=1;writeFileSync(join(currentDir,'acceptance.sqlite'),bad);
  check('damagedBackup',()=>{assert.throws(()=>restoreLocalSnapshot(currentDir,join(directory,'damaged'),latestDigest),e=>e.code==='snapshot_digest');assert.equal(existsSync(join(directory,'damaged')),false);});
  writeFileSync(join(currentDir,'acceptance.sqlite'),bytes);
  const copy=restoreLocalSnapshot(currentDir,join(directory,'restored'),latestDigest);restored=new LocalAcceptanceStore(copy.path);
  const core=new MyysCore(restored,{clock:f.core.clock}),flow=h.make(restored);
  check('records',()=>assert.equal(dump(restored),expected));
  check('sessions',()=>{assert.equal(copy.counts.bindings,0);assert.throws(()=>restored.principal(hash(active.sessionToken),t,core.clock()),e=>e.code==='identity_required');assert.equal(restored.db.prepare("SELECT count(*) n FROM identity_challenges WHERE status IN ('pending','claimed')").get().n,0);});
  await assert.rejects(()=>flow.complete(pending),e=>e.code==='identity_challenge');
  assert.equal((await flow.backchannelLogout({logoutToken})).replayed,true);checks.logout=true;
  // Advance the synthetic clock past the interrupted lease, without sleeping.
  h.advance(31000);
  const it=await h.login({flow,sub:'it'}),student=await h.login({flow});
  const itContext={tenant:t,sessionHash:hash(it.sessionToken)},studentContext={tenant:t,sessionHash:hash(student.sessionToken)};
  check('freshIdentity',()=>{assert.equal(restored.principal(itContext.sessionHash,t,core.clock()).id,'it');assert.equal(restored.principal(studentContext.sessionHash,t,core.clock()).id,'student');});
  const adapter=source.make(restored),worker=adapter.worker(itContext);
  check('queue',()=>{assert.throws(()=>worker.finish(interrupted),e=>e.code==='lease_lost');assert.equal(worker.run(event2.id).receipt.state,'processed');assert.equal(worker.run(event2.id).claimed,false);assert.equal(restored.list(t,'lms-receipt').filter(r=>r.id===event2.id).length,1);});
  const before=dump(restored),replayed=await adapter.accept(itContext,token2);
  check('duplicate',()=>{assert.equal(replayed.duplicate,true);assert.equal(replayed.processed,true);assert.equal(dump(restored),before);});
  check('archive',()=>{const next=decisionArchive(core,studentContext,d.id);assert.equal(next.sha256,archive.sha256);assert.equal(next.sourceSignatures,1);assert.equal(next.payload.assessment.evidenceDigests[0].source.proof.jwt,token1);assert.equal(next.currentUsable,false);});
  check('keyRisk',()=>{assert.equal(keyStatus(restored,t,restored.get(t,'key',x.signed.keyId)).state,'compromised');assert.equal(credentialBlocked(core,t,x.issuance),true);});
  check('wrongIssuance',()=>{assert.equal(restored.list(t,'revocation').filter(r=>r.issuanceId===issuance.id).length,1);assert.equal(credentialBlocked(core,t,issuance),true);});
  assert.deepEqual(Object.keys(checks).sort(),Object.keys(recoveryChecks).sort());
  return {format:'myys-recovery-report/1',scenarioVersion:'2026.10.14.1',checks,backupMs:receipt.elapsedMs,restoreMs:copy.elapsedMs,recoveryMs:performance.now()-started,recoveryPointGapMs:0,lostRecords:0,restoredRecords:copy.counts.records,restoredSessions:0,checkpointDigest:latestDigest,archiveDigest:archive.sha256,sourceSignatureCount:1,syntheticLeaseAdvanceMs:31000,productionRpoRtoVerified:false,official:false};
 }finally{restored?.close();f.close();rmSync(directory,{recursive:true,force:true});}
}
