// Browser memory only. Display metadata is never an authorization source.
const scopes=new Set(['local-acceptance','isolated-sql-acceptance']);
export const institutionRoleNames=Object.freeze({learner:'Öğrenen',instructor:'Eğitici',coordinator:'Koordinatör',commission:'Komisyon',studentAffairs:'Öğrenci işleri',quality:'Kalite',it:'Bilgi işlem',finance:'Mali işler',admin:'Yönetici'});
const text=value=>typeof value==='string'&&value.length>0&&value.length<=256;
export function createMyysClient({fetcher=(...args)=>fetch(...args),now=()=>Date.now()}={}){
 let tail=Promise.resolve(),csrf=null,refreshing=null,snapshot=Object.freeze({status:'checking'});
 const listeners=new Set();
 function publish(value){snapshot=Object.freeze(value);for(const listener of listeners)listener();}
 function clear(status){
  csrf=null;
  // A late failed read must not replace an established expiry/checkpoint reason.
  if(snapshot.status==='blocked'||status==='unavailable'&&['closed','expired'].includes(snapshot.status))status=snapshot.status;
  publish({status});
 }
 function accept(info,memberships){
  expire();const expires=Date.parse(info?.expires);
  if(!scopes.has(info?.scope)||!text(info.personId)||!text(info.tenant)||!Number.isFinite(expires)||expires<=now()||expires-now()>900000||!text(info.csrf)||!Array.isArray(memberships)||!memberships.length)return false;
  if(memberships.some(m=>!text(m.unit)||!Array.isArray(m.roles)||!m.roles.length||m.roles.some(r=>!Object.hasOwn(institutionRoleNames,r))))return false;
  csrf=info.csrf;
  publish({status:'active',personId:info.personId,tenant:info.tenant,expires:info.expires,scope:info.scope,memberships:Object.freeze(memberships.map(m=>Object.freeze({unit:m.unit,roles:Object.freeze([...m.roles])})))});
  return true;
 }
 function expire(){if(snapshot.status==='active'&&Date.parse(snapshot.expires)<=now())clear('expired');}
 async function perform(path,body,signal){
  if(signal?.aborted)throw new DOMException('İstek iptal edildi.','AbortError');
  expire();
  let response,data;
  try{
   // Do not abort an already dispatched request: its server transaction may still
   // be running. Consume it before releasing this tab's lane; never retry writes.
   response=await fetcher('/api/myys/'+path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json',...(csrf?{'X-MYYS-CSRF':csrf}:{})},body:JSON.stringify(body)}:{})});
   data=await response.json();
   if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Sunucu yanıtı doğrulanamadı.');
  }catch(error){clear('unavailable');throw error;}
  if(!response.ok){
   if(data.code==='identity_checkpoint')clear('blocked');else if(response.status===401)clear('closed');else if(response.status>=500||path==='kimlik/oturum'||response.status===403&&/^(identity_|session_)/.test(data.code||''))clear('unavailable');
   const error=new Error(data.error||'İşlem tamamlanamadı.');error.code=data.code;
   if(data.code!=='identity_checkpoint'&&scopes.has(data.scope)&&data.loginPath==='/__identity/login')error.loginPath=data.loginPath;
   throw error;
  }
  if(path==='kimlik/cikis')clear('closed');
  else if(path==='kimlik/oturum'){
   if(data.active!==true||data.official!==false||!accept(data,data.memberships))clear('unavailable');
  }else if(data.identitySession){
   if(data.personId!==data.identitySession.personId||!accept(data.identitySession,data.memberships))clear('unavailable');
  }
  if(signal?.aborted)throw new DOMException('İstek iptal edildi.','AbortError');
  return data;
 }
 function request(path,body,signal){
  if(typeof path!=='string'||!/^[-a-z0-9/]+(?:\?[^#]*)?$/.test(path)||path.includes('..')||path.startsWith('/'))return Promise.reject(new Error('Geçersiz MYYS yolu.'));
  const result=tail.then(()=>perform(path,body,signal));tail=result.catch(()=>{});return result;
 }
 function refresh(){
  if(!refreshing)refreshing=request('kimlik/oturum').catch(()=>null).finally(()=>{refreshing=null;});
  return refreshing;
 }
 return Object.freeze({request,refresh,expire,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},getSnapshot:()=>snapshot});
}
export const myysClient=createMyysClient();
