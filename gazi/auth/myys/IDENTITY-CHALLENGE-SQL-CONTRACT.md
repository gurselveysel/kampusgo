# B07 — Kalıcı SQL giriş isteği

14 Ekim 2026 · Paket54 · `myys-sql-login/1` · izole PGlite kabulü.

Görünür ekran değişikliği yok. `PostgresIdentityChallenges` aynı giriş isteğinin yeniden kullanılmasını engelleyen SQL yaşam döngüsünü Paket53 anahtar köprüsüne bağlar. **Henüz kullanıcıyı tanımaz veya oturum üretmez.** Kişi/üyelik, imzalı kimlik kanıtı, oturum, iptal sicili ve HTTP bağlantısı ayrıca tamamlanmalıdır. Mevcut LocalIdentityFlow ve korumalı pilot değiştirilmedi; configuredCore Vercel'de kapalıdır.

## İşlem sözleşmesi

- `begin`: sunucuya ait browser hash, rastgele32bayt state ve UUID ile tenant/issuer/audience/contract/redirect bağlamı oluşturur. Ayrı PKCE/nonce amaçlarıyla genel anahtar sürüm bağları alınır. İki anahtarın SQL kontrolü içinde önceki aynı kapsamlı pending/claimed istekler iptal edilir, yeni istek ve audit birlikte kaydolur. Aynı browser'da başka kapsamın süresi devam eden isteği varsa reddedilir. Anahtar veya begin denetimi başarısızsa önceki istek korunur. Mevcut gerçek oturumun kurum bağını denetlemek henüz session repository yükümlülüğüdür.
- `claim`: tam state, browser, issuer, yapılandırılmış HTTPS redirect ve contract eşleşmesini arar. Context yeniden hesaplanır; aynı contract ile yanlış redirect yapılandırılmış işçi de kabul edilmez. Süresi geçerli pending satır kilitlenip claimed ve audit **sağlayıcı I/O'sundan önce commit edilir**. Sonra güvenilen kalıcı bağlardan PKCE/nonce yeniden türetilir. Sonuç yalnız aynı repository örneğinin WeakMap'inde geçerli bir handle'dır. Handle'daki verifier/nonce yalnız sunucu token alışverişi içindir; HTTP yanıtı, log, portal veya dosyaya verilmez.
- `finish`: handle bir kez kullanılır. Anahtar köprüsü, aynı challenge satırı/özeti, scope ve süreyi tekrar denetler. Güvenilen SQL callback'i, kullanılan isteği ve audit'i aynı transaction'da bağlar. Callback **kimlik kanıtı/MFA/üyelik/iptal kontrolünü ayrıca yapmak zorundadır**; testteki sentinel yazısı böyle bir kontrol veya session değildir. Sağlayıcı token alışverişi callback'in içine alınamaz. Sunucuya ait SQL dışında yan etki yasaktır; serialization tekrarında bütün callback yeniden çalışabilir.
- `fail`: sağlayıcı veya imza kontrolü başarısız olduğunda claimed→failed ve audit atomiktir; tekrar pending yapılamaz. Yeni istek gerekir. `cancel` doğrulanmış hata dönüşünün pending isteğini; güvenilen `cancelBrowser` aynı kapsamın pending/claimed isteklerini kapatır. İptal için KMS çalışması gerekmez. Anonim HTTP çıkış endpoint'i oluşturulmadı.
- Başarı, hata ve iptal terminaldir. Yeni giriş, gecikmiş eski sağlayıcı yanıtını engeller. Başka browser isteği veya başka kurum verisi değiştirilmez. Süre bitmesi fiziksel silme değildir.

Claim COMMIT belirsizse provider çağrılmaz; kaydın gerçekten claimed olmuş olma ihtimali korunur. Final COMMIT belirsizse sonuç/session dönmez, otomatik tekrar veya failed'e çevirme yapılmaz; used kayıt ve SQL yan etkisi gerçekleşmiş olabilir. Yeni giriş eski state'i tekrar kullanmaz. Gelecekteki session doğrulaması/cookie dağıtımı ve kalıcı mutabakat bu sınırı korumalıdır.

Sunucu saati request başlangıcının veya claim zamanının gerisine giderse kabul kapalıdır. Sahte ileri tarih uydurularak failed kaydı yazılmaz; saat düzelince yeni giriş eski claimed isteği iptal edebilir. CHECK kısıtları bitişin başlangıç/claim öncesine yazılmasını da reddeder. Son sorgu ile COMMIT arasındaki duvar saati/transport aralığı atomik zaman garantisi değildir; gerçek oturum okuması süreyi yeniden denetlemelidir.

## Veri kapsamı

`identity-challenge-schema.sql` otomatik çalıştırılmaz; yalnız boş PGlite testine kurulur. Paket53'ün iki anahtar adayıyla birlikte **dört uygulanmamış PostgreSQL aday tablosu** vardır. Aktif LocalAcceptanceStore envanteri hâlâ16 tablo/148türdür.

| Aday | Kaydedilen veri / amaç | Saklama ve erişim |
|---|---|---|
| `myys_identity_challenges` | UUID, tenant/issuer/audience, contract/context/state/browser özetleri, genel PKCE/nonce bağları, zamanlar ve durum; tek kullanım ve doğru dönüş bağı | Ham state/code/verifier/nonce/ID Token/session token yok. Sunucu kimlik repository'sine özel; tarayıcı listeleme/dışa aktarma yok. Onaylı saklama süresi, ülke/alıcı ve yedek silme kararı açık. |
| `myys_identity_challenge_audit` | event UUID, request UUID, tenant/issuer/audience, begin/claim/use/fail/cancel/deny ve zaman; atomik işlem izi | Anahtar, token veya kişi iddiası yok. Kurumsal güvenlik kaydıdır; fiziksel temizlik ve iptal/checkpoint saklama politikası henüz yok. |

SQL parametreli ve tablo adları sabittir. Scope ve browser advisory kilidi bütün yazarların katılımını gerektirir; role/RLS yerine geçmez. Şema/indeks/migration incelemesi ve gerçek depo izinleri ayrı kabul şartıdır. Kod gerçek Supabase tablosuna, IdP'ye veya KMS'ye bağlanmadı.

## Kabul ve sınır

18 yeni senaryo; state/PKCE/nonce bütünlüğü ve ham sırların depoya yazılmaması, iki çağıranda tek claim, claim-before-provider, hatalı dönüş/scope/redirect/contract, zaman/saat geri dönüşü, eski isteğin iptali, kapalı anahtar, KMS'siz iptal, begin/claim/use audit rollback, belirsiz claim/final gerçek COMMIT hata enjeksiyonu, handle kopyası/yanlış worker, kayıt değişikliği, fail/diğer browser ve yeni repository nesnesiyle kalıcı claimed koruması.

Test motoru PGlite0.5.9/PostgreSQL18.6; tek exclusive bağlantı ve sıraya alan test havuzu. İki çağıran testi gerçek iki native PostgreSQL oturumu veya dağıtık yarış kabulü değildir. Paket53 dosya kapatıp yeniden açma kanıtı anahtar tabloları içindir; bu paketin yeni worker testi nesne değişimidir, işletim sistemi/region yeniden başlatma iddiası yoktur. Mevcut15 HTTPS giriş tarayıcı kontrolü regresyondur; yeni SQL repository'yi kullanmaz.

## Kaynak kaydı

14.10.2026'da okundu. Kurum yetkisi veya gerçek sağlayıcı sözleşmesi yerine geçmez.

| Kaynak/sürüm | Kapsam ve kullanım |
|---|---|
| [RFC7636](https://datatracker.ietf.org/doc/html/rfc7636), Eylül2015, §4.1–4.6 | İstek başına yüksek entropili verifier, S256 dönüşümü ve token alışverişindeki eşleşme. Mevcut pkceS256 kullanılır; gerçek sağlayıcı kabulü açık. RFC Editor HTML429 verdi; IETF Datatracker birincil kopyası okundu. |
| [OIDC Core1.0 errata set2](https://openid.net/specs/openid-connect-core-1_0.html),15.12.2023, §3.1.2.1 ve3.1.3.7 | openid/code, tam redirect, browser state bağı, nonce ve token doğrulamasının ayrı yükümlülüğü. Bu repository token doğrulayıcısı değildir. |
| PostgreSQL18/PGlite0.5.9 kaynakları, `IDENTITY-KEY-BRIDGE-CONTRACT.md` | SQL transaction/lock/COMMIT ve tek bağlantı sınırı aynı şekilde geçerlidir. |

Sırada opak doğrulanmış kimlik kanıtının async SQL kişi/üyelik ve session/iptal commit'ine bağlanması; mevcut HTTP/akademik senkron depo sınırı ayrıca ele alınmalı. Rate/CSRF dönüşümü, güvenilir geri yükleme checkpoint, gerçek çok bağlantı/role/RLS/KMS/IdP ve canlı kabul açık. B07 bütün kabul şartları kapanmadı.
