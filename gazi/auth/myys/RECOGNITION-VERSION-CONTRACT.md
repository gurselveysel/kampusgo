# İnsan kararının gördüğü teknik rapor sürümü

Sürüm 2026.10.14.52. Kapsam B21; yalnız izole yerel kabul. Bu bir kurum tanıma kuralı değil, insanın incelediği dayanağın sonradan sessizce değiştirilmesini önleyen veri tutarlılığı sözleşmesidir.

## Komut sözleşmesi

Her yeni `recognition-decide` girdisi `expectedTechnicalId` taşır. Değer karar formunda görülen son teknik raporun kimliğidir; rapor yoksa açık `null` gönderilir. Eksik alan, yanlış kimlik veya başka talebin raporu `technical_version / 409` ile reddedilir. Bu kural arşivli ve arşivsiz taleplerin tamamına uygulanır. Önceden saklanmış karar veya rapor değiştirilmez; eski istemci yeni karar vermeden ekranı yenilemelidir.

`recognition-offer-decide` her satırında ayrı `expectedTechnicalId` ister. Teklifin üst düzeyinde gönderilen kimlik satırların yerine geçmez. Tek bir eski/eksik rapor varsa bütün teklif kararı, kredi ve denetim yazımı geri alınır. Mevcut bağımsızlık, teknik uygunluk, kaynak güveni, çift kredi, limit ve itiraz kontrolleri ayrıca uygulanır.

Olumsuz sıfır kredili karar da insanın gördüğü raporu açıkça belirtir. İmzası kapanmış veya sonuçlanmamış rapor, olumsuz karara dayanak olarak gösterilebilir; bu kontrol olumsuz karara yeni bir geçerli-imza koşulu getirmez. Henüz rapor olmayan talebin olumsuz kararı `null` ile rapor yokluğunu açıkça teyit eder.

## Ekran ve eski form

Tek ders ve çok dersli karar formu rapor sürümünü ve referansını gösterir. Gönderimden önce başka kişi yeni rapor kaydederse eski formun isteği reddedilir; ekran güncel kaydı yeniden okur, eski karar taslağı temizlenir ve insanın yeni dayanağı incelemesi gerekir. Teknik raporun yenilenmesi akademik karar oluşturmaz.

Kaydedilmiş her karar, kendi sabitlediği teknik raporun sürümünü ve referansını gösterir. Öğrenen son teknik raporu, eski raporları ve kararın gerçekten kullandığı raporu birbirinden ayırabilir. Teknik rol için mevcut akademik görünürlük sınırı korunur.

## Yerel kabul

Altı yeni sunucu testi: eksik/yanlış/başka rapor, ikinci SQLite bağlantısında eski olumlu karar, güven kapalı negatif karar, raporsuz açık null, arşivsiz kararın zorunlu sürümü ve teklif satırlarının atomik sürüm denetimi. Mevcut kabul yardımcıları açık rapor kimliği gönderecek biçimde güncellendi; eski kayıtlar yeniden yazılmadı.

İki ayrı Chromium süreci: komisyon ilk raporu görüp formu doldurur; diğer süreçte bilgi işlem ikinci olumlu raporu kaydeder; ilk sürecin kişi kimliği ayrıca doğrulanır; eski form gerçek HTTP409 alır, kredi oluşmaz; güncel raporla yeniden hazırlanmış karar kaydedilir. Öğrenen kararın ikinci rapora dayandığını yeniden yüklemede ve390px/klavye kontrolünde görür. Sonuçlar `acceptance/B21-version-20261014.json` içinde.

Gerçek kurum yetkisi, raporun içeriğinin akademik doğruluğu, durum/çıktı/müfredat kaynağı, üretim deposu ve canlı kabul açık kalır. `configuredCore()` kapalıdır; migration, gerçek veri, yeni credential veya resmî belge işlemi yoktur. B21 ve diğer B01–B36 işleri bu dilimle bütünüyle tamamlandı sayılmaz.
