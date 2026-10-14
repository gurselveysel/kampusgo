# B07 — SQL HTTP istek bütçesi ve CSRF sürümü

14.10.2026 · Paket58 · yalnız bağımsız yerel SQL kabulü.

Görünür ekran değişikliği yok. `PostgresIdentityHttpSecurity` ortak SQL istek bütçesini ve HTTP anahtar sürümünü denetler. Henüz HTTP rotasına veya `PostgresIdentityFlow` işlemine bağlı değildir. Mevcut LocalIdentityHttp/LocalAcceptanceStore sınırı ve Vercel configuredCore kapısı korunur.

## İşlem ve güvenilen sınır

Aynı `PostgresIdentityTransactions` nesnesinin halen açık işlemine ait opak tx aranır; başka repository, bitmiş veya taklit tx reddedilir. Yapılandırma tenant/issuer/audience, exact HTTPS origin, kimlik sözleşmesi SHA, 32 bayt anahtar, pozitif revizyon ve sınır politikasını kopyalar. Anahtar oluşturma, dış KMS çağrısı, HTTP veya otomatik DDL yoktur.

`activate` yalnız ayrı yetkilendirilmesi gereken sunucu kontrol düzlemidir. Operatör/dayanak parametresi tek başına yetki değildir. Başlangıç revizyon1, ardından beklenen sürüm+1 ve daha önce kullanılmamış anahtar parmak izi gerekir. Tüm amaçların aktif bütçeleri bitmeden geçiş reddedilir; bütçe sıfırlayarak rotasyon yapılmaz. Epoch ve geçmiş kaydı aynı transaction içinde değişir; audit hatasında ikisi de geri alınır. Aktif yeni sürüm eski işçileri kapatır. Sürekli eski trafik varken geçiş gecikebilir; kontrollü işçi boşaltma planı hâlâ gerekir.

## İstek bütçesi

Altı amaç ayrı sayılır: login/start/callback/session/logout/backchannel. Varsayılan her amaç için 60 saniyelik sabit pencerede global120, gerçek transport peer40; başlangıçta mevcut browser hash varsa ayrıca10. Bunlar bütün amaçların toplam120 sınırı veya uyarlanabilir DoS koruması değildir. Pencere sınırında çift pencere patlaması mümkündür. Peer değeri istemcinin forwarding başlığından alınamaz; gelecekteki HTTP adaptörü gerçek bağlantıyı sağlamalıdır.

Tüm sayaçlar birlikte denetlenip artırılır; bir sınırın aşılması veya sorgu hatası hepsini geri alır. Anonim başlangıç global/peer bütçesinden muaf değildir. Süresi biten yalnız aynı scope sayaçları yeni denetimde temizlenir. Ham IP, cookie veya browser hash saklanmaz; kapsamlı HMAC kovası saklanır. Bu özetler anonim veri olarak sınıflanmaz.

COMMIT sonrası dönen opak permit yalnız aynı nesne ve kısa süre içinde geçerlidir (varsayılan30 saniye; izin verilen1–60). Kopyalanamaz; amaç/browser bağı değiştirilemez. Permit rol veya kimlik yetkisi değildir. Tek HTTP isteği claim ve final session transaction'larında aynı permit'i tekrar kontrol etmelidir; request sonunda `finally close` zorunludur. Challenge/session kendi tek kullanımlık korumasını sürdürür. COMMIT gerçekten gerçekleşip bağlantı yanıtı kaybolursa sayaç harcanmış olabilir; permit dönmez, otomatik yeniden deneme yoktur.

## CSRF bağı

HMAC tenant/issuer/audience/origin/contract/revision ve rastgele browser/session cookie değerine bağlıdır; ham cookie CSRF çıktısına eklenmez. Login/session amaçları üretir; start/logout amaçları sabit zamanlı karşılaştırmayla doğrular. Üretim ve doğrulama sırasında güncel SQL epoch denetlenir. Anonim login yeni pre-session cookie için token oluşturabilir; session amacı mevcut cookie hash gerektirir.

Bu yardımcı HTTP Origin/Host/TLS/SameSite/Fetch-Metadata, body sınırı veya oturum yetkilendirmesinin yerine geçmez. Sağlayıcı I/O sonrasında son session commit içinde tekrar epoch kontrolü henüz bağlanmadı. Gelecek handler token'ı URL/loga koymamalı; login sonrası pre-session yerine yeni session cookie kullanmalıdır. Burada ayrıca CSRF cookie üretilmediğinden tam signed double-submit-cookie uygulaması iddia edilmez.

## Ayrı aday veri envanteri

Yeni üç aday yalnız test fixture'ında açıkça kurulmuştur; önceki dokuzla toplam12 uygulanmamış PG adayıdır. Aktif SQLite16tablo/148kayıt türü değişmedi.

| Aday | Amaç/veri | Açık kurum sınırı |
|---|---|---|
| myys_identity_http_epochs | scope, revision, key/policy/contract SHA, origin, activated | Yetkili kontrol düzlemi, bütün yazarlar ve güvenilir restore checkpoint |
| myys_identity_http_history | epoch geçmişi, sınırlar, operator ref, authority SHA | Saklama/ülke/alıcı; eski sürüm ve anahtar yeniden kullanımını önleyen geçmiş silinemez |
| myys_identity_http_buckets | scope/purpose/kind/HMAC, başlangıç/bitiş/sayı | Kısa süreli sayaç saklama, yedek ve ayrı DB rol/RLS kabulü |

## Kanıt ve sınırlar

22 yeni test: explicit schema/activation; scope/config; global/peer/browser ve anonim bütçe; iki nesne kuyruğu; tüm amaçlarda rotation-drain; strict revizyon/anahtar ABA; epoch-audit ve kısmi sayaç rollback; gerçek COMMIT sonrası bağlantı kaybı; cookie/purpose/epoch CSRF; permit clone/expiry/close/instance; final transaction içinde değişen epoch; tx sahipliği; tenant/issuer/audience ve cleanup ayrımı; malformed giriş; dosyaya yazılı PGlite kapanıp açılınca kalıcı bütçe/geçmiş.

755 sunucu+48 portal+46 regresyon=849 otomatik test geçti. Mevcut LocalIdentityHttp üzerinde15 HTTPS tarayıcı kontrolü regresyondur; yeni SQL sınırını kullanmaz. PGlite0.5.9/PG18.6 tek exclusive bağlantı; eşzamanlı çağrılar kuyruklanır. Native çok bağlantı/SSI/RLS, HTTP callback, gerçek IdP/KMS, async akademik depo, kontrol düzlemi yetkisi, iptal/anahtar restore checkpoint ve üretim kapasite kabulü açık. B07 bütünü tamamlanmadı.

## Okunan teknik kaynaklar

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), yaşayan kaynak, erişim14.10.2026; HMAC/session bağı, token aktarımı ve login pre-session bölümleri. Bu uygulamanın çıkarımı: CSRF cookie'ye ve sözleşmeye bağlanır, login sonrası session yenilenir; yalnız HMAC bütün HTTP sınırını karşılamaz.
- [RFC6585](https://www.rfc-editor.org/rfc/rfc6585.html), Nisan2012, §4:429 istek sınırı yanıtı, isteğe bağlı Retry-After ve cache yasağı. Kota değerleri standarttan alınmadı; yerel test profili seçimidir. Bu pakette HTTP yanıt adaptörü yoktur.
- PG18 işlem/lock ve PGlite kaynak kapsamı `IDENTITY-KEY-BRIDGE-CONTRACT.md` içinde korunur. Teknik kaynaklar kurum kimlik/anahtar yetkisi vermez.
