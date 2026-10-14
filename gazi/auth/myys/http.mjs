import {statusView,publishStatusSnapshot,exportPublicTrust,exportVerificationBundle} from './status-list.mjs';
import {qualityReport} from './quality-report.mjs';
import {LocalAcceptanceStore,CoreError} from './store.mjs';
import {MyysCore} from './core.mjs';
import {prepareBatch,signApproved,canSignApproved,verifyWithKeyring} from './credentials.mjs';
import {qualityMetrics,skillsProjection} from './projections.mjs';
import {downloadWalletCredential} from './wallet.mjs';
import {subjectExport} from './privacy.mjs';
import {decisionArchive} from './archive.mjs';

let singleton;
export function configuredCore(){
 if(process.env.VERCEL||process.env.VERCEL_ENV||!process.env.MYYS_LOCAL_ACCEPTANCE_PATH)return null;
 return singleton??=new MyysCore(new LocalAcceptanceStore(process.env.MYYS_LOCAL_ACCEPTANCE_PATH));
}
export async function myysRoute({req,path,b,sessionHash,json,res,core=configuredCore(),signer=null,sourceAdapter=null,recoveryService=null}){
 if(path==='/api/myys/paylasim'&&req.method==='POST'){
  if(!core)return json(res,503,{error:'Kamu paylaşım hizmeti bu ortamda etkin değil.',code:'institution_setup_required'});
  try{return json(res,200,core.shared({tenant:b?.tenant,token:b?.token}));}catch(e){if(e instanceof CoreError)return json(res,e.status,{error:e.message,code:e.code});throw e;}
 }
 if(!sessionHash)return json(res,401,{error:'Güvenli oturum gerekli.',code:'session_required'});
 if(!core)return json(res,503,{error:'Kişi bazlı kimlik ve kalıcı kurum deposu henüz bu ortama bağlanmadı. Mevcut pilot kayıtları korunuyor.',code:'institution_setup_required'});
 try{
  if(path==='/api/myys/calisma'&&req.method==='GET'){
   const tenant=new URL(req.url,'https://local.invalid').searchParams.get('kurum');
   const view=core.view({sessionHash,tenant});
   const actor=core.store.principal(sessionHash,tenant,core.clock());
   return json(res,200,{...view,recoveryAvailable:!!recoveryService,sourceContracts:sourceAdapter?.view(actor)||[],statusLists:statusView(core,actor),issuances:view.issuances.map(r=>({...r,canSign:!!signer&&canSignApproved(core,{sessionHash,tenant},r.id,signer.material)})),signerAvailable:!!signer,quality:qualityReport(view),metrics:qualityMetrics(view),skills:skillsProjection(view)});
  }
  if(['/api/myys/kaynak-al','/api/myys/kaynak-isle','/api/myys/kaynak-guveni'].includes(path)&&req.method==='POST'){
   if(!sourceAdapter)return json(res,503,{error:'İmzalı kaynak dosyası sözleşmesi bu ortamda bağlı değil.',code:'source_contract_required'});
   if(b?.contractId!==sourceAdapter.contract.id)return json(res,403,{error:'Kaynak dosyası sözleşmesi doğrulanamadı.',code:'source_contract'});
   const context={sessionHash,tenant:b?.tenant};
   if(path==='/api/myys/kaynak-al')return json(res,202,await sourceAdapter.accept(context,b?.token));
   if(path==='/api/myys/kaynak-isle')return json(res,200,sourceAdapter.process(context,b?.eventId));
   return json(res,200,sourceAdapter.trust(context,b?.trustRecordId));
  }
  if(path==='/api/myys/kurtarma-dene'&&req.method==='POST'){if(!recoveryService)return json(res,503,{error:'İzole kurtarma tatbikatı bu ortamda bağlı değil.',code:'recovery_unavailable'});return json(res,200,await recoveryService.run({sessionHash,tenant:b?.tenant},b?.planId));}
  if(path==='/api/myys/islem'&&req.method==='POST')return json(res,200,core.run({sessionHash,tenant:b?.tenant,commandId:b?.commandId,action:b?.action,input:b?.input}));
  if(path==='/api/myys/veri-ozetim'&&req.method==='POST')return json(res,200,subjectExport(core,{sessionHash,tenant:b?.tenant}));
  if(path==='/api/myys/karar-arsivi'&&req.method==='POST')return json(res,200,decisionArchive(core,{sessionHash,tenant:b?.tenant},b?.decisionId));
  if(path==='/api/myys/cuzdan-indir'&&req.method==='POST')return json(res,200,downloadWalletCredential(core,{sessionHash,tenant:b?.tenant},b?.issuanceId));
  if(path==='/api/myys/durum-yayinla'&&req.method==='POST'){if(!signer)return json(res,503,{error:'Yetkili durum imzalayıcısı bağlı değil.',code:'signer_required'});return json(res,200,await publishStatusSnapshot(core,{sessionHash,tenant:b?.tenant},b?.unit,signer.material));}
  if(path==='/api/myys/guven-sicili'&&req.method==='POST')return json(res,200,exportPublicTrust(core,{sessionHash,tenant:b?.tenant},b?.unit));
  if(path==='/api/myys/dogrulama-paketi'&&req.method==='POST')return json(res,200,exportVerificationBundle(core,{sessionHash,tenant:b?.tenant},b?.issuanceId));
  if(path==='/api/myys/toplu-hazirlik'&&req.method==='POST')return json(res,200,prepareBatch(core,{sessionHash,tenant:b?.tenant},b?.rows));
  if(['/api/myys/imzala','/api/myys/dogrula'].includes(path)&&req.method==='POST'){
   if(!signer)return json(res,503,{error:'Bu ortamda yetkili imza sağlayıcısı bağlı değil.',code:'signer_required'});
   const context={sessionHash,tenant:b?.tenant};
   const result=path.endsWith('/imzala')?await signApproved(core,context,b?.issuanceId,signer.material,signer.base):await verifyWithKeyring(core,context,b?.jwt,signer.keyring,signer.base);
   return json(res,200,result);
  }
  return json(res,404,{error:'İşlem bulunamadı.'});
 }catch(e){if(e instanceof CoreError)return json(res,e.status,{error:e.message,code:e.code});throw e;}
}
