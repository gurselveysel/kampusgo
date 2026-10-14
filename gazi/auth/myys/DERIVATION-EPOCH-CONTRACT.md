# B07 — PKCE/nonce için yerel oturum commit bariyeri

14.10.2026 · Yazılım paketi 45. Yeni panel veya menü yok. Mevcut sentetik HTTPS girişinde anahtarı durdurulmuş/değişmiş callback oturum çerezi alamaz; mevcut başarısız giriş dönüşünü kullanır. Gerçek kurum IdP/KMS/SQL depo bağlantısı değildir.

## Yerel protokol

`LocalIdentityFlow` türetme anahtarı sabitini artık `derivationRevision` ve anahtarın sabit bağlamlı HMAC-SHA-256 özetiyle birlikte challenge sözleşme özetine dahil eder. Varsayılan ilk revizyon 1’dir. Ham anahtar, state, nonce, verifier, code veya session token bu sicile yazılmaz.

İki ek teknik tablo vardır:

- `identity_derivation_epochs`: tenant + issuer/audience namespace kapsamında monoton revizyon, anahtar özeti ve etkinleşme zamanı. Aynı kapsama eski anahtar geri getirilemez; sürüm atlanamaz. Yeni revizyon için güvenilen yerel operatör `activateLocalDerivationKey` çağırır. Tarayıcıdan/HTTP’den alınan alanlar bu işlemi çalıştıramaz.
- `identity_derivation_blocks`: anahtar özetine göre değişmez durdurma kaydı. Aynı anahtar başka tenant/issuer/audience altında kullanılmışsa hepsinde yeni giriş kapanır. Yeni bir namespace açarak engel aşılamaz. Bu, tenant yöneticisi yetkisi değildir; yalnız izole kabul deposunun güvenilen operatör sınırıdır. Gerçek servis anahtarı veya credential oluşturmaz.

İlk revizyon challenge başlangıcıyla aynı `BEGIN IMMEDIATE` içinde kurulur. Sonraki etkinleşme veya durdurma, denetim yazılarıyla aynı işlemde olur; audit hatası tümünü geri alır. Tekrar aynı etkinleşme/durdurma yeni audit oluşturmaz. SQL değişmezlik tetikleyicileri rutin UPDATE/DELETE’i kapatır; yetkili DBA veya eski yedekle değiştirmeye karşı dış güven kökü değildir.

`assertCurrent` açık veritabanı işlemi dışında kullanılamaz. Gerçek akış onu şu üç yerde çağırır:

1. Yeni challenge oluşturulurken; başka kurum oturumu denetiminden sonra.
2. Provider kod alışverişi öncesi tek kullanımlık claim alınırken.
3. İmzalı belirteç doğrulandıktan sonra, güncel kişi/üyelikle oturumun yazıldığı **aynı** transaction içinde, challenge tüketilmeden ve binding yaratılmadan önce.

Provider ağı ve imza doğrulaması transaction dışında kalır. Arada başka bağlantı anahtarı durdurur veya yeni revizyonu etkinleştirirse son denetim başarısız olur. Challenge başarısız sayılır, yeni binding/scope/session-link/accept-audit commit edilmez, token/çerez dönmez. Callback zaten commit ettikten sonra yapılan durdurma, daha önce kurulmuş oturumu geriye dönük olarak anahtar kaynaklı sayıp silmez; kişi/üyelik, süre ve çıkış/iptal kontrolleri devam eder. Güvenlik olayında bütün oturumları kapatma ayrı kurum/operasyon kararıdır.

Eski revizyonla bekleyen isteğin devamına izin verilmez; bu yerel akışta güvenli yeniden giriş istenir. Yanlış anahtarlı işçi aynı challenge sözleşmesini bulamaz; provider çağırmaz ve doğru işçinin isteğini tüketmez. Eski, anahtar bağı içermeyen challenge yeni akışla kullanılamaz. Eski yazılım işçileriyle karma dağıtım için otomatik koruma iddiası yoktur: oturum yazan tüm işçiler bu protokolü kullanmalı; eski işçiler güvenli geçişte boşaltılmalıdır.

## Kabul ve sınır

İki gerçek SQLite bağlantısı; sağlayıcı bekleme aralığında dönüşüm; **imza doğrulaması sonrasında commit girişinde** ikinci bağlantıdan durdurma; farklı tenant/audience’da ortak anahtar; ilgisiz anahtarın korunması; önceki anahtar/sürüm/saat tekrarları; ilk kurulum ve değişiklik audit rollback; sırların saklanmaması; üretimde kapanma testleri vardır. İki yeni loopback HTTPS testi eski callback’in çerez vermediğini, engelli başlangıcın tam `503/identity_key` sonucunu ve yeni anahtarla aynı kişiye yeniden girişin çalıştığını doğrular. Hatalar yalnız herhangi bir test istisnasıyla başarılı sayılmaz.

Bu, `IdentityKeyProvider`’ın gerçek `describe/mac` sürücüsüyle bağlandığı anlamına gelmez. O API’nin metadata revizyonunu kalıcı challenge ile eşleyen üretim repository, KMS iptalinden **önce** veritabanı bariyerini kapatan kontrol düzlemi, bütün session yazarları, PostgreSQL/RLS/dağıtık eşzamanlılık ve B27 geri yükleme checkpoint’i açıktır. Yerel sicilin eski yedekle geri alınmasını kendi içindeki monoton sayılar saptayamaz. B28 bu iki güvenlik tablosunu otomatik temizlemez; hukuki saklama süreleri verilmedi.

CSRF/rate epoch ayrı kalır; Paket39 bütçe koruması kaldırılmadı. Vercel `configuredCore()` kapalıdır; gerçek veri, erişim, migration, KMS ve IdP işlemi yapılmadı. B07 bütünü tamamlanmış değildir.

## Kaynak

[SQLite Transaction belgesi](https://www.sqlite.org/lang_transaction.html), son güncelleme 18.02.2026, 14.10.2026 okundu: eşzamanlı okuyuculara karşı tek yazıcı; `BEGIN IMMEDIATE` yazma işlemini baştan alır ve çakışmada BUSY dönebilir. Buradaki epoch/durdurma protokolü proje tasarımıdır; SQLite’ın veya bir kurumun kimlik standardı değildir. Başka veritabanına aynı atomiklik varsayılmaz. Daha önce okunan OAuth/PKCE ve kimlik sözleşmeleri `IDENTITY-CONTRACT.md` / `IDENTITY-ADAPTER-CONTRACT.md` içinde korunur.
