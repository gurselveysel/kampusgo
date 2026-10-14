# B07 — yerel HTTP anahtar dönüşümü

14 Ekim 2026 · `local-http-key-rotation/1` · yalnız izole kabul. Yeni panel menüsü yok; anahtar değişimi beklerken 503 durumlu, Türkçe ve `role=alert` içeren giriş ekranı var. `configuredCore()` üretimde kapalıdır.

## Davranış

`LocalIdentityRateLimit`, kurum ve issuer/audience özeti kapsamında güvenilen sunucu yapılandırmasının ardışık `keyRevision` değerini izler. İlk sürüm 1 olmalıdır. Aynı sürümde farklı anahtar veya sınır ayarı, atlanan/geri alınan sürüm ve önceki anahtarın yeni sürümde tekrar kullanılması reddedilir. Anahtarın kendisi yazılmaz; sabit bağlamın HMAC özeti, sınır ayarlarının özeti ve etkinleşme zamanı yazılır. `identity_http_key_epochs`, `identity_http_key_history` ve denetim kaydı aynı SQLite transaction'ında değişir; audit hatası tümünü geri alır.

Yeni sürüm, aynı namespace içindeki **bütün amaçlara ait canlı oran kovaları** sona ermeden etkinleşmez. Böylece anahtar değişimi kova adresini değiştirip canlı bütçeyi sıfırlayamaz. Eski, epoch kaydı bulunmayan depodaki canlı kovalar da bu kurala tabidir. Etkinleşmeden sonra eski işçiler her yeni HTTP isteğinde reddedilir. İki SQLite bağlantısı aynı kaydı görür; bu üretim dağıtık veri tabanı kanıtı değildir.

Geçiş sırasında yeni işçi 503 ve `Retry-After: 60` döndürür; cookie oluşturmaz. HTML isteyen tarayıcı Türkçe bekleme sayfası görür; JSON istemcisi güvenli hata alır. Sunucu bildirimi uç noktası HTML döndürmez. Etkinleşmeden sonra mevcut oturum aynı kişiye bağlı kalır; yeni işçi yeni CSRF değeri verir. Eski CSRF ile akademik yazma reddedilir; yenisiyle mevcut yetki kapsamında devam eder. Akademik kayıt ve değerlendirme arşivi değişmez.

## İşletim sınırı

Geçiş beklerken eski işçi otomatik durdurulmaz. Operatör eski işçilere yeni istek gelişini durdurmalı, işlemdeki istekleri tamamlamalı, bütün canlı pencerelerin sona ermesini beklemeli ve yeni ardışık sürümü açmalıdır. Eski işçiler çalışmaya devam ederse yeni kovalar oluşturabilir; **bir dakikada kesin geçiş veya acil anahtar iptali garantisi yoktur**. Retry-After, yeniden deneme önerisidir. Gerçek anahtar sağlayıcısı/dağıtım kontrol düzlemi bağlı değildir.

Denetim HTTP isteğinin başlangıcındadır; daha sonra bekleyen sağlayıcı çağrısı veya gövde okuması sırasında başlayacak dönüşümü aynı akademik/session commit içinde yeniden denetlemez. Bu değişiklik **PKCE/nonce KMS revizyonunun atomik session-commit bariyeri değildir**. `LocalIdentityFlow` mevcut ayrı statik türetme anahtarını kullanır. PostgreSQL repository, gerçek driver/RLS, anahtar geri yükleme checkpoint'i ve KMS/IdP kabulü açık kalır. History tablosu uygulama kodundan güncellenmez/silinmez; ayrı bir DB değişmezlik veya yetkisiz DBA koruması iddiası yoktur. B28 saklama envanterine iki yeni teknik tablo dahil edilmelidir.

## Yerel kabul

- 7 yeni oran/anahtar testi: canlı bütçe, ardışık sürüm ve anahtar tekrarı, iki bağlantı, farklı amaçlar, audit rollback, tenant/issuer/audience ayrımı, eski depodaki canlı kovalar.
- 1 yeni gerçek loopback HTTPS senaryosu: 503/HTML/Retry-After, cookie yokluğu, mevcut kişinin korunması, eski/yeni CSRF, eski/yeni işçi ve aynı yeni sürümle yeniden kurulum.
- Tam 540 sunucu + 48 portal + 46 regresyon = 634 otomatik test geçti. 15 mevcut HTTPS kimlik ve 13 itiraz tarayıcı kontrolü tekrar geçti. Yeni dönüşüm HTML'i HTTP yanıt testiyle doğrulandı; dönüşüme özel görsel tarayıcı kabulü yapılmış sayılmaz.
- 111 komut/16 HTTP kapsam matrisinde 5063 olumlu örnekten 40504 negatif kontrol; 115 korumalı statik dosya. Canlı yayın yok. B07 bütünü tamamlanmadı.

## Teknik kaynak

[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), sürümsüz güncel belge; 14.10.2026 tarihinde token iletimi ve HMAC/session bağı bölümleri okundu. Oturuma bağlı sunucu doğrulaması, tokenı URL/loglara taşımama ve Origin denetimi korunur. Buradaki ardışık epoch ve bütün kovaların bitmesini bekleme tasarımı proje kararıdır; OWASP tarafından tarif edilmiş rotasyon protokolü veya kurum politikası olarak sunulmaz.

## Paket45 izleme

Yerel statik PKCE/nonce anahtarı artık aynı oturum transaction’ında monoton revizyon ve küresel yerel engel siciliyle denetlenir. Ayrıntı `DERIVATION-EPOCH-CONTRACT.md`. İki yeni teknik tabloyla envanter16 tablo/133tür; otomatik temizleme yok. Yukarıdaki tarihsel paket sınırları korunur; gerçek KMS metadata/üretim SQL/geri yükleme checkpoint köprüsü hâlâ açık.
