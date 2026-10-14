import {hash} from './store.mjs';
import {stableStringify} from './program-model.mjs';
const digest=r=>hash(stableStringify(r));
// Historical identity, deliberately independent of today's key validity. A held
// credit still occupies the ledger until an independent decision reverses it.
// Never infer an issuer from a learner's free-text sourceIssuer declaration.
export function recognitionSourceIdentity(s,t,r,technical){
 if(!r||technical?.requestId!==r.id||technical.outcome!=='accepted'||technical.sourceDigest!==r.sourceDigest||!technical.verification)return null;
 const v=s.get(t,'recognition-verification',technical.verification.id);
 if(!v||technical.verification.digest!==digest(v)||v.requestId!==r.id||v.requestDigest!==digest(r)||v.owner!==r.owner||v.unit!==r.unit||v.sourceDigest!==r.sourceDigest||v.credentialId!==r.sourceCredentialId||v.signatureValid!==true||v.subjectMatched!==true||typeof v.issuer!=='string'||!v.issuer)return null;
 const document=s.get(t,'recognition-document',v.documentId);
 if(!document||v.documentDigest!==digest(document)||document.requestId!==r.id||document.sha256!==r.sourceDigest)return null;
 return {scheme:'verified-credential-outcome/1',key:hash(stableStringify({tenant:t,person:r.owner,issuer:v.issuer,credential:v.credentialId,outcome:r.sourceOutcomeKey.trim().normalize('NFKC').toUpperCase()}))};
}
export function creditSourceIdentity(s,t,credit){
 const d=s.get(t,'recognition-decision',credit.decisionId),r=d&&s.get(t,'recognition-request',d.requestId),technical=d?.technicalId&&s.get(t,'recognition-technical',d.technicalId);
 if(!r||credit.owner!==r.owner||credit.requestId!==r.id||credit.targetProgramCode!==r.targetProgramCode)return null;
 // Derive old and new credits identically; a submitted/copied identity field is
 // never authoritative. Existing records need no rewrite or production migration.
 return recognitionSourceIdentity(s,t,r,technical);
}
