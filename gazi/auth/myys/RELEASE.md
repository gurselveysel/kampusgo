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

## Paket 3 — destek akışı ve kişisel verisiz destek özeti (aday)

- Kaynak commit: `abf8b2844480ddaffc6047fba4884eb03d7add21`; aynı içerikli yerel commit `998e050fd2063b54945eb77dbb5967618d79de00`. Ağaç: `51724ef61cfc605478c64c134ed72b064b0d8832`. CLI GitHub ağı ortam politikasıyla reddedildi; uzak kayıt mevcut GitHub bağlantısıyla yapıldı. Hiçbir commit silinmedi, reset/clean yapılmadı.
- Aday dağıtım: `dpl_FXdHBQGJMxprVV5K23vr3DAajNNT`, READY, preview, alias yok. Adres: `https://gazi-unigo-myys-2wcfcaoaj-info-64116029s-projects.vercel.app`.
- Üretime taşınmadı. Yayın öncesi referans ve geri dönüş hedefi `dpl_GE3YCwmro6ZQEfsA8ZRRHrQtGHpL` / `b3262455a7d3d56b5ec712450554fa647f1cb21e`. Terfi öncesi güncel canlı alias tekrar karşılaştırılmalı.
- 53 sunucu/güvenlik + 41 portal + 32 mevcut model/kaynak = 126 test geçti; derleme ve 115 korumalı arayüz dosyasının paketlemesi geçti. Toplam dağıtım kaynağı 134 dosya; önceki yayından 4 dosya değişti/eklendi.
- Yeni destek çekirdeği: kurum/birim/MFA/kategoriye bağlı görünürlük; yanıt, çözüm, yeniden açma, yetkili kuyruğa yönlendirme; değişmez tarihçe ve sürüm çakışması. Akademik not/kanıt/karar üzerinde işlem yapmaz. Kurumsal depo bağlı olmadığından üretimde etkin değildir.
- Rehberin destek özeti yalnız konu/ekran/etki seçimleriyle JSON hazırlar; kimlik veya serbest mesaj toplamaz, bilet göndermez.
- Tarayıcı: yerel `file:` protokolü bulut tarayıcı politikasıyla reddedildi; bu yol yeniden denenmedi. HTTPS adayda gerçek korumalı giriş ekranı görüldü. Güvenli giriş isteği zaman aşımıyla sonuçlandı; 10 Ekim 18:06 Türkiye saati sonrasında yeniden doğrulamada hâlâ giriş ekranı görüldü. İç arayüz kabulü ve gerçek canlı smoke henüz tamamlanmadı. Giriş veya güvenlik kapısı kaldırılmadı.
- 36 paketin beş ayrı kabul alanı `ACCEPTANCE-MATRIX.md` ve `backlog.json` içinde; tek kurumsal erişim eylem paketi `ACCESS-ACTIONS.md` içinde.

### Paket 3 — gerçek üretim yayını ve kabul (10 Ekim 2026)

- Kullanıcının “Hazır üçüncü paketi test edip yayımla” talimatı uygulandı. Kaynak: `abf8b2844480ddaffc6047fba4884eb03d7add21`.
- Üretim dağıtımı: `dpl_Z7TTNESTnkt4KnumMfi9hvBHGy3z`, READY; `gazi.unigoturkiye.com` alias doğrulandı. Oluşturulma: 18:24:01 UTC / 21:24:01 Türkiye saati.
- Yayın öncesi 53 sunucu/güvenlik + 41 portal + 46 mevcut model, kaynak, çalışma alanı ve demo testi = 140 geçti. Önceki 126 sayımına ek 14 mevcut regresyon testi dahil edildi. Derleme/paketleme başarılı; 134 dağıtım kaynağının tüm hash ve boyutları adayla eşleşti.
- Önizleme ile production ayrı TOTP anahtarları kullanacak şekilde belgeli. Preview kodu reddedildi; güvenlik değiştirilmedi. Önizleme iç arayüz kabulü tamamlanmış sayılmadı. Kişisel verisiz, dış sisteme yazmayan destek özeti kontrollü yayımlandı; aşağıdaki tarayıcı kabulü yayın sonrasında yapıldı.
- Mevcut gerçek Gazi oturumunda yeni rehber bölümü açıldı. Akademik itiraz / bilgi alma seçimleri, bağımsız inceleme açıklaması ve JSON indirmesi doğru. İndirilen dosyanın izinli 10 alanı ve `gonderildi:false` değeri kontrol edildi; kimlik, oturum veya öğrenme kanıtı alanı yok.
- Veri ve paylaşım konusu doğru sorumluyu gösterdi. Tab tuşu destek konusundan ilgili ekrana geçti; odak görünür. Masaüstünde yatay taşma ve bozuk resim yok. İlgili ekran bağlantısı akademik çalışma alanındaki kurum bağlantısı bekleniyor kapısına ulaştı. Gerçek akademik kayıt/belge oluşturulmadı.
- Ekran kanıtı: `libfile_2c81f84d11c88191acfd1d77e75f42f8`. Dağıtıma özgü son 15 dakika error/fatal log sayımı boş; sürekli izleme veya tam mobil/ekran okuyucu kabulü değildir.
- Geri dönüş hedefi doğrulandı: `dpl_GE3YCwmro6ZQEfsA8ZRRHrQtGHpL` / `b3262455a7d3d56b5ec712450554fa647f1cb21e`. Bu projede Vercel rollback ile önceki dosyalar geri alınabilir. Geri dönüş fiilen çalıştırılmadı; migration/veri değişikliği yok.

## B11 sonraki dilim — itiraz ve yeniden değerlendirme (henüz yayımlanmadı)

- `core.mjs`: bağımsız incelemeciye program hazırlayan da dahil edilmez. İtiraz/sonuç görünümü kurum/birim/kişi/MFA kapsamında; izinli inceleme eylemi sunucudan gelir.
- Açık itiraz aynı öğrenen kaydına başka değerlendirme veya karar açılarak aşılamaz. Yeniden değerlendirme ilgili inceleme kararına ve önceki değerlendirmeye bağlanır; ilk değerlendirici, karar sahibi, incelemeci, öğrenen veya program hazırlayan yapamaz. Eski gerekçeler silinmez; başarısız yeni puan onaylanmaz.
- `appeals-workspace.jsx`: ilk karar, öğrenenin gerekçesi ve bağımsız sonuç birlikte görünür. Yetki yoksa sonuç formu yok; serbest gerekçe React metni olarak kaçışlanır. Yeniden değerlendirme formu ilgili inceleme kaydını seçer.
- Dört yeni sunucu senaryosu + gerçek bileşenin üç sunucu render testi geçti. Güncel toplam: 57 sunucu/güvenlik + 44 portal + değişmeyen 46 model/kaynak/demo = 147. Portal derlemesi ve özel paketleme başarılı.
- Bu dilim yerel kod/test aşamasında. İzole tam rol tarayıcı kabulü, kurum itiraz usulü ve daha önce imzalanmış belgeyi değiştirme süreci açık. Gerçek IdP, kurumsal depo, LMS veya resmî belge yetkisi etkinleştirilmedi. Üretim sürümü Paket 3'tür.

## Paket 4 — B11 bağımsız rol tarayıcı kabulü (yayımlandı)

- Başlangıç uzak dalı `feat/gazi-myys-governed-core-20261010`, `584d04c5f16f08ab923c6d5bd2eaa23d21dc5634`; yerel `cb6bfa6691700e3be9ec7017814d6c800da71646`; iki ağacın kimliği `67cf27318206d3c4f96531263375bc9c633c12dd`. Çalışma başlangıcında temizdi. GitHub karşılaştırması kaynaklı `d0b6c1216c2eea786a2667e94f129851e914f0e5` dalının 6 commit geride ve ortak ata olduğunu doğruladı. Kaynaklı işlerin üstüne yazılmadı.
- Canlı başlangıç ve geri dönüş hedefi: `dpl_Z7TTNESTnkt4KnumMfi9hvBHGy3z` / `abf8b2844480ddaffc6047fba4884eb03d7add21`. Yayın öncesi alias yeniden denetlenir.
- B11 UI: eski karar, itiraz, bağımsız sonuç, bağlı yeniden değerlendirme ve yeni karar birlikte görünür. Sonuçlanan değerlendirmede tekrar karar formu gösterilmez; karar eylemi sunucudan gelir. Mobil uzun metin/kimlik sarımı ve seçili sekme işareti eklendi.
- Güncel 58 sunucu/güvenlik + 46 portal + 46 model/kaynak/demo testi = 150 geçti. 13 yerel tarayıcı kontrolü: 9 çekirdek rol/12 sentetik kişi, kalıcılık, öğrenen kapsamı, bağımsızlık reddi, itirazın belge hazırlığına etkisi, yeniden değerlendirme/karar zinciri, etiketler, Tab ve Home/End; 1440 ve 390 px görsel kontrol. Tam ekran okuyucu, tüm menüler veya gerçek kurum kabulü değildir. Kanıt: `acceptance/B11-20261010.json`.
- Önceki bozuk Playwright indirmesi tekrarlanmadı. npm `@sparticuz/chromium@138.0.2` yerel test çalıştırıcısı olarak kuruldu; arşiv sahipliği desteği olmadığı için normal arşiv çıkarımı kullanıldı. Tarayıcıda web güvenliği/site izolasyonunu kaldıran paket varsayılanları kullanılmadı. Uygulamanın Origin kontrolü ve loopback sınırı korundu.
- Korumalı paket 115 arayüz dosyası / 134 toplam dağıtım kaynağı. Canlı kaynak manifestine göre yalnız `myys/core.mjs`, `private/portal.js`, `private/portal.css` değişti; silinen dosya yok. Login/gateway/rozet/66 sunum/22 vaka dosyasının hash değerleri aynı. Test çalıştırıcısı, sentetik roller ve SQLite dosyaları dağıtıma alınmaz.
- `configuredCore()` Vercel ortamında kapalı. IdP, LMS, kurumsal depo, migration, gerçek kişiye rozet veya resmî belge açılmadı. B11 süre/moderasyon politikası ve önceden imzalanmış belge değiştirme yolu hâlâ açık.
- Kaynak kontrolü 10.10.2026: [Gazi 14.05.2026/2026-84 yönergesi](https://webupload.gazi.edu.tr/upload/12/2026/6/1/82f8ee64-fb9b-4507-9346-b6eb353ca4bd-onceden-kazanilmis-yeterlilikler-yonergesi-yayimlanan.pdf), Madde 4/e ve 10 okundu. Önceki öğrenmenin tanınması kapsamındaki komisyon ve iş günü usulleri, bütün mikro programlara otomatik genellenmedi; mevcut tek incelemeci rolü kurum komisyonu kabulü olarak sunulmadı. [W3C etiket rehberi](https://www.w3.org/WAI/tutorials/forms/labels/) kontrol edildi; alanların açık adları tarayıcıda sınandı.
- Güvenli browserAuth sonrası gerçek canlı panelde kaynak sürümü `2026.10.10.3`, 24 kaynak, 76 Gazi çıktı özeti ve 46 kalite alt ölçütü gözlendi. Bu yayın öncesi kontroldür; yayın sonrası smoke ayrıca kaydedilir.

### Paket 4 gerçek yayın ve canlı kabul

- Kaynak: `2743da31b6b6e278dfc13b27e8bc79145b708731`; yerel eş içerik commit: `d63291c644342c6ab2b7e6db3b8624d5663f1727`; ortak ağaç: `3d3481d448488ef276811172ead9783935148788`.
- Dağıtım: `dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV`, READY / production. Proje ve ekip yukarıdaki mevcut Gazi projesi; `gazi/auth` kökünden korumalı dosya paketi kullanıldı.
- Alias `gazi.unigoturkiye.com` yayından önce ve sonra okundu. Başka bir yeni sahip değişikliği görülmedi; kaynak dalı beklenen eski SHA koşuluyla ilerletildi. Reset, clean veya geçmiş silme yapılmadı.
- Dağıtımın 134 dosyasının SHA ve boyutları hazırlanan kaynak manifestiyle birebir eşleşti. Eksik/ek dosya veya hash uyuşmazlığı yoktu.
- Güvenli girişle açık oturumda sayfa yeniden yüklendi. `#/academic` → “Kurum bağlantısı bekleniyor”; `#/guide` destek ve kullanım rehberi açıldı. Gazi/ÜniGO görselleri yüklendi; masaüstü yatay taşma bulunmadı. Giriş koruması değiştirilmedi. Gerçek akademik işlem veya B11 canlı rol kabulü yapılmadı; çekirdek kasıtlı olarak kapalı.
- Bu dağıtıma özgü son 15 dakika error/fatal taraması boştu. Sınırlı smoke gözlemidir; sürekli izleme, tüm ekran kabulü veya kurum onayı değildir.
- Yayın kapsamı: 150 otomatik test + 13 izole tarayıcı kontrolü. Sonraki kaynak hazırlığının testleri bu dağıtımın testi gibi sayılmaz.
- Geri dönüş: `dpl_Z7TTNESTnkt4KnumMfi9hvBHGy3z` / `abf8b2844480ddaffc6047fba4884eb03d7add21` mevcut projede rollback hedefidir. Geri dönüş fiilen çalıştırılmadı. Migration veya gerçek akademik veri değişikliği yapılmadığı için bu pakette ters veri migration'ı yoktur.

## Sonraki dilim — B06/B07 kimlik sözleşmesi (kaynak hazırlığı)

`identity-contract.mjs`, `IDENTITY-CONTRACT.md`, `tests/myys-identity.test.mjs` eklendi.
29 yeni test ve tüm 87 sunucu/güvenlik testi geçti; değişmeyen 46 portal + 46 regresyon ile kaynak toplamı 179.
Sabit açık anahtarlarla OIDC ID Token doğrulama ve issuer/subject üzerinden mevcut kişiyi/üyeliği salt okuma çözümlemesi hazır. E-posta ve token rolü yetki vermez; ayrılma, rol değişimi, zaman sınırları ve anahtar rotasyonu testlidir.
Bu modül hiçbir canlı giriş yoluna bağlanmadı ve bu dilimde Vercel'e dağıtılmadı.
Kalıcı tek kullanımlık nonce tüketimi, Code/PKCE/state/callback, oturum/çıkış/iptal ve gerçek kurum depo adaptörü açık. B06/B07 tam kabul edilmedi.
Kaynak dayanağı OpenID Connect Core errata set 2, inceleme 10.10.2026; kurum MFA politikasına dönüştürülmedi. Özel erişim veya credential oluşturulmadı.


## Paket 5 — yerel kimlik isteği ve oturum yaşam döngüsü (yayımlandı)

- Başlangıç kaynak: uzak `2f58f210905fee96bfb4a38d18c423cb251f0d0e`, yerel `b19c2aa37db889afbc9b94f781f3edef51706c21`; ortak ağaç `d66d585eedbe04f12336664ba0a9870f13365373`. Temiz başlangıç ve canlı Paket 4 tekrar doğrulandı.
- B06/B07: yerel PKCE/state/nonce bağı, tek kullanımlık kalıcı istek, eşzamanlı claim, kısa ve kurum kapsamlı oturum, iptal/çıkış, gizli değer içermeyen denetim ve işlem geri alma.
- 114 sunucu + 46 portal + 46 regresyon = 206 test geçti. 13 B11 tarayıcı kontrolü yeniden geçti. Derleme, 115 korumalı arayüz dosyası paketleme ve diff kontrolü başarılı. Kanıt: `acceptance/B06-B07-20261010.json`.
- Hazırlanan dağıtım 136 dosya. Paket 4'e göre yalnız `myys/store.mjs` değişti; `myys/identity-contract.mjs` ve `myys/identity-flow.mjs` eklendi. Portal, login/gateway, rozet ve ders materyalleri aynı. Testler, devam metni, sentetik anahtarlar ve SQLite dosyaları dağıtıma alınmaz.
- Bu paket kurumsal SSO açılışı değildir. Yeni akış Vercel ortamında ve loopback dışı dönüş adresinde reddedilir; hiçbir HTTP giriş yoluna bağlanmaz. `configuredCore()` kapalıdır. Üretim migration, kalıcı credential veya gerçek kişi belgesi yoktur.
- Geri dönüş hedefi Paket 4: `dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV` / `2743da31b6b6e278dfc13b27e8bc79145b708731`. Geri dönüş uygulanmadı. Yayın kimliği ve canlı sonuç aşağıya ayrıca kaydedilir.

### Paket 5 gerçek yayın ve canlı kabul

- Kaynak commit: `24b41c8dba48bfa261a51613fbbc3a83a7939f13`. Yerel aynı içerik: `f4e51c0577580872a35ff32bdf9d7a6f4e24948a`; ortak ağaç: `eaf0b9ad3cd18961891ae29444a8c6c3a6017e99`.
- Dağıtım: `dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg`; READY / production. Alias `gazi.unigoturkiye.com` bu dağıtıma bağlı. Kaynak ve proje kimliği dağıtım yanıtıyla doğrulandı.
- 136 kaynak dosyasının tamamı hazırlanan manifest ile SHA düzeyinde eşleşti; beklenmeyen veya eksik dosya yoktu. Önceki yayına göre yalnız üç sunucu dosyası eklendi/değişti; arayüz ve ders materyalleri aynı.
- Yeni yayında gerçek tarayıcı oturumu yeniden yüklendi; `#/academic` → “Kurum bağlantısı bekleniyor”, `#/guide` → rehber ve “Destek için hazırlanın” görünümü doğrulandı. Gazi ve ÜniGO görselleri yüklendi; masaüstü yatay taşma yoktu. Giriş koruması veya kurumsal etkinleştirme kapısı değiştirilmedi.
- Dağıtıma özgü son 15 dakika error/fatal gruplu sayımı boş döndü. Bu kısa gözlem sürekli izleme veya tam canlı kabul değildir. Yeni SSO akışı canlıda çalıştırılmadı; bağlı HTTP/IdP yoktur.
- 206 otomatik test ve 13 izole B11 tarayıcı kontrolü başarılı. Yeni kimlik akışının 27 testi sentetik provider ve yerel SQLite kapsamındadır. Gerçek IdP/dağıtık işçi/kurum kabulü değildir.
- Geri dönüş hedefi `dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV` / `2743da31b6b6e278dfc13b27e8bc79145b708731`. Geri dönüş çalıştırılmadı. Üretim migration'ı veya gerçek kişi/veri işlemi olmadığı için ters veri migration'ı yoktur.

## Paket 6 — B16/B17 olay işleme ve satır mutabakatı (yayın adayı)

- Başlangıç uzak commit `371cd686e9a8c6aa21e9a954bdf8aca6d2cac42f`, yerel `7bf599fe5912ba61d429f0c2ebbca3b00d32e28e`; aynı kaynak ağacı `6f96ee054e9502ec015257a57b2c2c3218e72027`. Temiz başlangıç, AGENTS.md bulunmadı. Güncel uzak dal ve canlı alias yeniden okundu.
- Kullanıcı ekranı: Kanıt ve Akademik Karar → Aktarım ve mutabakat; olay filtreleri, karantina inceleme, toplu karar/CSV seçimi, kalıcı satır sonuçları ve güvenli CSV indirme. Yalnız yerel kabulde kullanılabilir.
- 129 sunucu + 46 portal + 46 regresyon = 221 test; 8 yeni ve 13 B11 tarayıcı kontrolü. İki bağlantı, çökme/lease, denetim hatasında rollback, tekrar, yetki, CSV Türkçe ve 390 px mobil sınandı. Tam ekran okuyucu/kurum kabulü değil.
- configuredCore() Vercel'de kapalı; giriş koruması ve ders materyalleri korunur. Yeni credential, üretim migration, gerçek kişi/rozet işlemi yok.
- Geri dönüş hedefi Paket 5: `dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg` / `24b41c8dba48bfa261a51613fbbc3a83a7939f13`; geri dönüş uygulanmadı.
- İş paketi kapanışı değildir: B16 üretim/sağlayıcı kabulü ve B17 toplu imza/teslim açık.

### Paket 6 gerçek yayın ve canlı doğrulama

- Kaynak commit `e10989a9084c42f131a798d65da465f392bc8993`; yerel `1ca21010aedc180a7ba4964f84fec66b54fa75c1`; ortak kaynak ağacı `4ee5c8d2522bec6d19d1502f4d8339e3e1af2fdc`.
- Dağıtım `dpl_3QxBAAEiFAEoESH86QRaggCyjBj3`, READY / production; mevcut Gazi proje/ekibi ve `gazi/auth` paketlemesi. Canlı alias bu dağıtıma taşındı. 138 kaynak dosyası SHA düzeyinde birebir eşleşti; beklenmeyen/eksik dosya yok. Önceki yayına göre altı kaynak dosyası değişti/eklendi.
- Süresi dolmuş oturum korumalı girişe döndü. Desteklenen browserAuth ile giriş yenilendi; kod görülmedi/kaydedilmedi. Yeni oturumda 2026.10.10.3 kaynak sürümü, 24 kaynak/76 çıktı/46 kalite göstergesi ve logolar korundu. `#/academic` Kurum bağlantısı bekleniyor, `#/guide` Destek için hazırlanın kontrolü geçti. Masaüstü yatay taşma ve bozuk resim yok.
- 221 otomatik test + 8 yeni/13 B11 izole tarayıcı kontrolü; yeni kurumsal akış canlıda açılmadı. Bu sınırlı smoke tüm ürün/kurum kabulü değildir.
- Geri dönüş: `dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg` / `24b41c8dba48bfa261a51613fbbc3a83a7939f13`. Geri dönüş uygulanmadı; üretim migration yok.

## Paket 7 — kişisel cüzdan ve süreli paylaşım (yayın adayı)

- Panel: Kanıt ve Akademik Karar → Kişisel cüzdanım. Yalnız sahipte belge/hazırlık ayrımı, imzalı JWT indirme, 1 saat/1 gün/7 gün sınırlı özet bağlantısı, iptal ve süre durumları. İmzasız hazırlık belge indirme/paylaşma düğmesi sunmaz.
- Paylaşım anahtarı yeni işlem kayıtlarında saklanmaz; tekrar yalnız kaydın oluşturulduğunu bildirir. Kamu özeti beş izinli alanla sınırlı, kimlik/kanıt/puan/ham JWT içermez. Üyelikten ayrılma ve paylaşım iptali yeni erişimi keser; açık itiraz güncel durumu bloke eder.
- 138 sunucu + 46 portal + 46 regresyon = 230 test. 9 yeni sunucu senaryosu ve 8 yerel cüzdan tarayıcı kontrolü; 390 px görsel kontrol. Birden fazla tarayıcı bağlamının kapanış sırası test çalıştırıcısında düzeltildi; uygulama koruması değiştirilmedi.
- Kamu özet HTTP yolu yalnız izole çekirdek enjeksiyonunda işler. Production gateway oturum kapısı korunur ve configuredCore() kapalıdır. Gerçek belge/anahtar/kimlik üretimine dokunulmadı.
- Geri dönüş hedefi Paket 6: `dpl_3QxBAAEiFAEoESH86QRaggCyjBj3` / `e10989a9084c42f131a798d65da465f392bc8993`.

### Paket 7 gerçek yayın ve canlı doğrulama

- Kaynak `3388af9f1a9d9cdc7aedbd36a03ade8b4f264743`; yerel aynı içerik `ee63166a7cd050411fd70ab5ea2889b40e1d6ad3`; ortak ağaç `f1aaec5d01b79bd69b0eeb6094a33a18be3be25b`.
- Dağıtım `dpl_5byPykXgobPQbncALGBs39kEQ4tk`, READY / production. `gazi.unigoturkiye.com` aliası bu dağıtıma bağlı; mevcut proje/ekip ve korumalı paketleme korundu.
- 139 kaynak dosyasının SHA değerleri eksiksiz eşleşti. Paket 6'dan yalnız beş kaynak dosyası değişti/eklendi; giriş, logolar ve ders materyalleri aynı.
- Gerçek açık oturum yeniden yüklendi: rehber ve Destek için hazırlanın alanı korundu. Akademik ekranda Kurum bağlantısı bekleniyor ve kurumsal depo/kimlik uyarısı doğrulandı. Görseller yükleniyor, masaüstü yatay taşma yok.
- 230 otomatik test + 8 yerel cüzdan tarayıcı kontrolü. Cüzdan/anonim paylaşımın gerçek kurum kabulü yapılmadı; configuredCore() ve kamu kurumsal hizmeti kapalıdır. B18 tam kapanışı değildir.
- Geri dönüş hedefi `dpl_3QxBAAEiFAEoESH86QRaggCyjBj3` / `e10989a9084c42f131a798d65da465f392bc8993`; geri dönüş uygulanmadı, üretim migration yok.


## Paket 8 — program sürümü ve karar dayanağı (yayın adayı)

- Kanıt ve Akademik Karar → Program sürümleri: arama, çoklu Öğrenme Çıktısı/görev/rubrik yazarlığı, önceki sürümden gerekçeli yeni sürüm, karşılaştırma. Akademik kararlar → Kararın dayanaklarını indir.
- 240 otomatik test ve 8 yeni tarayıcı kontrolü. Eski öğrenen/karar yeni sürüme taşınmaz; arşiv hash'i itirazda bile tarihsel içeriği korur. Yerel arşiv imzasız; B09 imzalı dış kaynak kabulü hâlâ açık.
- Korumalı 115 arayüz dosyası, configuredCore() kapalı, gerçek veri/migration/credential işlemi yok. B03/B09 kabul ölçütleri değişmedi.
- Geri dönüş hedefi Paket 7: `dpl_5byPykXgobPQbncALGBs39kEQ4tk` / `3388af9f1a9d9cdc7aedbd36a03ade8b4f264743`.

Paket 8 yayını öncesinde B11’in 13 izole tarayıcı kontrolü tekrar geçti; önceki itiraz/yeniden değerlendirme/karar zinciri korunuyor.

### Paket 8 gerçek yayın ve canlı doğrulama

- Uzak kaynak `bcb89ab08e35979df903262eb2be6adb4d617c37`; yerel `4f41f862f90216b59da32a65dae8d4cf8e3f2717`; aynı ağaç `c0c0ac1a06bb331cbf7e6b0bb290b6670a9f75bd`.
- Dağıtım `dpl_7PvY4GxTK9fKBN51R7qbd2xHboGJ` READY / production; canlı alias bu dağıtıma bağlı. 141 kaynak dosyası SHA düzeyinde eksiksiz eşleşti; yedi kaynak dosyası değişti/eklendi.
- Gerçek açık oturum yeniden yüklendi. Akademik ekranda kurum bağlantısı kapalı, kaynak merkezinde sürüm 2026.10.10.3 ve 24 kaynak başlığı korundu. Logolar yükleniyor, masaüstü taşma yok. Yeni akademik işlemler canlıda etkinleştirilmedi.
- 240 otomatik test, 8 program ve 13 B11 tarayıcı kontrolü geçti. B03/B09 kısmi kalır; kurum ve imzalı dış kaynak kabulü açık.
- Geri dönüş `dpl_5byPykXgobPQbncALGBs39kEQ4tk` / `3388af9f1a9d9cdc7aedbd36a03ade8b4f264743`; uygulanmadı. Üretim migration veya gerçek akademik veri işlemi yok.


## Paket 9 — yerel tanıma ve kredi (yayın adayı)

- Panel: Kanıt ve Akademik Karar → Tanıma ve kredi. Sürümlü politika, dosya özetli talep, insan teknik incelemesi, tam/kısmi/red, itiraz ve bağımsız yeni karar; tek etkin kredi defteri.
- 162 sunucu + 46 portal + 46 regresyon = 254 test; 14 yeni tanıma senaryosu ve 12 yerel tarayıcı kontrolü. Mobil 390 px, tekrar yükleme, başka öğrenci/IT sınırı, görevler ayrılığı, paydalar, çift sayım ve rollback testli.
- Gerçek dış belge doğrulaması/teslimi, kurum kararı veya OBS işlemi yok. configuredCore() kapalı. Çok dersli teklif ve özel istisna kaynakları açık; B20/B21 tam kapanışı değildir.
- Geri dönüş hedefi Paket 8 `dpl_7PvY4GxTK9fKBN51R7qbd2xHboGJ` / `bcb89ab08e35979df903262eb2be6adb4d617c37`; uygulanmadı.

### Paket 9 gerçek yayın ve canlı doğrulama

- Uzak `b4e3b2dca07ff3a34bf4b5924f948bfacbc848eb`; yerel `a915b8c85c967d69969580c18a27ecdad1b544db`; ortak ağaç `670a6a28d611b6eab9f9181cc522116d220c04e9`.
- Dağıtım `dpl_HSfAwnVABknt9kGv61x6zn6aSzxB`, READY / production; canlı alias bu dağıtıma bağlı. 142 kaynak dosyası eksiksiz SHA eşleşti. Paket 8'den üç kaynak dosyası değişti/eklendi; giriş ve içerikler aynı.
- Açık gerçek canlı oturum yeniden yüklendi; kaynak 2026.10.10.3, kapalı akademik kurum bağlantısı, yüklenen logolar ve taşmayan masaüstü doğrulandı. Tanıma/kurum kredi hizmeti açılmadı.
- 254 otomatik test ve 12 yerel tanıma tarayıcı kontrolü. B20/B21 tam kabul değildir; gerçek belge, kurum kurulu, önceki ders kaynağı ve OBS bağlantısı açık.
- Geri dönüş `dpl_7PvY4GxTK9fKBN51R7qbd2xHboGJ` / `bcb89ab08e35979df903262eb2be6adb4d617c37`; geri dönüş uygulanmadı. Üretim migration ve gerçek akademik işlem yok.


## Paket 10 — OBS hazırlık ve mutabakat (yayın adayı)

- Panel: Aktarım ve mutabakat → OBS aktarım hazırlığı ve mutabakat. Yetkili kredi hazırlığı, yerel alındı örnekleri, red/uyuşmazlık, bağlı düzeltme ve CSV.
- 265 otomatik test; 11 yeni sunucu, 11 OBS tarayıcı ve yeniden 8 B16/B17 tarayıcı kontrolü. Mobil 390 px ve rol sınırları geçti.
- Gerçek ağ çağrısı/OBS kaydı yok; bütün durumlar yerel simülasyon. configuredCore() ve Vercel alındı simülatörü kapalı. Kimlik bilgisi, migration veya gerçek akademik işlem yok.
- Geri dönüş Paket 9: `dpl_HSfAwnVABknt9kGv61x6zn6aSzxB` / `b4e3b2dca07ff3a34bf4b5924f948bfacbc848eb`.

### Paket 10 gerçek yayın ve canlı doğrulama

- Uzak kaynak `d9b4b2e19b92c1d668e8fd98f7b83f00a77e0f2f`; yerel `ffe6e3ccd796f8eae2c703453f4f64c06c49c685`; ortak ağaç `5de76cf00a0eb87c59043cc46f77f0f5f6d7aaee`.
- Dağıtım `dpl_HZAgv61QLs3rYpLa7fxXYNFEcs64`, READY / production. Canlı alias bu dağıtıma bağlı; 143 kaynak dosyası eksiksiz SHA eşleşti. Üç dağıtım kaynağı değişti/eklendi; korumalı gateway, logolar ve ders içerikleri aynı.
- Gerçek canlı oturum yeniden yüklendi: Kurum bağlantısı bekleniyor kapısı korundu. İlk anda yüklenmekte olan görsel tamamlandı; son kontrolde bozuk resim ve yatay taşma yok. Rehberde Destek için hazırlanın görünümü doğrulandı.
- 265 otomatik test; 11 OBS ve 8 B16/B17 tarayıcı kontrolü. Gerçek OBS/veri aktarımı yapılmadı; B22 kısmi kabul. configuredCore() kapalı.
- Geri dönüş `dpl_HSfAwnVABknt9kGv61x6zn6aSzxB` / `b4e3b2dca07ff3a34bf4b5924f948bfacbc848eb`; uygulanmadı. Migration, gerçek kişiye belge veya hesap işlemi yok.


## Paket 11 adayı — B28

Veri talepleri ekranı: kişisel özet, talep/ayrı gerekçeli yanıt/görüntüleme, cüzdan paylaşımını geri çekme, süresi dolmuş yerel oturum temizliği. 184 sunucu + 46 portal + 46 regresyon = 276 otomatik test; 11 tarayıcı kontrolü. 390 px taşma ve klavye seçimi geçti. Akademik kayıt/hesap silinmedi; resmî başvuru, tebligat ve fiziksel imha kabulü yok. B04/B28 açık koşullar PRIVACY-CONTRACT.md ve backlog.json içinde.

### Paket 11 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak: `8da2a5974e3dd74f77c552bf626b45a7cd7555f3`.
- Aynı içerikli yerel: `910443b991c7dc0d2b796bc8913960bc21a1c23c`; ortak ağaç: `8108991b6af1b951d170ee8afb1c62d35e17fc66`.
- Dağıtım: `dpl_87Cjjpijbg7pNXxi6KhtWEhuS67m`; READY / production; canlı alias aynı dağıtımı gösterdi.
- 144/144 kaynak dosyası hash eşleşmesi; eksik/fazla yok. Değişen paket dosyaları core/http/privacy ve portal.js. Giriş kapısı/logolar/ders materyalleri değişmedi.
- Gerçek canlı oturumla yeniden yükleme: akademik bağlantı kapalı başlığı göründü; bozuk görsel ve yatay taşma yok. 276 otomatik + 11 yerel tarayıcı kontrolü.
- B28 ekranının kaynak kodu yayımlandı; gerçek kurumsal talep/temizlik/tebligat hizmeti açılmadı. configuredCore Vercel'de kapalı. Üretim migration/erişim/silme yok.
- Geri dönüş hedefi Paket 10: `dpl_HZAgv61QLs3rYpLa7fxXYNFEcs64`; fiilen uygulanmadı.


## Paket 12 adayı — B29

Başvurular, kaynaklı göstergeler ve cüzdan teslim teyidi. 194 sunucu + 46 portal + 46 regresyon = 286 otomatik test; 11 gösterge tarayıcı ve 8 cüzdan regresyon kontrolü. Başvuru-kabul-kayıt bağı, açık LMS tamamlama, ayrı başarı/teslim/destek paydaları, filtre ve kaynak CSV mutabakatı yerelde geçti. Gerçek kohort, LMS ve dış belge kabulü açık; bütün B29 kabulü kapanmadı.

### Paket 12 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak `770c9bf26283c338964f4f08c98bde77a2e9cb18`; yerel `42d91b178043cb8240acbc53cad796f3abcedf60`; ortak ağaç `98dd89ebb717f5db8b5db58cb5e0695d1a0a5541`.
- Dağıtım `dpl_9kkNdKVj1n3YSnaUXhvDK31RZuYt`, READY / production; gazi.unigoturkiye.com aynı kaynağa bağlı. 146/146 kaynak hash eşleşti; fazla/eksik yok.
- Canlı oturum süresi dolmuştu; yalnız browserAuth güvenli formuyla yenilendi. Giriş sonrası gerçek canlı akademik kapalı durum, yardım/rehber, logolar ve taşmasız görünüm doğrulandı. Kod veya credential okunmadı/kaydedilmedi.
- 286 otomatik test, 11 gösterge + 8 cüzdan tarayıcı kontrolü. Başvurular/kaynaklı göstergeler ve yerel teslim teyidi kaynak kodu yayımlandı; gerçek LMS/kohort/dış belge kabulü açılmadı. configuredCore Vercel'de kapalı.
- Geri dönüş Paket 11: `dpl_87Cjjpijbg7pNXxi6KhtWEhuS67m`; fiilen uygulanmadı.


## Paket 13 adayı — B30

Kontrollü grup kabulü ekranı: sürümlü plan, görev bazlı koşullar, ayrı üç inceleme, kaynak zinciri, kritik hata/bağımsız çözüm, yerel açılış ve dönem/kapanış. 204 sunucu + 46 portal + 46 regresyon = 296 otomatik test; 12 yeni tarayıcı kontrolü. Gerçek kurum grubu ve dönem gözlemi yapılmadı; bütün B30 kabulü kapanmadı. COHORT-CONTRACT.md sınırları ve backlog eksenleri güncel.

### Paket 13 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak `61331bca1119a83ca776d0c13b39b376ee0152c1`; yerel `e77365b6952d2e717d348cf4a87b334ab2549ed7`; ortak ağaç `727909faa7ddef88ca1bdab4169c31e206fd3d4f`.
- Dağıtım `dpl_2oSrWPd32ifowdTtirzLmaQpDxAA` READY / production. Canlı alias aynı dağıtıma bağlı; 148/148 kaynak hash eşleşti, eksik/fazla yok.
- Gerçek canlı yeniden yüklemede kapalı kurum akademik görünümü doğrulandı; bozuk görsel veya yatay taşma yok. Giriş/logolar/ders içeriği korunuyor.
- 296 otomatik test + 12 grup kabul tarayıcı kontrolü. Yerel grup planı/koşullar/üç ayrı inceleme/kritik hata/dönem/kapanış kodu yayımlandı. Gerçek kohort açılmadı; configuredCore Vercel'de kapalı.
- Geri dönüş Paket 12 `dpl_9kkNdKVj1n3YSnaUXhvDK31RZuYt`; fiilen uygulanmadı.


## Paket 14 adayı — B04

Akış ve saklama ekranı: sicile bağlı ülke/rol/aşama/süre, ayrı yönetici incelemesi, silmeden önizleme ve ayrı BT ile atomik yerel temizleme. 214 sunucu + 46 portal + 46 regresyon = 306 otomatik test; 12 tarayıcı kontrolü. Coursera aşamaları ayrıdır; ülke seçimi aktarım izni değildir. Gerçek saklama kararları, üretim işçisi ve fiziksel imha kabulü açık. Başlangıç B01–B36 kimlik/bağımlılık/kabul ölçütleri değişmedi.

### Paket 14 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak `e335aa4ec1370b14ab287502e2d6e254e4e39703`; yerel `030d497aa6c8107e2cb885996b7c26e8bc869a84`; ortak ağaç `d3a905cbc3ab313b4eb1d14684d6c76c2af95d4a`.
- Dağıtım `dpl_4WUwrpKjZt4CLZLKA2k5WgSTNNR2`, READY / production; canlı alias aynı kaynağa bağlı. 150/150 kaynak hash eşleşti, eksik/fazla yok.
- Canlı yeniden yükleme sonrası kapalı kurum görünümü, sağlam görseller ve taşmasız yerleşim doğrulandı. Giriş/logolar/ders içeriği korundu.
- 306 otomatik + 12 saklama tarayıcı kontrolü. Akış/saklama ekranı kaynak kodu yayımlandı; gerçek hukuk/kurum kabulü veya üretim temizleme hizmeti açılmadı. configuredCore Vercel'de kapalı.
- Geri dönüş Paket 13 `dpl_2oSrWPd32ifowdTtirzLmaQpDxAA`; fiilen uygulanmadı.


## Paket 15 adayı — B06/B08

Kişi ve üyelik ekranı: süreli görev/geri çekme önerisi, ayrı yönetici incelemesi, sürüm özeti ve aynı kurum oturumlarının atomik iptali. Kurum bağı olmayan eski oturum reddedilir. 228 sunucu + 46 portal + 46 regresyon = 320 otomatik test; 11 yeni ve 13 B11 tarayıcı kontrolü. Akademik geçmiş ve başka kurumlar korunur. Gerçek kurum provizyonu/üretim depo/dağıtık iptal ve tam B08 birim matrisi açık; bütün paketler tamamlanmadı.

### Paket 15 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak `fdce77408937dc9459ece2cf25611e5ccfc025bb`; yerel `e30dd62b95f319072242e381ae96e494e052480e`; ortak ağaç `ed135ad036edbb4d206b6bd160067dbac5e4d309`.
- Dağıtım `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`, READY / production; canlı alias aynı kaynağa bağlı. 152/152 kaynak hash eşleşti; eksik/fazla yok.
- Gerçek canlı yeniden yüklemede kapalı kurum görünümü, sağlam görseller ve taşmasız yerleşim doğrulandı. Giriş koruması, logolar ve dersler korundu.
- 320 otomatik test, 11 üyelik ve 13 itiraz tarayıcı kontrolü. Kişi/üyelik ekranı kaynak kodu yayımlandı; gerçek kişi provizyonu/kurum yetkisi/üretim oturum yönetimi açılmadı. configuredCore Vercel'de kapalı.
- Geri dönüş Paket 14 `dpl_4WUwrpKjZt4CLZLKA2k5WgSTNNR2`; fiilen uygulanmadı.


## Paket 16 adayı — B12

Belge profilleri ve ihraç hazırlığı: zorunlu program/karar/profil/ayrı yetki sicili bağı, süreli kişi ataması, ayrı komisyon incelemesi, sürüm ve durdurma. Sentetik rozet laboratuvarı açıklaması ve yetki alanı reddi eklendi. 240 sunucu + 46 portal + 46 regresyon = 332 otomatik test; 11 yeni profil, 13 itiraz, 8 cüzdan tarayıcı kontrolü. YÖK tam metnine tekrar erişilemedi; eski kamu özeti korundu. Gerçek kurum/issuer kabulü, üretim imza/durum ve bağımsız standart doğrulaması açık.

### Paket 16 — doğrulanmış güvenli kaynak yayını

- Uzak kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; yerel `9d8a858f150c73f45a3cc375b2b332f8bb0661cf`; ortak ağaç `8526203f45f9a4bd052b5c9d64fdd2c8d190a30f`.
- Dağıtım `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, READY / production; canlı alias aynı kaynağa bağlı. 154/154 kaynak hash eşleşti; eksik/fazla yok.
- Gerçek canlı kapalı kurum görünümü, sağlam görseller, taşmasız yerleşim, yeni sentetik rozet laboratuvarı açıklaması ve akademik bağlantısı doğrulandı. Giriş koruması kaldırılmadı.
- 332 otomatik test, 11 profil + 13 itiraz + 8 cüzdan tarayıcı kontrolü. Profil sürümü/bağımsız inceleme/atanmış düzenleyici/ihraç bağı kaynak kodu yayımlandı; akademik akış yalnız yerel kabulde. configuredCore Vercel'de kapalı.
- Geri dönüş Paket 15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; fiilen uygulanmadı. B12 bütünü veya 16 iş paketi tamamlanmış değildir.

## Paket 17 adayı — B13

Anahtar ve belge durumu ile imza/cüzdan bağlantısı. 344 otomatik ve 11 yeni tarayıcı kontrolü. Açık anahtar kayıt/inceleme/rotasyon/ele geçirilme provası yalnız yerel sentetik ortamda; üretim anahtarları değişmedi. Durum listesi ve bağımsız doğrulama sonraki dilimde.

### Paket 17 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `a3b181a7a40ee0ad5c783a04589f07ee4b3786e7`; uzak `c3b769e36195e644a2d099b9b3aa9fa8d165a0f9`; aynı kaynak ağacı `2bd5066ea2c263282a67ad5b5badd75acbb365f9`.
- Kaynak eşitlemesi üretim yayını değildir. Yeni dağıtım oluşturulmadı. Canlı alias yeniden doğrulandı: Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, READY.
- Canlı oturum süresi doldu; browserAuth güvenli giriş isteği kullanıcı tarafından iptal edildi. Yeni istek otomatik tekrarlanmaz; oturum koruması aşılmaz. Paket 17 canlı smoke açık kalır; bağımsız geliştirme sürer.
- Yerel 344 otomatik + 11 anahtar + 8 cüzdan + 13 itiraz kontrolü 2026-10-10'da geçti; sonuçlar 2026-10-13 canlı kabulü diye sunulmaz.

## Paket 18 kaynak adayı — B13/B19 (2026-10-13)

Anahtar ekranında durum listesi/güven sicili ve cüzdanda doğrulama paketi. 357 otomatik test; yeni tarayıcı ihracı ayrı Python/OpenSSL aracıyla sınanır. Üretim anahtarı veya gerçek kişi işlemi yok. Canlı yayın henüz yapılmadı; son doğrulanmış canlı Paket 16, Paket 17 yalnız kaynakta.

Paket 18 son yerel kanıt: 357 otomatik test; 16 durum/ihracat/Python-OpenSSL tarayıcı ve 8 cüzdan regresyon kontrolü geçti. 390 px görünüm incelendi. 36 özgün kimlik/başlık/bağımlılık/kabul ölçütü korundu.

### Paket 18 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `7fd97f81ae4a676485c41d4638b581e09ea3495e`; uzak `589f218e71725d33d429533a289564320a968b2e`; aynı kaynak ağacı `9244003e1a3ef0f4ba4660e618afb8243888194b`.
- 357 otomatik, 16 durum/ihracat/Python-OpenSSL tarayıcı ve 8 cüzdan kontrolü geçti. Uzak dal beklenen Paket 17 üzerine karşılaştırmalı güncellendi; geçmiş korunuyor.
- Yeni üretim dağıtımı yok. Son doğrulanmış canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` / kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; alias READY 13.10.2026'da yeniden doğrulandı. Canlı giriş kullanıcı iptali nedeniyle yeni smoke yapılmadı. Sonraki yayın Paket 17 ve 18 kaynak farkını birlikte kapsamalı; her dosyanın hash'i fiilî canlı paketle karşılaştırılmalı.

## Paket 19 adayı — B11 (2026-10-13)

Belge hazırlığı öneri/komisyon incelemesi/değiştirme/iptal/geçmiş ekranı. Yeni imza ve eski iptal atomik; eski dosyalar korunur. 368 otomatik + 17 yeni tarayıcı kontrolü. Sürümlü itiraz/moderasyon politikası açık; kurum yetkisi veya canlı etkinleştirme yok.

Paket 19 son yerel kabul: 368 otomatik; 17 değiştirme, 11 profil, 13 itiraz, 8 cüzdan tarayıcı kontrolü geçti. 390 px görünüm incelendi; özgün 36 iş kimliği/bağımlılığı/kabulü korunuyor.

### Paket 19 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `0cad4c688a8ddefb1cec8ea2252be93825a50067`; uzak `ee34cdee91c1ba17c9faabc0c474cfe363877619`; ortak ağaç `070ef5879f24858a09f072f9eccfaff28e017370`.
- 368 otomatik + 17 değiştirme + 11 profil + 13 itiraz + 8 cüzdan tarayıcı kontrolü geçti. 36 özgün iş kimliği, başlığı, bağımlılığı ve kabul ölçütü korundu.
- Kaynak güncellemesi üretim yayını değildir. Son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` / `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; 13.10.2026'da alias READY yeniden doğrulandı. Paket 17–19 dağıtımı oluşturulmadı; canlı auth kullanıcı iptali ve yeni smoke açık.
- Sıradaki bağımsız iş sürümlü itiraz/moderasyon politikası; tüm B01–B36 kabulü tamamlanmadı.

## Paket 20 kaynak adayı — B11 (2026-10-13)

İtiraz politikaları ve karar/itiraz süre incelemesi ekranları. 384 otomatik, 13 politika + 13 itiraz + 17 değiştirme tarayıcı kontrolü geçti; 390 px incelendi. 115 dosyalı mevcut korumalı paket üretildi. Üretim dağıtımı oluşturulmadı; son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, alias READY yeniden doğrulandı. Kaynak temel Paket 19 yerel `0cad4c688a8ddefb1cec8ea2252be93825a50067`, uzak `ee34cdee91c1ba17c9faabc0c474cfe363877619`, aynı ağaç `070ef5879f24858a09f072f9eccfaff28e017370`. Canlı auth kullanıcı iptali nedeniyle yeni smoke yok; tekrar auth isteme. Geri dönüş hedefi son doğrulanmış Package 16; geri dönüş uygulanmadı. Kaynak eşitleme kimlikleri doğrulandıktan sonra ayrıca kaydedilir.

### Paket 20 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `657ff02fd34c9390e1e737e92c7e939234758db7`; uzak `e9eb449d569a5bc1a82ccf3d75c5d97ee74b1aee`; aynı ağaç `ec7a31676eaa144f5370dbfea3e6a1c0c28849b1`. Uzak güncelleme beklenen Paket 19 üzerinden geçmiş korunarak yapıldı.
- 384 otomatik + 13 politika + 13 itiraz + 17 değiştirme tarayıcı kabulü. 36 özgün kimlik, başlık, bağımlılık ve kabul ölçütü korundu.
- Yeni üretim dağıtımı yok; son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`. Canlı auth kullanıcı iptali nedeniyle yeni smoke açık. B11 kurum usulü/tebliğ/takvim/yetki kabulü tamamlanmadı.

## Paket 21 kaynak adayı — B07 (2026-10-13)

Panelde yerel oturum/çıkış/yeniden giriş, ayrı sentetik site üzerinden HTTPS callback. 403 otomatik + 11 HTTPS + 13 itiraz tarayıcı kontrolü; 390 px incelendi. 115 dosyalı mevcut korumalı paket üretildi. Uzak temel e9eb449d569a5bc1a82ccf3d75c5d97ee74b1aee / yerel 657ff02fd34c9390e1e737e92c7e939234758db7 / ağaç ec7a31676eaa144f5370dbfea3e6a1c0c28849b1. Alias yeniden READY: son canlı dpl_Coaq5KN2VcNpPjwyXke4neroq877 / kaynak 16bd55eefed251ce5d23e1791f87ed3871c6a8c6 (Paket 16). Paket 17–21 dağıtımı oluşturulmadı; canlı auth kullanıcı iptali, yeni smoke açık. Geri dönüş hedefi son doğrulanmış Paket 16; uygulanmadı.

### Paket 21 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `797d0f044f89bfbff9c44938e6ae2edbbfb1b35a`; uzak `0ca90ca4e4d7328ee56ff27cc1091a38dade0c24`; ortak ağaç `75cc5a36e46484af22fcc231a2154b501c950b69`. Uzak dal expected-head ile ileri taşındı; geçmiş ve yeni kaynak korundu.
- 403 otomatik + 11 HTTPS/ayrı-site + 13 itiraz tarayıcı kabulü. 36 özgün iş kimliği/bağımlılık/kabul ölçütü korundu.
- Yeni üretim dağıtımı yok; son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` / `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, alias READY tekrar doğrulandı. Paket 17–21 canlı smoke açık; kurum bağlantısı kapalı.

## Paket 22 kaynak adayı — B08 (2026-10-13)

Görünür arayüz değişikliği yok; kapsam hataları ve tekrarlanabilir yetki matrisi. 415 otomatik test; 66 komut / 12 HTTP yolu / 21.248 türetilmiş kontrol. 115 dosyalı korumalı paket üretildi. Kaynak temel yerel 797d0f044f89bfbff9c44938e6ae2edbbfb1b35a / uzak 0ca90ca4e4d7328ee56ff27cc1091a38dade0c24 / ağaç 75cc5a36e46484af22fcc231a2154b501c950b69. Canlı alias yeniden doğrulandı: Paket 16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 / 16bd55eefed251ce5d23e1791f87ed3871c6a8c6 READY. Yeni dağıtım yok; auth kullanıcı iptali ve yeni smoke açık. Sonraki yayının geri dönüş hedefi Paket 16; geri dönüş uygulanmadı. Kaynak kimlikleri eşitlemeden sonra yazılır.

Paket 22 ek yerel kanıt: 12 saklama + 11 veri talebi tarayıcı kontrolü geçti; 390 px saklama görünümü incelendi. 36 özgün iş kimliği/başlık/bağımlılık/kabul ölçütü korundu.

### Paket 22 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `63a0fcfec1c14b50481f537def921ef06b236dcd`; uzak `dee6e4b8d68a166958b2c5c48f86df9c50a9a610`; ortak ağaç `1b6d46e6114280ce10c19de61ea79ec428006940`. Beklenen uzak başlık üzerinden geçmiş korunarak eşitlendi.
- 415 otomatik test, 12 saklama + 11 veri talebi tarayıcı kontrolü; mevcut 66 komut ve 12 HTTP yolu kapsam matrisi geçti. 36 özgün iş koşulu korundu.
- Yeni dağıtım yok; son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`. Canlı auth kullanıcı iptali nedeniyle yeni smoke açık. B08 gerçek görev/üretim kabulü açık.

## Paket 23 kaynak adayı — B10/B08 (2026-10-13)

Öğrenme kanıtları, Değerlendirmeler ve karar sürüm açıklaması güncellendi. 428 otomatik, 15 alternatif ölçme + 13 itiraz tarayıcı kontrolü; 390 px incelendi. 68 komut / 12 HTTP kapsam matrisi ve 115 dosyalı korumalı paket. Kaynak temel yerel 63a0fcfec1c14b50481f537def921ef06b236dcd / uzak dee6e4b8d68a166958b2c5c48f86df9c50a9a610 / ortak ağaç 1b6d46e6114280ce10c19de61ea79ec428006940. Yeni canlı dağıtımı yok. Son canlı Paket 16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 / 16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Auth kullanıcı iptali nedeniyle yeni smoke açık. Sonraki yayımın geri dönüş hedefi Paket 16; uygulanmadı.

### Paket 23 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-13)

- Yerel `42748e05904c05f5e3d5b1447181b4c17e86fd15`; uzak `a2032738b05ec46bbe60d488cbae55fd1427c780`; ortak ağaç `51f4c03507bbb684bd2ac50bec90950bd304a05c`. Beklenen uzak kaynak üzerinden geçmiş korunarak eşitlendi.
- 428 otomatik, 15 alternatif ölçme + 13 itiraz tarayıcı kontrolü; 68 komut/12 HTTP matrisi geçti. 36 özgün iş kimliği/bağımlılık/kabul ölçütü korundu.
- Yeni dağıtım yok; son canlı Paket 16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, alias READY yeniden doğrulandı. Auth kullanıcı iptali nedeniyle yeni smoke açık. Gerçek kurum alternatif ölçme/yetki ve üretim kabulü açık.

## Paket 24 kaynak adayı — B23/B08 (2026-10-14)

SEM dosyaları menüsü ve mobil kaynak/kontrol formları eklendi. 440 otomatik; 13 SEM +13 itiraz tarayıcı; 72 komut/12 HTTP kapsam matrisi. 115 dosyalı korumalı paket üretildi. Temel yerel 42748e05904c05f5e3d5b1447181b4c17e86fd15 / uzak a2032738b05ec46bbe60d488cbae55fd1427c780 / ağaç 51f4c03507bbb684bd2ac50bec90950bd304a05c. Yeni dağıtım yok. Son canlı Paket16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 / 16bd55eefed251ce5d23e1791f87ed3871c6a8c6; auth kullanıcı iptali ve yeni smoke açık. Sonraki yayımın geri dönüş hedefi Paket16; uygulanmadı. SEM resmi usul/merkezi düzenleyici/teknik şema ve kurum kabulü açık.

### Paket 24 — kaynak eşitlendi, canlı yayımlanmadı (2026-10-14)

- Yerel `9ecf625e4873586e3425d5e542fc9de868b7778e`; uzak `d256623050f34c353a7f7eeaba1ea0494de66c43`; ortak ağaç `3e29a1bc5bf457507a4800eeca687c2c451ec681`. Beklenen uzak başlık üzerinden geçmiş korunarak eşitlendi.
- 440 otomatik, 13 SEM +13 itiraz tarayıcı; 72 komut/12 HTTP kapsam matrisi geçti. 36 özgün iş kimliği/bağımlılık/kabul ölçütü korundu.
- Yeni canlı dağıtımı yok; son canlı Paket16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, alias READY yeniden doğrulandı. Auth kullanıcı iptali nedeniyle yeni smoke açık. Gerçek merkezi SEM kurum/teknik kabulü bekleniyor.

## Paket25 kaynak adayı — B07 (14.10.2026)

- Ekran: Akademik çalışma alanında sağlayıcı iptalinden sonra kapalı oturum/yeniden giriş; yerel girişte Türkçe kota bekleme sayfası. Yeni doğrulama aynı kişiyi ve itiraz kaydını korur.
- Yerel: imzalı sağlayıcı çıkışı, tenant/issuer/audience/sub/sid eşlemesi, tek makbuz, atomik audit/iptal, gecikmiş callback bariyeri, başka tenant tarayıcı bağının korunması ve kalıcı oran sınırı.
- Kabul: 372 sunucu +46 portal +46 regresyon =464; 15 HTTPS tarayıcı; 72 komut/12 HTTP, 2945 pozitif örnek ve 23560 türetilmiş kapsam kontrolü. 115 dosyalı korumalı paket üretildi. Kanıt B07-backchannel-20261014.json.
- Üretim transaction/anahtar adaptörü, çok işçi/region kabulü, gerçek IdP/MFA ve güvenlik kayıtlarının kurumsal saklama kabulü açık; B07 tamamlandı sayılmaz.
- 14.10.2026 alias sorgusu: dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, Paket16 değişmedi. Paket17–25 dağıtımı ve yeni korumalı canlı smoke yok; kullanıcı iptal ettiği browserAuth yeniden başlatılmadı. Rollback hedefi dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 değişmedi ve uygulanmadı.
- Kaynak eşitleme öncesi başlık d256623050f34c353a7f7eeaba1ea0494de66c43; eski dal yayımlanmaz. Tam yeni commit/ağaç kimlikleri eşitleme sonrasında bir sonraki kayıtla eklenir.

### Paket25 kaynak eşitlemesi

Yerel c09c116eeb12ac783151b4af4e665cdf5345abd6 / uzak 000fe90fca77b13b897484807689f9d0b13909f6 / ortak kaynak ağacı 9cae8895ea9726f98f504fa9a56a76416b476c51. 19 dosya SHA eşitliği ve tam ağaç eşitliği denetlendi; beklenen d256623050f34c353a7f7eeaba1ea0494de66c43 üzerinden geçmiş korunarak eşitlendi. Bu bir canlı yazılım yayını değildir.

## Paket26 kaynak adayı — B09/B15/B16/B08 (14.10.2026)

- Ekran: Aktarım ve mutabakat imzalı JSON seçimi/alımı/ayrı işleme/güven ihracı; Öğrenme kanıtları teslim sürümü; Akademik kararlar özgün kaynak imzalı dayanağı indirme. Yerel akış gerçek insan değerlendirmesi ve ayrı karara bağlıdır.
- 391 sunucu +46 portal +46 regresyon =483 otomatik; 14 kaynak ve 13 itiraz tarayıcı kontrolü. 72 komut/15 HTTP kapsam matrisi, 3086 pozitif örnek/24688 türetilmiş kontrol. Türkçe mobil dosya düğmesi incelendi; 115 dosyalı korumalı paket üretildi.
- Asimetrik kaynak imzası doğrulanır; dış karar zarfı imzasızdır. Kaynak güven sicili/iptal yaşam döngüsü, gerçek sağlayıcı sözleşmesi ve üretim depo/worker/geri yükleme kabulü açık. B09/B15/B16 tamamlandı sayılmaz.
- 14.10.2026 alias yine dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY / Paket16. Paket17–26 dağıtımı veya yeni korumalı canlı smoke yok; iptal edilmiş browserAuth yeniden istenmedi. Rollback dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı.
- Eşitleme tabanı uzak 000fe90fca77b13b897484807689f9d0b13909f6, yerel c09c116eeb12ac783151b4af4e665cdf5345abd6, ortak ağaç 9cae8895ea9726f98f504fa9a56a76416b476c51. Yeni kimlikler kaynak eşitlemesi sonrası eklenir.

## Paket26 kaynak eşitlemesi — 14 Ekim 2026

Yerel `aea164d471e2c208cdd34d6e20da4c50dd9b0021`; uzak `0a33084efd394fdd9c847b4ef7184e4e9be53ed3`; ortak ağaç `fe01101aba1f7dcd4ab9947ad093ee5f9377c1b9`. 25 dosyanın blob özeti ve bütün ağaç eşleştirildi; expected-head `000fe90fca77b13b897484807689f9d0b13909f6`, force=false. Canlı dağıtım yok; son canlı Paket16 ve geri dönüş hedefi değişmedi.

## Paket27 kaynak adayı — B27/B07/B13/B16/B08 (14.10.2026)

Kurtarma tatbikatları ekranı: plan → sunucu sentetik provası → ölçüm/indirme → ayrı yönetici incelemesi. Eski/bozuk yedek, oturum/iptal, kesilen kuyruk/tek makbuz, riskli anahtar/yanlış ihraç ve tarihsel arşiv birlikte doğrulandı. 403+46+46=495 otomatik; 13 tatbikat +14 kaynak +13 itiraz tarayıcı; 74 komut/16 HTTP, 3128 örnek/25024 kontrol. 390 px form incelendi. Gerçek RPO/RTO, üretim adaptörleri ve dağıtık geri dönüş açık; kaynak yayını canlı yayın değildir. Son canlı Paket16; 17–27 dağıtımı yok.

`RECOVERY-CONTRACT.md` ve `acceptance/B27-recovery-20261014.json` sınırlar/kanıtlar. configuredCore kapalı. Korunan 115 dosyalı paket üretildi; başarısız veya doğrulanmamış dağıtım yapılmış sayılmadı. Canlı alias 14.10.2026 yeniden dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1, uygulanmadı.

## Paket27 kaynak eşitlemesi — 14 Ekim 2026

Yerel `50c1e66063007a1c5f1d7b84c3d596288b0f7d36`; uzak `307ca9d73e642d9fe09d2cd66f81adb36948e275`; ortak ağaç `2ca737db28dda29df19f8253a083ee061d22acc5`. 23 blob ve kaynak ağacı doğrulandı; expected-head `0a33084efd394fdd9c847b4ef7184e4e9be53ed3`, force=false. Canlı dağıtım yok; Paket16/geri dönüş kimlikleri değişmedi.

## Paket28 kaynak adayı — B09/B15/B16/B13/B08 (14.10.2026)

Kaynak güven sicili: sürüm/tarih/dayanak, ayrı ret-kabul, açık güven dosyası ihracı, anahtar/kontrat kapanışı. İptal mevcut kanıt/karar/cüzdan/paylaşım/durum uygunluğuna yayılır; tarihsel arşiv aynı kalır. Eski statik kayda geriye dönük onay eklenmez; yeni incelemeli imzalı sürüm gerekir. 418+46+46=510 otomatik; 15 yeni sunucu testi, 14 güven sicili +14 kaynak +13 tatbikat +13 itiraz tarayıcı. 77 komut/16 HTTP: 3337 örnek/26696 denetim. 390 px görünüm ve odak incelendi; 115 korumalı statik dosya paketlendi. Kaynak adayı canlı yayın değildir; son canlı Paket16, Paket17–28 dağıtımı yok. Gerçek sağlayıcı, üretim adaptörü, kurumsal karar ve dış kabul açık.

`SOURCE-TRUST-CONTRACT.md` ve `acceptance/B09-trust-20261014.json`. configuredCore Vercel üzerinde kapalı; yeni credential, migration veya gerçek belge işlemi yok. Geri dönüş hedefi dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı.


## Paket28 kaynak kimlikleri — 14.10.2026

Yerel eddd7de825e0924c3e3304d4077d152b584ac46c; uzak 8d74c9ce928ef199a5ea05d2b1acf082bf9f029a; ortak kaynak ağacı 4064721bdd8857906a6d73eaf91d695c8dc37cd8. 27 blob birebir doğrulandı; expected-head307ca9d73e642d9fe09d2cd66f81adb36948e275, force=false. Dağıtım yapılmadı.

## Paket29 aday — 14.10.2026, B07 işlem/anahtar sınırı

Görünür ekran değişikliği yok. 20 yeni bağımsız hata sürücüsü testi; 438+46+46=530 ve mevcut yerel HTTPS akışında15 tarayıcı kontrolü. 77komut/16HTTP kapsam matrisi, 115dosyalı korumalı paket. Gerçek PostgreSQL/KMS veya yeni adaptörlerin HTTP kabulü değildir. SQL repository/anahtar revizyon köprüsü açık; B07 kısmi.

Canlı dağıtım yok: son doğrulanan Paket16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production; kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. Paket17–29 yayımlanmadı. İptal edilen browserAuth yeniden istenmedi; canlı smoke yapılmış sayılmaz. configuredCore kapalı.


## Paket29 kaynak kimlikleri — 14.10.2026

Yerel9d737a8c230f5ef3c8f612d321898e5414c4829f; uzak6ac2a5a69e29763a31a48b61b40f4ef1ab759f8c; ortak kaynak ağacı620a2a88d02100b585502e0c3d33570c31e963fa.11blob SHA birebir doğrulandı; expected-head8d74c9ce928ef199a5ea05d2b1acf082bf9f029a force=false. Canlı alias read-only yeniden sorgulandı: Paket16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY. Yeni deployment/auth/smoke yapılmadı.

## Paket30 aday — 14.10.2026, B15 kaynak ders kaydı/ilerleme

Aktarım ve mutabakat ekranında aynı program/öğrenen için kaynak ders kaydı, tamamlama ve görev notu; iptal/yeniden kayıt ve lisans kapanışı mevcut kanıt/karar zincirine bağlı.11yeni sunucu,15yeni kayıt/ilerleme+14kaynak+14güven tarayıcı;449+46+46=541.77komut/16HTTP3441örnek27528kontrol;115korumalı statik dosya. Mobil390px ve gerçek klavye akışı incelendi; manuel ekran okuyucu değil.

Yalnız yerel kabul; gerçek LMS/vendor/kurum kararı/üretim depo yok. Paket17–30 dağıtılmadı. Son doğrulanan canlı kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6, deploymentdpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production. Geri dönüşdpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. İptal edilmiş browserAuth yeniden istenmedi; yeni canlısmoke iddiası yok. configuredCore kapalı.

## 14.10.2026 — Paket30 kaynak eşitlemesi

Yerel `c7fac3714f2f5f73a4a790d4e2818b3015fc8c30`; uzak `71b95557b0aa555e05f5e38e02098db19faa5344`; ortak kaynak ağacı `2ba271a78b0347ace49deb699234332cf140a73d`.23blob SHA ve tam ağaç eşleşti; beklenen uzak baş6ac2a5a69e29763a31a48b61b40f4ef1ab759f8c, force=false. Bu kaynak eşitlemesidir; dağıtım yok.

## 14.10.2026 — Paket31 yerel kabul / yeni yayın yok

Ekranlar: mobil ana menü, ortak pencereler, Kaynak Merkezi, Matris, rozet sekmeleri, kalite/paydaş filtreleri, alan etiketleri ve öğrenci katalog düğmesi. Kullanıcı klavyeyle menü/sekme değiştirip mantıklı odağa dönebilir. Özgün27 Gazi satırı güncel davranış ve teste bağlandı.544otomatik+18gezinme+13itiraz+8cüzdan geçti; korumalı paket115statik dosya.

Yeni commit/uzak kaynak kimliği eşitlemeden sonra devam kaydına yazılacak. Canlı alias14.10.2026salt okunur `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY; source16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Bu girişli canlı smoke değildir. Paketi17–31 dağıtılmadı. Geri dönüş hedefi `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı. Gerçek ekran okuyucu/altyazı/belge ve bütün modal/form kabulü, kurum kararı ve dış bağlantı açık; üniversite yetkisi/üretim migration’ı yok.

### Paket31 kaynak eşitleme sonucu

Yerel `e4a1f826b4f381a71d1f9dd5fc732a66e01b07d3`; uzak `15809e6a8e6b8008c03e547c50b8da9eae379cc4`; ortak kaynak ağacı `1561ea06b71e5b06dbe74c7a60604a03c34a0338`.26blob ve tam kaynak ağacı eşleşti. Beklenen baş `71b95557b0aa555e05f5e38e02098db19faa5344` ile force=false. Dağıtım yok; son canlı16/geri dönüş15 aynı.

## Paket32 — destek takvimi, kapanış teyidi ve rehber; yalnız kaynak adayı

14.10.2026. Destek kayıtları ekranında çalışma dakikası hedefleri, takvim/kaynak sürümü ve ayrı kalite incelemesi; yetkili kuyruk, kişi kapanış teyidi, yeniden açma/geçmiş, arama/filtre ve gerçek JSON indirme. Rehber2026.10.14.1 eski bilinen yanıtları korur. Yeni içerikte seçilen odağın animasyon sonunda çalınması düzeltildi.

- 465 sunucu+48portal+46regresyon=559otomatik.16destek+19gezinme+13itiraz+8cüzdan tarayıcı;80komut/16HTTP3502örnek28016kapsam kontrolü. 115korumalı statik dosya.
- Kaynak tabanı: yerel e4a1f826b4f381a71d1f9dd5fc732a66e01b07d3 / uzak15809e6a8e6b8008c03e547c50b8da9eae379cc4 / ortak1561ea06b71e5b06dbe74c7a60604a03c34a0338.14.10uzak başlık ve tam taban ağacı yeniden doğrulandı.
- Canlı alias salt okunur yeniden kontrolünde Paket16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READYproduction.17–32dağıtımı ve yeni oturumlu canlı smoke yok. Kullanıcının önceki güvenli giriş iptali yeniden tetiklenmedi. configuredCore kapalı.
- Geri dönüş hedefi canlıPaket15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı. Kaynak adayı dağıtım değildir.
- Kurum SLA/tatil/eskalasyon/eğitim uydurulmadı; yeni credential/migration/servis/gerçek mesaj yok. B26/B24 ve bütün B01–B36 genel tamamlanmış değil.

### Paket32 kaynak kimlikleri

Yerel `8ef05ad82483ca702eff2389faae59b3b661081b`; uzak `36a81a550060a66a4cb26a9f97933c376ea26b24`; ortak tam ağaç `e617d524b9c1ece5ce409da496f120a67b13e0c6`.31blob SHA eşleşti; expected-head15809e6a8e6b8008c03e547c50b8da9eae379cc4,force=false ve uzak yeni başlık doğrulandı. Yeni yayın yok; son canlı16.

## Paket33 — mali prova ve mutabakat; yalnız kaynak adayı

14.10.2026. Finans menüsü korunarak kişi/programa bağlı mali çalışma alanına bağlandı. Koşul hazırlığı/ayrı mali inceleme, tekil belirteçli kayıt, sağlayıcı simülatörü, iade/ters ibraz ve dayanaklı mutabakat, arama/filtre/geçmiş/indirme. Gerçek kart, para, PSP, fatura/vergi hesabı veya akademik otomatik karar yok.

- 478sunucu+48portal+46regresyon=572otomatik;16mali+19gezinme+13itiraz tarayıcı.87komut/16HTTP3752örnek30016kapsam denetimi;115korumalı statik dosya.
- Taban yerel8ef05ad82483ca702eff2389faae59b3b661081b / uzak36a81a550060a66a4cb26a9f97933c376ea26b24 / ortak e617d524b9c1ece5ce409da496f120a67b13e0c6.
- Son doğrulanmış canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READYproduction;14.10saltokunur alias kontrolü.17–33dağıtımı ve yeni oturumlu smoke yok; browserAuth kullanıcı iptali yeniden istenmedi.configuredCorekapalı.
- Geri dönüş hedefi15 dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı. Kaynak adayı canlı yayın değildir.
- B31gerçek tahsilat/vergi/iade ve B02/B04/B05 kararları, PSP sözleşmesi/adaptörü/settlement/sandbox kabulü açık. Başvuru/hesap/credential/ücretli hizmet/üretim migration yok. B01–B36tamamlanmadı.

### Paket33 kaynak kimlikleri

Yerel `990b620fba9c7877e96768aa82bb1d6c8f6afc8d`; uzak `432a4ad9927121958d4eb5676af78b907b1b4f25`; ortak tam ağaç `f8f622b6d164fdda16e3f6facdac7977210a8720`. 23 dosyanın blob özeti ve tam kaynak ağacı eşleşti; beklenen uzak başlık36a81a550060a66a4cb26a9f97933c376ea26b24, force=false. Yeni yayın yok; son canlı16.

## Paket34 — ikinci birim kapasitesi; kaynak adayı

14.10.2026. Akademik çalışma alanına Birim kapasitesi eklendi. İki birimde yönetici hazırlığı ve ayrı kalite incelemesi; üç kota, mevcut kullanım, durdurma/sürüm artırma, arama/indirme. Önceden kabul edilen satırlar tamamlanır; ilk grubun kayıt ve imzalı belge özeti korunur.

- 489sunucu+48portal+46regresyon=583otomatik;14kapasite+19gezinme+12grup+15ders kaydı+13itiraz=73tarayıcı kontrolü.90komut/16HTTP4194örnek33552denetim;115korumalı statik dosya.
- Taban yerel990b620fba9c7877e96768aa82bb1d6c8f6afc8d / uzak432a4ad9927121958d4eb5676af78b907b1b4f25 / ortak f8f622b6d164fdda16e3f6facdac7977210a8720.
- 14.10uzakdal/alias saltokunur yeniden doğrulandı. Son canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READYproduction.17–34dağıtımı/yeni oturumlu smoke yok; browserAuth kullanıcı iptali yeniden istenmedi; configuredCorekapalı.
- Canlı geri dönüş hedefi15 dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı.
- Gerçek ikinci birim/kurum/issuer/kota kararı, ilk gerçek kohort, üretim RLS/dağıtık yük ve rapor kabulü açık. Yeni servis/credential/migration/gerçek öğrenci yok. B32 ve tümB01–B36tamamlanmadı.

### Paket34 kaynak kimlikleri

Yerel `4f389bb75119a24f2e3f1889788ad7452adbf937`; uzak `b1e4ae3aab4e1dc43ee41f5aab3fd67187a505a4`; ortak tam ağaç `2ad80cbb9df7e7042855e00181d6e2fd1b79811f`.22blob SHA ve tam ağaç eşleşti; expected-head432a4ad9927121958d4eb5676af78b907b1b4f25,force=false; uzak yeni baş doğrulandı. Yeni canlı yayın yok.

## Paket35 — beceri eşlemesi, inceleme ve düzeltme; kaynak adayı

14.10.2026. Mevcut Beceri ilişkileri ekranında kaynak/lisans/görev siciline bağlı çoktan çoğa eşleme, atanmış uzman incelemesi, hata bildirimi/düzeltme/durdurma ve kişi bazlı güncel kanıt ilişkisi. Arama/indirme/mobil/klavye; akademik karar arşivi aynı SHA ile korundu.

- 500sunucu+48portal+46regresyon=594otomatik;14eşleme+19gezinme+13itiraz=46tarayıcı.94komut/16HTTP4386örnek35088denetim;115korumalı statik dosya.
- Taban yerel4f389bb75119a24f2e3f1889788ad7452adbf937 / uzakb1e4ae3aab4e1dc43ee41f5aab3fd67187a505a4 / ortak2ad80cbb9df7e7042855e00181d6e2fd1b79811f.
- Son doğrulanmış canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READYproduction;14.10saltokunur alias kontrolü.17–35dağıtımı/yeni oturumlu smoke yok; kullanıcı browserAuth iptali yeniden istenmedi;configuredCorekapalı.
- Canlı geri dönüş hedefi15 dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1;uygulanmadı.
- Gerçek taksonomi/atıf-çeviri hakkı, kurum uzman görevi/örneklem, B29/üretim kimlik/depo ve canlı kabul açık. ESCO resmî sayfaları teknik model/sınır için okundu; veri seti alınmadı, kurum eşlemesi onaylanmadı. B33/tümB01–B36tamamlanmadı.

### Paket35 kaynak kimlikleri

Yerel `ea478cefa7b4593f67ca6ef86e87ce14ecfe258f`; uzak `d4ad99eaf7dfa5a4496d7f8afe3d6702c78a420b`; ortak tam ağaç `e5f92496939caa4261ae52395c6a6971c80594d2`.21blob SHA ve tam ağaç eşleşti; expected-headb1e4ae3aab4e1dc43ee41f5aab3fd67187a505a4,force=false; uzak yeni baş doğrulandı. Yeni canlı yayın yok.

## Paket36 — amaçlı portfolyo; kaynak adayı

14.10.2026. Amaçlı portfolyo sekmesi eklendi: admin veri akışı/amaç hazırlığı, ayrı kalite incelemesi, öğrenenin seçili beceri/kanıt izni, alıcı amaç teyidi ve nottan ayrı geri bildirim. Veri taleplerindeki toplu geri çekme portfolyoyu da kapatır. Arama/geçmiş/öğrenen özet indirmesi/mobil/klavye; karar arşivi aynı SHA ile korundu.

- 511sunucu+48portal+46regresyon=605otomatik;14portfolyo+19gezinme+11veri talebi+8cüzdan+13itiraz=65tarayıcı.101komut/16HTTP4674örnek37392denetim;115korumalı statik dosya.
- Taban yerel ea478cefa7b4593f67ca6ef86e87ce14ecfe258f / uzak d4ad99eaf7dfa5a4496d7f8afe3d6702c78a420b / ortak e5f92496939caa4261ae52395c6a6971c80594d2.
- Son canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READYproduction;14.10saltokunur alias kontrolü.17–36dağıtımı/yeni oturumlu smoke yok; kullanıcı browserAuth iptali yeniden istenmedi;configuredCorekapalı.
- Canlı geri dönüş hedefi15 dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1;uygulanmadı.
- Gerçek işveren/amaç/veri işleme/saklama/aktarım ve öğrenen bilgilendirme-izin usulü, üretim kimlik/depo ve B18/B33/B28gerçek kabulleri açık. Yeni gerçekkişi/hesap/credential/servis/migrationyok. B34 ve tümB01–B36tamamlanmadı; yazılım36 işB36değildir.

### Paket36 kaynak kimlikleri

Yerel `4bea6ffb7e4ef56a9474069e815f2cb53c67a958`; uzak `d5a67fdde6cb372d65b06e6f63c977fe8d9812a5`; ortak tam ağaç `50c5c13756457bbf4d61bdc3bdab76186f58dfdb`.24blob SHA ve tam ağaç eşleşti; expected-headd4ad99eaf7dfa5a4496d7f8afe3d6702c78a420b,force=false; uzak yeni baş doğrulandı. Yeni canlı yayın yok.

## Paket37 — sentetik öneri, uzman kıyası ve itiraz; kaynak adayı

14.10.2026. Öneri ve uzman kıyası sekmesi eklendi; gözetim/örnek başvuru ekranından bağlantı var. İncelenmiş yerel protokol, elle girilen sentetik öneri, atanmış ayrı uzman kıyası, öğrenen itirazı ve ayrı kalite düzeltmesi/geri çekmesi aynı kişi/değerlendirme/kanıt sürümüne bağlı. Karar arşivi değişmedi.

- 524 sunucu + 48 portal + 46 regresyon = 618 otomatik; 13 öneri + 19 gezinme + 13 itiraz + 11 veri talebi = 56 tarayıcı. 108 komut/16 HTTP, 4918 örnek/39344 denetim; 115 korumalı statik dosya.
- Taban yerel `4bea6ffb7e4ef56a9474069e815f2cb53c67a958` / uzak `d5a67fdde6cb372d65b06e6f63c977fe8d9812a5` / ortak `50c5c13756457bbf4d61bdc3bdab76186f58dfdb`.
- 14.10 güncel uzak dal ve canlı alias yeniden okundu; son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY production. 17–37 dağıtımı/yeni oturumlu smoke yok; kullanıcı browserAuth iptali yeniden istenmedi; configuredCore kapalı.
- Canlı geri dönüş hedefi15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı.
- Model/sağlayıcı/plan/Türkçe gerçek pilotu, kurum/veri-içerik hakkı ve üretim kimlik/depo açık. Yeni servis, credential, migration veya gerçek kişiye otomatik karar yok. B35 ve tüm B01–B36 tamamlanmadı.

### Paket37 kaynak kimlikleri

Yerel `a5b1328da9bf170f77845dcbc02fbaaa4056c90b`; uzak `57740e1efc2d503ad1a405f07bb76e183fc6e91e`; ortak tam ağaç `f0627c3ed5c1a4cc8638a8cd4809d0b7dec5e95e`. 21 blob SHA ve tam ağaç eşleşti; expected-head `d5a67fdde6cb372d65b06e6f63c977fe8d9812a5`, force=false; uzak yeni baş doğrulandı. Yeni canlı yayın yok.

## Paket38 — cüzdan seçenekleri ve gerekçeli erteleme; kaynak adayı

14.10.2026. Cüzdan seçenekleri sekmesi ve özel cüzdanla karşılıklı bağlantı eklendi. Üç alternatifin somut ihtiyaç/kapsam/mahremiyet kıyası, ayrı teknik ve kalite incelemesi, erteleme veya zincirsiz keşif önerisi, yeni sürüm ve durdurma. Gerçek dış cüzdan testleri çalıştırılmadı olarak kalır; hiçbir bağlantı açılmaz. Akademik karar arşivi korunur.

- 532sunucu+48portal+46regresyon=626otomatik;11cüzdankeşfi+19gezinme+8cüzdan+13itiraz=51tarayıcı.111komut/16HTTP5053örnek40424denetim;115korumalıstatikdosya.
- Taban yerel `a5b1328da9bf170f77845dcbc02fbaaa4056c90b` / uzak `57740e1efc2d503ad1a405f07bb76e183fc6e91e` / ortak `f0627c3ed5c1a4cc8638a8cd4809d0b7dec5e95e`.
- Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READYproduction;14.10saltokunur alias kontrolü.17–38dağıtımı/yeni oturumlu smoke yok;browserAuthiptaliniyenidenisteme;configuredCorekapalı.
- Canlı geri dönüş hedefi15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`;uygulanmadı.
- Gerçek kurum ihtiyacı/alternatif kararı,B19/B28veri-saklama-güven-durum ve gerçekcüzdan/protokol/biçim/profil kabulü açık. Yeni hesap/credential/ücretlisertifika/migration/zincirkişiselverisi yok. B36vebütünB01–B36tamamlanmadı;Paket38bir yazılım kaynak dilimidir.

### Paket38 kaynak kimlikleri

Yerel `406adb9e5e5c996448cff7bb01dd2712e0cca232`; uzak `fce97922b80c8ff0123e43cef3d3585d58dfc1f1`; ortak tam ağaç `9410cc3d82ebd619d60ace794cb52fdce2be05d7`. 20 blob SHA ve tam ağaç eşleşti; expected-head `57740e1efc2d503ad1a405f07bb76e183fc6e91e`, force=false; uzak yeni baş doğrulandı. Yeni canlı yayın yok.

## Paket39 — yerel HTTP anahtar dönüşümü; kaynak adayı

14.10.2026. Yeni panel menüsü yok; anahtar geçişinde Türkçe 503 bekleme ekranı. Mevcut oturum/kişi/akademik geçmiş korunur; eski CSRF ve etkinleşme sonrası eski işçi reddedilir. Canlı oran bütçesi anahtar değiştirerek sıfırlanamaz. Eski işçilerin boşaltılması gerekir; atomik PKCE/KMS commit bariyeri değildir.

- 540 sunucu +48 portal +46 regresyon =634 otomatik; 15 kimlik +13 itiraz =28 tarayıcı. 111 komut/16 HTTP, 5063 olumlu örnek/40504 negatif kontrol; 115 korumalı statik dosya.
- Taban yerel `406adb9e5e5c996448cff7bb01dd2712e0cca232` / uzak `fce97922b80c8ff0123e43cef3d3585d58dfc1f1` / ortak `9410cc3d82ebd619d60ace794cb52fdce2be05d7`.
- 14.10 güncel uzak baş/alias okundu. Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY production. 17–39 dağıtımı/yeni oturumlu smoke yok. Kullanıcının browserAuth iptali yeniden istenmedi; configuredCore kapalı.
- Canlı geri dönüş hedefi15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı.
- PostgreSQL repository, atomik PKCE/nonce bariyeri, gerçek IdP/KMS/depo/RLS ve dağıtık kabul açık. Yeni servis/credential/üretim migration yok. B07 ve B01–B36 bütünü tamamlanmadı.

### Paket39 kaynak kimlikleri

Yerel `24d24eea531acf330a489ce5ea5df5c12caae7d8`; uzak `f9857e78a5da33450786350c3c197670dbec3e6c`; ortak tam ağaç `2fccc1756e0d4112063f50f732fab66f9e9a5d0b`. 13 blob SHA ve tam ağaç eşleşti; beklenen uzak baş `fce97922b80c8ff0123e43cef3d3585d58dfc1f1`, force=false. Uzak yeni baş doğrulandı; yeni canlı yayın yok.

## Paket40 — veri kapsamı ve kişisel özet; kaynak adayı

14.10.2026. Veri talepleri ekranında Kayıt kapsamım: sekiz kategori, kendi kayıt/indirilebilir özet/görev katkısı/alıcı sayıları, kurum oturum sayacı, filtre ve klavye ayrıntıları. Destek, mali prova, belge/tanıma/OBS ve alıcı geçmişi kişiye bağlı güvenli alanlarla indirilebilir. Yeni silme yetkisi açılmaz.

- 549 sunucu +48 portal +46 regresyon =643 otomatik; 9 kapsam +11 veri talebi +13 itiraz +19 gezinme =52 tarayıcı. 111 komut/16 HTTP, 5174 örnek/41392 negatif kontrol; 115 korumalı statik dosya.
- Taban yerel `24d24eea531acf330a489ce5ea5df5c12caae7d8` / uzak `f9857e78a5da33450786350c3c197670dbec3e6c` / ortak `2fccc1756e0d4112063f50f732fab66f9e9a5d0b`.
- 14.10 uzak dal ve canlı alias yeniden okundu. Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY production. 17–40 dağıtımı/yeni oturumlu smoke yok. BrowserAuth kullanıcı iptali yeniden istenmedi; configuredCore kapalı.
- Canlı geri dönüş15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı.
- 14 tablo/120 tür kaynak envanteri kurumun bütün alan/süre/dayanak/işleyen/ülke envanteri değildir. Tam hesap silmesi, resmî bildirim, üretim/backup imhası ve dış hizmet kapanışı kabulü açık. B04/B28 ve bütün B01–B36 tamamlanmadı.

### Paket40 kaynak kimlikleri

Yerel `70ed4097299cf75106cccfe149a939938bdfe097`; uzak `b606baeb86dc8114dabea8754e8dc7f24ad02a43`; ortak tam ağaç `c578d6376967fa46f78efc945e1b6d2bc97fa8d8`. 19 blob SHA ve tam ağaç eşleşti; beklenen uzak baş `f9857e78a5da33450786350c3c197670dbec3e6c`, force=false. Uzak yeni baş doğrulandı; yeni canlı yayın yok.

## Paket41 — tamamlanmış giriş isteği temizliği; kaynak adayı

14.10.2026. Veri talepleri ekranında ayrı görevli yanıtı → sahibi/MFA → aday önizlemesi → açık teyit → sınırlı atomik temizlik ve kişisel özet makbuzu. Ençok100/süre15dakika; devam eden girişler, oturum/aile/iptal/anahtar ve akademik kayıtlar korunur. Tam hesap silmesi değildir.

- 557 sunucu +48 portal +46 regresyon =651 otomatik; 9 temizlik +11 veri talebi +15 kimlik +13 itiraz =48 tarayıcı.113komut/16HTTP5229örnek41832negatifdenetim;115korumalıstatikdosya.
- Taban yerel `70ed4097299cf75106cccfe149a939938bdfe097` / uzak `b606baeb86dc8114dabea8754e8dc7f24ad02a43` / ortak `c578d6376967fa46f78efc945e1b6d2bc97fa8d8`.
- Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READYproduction.17–41dağıtımı/yeni oturumlu smoke yok;browserAuth kullanıcıiptaliniyenidenisteme;configuredCorekapalı.
- Canlı geri dönüş15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı.
- İlk toplu koşu sentetik IdP saati farkını yakaladı; fixture saati eşitlendi, üretim doğrulaması gevşetilmeden tam koşu yeniden geçti. Yeni servis/credential/migration/gerçek kişi verisi yok. Resmî kanal, kurum saklama, üretim/tam hesap/yedek imhası ve dış hesap kabulü açık. B28/tümB01–B36tamamlanmadı.

### Paket41 kaynak kimlikleri

Yerel `522836521214df457774567b65deb851b499669a`; uzak `8a5c605f101b63d3f4a62c4456bb37abdfff6fa0`; ortak tam ağaç `a67894ffba6534d2a688e986f5980ea89df0c15a`. 21 blob SHA ve tam ağaç eşleşti; beklenen uzak baş `b606baeb86dc8114dabea8754e8dc7f24ad02a43`, force=false. Uzak yeni baş ve 14.10 canlı alias16 yeniden doğrulandı; yeni canlı yayın yok.

## Paket42 — belge ekli yetki dosyası; kaynak adayı

14.10.2026. Politika ve hak siciline gerçek yerel dosya ekleri/indirme, kaynak-sürüm-kapsam, dört sorumluluk, süre, ayrı yönetici incelemesi, yeni sürüm ve durdurma eklendi. Belge profili dosyanın kimliğini ve SHA'sını sabitler. Yeni dosya eski profili değiştirmez; eski imzalı belge kendiliğinden iptal olmaz.

- 570 sunucu +48 portal +46 regresyon =664 otomatik. 13 yetki dosyası +11 profil +13 itiraz +19 gezinme =56 tarayıcı kontrolü. 118 komut/16 HTTP, 6709 örnek/53672 kapsam kontrolü; 115 korumalı statik dosya. 98 menü/279 rol-panel/66 ders korundu; 390 px görsel kontrol yapıldı.
- Taban yerel `522836521214df457774567b65deb851b499669a` / uzak `8a5c605f101b63d3f4a62c4456bb37abdfff6fa0` / ortak `a67894ffba6534d2a688e986f5980ea89df0c15a`. Güncel uzak baş ve canlı alias 14.10 yeniden okundu.
- Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY production. 17–42 dağıtımı ve yeni oturumlu smoke yok. BrowserAuth kullanıcı iptali yeniden istenmedi; configuredCore kapalı.
- Canlı geri dönüş15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`; uygulanmadı.
- Yerel ek sınırı 32 KiB; gerçek kurum evrak deposu, imza/zararlı içerik doğrulaması, saklama ve Senato/SEM yetki kabulü açık. YÖK/Gazi tam usul erişimi yeniden denendi, doğrulanamadı; okunmayan hüküm kural yapılmadı. B02/B12 ve bütün B01–B36 tamamlanmadı.

### Paket42 kaynak kimlikleri

Yerel `7ffe6aea852438654500a45ce7ca0741cd5b7798`; uzak `2c4d1e31bcfd621b30489ab6488fd9c495de6066`; ortak tam ağaç `64e7a0e3a62c107a0f309fed2367bb4b67829499`. 26 blob SHA ve tam ağaç eşleşti; beklenen uzak baş `8a5c605f101b63d3f4a62c4456bb37abdfff6fa0`, force=false. Uzak yeni baş doğrulandı; yeni canlı yayın yok.

## Paket43 — program bilgi paketinin güncel bağı; kaynak adayı

14.10.2026. Program sürümlerinde yedi dayanak durumu, yetkili yerel bilgi paketi indirmesi ve belge profili incelemesine geçiş. İndirme program/yayın/profil/yetki dosyası/üyelik/süreyi tekrar denetler. Başka yönetici oturumunda durdurulan dosya eski açık ekrandan indirilemez. Eski karar arşivi ve programlar korunur.

- 578 sunucu +48 portal +46 regresyon =672 otomatik.9 bilgi paketi +8 program +13 itiraz =30 tarayıcı.118 komut/17 HTTP;6816 örnek/54528 denetim.115 korumalı statik dosya.390 px/klavye görsel kontrol; yeni menü yok.
- Taban yerel `7ffe6aea852438654500a45ce7ca0741cd5b7798` / uzak `2c4d1e31bcfd621b30489ab6488fd9c495de6066` / ortak `64e7a0e3a62c107a0f309fed2367bb4b67829499`.
- Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY production;17–43 dağıtımı/yeni oturumlu smoke yok. BrowserAuth kullanıcı iptali yeniden istenmedi;configuredCore kapalı. Geri dönüş15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1`;uygulanmadı.
- İlk iki oturumlu tarayıcı denemesi tek süreçte test bağlamı ayrımı sorununu yakaladı; son kabul iki ayrı Chromium işlemi ve ayrı sentetik kişi oturumlarıyla geçti. Yetki kontrolü gevşetilmedi.
- Gerçek program/lisans/akademik onay ve tam kurum yayını kabulü açık. Yerel program yayını tek başına bu kabul değildir. B03 ve bütün B01–B36 tamamlanmadı.

### Paket43 kaynak kimlikleri

Yerel `4d3bfe7990139447409cbcc7a4065089daebf349`; uzak `7e0261866225a14fcd6446ce6e42e94207addebb`; ortak tam ağaç `e2f38573cc81eba3e1aa7e9de8ad73406fad4f04`.18 blob SHA ve tam ağaç eşleşti; beklenen uzak baş `2c4d1e31bcfd621b30489ab6488fd9c495de6066`, force=false. Uzak yeni baş ve 14.10 canlı alias16 yeniden doğrulandı; yeni canlı yayın yok.

## Paket44 — B05/B25 ders ve materyal kabulü (14.10.2026)

Ders ve materyal ekranı 66 dersin envanterini, program/görev/rubrik eşlemesini, sürüme bağlı hak sicilini, ayrı yönetici hak kararını ve ders başına kalite incelemesini sunar. Yalnız kayıtlı öğrenen veya yetkili görevli özgün HTML/CSV teslimi alır; kalite incelemesi için ayrı indirme amacı vardır. Öğrenme kanıtı aynı kişinin teslimine bağlanır; insan değerlendirmesi ve ayrı karar korunur. Harici dosya kopyası/marka/API kapalı; yeniden yayın yalnız ayrıca izinli dosya hazırlığı, gerçek yayın yok.

591+48+46=685 otomatik;14 materyal+19 gezinme+13 itiraz=46 tarayıcı;123 komut/17 HTTP,7028 pozitif örnek/56224 türetilmiş olumsuz denetim;98 menü/288 rol paneli,390 px/klavye. 6 koleksiyon22 modül66 ders ve88 özgün dosya baytları aynı,115 korumalı statik dosya. Kaynak altında yeni133 kayıt türü,14 tablo. İlk tarayıcı koşusundaki aynı adlı summary/button seçici belirsizliği testte giderildi; son tam akış geçti.

B05/B25 bağımsız yerel alt koşulları kapandı; gerçek yazılı sağlayıcı/hak sahibi kararı, seçili Gazi programının akademik/dil/erişilebilirlik incelemesi ve üretim dağıtım adaptörü açık. Bütün iş paketleri tamamlanmadı. Ayrıntı MATERIAL-RIGHTS-CONTRACT.md, MATERIAL-SOURCE-REVIEW.md ve B05-B25 kabul JSON’unda. Yeni canlı yayın ve canlı smoke yok; son canlı16 READY,17–44 dağıtılmadı;configuredCore kapalı.

Paket44 kaynak doğrulaması: yerel `c447ef917fd296a5f6329333ec9e98bcc86e3186`, uzak `3255b07d886693b6b766c63a142829bcc82f0459`, ortak tam ağaç `3c9b094248793950b670824b9877ca6edd7db47f`.32 blob SHA ve tam ağaç eşleşti; beklenen uzak baş ve force=false ile ilerletildi. Yeni canlı yayın yok.

## Paket45 — B07 yerel türetme anahtarı commit bariyeri (14.10.2026)

Yeni panel/menü yok. Mevcut HTTPS girişinde anahtar sürümü/durdurma, tek kullanımlık challenge ve oturumun aynı commit işlemine bağlıdır. Güvenilen yerel operatör dönüşümü ve paylaşılan anahtarı tenant/issuer/audience kapsamlarında durdurma, audit ile atomiktir. Eski işçi/istek yeni revizyonu kullanamaz; doğru anahtarlı isteği yanlış işçi tüketmez. Provider beklerken ve imza doğrulamasından sonra ikinci bağlantıda iptal yeni çerezi engeller. Önceki akademik oturumun normal süre/üyelik/çıkış denetimleri korunur.

11 yeni test;602+48+46=696 otomatik;15 kimlik+9 temizlik=24 tarayıcı;123komut/17HTTP7056örnek56448denetim;115statik;16teknik tablo/133kayıt türü. B07 yerel alt koşul geçti; IdentityKeyProvider metadata/üretim repository köprüsü, gerçek PG/KMS/IdP/RLS, tüm session yazarları/karma dağıtım ve geri yükleme checkpoint’i açık. `DERIVATION-EPOCH-CONTRACT.md` ayrıntıdır.36 özgün kabul ölçütü değişmedi.

Canlı alias yeniden kontrol edildi: Paket16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY.17–45 dağıtılmadı; yeni canlı smoke yok;configuredCore kapalı. Gerçek credential/migration/kurum kararı yok.

Paket45 kaynak doğrulaması: yerel `b18823117f0908b50dde0b2ffa5ae180b1445658`, uzak `ee90a2a6b3da9327f38ea49855b49ab53bb200bf`, ortak tam ağaç `57157441c49320f160d25ac0dd42baa246b3d40c`.18 blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16, yeni yayın yok.

## Paket46 — B20/B21 çok dersli teklif (14.10.2026)

Tanıma ve kredi → Çok dersli teklifler güncellendi. Öğrenen aynı kayıt/politikaya bağlı2–10 dersi birleştirir ve karar öncesi geri çeker. Komisyon tek teklif altında her satırı karara bağlar; toplam uzaktan payda ve ders başına pay/çifte sayım kontrolü yapılır. İtiraz bütün satırları bekletir; bağımsız yeniden karar eski kredileri atomik tersler. OBS eski mutabık satırlardan ayrı replace/cancel zincirini korur. Gerçek belge/kurul/transkript işlemi değildir.

615+48+46=709 otomatik;13 yeni sunucu;11 teklif+12 tek ders+11 OBS=34 tarayıcı;128komut/17HTTP7321pozitif58568türetilmiş denetim;115statik;16teknik tablo138kayıt türü.390px ekran görüntüsü incelendi. İlk hedef testlerinde politika okuma kapsamı ve test fixture referansları düzeltildi; son tam koşular geçti. B20/B21 yalnız belirtilen yerel alt koşullarda kabul; özel istisna/ölçü birimi sözleşmesi, kriptografik dış belge/teslim arşivi, gerçek müfredat/önceki ders, kurum ve dış sistem kabulü açık.

YÖK5sayfa ve Gazi kredi transferi4sayfa önceki erişim/okuma engeli giderildi; Gazi RPL5sayfa yeniden okundu. Kaynak SHA/kapsam/tarih ve yorum sınırları RECOGNITION-SOURCE-REVIEW-20261014.md içinde. YÖK10/3 ölçü birimi otomatik AKTS oranı olarak atanmadı. Ayrıntı RECOGNITION-OFFER-CONTRACT.md ve B20-B21-offers kabul JSON’unda.36 özgün kimlik/başlık/bağımlılık/kabul değişmedi.

Yeni canlı yayın yok:17–46 dağıtılmadı; alias16 READY. Son canlı kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, deploy `dpl_Coaq5KN2VcNpPjwyXke4neroq877`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Authenticated canlı smoke yenilenmedi; browserAuth13Ekim iptali yeniden denenmedi;configuredCore kapalı.

Paket46 kaynak doğrulaması: yerel `35933850407fb589351598158bdeb7852bd6d7af`, uzak `45ac0282a98a9c3b5ec43d3791d470cf1b6f2e87`, ortak tam ağaç `39877672364f2a72c2a55b7aa52b27d15f0102fb`.23blob SHA ve tam ağaç eşleşti;expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket47 — B20 kaynak ve istisna incelemesi (14.10.2026)

Tanıma ve kredi → Kaynak ve istisna incelemesi eklendi; Politika ve hak sicili tanıma yolunu Türkçe seçimle kaydeder. Yeni politikada zorunlu kaynak/sicil bağı, bağımsız dört teyitli inceleme, sürüm/süre/görev/hold kontrolleri vardır. Eğitim adedi, saat, belirsiz birim ve özel RPL/önceki ders yolları inceleme kaydı alabilir ancak pozitif kredi hesaplamaz. Yeni başvuru ve pozitif karar sunucuda güncel kaynağa bağlıdır; eski karar/kredi/OBS otomatik değiştirilmez. Önceki yerel politika korunur; yeni istemci legacy biçimi üretemez.

626+48+46=720 otomatik;11 yeni sunucu;10kaynak+12tekders+11çokdersli+11OBS=44tarayıcı;131komut/17HTTP7625örnek61000türetilmiş kapsam denetimi;115statik;16tablo141tür.390px görsel inceleme/klavye ve iki SQLite bağlantısında eski karar formu/durdurma geçti. İlk browser option kontrolü DOM disabled özelliğiyle kesinleştirildi; son akış geçti. Kaynak dosyasının baytları veya özgünlüğü doğrulanmış sayılmaz; kaynak/istisna kapalı sözleşmesi B20 kurum kabulü değildir. Gerçek ölçü birimi/istisna/müfredat ve önceki kayıt kaynağı ile buna bağlı koşullu hesap adaptörleri açık.

Ayrıntı RECOGNITION-BASIS-CONTRACT.md ve B20-basis kabul JSON.36 özgün iş/kabul/bağımlılık değişmedi. Yeni canlı yayın yok;17–47 dağıtılmadı. Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Yeni authenticated smoke yok;browserAuth iptali tekrar denenmedi;configuredCore kapalı.

Paket47 kaynak doğrulaması: yerel `795a1666f0681ca1e061f8a87b4ab3b92b5f1ca8`, uzak `84a3e18be965db720fd401b16be74a46e5b49a8a`, ortak tam ağaç `d02a302bec99c3681c1f6489617c5cf9a4ddbe4e`.25blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket48 — B21 belge teslimi ve arşivi (14.10.2026)

Paket48: gerçek 32 KiB JWT baytları aynı talep/kişi/kurum/birim ve sunucu SHA ile değişmez özel arşive teslim edilir; güncel yetkili indirme ve audit/idempotency atomiktir. İnceleme sonrası değiştirme kapalı; ham dosya çalışma ekranı/kişi özeti/commands sonucuna girmez. İmza/düzenleyici/subject doğrulaması yapılmadı, teslim kredi üretmez.

637+48+46=731 otomatik;11 yeni sunucu;11teslim+12tekders+11teklif+11OBS=45tarayıcı.133komut/17HTTP7843örnek62744türetilmiş kapsam denetimi;115statik;16tablo144tür. İki SQLite bağlantısında arşiv/tekrar, audit rollback, güncel rol/MFA, yanlış dosya/kişi, kota ve inceleme sonrası değişiklik testleri geçti. Tarayıcıdan indirilen baytlar karşılaştırıldı;390px görüntü incelendi. İlk tam koşudaki envanter tür sayısı yeni üç kayıt için144 olarak güncellendi; son tam koşu geçti.

Yeni yayın yok;17–48 dağıtılmadı. Alias `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/production ve kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6` olarak yeniden okundu; bu authenticated smoke değildir. Geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. BrowserAuth iptali tekrar denenmedi;configuredCore kapalı. Kaynak commit/tam ağaç eşitlemesi aşağıda kaydedilecek.

Paket48 kaynak doğrulaması: yerel `779d434a4c81ff449bd53e277c5c9709de08cbe9`, uzak `139766d090c5c4b2b412b82aad666f416ffa7cbd`, ortak tam ağaç `2714a4f10d0cfb5e02a741fb29920dcc2e9e3fe8`.21blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket49 — B21 düzenleyici güveni ve imza denetimi (14.10.2026)

Paket49: dış belgeye özel sunucu issuer/anahtar/kişi eşleme sözleşmesi, IT hazırlığı/ayrı yönetici incelemesi, sürüm/süre/anahtar kapanışı; arşiv baytlarından gerçek JOSE RS256, typ/issuer/audience/subject/id/süre denetimi ve asenkron işlem sonrası atomik yeniden yetkilendirme. Makbuz yalnız imza/kişi eşlemesidir; durum/insan teknik kabulü ve kredi üretmez. Mevcut insan raporuna ve karar/OBS güven zincirine zorunlu bağ sonraki bağımsız dilimdir.

649+48+46=743 otomatik;12 yeni sunucu;13kriptografik+11teslim+12tanıma+11OBS=47tarayıcı.136komut/18HTTP8145örnek65160türetilmiş kapsam denetimi;115statik;16tablo148tür. Gerçek RSA doğrulaması, yanlış kişi/issuer/audience/typ, header URL/JWK, duplicate JSON, asenkron yetki/anahtar kapanışı, audit rollback ve tekrar testi geçti. 390px imza makbuzu görsel incelendi. Anahtarların tamamı kapalıyken kaynak ekranının kullanılabilirlik etiketi ve yeniden hazırlama düğmesi kapatıldı; tam test ve kriptografik tarayıcı yeniden geçti.

W3C13.10.2026Recommendation ve RFC8725 okunan kapsam/sürüm/erişim tarihi sözleşme/kanıtta kayıtlı; tam standart uygunluğu iddiası yok. Yeni canlı yayın yok;17–49 dağıtılmadı. Alias son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/production, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6` yeniden okundu; authenticated smoke değildir. Geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. BrowserAuth iptali tekrar denenmedi;configuredCore kapalı. Kaynak commit ve tam ağaç aşağıda kaydedilecek.

Paket49 kaynak doğrulaması: yerel `6faceebad502629d7dcf965da2a645c3db8d726a`, uzak `20e5761933bdf3307d53498d813f11620cb50d4b`, ortak tam ağaç `de21ec8048f24574b0042404938e4cc2a09af3b6`.26blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket50 — B21/B22 bağlı insan raporu ve karar/aktarım (14.10.2026)

Paket50: arşivli olumlu insan raporu güncel imza makbuzuna ve ayrıca insanın incelediği durum kaynağına bağlı; değişmez rapor sürümleri ve kararın sabitlediği teknik rapor korunur. Yeni rapor eski krediyi otomatik yenilemez. Güven kapanışı pozitif kararı ve bütün teklifin OBS kullanımını bekletir; ayrı olumsuz kararın sıfır kredili iptal düzeltmesi yürür. Kişi özeti iç SHA/görevli alanlarını açmaz.

14.10.2026 Paket50:661+48+46=755 otomatik;12 yeni sunucu;12 bağlı inceleme+12 tanıma+11 teklif+11 OBS+13 kriptografik+11 teslim=70 tarayıcı;136komut/18HTTP8453örnek67624kapsam denetimi. 390px geçmiş görüntüsü incelendi; yeni tarayıcıda sekme ve aynı adlı option/Pill seçicileri düzeltildi. Son altı akış tam geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-REVIEW-CONTRACT.md; kanıt acceptance/B21-review-20261014.json.36 özgün iş/bağımlılık/kabul aynı. Yeniden imzalanan belge için kanonik çift kredi koruması, gerçek durum kaynağı/kurul/OBS/üretim kabulü açık.

Paket50 dağıtılmadı; son canlı16 alias dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY yeniden okundu. Yeni authenticated smoke yok; configuredCore kapalı. 17–50 dağıtılmadı. Canlı kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. BrowserAuth iptali tekrar denenmedi. Kaynak commit ve tam ağaç eşitlemesi ayrı kaydedilecek.

Paket50 kaynak doğrulaması: yerel `0c98a1b407182a16b2ef3b2c8616ee351069e870`, uzak `950d0700ec28f6ce8ce1905abd1392b56bc59ea0`, ortak tam ağaç `a21a64f92b8cdb29270df6a7421592188d0668d7`.23blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket51 — B21 yeniden imzalı belge ve çift kredi (14.10.2026)

Paket51: aynı doğrulanmış issuer/belge/kanonik çıktı kimliği, yeniden imzalanmış farklı dosya veya ders/gain anahtarıyla ikinci kredi oluşturamaz. Eski kredi kararının sabitlediği makbuz, anahtar kapansa veya son rapor değişse de ters kayda kadar sayılır. Tüm teklif rollback ve iki bağlantıda eski form sınandı. Öğrenci/akademik ekranda neden görünür, pozitif seçenek kapalı; yalnız teknik role kredi ayrıntısı açılmaz. Manuel çıktı etiketleri arasındaki anlamsal eşdeğerlik gerçek uzman/kaynak incelemesine bağlıdır.

14.10.2026 Paket51:672+48+46=766 otomatik;11 yeni sunucu;12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=58 tarayıcı;136komut/18HTTP8761örnek70088kapsam denetimi. 390px görsel incelendi. İlk yeni testte ekran için zenginleştirilmiş talep yerine değişmez kaynak talebinin özeti kullanılarak uyarı bağı düzeltildi; son tam koşular geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-IDENTITY-CONTRACT.md ve B21-identity JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul değişmedi.

Paket51 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–51 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

Paket51 kaynak doğrulaması: yerel `49c7943c7f4614253ed75f2ce8130153100e347f`, uzak `8107c2145b7ecd0c1882eceb4eb76fad473c4b48`, ortak tam ağaç `bd7a49ee4b93cc49dda445a3f67244737f9d2930`.19blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket52 — B21 kararın görülen teknik rapora bağlanması (14.10.2026)

Paket52: her yeni tek ders ve teklif satırı kararı expectedTechnicalId ile insanın gördüğü raporu veya açık null yokluğunu taşır. Eksik/eski/başka rapor409; tek eski satır tüm teklifi geri alır. Arşivsiz yeni karar da aynı kurala bağlı; eski kayıtlar korunur. Ekran yenilenince eski karar taslağı temizlenir; geçmiş kararda gerçekten kullanılan rapor sürümü/ref görünür. Negatif0kredi için imza geçerliliği şartı eklenmez.

14.10.2026 Paket52:678+48+46=772 otomatik;6 yeni sunucu;10 sürüm+12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=68 tarayıcı;136komut/18HTTP8924örnek71392kapsam denetimi. İki ayrı Chromium sürecinde eski komisyon kimliği ayrıca doğrulandı; diğer oturumun ikinci olumlu raporundan sonra eski form gerçekHTTP409 aldı, güncel form başarılı oldu.390px görsel incelendi.16tablo148tür/115statik. RECOGNITION-VERSION-CONTRACT.md ve B21-version JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul aynı.

Paket52 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–52 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

Paket52 kaynak eşitlemesi öncesi canlı alias yeniden okundu: `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/production ve `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`. Bu salt okunur kontrol yeni authenticated smoke değildir.

Paket52 kaynak doğrulaması: yerel `38e64ce406e8447d272f35d2ef9adcaa9671bdf1`, uzak `15f9d143d114bb81f2528d1c9c4113243192255b`, ortak tam ağaç `3763f7b104243200a9ac9d537bd5a69aea13f0fc`.24blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket53 — B07 SQL anahtar metadata/commit (14.10.2026)

Paket53 IdentityKeyProvider genel metadata revizyonunu aynı SQL transaction öncesi/sonrası yeniden denetleyen PostgresIdentityKeyBridge ekledi. SQL değişiklik/denetim atomik; strict+1 ve terminal iptal, amaç/bağlam/scope, emekli devam, süre ve belirsiz COMMIT kapalı. İki aday tablo sadece PGlite testinde; LocalAcceptanceStore16tablo148tür değişmedi. Gerçek oturum repository ve HTTP bağlantısı hâlâ açık.

Paket53:16 yeni SQL testi;694 sunucu+48 portal+46 regresyon=788. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite0.5.9/PostgreSQL18.6 tek bağlantı SQL kabulü; gerçek çok bağlantı/KMS/HTTP repository kabulü değil. 136komut/18HTTP8924örnek71392kapsam denetimi;115statik.36 özgün iş/bağımlılık/kabul aynı.

Paket53 dağıtılmadı. Canlı alias yeniden okundu: dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Bu authenticated smoke değildir.17–53 canlı değil;configuredCore kapalı;browserAuth iptali yeniden denenmedi. Geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. Kaynak commit/tam ağaç ayrıca kaydedilir.

Paket53 kaynak doğrulaması: yerel `9473ee5dd485eafefdf85754698b9a36a3c7107e`, uzak `dccbe33222cde2ef89950933510b4dfd1e04a234`, ortak tam ağaç `7420bf4839a219f459d912afc289c9bf596bc0bb`.16blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket54 — B07 kalıcı giriş isteği (14.10.2026)

Paket54 PostgresIdentityChallenges anahtar köprüsüyle begin/claim/finish/fail/cancel yaşam döngüsünü bağladı. Claim provider I/O öncesi commit, değişmez state/browser/scope/redirect/contract bağı, tek kullanımlık handle, terminal durumlar ve atomik audit. Belirsiz claim/final COMMIT yeniden kullanılmaz; saat geri giderse kapalıdır. İki yeni SQL adayıyla toplam4 uygulanmamış PGtablosu; aktifSQLite16tablo148tür değişmedi. Kişi/üyelik/session/iptal/HTTP bağlantısı açık.

Paket54:18 yeni SQL giriş isteği testi;712 sunucu+48 portal+46 regresyon=806. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite tek bağlantılıdır; yeni repository HTTP/oturum kabulü değildir.136komut/18HTTP8924örnek71392kapsam denetimi;115statik.36 özgün iş/bağımlılık/kabul aynı. İlk15senaryo geçti; son incelemede geri saat, yanlış yapılandırılmış redirect/contract ve begin rollback denetimi genişletildi; son tam koşu geçti.

Paket54 dağıtılmadı. Alias yeniden okundu: dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Bu authenticated smoke değildir;17–54 canlı değil;configuredCore kapalı;browserAuth iptali tekrar denenmedi. Geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. Kaynak commit/tam ağaç ayrıca kaydedilir.

Paket54 kaynak doğrulaması: yerel `e4299e6540f77fd4db2ecc0ef3936d8ca3abd31f`, uzak `ccb42733000f5e25b67efcbbfb600cc224ee77bb`, ortak tam ağaç `269554739666fddc061635519852378ff1c291ad`.11blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket55 — SQL imzalı kimlik/üyelik/oturum (14.10.2026)

Paket55 PostgresIdentityFlow config+redirect tek özetiyle kişi/üyelik, opaque signed proof/MFA, challenge/keybarrier, session ve audit atomik zincirini bağladı. Strict+1 directory control; person ve membership revizyonu sessiona pinli, kapat/aç eski sessionı canlandırmaz. Rotate/parentfamilylogout, sub/sidANDJTI backchannel ve session öncesi iptal bariyeri, timeout ve belirsiz COMMIT kapalı.9 uygulanmamışPGadayı; aktifSQLite16tablo148tür aynı. YeniSQL HTTP/rate/CSRF/akademik sınırı ve güvenilirrestore checkpoint açıktır.

Paket55:21 yeni imzalı SQL akış testi;733 sunucu+48 portal+46 regresyon=827. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. Yeni SQL flow henüz HTTP/React/akademik depo bağlantısı değildir; tek bağlantılı PGlite kabulüdür.136komut/18HTTP8924örnek71392kapsam denetimi;115statik.36 özgün iş/bağımlılık/kabul aynı. İlk20senaryo geçti; ikinci incelemede iki flow tekrar, logout opaqueproof ve kişi audit rollback eklendi; son21yeni ve tam733sunucu geçti.

Paket55 dağıtılmadı. Alias yeniden okundu: dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Bu authenticated smoke değildir;17–55 canlı değil;configuredCore kapalı;browserAuth iptali tekrar denenmedi. Geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. Kaynak commit/tam ağaç ayrıca kaydedilir.

Paket55 kaynak doğrulaması: yerel `963b5ad0f64a9b9206f7a551e2558c7cb5c40153`, uzak `8bbac52bad914fe315f3985e5476aae2b0fffd7c`, ortak tam ağaç `6f4be4962efc301d06ee06cd69a66a7df2209edf`.15blob SHA ve tam ağaç eşleşti; expected-head/force=false ile eşitlendi. Son canlı16; yeni yayın yok.

## Paket56 — Türkçe dosya seçimi ve güncel doğrulama sonucu (yalnız yerel kabul)

Görünür değişiklik: Tanıma ve kredi talebi/belge teslimi, Yetki dosyaları eki, pilot Dosya doğrula. Kullanıcı dosya adını Türkçe yüzeyde görür, klavyeyle seçer; geçersiz yeni dosyada önceki metin veya gecikmiş sonuç kullanılamaz. Yetki eki okuma ve kaydı boyunca çift gönderim ve alan değişimi kapanır.

Yerel kabul:733 sunucu +48 portal +46 regresyon =827. 14 kontrollü dosya UI +14 yetki HTTP +12 tanıma belge HTTP =40 tarayıcı; native required/FormData, gerçek dosya teslim/indirme,390px ve zorunlu renk görüntüsü geçti. Kontrollü rozet API yanıtları kriptografik kabul değildir.115 statik dosyalı mevcut korumalı paketleme başarılı. Yeni sunucu komutu/migration yok; B24 bütün AT/altyazı/çıktı şartları açık.

Başlangıç uzak8bbac52bad914fe315f3985e5476aae2b0fffd7c / ortak6f4be4962efc301d06ee06cd69a66a7df2209edf yeniden doğrulandı. Kaynak commit/ağaç sonucu eşitlemeden sonra eklenir.14.10.2026 alias hâlâ `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY / production, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Bu kontrol yeni kimlikli smoke değildir.17–56 yayımlanmadı; configuredCore kapalı. Son canlı geri dönüş hedefi `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Önceki browserAuth iptali tekrar denenmedi.

Paket56 kaynak eşitlemesi doğrulandı: yerel `ca1ed7e2f0280e027b49f961336b0fe52753e63f`, uzak `b64461873dd94b119605f7ede7a0e733bf0b670d`, ortak tam ağaç `c084369a87c235726d6984963afab8cd4328138f`.17 blob SHA ve tam ağaç birebir; expected-head/force=false, uzak ref ve commit ağacı tekrar okundu. Yeni dağıtım yok.

## Paket57 — dar ekran ve metin aralığı (yalnız yerel kabul)

Panel: Matris ve Rubrik Stüdyosu, Müfredat, Bağlantılar, eski rol/alım formu ve22 ders uygulama tablosu. Kullanıcı dar ekranda seçim/düğme/metinleri sayfa dışına taşmadan kullanabilir; matris seçimi klavyeyle değişip aynı içerikli imzasız JSON indirildi. Yerel taslak/kurum kararı ayrımı korunur.

Kabul:106 otomatik test yeniden geçti (12 gateway/envanter,48 portal,46 regresyon); son tam733 sunucu koşusu Paketi56dır, sunucu kodu değişmedi.66 tarayıcı;98 menü,288 rol paneli,22 vaka ve ek sekme/pencereler320 CSS px/metin aralığı928 ölçümde0 taşma. Gerçek ekran okuyucu/zoom/altyazı/karşıtlık ve tüm B24 kabulü açık.115 dosyalı korumalı paket hazır; üretim migration yok.

Başlangıç uzak `b64461873dd94b119605f7ede7a0e733bf0b670d` / ortak `c084369a87c235726d6984963afab8cd4328138f`. Kaynak eşitlemesi sonucu ayrıca eklenecek.14.10.2026 canlı alias `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6` olarak yeniden okundu; bu yeni kimlikli smoke değildir.17–57 yayımlanmadı; configuredCore kapalı. Son canlı geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. BrowserAuth iptali tekrar denenmedi.

Paket57 kaynak eşitlemesi doğrulandı: yerel `2041c6003bbc64d846f19b429b294a6fd99001d4`, uzak `4d5d2d8ddacbc587df7d1df90a8eaebabe5dbe9f`, ortak tam ağaç `3861696ea04da6bdcf7e60dbc5c449bc700975af`.11 blob SHA ve tam ağaç birebir; expected-head/force=false; uzak ref ve commit ağacı yeniden okundu. Yeni dağıtım yok.

## Paket58 — SQL HTTP güvenliği (yalnız yerel kabul)

Görünür ekran değişikliği yok. Paket58:22 yeni SQL HTTP güvenlik testi;755 sunucu+48 portal+46 regresyon=849. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti; yeni SQL sınırı henüz HTTP/flowa bağlı değil. Ortak bütçe/anahtar epochu/CSRF ve permit dilimi yerel kabulde; yeni HTTP handler/flow bağlantısı yok.12 adayPGtablo üretime uygulanmadı;16SQLite148tür ve115 statik korunur.

Başlangıç uzak `4d5d2d8ddacbc587df7d1df90a8eaebabe5dbe9f`, ortak ağaç `3861696ea04da6bdcf7e60dbc5c449bc700975af`; kaynak eşitlemesi ayrıca kaydedilecek.14.10.2026 alias yeniden `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; yeni authenticated smoke değildir.17–58 yayımlanmadı;configuredCore kapalı;browserAuth iptali tekrar denenmedi. Son canlı geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.

Paket58 kaynak eşitlemesi: yerel `5d56f1e5965ecf1597fce4ff1ba143424af3732e`, uzak `0e27338722d70f7f8e3a1c811e0a798a4f4f393b`, ortak tam ağaç `0f7a07c8bc1cdceab8a9445c39ccddf047f5a6ed`.12 blob SHA/tam ağaç ve expected-head force=false doğrulandı; uzak ref/commit yeniden okundu. Yeni dağıtım yok.

## Paket59 — SQL kimlik giriş/oturum ekranı (yalnız yerel kabul)

Kurum girişi denemesi ve oturum ekranı: sentetik giriş, aynı SQL kişi/üyelik/rolü ve bitiş zamanı, yenileme/çıkış/sağlayıcı iptali. Akademik işlem kapalı olduğu görünür; canlıda açık değil. Paket59:29 yeni test (26 gerçek HTTPS+SQL,3 guard);784 sunucu+48 portal+46 regresyon=878. Yeni SQL giriş ekranında13, eski yerel girişte15 Chromium kontrolü geçti;320CSSpx/metin aralığı/odak/logolar incelendi.115 statik,16SQLite148tür ve12uygulanmamışPGaday; yeni migration yok.

Başlangıç uzak `0e27338722d70f7f8e3a1c811e0a798a4f4f393b`, ortak `0f7a07c8bc1cdceab8a9445c39ccddf047f5a6ed`; kaynak eşitlemesi ayrıca kaydedilecek.14.10.2026 canlı alias `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6` yeniden okundu; yeni authenticated smoke değildir.17–59 dağıtılmadı;configuredCore kapalı;browserAuth iptali tekrar denenmedi. Son canlı geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.

Paket59 kaynak eşitlemesi: yerel `0a49cf774db3e6040803b67428138fd7df0c7f71`, uzak `4aa001033000e727d02028bd4e53bc7a27cfb019`, ortak tam ağaç `5d055928bf64ec06d983c150521ac5997b59480b`.19blob SHA ve tam ağaç birebir; expected-head force=false; uzak ref/commit yeniden okundu. Yeni dağıtım yok.

## Paket60 — ortak menü/ders/akademik metin karşıtlığı (yalnız yerel kabul)

Paket60 8kaynakCSS içinde152metin foreground bildirimi ve2semantik muted değişkenini ölçüme göre düzeltti;137 ölçülen foreground rengi, hue korunarak açık zeminde koyulaştı, terminal yorumu açıklaştı, örnek damgası okunur oldu. Background/layout/logo değişmedi. 571 aynı kapsam taraması önce22824 yinelenen violation, sonra0; gradient/kısa sayaç/örtüşme gibi8809 inceleme bulgusu pass değildir. Tam1.4.3/WCAG/AT/nontext kabulü açık. Paket60:106 yeniden koşulan test (12 gateway/envanter48portal46regresyon),19 gezinme+7reflow;928 geometri ölçümünde0 taşma. Axe-core4.14.0 yalnız color-contrast:98menü/288panel/66ders,571frame taramasında0 belirlenmiş violation;8809 yinelenen incomplete açık. Son tam784sunucu Paketi59dur; bu dilimde runtime JS değişmedi.115statik korumalı paket;production migration yok.

Başlangıç uzak `4aa001033000e727d02028bd4e53bc7a27cfb019`, ortak `5d055928bf64ec06d983c150521ac5997b59480b`; kaynak eşitlemesi ayrıca kaydedilecek. Son doğrulanan canlı `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/kaynak`16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; yeni authenticated smoke yok.17–60dağıtılmadı;configuredCorekapalı;browserAuth iptali yinelenmedi. Son canlı geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.

Paket60 kaynak eşitlemesi doğrulandı: yerel `104069f16fa40cd265575cbe87f28a308838a992`, uzak `36e09a3e17c748471e762298b6d567c4787ffe36`, ortak tam ağaç `4ca6a740e8c6d5bdbb8e04e5bc1944ef71a68548`.22blob SHA/tam ağaç ve expected-head force=false; uzak ref/commit yeniden okundu. Yeni dağıtım yok.

## Paket61 — sayaç ve kısa metin karşıtlığı (yalnız yerel kabul)

Paket61: bildirim sayaçları, sunum sayfa düğmeleri ve rehber adım numaralarında beş renk çifti düzeltildi. Aynı 571 taramada tek karakterleri de değerlendiren profille 703 yinelenen ihlal 0 oldu; 8106 incomplete bulgusu açık. Eşikler 4.5:1/3:1 değişmedi. Tam B24/WCAG kabulü değildir. 106 otomatik test (12 gateway/envanter,48 portal,46 regresyon) ve19 gezinme kontrolü yeniden geçti; ölçüm profilinin8 karşı örnek kontrolü geçti. Son tam784 sunucu testi Paket59dadır; bu dilimde runtime JS değişmedi.115 statik dosyalı korumalı paket hazır; üretim migration yok.

Başlangıç uzak `36e09a3e17c748471e762298b6d567c4787ffe36`, ortak tam ağaç `4ca6a740e8c6d5bdbb8e04e5bc1944ef71a68548`; kaynak eşitlemesi ayrıca kaydedilir.14.10.2026 alias yeniden `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/production, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; bu yeni kimlikli smoke değildir.17–61 yayımlanmadı;configuredCore kapalı;browserAuth iptali yinelenmedi. Son canlı geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.

Paket61 kaynak eşitlemesi: yerel `e4e5cb1bef2288b3e1068d624d0541ec82102d27`, uzak `555ce3a3a52f520a4c2eeb24387d44064a82715d`, ortak tam ağaç `d583a36b046cd2e7b40e3697d9ffea2a267d4b49`.16blob SHA/tam ağaç ve expected-head force=false doğrulandı. Yeni dağıtım yok.

## Paket62 — geçişli zemin metinleri (yalnız yerel kabul)

Paket62: öğrenme akışı, ders/sunum açıklamaları ve kaynak dipnotlarında7 foreground değeri düzeldi; koyu bilgi/rozet kartlarının2 başlık rengi tema seçicisi önceliğiyle korundu. Geçişli arka planlar/yerleşim/logolar aynı.88 ayrı ölçüm imzasından85i bu renderda karşıtlık hedefini geçti;3ü incelemede.3815 tekrar ayrı ölçülmedi. Axe571taramada0violation;8106incomplete hâlâ açık, pass olarak yeniden yazılmadı. 106otomatik (12gateway/envanter48portal46regresyon),19gezinme,8kısa metin ve16gradient ölçüm kontrolü geçti. Son tam784sunucu Paketi59; runtime JS değişmedi.115statik; yeni migration yok. Başlangıç uzak `555ce3a3a52f520a4c2eeb24387d44064a82715d`, ortak ağaç `d583a36b046cd2e7b40e3697d9ffea2a267d4b49`; kaynak eşitlemesi ayrıca kaydedilir. Son doğrulanan canlı `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; yeni kimlikli smoke yok.17–62dağıtılmadı;configuredCore kapalı;browserAuth iptali yinelenmedi. Geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.

Paket62 kaynak eşitlemesi: yerel `661b675434c5343db4eed7eec58121a4f1833166`, uzak `1c03d4b198dbd8e4b6be5284a0c3d2f094a31162`, ortak tam ağaç `54ea32d516f0c1ac3aeb7b75bdb105c6f9307003`.14blob SHA ve tam ağaç/expected-head force=false doğrulandı. Yeni dağıtım yok.

## Paket63 — erişilebilir ad/tablo/odak (yalnız yerel kabul)

Paket63: öğrenme kartı/dinamik bildirim erişilebilir adları, İşlem sütun başlıkları,4grup/gezinme rolü ve rozet seçimi pressed durumu düzeldi.9React/9eski tablo ve takip tahtası adlandırılmış klavye kaydırma bölgesi; program özet/bağlantıları en az28CSSpx. İki Radix menüsünde arka plan inert, kapanış odağı korunur. 106otomatik12gateway/envanter48portal46regresyon;19gezinme10yeni etkileşim7reflow kontrolü geçti.928geometri ölçümünde0taşma. Axe4.14.0ile69WCAGetiketli kural:1440ve320genişliklerde571er toplam1142frame taramasında0violation;8ve530incomplete ham olarak korunur. Son tam784sunucu Paketi59; sunucu çalışma kodu değişmedi.115statik/16SQLite148tür/12uygulanmamışPGadayı; yeni migration yok. Başlangıç uzak `1c03d4b198dbd8e4b6be5284a0c3d2f094a31162`, ortak ağaç `54ea32d516f0c1ac3aeb7b75bdb105c6f9307003`; kaynak eşitlemesi ayrıca kaydedilir. Son doğrulanan canlı `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY/kaynak`16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; yeni kimlikli smoke yok.17–63dağıtılmadı;configuredCorekapalı;browserAuthiptaliyinelenmedi. Geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı.


## Paket63 kaynak eşitleme kaydı · 14.10.2026

Yerel34948086c65fef7683e4ac77826d172298952ca4; uzak8abb2bac450407af850af8ed3f49e38f7a13aea3; ortak tam ağaç3b1258f853a300879f40debe87b58d578c6f17fd.28blob/tam ağaç ve expected-head force=false doğrulandı. Bu kaynak kaydıdır; canlı yayın değildir.

## Paket64 yerel kabul · 14.10.2026 — henüz canlı yayın yok

Yeni menü/ekran yok. Yerel Kurum girişi/oturumu denemesi ayrı kalıcı checkpoint ile çalıştı; güncellik veya commit belirsizliğinde erişim kapalı.23yeni güvenlik/SQL/TLS senaryosu;807sunucu+48portal+46regresyon=901.13tarayıcı,320CSSpx/metin aralığı/odak/logolar;115statik korumalı paket. Yeni1PGadayıyla toplam13, üretim migration yok.16SQLite148kayıt türü korunur. IDENTITY-CHECKPOINT-CONTRACT.md ve acceptance/B07-B28-checkpoint-20261014.json sınırları içerir. B07/B27/B28 bütünü tamamlanmadı.

Kaynak tabanı63:yerel34948086c65fef7683e4ac77826d172298952ca4/uzak8abb2bac450407af850af8ed3f49e38f7a13aea3/tam ağaç3b1258f853a300879f40debe87b58d578c6f17fd;64commit sonrası tam ağaç yeniden eşitlenecek. 14.10.2026 saltokunur alias kontrolü dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY/production, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke/deploy yok;17–64dağıtılmadı. browserAuth iptali yeniden denenmedi. Korunan geri dönüş hedefi dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı.


## Paket64 kaynak eşitleme ·14.10.2026

Yerel aa746c5e3cd9ebe9dbd486f52c3dd87bd4634d44, uzak7fe42883197d1a059fce6fe54e8732f0e9fc93f6, ortak tam ağaç79eaddab25e1b2573812fde4fbb775481465ef92.18blob ve tam ağaç eşleşti;expected-head force=false/uzak commit teyitli.901otomatik13tarayıcı;canlı dağıtım değildir.

## Paket65 — 14.10.2026 yerel kabul ve kaynak adayı; yayın değil

Panel: Akademik Kayıt ve Karar → Akış ve saklama. Açık kurum kapsamlı üç ayrı görevin hazırlama/inceleme/önizleme/temizlik yolu; başarısız ve iptal edilmiş kişiye bağlanmamış eski istekler için sınırlı100satır. Güncel yetki/özet/süre, onay kutusu, klavye ve kalıcı makbuz; eski oturum temizliği korundu.

820sunucu+48portal+46regresyon=914;13yeni test,14yeni12mevcut tarayıcı.136komut/18HTTP9035pozitif72280negatif kapsam örneği;115statik korumalı paket. İlk36işin kimliği/bağımlılığı/ölçütü özgün kaynakla aynı. Kanıt: `acceptance/B28-unassigned-retention-20261014.json`. Tam B28 veya yasal imha kabulü değildir.

Başlangıç kaynak: yerel `aa746c5e3cd9ebe9dbd486f52c3dd87bd4634d44`, uzak `7fe42883197d1a059fce6fe54e8732f0e9fc93f6`, ortak tam ağaç `79eaddab25e1b2573812fde4fbb775481465ef92`; uzak dal/commit yeniden doğrulandı. Yeni kaynak commit ve tam ağaç eşitlemesi sonraki devam kaydına yazılacak.

14.10.2026salt-okunur canlıalias hâlâ kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, dağıtım `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READYproduction.17–65dağıtılmadı; yeni kimlikli canlısmoke yapılmadı. Geri dönüş15 `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Önceki browserAuthiptali yenilenmedi; configuredCorekapalı. Üretim migration/gerçek veri silme/yeni credential yok.
