// Presentation workspaces for the local demo. These are not authentication.
export const workspaces = {
  coordinator: {
    name:'Koordinatörlük / GAZİSEM', initials:'GK', home:'overview',
    title:'Koordinatörlük çalışma alanı', description:'Programları, başvuruları ve akademik değerlendirme akışını yönetin.',
    pages:['overview','applications','catalog','matching','outcomes','commission','appeals','credentials','obs','integrations','quality','notifications','audit']
  },
  learner: {
    name:'Öğrenen / Öğrenci', initials:'DÖ', home:'wallet',
    title:'Öğrenme alanım', description:'Deniz Örnek · Başvurularınızı, öğrenme çıktılarınızı ve öğrenme planınızı takip edin.',
    pages:['overview','applications','catalog','credentials','wallet','pathways','appeals','notifications']
  },
  instructor: {
    name:'Eğitici', initials:'EĞ', home:'catalog',
    title:'Program tasarım alanı', description:'Program önerileri hazırlayın; öğrenme çıktılarını ölçme kanıtlarıyla ilişkilendirin.',
    pages:['overview','catalog','outcomes','notifications']
  },
  commission: {
    name:'Komisyon üyesi', initials:'KÜ', home:'commission',
    title:'Komisyon çalışma alanı', description:'Gündem dosyalarını inceleyin, gerekçeli oy verin ve kararları takip edin.',
    pages:['overview','applications','matching','outcomes','commission','appeals','credentials','notifications','audit']
  },
  studentAffairs: {
    name:'Öğrenci İşleri', initials:'Öİ', home:'obs',
    title:'Öğrenci İşleri çalışma alanı', description:'Onaylı öğrenme çıktıları, belge sicilini ve OBS aktarım kuyruğunu yönetin.',
    pages:['overview','applications','matching','commission','credentials','obs','notifications','audit']
  },
  quality: {
    name:'Kalite Koordinatörlüğü', initials:'KK', home:'quality',
    title:'Kalite çalışma alanı', description:'Kanıt kapsamını izleyin; iyileştirme görevlerini ve bağımsız itiraz incelemelerini yürütün.',
    pages:['overview','applications','catalog','outcomes','commission','appeals','credentials','quality','notifications','audit']
  },
  it: {
    name:'Bilgi İşlem', initials:'Bİ', home:'integrations',
    title:'Teknik çalışma alanı', description:'Kurum bağlantılarının hazırlığını ve teknik işlem kayıtlarını takip edin.',
    pages:['overview','integrations','notifications','audit']
  },
  finance: {
    name:'Mali İşler', initials:'Mİ', home:'finance',
    title:'Mali İşler çalışma alanı', description:'Örnek ücret kayıtlarını ve mutabakat bekleyen işlemleri takip edin.',
    pages:['overview','finance','notifications','audit']
  },
  admin: {
    name:'Sistem yöneticisi', initials:'SY', home:'settings',
    title:'Sistem yönetimi', description:'Pilot kurallarını, bağlantı hazırlığını, yedeklemeyi ve işlem arşivini yönetin.',
    pages:['overview','integrations','notifications','audit','settings']
  }
};

const extensions={coordinator:['governance','ai-requests','proctoring','cryptographic','sync'],learner:['cryptographic'],instructor:['proctoring'],commission:['governance','ai-requests','proctoring','cryptographic'],studentAffairs:['governance','cryptographic','sync'],quality:['governance','ai-requests','proctoring','cryptographic','sync'],it:['governance','proctoring','sync'],finance:['governance'],admin:['governance','proctoring','cryptographic','sync']};
for(const r of ['coordinator','instructor','commission','studentAffairs','quality','it','admin'])workspaces[r].pages.push('references');
for(const [role,pages] of Object.entries(extensions))workspaces[role].pages.push(...pages);

export const workspaceFor = role => workspaces[role] || workspaces.coordinator;
export const canView = (role, page) => workspaceFor(role).pages.includes(page);
export const resolveRoute = (role, requested) => canView(role, requested) ? requested : workspaceFor(role).home;

export function roleNotifications(state) {
  const role = state.role;
  let items = [];
  if (role === 'coordinator') items = state.notifications;
  else if (role === 'commission') items = state.notifications.filter(n => n.id === 'N1');
  else if (role === 'learner') items = state.applications.filter(a => a.owner === 'DEMO-001').map(a => ({id:'application:'+a.id,title:a.title,body:a.id+' · Başvurunuzun güncel durumunu Başvurularım ekranından izleyebilirsiniz.'}));
  else if (role === 'instructor') items = [{id:'program-design',title:'Program tasarım gündemi',body:'Katalogda '+state.programs.length+' örnek program var. Yeni öneri hazırlayabilir ve öğrenme çıktısı matrisini oluşturabilirsiniz.'}];
  else if (role === 'studentAffairs') items = state.applications.filter(a => a.status === 'approved' && !state.transfers.some(t => t.applicationId === a.id)).map(a => ({id:'transfer:'+a.id,title:'Aktarım provası bekliyor',body:a.id+' · '+a.title}));
  else if (role === 'quality') items = state.qualityTasks.filter(t => t.status === 'open').map(t => ({id:'quality:'+t.id,title:t.title,body:t.owner+' · Hedef: '+t.due}));
  else if (role === 'it') items = [{id:'integration-preparation',title:'Bağlantı hazırlığı',body:'OBS, EBYS, SSO ve diğer kurum bağlantılarının hazırlık kontrollerini Entegrasyon merkezinden yürütün. Canlı bağlantılar henüz kurulmadı.'}];
  else if (role === 'finance') items = state.finance.filter(f => f.state === 'Bekliyor').map(f => ({id:'finance:'+f.id,title:'Mutabakat bekliyor',body:f.program+' · Örnek mali kaydı inceleyin.'}));
  else if (role === 'admin') items = [{id:'policy:'+state.policy.version,title:'Etkin pilot kural sürümü',body:state.policy.version+' · Kurumsal kurallar, bağlantı hazırlığı ve yedekleme bu çalışma alanındadır.'}];
  return items.map(n => ({...n, read: !!state.notificationReads?.[role]?.[n.id]}));
}

export function markRoleNotificationsRead(state, ids) {
  const valid = new Set(roleNotifications(state).map(n => n.id));
  state.notificationReads ??= {};
  state.notificationReads[state.role] ??= {};
  for (const id of ids) if (valid.has(id)) state.notificationReads[state.role][id] = true;
}
