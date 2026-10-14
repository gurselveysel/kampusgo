// Synthetic exercise labels shared with the portal; no production SLA is inferred.
export const recoveryChecks={
 staleBackup:'Eski yedek güncel güvenlik özetiyle reddedildi',
 damagedBackup:'Bozuk yedek hedef oluşturmadan reddedildi',
 records:'Akademik kayıt, komut ve denetim geçmişi korundu',
 sessions:'Eski oturumlar ve bekleyen girişler kapalı kaldı',
 logout:'İmzalı oturum iptali ve tekrar makbuzu korundu',
 freshIdentity:'Yeni imzalı kimlik doğrulamasıyla yeniden giriş yapıldı',
 queue:'Kesilen işin süresi doldu; yeni işçi tek makbuz üretti',
 duplicate:'Mükerrer kaynak olayı yeni işlem üretmedi',
 archive:'Kaynak imzası ve eski karar arşivinin özeti aynı kaldı',
 keyRisk:'Riskli anahtar ve belge kullanımı kapalı kaldı',
 wrongIssuance:'Yanlış ihraç iptali geri yüklemeden sonra korundu'
};
export const recoveryRunbook=[
 'Gerçek olayda yetkili işletim sorumlusunu ve etkilenen kapsamı belirleyin; yeni imza ve dış aktarımı durdurun.',
 'Yanlış ihraçta belgeyi yetkili iptal zinciriyle kapatın. Anahtar riskinde sicili kapatın; geçmiş kararları değiştirmeyin.',
 'Son güvenilir güvenlik kaydıyla yedek özetini ayrı doğrulayın. Eski yedek, eksik iptal kaydı veya şüpheli anahtar varsa hizmeti kapalı tutun.',
 'Geri yüklemeyi yeni, izole hedefte yapın. Eski oturum ve bekleyen girişleri kapatın; yeni kimlik doğrulaması isteyin.',
 'Kuyruk sahipliğini, tek işlem makbuzunu ve değişmez akademik arşivi doğrulayın. Dış aktarımı ayrıca mutabakat olmadan açmayın.',
 'Ölçülen veri kaybı ve hizmete dönüş süresini onaylı hedeflerle karşılaştırın; ayrı yetkili inceleme tamamlanmadan gerçek hizmeti açmayın.'
];
