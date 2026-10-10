import React from 'react';
import {Button,Card,CardHead,Field,Notice,Pill} from './ui.jsx';

export function AppealsWorkspace({data,busy,command}){
 const appeals=data.appeals||[];
 return <div className="form-stack"><Notice>Açık itiraz belge uygunluğunu durdurur. İnceleme notu değiştirmez; yeniden değerlendirme yeni kanıt incelemesi ve bağımsız eğitici gerektirir. İlk karar ve gerekçeler korunur.</Notice>
 <Card><CardHead title="İtiraz incelemeleri" sub="Yalnız size ait veya kurum ve biriminizde inceleme yetkiniz bulunan kayıtlar."/><div className="academic-body">{!appeals.length&&<p>Henüz itiraz kaydı yok.</p>}{appeals.map(appeal=>{
  const decision=data.decisions.find(x=>x.id===appeal.decisionId),assessment=data.assessments.find(x=>x.id===decision?.assessmentId),resolution=appeal.resolution;
  return <article className="academic-record" key={appeal.id}><h3>{data.programs.find(x=>x.id===decision?.programId)?.title||'Akademik karar incelemesi'}</h3><Pill tone={resolution?.outcome==='upheld'?'green':'amber'}>{!resolution?'İnceleme bekliyor':resolution.outcome==='reassessment'?'Yeniden değerlendirme gerekli':'İlk karar korundu'}</Pill>
   <ol><li><strong>İlk değerlendirme ve karar</strong><p>{assessment?.score??'—'}/100 · {decision?.outcome==='approved'?'Pilot akademik onay':'Uygun bulunmadı'}</p><p>{decision?.reason}</p></li><li><strong>Öğrenenin itiraz gerekçesi</strong><p>{appeal.reason}</p></li>{resolution&&<li><strong>Bağımsız inceleme sonucu</strong><p>{resolution.reason}</p><p>{resolution.outcome==='reassessment'?'Yeni değerlendirme ve yetkili akademik karar tamamlanmadan belgeye ilerlenemez.':'İlk kararın korunması tek başına belge düzenlemez; diğer kanıt ve yetki kontrolleri sürer.'}</p></li>}</ol>
   <small>İtiraz kaydı: {appeal.id} · İlk karar: {appeal.decisionId}</small>
   {appeal.allowedActions?.includes('resolve')&&<form className="form-stack" onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);command('resolve',{appealId:appeal.id,outcome:f.get('outcome'),reason:f.get('reason')});}}><Field label="İnceleme sonucu"><select name="outcome" required defaultValue=""><option value="" disabled>Sonuç seçin</option><option value="upheld">İlk kararı koru</option><option value="reassessment">Bağımsız yeniden değerlendirmeye gönder</option></select></Field><Field label="Bağımsız inceleme gerekçesi"><textarea name="reason" required minLength={20} maxLength={6000} rows={4}/></Field><Button type="submit" disabled={busy}>İnceleme sonucunu kaydet</Button></form>}
  </article>;
 })}</div></Card></div>;
}
