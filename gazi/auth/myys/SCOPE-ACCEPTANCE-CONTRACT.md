# B08 — kurum, birim, okuma ve dışa aktarma kabulü

Sürüm 2026.10.13.22. Kapsam: yalnız LocalAcceptanceStore ve mevcut MYYS çekirdeği. Kurum kararı veya üretim adaptörü kabulü değildir. `configuredCore()` Vercel'de kapalı kalır. Yeni görünür ekran yok; Destek kayıtları / Veri talepleri / Akış ve saklama hata sınırları düzeltildi.

## Yeniden üretim ve envanter

Depo kökünde `node scripts/myys-scope-acceptance.mjs`. Normal sunucu testleri kendi çalışma dizininde çalışır. Geçerli ve başarıyla kaydedilmiş her fixture komutundan sonra ayrı SQLite kopyası açılır; özgün test deposu değişmez. Kopya ve ham geçici raporlar temizlenir. `test-results/myys-scope/result.json` yalnız eylem adları, sayı ve durumları içerir; içerik, kimlik belirteci, çerez veya özel anahtar içermez.

`acceptance/scope-inventory.json` 66 komut ve 12 HTTP yolunu açıkça listeler. Runner mevcut modüllerin literal dispatch/eylem listelerini tarar ve envanter değişmişse durur. Bu dar kaynak taraması tam JavaScript ayrıştırıcısı değildir; yeni dispatch biçimi eklendiğinde envanter incelemesi de gerekir. Yeni komut için olumlu fixture ve bütün kapsam kontrolleri zorunludur.

## Her geçerli komuttan türetilen sekiz kontrol

1. Aynı kişinin aktif görevi başka birime taşınır; özgün birimde yeni işlem reddedilir.
2. Önceden başarılı işlem kimliğinin tekrarı da güncel yetkiyle reddedilir.
3. Kurum A oturumu kurum B yeni işlemi için kullanılamaz.
4. Kurum A oturumuyla kurum B idempotent tekrarı yapılamaz.
5. Başka birim görünümü kaynak öğrenme kaydı kimliklerini içermez.
6. Kurumla uyuşmayan oturumun görünümü reddedilir.
7. Gerçekten geçerli kurum B oturumu, aynı adlı birim ve aynı görevlerle de A kayıtlarını referanslayamaz. Kendi yeni kaydını oluşturabilen komutlar, B'de ayrı kayda ulaşan olumlu kontrolle sınanır.
8. Geçerli B görünümünde A kayıtları bulunmaz.

Reddedilen yazma ve tekrarlar yalnız kayıt sayısıyla sınanmaz: bütün yerel kullanıcı tablolarının içerik özeti aynı kalmalıdır. Başka kurumda izinli oluşturma, kaynak kurumun tüm kurum kapsamlı tablolarını değiştiremez. Hazırlayanın kendi programını yayımlaması, kendi anahtarını/profilini/yetkisini incelemesi ve kendi akademik nihai kararını vermesi mevcut görevler ayrılığı testlerinde ayrıca reddedilir.

## HTTP okuma, ihraç ve anlamlı istisnalar

`myys-scope-http.test.mjs`, gerçek `myysRoute` işleyicisine geçerli imzalı sentetik belge verir. Karar arşivi, cüzdan JWT, doğrulama paketi, güven sicili, durum yayımı, imzalama, doğrulama, toplu hazırlık ve kişi dışa aktarımı önce doğru yetkiyle çalışır; sonra başka birim, geçerli başka kurum ve uyuşmayan kurum oturumu denenir. Yeni ve eski toplu satır kimliği de ayrı denenir. Reddedilen yanıtlar kaynak kayıt kimliği, kanıt metni veya imzalı belgeyi vermez.

- Kişi kendi pasif birim üyelik geçmişini okuyabilir; bu izin o birimin öğrenme kayıtlarını açmaz.
- Geçerli başka kurumun kendi boş çalışma görünümü, boş kişi özeti ve boş açık güven sicili başarılı dönebilir. Bu sonuçlar yabancı kayda erişim değildir. Kişi özeti kendi aktif kapsamında dışa aktarma denetim kaydı bırakır.
- Toplu işlemin zarfı başarılı dönebilir; yabancı satırın durumu reddedilmiş, hazırlanan belge sayısı sıfır ve belge kimliği yok olmalıdır. Kuyruk kaydı yalnız isteyenin kurumunda oluşabilir.
- Paylaşım özeti açıkça ayrı bir yetenek anahtarı modelidir. Anahtar sahibi anonim okuyucu yalnız beş alan alır. Kurum uyuşmazlığı, sahip üyelik kaybı veya paylaşım iptali erişimi keser. Bu uç kişisel arşiv/JWT vermez.
- B kurumunda A'nın anahtarı güvenilir sicilde bulunmadığı için durum yayımı `signing_key` ile kapalıdır. Kriptografik doğrulama geçerli anahtar sağlansa bile B'de kayıt yoksa belgeyi geçerli saymaz.

## Bulunan ve giderilen sınırlar

Destek ve veri talebi oluşturma/paylaşım geri çekme işlemlerinde birim üyeliği, alan geçerliliğinden ayrıldı: kapsam dışı istek 403 `forbidden` döner. Önceden bu durum 422 alan hatasıydı; yetkisiz yazma yoktu. Saklama çalıştırmada yabancı/olmayan önizleme 404 ile reddedilir; eksik politika kimliğinin SQLite'a verilmesinden doğan 500 kaldırıldı.

## Kabul sınırı

323 sunucu + 46 portal + 46 regresyon = 415 otomatik test. Matrisin 2.656 olumlu işlem örneğinden türettiği 21.248 kontrol ayrı test sayısı veya ürün tamamlanma oranı değildir. Yerel 66/12 envanter kapanışı, B08'in gerçek görev atamaları, üretim deposu/RLS/dağıtık oturum iptali ve kurum kabulünü kapatmaz. Yeni modül eklendikçe matris tekrar genişletilip çalıştırılır. Kaynak eşitlemesi ile canlı yayım ayrı kaydedilir.

## Paket 23 genişlemesi

2026.10.13.23 envanteri alternatif kanıt ve moderasyon komutlarıyla 68 komuta çıktı; 12 HTTP yolu korundu. 2.800 olumlu örnekten 22.400 denetim ve 428 otomatik test geçti. Tarihsel Paket 22 kanıtı değiştirilmedi; yeni sonuç B10-alternative-20261013.json içindedir.

## Paket 24 genişlemesi

2026.10.14.24 envanteri SEM hazırlık/inceleme/paket/geri çekme ile 72 komut ve 12 HTTP yolunu kapsar. 2.875 olumlu örnekten 23.000 denetim, 440 otomatik test geçti. Tarihsel kanıtlar korunur; yeni sonuç B23-sem-20261014.json içindedir.
