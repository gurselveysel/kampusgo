import React from 'react';
import {Button,Card,CardHead,Field,Notice,Pill} from './ui.jsx';

export function AppealsWorkspace({data,busy,command}){
 const appeals=data.appeals||[];
 return <div className="form-stack"><Notice>Açık itiraz belge uygunluğunu durdurur. İnceleme notu değiştirmez; yeniden değerlendirme yeni kanıt incelemesi ve bağımsız eğitici gerektirir. İlk karar ve gerekçeler korunur.</Notice>
 <Card><CardHead title="İtiraz incelemeleri" sub="Yalnız size ait veya kurum ve biriminizde inceleme yetkiniz bulunan kayıtlar."/><div className="academic-body">{!appeals.length&&<p>Henüz itiraz kaydı yok.</p>}{appeals.map(appeal=>{
  const decision=data.decisions.find(x=>x.id===appeal.decisionId),assessment=data.assessments.find(x=>x.id===decision?.assessmentId),resolution=appeal.resolution;
  const reassessment=resolution&&data.assessments.find(x=>x.resolutionId===resolution.id&&x.supersedesAssessmentId===assessment?.id);
  const nextDecision=reassessment&&data.decisions.find(x=>x.assessmentId===reassessment.id);
  const status=!resolution?'İnceleme bekliyor':resolution.outcome==='upheld'?'İlk karar korundu':nextDecision?'Yeniden değerlendirme kararı kaydedildi':reassessment?'Yeniden değerlendirildi · Karar bekleniyor':'Yeniden değerlendirme gerekli';
  return <article className="academic-record" key={appeal.id}><h3>{data.programs.find(x=>x.id===decision?.programId)?.title||'Akademik karar incelemesi'}</h3><Pill tone={resolution?.outcome==='upheld'||nextDecision?'neutral':'amber'}>{status}</Pill>
   <ol><li><strong>İlk değerlendirme ve karar</strong><p>{assessment?.score??'—'}/100 · {decision?.outcome==='approved'?'Pilot akademik onay':'Uygun bulunmadı'}</p><p>{decision?.reason}</p></li><li><strong>Öğrenenin itiraz gerekçesi</strong><p>{appeal.reason}</p></li>{resolution&&<li><strong>Bağımsız inceleme sonucu</strong><p>{resolution.reason}</p><p>{resolution.outcome==='reassessment'?(nextDecision?'Yeni karar aşağıdaki bağlı kayıtla birlikte izlenir. Önceki karar ve gerekçeler korunur.':'Yeni değerlendirme ve yetkili akademik karar tamamlanmadan belgeye ilerlenemez.'):'İlk kararın korunması tek başına belge düzenlemez; diğer kanıt ve yetki kontrolleri sürer.'}</p></li>}</ol>
   {reassessment&&<div className="appeal-followup"><h4>Bağlı yeniden değerlendirme</h4><p>{reassessment.score}/100 · {reassessment.passed?'Başarı eşiği sağlandı':'Başarı eşiği sağlanmadı'}</p><p>{reassessment.reason}</p><small>Değerlendirme kaydı: {reassessment.id}</small>{nextDecision?<><h4>Yeni akademik karar</h4><p>{nextDecision.outcome==='approved'?'Pilot akademik onay':'Uygun bulunmadı'}</p><p>{nextDecision.reason}</p><p>{nextDecision.usable?'Belge hazırlığı ayrıca yetkili işlem ve uygunluk kontrolü gerektirir.':'Bu karar belge hazırlığına açık değil.'}</p></>:<p>Yetkili akademik karar bekleniyor. Puan tek başına belge düzenleme hakkı vermez.</p>}</div>}
   <small>İtiraz kaydı: {appeal.id} · İlk karar: {appeal.decisionId}</small>
   {appeal.allowedActions?.includes('resolve')&&<form className="form-stack" onSubmit={event=>{event.preventDefault();const f=new FormData(event.currentTarget);command('resolve',{appealId:appeal.id,outcome:f.get('outcome'),reason:f.get('reason')});}}><Field label="İnceleme sonucu"><select aria-label="İnceleme sonucu" name="outcome" required defaultValue=""><option value="" disabled>Sonuç seçin</option><option value="upheld">İlk kararı koru</option><option value="reassessment">Bağımsız yeniden değerlendirmeye gönder</option></select></Field><Field label="Bağımsız inceleme gerekçesi"><textarea aria-label="Bağımsız inceleme gerekçesi" name="reason" required minLength={20} maxLength={6000} rows={4}/></Field><Button type="submit" disabled={busy}>İnceleme sonucunu kaydet</Button></form>}
  </article>;
 })}</div></Card></div>;
}
