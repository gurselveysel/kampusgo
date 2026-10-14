# B07/B27/B28 — SQL kimliği için ayrı güncellik kaydı

14.10.2026 · Paket64 · `myys-sql-identity-checkpoint/1` · **bağımsız yerel kabul**.

Görünür yeni menü veya ekran yok. Mevcut yerel **Kurum girişi / Kurum oturumu denemesi** bu denetim bağlıyken sınandı. Eski veya değiştirilmiş SQL kopyası, ayrı kalıcı kabul kaydıyla eşleşmedikçe kişi, rol, oturum veya giriş bütçesi işlenmez. Oturum API'si 503/JSON; mevcut Türkçe giriş hata sayfası erişimi kapalı tutar. Akademik panelin SQL deposuna bağlantısı, gerçek IdP ve üretim hizmeti açılmadı. Son canlı Paket16; bu yeni bir yayın değildir.

## Güven sınırı

`PostgresIdentityTransactions` açıkça verilen `PostgresIdentityCheckpoint` ile çalışır. Varsayılan `null`, eski bağımsız adaptör testlerini korur; **checkpoint verilmemiş örnek bu garantiyi taşımaz**. Üretim kabulünde bütün okuyucu ve yazıcıların aynı kontrol kaydına katıldığını kanıtlamak gerekir. Birim veya tenant başına ayrı kontrol kaydı yeterli değildir: kişi kimliği ve anahtar bariyerleri kapsamlar arasında ortaktır. Bu profil, bir SQL kimlik deposunun tamamını tek `journalId` ile kapsar.

Kalıcı referans sürücü `scripts/lib/local-identity-checkpoint.mjs` içindedir; üretim paketlenmez ve Vercel ortamında çalışmaz. SQL kopyalarından ayrı, yeni 0700 dizin/0600 dosyada SQLite `DELETE` journal ve `synchronous=EXTRA` kullanır. İki bağlantı ve ayrı süreç denendi. Bu, dağıtık mutabakat servisi, değiştirilemez donanım sayacı veya disk/güç kesintisi sertifikasyonu değildir. Gerçek disk/işletim sistemi fsync davranışı ayrıca kabul ister.

**Ayrı kayıt da SQL yedeğiyle birlikte eski hâle döndürülürse eski durumun tespit edildiği iddia edilmez.** Güvenilen kontrol kaydının bağımsız güncelliği, yazma/geri yükleme yetkisi ve saklama sahibi dış sözleşmedir. SHA-256 imza değildir; DB sahibinin kötü niyetli yetkisi, uygulama yapılandırması veya bütün iki depoyu değiştirmesi bu modelle çözülmez.

## İşlem sırası

1. SQL bağlantısı açılmadan önce ayrı sürücü kalıcı bir rezervasyon verir. Artan `fence` ve rastgele işlem kimliği, önceki kabul edilmiş başlığa bağlıdır. Eşzamanlı ikinci çağrı 503 ile kapanır; otomatik bekleme/yeniden deneme veya süre dolunca kilit açma yoktur. Reddedilen/geri alınmış sıra numarası tekrar kullanılmaz.
2. Mevcut SERIALIZABLE işlem ve kurum/tarayıcı kilitleri korunur. SQL başlığı ayrı kaydın önceki kabulüyle tam eşleşmeli; 12 kimlik tablosunun bütün satırları da önceki özetle uyuşmalıdır. İş callback'i ancak bundan sonra çalışır. Bu denetim bir yetki/rol kararı yerine geçmez.
3. Güvenilen SQL işi çalışır. Kişi/üyelik, istek, anahtar, HTTP epoch/bütçe, oturum, iptal ve denetim yazıları aynı transaction içindedir. Son durum özeti ve yeni SQL başlığı da aynı transaction'da yazılır. İşin SQL başlığını değiştirmesi veya yeni tanınmayan `myys_identity_` tablosu eklemesi kabul edilmez.
4. SQL COMMIT kesin başarılı olduktan ve client bırakıldıktan sonra ayrı sürücü yeni başlığı kalıcı kabul eder. Yalnız bu ikinci onaydan sonra callback sonucu, oturum tokenı veya HTTP izni dışarı döner. KMS, IdP ve ayrı kontrol sürücüsü I/O'su SQL transaction içine alınmaz.
5. Kesin ROLLBACK, rezervasyonu iptal eder; önceki kabul başlığı değişmez. Mevcut opt-in `40001`/`40P01` tekrarı, kesin rollback sonrasında aynı rezervasyonla bütün SQL işini yeniden çalıştırır. Belirsiz COMMIT, başarısız rollback veya sonuçlanmamış sorguda rezervasyon bırakılmaz; sonuç verilmez.
6. Ayrı kayıt onayı kaybolursa sonuç yine verilmez. Onay hiç yazılmadıysa rezervasyon kalıcı olarak bekler. Onay gerçekten kalıcılaştı fakat cevabı kaybolduysa sonraki çağrı güncel eşleşen SQL/kontrol başlığından ilerleyebilir; kayıp oturum tokenı yeniden üretilmez veya döndürülmez.

Rezervasyon sahibi süreç öldürülse bile bekleyen kayıt korunur. **Otomatik belirsiz işlem uzlaştırma, lease devri, başlık sıfırlama veya kurtarma bypass API'si yoktur.** Gerçek yetkili kurtarma, tüm eski yazıcıların kesin durdurulması ve bağımsız işlem kanıtı ile ayrıca tasarlanmalıdır. Bu fail-closed profil erişilebilirliği azaltabilir; üretim kapasite veya RTO hedefini karşıladığı iddia edilmez.

## Başlatma, özet ve kapsam

Constructor DDL veya başlangıç verisi yazmaz. Aday SQL açık test kurulumu ile yüklenir. `initializeCheckpoint({operatorRef, authorityDigest})` yalnız güvenilen kontrol düzleminden çağrılabilir ve **12 kimlik tablosu ile SQL başlığı tamamen boşken** çalışır. Var olan kimlik deposunu veya eski yedeği kendiliğinden yeni başlangıç olarak kabul etmez. Parametrelerde operatör/dayanak yazılması gerçek yetki sağlamaz; HTTP rotası yoktur.

Her işlemde sabit tablo listesi, `public` şeması ve `pg_catalog,public` arama yolu kullanılır. Satırlar PostgreSQL `to_jsonb(row)::text`, C sıralaması, tablo adı/satır sayısı ve UTF-8 bayt uzunluğu ile SHA-256'ya bağlanır; bigint değerler JS sayısına çevrilmez. Bu temsil PGlite0.5.9/PG18.6 üzerinde sınandı; başka motor/major sürüme taşıma özeti kendiliğinden uyumlu sayılmaz. Tablo başına 10.000 satır ve toplam 16 MiB sınırı aşılırsa kabul kapanır. Bu tam tarama **ölçekli üretim artımlı özetleme çözümü değildir**.

Tam durum özeti, yeni başlık satırının eski verinin yanına kopyalanmasını da reddeder. En yeni birebir SQL kopyası aynı ayrı kayıtla doğrulanabilir; eski kopyayı güncel hâle getirmek, eksik güvenlik kuyruğunu yeniden oynatmak veya bütün oturumları bir kurtarma kararıyla kapatmak bu modülün işi değildir. Paket27'nin SQLite geri dönüş provası oturum temizliğini ayrıca yapar; SQL profili onun yerine geçmiş sayılmaz.

## Ayrı veri envanteri

Aktif LocalAcceptanceStore envanteri **16 tablo / 148 kayıt türü** olarak kaldı. Paket58'in 12 PostgreSQL adayına aşağıdaki bir aday eklendi: toplam **13**, hiçbiri üretime uygulanmadı. Referans kontrol dosyasındaki iki SQLite tablo akademik depo envanterine karıştırılmaz.

| Kayıt | Alanlar ve amaç | Erişim / saklama sınırı |
|---|---|---|
| `myys_identity_checkpoint_head` (PG adayı) | singleton, journal_id, profile, fence, operation_id, state_digest; SQL'in kabul edilmiş son güvenlik durumunu eşleştirme | Sunucu işlem sınırı; kullanıcı/öğrenen özetine açılmaz. Genel metadata ve özet; ham token veya satır kopyası yok. |
| `state` (ayrı yerel SQLite) | journal_id, issued, kabul başlığı, bekleyen rezervasyon | Güvenilen ayrı kontrol sürücüsü. SQL ile birlikte geri alınamaz; dosyanın üretim saklama/yedek sahibi belirlenmedi. |
| `events` (ayrı yerel SQLite) | fence, phase, operation_id, rezervasyon/başlık ve ilk operatör-dayanak metadata'sı | Append-only uygulama tetikleyicileri; DB sahibi saldırısına dayanıklılık iddiası yok. Otomatik süre veya silme yok; kişisel operatör referansı için kurum dayanak/süre/alıcı kararı gerekir. |

Bu kayıtlar kişisel veri olmayan kayıtlar olarak ilan edilmez. Yeni kontrol kaydı oluşturmak hesap silme, audit imhası veya kurumca saklama onayı değildir. B28'in komut/audit sonuç kopyaları, sahipsiz başarısız istekler, yedek imhası ve resmî başvuru kanıtı ayrıca açıktır.

## Kabul kanıtı ve sınırlar

20 yeni protokol/SQL/kalıcılık senaryosu ve 3 yeni gerçek TLS senaryosu vardır. Tam PGlite datadir eski/yeni snapshot yüklemesi; 12 tablonun her birinde ayrı değişiklik reddi; gerçek COMMIT sonrası taşıma hatası; ayrı kaydın onayından önce/sonra hata; başarısız rollback; tek rezervasyonlu serialization tekrarı; farklı kapsamlar ve iki SQLite bağlantısı; ayrı sürecin SIGKILL sonrası bekleyen rezervasyonu; özel dosya, symlink/yanlış journal reddi; zaman aşımı; Vercel kapalı durumu sınanır. PGlite tek exclusive bağlantıdır; native çok client SSI/RLS/gerçek DB rolü kabulü değildir.

Mevcut gerçek TLS SQL giriş ekranının 13 Chromium kontrolü yeni sınır bağlıyken geçti. 320 CSS px/metin aralığı, klavye odağı ve özgün logolar korundu. Gerçek ekran okuyucu/kurum IdP veya üretim kabulü değildir. Tam test sayıları ve kaynak kimlikleri `acceptance/B07-B28-checkpoint-20261014.json`, `RELEASE.md` ve `CONTINUE.md` kayıtlarında tutulur.

## Kaynak / sürüm kaydı

14.10.2026'da okunan teknik kaynaklardır; mevzuat veya kurum yetkisi değildir.

| Birincil kaynak | Okunan bölüm / tasarıma etkisi |
|---|---|
| [PostgreSQL18 §13.4](https://www.postgresql.org/docs/18/applevel-consistency.html) | Bütün ilgili okuyucu/yazıcıların Serializable olması; snapshot/kilit ve replica sınırları. Yalnız advisory lock ile dış güncellik garantisi türetilmedi. |
| [SQLite PRAGMA synchronous](https://sqlite.org/pragma.html#pragma_synchronous), sürümsüz canlı belge | DELETE modunda EXTRA dizin senkronizasyonu; FULL/NORMAL farkı. Referans sürücü EXTRA'yı okuyarak denetler. |
| [Node24.19.0 SQLite](https://nodejs.org/download/release/v24.19.0/docs/api/sqlite.html), DatabaseSync | Senkron API, timeout, readOnly, defensive ve uzantı sınırları. Mevcut Node24 çalıştırıcısı; yeni bağımlılık yok. |
| [PGlite API](https://pglite.dev/docs/api), `loadDataDir` / `dumpDataDir` | Tam datadir tar kopyası PGlite'a yeniden yüklenebilir; farklı PostgreSQL sürümleriyle uyumluluk garantisi yok. Kullanılan paket0.5.9 sabit devDependency. |

B07/B27/B28 tamamlanmadı. Async akademik repository ile aynı kimlik/komut transaction bağı, bütün üretim yazarları, harici monoton kontrol hizmeti, gerçek kontrol düzlemi yetkisi, güvenli belirsiz işlem uzlaştırma ve restore kuyruğu, native çok bağlantı/RLS, RPO/RTO ve hukuki saklama kabulü açıktır. Yeni credential, ücretli servis, üretim migration veya gerçek kişi işlemi yapılmadı; `configuredCore()` Vercel'de kapalıdır.
