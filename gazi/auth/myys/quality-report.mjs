// Uses only the caller's authorized projection. Never joins private tables or
// counts a browser draft as an institution record.
export function qualityReport(view,{programId='',unit=''}={}){
 const scoped=r=>(!unit||r.unit===unit)&&(!programId||r.programId===programId);
 const enrollments=(view.enrollments||[]).filter(scoped),enrollmentIds=new Set(enrollments.map(r=>r.id));
 const applications=(view.applications||[]).filter(scoped),assessments=(view.assessments||[]).filter(r=>scoped(r)&&enrollmentIds.has(r.enrollmentId)),decisions=(view.decisions||[]).filter(r=>scoped(r)&&enrollmentIds.has(r.enrollmentId));
 const latest=new Map();for(const d of decisions)latest.set(d.enrollmentId,d);
 const events=(view.lmsEvents||[]).filter(r=>scoped(r)&&enrollmentIds.has(r.enrollmentId)),streams=new Map();for(const e of events.filter(e=>e.type==='completion'))if(!streams.has(e.stream)||streams.get(e.stream).revision<e.revision)streams.set(e.stream,e);
 const latestEvents=[...streams.values()],receipts=new Map((view.lmsReceipts||[]).map(r=>[r.eventId,r]));
 const valid=e=>e.currentSource!==false&&typeof e.completed==='boolean'&&receipts.get(e.id)?.state==='processed'&&!events.some(r=>r.type==='license-revoked'&&r.contractId===e.contractId&&r.owner===e.owner);
 const completed=[],uncertain=[];for(const e of enrollments){const sources=latestEvents.filter(r=>r.enrollmentId===e.id);if(!sources.length||sources.some(r=>!valid(r))||new Set(sources.map(r=>r.completed)).size!==1)uncertain.push(e);else if(sources[0].completed)completed.push(e);}
 const issuances=(view.issuances||[]).filter(r=>scoped(r)&&r.signed&&!r.blocked),delivery=(view.credentialReceipts||[]).filter(r=>issuances.some(i=>i.id===r.issuanceId));
 // A support ticket has no program link: program-filtered support is explicitly unavailable.
 const support=programId?[]:(view.support||[]).filter(r=>!unit||r.unit===unit);
 const refs=(kind,rows)=>rows.map(r=>({kind,id:r.id}));
 const metric=(id,label,unitName,n,d,detail,{status='available',source=[]}={})=>({id,label,unit:unitName,numerator:n.length,denominator:d.length,percent:status==='unavailable'||!d.length?null:Math.round(n.length/d.length*10000)/100,numeratorRefs:n,denominatorRefs:d,sourceRefs:source,detail,status,sample:true});
 const metrics=[
  metric('applications','Başvurudan program kaydına geçiş','başvuru',refs('application',applications.filter(r=>r.review?.outcome==='accepted'&&enrollmentIds.has(r.review.enrollmentId))),refs('application',applications),'Doğrudan öğrenen kaydı başvuru gibi sayılmaz.'),
  metric('completion','LMS kaynaklı tamamlama bildirimi','öğrenen program kaydı',refs('enrollment',completed),refs('enrollment',enrollments),'Tamamlama bildirimi akademik başarı kararı değildir. Belirsiz veya işlenmemiş kaynaklar tamamlandı sayılmaz.',{status:latestEvents.length?uncertain.length?'partial':'available':'unavailable',source:[...refs('lms-event',latestEvents),...refs('lms-receipt',latestEvents.flatMap(e=>receipts.has(e.id)?[receipts.get(e.id)]:[]))]}),
  metric('success','Güncel akademik başarı','değerlendirilmiş öğrenen program kaydı',refs('enrollment',enrollments.filter(r=>latest.get(r.id)?.usable&&latest.get(r.id)?.outcome==='approved')),refs('enrollment',enrollments.filter(r=>assessments.some(a=>a.enrollmentId===r.id))),'Her öğrenen-program kaydı bir kez sayılır; açık itiraz veya güncel olmayan karar başarı sayılmaz.',{source:refs('decision',[...latest.values()])}),
  metric('delivery','Yerel imzalı belge teslim teyidi','güncel kullanılabilir imzalı belge',refs('issuance',issuances.filter(i=>delivery.some(r=>r.issuanceId===i.id))),refs('issuance',issuances),'Sahibin yerel teslim teyidi; dış kurumun belge kabulü veya kredi tanıması değildir.',{source:refs('credential-receipt',delivery)}),
  metric('external-acceptance','Dış kurumda belge kabulü','dış alıcı kabul kaydı',[],[],'Yetkili dış alıcı kabul kaynağı bağlı değil.',{status:'unavailable'}),
  metric('support','Destek çözüm durumu','erişilebilir destek kaydı',refs('support',support.filter(r=>r.state==='resolved')),refs('support',support),programId?'Destek kaydı programla ilişkilendirilmediği için bu filtrede oran üretilmez.':'Yeniden açılan kayıt çözülmüş sayılmaz; yalnız erişim kapsamındaki kuyruklar.',{status:programId?'unavailable':'available'})
 ];
 const issues=[];for(const r of applications.filter(r=>r.review?.outcome==='accepted'))if(!enrollmentIds.has(r.review.enrollmentId))issues.push({code:'application-enrollment-missing',id:r.id});
 for(const m of metrics){if(new Set(m.numeratorRefs.map(r=>r.kind+':'+r.id)).size!==m.numerator||new Set(m.denominatorRefs.map(r=>r.kind+':'+r.id)).size!==m.denominator)issues.push({code:'duplicate-source',id:m.id});if(m.numeratorRefs.some(r=>!m.denominatorRefs.some(d=>d.kind===r.kind&&d.id===r.id)))issues.push({code:'denominator-mismatch',id:m.id});}
 return {scope:'isolated-local-acceptance',official:false,sample:true,metrics,uncertainCompletionEnrollments:uncertain.length,reconciliation:{ok:issues.length===0,issues},filters:{programId,unit},limits:['Yetkili görünümdeki sentetik yerel kayıtlar; kurumun toplamı değildir.','Kaynak mutabakatı yerel kayıt kimlikleriyle yapılır; dış sistem toplamının kabulü değildir.']};
}
