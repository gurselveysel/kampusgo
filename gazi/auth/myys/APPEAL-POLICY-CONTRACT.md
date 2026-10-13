# B11 — sürümlü yerel itiraz politikası

13 Ekim 2026 · Yalnız izole sentetik kabul. Kurumun resmî usulü, tebliğ kanalı, süre takvimi ve karar/iptal yetkisi kabul edilmiş değildir. `configuredCore()` üretimde kapalıdır; yeni erişim veya migration yoktur.

## Kayıt ve kullanıcı zinciri

1. Birim yöneticisi bir **program sürümüne** politika hazırlar. Kaynak başlığı, referansı, sürümü, tarihi, okunan kapsamı, yetki dayanağı ve gerekçe zorunludur. Önceki sürüm ve değişiklik gerekçesi yeni sürümde saklanır.
2. Program/politika hazırlayanlardan ayrı komisyon kabul veya ret verir. Eski taslağa, tekrarlı incelemeye ve geçmiş bitişe kabul yazılamaz. Gerekçeli durdurma yeni kararları etkiler; eski kararın dayanağını değiştirmez.
3. Akademik karar, o an başlangıcı gelmiş son kabul edilmiş politikayı, kaynak kaydını, hash'ini ve inceleme kaydını değişmez kopya olarak bağlar. Son kabul edilmiş sürüm durmuş veya bitmişse eskiye sessiz dönüş yapılmaz; bağımsız süre incelemesi gerekir. Gelecek sürüm ve incelenmemiş taslak mevcut kabulün yerine geçmez.
4. Öğrenen kendi kararını gördüğünü MFA ile ayrıca teyit edebilir. Zaman sunucudan gelir; `officialNotificationAt=null`, `official=false`. Tekrarlanan teyit aynı kaydı döndürür. Bu işlem resmî tebliğ değildir ve resmî süre başlatmaz.
5. İtiraz, başvuru anındaki süre incelemesini sabitler. Teyit sonradan verilse veya yeni politika çıksa da bu kayıt değişmez. Belirsiz/geç yerel süre başvuruyu otomatik reddetmez; ayrı kalite yetkilisi süre gerekçesini kaydetmeden incelemeyi sonuçlandıramaz. Süre içinde başvurunun geç incelenmesi onu geç başvuru yapmaz.
6. Açık itiraz mevcut belge uygunluğunu askıya alır. İnceleme puan üretmez; yeniden değerlendirme bağımsız eğitici ve yeni komisyon kararı ister. İmzalı belge değiştirme/iptal zinciri `CREDENTIAL-LIFECYCLE-CONTRACT.md` ile aynı kayıtlara bağlıdır. Yeni imzalı belge politika kimliği, sürümü, hash'i ve inceleme kimliğini imzalı akademik dayanağında taşır.

## Süre hesabının dar teknik kapsamı

Varsayılan bağımsız incelemedir. Sayısal yerel kabul seçilirse 1–365 gün, açık +03:00 profilinde teyidin **ertesi yerel günü** başlayan hesap kullanılır; son gün 23:59:59.999'da biter. Bu tercih bir Gazi veya Türkiye mevzuat hükmü değildir. Gün sayısı için kurumsal varsayılan yoktur.

İş günü hesabında tarih aralığı, cumartesi/pazar kuralı, açık hariç günler ve takvim dayanağı zorunludur. Takvim aralığı teyidi veya son günü kapsamıyorsa, teyit yoksa/geçersizse/gelecekteyse manuel inceleme gerekir. Resmî tatiller kendiliğinden tahmin edilmez. Eski politikasız kararlar gerekçeli bağımsız inceleme akışını korur; geriye dönük süre atanmaz.

## Güvenlik ve kanıt

Kurum/birim/kişi/MFA kontrolleri komut ve idempotent tekrar için yapılır. Kayıt ve audit tek SQLite transaction içindedir. Politika kayıtları güncellenemez veya silinemez. Başka öğrenen idari sicili veya kararları göremez. Bu kontroller gerçek dağıtık üretim deposu kabulü değildir.

`myys-appeal-policy.test.mjs`: 16 senaryo; tarih/sınır/UTC gün değişimi/iş günü/takvim kapsamı, sürüm ve arşiv sabitliği, geç/teslimsiz başvuru, insan incelemesi, rol/MFA/birim/kurum, teyit tekilliği, resmi iddia reddi, kaynak şeması, atomik hata, tekrar ve Vercel kapısı, kriptografik politika bağı. Toplam 292 sunucu + 46 portal + 46 regresyon = 384 otomatik test geçti.

`myys-appeal-policy-browser.cjs`: 13 gerçek React/HTTP kontrolü. Mevcut itiraz 13 ve belge değiştirme 17 kontrolü yeniden geçti. 390 px görünüm incelendi; manuel ekran okuyucu veya kurumsal canlı kabulü iddiası yok. Kaynak kodu ile canlı yayın ayrı izlenir; kanıt `acceptance/B11-policy-20261013.json`.

## Açık kurumsal koşullar

Yetkili makamın kapsamı belirli usulü, kaynak ve yürürlük sürümü, geçerli tebliğ olayı/kanalı, süre başlangıcı ve takvimi, gecikme incelemesi, bağımsız görev atamaları, belge askı/değiştirme/iptal etkileri kurumca kabul edilmelidir. Tanıma yönergesinin kendi başvuru süreleri bu genel akademik akışa aktarılmamıştır. Gerçek usul bağlandığında bu sentetik teknik profil aynen varsayılamaz; adapter ve kabul senaryoları ayrı doğrulanır.
