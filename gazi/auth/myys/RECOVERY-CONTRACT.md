# B27 — kesinti, güvenlik olayı ve geri yükleme tatbikatı

14.10.2026 · Senaryo `2026.10.14.1` · **Yalnız izole sentetik kabul.** Bu araç gerçek kurum deposunu yedeklemez veya geri yüklemez. Üretim RPO/RTO taahhüdü, gerçek hizmet açılışı, anahtar kasası veya dağıtık felaket kurtarma kabulü değildir. `configuredCore()` Vercel'de kapalı kalır.

## Ekrandan tamamlanan işlem

**Akademik Kayıt ve Karar → Kurtarma tatbikatları**:

1. Birimde MFA ile yetkili bilgi işlem görevlisi gerekçe, yerel veri kaybı ve geri dönüş hedefini kaydeder. Hedefler değişmez; yeni hedef yeni plan gerektirir.
2. Ayrı çalıştırma düğmesi sunucudaki sentetik provayı başlatır. Ekran isteği dosya yolu, gerçek yedek, özel anahtar veya hazır sonuç kabul etmez. Her çalışmada ayrı geçici depo ve yalnız bellekte geçici imza anahtarları üretilir.
3. Ölçüm, denetimler, başarısız hedef ve indirme aynı kayıt üzerinde görünür. Sonuç JSON'u yalnız plan/rapor/inceleme taşır; veritabanı baytları, öğrenci kanıtı, JWT veya anahtar içermez.
4. Planlayandan ve çalıştırandan ayrı bir yönetici güncel sonuç özeti üzerinden gerekçeli uygun/düzeltme incelemesi yapar. Başarısız sonuç uygun sayılamaz. Yerel uygunluk üretim açılışı sağlamaz.
5. Arama, yenileme, 390 px görünüm ve klavye sırası denetlendi. Öğrenen ve yetkisiz birim/kurum bu raporları göremez.

`recovery-plan` ve `recovery-review` mevcut atomik komut/denetim/idempotency kaydını kullanır. `/api/myys/kurtarma-dene` yalnız ayrıca enjekte edilmiş `LocalRecoveryService` varsa çalışır; varsayılan adaptör yoktur. Core/oturum yoksa kapalıdır. Sentetik çalıştırıcı `scripts/lib/integrated-recovery.mjs` içindedir ve canlı paketlenmez. Kullanıcı panelinin mevcut akademik deposundan satır kopyalanmaz: bu, açıkça ayrı bir sentetik felaket provasıdır.

## Denenen olay zinciri

| Adım | Doğrulama |
|---|---|
| Başlangıç | İnsan rubriği ve ayrı komisyon kararına bağlı iki sentetik imzalı belge; birinde özgün asimetrik LMS kaynak kanıtı ve tarihsel karar arşivi |
| Kesinti | İkinci kaynak sürümü kalıcı kuyruğa alınır; işçi sahipliği alınır, sonuç yazılmadan bırakılır |
| Eski yedek | Güvenlik olaylarından önceki tutarlı snapshot ayrı özel dizine alınır |
| Güvenlik olayı | Yanlış sentetik ihraç gerekçeyle iptal edilir, belge anahtarı riskli olarak kapatılır; imzalı sağlayıcı çıkışı uygulanır; başka bir bekleyen giriş bırakılır |
| Güncel güvenlik noktası | Olaylar sonrası yeni snapshot ve ayrı SHA-256 özeti tutulur. Bu senaryoda bundan sonra kaynak depoya yazı yapılmaz |
| Negatif geri dönüş | Eski yedek güncel güvenlik noktası özetiyle reddedilir. Baytı bozulmuş yeni yedek de hedef oluşturulmadan reddedilir |
| Yeni izole hedef | Güncel baytlar yalnız yeni dizine yüklenir; SQLite bütünlüğü/ilişkileri, akademik kayıtlar, komutlar, audit ve logout makbuzları karşılaştırılır |
| Kimlik | Eski oturum, oturum kapsamı/sağlayıcı bağı, oturum ailesi bağları ve bekleyen girişler açılamaz. Eski giriş cevabı reddedilir; imzalı çıkış tekrarı aynı makbuzu kullanır; yeni imzalı kimlik doğrulaması gerekir |
| Kuyruk | Sanal saat 31 saniye ilerletilir; eski işçinin süresi dolmuş sonucu reddedilir. Yeni işçi tek receipt üretir; ikinci çalıştırma ve aynı kaynak dosyası ikinci işlem üretmez |
| Akademik ve belge sonucu | Eski karar arşivi, kaynak JWT'si ve SHA-256 aynıdır. Yeni kaynak sürümü, riskli anahtar ve iptal edilen belge kullanıma kapalı kalır |

11 kontrolün tamamı gerçek yerel depo/kimlik/işçi/imza modülleriyle çalışır. Kaynak JWT eşitliği önceki doğrulanmış baytları korur; bu provanın arşiv kontrolü bağımsız W3C/1EdTech sertifikasyonu değildir. B09'un ayrı Python/OpenSSL tarayıcı doğrulaması ayrıca yeniden geçti.

## Yedek, tazelik ve kimlik sınırı

`snapshotLocalStore` SQLite Online Backup API kullanır; açık depo dosyası düz dosya kopyasıyla alınmaz. Yalnız yeni 0700 dizin ve 0600 dosya kullanılır; var olan hedef değiştirilmez. Kopyada foreign keys açıkken oturum bağları silinir; oturum aile bağları silinir; pending/claimed girişler cancelled yapılır. Akademik ve audit kayıtları değişmez. Logout makbuzları ve mevcut oran sınırı tabloları korunur. Sonuç bütünlük/foreign-key denetiminden geçer.

SHA-256 özeti imza değildir. Yedek ve güvenilir güncel özetin **ayrı ve yetkili** saklanması gerekir. Bu provada son güvenlik noktası bellekte ayrı tutulur; eski yedeğin kendi eski özeti tek başına yeterli sayılmaz. Gerçek üretimde güvenilir son noktanın kaybı veya yedek sonrası iptal/kayıt kuyruğu varsa eski yedekle hizmet açılmaz. Güvenlik kuyruğunun üretimde yeniden oynatılması, kalıcı dış checkpoint saklaması ve anahtar kasası adapteri bu sentetik araçta yoktur; güncel güvenilir nokta bulunmadığında kapalı kalma esastır.

Çalıştırma başlangıcı ve sonuç ayrı kalıcı transaction'lardır; her ikisi güncel kişi, MFA, kurum/birim rolü denetler. Başlatan kişi değişemez. İki bağlantı ikinci eşzamanlı çalışmayı engeller; iki dakikalık sahiplik süresi dolan çalıştırıcı sonuç yazamaz. Yeniden başlatma sonrası aynı plan en fazla üç deneme yapar. Başarılı sonuç tekrar işletilmez. Yetki kaybı veya audit hatasında sonuç commit olmaz; başlangıç kaydı kalır ve süre dolana kadar açık deneme görünür. Ham istisna, dosya yolu veya gizli veri sonuç kaydına taşınmaz.

## Ölçümün anlamı

`backupMs`, `restoreMs`, `recoveryMs` monotonik saatin **gerçekte ölçtüğü** yerel sürelerdir. `recoveryMs` geri dönüş doğrulamalarını ve yeniden girişi içerir; prova öncesi veri/anahtar hazırlığını içermez. Süre dolumu için gerçek bekleme yapılmaz: `syntheticLeaseAdvanceMs=31000` ayrı sanal süre olarak gösterilir ve yerel RTO karşılaştırmasına **eklenir**. Bu nedenle bir saniyelik yerel hedef geçmez.

RPO boşluğu bu senaryoda 0'dır: güvenlik işlemleri sonrasındaki tam checkpoint korunur, sonrasında kaynak depoya yazı yoktur ve bütün kalıcı kayıtlar aynı bulunur. Bu, gerçek sistemde sıfır kayıp garantisi değildir. Kopya sonrası yazıların veya dış sistemin kurtarıldığı iddia edilmez. Kurumun gerçek RPO/RTO, yük, topoloji, yedek alanı ve geri dönüş sorumlusu bilinmediği için kurumsal hedef karşılandı denmez.

14.10.2026 CLI örneği: yedek **1,560 ms**, dosya geri dönüşü **0,639 ms**, geri dönüş/denetim **15,145 ms**; ayrıca **31.000 ms sanal kuyruk süresi**. 36 sentetik kayıt, 0 kayıp, 0 eski oturum. Tek makine ve küçük sentetik veri ölçümüdür; performans taahhüdü değildir. Aynı kod her provada yeniden ölçer; sonuçlar `acceptance/B27-recovery-20261014.json` içindedir.

## Kaynak, kabul ve açık kalanlar

14.10.2026 teknik kaynak incelemesi:

- [Node.js v24.21.0 SQLite: `backup`](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html#sqlitebackupsourceDb-path-options) API bölümü: kaynak bağlantısı, ayrı hedef, Promise, aynı/başka bağlantı mutasyonları. Test çalıştırıcısı Node **24.19.0**; yeni sürüme ait ek özellik kullanılmadı.
- [SQLite Online Backup API](https://www.sqlite.org/backup.html), sayfa güncellemesi 13.11.2025, §1 ve §3.1: tutarlı kopya, bağlantı kilitleri, değişiklikte yeniden başlama. Sürekli yazım kopyayı geciktirebilir; üretim SLA'sı türetilmedi.

12 yeni +4 mevcut geri dönüş testi; tüm sunucu 403, portal 46, regresyon 46 = **495** otomatik test. 13 tatbikat +14 kaynak +13 itiraz tarayıcı kontrolü. B08: 74 komut/16 HTTP, 3.128 olumlu örnek/25.024 türetilmiş kapsam kontrolü. Örnek sayısı ayrı test veya ürün tamamlanma oranı değildir.

B27'nin bağımsız sentetik olay/kuyruk/anahtar/yanlış ihraç/geri yükleme birleştirmesi kapandı. **B27 bütünü tamamlanmadı.** Gerçek işletim kılavuzu sorumluları, sözleşmeli hedefler, yetkili yedek deposu/ayrı geri dönüş ortamı, üretim transaction/işçi/kimlik/anahtar adaptörü ve dağıtık/dış hizmet provası açıktır. Son canlı Paket16; bu Paket27 kaynak adayıdır, canlı dağıtımı veya yeni korumalı smoke'u yoktur.
