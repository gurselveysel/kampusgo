import React,{useState} from 'react';
import {Card,CardHead,Field,Notice,Pill} from './ui.jsx';
const states={unreported:'Kaynak kaydı bildirilmedi',pending:'Kayıt bildirimi işlenmeyi bekliyor',active:'Kaynak ders kaydı etkin',cancelled:'Kaynak ders kaydı iptal edilmiş',untrusted:'Kaynak kayıt güveni kapalı'};
const completion=c=>!c?'Tamamlama bildirimi yok':!c.current?'Tamamlama bildirimi henüz kullanılamıyor':c.completed?'Kaynak tamamlandı bildirdi':'Kaynak henüz tamamlanmadı bildirdi';
export function SourceProgressWorkspace({rows}){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all');
 const found=rows.filter(r=>(filter==='all'||r.registration.state===filter)&&[r.owner,r.programTitle,r.sourceName,r.courseId,r.registration.registrationId].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
 return <Card><CardHead title="Kaynak ders kaydı ve ilerleme" sub="Program kaydıyla eşleşen kaynak bildirimleri. Yalnız erişim kapsamınızdaki kişiler."/>
 <div className="academic-body form-stack source-progress"><Notice>Kaynak ders kaydı, kurumun program kaydı ve akademik başarı kararı ayrı işlemlerdir. Buradaki notlar kaynak notudur; insanın rubrik değerlendirmesi yerine geçmez.</Notice>
 <Field label="Kaynak ilerlemesinde ara"><input aria-label="Kaynak ilerlemesinde ara" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kişi, program veya kaynak dersi"/></Field>
 <Field label="Kaynak kayıt durumu"><select aria-label="Kaynak kayıt durumu" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tüm kayıt durumları</option>{Object.entries(states).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field>
 <p role="status">{found.length} kaynak ders kaydı gösteriliyor.</p>
 {found.map(r=><article className="academic-record source-progress-record" key={r.id}><strong>{r.programTitle}</strong><p>Öğrenen: {r.owner}</p><p>{r.sourceName}{r.courseId?' · Ders: '+r.courseId:''}</p><Pill tone={r.registration.state==='active'?'green':'amber'}>{states[r.registration.state]}</Pill>
 <small>Program kaydı: {r.enrollmentId}</small>{r.registration.registrationId&&<p>Kaynak kayıt kimliği: {r.registration.registrationId} · Sürüm {r.registration.revision}</p>}
 {r.registration.state==='unreported'&&<p>Önceki yerel kaynak profilinde kayıt bildirimi yok. Kaynakta ders kaydının bulunduğu doğrulanmış sayılmaz.</p>}
 {r.licenseRevoked&&<p>Kaynak lisansı iptal edilmiş. Bu kaynağın öğrenme kanıtları yeni işlemlerde kullanılamaz.</p>}
 <p>{completion(r.completion)}{r.completion?' · Sürüm '+r.completion.revision:''}</p>
 {r.tasks.length?<ul>{r.tasks.map(t=><li key={t.taskId}><strong>{t.title}</strong> · Kaynak notu {t.grade}/100 · Sürüm {t.revision}<p>{t.current?'Kaynak verisi güncel; eğiticinin insan değerlendirmesi gerekir.':t.processed?'Bu görev kaynağı yeni değerlendirmeye kapalı.':'Görev kaynağı henüz işlenmedi veya kullanıma kapalı.'}</p></li>)}</ul>:<p>Görev notu bildirimi yok.</p>}
 {!!r.history.length&&<details><summary>Kaynak kayıt geçmişi</summary><ol>{r.history.map(h=><li key={h.eventId}>Sürüm {h.revision} · {h.registered?'Kayıt etkin bildirildi':'Kayıt iptali bildirildi'} · {h.processed?'İşlendi':'Henüz işlenmedi'} · {new Date(h.occurredAt).toLocaleString('tr-TR')}</li>)}</ol></details>}
 </article>)}
 {!found.length&&<p>Bu filtre ve erişim kapsamında kaynak ilerlemesi bulunmuyor.</p>}
 </div></Card>;
}
