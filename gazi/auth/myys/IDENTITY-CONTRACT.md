# B06/B07 — kimlik doğrulama ve kişi eşleme sözleşmesi

Sürüm: `local-2026.10.10.1`. Durum: bağımsız kod ve sentetik yerel kabul.
Bu doğrulayıcı HTTP giriş uç noktası değildir. Salt okuma yolu oturum, kullanıcı, üyelik veya yetki oluşturmaz. Sonraki yerel akış adaptörü aşağıda ayrıca tanımlanır.
Pilot TOTP kapısına ve `configuredCore()` yoluna bağlanmamıştır. Gazi IdP'sinin
protokolü, issuer adresi ve MFA anlamları henüz kurumca teyit edilmemiştir.

## Uygulanan sınırlar

`identity-contract.mjs` sunucunun belirlediği sözleşmenin kopyasını kullanır:

| Alan | Anlam ve denetim |
|---|---|
| `version`, `tenant` | İdare edilen sözleşme sürümü ve tek kurum; belirteçten seçilmez |
| `issuer`, `audience` | HTTPS issuer ve kayıtlı client kimliği; birebir eşitlik; ek audience reddi |
| `algorithms`, `jwks` | Yalnız açıkça seçilen ES256/RS256 ve önceden güvenilen açık anahtarlar; kid tekil; en fazla 8 anahtar |
| `maxTokenAgeSeconds` | Belirteç yaşı; pozitif, en fazla 900 saniye |
| `maxAuthAgeSeconds` | Son kimlik doğrulama yaşı; pozitif, en fazla 3600 saniye |
| `clockToleranceSeconds` | Kuruma göre belirlenmesi gereken 0–30 saniye tolerans |
| `mfaProfiles` | Kurumca belgelenmesi gereken tam acr ve zorunlu amr eşleşmeleri; evrensel MFA varsayımı yok |

Yaş üst sınırları bu yazılım profilinin ihtiyatlı sınırlarıdır; mevzuat veya Gazi
IdP'sinin mevcut ayarı olarak sunulmaz. Testte 300/900/0 saniye kullanılır.
MFA profili boşsa hiçbir belirteç MFA kanıtı sağlamaz. Özel/simetrik anahtarlar,
token içinden anahtar adresleri, bilinmeyen kid/algoritma ve erişim belirteci tipi reddedilir.
Modül ağ isteği veya otomatik sağlayıcı keşfi yapmaz. Anahtar rotasyonu, gözden
geçirilmiş yeni sözleşmede bir süre iki açık anahtarın birlikte bulunmasıyla sınanır.

`verify(idToken, {expectedNonce, now})` imza, zorunlu alanlar, zaman, issuer,
audience, azp ve nonce denetiminden sonra yalnız aynı doğrulayıcının tanıdığı
opak bir kanıt döndürür. `expectedNonce` en az 32 karakterlik sunucu isteğinden
alınır. Belirtecin kendi nonce alanı veya tarayıcıdan iletilen değer bu parametre
için güven kaynağı olamaz. Token, e-posta ve provider hata ayrıntıları sonuçta yer almaz.

`resolveLocalMember(proof, {store, now, requireMfa})` yalnız `LocalAcceptanceStore`
ile çalışır ve Vercel'de reddeder. Aynı işlem içinde `(issuer, subject)` üzerinden
etkin kişiyi ve sözleşmenin kurumundaki etkin, süresi dolmamış birim üyeliklerini
okur. E-posta değişimi kişi çoğaltmaz; token rol/tenant/MFA bayrağı yetki sağlamaz.
Sicil değişimleri her okumada yeniden denetlenir. Varsayılan MFA zorunludur.
`requireMfa:false` yalnız ayrı bir sunucu politikası tarafından düşük riskli okuma
için seçilebilir; ayrıcalıklı çekirdek işlemleri ayrıca kendi MFA kontrolünü korur.
Yeni kişi, rol, oturum bağı, cookie veya kayıt yazılmaz. Kanıtın yaşam süresi token,
iat ve auth_time sınırlarından en erken dolanı aşmaz.

## Üretim depo adaptörünün gerekli sözleşmesi

| İşlem | Zorunlu davranış |
|---|---|
| Kişi bul | `(issuer, subject)` tekil anahtar; e-posta üzerinden birleştirme veya sessiz kişi oluşturma yok |
| Üyelik oku | Sunucunun seçtiği tenant/birim; active ve expires ile yetki sürümü aynı tutarlı okumada |
| Kimlik isteğini bitir | Session/state/nonce/PKCE, issuer ve tenant bağını doğrula; nonce'ı atomik tek kullanımlık tüket; sonra kısa süreli oturum bağı oluştur |
| Oturumda yetki çöz | Kişi ayrılması, üyelik iptali/sona ermesi ve rol sürümü her istekte veya belgeli kısa iptal süresinde uygulanır |
| Denetim yaz | İstek korelasyonu, kişi iç kimliği, sözleşme sürümü, sonuç kodu; ham token/nonce/e-posta yok |
| Geri al | Önce yeni girişleri kapat; oturum iptalini uygula; eski yetkiyi geri getirmeden depo geri dönüşünü mutabık kıl |

Bu tablo bir üretim adaptörü uygulaması değildir. İşlemsel kurumsal depo ve gerçek sağlayıcı kabulü açık. Sonraki yerel adaptörde nonce tüketimi ve oturum bağlama yalnız sentetik kabul için eklendi. Mevcut kaynak özeti Supabase tablosu kişi/üyelik deposu yapılmadı.

## Açık işler ve etkinleştirme kapısı

- Gerçek Authorization Code HTTP callback ve kayıtlı URI kabulü; üretim nonce deposu/işçi ve gerçek sağlayıcı ile PKCE/state denetimi. Yerel sentetik akış aşağıda sınandı.
- Kurumun açıkça onayladığı issuer/client/JWKS kaynağı, acr/amr eşlemesi,
  çift kimlik/pairwise subject ve rol/birim yaşam döngüsü.
- Oturum yenileme/çıkış/iptal, MFA yeniden isteme, oturum sabitleme ve denetim izi.
- Ayrı işlemsel üretim adaptörü; migration, yedek/geri dönüş ve gerçek IdP kabulü.

Doğrulayıcı tek başına kalıcı tüketim sağlamaz; doğrudan HTTP kimlik doğrulama yolu yapılmamalıdır. Yeni `LocalIdentityFlow` yalnız izole SQLite kabulünde tüketim ve kısa oturum bağı oluşturur. Hiçbir üretim etkinleştirme yapılmadı.

## Kaynak ve kabul kanıtı

- OpenID Foundation, **OpenID Connect Core 1.0, errata set 2** (15.12.2023),
  §2, §3.1.3.7: https://openid.net/specs/openid-connect-core-1_0.html
  Erişim/inceleme: 10.10.2026. Kapsam: ID Token alanları ve doğrulama; kurumsal rol
  veya Gazi MFA politikası değildir. Bu profil ek audience kabul etmez ve imzayı
  her zaman doğrular; genel standardın bütün akışlarını uyguladığı iddia edilmez.
- `jose` 6.2.12 mevcut bağımlılığı ve yerel tür/API tanımları kullanıldı;
  https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md
  kontrol tarihi 10.10.2026. Yeni uygulama bağımlılığı eklenmedi.
- `tests/myys-identity.test.mjs`: sentetik anahtarlarla 29 test. Issuer/audience,
  imza/anahtar rotasyonu, nonce, zaman sınırları, MFA tazeliği, role/tenant taklidi,
  ayrılan kişi/üyelik, e-posta değişimi, kalıcılık ve üretim kapısı denetlenir.
  Gerçek IdP, callback, replay deposu veya üniversite kabulü değildir.


## İkinci dilim: tek kullanımlık yerel akış

Sürüm: `local-2026.10.10.2`. `identity-flow.mjs` yalnız `LocalAcceptanceStore`
ve `http://127.0.0.1` dönüş adresiyle açılır; Vercel ortamında reddedilir.
`exchangeCode` sunucunun enjekte ettiği sentetik adaptördür. Modül ağ bağlantısı,
HTTP callback, cookie, gerçek sağlayıcı istemcisi veya kalıcı erişim oluşturmaz.

- `begin`: tek kurum/sözleşme/tarayıcı oturumu bağını, state özetini, süreyi ve
  pending durumunu SQLite'a yazar. Aynı bağdaki eski pending/claimed istekleri iptal eder.
- PKCE S256 ve nonce, testte yalnız bellekte bulunan 32 bayt anahtardan ayrı
  HMAC bağlamlarıyla türetilir; yüksek entropili istek kimliği ve sözleşme özetiyle
  bağlıdır. Aynı test anahtarıyla depo yeniden açıldığında devam eder. Anahtar
  değişmiş/kaybolmuşsa istek başarısız olur; yeni giriş gerekir. Bu mekanizma
  üretim anahtar saklama/rotasyon politikası değildir. Anahtar diske kurulmadı.
- `complete`: state, tarayıcı bağı, tam issuer/dönüş adresi, süre ve sözleşme
  denetiminden sonra isteği **async alışverişten önce** atomik claimed yapar.
  İki ayrı SQLite bağlantısı aynı isteği sağlayıcıya gönderemez. Zaman aşımı,
  geçersiz yanıt veya belirsiz sonuç aynı istekle yeniden denenmez. İşçi çökmesi
  sonrası claimed kaydı yeniden çalıştırılmaz; yeni istek eskisini iptal eder.
- Doğrulanmış kanıt, güncel kişi/üyelik okuması, used durumu, yeni oturum bağı,
  kurum kapsamı ve `identity.accept` denetim kaydı aynı transaction içindedir.
  Denetim yazılamazsa oturum da kurulmaz. Eski oturum iptal edilir; yeni
  ham oturum anahtarının yalnız hash'i saklanır. Token ve MFA tazelik sınırı aşılmaz.
- `identity_scopes` yeni yerel oturumların kurumunu sabitler; çekirdeğin her
  principal okumasında kurum ve güncel kişi/üyelik kontrolü sürer. Eski elle
  kurulmuş fixture bindings kayıtları bu yeni akışın gerçek giriş kanıtı sayılmaz.
- `logout`: ilgili kurumun yerel oturum bağını ve o tarayıcı bağındaki bekleyen
  istekleri iptal eder; tekrarı zararsızdır. Başka kurum oturumunu silemez.
- Denetimde yalnız iç kişi kimliği, eylem, korelasyon ve tarih vardır; ham token,
  nonce, code, verifier, state ve session token saklanmaz. `identity_scopes`
  sözleşme sürümünü taşır. Süresi dolmuş isteklerin fiziksel saklama/temizleme
  politikası ayrıca B28 işidir.

27 yeni test: RFC PKCE vektörü, tekrar/eşzamanlı dönüş, iki depo bağlantısı,
yeniden açılma, başka issuer/state/tarayıcı/tenant, üyelik iptali, MFA zamanı,
çıkış, zaman aşımı ve denetim yazısı hatasında geri alma. Bunlar gerçek HTTP/IdP,
dağıtık production işçisi veya kurumsal kabul testleri değildir.

Kaynaklar (10.10.2026 incelemesi): RFC 7636 §4.1–4.6 ve Appendix B
<https://www.rfc-editor.org/rfc/rfc7636.html>; RFC 9700 §2.1 ve §4.4–4.5
<https://www.rfc-editor.org/rfc/rfc9700.html>. Yerel PKCE/state/issuer bağları bu
teknik çerçeveyle hazırlandı; bütün OAuth/OIDC akışlarına tam uyum iddiası yok.

Açık kalan: güvenli HTTP cookie/CSRF/Origin ve callback sınırı, gerçek sağlayıcı
metadata/istemci kaydı, üretim depo adaptörü, dağıtık iptal/back-channel logout,
anahtar saklama, saklama/temizleme ve gerçek kurum kabulü. Refresh token veya
`offline_access` kullanılmadı; yerel süre dolunca yeni giriş gerekir.
