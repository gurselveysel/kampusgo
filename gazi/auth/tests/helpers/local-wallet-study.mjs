import {registryFields} from '../../myys/registry.mjs';
import {walletOptions} from '../../myys/wallet-study-model.mjs';
export const walletStudyReason='Sentetik cüzdan ihtiyacı ve seçenek kıyası; gerçek kurum veya tedarik kararı değildir.';
export function localWalletStudySetup(f,{initial=null,prepared=true,reviewed=true}={}){
 const x=initial||f.passed(),refs={};
 for(const type of ['data-flow','institution-authority']){
  const r=f.run('admin','registry-draft',{unit:x.p.unit,type,title:type==='data-flow'?'Sentetik cüzdan veri akışı':'Sentetik cüzdan keşif yetkisi',fields:Object.fromEntries(registryFields[type].map(k=>[k,k==='recipient'?'not-connected':walletStudyReason]))});f.run('authority','registry-review',{recordId:r.id,outcome:'accepted',reason:walletStudyReason});refs[type]=r.id;
 }
 const input={programId:x.p.id,need:'Öğrenenin belgesini bağımsız ortamda doğrulatma gereksinimini sentetik örnekle karşılaştırma.',needReference:walletStudyReason,purpose:walletStudyReason,authorityReference:walletStudyReason,dataFlowId:refs['data-flow'],authorityId:refs['institution-authority'],alternatives:walletOptions.map(o=>({id:o.id,benefit:walletStudyReason,limit:walletStudyReason,privacy:walletStudyReason,remaining:walletStudyReason})),recommendation:'defer',selectedOption:null,reason:walletStudyReason,reviewOn:new Date(Date.parse(f.core.clock())+30*86400000).toISOString().slice(0,10),scope:'local-acceptance',official:false,onChainPersonalData:false};
 const study=prepared?f.run('admin','wallet-study',input):null;
 if(study&&reviewed)for(const [who,discipline]of [['it','technical'],['reviewer','privacy']])f.run(who,'wallet-study-review',{studyId:study.id,discipline,outcome:'accepted',reason:walletStudyReason});
 return {...x,input,study};
}
