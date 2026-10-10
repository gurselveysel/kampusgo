# B30 kontrollü grup kabulü — 2026-10-10

Bu model yalnız izole yerel prova yapar. `realActivation:false`, `official:false`; LocalAcceptanceStore ve Vercel kapalı denetimi korunur. Kurumsal rol ataması, gerçek öğrenci grubunun açılması, üretim migration'ı veya resmî karar yoktur.

## Kaynak ve kapsam

Esas ürün kuralı `backlog.json` B30 satırıdır. Temel bağımlılıklar B05, B07, B12, B15, B24, B25, B26, B27, B28 aynen korunur. SEM seçilirse B23; tanıma seçilirse B20/B21; OBS seçilirse ayrıca B22 koşulları eklenir. OBS tanımasız seçilemez. Bu yerel kapıların işaretlenmesi ilgili B paketinin gerçek kurum/dış kabulünü tamamlamaz. Kuruma ait okunmamış hüküm veya süre otomatikleştirilmedi.

## Kayıt ve görevler

- Tek program sürümünde 1–50 etkin yerel öğrenen kaydı, inceleme tarihi ve hizmet yolları değişmez plan oluşturur. Başka program/birim/kurum kaydı ve yinelenen üye reddedilir. Sayısal sınır bu provanın teknik sınırıdır; kurum kontenjanı değildir.
- Her temel/koşullu kapı kendi görev yetkisiyle, yerel kanıt referansı ve gerekçesiyle kaydedilir. Eski sürüm korunur. Referans alanı kanıtın gerçekliğini bağımsız doğrulamış sayılmaz.
- Teknik (BT), akademik (komisyon), işletim (kalite) incelemeleri ayrı kişilere aittir. Planı hazırlayan veya seçilen öğrenen kendi açılış incelemesini kabul edemez. Tek kişi çoklu role sahip olsa da üç onayı veremez.
- Açılış öncesinde kapılar, sıfır açık kritik hata, etkin üyelikler, güncel inceleme tarihi ve her seçili kayıtta kanıt → değerlendirme → kullanılabilir insan kararı → güncel imzalı yerel belge denetlenir. Tanıma seçildiyse etkin kredi; OBS seçildiyse o krediyle bağlı yerel mutabakat da gerekir. Kapı metni tek başına eksik zinciri tamamlayamaz. Merkezi SEM, ayrı kabul ve belge yolu bağlanmadan bu yerel mikro belge zinciriyle açılamaz.
- Kapı, hata veya kayıt zinciri sürümü değişince eski üç inceleme güncel sayılmaz. Yeni kritik hata yerel durumu bekletir; çözüm bağımsız BT/kalite kişisi gerektirir ve eski onayları yeniden geçerli kılmaz. Üyeliğin güncel etkinliği her görüntüleme/işlemde kontrol edilir; bu bir dış aktivasyon işlemi değil, mevcut yerel provanın güncel uygunluk görünümüdür.
- Yerel açılış kaydı gerçek kohort açmaz. Dönem değerlendirmesi kaynaklardan üye/tamamlanmış zincir/kritik hata sayısını sabitler, gerekçe ve sonraki inceleme tarihi taşır. Gerçek 4–6 hafta gözlem tamamlandı bayrağı false kalır.
- Bekletme üç incelemenin yenilenmesini gerektirir. Kapanış salt okunurdur; koşul/inceleme/bulgu formları kaldırılır, geçmiş incelemeler görünür kalır. Kapanıştan sonra açılış veya değerlendirmeyle yeniden açma reddedilir. Yeni kapsam için yeni plan gerekir. Dönem kayıtları önceki değerlendirme kimliğiyle çakışma denetimine tabidir.
- Teknik rolde kişi/enrollment kimlikleri ve kanıt içerikleri verilmez; sayılar ve görev kapsamındaki yerel incelemeler görünür. Diğer öğrenen grup inceleme ekranını göremez. Yazım/audit tek transaction'dır.

## Kabul kanıtı ve açık işler

10 yeni sunucu senaryosu; 12 izole tarayıcı kontrolü. Üç ayrı görev, dokuz temel kapı, kaynak zinciri, kritik hata/çözüm, yeniden inceleme, dönem/kapanış ve 390 px görünüm geçti. B30 kod ve yerel kabul kısmi; gerçek yetkili öğrenen/öğretici/admin akışlarının kurum ortamında tamamlanması, seçilen koşullu yolların gerçek kabulü, kritik hata sıfır kabul tutanağı ve gerçek dönem gözlemi açık. Gerçek üretim aktivasyon adaptörü veya kurum imzası bu prova tarafından üretilemez.
