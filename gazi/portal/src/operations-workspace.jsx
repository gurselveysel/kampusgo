import {SourceProgressWorkspace} from './source-progress-workspace.jsx';
import {ObsWorkspace} from './obs-workspace.jsx';
import React,{useState,useRef} from 'react';
import {Card,CardHead,Button,Field,Notice,Pill} from './ui.jsx';
import {transferCsv} from '../../auth/myys/transfer-csv.mjs';

const states={accepted:'Kabul edildi · İşlenmedi',processing:'İşleniyor','retry-wait':'Yeniden deneme bekliyor',quarantined:'Karantinada',processed:'İşlendi',stale:'Eski sürüm · Kullanılmadı',prepared:'Belge hazırlığı kaydedildi',rejected:'Satır reddedildi'};
const errors={lms_registration:'Kaynak ders kaydı etkin değil veya kayıt sürümü değişti.',source_trust:'Kaynak sözleşmesi veya anahtarı kullanıma kapalı.',invalid_row:'Satır eksik veya sütun sayısı hatalı.',not_found:'Karar bulunamadı veya bu birimden erişilemiyor.',duplicate_learner:'Bu kişi ve program aynı listede tekrar ediyor.',duplicate:'Bu kayıt için belge hazırlığı zaten var.',decision_blocked:'Karar güncel değil veya açık itiraz var.',separation:'Görevler ayrılığı sağlanmıyor.',issuer_pathway:'Bu belge yolu yerel hazırlığa kapalı.',temporary_failure:'Geçici işleme sorunu.',attempt_limit:'Deneme sınırına ulaşıldı.',lms_identity:'Öğrenen üyeliği yeniden doğrulanmalı.',lms_scope:'Kaynak sözleşmesi ve olay kapsamı uyuşmuyor.',processing_failed:'İşleme hatası inceleme gerektiriyor.',idempotency_conflict:'Aynı olay kimliği farklı içerikle geldi.',lms_revision_conflict:'Aynı kaynak sürümü başka olayla kayıtlı.'};
const status=value=>states[value]||'İnceleme gerekli';
const issue=code=>errors[code]||'Satırın yetki ve kaynak bilgilerini inceleyin.';
function download(name,rows){const url=URL.createObjectURL(new Blob([transferCsv(rows)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function OperationsWorkspace({data,busy,command,sourceAction,sourceTrust}){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all');
 const queue=(data.queue||[]).filter(e=>(filter==='all'||e.state===filter)&&[e.contractId,e.id,status(e.state)].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
 return <div className="operations-workspace"><SourceProgressWorkspace rows={data.lmsProgress||[]}/><ObsWorkspace data={data} busy={busy} command={command}/>
 {!!data.sourceContracts?.length&&<SourcePacketForm contracts={data.sourceContracts} busy={busy} sourceAction={sourceAction} sourceTrust={sourceTrust}/>}
 <Notice>Kabul edilen olay henüz işlenmiş sayılmaz. İşlenmiş kaynak verisi de insan değerlendirmesi ve akademik karar yerine geçmez.</Notice>
 <Card><CardHead title="Olay kuyruğu ve karantina" sub="Yetkili olduğunuz birimlerdeki işleme durumları. Öğrenme kanıtının içeriği bu ekranda gösterilmez."/>
 <div className="academic-body form-stack"><Field label="Olay ara"><input aria-label="Olay ara" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Kaynak veya olay kimliği"/></Field>
 <Field label="İşleme durumu"><select aria-label="İşleme durumu" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tüm durumlar</option>{['accepted','processing','retry-wait','quarantined','processed','stale'].map(s=><option key={s} value={s}>{status(s)}</option>)}</select></Field>
 <p role="status">{queue.length} olay gösteriliyor.</p>
 {queue.map(e=><article key={e.id} className="academic-record"><strong>{data.sourceContracts?.find(c=>c.id===e.contractId)?.name||e.contractId} · Kaynak sürümü {e.revision}</strong><Pill tone={e.state==='processed'?'green':'amber'}>{status(e.state)}</Pill><small>Olay: {e.id}</small><p>İşleme denemesi: {e.attempt}</p>
 <p>Olay türü: {{registration:'Ders kaydı',grade:'Görev notu',completion:'Tamamlama bildirimi','license-revoked':'Kaynak lisansı iptali'}[e.type]||'Kaynak bildirimi'}</p>
 {e.sourceSigned&&<p>İmzalı kaynak dosyası · Teslim sürümü {e.sourceSubmissionVersion}. {e.type==='grade'?'Program, rubrik ve görev':'Program ve rubrik'} bağı saklandı.</p>}
 {e.sourceSigned&&!e.sourceTrusted&&<p>Kaynak güveni doğrulanmadı veya kapatıldı. Bu olay işlenemez; güven sicilini inceleyin.</p>}
 {e.sourceSigned&&e.sourceTrusted&&data.sourceContracts?.some(c=>c.id===e.contractId)&&(['accepted'].includes(e.state)||e.leaseExpired||e.state==='retry-wait'&&e.nextAttemptAt<=new Date().toISOString())&&<Button disabled={busy} onClick={()=>sourceAction('kaynak-isle',{contractId:e.contractId,eventId:e.id})}>Kaynak olayını işle</Button>}
 {e.nextAttemptAt&&<p>Sonraki deneme: {new Date(e.nextAttemptAt).toLocaleString('tr-TR')}</p>}{e.leaseExpired&&<p>Önceki işçinin süresi doldu; sıradaki işçi kaydı yeniden alabilir.</p>}{e.errorCode&&<p>{issue(e.errorCode)}</p>}
 <details><summary>İşlem geçmişi</summary><ol>{e.history.map((h,i)=><li key={i}>{status(h.state)} · {new Date(h.at).toLocaleString('tr-TR')}{h.errorCode?' · '+issue(h.errorCode):''}</li>)}</ol></details>
 {e.review&&<p>İnceleme kaydı: {e.review.reason}</p>}
 {e.allowedActions?.includes('lms-quarantine-review')&&<form className="form-stack" onSubmit={event=>{event.preventDefault();command('lms-quarantine-review',{eventId:e.id,expectedStateId:e.stateId,reason:new FormData(event.currentTarget).get('reason')});}}><Field label="Karantina inceleme gerekçesi"><textarea aria-label={'Karantina inceleme gerekçesi '+e.id} name="reason" required minLength={20} maxLength={2000}/></Field><p>Kaynak düzeltmesi yeni olay sürümüyle gelmelidir. Bu işlem olayı körlemesine yeniden çalıştırmaz.</p><Button type="submit" disabled={busy}>İncelemeyi kaydet</Button></form>}
 </article>)}
 {!queue.length&&<p>Bu filtre ve erişim kapsamında olay bulunmuyor.</p>}</div></Card>
 <Card><CardHead title="Toplu belge hazırlığı ve mutabakat" sub="Her satır sunucuda ayrı kaydedilir. Hazırlık, imza ve teslim farklı aşamalardır."/><div className="academic-body">
 {(data.batches||[]).map(b=><article key={b.id} className="academic-record"><strong>{b.title}</strong><p>{b.counts.submitted} gönderilen · {b.counts.accepted} kabul edilen · {b.counts.processed} işlenen · {b.counts.rejected} reddedilen</p><p>{b.counts.prepared} hazırlık · {b.counts.signed} imzalı · {b.counts.delivered} teslim</p>
 <Button disabled={busy} onClick={()=>download('MYYS_Mutabakat.csv',[['Satır','Açıklama','Karar kimliği','Durum','Hata','Belge hazırlığı','İmzalandı','Teslim edildi'],...b.rows.map(r=>[r.row,r.label,r.decisionId,status(r.status),r.code?issue(r.code):'',r.issuanceId,r.signed?'Evet':'Hayır','Hayır'])])}>Mutabakatı CSV indir</Button>
 <ol className="batch-rows">{b.rows.map(r=><li key={r.row} className="academic-record"><strong>Satır {r.row} · {r.label||'Açıklama yok'}</strong><Pill tone={r.status==='prepared'?'green':'amber'}>{status(r.status)}</Pill>{r.decisionId&&<small>Karar: {r.decisionId}</small>}{r.code&&<p>{issue(r.code)}</p>}{r.issuanceId&&<small>Belge hazırlığı: {r.issuanceId}</small>}{!r.processed&&<Button disabled={busy} onClick={()=>command('batch-process',{batchId:b.id,row:r.row})}>Satır {r.row} sonucunu kaydet</Button>}</li>)}</ol></article>)}
 {!data.batches?.length&&<p>Yetkili olduğunuz birimde kaydedilmiş toplu işlem bulunmuyor.</p>}
 </div></Card>
 {!!data.batchUnits?.length&&<BatchForm data={data} busy={busy} command={command}/>}
 </div>;
}
function SourcePacketForm({contracts,busy,sourceAction,sourceTrust}){
 const [contractId,setContractId]=useState(contracts[0].id),[file,setFile]=useState(null),[error,setError]=useState('');
 const fileInput=useRef(null);
 async function submit(e){
  e.preventDefault();setError('');const form=e.currentTarget;
  try{
   if(!file||file.size>64000)throw Error('En fazla 64 KB boyutunda bir kaynak dosyası seçin.');
   let value;try{value=JSON.parse(await file.text());}catch{throw Error('Kaynak dosyası geçerli JSON biçiminde olmalı.');}
   if(!value||value.format!=='myys-source-upload/1'||typeof value.token!=='string'||Object.keys(value).some(k=>!['format','token'].includes(k)))throw Error('Bu dosya desteklenen imzalı kaynak paketi değil.');
   const result=await sourceAction('kaynak-al',{contractId,token:value.token});if(result){form.reset();setFile(null);}
  }catch(e){setError(e.message);}
 }
 return <Card><CardHead title="İmzalı kaynak dosyası al" sub="Dosya doğrulandıktan sonra mevcut olay kuyruğuna kabul edilir."/>
 <form className="academic-body form-stack source-packet-form" onSubmit={submit}>
 <Notice>Yalnız izole yerel kabul. Gerçek LMS hizmeti bağlı değildir. Kaynak imzası başarı veya belge kararı vermez; işlenen kanıtı eğitici rubrikle inceler.</Notice>
 <Field label="İmzalı dosyanın kaynak sözleşmesi"><select aria-label="İmzalı dosyanın kaynak sözleşmesi" value={contractId} onChange={e=>setContractId(e.target.value)}>{contracts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
 {!contracts.find(c=>c.id===contractId)?.canAccept&&<p role="status">Bu kaynak şu anda alıma kapalı. Kaynak güven sicilindeki güncel sürüm, tarih ve ayrı inceleme gereklidir.</p>}
 <input ref={fileInput} className="sr-only" tabIndex={-1} aria-label="İmzalı kaynak dosyası" type="file" accept=".json,application/json" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');}}/>
 <Button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}>İmzalı dosya seç</Button>
 <p role="status">{file?'Seçilen dosya: '+file.name:'Henüz dosya seçilmedi.'}</p>
 <p>Özel anahtar yüklemeyin. Yalnız kaynak tarafından imzalanmış, tek öğrenene ait aktarım dosyası kullanın.</p>
 {error&&<p role="alert">{error}</p>}
 <Button type="submit" disabled={busy||!file||!contracts.find(c=>c.id===contractId)?.canAccept}>İmzayı doğrula ve kuyruğa al</Button>
 <Button type="button" disabled={busy||!contracts.find(c=>c.id===contractId)?.canExportTrust} onClick={()=>sourceTrust(contractId)}>Kaynak açık güven kaydını indir</Button>
 </form></Card>;
}
function BatchForm({data,busy,command}){
 const [unit,setUnit]=useState(data.batchUnits[0]),[mode,setMode]=useState('select');
 const decisions=data.decisions.filter(d=>d.unit===unit);
 return <Card><CardHead title="Toplu hazırlık listesi oluştur" sub="En fazla 100 satır. Karar ve güncel yetki her satır işlenirken yeniden kontrol edilir."/>
 <form className="academic-body form-stack" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);command('batch-create',{unit,title:f.get('title'),...(mode==='csv'?{csv:f.get('csv')}:{rows:f.getAll('decision').map(decisionId=>({decisionId,label:data.programs.find(p=>p.id===decisions.find(d=>d.id===decisionId)?.programId)?.title||''}))})});}}>
 <Field label="Toplu işlem adı"><input aria-label="Toplu işlem adı" name="title" minLength={3} maxLength={200} required/></Field>
 <Field label="İşlem birimi"><select aria-label="İşlem birimi" value={unit} onChange={e=>setUnit(e.target.value)}>{data.batchUnits.map(u=><option key={u}>{u}</option>)}</select></Field>
 <Field label="Liste kaynağı"><select aria-label="Liste kaynağı" value={mode} onChange={e=>setMode(e.target.value)}><option value="select">Mevcut akademik kararlar</option><option value="csv">CSV metni</option></select></Field>
 {mode==='select'?<fieldset key={unit}><legend>Akademik kararları seçin</legend>{decisions.map(d=><label key={d.id} className="batch-choice"><input type="checkbox" name="decision" value={d.id}/>{d.owner} · {data.programs.find(p=>p.id===d.programId)?.title} · {d.usable?'Belge hazırlığına uygun':'İnceleme gerekli'}</label>)}{!decisions.length&&<p>Bu birimde karar bulunmuyor.</p>}</fieldset>:<><Button type="button" onClick={()=>download('MYYS_Toplu_Hazirlik_Sablonu.csv',[['Karar kimliği','Satır açıklaması'],['','']])}>CSV şablonunu indir</Button><Field label="CSV satırları"><textarea aria-label="CSV satırları" name="csv" required maxLength={50000} rows={7} placeholder={'Karar kimliği,Satır açıklaması\n'}/></Field></>}
 <Button type="submit" disabled={busy}>Listeyi sunucuya kaydet</Button>
 </form></Card>;
}
