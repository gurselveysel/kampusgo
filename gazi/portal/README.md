# ÜniGO MYYS React arayüzü

Yedi Türkçe ekran, React 19, Tailwind 3, Lucide, Framer Motion ve Radix diyalog/menü bileşenleriyle hazırlanmıştır.

`npm ci` ardından `npm run build`, kök `gazi/portal.js` ve `gazi/portal.css` dosyalarını üretir. `npm test` ortak durum modeli testlerini çalıştırır.

## Ekranlar

- `#/dashboard`: Kurumsal özet ve rapor indirme.
- `#/stakeholders`: Dört paydaş grubu, arama, filtre, yerel kayıt ve rol düzenleme.
- `#/curriculum`: Dersler, öğrenme çıktısı ekleme, matris indirme ve mevcut kaynaklı merkeze bağlantı.
- `#/requests`: Ortak matrisi kullanan örnek eşleştirme, politika kontrollü sevk ve gerekçeli ret.
- `#/proctoring`: Kamerasız gözetim simülasyonu, duraklatma ve insan inceleme notu.
- `#/badges`: Üç tasarım, metadata, imzasız örnek JSON ve paylaşım taslakları.
- `#/connections`: Tekrar korumalı, üç denemeyle sınırlı yerel kuyruk ve hata provası.

## Korunan mevcut çalışma alanları

Satış, demo ve kaynaklı yeterlilik merkezi `legacy.html` içinde korunmuştur. Mevcut `unigo-gazi-myys-v1` kayıtları silinmez. Yeni tanıtım ekranları ayrı `unigo-gazi-portal-v2` deposu kullanır. İki çalışma alanı arasında akademik onay ya da öğrenci kaydı otomatik taşınmaz. Referans merkezinin mevcut salt okunur API bağlantısı ve paketlenmiş yedek kaynağı korunmuştur; veri tabanı değiştirilmemiştir.

## Sınırlar

Örnek profiller kimlik doğrulama değildir. YZ skorları ve %10/%50 eşikleri tanıtım senaryosudur; mevzuata uyum garantisi değildir. Kamera/mikrofon, gerçek OBS/YÖKSİS/e-Devlet gönderimi ve kurum imzası yoktur. Kaynaklı merkezde mevcut yerel imza demosu ayrıca korunur.

## Kontroller

Masaüstü yedi ekran; paydaş arama; müfredattan inceleme ekranına öğrenme çıktısı aktarımı; sevk/ret; gözetmen notu; rozet JSON indirme; kuyruk hata/yeniden deneme; satış ve demo bağlantıları incelendi. 320 ve 390 px görünümlerinde yatay sayfa taşması yok. Hareket azaltma tercihi desteklenir.

## Öğrenci programları ve modüler dersler

`#/learning` ve korunan öğrenci çalışma alanındaki aynı sayfa, mevcut `unigo-gazi-myys-v1` öğrenme planını okur. Öğrenci rolünün başlangıç sayfasıdır. Altı mevcut örnek program için 22 modül ve 66 ders tanımlıdır; ilk plandaki P01/P06 için 8 modül ve 24 ders görünür. Her derste öğrenme çıktısı, kısa ders özeti, uygulama görevi, not ve kişisel tamamlama bulunur. Kurumca onaylanmış müfredat veya videolu eğitim değildir.

`learning-data.mjs` sürümlü, kararlı ders kimlikleri içerir. Yeni ve içeriği tanımsız programlar uydurma derslerle doldurulmaz. `learning-model.mjs` yalnız öğrencinin mevcut planındaki derslere işlem kabul eder. `unigo-gazi-learning-v1` deposu öğrenci/program/ders temelinde ayrıdır; eski başvuru, belge ve komisyon kayıtları değiştirilmez. Notlar alandan çıkışta kaydedilir; tamamlama geri alınabilir. En son depolanmış kayıt üzerinden güncelleme yapılır; farklı sekmelerdeki değişiklikler storage olayıyla okunur. Bozuk kaydın üstüne yazılmaz. Bu pilot, sunucu kimlik doğrulaması veya cihazlar arası ilerleme senkronizasyonu sağlamaz.

`learning.js`, aynı React bileşenini eski öğrenci paneline bağlar. `learning.css` ayrı ad alanıyla mevcut stilleri korur. `npm test` öğrenci izolasyonu, müfredat bütünlüğü, kayıt göçü, tersine alınabilen ilerleme, depolama hatası ve plan değişikliğini denetler.
