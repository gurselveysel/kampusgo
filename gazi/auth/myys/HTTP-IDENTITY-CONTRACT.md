# B07 — yerel HTTPS giriş ve oturum sınırı

13 Ekim 2026 · `local-http-2026.10.13.1` · Yalnız sentetik izole kabul. Gerçek IdP kaydı, istemci credential'ı, üretim anahtarı, migration veya canlı oturum açılması yapılmadı. Mevcut pilot giriş kapısına yeni rota eklenmedi; `configuredCore()` Vercel'de kapalıdır.

## Kullanıcı işlemi ve sınır

`LocalIdentityHttp`, `LocalIdentityFlow` ve mevcut kişi/üyelik doğrulayıcısını aynı akışa bağlar. Yerel giriş sayfasından ayrı sitedeki sentetik sağlayıcıya gidilir; kod arka kanalda HTTPS ile değiştirilir; doğrulanmış kişiyle gerçek React akademik ekranı açılır. Panel oturum sonunu, çıkış düğmesini ve oturum kapandığında yeniden giriş yolunu gösterir. Başvuru aynı sunucu kaydına yazılır. Çıkıştan sonra diğer sekmenin yeni okuması reddedilir; yeni giriş akademik geçmişi korur.

| Yol | Yöntem | Sınır |
|---|---|---|
| `/__identity/login` | GET | Sentetik giriş/çıkış formu; kimlik tokeni yok |
| `/api/myys/kimlik/baslat` | POST | Aynı origin, tarayıcı bağı ve HMAC CSRF; sabit sağlayıcıya yönlendirme |
| `/api/myys/kimlik/donus` | GET | Tekil state/code/iss; tam issuer, dönüş adresi ve tarayıcı bağı; PKCE/nonce |
| `/api/myys/kimlik/oturum` | GET | Güncel kişi/üyelik/kurum ve süre; sınırlı oturum bilgisi ve CSRF |
| `/api/myys/kimlik/cikis` | POST | Aynı origin ve CSRF; sunucu iptali, çerezin temizlenmesi |

Uygulama origin'i yalnız `https://127.0.0.1:<port>` olabilir. Sentetik sağlayıcı endpoint'i yalnız HTTPS `localhost` veya `127.0.0.1` olabilir. Testte ayrı `localhost` sitesi kullanılır. Kurum endpoint'i bu yerel sınıfa eklenemez; gerçek bağlantı ayrı adaptör ve kabul gerektirir.

## Güvenlik kararları

- `__Host-myys-session`: Secure, HttpOnly, SameSite=Lax, Path=/; Domain yok. Kısa süreli rastgele değer döner, depoda hash'i vardır. Girişte döndürülür. ID Token ve verifier tarayıcıya veya yerel depolamaya verilmez.
- Değişiklik, başlangıç ve çıkışta tam Origin + cookie'ye bağlı HMAC CSRF gerekir. Origin null/eksik/başka ise reddedilir. Fetch Metadata varsa same-origin aranır. Akademik HTTP çağırıcısı `authorizeRequest(...,{mutation:true})` kullanır; React CSRF'yi yalnız sayfa belleğinde tutar.
- Callback için sağlayıcıdan gelen `iss` zorunludur; statik sözleşmeyle tam karşılaştırılır. Yinelenen/bilinmeyen alan, code+error birlikteliği ve başka tarayıcı reddedilir. Sağlayıcının hata yanıtı da state/issuer ile doğrulanır ve isteği iptal eder. Ham hata açıklaması yansıtılmaz.
- Dönüşte temiz sabit adrese 303 yönlendirme yapılır; kullanıcıdan returnTo/redirect_uri alınmaz. Hatalı/replay callback mevcut başarılı oturum çerezini silmez. `Cache-Control: no-store`, CSP, nosniff ve dönüşte no-referrer vardır. Form sayfasında same-origin referrer politikası kullanılır: temel form POST'unda Origin'in null olmasını önler, farklı siteye referrer taşımaz. Kaynak doğrulaması gevşetilmedi.
- HTTPS soketi ve tam Host denetlenir; X-Forwarded-Host/Proto kabul edilmez. Bu sınıf proxy/edge üretim adaptörü değildir. Çift veya biçimsiz session cookie reddedilir.
- İstek claim'i ağ çağrısından önce kalıcıdır. Token dönüşünde güncel kişi/üyelik ve MFA tekrar denetlenir; oturum, kurum bağı ve audit atomiktir. HTTP zaman aşımı aynı isteği tekrar açmaz.
- `identity_session_links` yalnız kurum, önceki/yeni oturum hash'leri ve bitişi tutar. Çerez dönüşü sırasında yoldaki eski çerezli çıkış, süresi devam eden yerel alt oturumları da iptal eder. Bekleyen/claimed istekler iptal edilir; geç token yeni oturum açamaz. Başka tenant'a geçilmez. Bu SQLite kabulü dağıtık üretim/back-channel logout değildir.

## Yerel veri envanteri ve açık saklama koşulu

`identity_challenges`, `bindings`, `identity_scopes`, `identity_session_links` ve audit erişim güvenliği amacıyla tutulur. State/session token hash olarak; code/verifier/nonce/ID Token ham hâlde kalıcı yazılmaz. Ham token ve test anahtarları test belleğiyle sınırlıdır. TLS sertifikası her testte geçici oluşturulur; geçici özel anahtar dosyası okunduktan sonra silinir ve depoya girmez. Tarayıcı yalnız o sertifikanın açık anahtar özetini kabul eder; genel TLS/giriş güvenliği kapatılmaz. Node HTTPS istemcisi CA ve hedef host doğrular.

Süreli link/challenge kayıtlarının fiziksel saklama/temizliği için kabul edilmiş kurum süresi yoktur. B04/B28 kapsamındaki gerçek envanter, saklama ve imha kararına ayrıca eklenmelidir; sürenin bitmesi fiziksel silme diye sunulmaz. Test deposu bütün olarak imha edilir. Üretim iptal bildirimi, gerçek anahtar saklama, oran sınırı ve çok işçili depo/worker kabulü açıktır.

## Kaynak, kapsam, sürüm ve tarih

İnceleme tarihi 13.10.2026. Teknik kaynaklar kurumsal MFA veya Gazi IdP kabulü değildir.

| Kaynak | Sürüm/tarih | Okunan ve uygulanan kapsam |
|---|---|---|
| [IETF RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) | BCP 240, Ocak 2025 | §2.1, §4.4–4.7: tam redirect, CSRF, tarayıcıya bağlı state/PKCE/nonce ve mix-up savunması. Yerel profil üç bağı birlikte kullanır. |
| [IETF RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html) | Mart 2022 | §2–2.4: hata yanıtında da issuer; çözülmüş iss değerini yapılandırılan issuer ile tam karşılaştırma. |
| [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) | Sayfa değişikliği 01.09.2026 | Secure, HttpOnly, SameSite ve __Host sınırları; genel tarayıcı uyumluluk sertifikası değildir. |
| [MDN Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin) | Sayfa değişikliği 07.08.2026 | Origin'in yöntem/referrer politikasıyla null olabildiği durumlar; form başlığı gerçek tarayıcıda kontrol edildi. |
| [IETF RFC 10017](https://www.rfc-editor.org/info/rfc10017/) | BCP 212, 2026 | §1 kapsam kontrolü: yalnız OIDC ile giriş sonrası aynı domainde uygulama oturumu tutan model kapsam dışında tanımlanır. Bu modül için genel OAuth kaynak erişimi veya tam RFC 10017 uyumu iddia edilmez. |

OIDC Core errata set 2, RFC 7636 ve önceki doğrulayıcı kaynakları `IDENTITY-CONTRACT.md` içindedir. MFA test profili `urn:test:strong` + `pwd/otp`, **sentetiktir**; gerçek parola/OTP kullanılmadı veya üretilmedi. Kurumun MFA iddiası ve görev kapsamı hâlâ teyit gerektirir.

## Kabul kanıtı

19 yeni gerçek HTTPS sunucu testi; önceki 29 token/kişi ve 27 akış testi dahil toplam 311 sunucu + 46 portal + 46 regresyon = 403 otomatik test. 11 HTTPS/ayrı-site tarayıcı ve 13 mevcut itiraz tarayıcı kontrolü geçti. 390 px görüntü incelendi. Kanıt `acceptance/B07-http-20261013.json`.

Gerçek IdP protokolü/metadata/istemci kaydı, üretim depot/transaction adaptörü, sağlayıcı bağımsız back-channel logout kabulü, dağıtık iptal, anahtar saklama ve kurum yetkisi açık kalır. Kaynak yayını ve canlı smoke ayrı eksenlerdir; Paket 17–21 canlı yayımlanmadı, son doğrulanmış canlı Paket 16'dır.

## 14.10.2026 — dördüncü yerel kimlik dilimi

Sağlayıcıdan bağımsız imzalı back-channel logout, kurum/issuer/audience/sub/sid eşlemesi, kalıcı tek makbuz/iptal bariyeri ve HTTPS giriş oran sınırı eklendi. Güncel sınırlar ve üretim adaptör yükümlülükleri `BACKCHANNEL-IDENTITY-CONTRACT.md`; kabul `acceptance/B07-backchannel-20261014.json`. Önceki bölümün back-channel/oran henüz yok ifadesi bu yerel dilim için güncellendi; gerçek IdP/üretim depo/anahtar/dağıtık kabul açık kalır.
