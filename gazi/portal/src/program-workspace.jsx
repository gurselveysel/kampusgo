import React,{useState} from 'react';
import {Card,CardHead,Field,Button,Notice,Pill} from './ui.jsx';
import {ProgramForm} from './academic-forms.jsx';
import {outcomeIds,criterionTasks,comparePrograms} from '../../auth/myys/program-model.mjs';

const human=(key,value)=>{
 if(value===null)return 'Belirtilmemiş';
 if(key==='outcomes')return value.map(o=>o.id+' · '+o.text).join('\n');
 if(key==='tasks')return value.map(t=>t.id+' · '+t.title+' · Öğrenme Çıktıları: '+outcomeIds(t).join(', ')).join('\n');
 if(key==='rubric')return value.map(r=>r.id+' · '+(r.title||'Rubrik ölçütü')+' · %'+r.weight+' · Öğrenme Çıktıları: '+outcomeIds(r).join(', ')+' · Görevler: '+(r.taskIds?.join(', ')||'Çıktı ilişkisine göre')).join('\n');
 if(key==='responsibilities')return [['programOwner','Program sahibi'],['decisionAuthority','Akademik karar sahibi'],['legalIssuer','Hukuki düzenleyici'],['technicalSigner','Teknik imzalayan']].map(([k,label])=>label+': '+(value[k]||'Belirtilmemiş')).join('\n');
 if(key==='pathway')return value==='micro'?'Mikro yeterlilik pilotu':'Merkezi SEM süreci';
 return String(value);
};
export function ProgramWorkspace({data,busy,command,downloadPackage}){
 const [writing,setWriting]=useState(false),[query,setQuery]=useState(''),[source,setSource]=useState(null),[left,setLeft]=useState(''),[right,setRight]=useState('');
 const allowed=(p,roles)=>data.memberships.some(m=>m.unit===p.unit&&m.roles.some(r=>roles.includes(r)));
 const canWrite=data.memberships.some(m=>m.roles.some(r=>['coordinator','instructor'].includes(r)));
 const programs=data.programs,visible=programs.filter(p=>(p.title+' '+p.code+' '+p.unit).toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
 const a=programs.find(p=>p.id===left),b=programs.find(p=>p.id===right),changes=a&&b?comparePrograms(a,b):[];
 return <>
 <Card><CardHead title="Program sürümleri" sub="Aynı programın eski kayıtları ve değerlendirme dayanakları korunur."/><div className="academic-body form-stack">
 <Field label="Programlarda ara"><input type="search" aria-label="Programlarda ara" value={query} onChange={e=>setQuery(e.target.value)}/></Field>
 {!visible.length&&<p>Aramanıza uygun program sürümü bulunamadı.</p>}
 {visible.map(p=><article className="academic-record" key={p.id}><h3>{p.title}</h3><Pill>Sürüm {p.version}</Pill><p>{p.code} · {p.unit} · {p.hours} saat · {p.ects} AKTS</p><p>{p.changeReason}</p>
 {p.packageStatus&&<div className="form-stack program-package-status"><Pill tone={p.packageStatus.state==='local-ready'?'green':'amber'}>{p.packageStatus.state==='central-path'?'Merkezi SEM bilgi paketi ayrı incelenir':p.packageStatus.state==='local-ready'?'Yerel bilgi paketi bağları güncel':'Bilgi paketinin dayanakları eksik veya güncel değil'}</Pill><details><summary>Bilgi paketi dayanaklarını göster</summary><ul>{p.packageStatus.checks.map(c=><li key={c.key}>{c.label}: {c.ready?'Yerel sürüme bağlı':'İnceleme veya güncel kayıt gerekli'}</li>)}</ul><p>Kontrol: {new Date(p.packageStatus.asOf).toLocaleString('tr-TR')}</p><p>İçerik lisansı beyanı, gerçek kullanım hakkı veya kurumun akademik onayı yerine geçmez. Program incelemesi tek başına belge yetkisi oluşturmaz.</p></details>{p.packageStatus.canDownload&&<Button disabled={busy} onClick={()=>downloadPackage(p.id)}>Yerel bilgi paketini indir</Button>}{allowed(p,['commission'])&&(!data.supportedTabs||data.supportedTabs.includes('credentialProfiles'))&&<a href="#/academic/credentialProfiles">Belge profili incelemesini aç</a>}{p.packageStatus.state==='central-path'&&(!data.supportedTabs||data.supportedTabs.includes('sem'))&&<a href="#/academic/sem">SEM hazırlık dosyalarını aç</a>}</div>}
 <details><summary>Öğrenme Çıktıları, görev ve rubrik ilişkileri</summary><ul>{p.outcomes.map(o=><li key={o.id}>{o.id} · {o.text}</li>)}</ul><ul>{p.tasks.map(t=><li key={t.id}>{t.id} · {t.title} → {outcomeIds(t).join(', ')}</li>)}</ul><ul>{p.rubric.map(r=><li key={r.id}>{r.id} · {r.title||'Rubrik ölçütü'} · %{r.weight} → {outcomeIds(r).join(', ')} · Görev: {criterionTasks(r,p.tasks).join(', ')}</li>)}</ul></details>
 {allowed(p,['coordinator','instructor'])&&!programs.some(x=>x.unit===p.unit&&x.code===p.code&&x.version>p.version)&&<Button disabled={busy} onClick={()=>{setSource(p);setWriting(true);}}>Bu sürümden yeni sürüm hazırla</Button>}
 {allowed(p,['commission'])&&p.createdBy!==data.personId&&!data.publications.some(x=>x.programId===p.id)&&<form className="form-stack" onSubmit={e=>{e.preventDefault();command('publish',{programId:p.id,reason:new FormData(e.currentTarget).get('reason')});}}><Field label="Program inceleme gerekçesi"><textarea aria-label={'Program inceleme gerekçesi '+p.code+' '+p.version} name="reason" required minLength={20} maxLength={6000}/></Field><Button disabled={busy} type="submit">Pilot yayını onayla</Button></form>}
 </article>)}
 <h3>Sürüm karşılaştırması</h3><Field label="İlk sürüm"><select aria-label="İlk sürüm" value={left} onChange={e=>{setLeft(e.target.value);setRight('');}}><option value="">Seçin</option>{programs.map(p=><option value={p.id} key={p.id}>{p.code} · Sürüm {p.version}</option>)}</select></Field><Field label="Karşılaştırılacak sürüm"><select aria-label="Karşılaştırılacak sürüm" value={right} onChange={e=>setRight(e.target.value)}><option value="">Seçin</option>{programs.filter(p=>p.code===a?.code&&p.unit===a?.unit&&p.id!==left).map(p=><option key={p.id} value={p.id}>{p.code} · Sürüm {p.version}</option>)}</select></Field>
 {a&&b&&<div role="region" aria-label="Sürüm farkları"><Notice>Mevcut öğrenen kayıtları önceki sürümde kalır; bu karşılaştırma kayıtları taşımaz ve kararları değiştirmez.</Notice>{changes.length?changes.map(c=><details key={c.key}><summary>{c.label} değişti</summary><p>Önceki içerik</p><pre className="program-diff">{human(c.key,c.before)}</pre><p>Seçilen içerik</p><pre className="program-diff">{human(c.key,c.after)}</pre></details>):<p>Akademik içerik alanlarında fark yok.</p>}</div>}
 </div></Card>
 {canWrite&&<><Button disabled={busy} onClick={()=>{setSource(null);setWriting(true);}}>Yeni program oluştur</Button>{writing&&<ProgramForm key={source?.id||'new'} source={source} memberships={data.memberships} busy={busy} onSubmit={async p=>{const created=await command('program',p);if(created){setSource(null);setWriting(false);}}}/>}</>}
 </>;
}
