# Çok dersli tanıma teklifi — 14.10.2026 / Paket46

`recognition-offer`, `recognition-offer-withdraw`, `recognition-offer-decide`, `recognition-offer-appeal`, `recognition-offer-resolve` yalnız LocalAcceptanceStore üzerinde mevcut authenticated core komutlarıdır. Yeni HTTP, kurum yetkisi veya canlı hizmet açılmaz. `configuredCore()` kapalıdır.

## Kullanılabilir yerel akış

Tanıma ve kredi → Çok dersli teklifler: öğrenen aynı kayıt/politika sürümüne bağlı 2–10 kararsız talebi seçer. Politikanın `transferScope=multi-course-offer` alanı açık olmalıdır; eski ve varsayılan politikalar tek ders olarak kalır. Politika, kabul incelemesi ve her talebin tam SHA-256 snapshotı bağlanır. Farklı kişi/kayıt/politika, aynı hedef ders, başka etkin teklif ve karar verilmiş talepler reddedilir. Karar öncesi gerekçeli geri çekme geçmişi korur ve talepleri yeni teklife açar.

Her satırın insan teknik raporu ayrıdır. Komisyon teklifin bütün satırlarını gönderir: tam/kısmi/red tutarları, kanonik kazanım anahtarı, önceki ders kontrolü, gerekçe ve yerel karar referansı zorunludur. Teknik incelemeci, öğrenen, politika hazırlayan karar veremez. İç batch bağlamı yalnız modül içinde üretilir; istemcinin `batch`, `limits` veya benzeri alanları kısıt atlatamaz.

Teklifin kabul edilen kredi ve uzaktan kredi toplamı yerel politikadaki ayrı paydalarla bir kez denetlenir. Her satır, talebin uzaktan ve yüz yüze payını aşamaz: uzaktan kredi yüz yüze olarak yeniden etiketlenemez. Defterde önceki aynı yol kredileri dahil edilir; yeniden kararda eski teklif satırları hariç tutulur. Aynı kazanım, hedef ders veya belge/çıktı çifti ikinci kredi oluşturamaz. Bütün teklif reddedilmişse payda uygulanmaz, kredi yazılmaz. Tek bir satır veya audit hatası bütün kararı ve defter yazımını geri alır.

İtiraz güncel teklif kararına bağlanır; bütün satırların standart itiraz kayıtları aynı işlemde yazılır. Ayrı kalite incelemesi bütün teknik incelemeciler ve karar sahibinden bağımsızdır. Yeniden karar önceki karar ve incelemeciden farklı komisyon görevlisince, bütün satırlar için verilir. Eski kredi satırları atomik terslenir. Tekil satır komutları teklif kararını/itirazını bölemez. OBS her satırın güncel teklif kararına bağlılığını ve bütün teklifin itiraz durumunu denetler; eski mutabık olaylardan ayrı replace/cancel zinciri korunur. Gerçek OBS aktarımı yapılmaz.

Öğrenen kendi teklifini ve kişi özetini görür; IT akademik teklif/karar/kredi alanlarını göremez. Pozitif alan şeması dosya baytlarını, kayıt SHA’larını ve görevli kimliklerini özete eklemez. Geçmiş yeni ekran açılışında kaybolmaz. Komut tekrarlarında güncel MFA/üyelik/yetki kontrolü vardır.

## Kaynak ve uygulanabilirlik sınırı

`RECOGNITION-SOURCE-REVIEW-20261014.md` yeniden okunan birincil kaynakları kaydeder. Yerel yüzde 10/50 değerleri sentetik test politikasındandır. YÖK 10/3 hükmünün ölçü birimini bu kod kendiliğinden AKTS oranı olarak yorumlamaz. Gerçek hedef diploma müfredatı, önceki ders kayıtları, birleştirilmiş eğitimlerin tekil sayımı, karma öğretim ve özel istisnalar için onaylı kurum politikası gerekir. Gazi RPL istisnaları ve önceki ders transferi ayrı yollar olarak kalır; onaylanmamış istisna formülü yoktur.

Bu sürüm gerçek kaynak belgesi yükleme/arşiv, kriptografik dış belge doğrulaması, tebligat, resmî kurul üye sayısı/imzası, diploma kayıt kaynağı, senato politikası veya üretim kalıcı depo kabulü değildir. Çok dersli teklifin tüm satırlarını tekil kredi defteriyle bağlar; gerçek çoktan çoğa müfredat eşdeğerliği ve tek belgedeki örtüşen kazanımların akademik geçerliliğini kanıtlamaz.

## Kanıt

13 yeni sunucu testi;615 sunucu +48 portal +46 regresyon =709. 128 komut/17 HTTP;7321 pozitif örnek ve58568 türetilmiş kapsam denetimi. 11 teklif +12 mevcut tek ders +11 OBS =34 gerçek React/HTTP tarayıcı kontrolü. 390px ekran görüntüsü incelendi; gerçek yardımcı teknoloji veya kurum kullanıcı kabulü değildir. 115 dosyalı korumalı paket;16 teknik tablo/138 kayıt türü. İki SQLite bağlantısında geri çekme/eski karar yarışı ve audit rollback test edildi; dağıtık üretim izolasyonu iddiası yoktur.
