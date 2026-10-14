# Dış belge — insan incelemesi, karar ve aktarım bağı

Sürüm: 2026.10.14.50. Kapsam: B21/B22, yalnız izole yerel kabul. Bu sözleşme kurumun tanıma usulü veya otomatik belge durum doğrulaması değildir. Kaynak kabulü ve sınırlı imza profili `EXTERNAL-CREDENTIAL-CONTRACT.md`; gerçek kurum kuralları ve açık yorumlar `RECOGNITION-SOURCE-REVIEW-20261014.md` içinde ayrıdır.

## Tek işlem zinciri

Arşivli talebin olumlu teknik raporu, aynı dosyanın güncel imza/kişi makbuzunun kimliğini ve tam kayıt özetini sabitler. Bilgi işlem ayrıca iptal/askı durumunu insan olarak inceleyip kaynak referansı verir. Makbuz tek başına bu insan teyidini, teknik kabulü veya krediyi üretmez. İnsan teyidi `automated:false` olarak açıkça tutulur; gerçek bir durum servisinin yanıtı gibi sunulmaz.

Teknik raporlar değişmez sürümlerdir. Yeni sürüm güncel önceki rapor kimliği ve değişiklik gerekçesi ister; eski açık form reddedilir. Önceki kayıtlar, kararların sabitlediği teknik rapor kimlikleri ve kredi geçmişi korunur. Önceden arşivsiz elle incelenmiş yerel talepler eski yöntemlerini korur; kriptografik doğrulanmış olarak yeniden etiketlenmez.

Pozitif akademik karar güncel olumlu teknik rapora ve varsa güncel dosya/makbuz/güven bağına dayanır. Teknik görevli, öğrenen, politika hazırlayan ve akademik karar sahibinin görevler ayrılığı sürer. Yeniden karar ayrıca mevcut itiraz/bağımsız inceleme zincirini gerektirir.

## Kapanış ve düzeltme

- Yeni teknik sürüm eski kararı kendiliğinden yenilemez. Etkin kredi geçmişte durur; yeni karar verilene kadar aktarımda bekler.
- İmza süresi, güven sürümü veya anahtar kullanımı kapanırsa yeni pozitif karar ve OBS hazırlığı/alındı kullanımı kapanır. Aynı kontrol enjekte edilen çekirdek saatiyle hem komutta hem ekranda uygulanır.
- Çok dersli teklifte bir satırın bağlı belge güveni kapanırsa bütün teklifin yeni aktarımı bekler.
- Önceden mutabık olayın geçmiş sonucu değiştirilmez. Henüz mutabık olmayan alındı güncel kaynak kapalıysa `source-blocked` olur.
- Yeni bağımsız sıfır kredili olumsuz karar, önceki krediyi açık ters kayıtla kapatır. Bunun OBS iptal düzeltmesi, artık kullanılmayan belgenin geçerli imzasını şart koşmaz. Anahtarın kapanması kendi başına kredi iptali değildir.

## Görünürlük ve kabul

Tanıma ve kredi ekranı son teknik raporu, önceki sürümleri, insan durum kaynağını, karar geçmişini ve belge incelemesi nedeniyle bekletmeyi gösterir. Aktarım ve mutabakat ekranı aynı bekletme nedenini gösterir. Kişi özeti sürüm bağlarını ve insan teyidini içerir; makbuzun iç SHA değerini ve görevlinin kimliğini açmaz. Yalnız teknik rolde akademik karar/teklif ayrıntıları açılmaz.

`myys-recognition-review.test.mjs`: gerçek imzalı arşiv, makbuz/kişi bağı, rapor sürümü, iki SQLite bağlantısında eski form, süre/anahtar kapanışı, atomik audit geri alma, grup bekletme, yeniden karar, OBS düzeltme/iptal ve kişi özeti. `myys-recognition-review-browser.cjs`: yapılı portalda insan incelemesi → tam karar → mutabakat → rapor yenileme → itiraz → kısmi karar → düzeltme → anahtar kapanışı → itiraz → red → iptal; 390 px ve klavye/başka kişi kontrolü. Ayrıntılı sayılar kabul JSON'undadır.

## Açık koşullar

Gerçek düzenleyici/kişi eşlemesi, otomatik durum/schema profili, bağımsız genel VC uyumluluğu, gerçek önceki ders/müfredat/kurul dayanağı, üretim arşivi/işçisi ve OBS transkript veya diploma eki mutabakatı açık. Aynı belge yeniden imzalanıp baytları değiştiğinde kanonik belge/çıktı kimliğine dayalı çift kredi koruması ayrıca güçlendirilecek. Mevcut dosya özeti, hedef ders ve insan kazanım anahtarı kontrolü bu boşluğu tek başına kapatmaz.

`configuredCore()` kapalıdır. Yeni kurum bağlantısı, migration, gerçek belge/rozet, gerçek para veya canlı veri işlemi yapılmaz. Yerel kabul kurum yetkisi veya canlı doğrulama değildir.
