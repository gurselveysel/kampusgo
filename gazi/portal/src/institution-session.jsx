import {useEffect,useSyncExternalStore} from 'react';
import {myysClient,institutionRoleNames} from './myys-client.mjs';

export function useInstitutionSession(enabled=true){
 const session=useSyncExternalStore(myysClient.subscribe,myysClient.getSnapshot);
 useEffect(()=>{
  if(!enabled)return;
  myysClient.refresh();
  const revisit=()=>{myysClient.expire();if(document.visibilityState==='visible'&&myysClient.getSnapshot().status!=='blocked')myysClient.refresh();};
  const timer=setInterval(()=>{myysClient.expire();if(myysClient.getSnapshot().status==='active')revisit();},60000);
  window.addEventListener('focus',revisit);document.addEventListener('visibilitychange',revisit);
  return()=>{clearInterval(timer);window.removeEventListener('focus',revisit);document.removeEventListener('visibilitychange',revisit);};
 },[enabled]);
 useEffect(()=>{
  if(session.status!=='active')return;
  const timer=setTimeout(()=>myysClient.expire(),Math.max(0,Date.parse(session.expires)-Date.now()));
  return()=>clearTimeout(timer);
 },[session]);
 return session;
}
export function InstitutionSession({session,page}){
 const active=session.status==='active';
 const states={checking:'Oturum kontrol ediliyor…',closed:'Yerel kurum oturumu kapalı.',expired:'Yerel kurum oturumunun süresi doldu.',blocked:'Kayıt güvenliği kontrol edilmeli.',unavailable:'Kurum oturumu doğrulanamadı.'};
 return <section className="institution-session" aria-label="Oturum kişisi">
  <div aria-live="polite" aria-atomic="true">{active?<><strong>Oturum kişisi: <span>{session.personId}</span></strong><p>Kurum: {session.tenant} · {session.memberships.map(m=>m.unit+' · '+m.roles.map(r=>institutionRoleNames[r]).join(', ')).join(' / ')}</p><p>Oturum sonu: {new Date(session.expires).toLocaleString('tr-TR')} · İzole deneme, resmî hizmet değil.</p></>:<strong>{states[session.status]}</strong>}</div>
  <p>Sunum profili yalnız örnek ekranları değiştirir. {page==='academic'?'Bu alandaki kayıt erişimini sunucu denetler.':'Buradaki kaynak özetleri, örnek işlemler ve tarayıcı taslakları oturum kişisinin kurumsal kayıtları değildir.'}</p>
  <a href="#/academic">Kişiye bağlı akademik kayıtları aç</a>
 </section>;
}
