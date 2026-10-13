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
