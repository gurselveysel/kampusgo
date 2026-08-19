# Test ve teslim raporu

Tarih: 19 Ağustos 2026  
Hedef ortam: Vercel Preview, Production NO-GO

## Otomatik kontroller

| Kontrol | Kapsam | Sonuç |
| --- | --- | --- |
| Kaynak söz dizimi | `src/app.js`, `data.js`, `workflow.js`, `supabase.js`, `server.mjs` | Başarılı |
| Yapı doğrulama | Zorunlu dosyalar, marka/görsel referansları, production sır taraması | Başarılı |
| İş akışı testi | Durum geçişi, denetim izi, pilot yeterlilik, geçersiz geçiş engeli | Başarılı |
| HTTP smoke | Ana belge ve WebP hero varlığı/MIME | Başarılı |
| Supabase güvenlik | RLS + FORCE RLS, salt-okunur grant, sentetik/simülasyon check'leri | Başarılı |

## Etkileşim kontrol listesi

- Rol seçici ve role göre navigasyon
- Program ve başvuru arama/filtreleme
- Program önerisi ve dış kazanım form doğrulaması
- Komisyon sekmeleri, gerekçe modali ve rol yetki sınırı
- Kalıcı durum değişikliği ve denetim izi kaydı
- Değerlendirme, entegrasyon, finans ve bildirim simülasyonları
- Cüzdan ve önizleme ortamı içi belge doğrulama
- Modal, toast, kaçış tuşu, skip-link ve görünür odak
- Logo/illüstrasyon yükleme, WebP optimizasyonu ve lazy-loading
- Responsive kurallar: 1440, 1024, 768 ve 390 px; tablo yatay kaydırma kapsayıcısı

## Canlı Preview tarayıcı kanıtı

Korumalı Vercel Preview dağıtımı, dört ayrı iframe ile tam hedef genişliklerde yüklendi. Dikey kaydırma çubuğu belge kullanılabilir genişliğinden 15 px düşürdüğü için ölçülen istemci genişlikleri sırasıyla 1425, 1009, 753 ve 375 px oldu.

| Dış hedef genişliği | Belge düzeyi yatay taşma | Pilot uyarısı | Kırık görsel |
| ---: | ---: | --- | ---: |
| 1440 px | 0 px | Görünür, tam metin | 0 |
| 1024 px | 0 px | Görünür, tam metin | 0 |
| 768 px | 0 px | Görünür, tam metin | 0 |
| 390 px | 0 px | Görünür, tam metin | 0 |

Canlı dağıtımda iki senaryonun toplam 20 adımı kullanıcı eylemleriyle yürütüldü. Yenileme sonrasında iki kart da `Tamamlandı • Simülasyon` durumunu korudu ve kalan “sonraki adım” düğmesi sayısı sıfırdı.

## Ana demo senaryoları

1. İç eğitici yeni programı gönderir; koordinatör/komisyon incelemesi, gerekçeli karar, katalog ve cüzdan adımları pilot durumda güncellenir.
2. Öğrenen dış kazanım formunu gönderir; deterministik analiz işaretleri, Komisyon görüşü ve ÖBİS/YÖKSİS aktarım deneme kaydı gerçek servis çağrısı olmadan izlenir.

## Bilinen pilot sınırları

- Etkileşimli pilot arayüzü bağımlılıksız HTML/CSS/ES module bileşenlerini korur;
  dağıtım ve kök yönlendirme katmanı Next.js 16 App Router ile çalışır. Tailwind'e
  geçirilmemiştir; mevcut tasarım tokenları ve erişilebilir bileşenler korunmuştur.
- Supabase uzak katmanı güvenlik nedeniyle salt-okunurdur; her tarayıcıdaki mutasyonlar izole `localStorage` çalışma alanında kalır.
- Gerçek QR kod, dijital imza, standart uygunluk testi, e-posta/SMS, ödeme, dosya aktarımı ve dış entegrasyon yoktur.
- Resmî mevzuat ve EK-1 alan şeması ayrıca yetkili kurumsal birim tarafından doğrulanmalıdır.
- Production deployment ve production branch yayını kapsam dışıdır. Özel alan adı
  yalnız Preview alias'ı olarak yapılandırılabilir.
