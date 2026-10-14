# B07 — işlemsel depo ve anahtar sağlayıcı sınırı

14 Ekim 2026 · `identity-adapter-boundary/1` · bağımsız hata sürücüsü kabulü. Görünür ekran değişikliği yok. Bu modüller mevcut yerel giriş akışına veya üretim rotasına bağlanmadı. PostgreSQL sunucusu/istemcisi bu ortamda yok; gerçek SQL, kilit, RLS, KMS veya region kabulü yapılmış sayılmaz. Yeni bağımlılık, credential, bağlantı, tablo veya migration kurulmadı.

## PostgreSQL işlem sınırı

`PostgresIdentityTransactions` mevcut sunucunun sağlayacağı `pool.connect()` sürücüsünü alır. Bir işlemde tek client; `BEGIN ISOLATION LEVEL SERIALIZABLE`, transaction-local zaman sınırları, kurum/issuer/audience kilidi ve isteğe bağlı ortak tarayıcı kilidi kullanır. Kilit anahtarları sabit SHA-256 bağlamından 64 bit değerlerdir; sıralı alınır. Olası özet çakışması ek bekleme yaratabilir, yetki sağlamaz. Advisory kilitler RLS veya tenant WHERE koşulu yerine geçmez; bütün ilgili yazarların aynı protokolü kullanması gerekir.

`run(work,{retrySafe:false,browserHash:null})` yalnız sunucunun güvendiği depo kodunu çalıştırır. `tx.query(text,values)` parametreli, isimsiz sorgu gönderir. SQL yetkilendirme ayrıştırıcısı değildir: tarayıcıdan SQL/şema/rol veya callback alınamaz; callback COMMIT/DDL/bağlantı ayarı çalıştıramaz. Giriş kodu alışverişi, KMS, ağ, bildirim ve başka yan etkiler transaction dışında olmalıdır. Provider çağrısından önce challenge claim ayrı commit gerektirir.

- Başarılı COMMIT gelmeden sonuç dönmez. İşlem bittikten sonra kaçırılmış query nesnesi kullanılamaz; paralel/unutulmuş sorgu ve yutulmuş SQL hatası COMMIT'i engeller. İç içe işlemler reddedilir.
- Varsayılan tekrar yok. Yalnız `retrySafe:true` ile, tümü tekrar edilebilir salt veritabanı callback'i, PostgreSQL `40001`/`40P01` ve doğrulanmış ROLLBACK sonrası en fazla iki kez yeniden çalışır (üst yapılandırma sınırı üç). Tek sorgu tekrar edilmez.
- COMMIT ağ/transport yanıtı belirsizse otomatik tekrar yok; sonuç ve session token dönmez, client havuzdan atılır. İşlem sunucuda gerçekleşmiş olabilir. Sonraki giriş eski challenge'i tüketilmiş/iptal kabul etmeli; receipt üzerinden mutabakat olmadan başarılı giriş veya aynı session sonucu iddia edilemez.
- ROLLBACK başarısızsa bağlantı atılır ve tekrar yapılmaz. SQL/parametre/host/provider hata ayrıntıları dışarı çıkmaz. Güvenilen depo iş kuralının `CoreError` yanıtı korunur; driver'ın aynı türdeki hatası da gizlenir.
- Client edinme ve transport zaman aşımı, TLS sertifika/hostname doğrulaması, pool error işleyicisi ve kaynaktaki bağlantı bütçesi dış sürücünün sözleşmesidir. SQL statement/lock/idle timeout tek başına ağ kopmasını veya havuz beklemesini sınırlamaz. Bunlar kurulmadan üretim açılmaz.

Kişi/üyelik/challenge/session/iptal/rate/audit SQL deposu **henüz bu sınırla eşlenmedi**. `LocalAcceptanceStore` aynen izole yerel deposudur. Ayrı bir SQL şeması uydurulup mevcut projeye uygulanmadı; gerçek uygunluk incelemesi, rol/RLS ve üretim migration kabulü ayrıca gereklidir.

## Anahtar sağlayıcı sınırı

`IdentityKeyProvider` yalnız PKCE ve nonce amaçları için enjekte edilen `describe`/`mac` sürücüsünü kullanır. KMS markası veya servis seçmez. Sır döndürmez; sürücü, tenant+purpose+version+revision+message ile HMAC-SHA-256 üretir. Mesaj sözleşme özeti, amaç, sürüm, istek bağlamı özeti ve zaman aralığını kapsar. İki amaç ayrı anahtarlar ve ayrı bağlamlar kullanmalıdır.

`start` aktif sürümle en fazla 900 saniyelik bir bağ üretir. `resume` yalnız güvenilir kalıcı challenge'dan okunan aynı bağla, `verify` ayrıca önceden saklanan MAC ile devam eder. Binding imzalı bir yetki belgesi değildir; tarayıcı alanlarıyla seçilmemelidir. PKCE challenge/nonce, tek kullanımlık state ve atomik tüketim yükümlülükleri sürer. Ham state/code/session token bağlam alanına alınmaz; yalnız SHA-256 özet kabul edilir.

İşlem öncesi ve sonrası güncel metadata okunur; sürüm/revizyon/durum değişirse sonuç reddedilir. Olumlu anahtar önbelleği yoktur. Emekliye ayrılan anahtar yalnız ayrılmadan önce başlayan ve kendi süresi dolmamış PKCE/nonce isteğine kullanılabilir; iptal edilmiş, bilinmeyen, yanlış tenant/amaç/sözleşme veya süresi dolan sürüm reddedilir. MAC yanıtındaki fazladan alanlar da reddedilir; sağlayıcının yanlışlıkla sır döndürmesi dışarı taşınmaz. Süre aşımı AbortSignal verir; geç sonuç kullanılmaz.

Bu API tek başına dağıtık iptal garantisi **vermez**. Metadata kontrolü ile oturum transaction'ı arasında kapanış olabilir. Üretim bağlaması, sağlayıcının monoton anahtar revizyonunu ve kapatma bariyerini aynı veritabanı commit'inde tekrar doğrulamalıdır. Sağlayıcı eski metadata'yı geri oynatamaz; güvenilir revizyon/checkpoint ve geri yükleme B27'ye bağlıdır. Bu atomik köprü ve gerçek KMS driver'ı açıktır. CSRF/rate key dönüşümü ayrı kalır: kova anahtarı yenilenerek oran bütçesi sıfırlanmamalıdır; bu sınıf bu amaçları bilerek kabul etmez.

## Kaynak kaydı

Hepsi 14.10.2026 tarihinde okundu. Teknik tasarım kaynaklarıdır; Gazi yetkilendirmesi veya kurum politikası değildir.

| Kaynak / sürüm | Okunan kapsam ve uygulama kararı |
|---|---|
| PostgreSQL 18, [Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) §13.2.3 | Serializable hata olasılığı ve bütün transaction'ın yeniden denenmesi; gerçek veritabanı testi olmadan kabul iddiası yok. |
| PostgreSQL 18, [Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html) §13.3.4–5 | Sabit kilit sırası ve transaction-scope advisory lock; işbirlikli protokol, otomatik erişim yetkisi değildir. |
| node-postgres, [Transactions](https://node-postgres.com/features/transactions), sürümsüz güncel doküman | İşlem boyunca aynı client; pool.query ile transaction kurulmaz. |
| node-postgres, [Queries](https://node-postgres.com/features/queries) / [Pool](https://node-postgres.com/apis/pool) | Parametreli isimsiz sorgu; release(true) client'ı atar; bağlantı zaman aşımı ve hata dinleyicisi dış driver yükümlülüğü. Paket kurulmadı/sürüm uyumluluğu gerçek driver ile ayrıca sınanmalı. |
| Supabase [bağlantı rehberi](https://supabase.com/docs/guides/database/connecting-to-postgres) / [prepared statement rehberi](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL), sürümsüz güncel doküman | Transaction pooler için isimli prepared statement kullanılmadı. Gerçek proje bağlantı modu veya hizmet seçimi yapılmadı. |
| Supabase [changelog](https://supabase.com/changelog), 14.10.2026 taraması | Markdown endpoint okunamadı; resmî HTML ve arama kullanıldı. 12.10.2026 HTTP TLS 1.2 eski CBC kümelerinin en erken 10.11.2026 kaldırılma duyurusu görüldü. Yeni HTTP istemcisi veya TLS ayarı eklenmedi. 18.06.2026 self-hosted Auth URI değişikliği bu kurulmayan adaptöre uygulanmadı. |

## Kabul ve kalan işler

20 yeni otomatik senaryo: SQL driver protokolü/hata enjeksiyonu, rollback/commit belirsizliği, sınırlı tekrar, kullanımdan çıkan callback, scope kilitleri, PKCE/nonce MAC sürüm/amaç/zaman/iptal ve iki işçi. Bunlar PostgreSQL emülasyonu, SQL şema doğrulaması, dağıtık kilit veya KMS sertifikasyonu değildir. Önceden bağlı sentetik HTTPS girişinin 15 tarayıcı kontrolü ayrıca yeniden geçti; yeni adaptörleri kullandığı iddia edilmez.

Güncel toplam: 438 sunucu +46 portal +46 regresyon =530. Kapsam matrisi 77 komut/16 HTTP ve 3337 olumlu örnekten 26696 türetilmiş negatif kontrol; yeni adaptörler HTTP/komut eklemedi. 115 statik dosya korumalı paketlendi. B07'nin yalnız bu bağımsız sınır dilimi geçti; B01–B36 genel tamamlığı veya yeni canlı yayın değildir.

Sonraki bağımsız B07: kişi/üyelik/challenge/iptal/rate/audit SQL repository bağlaması, atomik anahtar revizyon bariyeri, kalıcı bucket anahtar rotasyonu ve bu yolların ortak kabul sürücüsü. Gerçek test deposu/migration/KMS/IdP ve dağıtık kapasite kabulü ACCESS-ACTIONS kapsamında ayrıca kapalıdır. Diğer bağımsız ekran işlerini bekletme; B15 kayıt/ilerleme senaryosu sıradaki görünür dilimdir.

## 14.10.2026 Paket39 izleme

Kalıcı CSRF/rate dönüşümünün **yerel HTTP** dilimi `HTTP-KEY-ROTATION-CONTRACT.md` ile bağlandı ve sınandı. Yukarıdaki Paket29 kaydı tarihsel kanıttır. PKCE/nonce anahtar revizyonunun atomik session-commit bariyeri ve PostgreSQL repository hâlâ açık; CSRF dönüşümü bunların yerine geçmez.
