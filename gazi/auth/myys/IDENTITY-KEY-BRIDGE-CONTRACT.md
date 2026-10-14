# B07 — Anahtar metadata ve SQL commit bağı

14 Ekim 2026 · `myys-identity-key-bridge/1` · Paket53 · **yalnız bağımsız yerel kabul**.

Görünür ekran değişikliği yok. `PostgresIdentityKeyBridge`, Paket29 işlem ve anahtar sağlayıcı sınırını gerçek SQL ile bağlar. PKCE/nonce sağlayıcı kontrolünden sonra anahtar kapanırsa güvenilen SQL işi kabul edilmez. Mevcut `LocalIdentityFlow`/HTTPS akışı bu adaptöre geçirilmedi; üretim oturumu, kişi deposu veya dağıtık iptal kabulü değildir. `configuredCore()` Vercel'de kapalıdır.

## Bağ ve kontrol sırası

1. Yetkilendirilmiş sunucu kontrol düzlemi `recordMetadata` çağrısıyla anahtarın genel metadata kaydını denetim satırıyla aynı transaction'da değiştirir. Bu yöntem bir HTTP yetkilendirme uç noktası değildir. Operatör yetkisi, dayanak ve sağlayıcının gerçek anahtar kimliği dış kontrol düzlemince doğrulanmalıdır.
2. İlk kayıt yalnız aktif/revizyon1; değişiklik beklenen revizyona göre tam +1'dir. Aktif→emekli/iptal, emekli→iptal mümkündür; geri alma, tekrar açma, sürümün zaman aralığını değiştirme yasaktır. Bir tenant/amaçta yalnız bir aktif sürüm vardır. Farklı anahtar materyali aynı version altında yeniden kullanılamaz; bu son yükümlülük sağlayıcı sözleşmesidir, sır materyali depoya okunmaz.
3. Kapatma/rotasyon **önce SQL bariyerini commit eder, sonra sağlayıcıyı değiştirir**. Aradaki uyuşmazlık erişimi kapatır. Yeni sürüm, eski sürümün emeklilik/iptal kaydı commit edildikten sonra eklenir. Sağlayıcıyı önce değiştiren bağımsız yazar bu protokolü ihlal eder. Bütün oturum yazarları ve anahtar yöneticileri aynı protokole katılmadan dağıtık garanti yoktur.
4. `start`/`resume`/`verify`, sağlayıcı I/O'sunu transaction dışında tamamlar. Sağlayıcının iki okumada değişmediğini denetlediği genel metadata, kısa SQL işleminde kayıtla tam eşleşir. Dönen makbuz yalnız aynı köprü örneğinin özel WeakMap kaydında geçerlidir. Kopyalanmış JSON, tarayıcı iddiası veya başka köprü nesnesi bunu üretemez. Yeniden başlatma sonrası güvenilen kalıcı challenge bağından yeni `resume`/`verify` gerekir.
5. `withKeys` aynı istek bağlamına ait PKCE ve nonce makbuzunu ister. İki amaç sabit sırayla kilitlenir; tenant/purpose/version satırı issuer/audience kapsamları arasında ortaktır. Her iki genel metadata ve süre, SQL işinden önce ve sonra yeniden okunur. Revizyon, durum, geçerlilik veya bağlam değişirse tüm işlem geri alınır. Makbuz başarıda veya hatada bir kez tüketilir.
6. Yalnız güvenilen SQL repository callback'i kullanılabilir; dış ağ/KMS/IdP, ileti gönderme, COMMIT, DDL veya başka yan etki callback'e alınmaz. `PostgresIdentityTransactions` tüm SQL işlemini sınırlı `40001`/`40P01` durumunda yeniden çalıştırır. Belirsiz COMMIT sonuç/makbuz/oturum döndürmez ve yeniden denenmez. DB'de gerçekleşmiş olabileceği için kalıcı challenge/oturum mutabakatı ayrıca gerekir.

Emekli anahtar, yalnız emeklilikten önce başlayan ve süresi dolmamış bağı yeniden doğrulayabilir. Emeklilik öncesi oluşturulmuş eski makbuz yeni metadata revizyonuyla uyuşmayacağından doğrudan kullanılamaz. Aktif anahtar ve istek süreleri SQL sorgusunu bekledikten ve SQL işinden sonra tekrar kontrol edilir. Tam commit anının duvar saati için atomik zaman garantisi iddia edilmez; doğrulanmış son süre ile COMMIT arasındaki transport süresi ve oturum okuma denetimi tam repository kabulünde ele alınmalıdır.

## SQL adayı ve veri kapsamı

`identity-key-schema.sql` yalnız boş test veritabanına açık test çağrısıyla kurulur. Constructor, uygulama başlangıcı ve HTTP bunu çalıştırmaz. Mevcut Supabase veya üretim şemasına uygulanmadı. Mevcut LocalAcceptanceStore envanteri **16 tablo/148 kayıt türü** olarak kalır. Aşağıdaki iki PostgreSQL adayı ayrı kapsamdır; kurum alan/saklama onayı değildir.

| Aday tablo | Alanlar ve amaç | Yetki / saklama sınırı |
|---|---|---|
| `myys_identity_key_barriers` | tenant, purpose, key_version, revision, genel metadata; kapatılmış veya emekli anahtarla kabulü engellemek | Güvenilen anahtar kontrol düzlemi yazar; giriş repository okur/kilitler. Sır, MAC, ham state/code/token yok. Süre ve son iptal/checkpoint saklama kararı açık; otomatik silme yok. |
| `myys_identity_key_audit` | change_id, tenant, purpose, key_version, revision, issuer, audience, operator_ref, authority_digest, recorded_at, metadata; değişikliği dayanağına bağlamak | Operatör referansı ve kapsam hassas güvenlik kaydıdır; öğrenci özeti/portal/API'ye açılmaz. Onaylı saklama süresi, gerçek alıcı/ülke, yedek ve imha usulü henüz yok. |

Parametreli sorgular ve sabit tablo adları kullanılır. Kilit, tenant WHERE veya yetkilendirme yerine geçmez. Üretim DB rolü, RLS, kontrollü migration, bağlantı/TLS/pool zaman aşımı ve denetim bütünlüğü ayrı kabul ister. İnceleme adayı şemayı kurmak için mevcut geliştirme yetkisi üretim DDL yetkisi sayılmaz.

## Gerçek sınanan kapsam

PGlite **0.5.9**, sabit devDependency ve lockfile integrity ile kuruldu; runtime bağımlılıkları değişmedi. Gözlenen motor PostgreSQL **18.6**, wasm32-unknown-emscripten. Gerçek SQL ayrıştırma, CHECK/unique/FK, SERIALIZABLE transaction, parametreli sorgu, row/advisory lock komutları, COMMIT/ROLLBACK ve dosya kapatıp yeniden açma çalıştırıldı. İki sentinel test tablosu yalnız atomik yazma kanıtıdır; gerçek challenge veya session deposu diye sunulmaz.

PGlite tek exclusive bağlantılıdır. Test havuzu bütün client kullanımını sıraya alır; iki çağıran/issuer kabulü gerçek iki PostgreSQL oturumu, SSI çatışması, bölgesel yarış veya RLS kabulü değildir. Native PostgreSQL hazırlığı ortamın setgroups/setegid/seteuid kısıtı nedeniyle kurulamadı; kısıt kaldırılmadı, servis/hesap/cluster oluşturulmadı. Süreç içi motor kullanıldı.

16 yeni senaryo: başarılı iki amaçlı atomik kabul; sağlayıcı sonrası iptal; iki yönde metadata uyuşmazlığı; emekli anahtar ve yeni sürüm; monoton/terminal değişiklikler; aktif sürüm ve JSON SQL kısıtları; metadata-denetim rollback; iş-denetim rollback; iş sırasında süre dolması; saat geri dönüşü/sorgu beklemesi; kopya/başka köprü/bağlam/amaç makbuzu; tenant/issuer/audience/contract; başka issuer üzerinden ortak iptal; iki sıralı yazar; gerçek COMMIT sonrası transport hata enjeksiyonu; dosyayı yeniden açınca iptal ve denetim sürekliliği. Paket29'un20 protokol/sağlayıcı testi ayrıca geçti. Hiçbiri gerçek KMS sertifikasyonu değildir.

## Kaynak ve sürüm kaydı

Hepsi 14.10.2026 tarihinde ilgili bölümden okundu. Teknik tasarım kaynaklarıdır; Gazi kurum yetkisi veya akademik hüküm değildir.

| Resmî kaynak / sürüm | Okunan kapsam ve karar |
|---|---|
| [PostgreSQL18 Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html), §13.2.3 | Serializable başarısızlığı bütün transaction'ı yeniden başlatmayı gerektirir; başarılı COMMIT öncesi sonuç geçerli sayılmaz. |
| [PostgreSQL18 Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html), §13.3.2,4,5 | Satır kilitleri, sabit kilit sırası, transaction advisory lock ve bütün yazarların katılımı; eski snapshot'a denk gelen gerçek çok bağlantı yarışı ayrıca sınanmalı. |
| [PGlite Getting started](https://pglite.dev/docs/), sürümsüz güncel belge | Bellek/dosya deposu ve tek exclusive bağlantı sınırı; gerçek çok client havuzu iddiası yok. |
| [PGlite API](https://pglite.dev/docs/api), sürümsüz güncel belge; kullanılan paket0.5.9 | create/query/exec/transaction/close ve parametreler; test-only açık DDL, normal kalıcılık, temiz kapatma. |

## Açık işler

Kişi/üyelik, tek kullanımlık claim-before-provider challenge, session/family, iptal, rate ve audit SQL repository; opak imza kanıtı ile async kabul; kalıcı tüketim ve belirsiz COMMIT mutabakatı; HTTP bağlantısı; kontrol düzlemi yetkilendirmesi; bütün yazarlar ve geri yükleme sonrası monoton güvenlik checkpoint. Bunların bağımsız kodu sıradadır. Gerçek IdP/MFA, KMS, çok bağlantılı PostgreSQL/rol/RLS, üretim migration, bölge/kapasite ve canlı kullanıcı kabulü ayrıca açıktır. B07 bütün kabul şartları kapanmadı.
