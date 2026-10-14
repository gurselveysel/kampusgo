import {sourceDescriptor} from '../../myys/source-contract.mjs';
import {sourceTrustDigest} from '../../myys/source-trust.mjs';
import {randomUUID} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT,CompactSign} from 'jose';
import {LocalSignedSourceAdapter,sourceBinding,sourcePacketFormat,sourcePacketType} from '../../myys/source-packet.mjs';
import {hash} from '../../myys/store.mjs';

export async function sourcePacketFixture(f,{initial=f.setup(),registered=true}={}){
 const pair=await generateKeyPair('RS256',{modulusLength:2048}),issuer='https://synthetic-lms.invalid',jwk={...await exportJWK(pair.publicKey),alg:'RS256',use:'sig',kid:issuer+'/keys#synthetic-source'};
 const tenant=f.context('it').tenant,config={mode:'local-acceptance',id:'synthetic-source-1',name:'Sentetik LMS kaynak dosyası',tenant,unit:'engineering',programId:initial.p.id,version:'local-source-1',issuer,audience:'myys-source-acceptance',courseId:'source-course-1',sourceProgramVersion:'source-program-v1',sourceRubricVersion:'source-rubric-v1',subjects:{'source-student':'student','source-other':'other'},keys:[{jwk,state:'active',notBefore:'2000-01-01T00:00:00.000Z',notAfter:'2099-01-01T00:00:00.000Z'}]};
 const clock=()=>f.core.clock(),adapter=new LocalSignedSourceAdapter(f.s,config,{clock});
 let trustRecord=null;if(registered){const reason='Sentetik kaynak sözleşmesi ve kişi eşleme dayanağı incelemesi.';trustRecord=f.run('it','source-contract',{descriptor:sourceDescriptor(config),localOnly:true,reason,sourceReference:reason,mappingReference:reason,validFrom:'2000-01-01T00:00:00.000Z',expiresAt:'2099-01-01T00:00:00.000Z'});f.run('admin','source-contract-review',{contractId:trustRecord.id,basedOn:sourceTrustDigest(trustRecord),outcome:'accepted',reason});}
 const payload=(changes={})=>{
  const at=Math.floor(Date.parse(clock())/1000),id=randomUUID(),content='Sentetik dış kaynak çalışması: veri temizleme yöntemi ve sonuçları gerekçeleriyle açıklandı.';
  const event={id,revision:1,type:'grade',occurredAt:new Date(at*1000).toISOString(),taskId:'T1',submissionId:'source-submission-1',submissionVersion:1,content,contentSha256:hash(content),grade:90,completed:null,...changes};
  if(event.type!=='grade')Object.assign(event,{taskId:null,content:null,contentSha256:null,grade:null,completed:event.type==='completion'?changes.completed??true:null});
  const c=config;return {iss:c.issuer,aud:c.audience,iat:at,exp:at+3600,jti:event.id,sub:'source-student',personId:'student',format:sourcePacketFormat,scope:{tenant:c.tenant,unit:c.unit,contractId:c.id,contractVersion:c.version,courseId:c.courseId,sourceProgramVersion:c.sourceProgramVersion,sourceRubricVersion:c.sourceRubricVersion},binding:sourceBinding(initial.p,event.type==='grade'?event.taskId:null),event};
 };
 const token=(p=payload(),header={})=>new SignJWT(p).setProtectedHeader({alg:'RS256',kid:jwk.kid,typ:sourcePacketType,...header}).sign(pair.privateKey);
 const rawToken=raw=>new CompactSign(Buffer.from(raw)).setProtectedHeader({alg:'RS256',kid:jwk.kid,typ:sourcePacketType}).sign(pair.privateKey);
 return {initial,adapter,config,trustRecord,payload,token,rawToken,make:(store=f.s,patch={})=>new LocalSignedSourceAdapter(store,{...config,...patch},{clock})};
}
