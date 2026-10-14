import {registryFields} from '../../myys/registry.mjs';
export const adviceReason='Sentetik öneri ve uzman kıyası; gerçek sağlayıcı, kişi veya kurum pilotu değildir.';
export function localAdviceSetup(f,{initial=null,prepared=true,accepted=true,sampled=true,compared=false}={}){
 const x=initial||f.passed(),refs={},sourceReference='https://synthetic.invalid/local-advice';
 for(const type of ['content-rights','data-flow']){
  const r=f.run('admin','registry-draft',{unit:x.p.unit,type,title:type==='content-rights'?'Sentetik öneri içerik hakkı':'Sentetik öneri veri akışı',fields:Object.fromEntries(registryFields[type].map(k=>[k,k==='sourceReference'?sourceReference:k==='recipient'?'local-simulator':adviceReason]))});
  f.run('authority','registry-review',{recordId:r.id,outcome:'accepted',reason:adviceReason});refs[type]=r.id;
 }
 const input={programId:x.p.id,dataFlowId:refs['data-flow'],contentRightsId:refs['content-rights'],sourceReference,purpose:adviceReason,candidate:'Sağlayıcıdan bağımsız elle girilen sentetik çıktı',planReference:adviceReason,language:'tr',languageTestReference:adviceReason,expertPersonId:'publisher',expertReference:adviceReason,validUntil:new Date(Date.parse(f.core.clock())+30*86400000).toISOString(),reason:adviceReason,scope:'local-acceptance',official:false,syntheticOnly:true};
 const protocol=prepared?f.run('admin','advice-protocol',input):null;
 if(protocol&&accepted)f.run('reviewer','advice-protocol-review',{protocolId:protocol.id,outcome:'accepted',reason:adviceReason});
 const sampleInput={protocolId:protocol?.id,assessmentId:x.a?.id,suggestion:x.a?.rubricSnapshot.map(r=>({criterionId:r.id,score:1,reason:adviceReason})),reason:adviceReason,syntheticConfirmed:true};
 const sample=protocol&&accepted&&sampled?f.run('teacher','advice-sample',sampleInput):null;
 const comparison=sample&&compared?f.run('publisher','advice-compare',{sampleId:sample.id,expertScores:sample.rubric.map(r=>({criterionId:r.id,score:3,reason:adviceReason})),reason:adviceReason}):null;
 return {...x,input,protocol,sampleInput,sample,comparison};
}
