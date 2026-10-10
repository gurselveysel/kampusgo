# Yayın doğrulaması — 10 Ekim 2026

- Canlı adres: https://gazi.unigoturkiye.com/kurumsal-demo.html
- Üretim yayını: `dpl_EKtTaNhBXAwz4feC6ZhstKUApLGW` (READY).
- Önceki sürüm / geri dönüş noktası: `dpl_3nNiGT7LJJx8di1oehiL6KpALc69`.
- Son önizleme: `dpl_PBS9qjDzRFW7pUaV7Hd7S8k3vdA6`.
- 20 mevcut canlı dosya SHA-1 düzeyinde korundu. Tek değişen mevcut yayımlanmış dosya `portal.js`; kaynak değişikliği mevcut menüye bir bağlantı ekler. `index.html`, `vercel.json`, referans verileri, eski modüller, resmî görseller ve ana uygulama durum modeli aynı kaldı.
- Üretime eklenen dosyalar: `kurumsal-demo.html`, `demo/portal.js`, `demo/portal.css`, `demo/Unigo_Yonetici_Ozeti.pdf`. Kaynak klasörleri, testler ve yeni mobil denetim sayfası üretime gönderilmedi.
- Otomatik testler: 43/43 başarılı. Her iki uygulama derlendi.
- Tarayıcı: dokuz demo ekranı açıldı; karşılama penceresi, maliyet değişikliği (50.000 $ yıllık gider → 190.000 $ beş yıllık fark), paydaş sekmesi/arama, müfredat, kurul sevki, gözetim başlat/duraklat, rozet seçimi ve 503 sonrası başarılı ikinci aktarım denemesi doğrulandı.
- Veri ayrımı: demoda bekleyen başvuru sayısı 2'ye düştükten sonra ana panele dönüldü; ana panelde 3 başvuru kaldı. Ana uygulama verilerine yazılmadı.
- Mobil görünüm: 390 ve 320 piksel çerçevelerde belge genişlikleri sırasıyla 375/375 ve 305/305; yatay taşma yok. 320 piksel menü ve rozet ekranı da doğrulandı. Mobil pilot düğmesi kısaltıldı; erişilebilir etiketi tam metindir.
- PDF sunucudan HTTP 200 / application/pdf ile alındı; 48.828 bayt ve SHA-1 `70cc169c219acd5cc0593fdbd235c2aecbf857f5` yerel dosyayla eşleşti. Tarayıcı otomasyonunun indirme olayı hata verdiğinden indirme-sonuç beyanı kullanılmıyor; kullanıcıya doğrudan yeni sekmede açma bağlantısı da sunuluyor.
- Canlı ana menüden demo bağlantısı ve karşılama akışı doğrulandı. Ekran görüntüsü: `UniGO_MYYS_Canli_Demo.jpg`.
- GitHub kaynak gönderimi otomatik inceleme tarafından reddedildi: kullanıcı canlı site eklemesini onayladı, herkese açık kaynak paylaşımını ayrıca onaylamadı. Tekrar denenmedi. Yerel commitler mevcut; GitHub'a gönderilmedi. Daha dar kapsamlı, yalnız çalıştırılabilir statik dosyaların Vercel yayını başarıyla tamamlandı.

Gerçek kurum servisleri bağlı değildir. E-posta saklanmaz/gönderilmez. Canlı Gazi alan adı, DNS, kimlik doğrulama, veri tabanı veya Dumlupınar sitesi değiştirilmedi.
