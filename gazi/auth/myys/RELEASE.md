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

### Son canlı sürümle birleştirme

Yayın öncesi canlı alias yeniden okundu ve `dpl_FFtPAoJGT2aXLAD8KBLzPWykKqsx` / `d0b6c1216c2eea786a2667e94f129851e914f0e5` bulundu. Bu sürümün kurumsal kaynak, kalite, matris ve 11 sunum profili değişiklikleri birleştirildi. Çakışan kaynakta son canlı menü/profil/bağlam mantığı korundu; rehber eklemesi onun üzerine uygulandı. Derlenmiş dosyalar yeniden üretildi. Birleşik testler: 39 portal + 45 sunucu/güvenlik + 32 eski model/kaynak = 116 geçti. Bu paket için yeni geri alma hedefi `dpl_FFtPAoJGT2aXLAD8KBLzPWykKqsx` olacaktır.

### Paket 2 gerçek yayın ve canlı kabul

- Kaynak commit: `b3262455a7d3d56b5ec712450554fa647f1cb21e`.
- Dağıtım: `dpl_GE3YCwmro6ZQEfsA8ZRRHrQtGHpL`, READY / production; `gazi.unigoturkiye.com` alias doğrulandı.
- Son canlı kurumsal pakete göre yalnız `private/portal.js` ve `private/portal.css` değişti; 133 kaynak dağıtım dosyası.
- Gerçek oturumda `https://gazi.unigoturkiye.com/#/guide`: yanlış yanıt ilerletmedi; doğru yanıt 1/6 oldu ve yeniden yüklemede korundu. Bilgi işlem ilgi alanı ve LMS araması doğru bölümü gösterdi. Enter ile açılan bölümün başlığına odak taşındı. Yatay taşma ve bozuk resim gözlenmedi.
- Masaüstü görsel kaydı: `libfile_403915da9ca0819185872ddd0bf6b94e`. Mobil/ekran okuyucu tam kabulü bu kontrolün kapsamı değildir.
- Son 15 dakikada dağıtıma ait error/fatal log sayımı boş; bu sınırlı gözlem kesintisizlik garantisi değildir.
- Geri alma: `dpl_FFtPAoJGT2aXLAD8KBLzPWykKqsx` / `d0b6c1216c2eea786a2667e94f129851e914f0e5`; önceki kurumsal paket korunur. Migration veya gerçek belge işlemi yapılmadı.

## B27 yerel geri dönüş provası — üretime açılış değildir

`node gazi/auth/scripts/myys-recovery-drill.mjs` yalnız geçici sentetik depoda çalışır. Yeni ve özel dizine SQLite snapshot alır; eski oturum bağlarını taşımaz. Ayrı saklanan SHA-256 özetiyle doğrulanmış baytlar yalnız yeni bir dizine geri yüklenir. Var olan depo üzerine yazılmaz. Özet imza değildir; yedek dosyası ve ayrı özetin güvenilir saklanması gerekir.

10 Ekim 2026 12:12:20 UTC provası: yedek 1,408 ms, geri dönüş 0,387 ms; 10 kişi, 10 üyelik, 6 akademik kayıt, 6 komut ve 6 denetim kaydı geri geldi; 0 oturum geri açıldı. Snapshot sonrasındaki 1 sentetik kayıt geri dönüş kapsamı dışında kaldı. Bu küçük yerel ölçüm üretim RPO/RTO taahhüdü değildir.

Dört yeni test: kanıt/karar/denetim/tekrar önleme kayıtlarının aynı kalması ve oturum reddi; bozuk yedek/eksik özet reddi; var olan hedefin korunması; üretim ortamı reddi. Sunucu testleri 49/49, önceki değişmeyen portal 39/39 ve model/kaynak 32/32 ile toplam 120 test. Bu araçlar `scripts/` ve `tests/` altında, canlı gateway paketinin dışındadır. Üretim deposu, kimlik sağlayıcı, anahtar kasası, kuyruk ve sözleşmeli RPO/RTO provası hâlâ açıktır.
