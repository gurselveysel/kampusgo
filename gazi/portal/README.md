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
