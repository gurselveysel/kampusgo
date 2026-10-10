export const SUPPORT_BRIEF_VERSION='2026.10.10.1';
export const supportScreens=[['learning','Programlarım ve derslerim'],['academic','Kanıt ve akademik karar'],['badges','Pilot rozet ve cüzdan'],['connections','Entegrasyonlar'],['guide','Kullanım rehberi']];
export const supportTopics=[
 {id:'connection',title:'Kurum bağlantısı bekleniyor',queue:'Bilgi işlem',route:'academic',steps:['Bu mesaj, kişi bazlı kurum kimliği ve akademik deponun bağlı olmadığını gösterir.','Tekrar tekrar başvuru oluşturmayın. Kurum bağlantısının etkinleşmesini yetkili ekip izler.'],academic:false},
 {id:'progress',title:'Ders ilerlemem görünmüyor',queue:'Teknik destek',route:'learning',steps:['Pilot ilerlemenin kaydedildiği aynı tarayıcı ve cihazı kullanın.','Tarayıcı verilerini silmeden önce ders çalışma özetinizi indirin.'],academic:false},
 {id:'appeal',title:'Akademik karara itiraz',queue:'Bağımsız akademik inceleme',route:'academic',steps:['Kurum akışı etkin olduğunda kendi kararınıza bağlı gerekçeli itiraz oluşturun.','Bu destek özeti itiraz başvurusu veya süre durdurma işlemi değildir. Teknik destek not değiştiremez.'],academic:true},
 {id:'verification',title:'Rozet doğrulama sorunu',queue:'Belgelendirme teknik desteği',route:'badges',steps:['Belgenin iptal veya süre durumunu doğrulama ekranında inceleyin.','Özel kanıtınızı ya da imza anahtarını destek mesajına eklemeyin. Teknik doğrulama akademik tanıma değildir.'],academic:false},
 {id:'privacy',title:'Veri ve paylaşım talebi',queue:'Kurumun veri koruma yetkilisi',route:'academic',steps:['Paylaşım ve saklama talebini kurumun doğrulanmış başvuru kanalına iletin.','Bu araç hesabı silmez, paylaşımı iptal etmez ve resmî başvuru oluşturmaz.'],academic:false}
];
export function supportBrief({topicId,screenId,impact},now=new Date()){
 const topic=supportTopics.find(t=>t.id===topicId),screen=supportScreens.find(s=>s[0]===screenId);
 const impacts={blocked:'İşlemi tamamlayamıyorum',limited:'İşlemi kısmen tamamlayabiliyorum',question:'Bilgi almak istiyorum'};
 if(!topic||!screen||!Object.hasOwn(impacts,impact))throw Error('Konu, ekran ve etki seçimini tamamlayın.');
 return {surum:SUPPORT_BRIEF_VERSION,tur:'Kişisel destek hazırlık özeti',olusturulmaZamani:now.toISOString(),konu:topic.title,ekran:screen[1],etki:impacts[impact],onerilenBirim:topic.queue,adimlar:[...topic.steps],gonderildi:false,aciklama:'Hiçbir destek sistemine gönderilmedi. Başvuru veya akademik karar değildir. Kimlik, oturum ve öğrenme kanıtı içermez.'};
}
