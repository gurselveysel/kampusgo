# Bağımsız kurumsal demo

Giriş: `/kurumsal-demo.html`. Canlı Gazi uygulamasına eklenen tek arayüz değişikliği, mevcut yan menüdeki **Kurumsal tanıtım demosu** bağlantısıdır.

Demo React, Tailwind CSS, Lucide, Framer Motion ve Radix bileşenlerini kullanır. Kaynaklar burada; yayımlanan dosyalar `/demo/portal.js`, `/demo/portal.css` ve `/demo/Unigo_Yonetici_Ozeti.pdf` içindedir.

## Geliştirme

Bu dizinde `npm ci`, `npm run build`, `npm test` komutları çalıştırılır. PDF, ReportLab ve DejaVu yazı tipleriyle `python scripts/report.py` kullanılarak üretilir.

## Veri ayrımı

- Demo anahtarı: `unigo-gazi-marketing-demo-v1`.
- Karşılama tercihi: `unigo-gazi-marketing-welcome-v1`.
- Ana uygulamanın `unigo-gazi-portal-v2` ve mevcut modüllerin `unigo-gazi-myys-v1` verileri okunmaz veya değiştirilmez.
- Demo yalnız sentetik veriler kullanır. Canlı YZ, kamera, YÖKSİS, e-Devlet veya kurum hizmeti bağlanmaz.
- Pilot formu yerel JSON taslağı üretir. Rapor formundaki e-posta saklanmaz veya gönderilmez.
- Dış lisans karşılaştırması varsayımsaldır; kurulum ve işletim maliyetleri hesapta ayrı gösterilir.
- Mevzuat eşikleri örnek politika değerleridir; kurumsal ve hukuki teyit gerektirir. Rozetler imzalanmamış örneklerdir.

## Yayın sınırı

Ana `index.html`, mevcut yollar, `legacy.html`, kurumsal referans verisi, orijinal görseller, güvenlik başlıkları ve alan adı ayarları korunmuştur. `demo-responsive-qa.html` yalnız önizleme denetimi içindir, üretim paketine eklenmez.
