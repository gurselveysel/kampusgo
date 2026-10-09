// Institutional pilot utilities. No outbound network or production decisions.
export const RELEASE = '1.1.0';
export const LIMIT_SOURCE = 'https://dosyalar.kik.gov.tr/yardim/dokumanlar/2026_Esik_Degerler_Parasal_Limitler_Karsilastirma.pdf';
export function extend(s) {
  s.governance ??= {};
  const g = s.governance;
  g.creditPolicy ??= {total:240,percent:10,version:'ORNEK-TANIMA-1',source:'Örnek kurum politikası; senato teyidi bekleniyor'};
  g.priorCredits ??= {'DEMO-001':9,'DEMO-002':0,'DEMO-003':0};
  g.outbox ??= []; g.opportunities ??= []; g.reviews ??= [];
  g.readiness ??= {}; g.brand ??= {label:'Gazi Üniversitesi',color:'#103a5c'};
  g.sales ??= {institution:'Üniversiteniz',persona:'rector',channel:'meeting',presenter:'ÜniGO ekibi'};
  g.roi ??= {volume:1000,before:40,after:15,hourly:500,cost:1000000,annual:100000};
  return g;
}
const finite = (n,min,max,label) => { if(!Number.isFinite(n)||n<min||n>max) throw Error(label+' için geçerli bir değer girin.'); return n; };
const round = n => Math.round((n+Number.EPSILON)*100)/100;
export function creditUsage(s,owner,additional=0,excludeId=null) {
  const g=extend(s),p=g.creditPolicy;
  finite(p.total,1,600,'Program AKTS'); finite(p.percent,0,100,'Tanıma oranı'); finite(additional,0,600,'Ek AKTS');
  const prior=g.priorCredits[owner];
  if(!Number.isFinite(prior)||prior<0) return {known:false,allowed:false,reason:'Öğrencinin önceki tanınmış AKTS bilgisi eksik.'};
  const decisions=s.applications.filter(a=>a.owner===owner&&a.status==='approved'&&a.id!==excludeId).reduce((n,a)=>n+(a.decision?.ects||0),0);
  const cap=round(p.total*p.percent/100),used=round(prior+decisions),after=round(used+additional);
  return {known:true,allowed:after<=cap,cap,used,after,remaining:round(cap-after),percent:round(after/p.total*100),capPercent:cap?round(after/cap*100):0,reason:after<=cap?'Örnek politika sınırı içinde':'Örnek tanıma sınırı aşılıyor',policyVersion:p.version};
}
export function creditGate(s,id) {
  const a=s.applications.find(a=>a.id===id); if(!a)throw Error('Başvuru bulunamadı.');
  const c=creditUsage(s,a.owner,(a.status==='approved'?a.decision?.ects:a.match?.ects)??0,id);
  if(!c.allowed)throw Error(c.reason);return c;
}
export function setCreditPolicy(s,{total,percent,prior,owner,source}) {
  if(s.role!=='admin')throw Error('Sistem yöneticisi demo rolünü seçin.');
  finite(total,1,600,'Program AKTS');finite(percent,0,100,'Tanıma oranı');finite(prior,0,600,'Önceki AKTS');
  if(!source?.trim()||source.trim().length<12)throw Error('Politika dayanağını en az 12 karakterle belirtin.');
  if(!Object.hasOwn(extend(s).priorCredits,owner))throw Error('Örnek öğrenci seçin.');
  const g=extend(s);g.creditPolicy={total,percent,source:source.trim(),version:'ORNEK-TANIMA-'+Date.now()};g.priorCredits[owner]=prior;
}
export function roi(input) {
  const {volume,before,after,hourly,cost,annual}=input;
  finite(volume,1,1000000,'Başvuru sayısı');finite(before,0,10000,'Mevcut süre');finite(after,0,10000,'Hedef süre');
  finite(hourly,0,100000,'Saat maliyeti');finite(cost,0,100000000,'İlk yatırım');finite(annual,0,100000000,'Yıllık gider');
  const hours=round(volume*(before-after)/60),capacity=round(hours*hourly),net=round(capacity-annual);
  return {hours,capacity,net,payback:net>0?round(cost/net*12):null,threeYear:round(net*3-cost)};
}
export function procurement({amount,vat,metro,type,date}) {
  finite(amount,0,100000000,'KDV hariç toplam');finite(vat,0,100,'KDV oranı');
  if(!['public','foundation'].includes(type))throw Error('Kurum türü geçersiz.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Geçerli bir tarih girin.');
  const valid=date>='2026-02-01'&&date<='2027-01-31',limit=metro?1021827:340391;
  return {gross:round(amount*(1+vat/100)),limit,difference:round(limit-amount),valid,comparable:valid&&type==='public',within:valid&&type==='public'&&amount<=limit};
}
export function enqueue(s,id) {
  if(s.role!=='studentAffairs')throw Error('Öğrenci İşleri demo rolünü seçin.');
  const a=s.applications.find(a=>a.id===id);if(a?.status!=='approved')throw Error('Komisyon onayı gerekir.');creditGate(s,id);
  const g=extend(s),key='gazi:'+id+':'+a.decision.policyVersion;
  if(g.outbox.some(x=>x.key===key)||s.transfers.some(t=>t.applicationId===id))throw Error('Mükerrer aktarım engellendi.');
  const row={id:crypto.randomUUID(),applicationId:id,key,status:'queued',attempts:0,live:false,createdAt:new Date().toISOString(),payload:{student:a.owner,decision:id,ects:a.decision.ects,title:a.title}};
  g.outbox.unshift(row);return row;
}
export function attempt(s,id,fail=false) {
  if(s.role!=='studentAffairs')throw Error('Öğrenci İşleri demo rolünü seçin.');
  const row=extend(s).outbox.find(x=>x.id===id);if(!row||row.status==='succeeded')throw Error('Aktarım tekrarı engellendi.');
  if(row.attempts>=3)throw Error('3 deneme sınırına ulaşıldı; teknik inceleme gerekli.');creditGate(s,row.applicationId);
  if(s.transfers.some(t=>t.applicationId===row.applicationId))throw Error('Başvuru daha önce aktarıldı.');
  row.attempts++;row.at=new Date().toISOString();row.status=fail?'failed':'succeeded';row.error=fail?'Örnek 503: hedef sistem erişilemiyor.':'';
  if(!fail)s.transfers.unshift({id:'TR-'+row.id,applicationId:row.applicationId,student:row.payload.student,title:row.payload.title,ects:row.payload.ects,state:'Prova tamamlandı',live:false,at:row.at});
  return row;
}
const words=t=>new Set(t.toLocaleLowerCase('tr').normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>3));
export function suggest(syllabus,outcomes) {
  if(typeof syllabus!=='string'||syllabus.trim().length<20||syllabus.length>30000)throw Error('20–30.000 karakterlik eğitim içeriği girin.');
  const lines=outcomes.split('\n').map(x=>x.trim()).filter(Boolean);if(!lines.length||lines.length>20)throw Error('1–20 hedef çıktı girin.');
  const sentences=syllabus.split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
  return lines.map(outcome=>{const target=words(outcome);let best={score:0,quote:'Eşleşen ifade bulunamadı.'};
    for(const sentence of sentences){const set=words(sentence),hits=[...target].filter(w=>set.has(w));const score=target.size?Math.round(hits.length/target.size*100):0;if(score>best.score)best={score,quote:sentence};}
    return {outcome,...best};});
}
const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export async function signedSample() {
  const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
  const payload=JSON.stringify({type:'UniGOPilotEnvelope',issuer:'ÜniGO tarayıcı laboratuvarı',subject:'SENTETIK-001',achievement:'Veri okuryazarlığı',ects:3,official:false});
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,encoder.encode(payload));
  return {format:'UniGO-Pilot-ECDSA-v1',payload,signature:b64(signature),publicKey:await crypto.subtle.exportKey('jwk',keys.publicKey)};
}
export async function checkEnvelope(obj) {
  if(obj?.format!=='UniGO-Pilot-ECDSA-v1'||typeof obj.payload!=='string'||obj.payload.length>30000||typeof obj.signature!=='string'||obj.signature.length>500||obj.publicKey?.kty!=='EC'||obj.publicKey?.crv!=='P-256')return {status:'unsupported',label:'Desteklenmeyen / imzasız format',trusted:false};
  try {const key=await crypto.subtle.importKey('jwk',obj.publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    const valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,unb64(obj.signature),encoder.encode(obj.payload));
    return {status:valid?'valid':'invalid',label:valid?'İmza matematiksel olarak geçerli':'İmza doğrulanamadı; içerik veya imza değişmiş olabilir',trusted:false};
  }catch{return {status:'invalid',label:'İmza veya anahtar biçimi geçersiz',trusted:false};}
}
export async function inspectBytes(bytes,name) {
  if(bytes.byteLength>5*1024*1024)throw Error('En fazla 5 MB dosya seçin.');
  const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  let result={status:'unverified',label:'İhraççı teyidi gerekli; dosya özgünlüğü belirlenmedi',trusted:false};
  if(/\.json$/i.test(name)){try{result=await checkEnvelope(JSON.parse(new TextDecoder().decode(bytes)));}catch{result={status:'invalid-format',label:'JSON okunamadı',trusted:false};}}
  return {name,size:bytes.byteLength,hash,...result};
}
export function setExpiry(s,{code,date,reason}) {
  if(s.role!=='studentAffairs')throw Error('Öğrenci İşleri demo rolünü seçin.');
  const c=s.credentials.find(c=>c.code===code);if(!c||c.status==='revoked')throw Error('Geçerli bir örnek sicil kaydı seçin.');
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<c.issued))throw Error('Bitiş tarihi düzenleme tarihinden önce olamaz.');
  if(!reason||reason.trim().length<12)throw Error('En az 12 karakterlik süre dayanağı yazın.');
  c.expiryHistory??=[];c.expiryHistory.push({before:c.expires,after:date||null,reason:reason.trim(),at:new Date().toISOString()});c.expires=date||null;
  return c;
}
export const personas={
  rector:{title:'Rektörlük ve Kalite',benefit:'Kurumsal kanıtı görünür kılın.',pitch:'ÜniGO; dış öğrenme başvurularını, gerekçeli kararları ve kazanımları ortak bir kurumsal hafızada toplar. Kalite çalışmalarında kanıta erişimi kolaylaştırır; etkiyi ölçülebilir göstergelerle izlemenizi sağlar.',question:'Hangi kalite göstergesi için bugün kanıt toplamakta zorlanıyorsunuz?',route:'executive',cta:'Kanıt ve yetenek panelini göster'},
  commission:{title:'Komisyon Başkanlığı',benefit:'Akademik karara daha hazır bir dosyayla ulaşın.',pitch:'ÜniGO; iş yükü, öğrenme çıktısı ve kanıt kontrollerini bir dosyada birleştirir. Gerekçeli oy, çoğunluk ve çıkar çatışması kontrolleriyle karar sürecini izlenebilir kılar. Akademik karar yetkisi komisyondadır.',question:'Bir dosyanın ön incelemesi ve kurul kararı bugün kaç dakika sürüyor?',route:'commission',cta:'Gerekçeli karar akışını göster'},
  it:{title:'Bilgi İşlem',benefit:'Entegrasyonu ölçülebilir kabul adımlarıyla yönetin.',pitch:'ÜniGO; alan eşleme, tekil işlem anahtarı ve hata kuyruğu yaklaşımıyla OBS entegrasyonunu planlar. Barındırma, SSO, veri güvenliği ve işletim sorumlulukları kurumunuzla birlikte netleştirilir. Bu pilotta canlı kurum bağlantısı henüz yoktur.',question:'OBS sağlayıcınızın yetkilendirilmiş test API’si ve veri sözlüğü var mı?',route:'delivery',cta:'Bağlantı hazırlığını göster'},
  affairs:{title:'Öğrenci İşleri',benefit:'Karardan transkript provası­na kontrollü geçiş.',pitch:'ÜniGO; kurumunuzun tanıma politikasını sürümler, öğrencinin biriken AKTS’sini kontrol eder ve onaylı kararları mükerrerlik korumasıyla aktarım provasına alır. Canlı aktarım, OBS bağlantısı ve kurum kabul testinden sonra açılır.',question:'Önceki tanınmış AKTS ve karar referansları hangi sistemde tutuluyor?',route:'recognition',cta:'Kredi sınırı ve aktarımı göster'}
};
export const objections=[
  ['Bütçe ve satın alma','Toplam maliyeti ve yürürlükteki limiti birlikte karşılaştıralım. Limit altında olmak tek başına alım onayı değildir; usul ve bütçe uygunluğunu satın alma biriminiz değerlendirir.','business'],
  ['Mevcut OBS ile uyum','Veri sözlüğünüz üzerinden alan eşlemesini, tekrar korumasını ve hata senaryolarını test ederiz. Desteklenen arayüz ve kabul ölçütleri netleşmeden tam uyum taahhüdü vermeyiz.','delivery'],
  ['Sahte PDF riski','PDF yüklenmesi kriptografik doğrulama demek değildir. İmzayı, ihraççı güvenini ve geçerliliği ayrı kontrol ederiz. Doğrulanamayan belge ek incelemeye gider.','evidence'],
  ['Yapay zekâ yanlış karar verir mi?','Akademik karar komisyondadır. Bu sürümdeki metin incelemesi açıklanabilir sözcük eşlemesidir; üretim yapay zekâsı değildir. Önerinin dayanağı ekranda görülür.','evidence'],
  ['Verimiz ve sistemden çıkış','Barındırma, saklama, erişim ve veri dışa aktarım koşullarını kabul planına yazarız. Yerli bulut veya kurum sunucusu tek başına KVKK uyumunu garanti etmez.','delivery']
];
export function salesCopy(sales) {
  const p=personas[sales.persona]||personas.rector,inst=sales.institution?.trim()||'Üniversiteniz',who=sales.presenter?.trim()||'ÜniGO ekibi';
  if(sales.channel==='meeting')return `Sayın Hocam / Başkanım,\n\n${inst} için ${p.benefit.toLocaleLowerCase('tr')} ${p.pitch}\n\n${p.question}\n\nUygun görürseniz 15 dakikalık bir ihtiyaç ve demo görüşmesi planlayabiliriz.\n${who}`;
  return `Sayın Hocam / Başkanım, ${inst} mikro yeterlilik süreçleri için ÜniGO MYYS’yi tanıtmak isteriz. ${p.benefit} ${p.pitch} Önümüzdeki hafta 15 dakikalık çevrim içi demo için uygunluğunuzu paylaşabilir misiniz? ${who}`;
}
