# İmzasız belge hazırlığı — aynı SQL karar zinciri

Paket74, 14.10.2026. B12'nin kişi, karar ve belge profiline bağlı hazırlık kaydı SQL zincirine taşınır. Bu kayıt imzalı belge, gerçek kişiye verilmiş rozet veya kurum adına resmî düzenleme değildir.

## İşlem ve görünür ekran

Mevcut `issue` iş kuralı korunur. Aynı SQL program/öğrenen kaydı/kanıt/değerlendirme/karar zincirinin uygunluğu ve incelenmiş belge profili denetlenir. Belge görevlisi “Akademik kararlar” ekranında “Belge uygunluğunu denetle” işlemini yapar. Oluşan özel, değişmez `issuance` kaydı “Belge hazırlığı” ekranında imza bekleyen hazırlık olarak görünür. Öğrenen yalnız kendi kaydını; yetkili akademik görevli mevcut birim kapsamını görür.

SQL kapsamında25 komut ve25 akademik kayıt türü bulunur; aynı16 şema adayı kullanılır. Yeni tablo veya üretim migration'ı yoktur.111 komutun SQL aktarımı açık kalır. `issuanceProfile` yalnız gerçek LocalAcceptanceStore veya etkin özel SQL çalışma kümesini kabul eder; genel nesne, prototip taklidi ve kapanmış küme yetki üretemez. `configuredCore()` Vercel'de kapalıdır.

## Yetki ve geçmiş

Güncel MFA/kişi/üyelik/oturum ve studentAffairs görevi gerekir. Görevli programı veya kararı hazırlayan ve öğrenen kişiden ayrı olmalıdır; belge profilinin atanmış görevlilerinden biri olmalıdır. Uygun karar, incelenmiş ve süreli profil, program sürümü/özeti ve yetki dosyası bağı korunur. Merkezi SEM yolu yerel mikro program hazırlığına çevrilemez.

Eksik, incelenmemiş veya durdurulmuş profil yeni hazırlığı kapatır. Açık itiraz kararın kullanımını ve mevcut hazırlığın kullanım göstergesini kapatır; bağımsız inceleme sonucu mevcut iş kurallarıyla tekrar değerlendirilir. Bu davranış imzalı belgeyi iptal etmiş gibi gösterilmez. Yeni profil/dosya sürümü, önceki hazırlığın profil kimliğini, özetini veya alan listesini yeniden yazmaz.

Aynı öğrenen kaydı için ikinci hazırlık reddedilir. Aynı kişi/komut kimliği mevcut tarihsel makbuzu getirir; güncel rol ve üyelik tekrar aranır. Bu tekrar yeni belge yetkisi veya imza uygunluğu değildir. Farklı içerikle aynı işlem kimliği reddedilir. Hazırlık, komut makbuzu ve denetim izi aynı SERIALIZABLE işlemde yazılır. Denetim hatası hepsini geri alır; belirsiz COMMIT başarı döndürmez. Checkpoint olmadan kaydedilmiş sonucun açık tekrarı tek makbuzu bulur; birleşik checkpoint'in belirsiz mühür kuralı ayrıca geçerlidir. Eski SQL yedeği hazırlığı silerek geçmişi geri alamaz.

## Kapalı işlemler

SQL projeksiyonunda bütün hazırlıklar için `canSign=false`, `signerAvailable=false` kalır. İmzalama, cüzdandan dosya çıkarma, doğrulama paketi, paylaşım ve belge değiştirme/iptal iş akışı bu dilimde açılmaz. Arayüz bu kapsamı açıkça belirtir; bağlı olmayan imza veya değiştirme düğmesi sunmaz. Eski SQLite kabulünün mevcut imza ve yaşam döngüsü davranışı korunur.

Kurumun gerçek belge yetkileri, görevli atamaları, Senato/SEM kararı, imza hizmeti/KMS, üretim depo/checkpoint, native çok bağlantı/SSI/RLS ve dış doğrulama kabulü açık kalır. B12 veya B01–B36 bütünü bu alt dilimle tamamlanmış sayılmaz. Son canlı16; bu kaynak dilimi yayımlanmadı.

## Yerel doğrulama

Paket74:11yeni SQL/HTTPS testi;923sunucu+59portal+46regresyon=1028.58SQL+11mevcutprofil=69tarayıcı.136komut/18HTTP için9035pozitif72280türetilmiş negatif SQLite kapsam örneği;115statik paket. İlk idempotency testinde paralel giriş yerine aynı önceden başlatılmış oturumda10 komut kullanıldı. İlk tarayıcı son adımında eski altı sekmeli klavye beklentisi yenide Belge hazırlığına dönecek biçimde düzeltildi; son58 kontrol geçti. Başarısız koşular kabul sayılmadı. [Kanıt](acceptance/B12-issuance-sql-20261014.json).
