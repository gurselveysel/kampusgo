# Kademeli yayın kaydı — 10 Ekim 2026

## Paket 1 — korumalı akademik çalışma alanı

- Yetki: kullanıcının 10 Ekim 2026 13:50:07 Türkiye saati kademeli yayın talimatı.
- Proje: `prj_cZMPrJHrk7XrteeM7jeui2BktKwK` / `gazi-unigo-myys`.
- Ekip: `team_QH2k9edmHSXuybZK3Ay9RVAo`.
- Dal: `feat/gazi-myys-governed-core-20261010`.
- Kaynak commit: `37704e15a4ef43f70b0d6f46eaa192fca43775e8`.
- Kaynak ağacı: `524cc9f0a9325859cb4dc55890083e42ae7def6c`; yerel ve uzak birebir eşleşti.
- Yerel ara commitler `979ae9ae94835851dcccf676f934b295cd603ddc` ve `719d43e4032b346be651a156b867ccbbd8513c0a`, `checkpoint/gazi-myys-local-719d43e` dalında korunur.
- Dağıtım: `dpl_FJBzrCUuxD93XssE2rmrNGubRDYM`, READY / production.
- Alias: `gazi.unigoturkiye.com`.
- Paketleme: mevcut korumalı 115 sunum dosyası, gateway ve gerekli sunucu modülleri; toplam 133 dağıtım dosyası. Yerel test sunucusu ve fixture hesapları yayımlanmadı.

### Test ve gerçek canlı kontrol

- 29 yerel çekirdek/LMS/sicil, 15 mevcut erişim/rozet, 1 yeni gateway kapı testi geçti.
- 21 mevcut portal ve 28 mevcut model/kaynak testi geçti; derleme başarılı.
- Mevcut ders içerikleri, öğrenme modelleri, eski rol modelleri ve rozet kriptografi dosyaları `ffae561ebe5120f7d063d929b8b4954829ba0adc` ile birebir korundu.
- Güvenli giriş sonrasında desteklenen CUA Chrome sekmesinde ana panel açıldı. Giriş değeri model tarafından görülmedi veya kaydedilmedi.
- `#/academic`: yeni başlık ve “Kurum bağlantısı bekleniyor” durumu görüldü. Yeni üretim akademik işlemleri kapalıdır.
- `#/learning`: iki mevcut öğrenci programı, modüller, ders materyali sekmeleri ve görev/not alanı görüldü; kayıt değiştirilmedi.
- `#/badges`: mevcut pilot rozet alanı ve Cüzdan ve sicil görünümündeki imzalı/iptal kayıtları açıldı; ihraç veya iptal yapılmadı.
- Dağıtımın son 15 dakika hata/fatal log sayımı boş döndü. Bu sınırlı gözlem sürekli izleme veya tam test değildir.
- Masaüstü kapalı görünüm incelendi. Yerel Chromium eksik; standart indirme geçersiz arşiv döndürdü. Bulut tarayıcı Linux loopback portuna erişemedi. Tam yerel rol akışı, mobil ve ekran okuyucu kabulü tamamlanmadı.

### Geri alma

Hedef: `dpl_38cDvWWLANqJHMM2u6PTsj34iobu` (kaynak `ffae561ebe5120f7d063d929b8b4954829ba0adc`). Mevcut Vercel projesinde bu dağıtıma rollback yapılabilir. Bu pakette üretim migration'ı veya kalıcı kurum verisi değişikliği yoktur.

## Paket 2 — kullanım rehberi ve eğitim

Hazırlanan kapsam: dokuz sorumluluk grubu, altı bölüm, senaryo soruları, sürümlü kişisel çalışma ilerlemesi ve sık sorulan sorular. Başarı belgesi veya yetki üretmez. Dört yeni rehber testi ile portal toplamı 25/25. Kaynak, dağıtım ve canlı kabul sonucu yayın tamamlandığında aşağıya eklenir.
