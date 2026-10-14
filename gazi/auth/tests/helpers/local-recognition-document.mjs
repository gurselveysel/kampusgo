import {hash} from '../../myys/store.mjs';
import {localRecognitionPolicy,localRecognitionBasis} from './local-recognition.mjs';
// Deliberately NOT a valid signature. A delivery receipt must never make this credential valid.
export const syntheticDocument=Buffer.from([Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'https://credential.invalid/keys#synthetic'})).toString('base64url'),Buffer.from(JSON.stringify({iss:'https://credential.invalid',sub:'urn:synthetic:student',jti:'urn:synthetic:credential',type:['VerifiableCredential'],credentialSubject:{id:'urn:synthetic:student'}})).toString('base64url'),'c3ludGhldGljLW5vdC1hLXNpZ25hdHVyZQ'].join('.'));
export function localRecognitionDocumentCase(f){
 const {p,e}=f.setup(),policy=f.run('admin','recognition-policy',localRecognitionPolicy),reason='Sentetik belge teslimi; imza veya kurum kararı doğrulanmış değildir.';
 localRecognitionBasis(f,policy);f.run('publisher','recognition-policy-review',{policyId:policy.id,outcome:'accepted',reason});
 const input={enrollmentId:e.id,policyId:policy.id,sourceTitle:'Sentetik dış belge teslimi',sourceIssuer:'Sentetik düzenleyici',sourceCredentialId:'urn:synthetic:credential',sourceOutcomeKey:'SOURCE-ONE',sourceDigest:hash(syntheticDocument),targetCourseCode:'DOC-101',mappingReason:reason,requestedCredits:10,remoteCredits:5};
 const request=f.run('student','recognition-request',input),upload={requestId:request.id,fileName:'sentetik-belge.jwt',base64:syntheticDocument.toString('base64')};return {p,e,policy,request,input,upload,reason};
}
