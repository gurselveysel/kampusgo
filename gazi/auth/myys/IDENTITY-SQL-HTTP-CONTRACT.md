# B06/B07 — SQL kimliğinin yerel HTTPS kabulü

14.10.2026 · Paket59 · canlı kurum bağlantısı değildir.

Yeni **Kurum girişi denemesi / Kurum oturumu denemesi** ekranında kullanıcı sentetik sağlayıcıyla giriş yapabilir, aynı SQL kişi/kurum/birim/rolünü ve bitiş zamanını görebilir, yenileyebilir ve çıkabilir. İmzalı sağlayıcı çıkışı da sonraki okumayı kapatır. Gazi amblemi önde, özgün ÜniGO ve deneme sürüm açıklaması altta; alanlar ve hata/çıkış metinleri Türkçedir. Örnek kayıtlardaki student/engineering gibi kimlikler veri değeridir.

Akademik panel/komut bu oturumun arkasına bağlanmadı; ekran bunu açıkça belirtir. Yanıt `academicAccess:false,official:false` taşır. Ayrı LocalAcceptanceStore kaydıyla sahte bir tek kişi/akademik zincir kurulmadı. Üretimde configuredCore kapısı ve mevcut korumalı paket korunur.

## HTTP sınırı

`LocalPostgresIdentityHttp` yalnız tam `https://127.0.0.1:<port>` uygulama origin'i ve loopback sağlayıcı endpoint'i kabul eder; constructor ve her istek VERCEL/VERCEL_ENV altında kapanır. Üretim route'u bu modülü import etmez. Şema/seed/anahtar oluşturma veya uzak servis kurma yoktur. Gerçek production proxy/TLS/IdP sözleşmesi ayrı açıktır.

Altı mevcut kimlik yolu ayrı yerel SQL sunucusunda kullanılır: login/session/start/callback/logout/backchannel. HTTPS socket ve exact Host gerekir; Forwarded/X-Forwarded-* değerleri bu doğrudan loopback profilinde reddedilir. URL/method/query/cookie tekilliği, canonical43karakter cookie ve form sınırı denetlenir. Başlangıç/çıkış POST formunda exact Origin, varsa same-origin Fetch Metadata ve HMAC CSRF aranır. İstemci rol/issuer/subject seçemez; tenant gönderiliyorsa sabit tenant'a eşit olmalıdır. Çakışan header/form CSRF reddedilir.

4KiB form, backchannel için24KiB; yalnız URL-encoded form. Duplicate/unknown alanlar ve geçersiz UTF-8 kapanır. Bu sürüm JSON mutasyon kabul etmez. Bu, mevcut LocalIdentityHttp API'sinin değiştirilmesi değildir. Callback'te tek state/code/iss veya error; yanlış cookie/issuer/state ve replay sağlayıcıya ulaşamaz.

Cookie `__Host-myys-session; Path=/; Secure; HttpOnly; SameSite=Lax`; login öncesi900s, başarılı callback sonrası yeni rastgele32bayt ve session süresini aşmayan Max-Age. Ham secret SQL'e yazılmaz. No-store, nosniff, no-referrer yönlendirmeleri, frame-ancestors/base-uri yasağı ve yalnız exact form hedefleri korunur. Arayüz scriptsizdir; CSS hash ve aynı-origin özgün resimler izinlidir. CSP'nin connect-src sınırı test kolaylığı için açılmadı; tarayıcı kabulü gerçek navigasyon/form ile yapılır.

Oturum API'si başarısızken de JSON döner; navigation Accept başlığı bunu HTML'ye çeviremez. 429 Türkçe hata/Retry-After/no-store verir. Cookie yalnız başarılı sonuçtan sonra gönderilir. SQL veya beklenmeyen sunucu hatasının ayrıntısı kullanıcıya taşınmaz.

## Aynı işlemde güvenlik denetimi

HTTP sınıfı aynı transaction nesnesi ve özel güvenlik nesnesiyle flow'u kendi içinde oluşturur; dışarı açık flow/permit yoktur. Her HTTP isteği önce kalıcı bütçeden opak permit alır ve `finally` ile kapatır. Guard yapılandırılmış flow, eksik/taklit/başka amaç veya repository permit'iyle ilerlemez. Önceki bağımsız server-only flow testleri guardsız çalışabilir; bunlar HTTP yetkisi değildir ve normal route'a bağlanamaz.

- Begin: ilk scope kontrolü ve KMS I/O sonrasındaki challenge transaction'ında guard + browser scope yeniden okunur. Anahtar değişince hiçbir yeni pending istek yazılmaz.
- Callback: claim/audit COMMIT öncesi guard; IdP/KMS/imza işleri transaction dışındadır. Son session/directory/revocation/challenge-use/audit transaction'ının başında ve son yazısından sonra aynı permit/epoch kontrol edilir. Anahtar revizyonu arada değişirse veya permit süresi biterse bütün kabul geri alınır.
- Principal: mevcut kişi/üyelik/session ile guard işlem başında ve sonunda. Logout ve imzalı backchannel da son audit sonrası guard; süresi dolan isteğin iptal/audit/makbuzu birlikte geri alınır.
- Provider/KMS başarısızlığındaki terminal `failed` temizliği yeni yetki oluşturmaz; süresi bitmiş permit yüzünden isteği tekrar pending yapmaz. Final COMMIT belirsizse yeni cookie gönderilmez ve otomatik tekrar/fail işlemi yapılmaz; DB'de aktif fakat istemcinin secret'ını alamadığı session kalabilir. Bu kurtarılmış oturum sayılmaz.

Scope/global browser kilitleri ve epoch satırı transaction süresince korunur. Bu tek bağlantılı PGlite kabulü native SSI/çok bölge yarışı değildir. Bütün yazıcıların bu sınırı kullanması ve güvenilir iptal checkpoint'i hâlâ ayrı yükümlülüktür.

## Kabul kanıtı

26 gerçek Node HTTPS+PGlite testi ve3 doğrudan guard testi: kişi/üyelik/MFA, cookie döndürme, state/iss/cookie/query tekilliği, CSRF/Origin/Host/forwarding/form/method, callback tekrar/iptal, provider beklerken kişi/anahtar değişimi, permit süre aşımı (son SQL use/audit dahil), eski işçi/CSRF, iki sekme logout semantiği, pre-session logout, imzalı backchannel ve geç callback, gerçek claim/final COMMIT sonrası bağlantı kaybı, audit rollback, bütçe, JSON hata biçimi, HTTP timeout, TLS ve Vercel kapısı, guard kopya/amaç/repository ve KMS sırasında epoch değişimi.

**784 sunucu +48 portal +46 regresyon =878 otomatik** test geçti. Yeni SQL HTTPS ekranında13, eski yerel girişte15 gerçek Chromium kontrolü geçti.320CSSpx/metin aralığı, odak, logolar ve masaüstü görselleri incelendi; gerçek ekran okuyucu/zoom veya tam WCAG kabulü değildir. İlk browser koşusu scriptsiz CSP nedeniyle fetch denemesini reddetti; test navigasyon/form kullanacak şekilde düzeltildi. Sonraki koşu session API HTML hata biçimini buldu; JSON sabitlenip regresyon eklendi. Son testler temiz geçti.

Tarayıcı yalnız geçici test sertifikasının SPKI'sine güvenir; Node CA ve hostname doğrulaması yapar. Tüm diğer ağ hedefleri engellidir. Gerçek parola/OTP/kişi kullanılmadı. PGlite0.5.9/PG18.6 tek exclusive bağlantı; HTTP concurrency native çok session değildir.115 statik,16 aktifSQLite/148tür ve12 uygulanmamışPGadayı korunur. Yeni DDL yok.

## Açık işler ve kaynak kapsamı

Async akademik repository ve kimlik/komut transaction bağı; yetkili directory/key kontrol düzlemi, bütün yazarlar, monoton restore checkpoint; üretim TLS/proxy/cookie/origin sözleşmesi ve gerçek IdP/client/MFA/KMS; native çok bağlantı/SSI/RLS/driver/pool/kapasite; kurumsal saklama ve gerçek kabul açıktır. B06/B07 ve B01–B36 bütünü tamamlanmadı. Paket17–59 canlıya dağıtılmadı; son canlı16.

Kaynaklar: OIDC Core1.0 errata2 (15.12.2023) §3.1.2.1/3.1.3.7, Back-Channel Logout1.0 errata1 §2.4–2.8/4.1 ve PG18 kaynak kapsamı `IDENTITY-SQL-FLOW-CONTRACT.md` içinde korunur.14.10.2026 okunan OWASP CSRF ve RFC6585 §4 kayıtları `IDENTITY-HTTP-SECURITY-CONTRACT.md` içindedir. Bu teknik dayanaklar kurumsal kimlik/MFA onayı veya production erişimi değildir.
