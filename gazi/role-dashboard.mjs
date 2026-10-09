export function workspaceMetrics(state, applications, credentials, systemCount) {
  const approved=applications.filter(a=>a.status==='approved');
  const valid=credentials.filter(c=>c.status==='valid');
  const pendingTransfers=approved.filter(a=>!state.transfers.some(t=>t.applicationId===a.id));
  const openQuality=state.qualityTasks.filter(t=>t.status==='open');
  const prepared=Object.keys(state.integrationChecks).length;
  const metrics={
    learner:[[applications.length,'Başvurum'],[valid.length,'Geçerli örnek belgem'],[valid.reduce((n,c)=>n+c.ects,0),'Cüzdanımdaki AKTS'],[state.enrollments.length,'Planımdaki program']],
    instructor:[[state.programs.length,'Örnek program'],[state.programs.reduce((n,p)=>n+p.outcomes.length,0),'Tanımlı öğrenme çıktısı'],[state.programs.filter(p=>p.category==='Yeni program önerisi').length,'Yeni program önerisi'],[new Set(state.programs.map(p=>p.unit)).size,'Program öneren birim']],
    commission:[[applications.filter(a=>a.status==='commission').length,'Gündemdeki dosya'],[applications.reduce((n,a)=>n+a.votes.length,0),'Kayıtlı örnek oy'],[applications.filter(a=>a.decision).length,'Karara bağlanan dosya'],[applications.filter(a=>a.status==='revision').length,'Revizyon bekleyen']],
    studentAffairs:[[approved.length,'Onaylı kazanım'],[pendingTransfers.length,'Aktarım provası bekleyen'],[valid.length,'Geçerli örnek belge'],[state.transfers.length,'Tamamlanan aktarım provası']],
    quality:[[applications.filter(a=>a.evidence).length,'Kanıtı bulunan dosya'],[openQuality.length,'Açık iyileştirme görevi'],[state.appeals.filter(a=>a.status==='open').length,'İncelenecek itiraz'],[state.qualityTasks.filter(t=>t.status==='done').length,'Tamamlanan iyileştirme']],
    it:[[systemCount,'Planlanan bağlantı'],[prepared,'Hazırlığı incelenen'],[systemCount-prepared,'Kontrol bekleyen'],[0,'Canlı bağlantı']],
    finance:[[state.finance.filter(f=>f.state==='Bekliyor').length,'Mutabakat bekleyen'],[state.finance.filter(f=>f.state==='Mutabık').length,'Mutabık örnek kayıt'],[state.finance.reduce((n,f)=>n+f.amount,0).toLocaleString('tr-TR')+' ₺','Örnek kayıt toplamı'],[state.finance.length,'Mali kayıt']],
    admin:[[9,'Tanımlı demo rolü'],[state.policy.hoursPerEcts,'Pilot saat / AKTS'],[prepared,'İncelenen bağlantı hazırlığı'],[state.audit.length,'Yerel işlem kaydı']]
  };
  return metrics[state.role] || [];
}
