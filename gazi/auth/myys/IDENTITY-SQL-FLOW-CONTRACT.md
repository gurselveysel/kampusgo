# B06/B07 — SQL kişi, üyelik ve oturum

14 Ekim 2026 · Paket55 · `myys-sql-identity/1` · bağımsız yerel SQL/kriptografi kabulü.

Görünür menü veya ekran değişikliği yok. `PostgresIdentityFlow`, imzalı sentetik IdP yanıtını güncel SQL kişi/üyelik kaydı, Paket54 tek kullanımlık istek, Paket53 anahtar bariyeri ve oturum/audit ile aynı kabul zincirine bağlar. **Bu akış henüz React panelinin HTTP kimlik sınırına veya akademik SQL deposuna bağlı değildir.** LocalIdentityFlow/LocalAcceptanceStore üretim adaptörü yapılmadı; mevcut korumalı pilot ve configuredCore kapalı sınırı korunur.

## Güvenilen sınırlar

Yapılandırma kopyalanır; `identitySqlContractDigest` kimlik sözleşmesi ve sabit HTTPS dönüş adresini birlikte özetler. Anahtar sağlayıcı, anahtar köprüsü, istek ve session aynı özeti kullanır. HTTP formundan issuer, rol, sağlayıcı anahtarı veya kişi iddiası seçilemez. `createIdentityContract` içindeki private WeakMap kanıtı, yeni `withVerifiedIdentity`/`withVerifiedLogout` sunucu callback'lerinde güncel saat ve MFA ile denetlenir. Bunlar üyelik yetkisi vermez; LocalAcceptanceStore'a özgü eski yöntemlerin yerel/Vercel kısıtı kaldırılmadı.

`recordKeyMetadata`, `putPerson` ve `putMembership` **yalnız güvenilen kontrol düzlemi çağrılarıdır**. HTTP rotası veya normal yönetici yetkilendirmesi değillerdir. Operatör kimliği/dayanağı dış sınırda doğrulanmalıdır. İlk sürüm1, beklenen revizyon ve tam+1; eski/yinelenen/yükseltilmiş beklenti kapalıdır. Kişinin issuer/subject eşlemesi aynı id altında değiştirilemez. JWT'deki e-posta, tenant, roller veya serbest mfa alanı kişi/üyelik yaratmaz. Rol listesi mevcut dokuz çekirdek rolü kullanır.

Kişi kaydı issuer/subject üzerinde ortaktır; merkezi kişi aktiflik değişikliği o kişinin bütün kurum kapsamlarındaki sonraki oturum okumalarını etkileyebilir. Bu çağrıya yalnız ilgili issuer'ın merkezi kişi yaşam döngüsü yetkisiyle erişilebilir; birim yöneticisine kendiliğinden verilmez. Üyelik değişikliği yalnız yapılandırılmış tenant/person/unit kapsamındadır. İşlem ve dayanak denetimi aynı SQL transaction'dadır; başarısız denetim kişi veya üyeliği değiştirmez.

## Giriş ve oturum işlemi

1. Başlangıçta mevcut browser/session kapsamı ve tek kullanımlık istek denetlenir. Claim/audit sağlayıcı kod alışverişinden önce commit olur.
2. Kod alışverişi enjekte edilen sunucu fonksiyonundadır; zaman aşımı AbortSignal ile kapanır. KMS, IdP ve JWT imza doğrulaması SQL transaction dışında çalışır. Verifier tarayıcıya taşınmaz. Bu paket gerçek ağ endpoint'i/credential kurmaz.
3. `finish` transaction'ı anahtarları ve challenge'i tekrar denetler. Opak imza kanıtı ve MFA tazeliği, exact issuer/subject kişisi, etkinlik, tenant/birim/rol, başlangıç/bitiş ve sağlayıcı iptal sicili aynı işlemde okunur. Kişi ve üyelik satırları kilitlenir. İmza beklerken kapatılan üyelik oturum oluşturamaz.
4. Yeni rastgele32bayt session secret üretilir; yalnız SHA-256 özeti saklanır. Önceki session aktifse iptal edilir; parent hash geçmişi korunur. Session, challenge use ve audit atomiktir. Dönüş ancak başarılı COMMIT sonrasıdır; COMMIT belirsizse token dönmez ve yeniden denenmez. SQL kaydı gerçekten oluşmuş olabilir; kayıp cookie/token için session kurtarma protokolü iddia edilmez.
5. Bitiş zamanı session sınırı, doğrulanmış kimlik/MFA süresi ve etkin üyeliklerin en erken bitişinden küçüğüdür. Her `principal` okuması kurum/issuer/audience/contract, session durumu/zamanı, kişi ve üyelikleri tekrar denetler. Kişi revizyonu ve sıralı üyelik sürümü/rol/süre özeti session'a sabitlenir. Kapatıp aynı üyeliği yeniden açmak veya rol değiştirmek eski session'a yetki kazandırmaz; yeni giriş gerekir. Yeni gelecekte başlayan üyelik de görünür hâle geldiğinde özeti değiştirir.

Yalnız üyelik bulunduğu için akademik karara izin verilmez; akademik işlem/görevler ayrılığı mevcut çekirdeğin ayrı yükümlülüğüdür. Yeni `principal` çıktısı şu anda bu çekirdeğin HTTP çağırıcısına verilmez. İki farklı depo kopyası tek gerçek işlem zinciri gibi gösterilmedi.

## Çıkış ve gecikmiş dönüş

Yerel logout, gelen eski session hash'inin aynı kurum/issuer/audience alt ailesini bulur; aktif session'lar ve pending/claimed istekler aynı işlemde kapanır. Cookie döndürülürken yolda kalan eski cookie de yeni alt oturumu kapatabilir. Diğer kurum/audience veya başka browser'ın kayıtları etkilenmez.

Back-channel logout mevcut imza doğrulayıcısını kullanır: açık `logout+jwt`, trusted key/issuer/audience/zaman, event ve nonce yasağı. Yerel profil type'ı zorunlu tutar; bu bütün eski IdP'lerle uyumluluk iddiası değildir. Subject ve sid birlikte varsa **ikisi birlikte** eşleşir; sadece subject varsa ilgili kişinin kapsamlı oturumları seçilir. JTI+payload özeti tek makbuzdur; aynı bildirim idempotent, aynı JTI'nin başka içeriği reddedilir. İptal, pending isteğin kapatılması ve audit atomiktir.

Henüz session oluşmamış olsa bile kalıcı logout makbuzu gecikmiş callback'i durdurur: yeni request zamanı makbuzdan, token iat/auth_time bildirim iat'ından sonra olmalıdır. Bu dar profil ölçütüdür; gerçek IdP'nin yeniden doğrulama semantiği kurum kabulüne bağlıdır. Yedek geri yükleme monoton iptal bilgisini silemez; güvenilir dış checkpoint bağı hâlâ açıktır. Sadece yerel SQL kalıcılığı bunu garanti etmez.

## Ayrı SQL aday envanteri

Üç `.sql` dosyası yalnız boş PGlite testine açıkça kurulur; constructor/HTTP/startup DDL çalıştırmaz. Paket53–54'teki dört adayla birlikte **dokuz uygulanmamış PostgreSQL adayı** vardır. Aktif SQLite16tablo/148tür sayısı değişmez.

| Yeni aday tablo | Alan ve amaç | Erişim/saklama sınırı |
|---|---|---|
| `myys_identity_persons` | id, issuer, subject, aktiflik, revizyon; kalıcı doğru kişi eşlemesi | Subject kişisel kimlik verisidir; merkezi provisioning yetkisi gerekir, portal toplu okuması yok. |
| `myys_identity_memberships` | tenant/person/unit, rol listesi, aktiflik, not_before/expires, revizyon; güncel kurum yetkisi | Yalnız yetkili üyelik kontrol düzlemi yazar; issuer kişisi önce doğrulanır. |
| `myys_identity_sessions` | session/parent hash, scope/contract, person/revision, üyelik özeti, request, subject/sid hash, iat/auth_time/MFA, zaman/durum | Ham token/JWT/code/verifier yok; hash anonim veri sayılmaz. İptal geçmişi silinmez. |
| `myys_identity_logout_receipts` | scope/JTI/payload/subject/sid özetleri ve issued/expires/received; tekrar ve gecikmiş kabul bariyeri | Süresi dolan JWT fiziksel makbuzun güvenle silinebileceğini göstermez. Checkpoint ve saklama onayı gerekir. |
| `myys_identity_session_audit` | scope, actor/ref, işlem, dayanak özeti, zaman; kişi/üyelik/kabul/çıkış izi | Operatör/kişi referansı hassas güvenlik verisidir; öğrenci dışa aktarımı veya anonim liste yok. |

Tüm yeni alanlar için kurum dayanağı, saklama süresi, ülke/alıcı, silme/yedek usulü ve üretim DB rol/RLS kabulü açık. Şema onaylı migration değildir. Test fixture iki sentetik kişi kurar; uygulama kendiliğinden seed/provision yapmaz.

## Test kanıtı ve açık işler

21 yeni gerçek ES256+SQL senaryosu: doğru kişi/sunucu rolü, yanlış token/MFA, bilinmeyen/kapalı kişi, kişi ve üyelik yeniden açılınca eski session reddi, zaman ve kurum kapsamı, doğrulama sırasındaki üyelik değişikliği, session süre/clock, contract değişimi, cookie döndürme/alt aile, çıkış sırasında gecikmiş callback, kabul/directory/logout audit rollback, belirsiz gerçek COMMIT, provider timeout, subject/sid/JTI, session öncesi logout, anahtar iptali, kopya/başka sözleşme opak kanıtı ve iki flow'da tek kabul.

PGlite0.5.9/PostgreSQL18.6 tek exclusive bağlantı; iki flow nesnesi gerçek çok session/region testi değildir. Mevcut yerel HTTPS tarayıcı koşusu regresyondur ve bu SQL flow'u kullanmaz. Gerçek IdP/MFA, driver/TLS/pool, çok bağlantı/SSI/RLS, control-plane, KMS, HTTP rate/CSRF, akademik async depo bağı ve geri yükleme checkpoint gerekir. B06/B07 bütünü kapanmadı; canlı hizmet etkinleşmedi.

## Kaynak kaydı

14.10.2026 incelemesi. Teknik kaynaklar Gazi kurumsal yetki veya gerçek IdP onayı değildir.

- [OIDC Core1.0 errata set2](https://openid.net/specs/openid-connect-core-1_0.html),15.12.2023, §3.1.2.1/3.1.3.7: tam sağlayıcı/audience/redirect, nonce, imza ve süre/MFA iddialarının anlamı; gerçek kurum MFA profili ayrıca belirlenmeli. Paket54'te okunan kapsam kullanıldı.
- [OIDC Back-Channel Logout1.0 errata set1](https://openid.net/specs/openid-connect-backchannel-1_0.html),15.12.2023, §2.4–2.8 ve4.1: imzalı çıkış, sub/sid, JTI, nonce yasağı ve özel typ uyumluluk sınırı. Bu pakette HTTP POST/yanıt rotası henüz yoktur.
- PostgreSQL18 ve PGlite API kaynak/sürüm kaydı `IDENTITY-KEY-BRIDGE-CONTRACT.md` içinde; tek-client transaction, whole retry ve belirsiz COMMIT sınırları aynen geçerlidir.
