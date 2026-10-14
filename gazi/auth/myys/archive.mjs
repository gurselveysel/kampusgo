import {sourceSnapshotValid} from './lms.mjs';
import {hash,requireThat} from './store.mjs';
import {programBaseline,stableStringify} from './program-model.mjs';

export function decisionArchive(core,context,decisionId){
 return core.store.transaction(()=>{
  const s=core.store,tenant=context.tenant,a=s.principal(context.sessionHash,tenant,core.clock()),decision=core.authorizedRecord(a,'decision',decisionId),assessment=s.get(tenant,'assessment',decision.assessmentId),program=s.get(tenant,'program',decision.programId);
  const baseline=assessment.programSnapshot||programBaseline(program),digest=hash(stableStringify(baseline));
  requireThat((!assessment.programDigest||assessment.programDigest===digest)&&stableStringify(baseline)===stableStringify(programBaseline(program))&&stableStringify(assessment.rubricSnapshot)===stableStringify(program.rubric),'archive_integrity','Program veya rubrik dayanağı doğrulanamadı.',409);
  const evidence=assessment.evidenceDigests.map(ref=>{const r=s.get(tenant,'evidence',ref.id);requireThat(r&&r.enrollmentId===assessment.enrollmentId&&hash(r.content)===ref.sha256&&r.sha256===ref.sha256&&sourceSnapshotValid(s,tenant,r,ref.source),'archive_integrity','Kanıtın arşiv bütünlüğü doğrulanamadı.',409);return r;});
  const payload={format:'myys-decision-archive/1',tenant,program:baseline,programDigest:digest,assessment,decision,evidence};
  // Current status deliberately lives outside the immutable historical payload.
  return {payload,sha256:hash(stableStringify(payload)),currentUsable:decision.outcome==='approved'&&core.decisionUsable(a,decision),scope:'local-acceptance',baselineSource:assessment.programSnapshot?'captured-at-assessment':'immutable-program-record',signed:false,sourceSignatures:assessment.evidenceDigests.filter(r=>r.source).length,official:false};
 });
}
