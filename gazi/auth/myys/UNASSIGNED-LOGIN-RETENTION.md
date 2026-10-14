# Kişiye bağlanmamış yerel giriş istekleri — Paket65

14.10.2026 · B04/B28 bağımsız yerel dilimi. B28'in bütünü veya hukuki imha kabulü değildir.

## Kullanıcı akışı

Akademik Kayıt ve Karar → Akış ve saklama ekranında açık kurum kapsamlı hazırlama görevi bulunan yönetici, veri akışı siciline bağlı `MYYS-local / Kişiye bağlanmamış girişler` kuralını gerekçeleriyle kaydeder. Süre kendiliğinden doldurulmaz. Farklı ve ayrıca görevlendirilmiş yönetici inceler. İkisinden farklı, ayrıca görevlendirilmiş BT kişisi önce yalnız sayıları gösteren önizleme oluşturur; işaretlenmemiş açık onay kutusu çalıştırmayı engeller. Sonuç ve eski sürümler yeniden yüklemede korunur. Yeni kural sürümü kabul edilene kadar eski sürüm çalışmaz.

Birim rolü, kişisi/birimi bilinmeyen giriş isteği üzerinde kurum geneli yetki sayılmaz. Bu hedefte üç görev de açık ayrı yetki gerektirir. Görevi olmayan yönetici hedefi seçemez; BT kişi/kapsam bilgisi alamaz. Yetki değişince kabul edilmiş kuralın ekranı yeniden doğrulama gerektiğini gösterir. Öğrenen bu idari yolu kullanmaz; önceki kişisel talep/yanıt/used istek temizliği korunur.

## Güvenilir kontrol düzlemi sınırı

`recordLocalRetentionAuthority` yalnız güvenilir, ayrıca yetkilendirilmiş yerel işletim çağrısıdır. HTTP rotası, core komutu, rol üzerinden kendi kendine görevlendirme veya varsayılan yetki yoktur. `operatorRef` ve `authorityDigest` metadata'dır; bunları yazabilmek gerçek kurum yetkisi kanıtı değildir. Sentetik fixture bu çağrıyı yalnız geçici test kişilerine uygular. Gerçek kişiye görevlendirme yapılmadı.

Değişmez `retention-authority` kaydı tenant/person/yönetim birimi, `prepare/review/execute`, başlangıç/bitiş, etkinlik, tam önceki revizyon+1, önceki kayıt ve dayanak özeti içerir. Kayıt ve denetim aynı SQLite işlemi içindedir. Güncel kişinin, üyeliğin ve gerekli admin/it rolünün etkinliği ayrıca okunur; MFA gerekir. Yetki kaydı tekrar etkinleştirilse bile yeni revizyon özeti eski kural/inceleme/önizlemeyi yeniden açmaz. Rol/üyelik revizyon modeli bu dilimde yeniden yazılmadı; bu ayrı kontrol kaydı tüm dizin ABA/geri yükleme sorunlarını çözdü iddiası değildir.

Kurum başına tek `MYYS-local/login-security` kural zinciri vardır. İkinci birim daha kısa paralel süre seçemez; yönetim birimi bu kullanıcı komutuyla taşınamaz. `login-security` aşaması salt sicil hedefiyle gölgelenemez. Hazırlayanın yetki özeti kuralda, inceleyenin özeti incelemede, çalıştıranın özeti önizlemede sabitlenir. İnceleme ve çalışma güncel özetleri yeniden denetler. Önizlemeyi başka BT görevlisi çalıştıramaz. Tamamlanmış makbuzun komut tekrarı da güncel erişimi denetler; silmeyi yinelemez.

## Aday ve işlem sınırı

Yalnız aynı tenant `identity_challenges` içindeki `failed/cancelled` kayıtlar seçilir. Oluşturma/bitiş zamanları tutarlı olmalı; hem istek süresi hem bitişi, kaynaklı kuralın gün sayısıyla hesaplanan eşiği aşmış olmalı. `pending/claimed/used`, tamamlanma zamanı olmayan, yeni, bozuk veya başka kurum kayıtları seçilmez.

Herhangi bir `identity.accept` denetim bağı, browser özetiyle binding/scope/provider-session veya oturum aile bağı olan satır korunur. Aile bağının eskimiş olması tek başına silme izni değildir. Kapsamı çelişkili ilişki de koruma yönünde değerlendirilir. Kişi/subject varsayımı yapılmaz.

En çok100 aday, toplam uygun/korunan sayıları ve sabit eşikle hesaplanan tam aday özeti önizlemeye bağlanır. Ham istek kimliği, browser/state/contract özeti ve grant kaydı kullanıcı görünümüne eklenmez. 15 dakika içinde aynı kişi ve yetkiyle, açık onay ve değişmemiş aday kümesiyle çalışır. Yeni aday veya ilişki eski önizlemeyi geçersizleştirir. Sıfır aday çalıştırılmaz. Silme, sonuç makbuzu, idempotency sonucu ve denetim aynı `BEGIN IMMEDIATE` işlemi içindedir; audit hatasında hepsi geri alınır. İkinci depo bağlantısındaki eski önizleme yeniden kullanılamaz.

Silinen yalnız aday giriş isteği satırıdır. Kabul/iptal denetimi, komut sonucu, kişi/üyelik, oturum/binding/aile, sağlayıcı iptal makbuzu, oran bütçesi, anahtar geçmişi ve akademik kayıtlar değiştirilmez. Makbuz `requestFullyFulfilled/physicalDestructionVerified/official=false` taşır. SQLite serbest sayfaları, WAL/journal/yedek/haricî kopya imhası uygulanmaz; tam silme veya anonimleştirme iddiası yoktur. Kişiye bağlanmamış istek temizliği, öğrenenin hesabı silindi demek değildir.

Yerel aday taraması ve 100 satırlık işlem sınırı üretim kapasite kabulü değildir. Sayım için uygun tarih kümesi taranır; üretim indeks/işçi/kapasite ve kapsamlı saklama planı açık kalır.

## Aynı işlem zincirinde doğrulama

React ekranı gerçek yerel HTTP core/SQLite deposuna bağlanır. Ayrı testte gerçek loopback HTTPS + imzalı sentetik IdP başarısız/iptal callback üretir. Kural süresi geçince temizlenir; eski callback artık sağlayıcıya gidemez, çerez veya yeni oturum alamaz. Aynı depodaki güncel başarılı oturum ve akademik karar korunur. Parola/OTP veya gerçek kişi kullanılmaz.

Bu LocalAcceptanceStore dilimidir. Paket59/64 PGlite SQL kimliği ve ayrı checkpoint ile aynı üretim deposu diye gösterilmez. `configuredCore()` Vercel'de kapalıdır; üretim migration veya yeni kalıcı erişim yoktur.

## Resmî dayanak kaydı ve kalan kurum kararı

14.10.2026 tarihinde KVKK'nın aşağıdaki resmî açıklaması ve konsolide yönetmelik metni okundu. Yönetmeliğin ilk yayımı 28.10.2017/30224; sayfada 28.04.2019/30758 değişiklik atıfları vardır. Gazi'nin somut giriş kaydı saklama süresi veya görevlendirmesi bu kaynaklardan çıkarılamaz.

- [KVKK silme/yok etme/anonimleştirme açıklaması](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi): işleme şartlarının sona ermesi ve farklı işlem türlerinin anlamı.
- [KVKK konsolide Yönetmelik](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK), m.5–12: politika tek başına uygunluğu kanıtlamaz; amaç, ortam, sorumluluk, yöntem, süre ve sürüm açıklanmalıdır. M.7(3)'te imha işlemlerinin kayıtlarına ilişkin en az üç yıllık hüküm bulunur; bu her giriş veya güvenlik kaydı için genel saklama süresi değildir. M.11 periyodik imha, m.12 başvuru usulünü düzenler; kod bunları bütün kayıtlara tek süre olarak uygulamaz.
- Resmî Gazete ilk yayın bağlantısı `https://www.resmigazete.gov.tr/eskiler/2017/10/20171028-10.htm` bu incelemede zaman aşımı verdi; okunmuş metin KVKK'nın resmî konsolide nüshasıdır. Başka kurumun kendi saklama politikası Gazi'ye genellenmedi.

Gerçek veri sorumlusu/yetkili birim: işleme dayanağı, gereklilik ve süre başlangıcı, üç görevin yazılı kapsamı, inceleme/geri çekme, olay/soruşturma muhafazası, yedek/komut/audit kopyaları ve imha kanıtı kararı vermelidir. Koda otomatik hukuk kararı, gerçek üretim silmesi veya mevcut kayıtları keyfî kısaltan varsayılan süre eklenmedi. `ACCESS-ACTIONS.md` tek eylem listesi geçerlidir.

## Yeniden üretim

- `node --test gazi/auth/tests/myys-unassigned-retention.test.mjs gazi/auth/tests/myys-unassigned-retention-http.test.mjs`
- `node scripts/myys-unassigned-retention-browser.cjs` (mevcut Chromium yürütücü değişkenleriyle)
- `node scripts/myys-retention-browser.cjs` (önceki oturum temizliği)
- `node scripts/myys-scope-acceptance.mjs` (tam sunucu + negatif kurum/birim matrisi)

Kanıt ve sayılar: `acceptance/B28-unassigned-retention-20261014.json`. Bu dilim kaynak geliştirmesidir; yeni canlı yayın değildir.
