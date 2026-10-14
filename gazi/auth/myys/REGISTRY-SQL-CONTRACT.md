# Politika ve hak sicili — aynı SQL zinciri

Paket71, 14.10.2026. Bu çalışma kaynak/sorumluluk taslağı ve ayrı kişinin yerel incelemesini aynı kimlik ve kayıt deposuna bağlar. Kurum kararı, hukuki görüş, kaynak hükmünün doğruluğuna otomatik karar veya resmî belge yetkisi oluşturmaz.

## Kapsam

Mevcut `registry-draft` ve `registry-review` iş kuralları korunmuştur. SQL yerel kapsamı16 komut ve15 akademik kayıt türüne genişler; `registry` ve `registry-review` aynı değişmez akademik kayıt tablosundadır. Toplam16 PostgreSQL şema adayı değişmez; yeni tablo, üretim migration'ı veya ikinci kalıcı depo yoktur. Kalan120 komut henüz bu SQL dilimine taşınmamıştır.

Beş tür korunur: veri akışı/saklama, içerik ve sağlayıcı hakları, tanıma politikası, LMS veri sözleşmesi, kurum ve SEM sorumlulukları. Zorunlu alanları eksik kayıt reddedilir; bilinmeyen alanlar yetki üretmez. Kayıttaki kaynak referansı, yazanın beyanıdır. İlgili kurum kararı, belge eki, sözleşme, saklama dayanağı ve bağımsız resmî kabul yerine geçmez.

## Yetki ve değişmezlik

Yalnız mevcut birimdeki MFA doğrulanmış yönetici taslak hazırlayabilir veya inceleyebilir. Hazırlayan kendi taslağını inceleyemez. Öğrenen/eğitici/komisyon/kalite rolü yönetici yetkisi edinmez; başka kurum/birim kayıtları projeksiyonda ve yazmada kapalıdır. Sunum profili seçimi bu sınırı değiştirmez.

İnceleme sonucu uygun veya uygun değil ve gerekçesiyle kaydedilir. Bir taslak bir kez incelenir. Kayıt ve incelemesi değiştirilmez; yeni koşullar yeni kayıt gerektirir. Bu yeni kayıt, öncekinin ilişkilerini kendiliğinden güncellemez veya bir resmî sürüm onayı oluşturmaz. İleride yetki dosyası/profil o kesin kayıt kimliğine ve özetine bağlanır.

Kayıt, komut makbuzu ve denetim izi aynı SERIALIZABLE işlemde tutulur. Güncel kişi/üyelik/oturum işlem başı ve sonunda denetlenir. Aynı kişi/komut kimliği10 kez kullanıldığında tek kayıt kalır; farklı içerik aynı kimlikle reddedilir. İptal edilmiş üyelik eski makbuzla işlem açamaz. Denetim yazımı başarısızsa üç kayıt birlikte geri alınır. Birleşik15 veri tablosu checkpoint'i eski yedeğin incelemeyi silmesini reddeder. PGlite tek bağlantı kabulü native çok bağlantı/SSI/RLS kabulü değildir.

## Ekran

“Kanıt ve Akademik Karar → Politika ve hak sicili” yetkili yöneticiye açılır. Türkçe alanlar, hazırlayan ve inceleyen, kayıt tarihi, gerekçe ve üç inceleme durumu görünür. Metin, tür ve inceleme durumu filtreleri çalışır. Özgün11 sunum profili ve eski SQLite kabul akışı korunur.

Bu SQL diliminde yetki belgesi eki, yetki dosyası, belge profili ve ihraç formları kapalıdır. İşlevi henüz bağlı olmayan form gösterilmez. Mevcut SQLite yerel kabuldeki yetki dosyası akışı korunur; iki depo tek kurumsal kayıt gibi sunulmaz.

## Açık koşullar

Kanıt `acceptance/B02-B20-registry-sql-20261014.json` dosyasındadır. Bu dilim B02/B04/B05/B08/B12/B14/B16/B20'nin yerel alt kabulüdür; hiçbir iş paketinin bütün kabulünü tek başına kapatmaz. Son canlı16;17–71dağıtılmadı. `configuredCore()` Vercel'de kapalıdır. Gerçek kurum yetkisi, okunan kaynak/sözleşme, IdP, üretim depo/checkpoint ve dış entegrasyon kabulleri açık kalır.
