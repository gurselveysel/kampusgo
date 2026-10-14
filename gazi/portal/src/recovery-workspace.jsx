import React,{useState} from 'react';
import {recoveryChecks,recoveryRunbook} from '../../auth/myys/recovery-model.mjs';
import {Card,CardHead,Button,Field,Notice,Pill} from './ui.jsx';
const seconds=n=>(n/1000).toLocaleString('tr-TR',{maximumFractionDigits:3});
export function RecoveryWorkspace({data,busy,command,run,download}){
 const [query,setQuery]=useState(''),view=data.recovery||{units:[],plans:[]};
 return <div className="form-stack"><Notice>Bu tatbikat ayrı bir geçici ortamda, sentetik kişi ve belgelerle çalışır. Kurum kayıtlarının yedeği alınmaz. Aşağıdaki hedefler yalnız bu prova içindir; üretim hizmet taahhüdü veya açılış onayı değildir.</Notice>
 {view.units.length>0&&<Card><CardHead title="Kurtarma tatbikatı planla" sub="Önce yerel hedefi kaydedin, sonra tatbikatı çalıştırın."/><form className="academic-body form-stack" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);const r=await command('recovery-plan',{unit:f.get('unit'),rpoSeconds:Number(f.get('rpoSeconds')),rtoSeconds:Number(f.get('rtoSeconds')),reason:f.get('reason'),syntheticOnly:true});if(r)form.reset();}}>
 <Field label="Tatbikat birimi"><select name="unit" aria-label="Tatbikat birimi" required>{view.units.map(u=><option key={u} value={u}>{u==='engineering'?'Mühendislik birimi':u}</option>)}</select></Field>
 <Field label="Yerel veri kaybı hedefi (saniye)"><input name="rpoSeconds" aria-label="Yerel veri kaybı hedefi (saniye)" type="number" min="0" max="3600" step="1" required defaultValue="0"/></Field>
 <Field label="Yerel geri dönüş hedefi (saniye)"><input name="rtoSeconds" aria-label="Yerel geri dönüş hedefi (saniye)" type="number" min="1" max="3600" step="1" required defaultValue="60"/></Field>
 <p>Senaryo, kesilen kuyruk işinin süresini sanal saatte 31 saniye ilerletir. Hedef karşılaştırmasına bu süre de eklenir.</p>
 <Field label="Tatbikat gerekçesi"><textarea name="reason" aria-label="Tatbikat gerekçesi" required minLength={20} maxLength={2000}/></Field><Button type="submit" disabled={busy}>Tatbikat planını kaydet</Button>
 </form></Card>}
 <Card><CardHead title="Tatbikatlar ve ayrı inceleme" sub="Başarılı sonuçlar tekrar çalıştırılmaz; yeni kapsam için yeni plan oluşturulur."/><div className="academic-body form-stack">
 <Field label="Tatbikatlarda ara"><input type="search" aria-label="Tatbikatlarda ara" value={query} onChange={e=>setQuery(e.target.value)}/></Field>
 {view.plans.filter(p=>(p.reason+' '+p.id).toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))).map((p,i)=><article key={p.id} className="academic-record"><h3>Tatbikat {i+1}</h3><p>{p.reason}</p><p>Yerel hedef: en fazla {p.rpoSeconds} saniye veri kaybı · {p.rtoSeconds} saniye geri dönüş</p>
 <Pill tone={p.result?.state==='passed'?'green':'amber'}>{p.running?'Tatbikat çalışıyor':p.result?.state==='passed'?'Yerel hedefler karşılandı':p.result?'Yerel hedefler karşılanmadı':'Çalıştırılmayı bekliyor'}</Pill>
 {p.canRun&&(data.recoveryAvailable?<Button disabled={busy} onClick={()=>run(p.id)}>{p.result?'Tatbikatı yeniden dene':'İzole tatbikatı çalıştır'}</Button>:<p>Bu ortamda izole tatbikat çalıştırıcısı bağlı değil.</p>)}
 {p.result?.report&&<><dl><dt>Yedek oluşturma</dt><dd>{seconds(p.result.report.backupMs)} saniye</dd><dt>Dosya geri yükleme</dt><dd>{seconds(p.result.report.restoreMs)} saniye</dd><dt>Ölçülen geri dönüş ve denetim süresi</dt><dd>{seconds(p.result.report.recoveryMs)} saniye</dd><dt>Sanal kuyruk beklemesi dahil yerel süre</dt><dd>{seconds(p.result.report.recoveryMs+p.result.report.syntheticLeaseAdvanceMs)} saniye</dd><dt>Kaybolan kayıt / geri açılan eski oturum</dt><dd>{p.result.report.lostRecords} / {p.result.report.restoredSessions}</dd></dl>
 <ul>{Object.entries(recoveryChecks).map(([id,label])=><li key={id}>{p.result.report.checks[id]?'Geçti':'Başarısız'}: {label}</li>)}</ul><p>Geri yüklenen sentetik akademik kayıt: {p.result.report.restoredRecords}. Güvenlik işlemleri sonrasındaki yedek esas alındı; bu senaryoda yedek sonrası yazı yok.</p></>}
 {p.result&&!p.result.report&&<p>Tatbikat ölçümü tamamlanamadı. Ham hata ayrıntıları sonuca eklenmedi; yeniden deneyin veya yeni plan hazırlayın.</p>}
 {p.result&&<Button disabled={busy} onClick={()=>download(p)}>Tatbikat sonucunu indir</Button>}
 {p.review&&<p>Bağımsız yerel inceleme: {p.review.outcome==='accepted'?'Uygun bulundu':'Düzeltme gerekli'} · {p.review.reason}</p>}
 {p.canReview&&<form className="form-stack" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);command('recovery-review',{planId:p.id,resultId:p.result.id,basedOn:p.result.digest,outcome:f.get('outcome'),reason:f.get('reason')});}}>
 <Field label="Tatbikat inceleme sonucu"><select name="outcome" aria-label="Tatbikat inceleme sonucu" defaultValue="correction"><option value="correction">Düzeltme gerekli</option>{p.result.state==='passed'&&<option value="accepted">Yerel inceleme uygun</option>}</select></Field>
 <Field label="Tatbikat inceleme gerekçesi"><textarea name="reason" aria-label="Tatbikat inceleme gerekçesi" required minLength={20} maxLength={2000}/></Field><Button type="submit" disabled={busy}>Tatbikat incelemesini kaydet</Button></form>}
 </article>)}{!view.plans.length&&<p>Bu yetki kapsamında tatbikat planı bulunmuyor.</p>}{!!view.plans.length&&!view.plans.some(p=>(p.reason+' '+p.id).toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')))&&<p>Aramanızla eşleşen tatbikat bulunamadı.</p>}
 </div></Card>
 <Card><CardHead title="Olay ve geri dönüş adımları" sub="Gerçek işletim için kurum sorumlusu, yedek yetkisi ve sözleşmeli hedefler ayrıca gerekli."/><div className="academic-body"><ol>{recoveryRunbook.map(s=><li key={s}>{s}</li>)}</ol></div></Card>
 </div>;
}
