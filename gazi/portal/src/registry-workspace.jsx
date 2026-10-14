import {Fragment,useState} from 'react';
import {RegistryForm,registryTypes} from './academic-forms.jsx';
import {Card,CardHead,Field,Button,Notice,Pill} from './ui.jsx';
const reviewLabels={accepted:'Yerel inceleme: uygun',rejected:'Yerel inceleme: uygun değil',pending:'İnceleme bekliyor'};
export function RegistryWorkspace({data,busy,command}){
 const [search,setSearch]=useState(''),[type,setType]=useState('all'),[state,setState]=useState('all');
 const reviews=new Map((data.registryReviews||[]).map(r=>[r.recordId,r]));
 const canReview=r=>data.memberships.some(m=>m.unit===r.unit&&m.roles.includes('admin'))&&r.createdBy!==data.personId&&!reviews.has(r.id);
 const records=(data.registry||[]).filter(r=>(type==='all'||r.type===type)&&(state==='all'||(reviews.get(r.id)?.outcome||'pending')===state)&&[r.title,registryTypes[r.type]?.[0],...Object.values(r.fields||{})].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
 return <><Notice>Bu sicil kaynak ve sorumlulukları kayıt altına alır. Yerel inceleme, kurum kararı veya resmî belge düzenleme yetkisi değildir. Hazırlayan kendi kaydını inceleyemez.</Notice>
 {data.supportedActions&&!data.supportedActions.includes("authority-dossier")&&<Notice>Bu yerel denemede sicil taslağı ve bağımsız inceleme açıktır. Yetki dosyası, belge profili ve resmî belge düzenleme henüz açık değildir.</Notice>}
 <Card><CardHead title="Politika ve hak kayıtları" sub="Yetkili olduğunuz birimlerin taslakları ve ayrı kişilerce yapılan incelemeler."/><div className="academic-body form-stack">
 <Field label="Sicil kayıtlarında ara"><input aria-label="Sicil kayıtlarında ara" value={search} onChange={e=>setSearch(e.target.value)}/></Field>
 <Field label="Sicil türü filtresi"><select aria-label="Sicil türü filtresi" value={type} onChange={e=>setType(e.target.value)}><option value="all">Bütün türler</option>{Object.entries(registryTypes).map(([id,[label]])=><option value={id} key={id}>{label}</option>)}</select></Field>
 <Field label="Sicil inceleme durumu filtresi"><select aria-label="Sicil inceleme durumu filtresi" value={state} onChange={e=>setState(e.target.value)}><option value="all">Bütün durumlar</option>{Object.entries(reviewLabels).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></Field>
 <p role="status">{records.length} sicil kaydı gösteriliyor.</p>
 {records.map(r=>{const review=reviews.get(r.id),labels=registryTypes[r.type]?.[1]||{};return <article className="academic-record" key={r.id}><h3>{r.title}</h3><Pill tone={review?.outcome==='accepted'?'blue':'amber'}>{reviewLabels[review?.outcome||'pending']}</Pill><p>{registryTypes[r.type]?.[0]} · Birim: {r.unit}</p><p>Hazırlayan: {r.createdBy} · {new Date(r.createdAt).toLocaleString('tr-TR')}</p><small>Kayıt: {r.id}</small><dl className="policy-list registry-fields">{Object.entries(labels).map(([key,label])=><Fragment key={key}><dt>{label}</dt><dd>{r.fields[key]}</dd></Fragment>)}</dl>
 {review?<div><p>İnceleyen: {review.createdBy} · {new Date(review.createdAt).toLocaleString('tr-TR')}</p><p>Gerekçe: {review.reason}</p><p>Bu kayıt ve incelemesi korunur. Değişen koşullar için ayrıca yeni taslak hazırlanır.</p></div>:r.createdBy===data.personId?<p>İnceleme, aynı birimdeki farklı bir yetkili yöneticiyi bekliyor.</p>:null}
 {canReview(r)&&<form className="form-stack" aria-label={r.title+' incelemesi'} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await command('registry-review',{recordId:r.id,outcome:f.get('outcome'),reason:f.get('reason')}))form.reset();}}><Field label="Sicil inceleme sonucu"><select name="outcome" aria-label="Sicil inceleme sonucu" required><option value="accepted">Yerel kapsamda uygun</option><option value="rejected">Yerel kapsamda uygun değil</option></select></Field><Field label="Sicil inceleme gerekçesi"><textarea name="reason" aria-label="Sicil inceleme gerekçesi" minLength={3} maxLength={2000} required/></Field><Button type="submit" disabled={busy}>Yerel incelemeyi kaydet</Button></form>}
 </article>;})}
 {!records.length&&<p>Bu arama ve inceleme kapsamında kayıt bulunmuyor.</p>}
 </div></Card>
 {data.memberships.some(m=>m.roles.includes('admin'))&&<RegistryForm memberships={data.memberships} busy={busy} onSubmit={p=>command('registry-draft',p)}/>}
 </>;
}
