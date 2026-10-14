import React,{useState,useEffect,useRef} from 'react';
import {Card,CardHead,Button,Field,Notice,Pill} from './ui.jsx';
import {alternativeMethods} from '../../auth/myys/alternative-evidence-model.mjs';
const status=e=>e.source!=='alternative-local'?'Sunulmuş kanıt':e.moderation?.outcome==='accepted'?'Yerel inceleme kabul edildi':e.moderation?.outcome==='rejected'?'Yerel incelemede uygun bulunmadı':'Bağımsız inceleme bekliyor';
export function EvidenceWorkspace({data,busy,command}){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[revision,setRevision]=useState(null);
 const eligible=data.enrollments.filter(e=>e.owner!==data.personId&&data.memberships.some(m=>m.unit===e.unit&&m.roles.includes('instructor')));
 const rows=data.evidence.filter(e=>(filter==='all'||filter==='ready'&&e.canAssess||filter==='pending'&&e.source==='alternative-local'&&!e.moderation||filter==='rejected'&&e.moderation?.outcome==='rejected')&&[e.owner,e.taskId,e.content,alternativeMethods[e.alternative?.method],status(e)].join(' ').toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')));
 return <><Card><CardHead title="Öğrenme kanıtları" sub="Çalışma, yöntem ve insan incelemesi aynı kayıt zincirinde."/><div className="academic-body form-stack">
 <Field label="Kanıtlarda ara"><input aria-label="Kanıtlarda ara" value={search} onChange={e=>setSearch(e.target.value)}/></Field>
 <Field label="Kanıt inceleme durumu"><select aria-label="Kanıt inceleme durumu" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tüm kanıtlar</option><option value="ready">Rubrikte kullanılabilir</option><option value="pending">İnceleme bekleyen</option><option value="rejected">Uygun bulunmayan</option></select></Field>
 {!rows.length&&<p>Bu kapsamda kanıt bulunmuyor.</p>}
 {rows.map(e=><article className="academic-record" key={e.id}><h3>{e.taskId} · {e.alternative?alternativeMethods[e.alternative.method]:'Öğrenme ürünü'}{e.alternative?' · Sürüm '+e.alternative.version:''}</h3><p>Öğrenen: {e.owner}</p><p>{data.programs.find(p=>p.id===e.programId)?.title}</p><small>Kayıt: {e.id}</small><Pill tone={e.canAssess?'green':'amber'}>{status(e)}</Pill><p>{e.content}</p><p>Kanıt özeti: <code>{e.sha256}</code></p>
 {e.sourceProofDigest&&<p>İmzalı kaynak teslimi: {e.sourceSubmissionId} · Sürüm {e.sourceSubmissionVersion}. İmza ve sürüm bağı karar dayanağında korunur. {e.canAssess?'Bu sürüm rubrikte kullanılabilir.':'Güncel kaynak uygunluğu yok; geçmiş değerlendirme korunur.'}</p>}
 {e.alternative&&<><p>Gözlem: {new Date(e.alternative.observedAt).toLocaleString('tr-TR')}</p><p>Yöntem dayanağı: {e.alternative.methodReference}</p><p>Kanıt dayanağı: {e.alternative.sourceReference}</p><p>Gerekçe: {e.alternative.reason}</p>{e.alternative.previousEvidenceId&&<p>Önceki sürüm: {e.alternative.previousEvidenceId} · {e.alternative.changeReason}</p>}
 {e.moderation&&<div><p>İnceleyen: {e.moderation.createdBy}</p><p>İnceleme gerekçesi: {e.moderation.reason}</p><p>İnceleme dayanağı: {e.moderation.verificationReference}</p></div>}
 <p>{e.canAssess?'Yeni rubrik değerlendirmesinde kullanılabilir; başarı kararı değildir.':'Bu sürüm yeni rubrik değerlendirmesinde kullanılamaz.'}</p>
 {e.canModerate&&<ModerationForm evidence={e} busy={busy} command={command}/>}
 {e.canRevise&&<Button disabled={busy} onClick={()=>setRevision(e)}>Alternatif kanıtın yeni sürümünü hazırla</Button>}
 </>}
 </article>)}
 </div></Card>
 {eligible.length>0&&<AlternativeForm key={revision?.id||'new'} data={data} enrollments={eligible} revision={revision} busy={busy} command={command} onDone={()=>setRevision(null)}/>}
 </>;
}
function ModerationForm({evidence,busy,command}){return <form className="form-stack" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);command('evidence-moderate',{evidenceId:evidence.id,basedOn:evidence.evidenceDigest,outcome:f.get('outcome'),reason:f.get('reason'),verificationReference:f.get('reference')});}}>
 <Field label="Alternatif kanıt inceleme sonucu"><select aria-label="Alternatif kanıt inceleme sonucu" name="outcome" required defaultValue=""><option value="">Seçin</option><option value="accepted">Rubrikte kullanılmasını uygun buldum</option><option value="rejected">Uygun bulmadım</option></select></Field>
 <Field label="Alternatif kanıt inceleme gerekçesi"><textarea aria-label="Alternatif kanıt inceleme gerekçesi" name="reason" required minLength={20} maxLength={2000}/></Field>
 <Field label="Kanıtı nasıl kontrol ettiniz?"><textarea aria-label="Kanıtı nasıl kontrol ettiniz?" name="reference" required minLength={12} maxLength={2000}/></Field>
 <Button type="submit" disabled={busy}>Alternatif kanıt incelemesini kaydet</Button>
 </form>;}
function AlternativeForm({data,enrollments,revision,busy,command,onDone}){
 const [selected,setSelected]=useState(revision?.enrollmentId||''),[task,setTask]=useState(revision?.taskId||'');
 const formRef=useRef(null);useEffect(()=>{if(revision)formRef.current?.querySelector('select:not(:disabled)')?.focus();},[revision]);
 const enrollment=enrollments.find(e=>e.id===selected),program=data.programs.find(p=>p.id===enrollment?.programId);
 async function submit(e){e.preventDefault();const form=e.currentTarget,f=new FormData(form),result=await command('alternative-evidence',{enrollmentId:selected,taskId:task,method:f.get('method'),observedAt:new Date(f.get('time')+'Z').toISOString(),content:f.get('content'),sourceReference:f.get('source'),methodReference:f.get('methodReference'),reason:f.get('reason'),localOnly:true,...(revision?{previousEvidenceId:revision.id,changeReason:f.get('changeReason')}:{})});if(result){form.reset();setSelected('');setTask('');onDone();}}
 return <Card><CardHead title={revision?'Alternatif kanıt · Yeni sürüm':'Alternatif ölçme kanıtı kaydet'} sub="Eğitici kaydı ve ayrı kalite incelemesi gerekir."/><form ref={formRef} className="academic-body form-stack" onSubmit={submit}>
 <Notice>İzole yerel kabul kaydıdır. Dosya veya dış hizmet doğrulaması yapılmaz. Yeni sürüm, önceki değerlendirmeyi ve akademik kararı değiştirmez; karar değişikliği itiraz zincirinden izlenir.</Notice>
 {revision&&<><p>Önceki kanıt sürümü: {revision.alternative.version}</p><Button type="button" disabled={busy} onClick={onDone}>Yeni sürüm hazırlığını kapat</Button></>}
 <Field label="Alternatif ölçmenin öğrenen kaydı"><select aria-label="Alternatif ölçmenin öğrenen kaydı" required disabled={!!revision} value={selected} onChange={e=>{setSelected(e.target.value);setTask('');}}><option value="">Seçin</option>{enrollments.map(e=><option key={e.id} value={e.id}>{e.owner} · {data.programs.find(p=>p.id===e.programId)?.title}</option>)}</select></Field>
 <Field label="Alternatif ölçmenin görevi"><select aria-label="Alternatif ölçmenin görevi" required disabled={!!revision} value={task} onChange={e=>setTask(e.target.value)}><option value="">Seçin</option>{program?.tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
 <Field label="Alternatif ölçme biçimi"><select aria-label="Alternatif ölçme biçimi" name="method" required defaultValue={revision?.alternative.method||''}><option value="">Seçin</option>{Object.entries(alternativeMethods).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field>
 <Field label="Gözlem zamanı (UTC)"><input aria-label="Gözlem zamanı (UTC)" name="time" type="datetime-local" required defaultValue={revision?.alternative.observedAt.slice(0,16)||''}/></Field>
 <Field label="Gözlem veya ürün içeriği"><textarea aria-label="Gözlem veya ürün içeriği" name="content" required minLength={20} maxLength={20000} rows={6} defaultValue={revision?.content||''}/></Field>
 <Field label="Kanıtın dayanağı"><textarea aria-label="Kanıtın dayanağı" name="source" required minLength={12} maxLength={2000} defaultValue={revision?.alternative.sourceReference||''}/></Field>
 <Field label="Yöntemin dayanağı"><textarea aria-label="Yöntemin dayanağı" name="methodReference" required minLength={12} maxLength={2000} defaultValue={revision?.alternative.methodReference||''}/></Field>
 <Field label="Alternatif ölçme gerekçesi"><textarea aria-label="Alternatif ölçme gerekçesi" name="reason" required minLength={20} maxLength={2000}/></Field>
 {revision&&<Field label="Alternatif kanıt değişiklik gerekçesi"><textarea aria-label="Alternatif kanıt değişiklik gerekçesi" name="changeReason" required minLength={20} maxLength={2000}/></Field>}
 <Button type="submit" disabled={busy||!selected||!task}>Alternatif kanıtı incelemeye gönder</Button>
 </form></Card>;
}
