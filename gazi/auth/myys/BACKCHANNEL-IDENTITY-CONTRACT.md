# B07 — sağlayıcı çıkışı ve kalıcı giriş oran sınırı

14 Ekim 2026 · Yerel profil `backchannel-local-1`. Bu dilim yalnız sentetik HTTPS kabulüne bağlıdır. Gerçek Gazi IdP, yeni credential, üretim migration'ı veya canlı SSO açılmadı. `configuredCore()` kapalıdır; mevcut pilot giriş kapısı değişmedi.

## Kullanıcı sonucu

Sentetik sağlayıcıdaki çıkış, aynı kişinin uygulama oturumlarını sunucuda iptal eder. Açık sekmenin sonraki okuması/komutu reddedilir; mevcut kapalı oturum ekranı yeniden giriş yolunu gösterir. Yeni doğrulama aynı kişiyi ve akademik geçmişi korur. Tarayıcı kapatılmadan ekranda bulunan önceki metinler kendiliğinden silinmez; WebSocket/bildirim veya uzaktan tarayıcı temizleme iddiası yoktur.

Giriş istekleri yerel sınıra ulaşırsa Türkçe, başlıklı ve uyarı etiketli bekleme ekranı açılır; sabit giriş bağlantısı ve bir dakika bekleme açıklaması vardır. JSON istemcisine 429 ve aynı anlamlı hata; `Retry-After: 60` döner. Akademik kayıt değişmez.

## Kaynak ve uygulama profili

[OpenID Connect Back-Channel Logout 1.0, errata set 1](https://openid.net/specs/openid-connect-backchannel-1_0.html), 15.12.2023; 14.10.2026 tarihinde §2.4–2.8 ve §4–4.1 okundu. İmzalı `iss/aud/iat/exp/jti/events`, `sub` ve/veya `sid`, nonce yasağı, form POST, başarılı/başarısız yanıt ve JWT tür ayrımı bu kapsamda incelendi. Bu teknik kaynak Gazi yetkisi veya gerçek sağlayıcı sözleşmesi değildir.

Yerel profil özellikle dar tutuldu: yalnız statik güvenilen açık JWK/RS256 veya ES256; tek audience; açık `logout+jwt` türü; azami 120 saniyelik belirteç; şifreli JWT/JWE desteği yok. Standarttaki bütün sağlayıcı profilleriyle uyumluluk iddia edilmez. Sağlayıcıyla tür, süre, imza ve şifreleme müzakeresi yapılmadan üretim adaptörü açılamaz.

## İşlem ve yarış sınırı

- `POST /api/myys/kimlik/saglayici-cikis`: yalnız sabit HTTPS uygulama Host'u, sorgusuz yol, form gövdesi; tek `logout_token`. Gövde 24 KiB, JWT 16 KiB ile sınırlı. Bilinmeyen form uzantıları yok sayılır. Cookie/Origin/CSRF bu sunucular arası bildirimin kimlik kanıtı değildir; imza/sabit sözleşme kanıttır. Normal giriş/çıkış Origin ve CSRF kuralları aynen sürer.
- Girişte doğrulanmış issuer, audience, subject ve varsa sid, tenant ve döndürülmüş session hash'ine aynı işlemde bağlanır. Subject/sid için özet saklanır; bunlar anonim veri sayılmaz. Ham ID/Logout Token, jti, sid, nonce, verifier veya çerez kalıcı yazılmaz.
- `sub+sid` ikisi birlikte eşleşir; yalnız sub bütün eşleşen cihazları, yalnız sid eşleşen sağlayıcı oturumunu hedefler. Tenant/issuer/audience sınırı aşılmaz. Başka kurumun mevcut tarayıcı bağını yeni giriş başlangıcı veya gecikmiş dönüş silemez.
- Tek işlem: benzersiz jti makbuzu + eşleşen oturumların iptali + bağlı bekleyen/claimed challenge iptali + audit. Herhangi bir yazım başarısızsa tamamı geri alınır. Bilinmeyen veya zaten kapalı oturum 200; aynı doğrulanmış içerik/jti tekrarı 200 fakat işlem/audit tekrarı yok. Aynı jti ile farklı doğrulanmış içerik 400; süre dolan tekrar 400.
- Henüz kişi bağı kurulmamış giriş için de makbuz tutulur. Gecikmiş callback commit'i eşleşen iptal kaydını denetler. İstek bildirimin alınmasından sonra başlamalı; ID Token `iat` ve `auth_time` bildirimin `iat` değerinden büyük olmalıdır. Aynı saniyeye denk gelen yeni doğrulama ihtiyatlı olarak reddedilir; yeni istek gerekir. Eski MFA/SSO kanıtı yalnız yeni token zamanı verilerek tekrar oturum açamaz.
- Makbuz zaman eşiği işlem sırasında yeniden okunur. İki ayrı SQLite bağlantısında tekrar ve iptal/giriş yarışları denetlendi. Bu, dağıtık PostgreSQL/IdP üretim kabulü değildir. Token doğrulama ağdan anahtar veya discovery çekmez.

## Oran sınırı ve anahtar sınırı

`identity_rate_buckets` her tenant/issuer/audience/işlem için kalıcı sabit pencere tutar: 60 saniyede genel 120, doğrulanmış soket adresi başına 40, başlangıçta çerez özeti başına 10. Bunlar **yerel kabul ayarlarıdır**, kurumsal SLA/üretim limiti değildir. Pencere sınırında iki pencerenin bütçesi kısa aralıkta kullanılabilir; kayan pencere iddiası yoktur. Başlıkla bildirilen IP kullanılmaz. Ağ ve çerez kovası sunucu anahtarıyla HMAC'lenir; ham IP kalıcı yazılmaz.

Sayaç denetimi/artırımı tek işlemde yapılır. Genel kota adres/çerez değiştirmeyle aşılamaz; başarısız kota denemesi yeni kova yaratmaz. Süresi bitmiş operasyonel sayaçlar kabul edilmiş yeni istekte aynı kapsamda temizlenir. Oran tablosu yazılamazsa veya saat kayıt penceresinden geriye giderse istek açılamaz. Farklı işlem kotaları ayrıdır: giriş denemesi çıkış bütçesini tüketmez. İmzasız bildirimler de doğrulama öncesi bütçe tüketir; gerçek kurumsal ağ/ölçek ve meşru bildirim gecikmesi için kapasite kabulü gereklidir.

Testin derivation/CSRF anahtarları yalnız geçici bellektedir. Kalıcı yeni credential oluşturulmadı. Aynı depoyu paylaşan işçiler aynı anahtar sürümü, kapsam ve limit yapılandırmasını kullanmalıdır; bağımsız işçi anahtarıyla üretim çalıştırılması kabul edilmez.

## Üretim depo ve anahtar sağlayıcısı için zorunlu adaptör sözleşmesi

Aşağıdakiler uygulama tasarımı ve kabul yükümlülüğüdür; kurulmuş hizmet değildir.

| Sınır | İşlem ve kabul yükümlülüğü |
|---|---|
| Challenge claim | State/browser/tenant/contract/süre koşullu compare-and-set; claim ağ çağrısından önce kalıcı commit. Aynı istek ikinci işçide provider çağrısına gitmez. |
| Session commit | Kişi/üyelik/MFA/scope ve iptal eşiği aynı seri işlemde tekrar okunur; challenge tüketimi, önceki aynı-tenant bağının döndürülmesi, provider eşlemesi ve audit atomik. |
| Provider iptali | Tenant+issuer+audience+jti benzersizliği; session eşlemeleri ve callback commit'iyle ortak kilit/serializable düzen; receipt/iptal/audit aynı transaction. |
| Okuma ve yetki | Her ayrı HTTP okuma, komut ve dışa aktarma güncel iptali/üyeliği görür. İşçi belleğindeki olumlu yetki cache'iyle devam edilmez; bağlantı belirsizse reddet. |
| Rate bucket | Aynı anahtar sürümü ve pencereyle atomik limit tüketimi; bir işçi veya region değişimi bütçeyi sıfırlamaz. Önce güvenilen proxy zinciri kararı; kullanıcı başlığı adres değildir. |
| Anahtar alma | Sunucuya ait tenant+purpose+version başvurusu; derivation, CSRF/rate ve imza/güven anahtarları amaçlarına göre ayrılır. Tarayıcı, döküm, audit, rapor veya kaynak deposuna sır çıkmaz. |
| Rotasyon | Bekleyen challenge eski türetme sürümüne bağlanır; sınırlı geçiş süresi ve atomik kabul/iptal politikası. Bilinmeyen/iptal anahtar reddi; geri dönüş eski iptal kayıtlarını veya rate bütçesini sıfırlamaz. |
| Arıza/geri yükleme | Süre dolmuş/iptal oturum yeniden açılmaz. Receipt/challenge/audit/yetki kayıtlarının tutarlı checkpoint'i, ölçülen RPO/RTO ve revocation sonrası tekrar testi B27 kabulüne bağlanır. |

Üretim transaction/anahtar sağlayıcısının çalıştırılabilir adaptörü ve çok işçi/region hata kabulü **henüz tamamlanmadı**. Genel geliştirme kapsamında tasarlanabilir; gerçek depo seçimi, migration ve credential oluşturma özel yetki sınırına tabidir. B07 kod tamamlığı bu nedenle kısmi kalır.

## Saklama, test ve açık kabul

Yeni envanter: `identity_provider_sessions` aktif bağın kaldırılmasında FK ile düşer; `identity_logout_receipts` yeniden oynatma/iptal bariyeridir; `identity_rate_buckets` kısa operasyonel sayaçtır. Önceki challenge/link ve audit envanteri korunur. Logout makbuzları sırf JWT süresi doldu diye silinmez: geç giriş ve eski kimlik kanıtını engelleme süresi ayrıca hesaba katılmalıdır. Kalıcı güvenlik makbuzlarının kurumca onaylı saklama/imha süresi henüz yoktur; test deposu topluca imha edilir. B04/B28 üretim kayıt/backup/saklama kabulü açık.

Kabul sonuçları `acceptance/B07-backchannel-20261014.json` içine kaydedilir. Gerçek IdP/MFA, metadata/istemci kaydı, depo ve anahtar adaptörü, dağıtık iptal/kapasite, kurum kararı ve canlı doğrulama ayrı açık eksenlerdir. Bu modül canlı pilot kapısına import edilmez.
