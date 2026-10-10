# OBS aktarım sözleşmesi — izole yerel prova

Sürüm: local-obs/1 · 10.10.2026. GUZEM/OBS sağlayıcı şeması değildir.

## Açık kalan dış kabul

Gerçek OBS teknik şeması, test ortamı, kişi/ders anahtarları, hata sözleşmesi, yazma izni ve transkript/diploma eki mutabakatı sağlanmadı. Bu modül ağ çağrısı yapmaz. Gönderildi veya kurum kaydı oluştu durumuna geçmez. `obs-simulate` yalnız LocalAcceptanceStore ile ve Vercel işaretleri yoksa çalışır; varsayılan kurumsal çekirdek zaten kapalıdır.

## Yerel davranış

- Öğrenci işleri yalnız bekletilmeyen, insan kararlı tekil kredi kaydından hazırlık üretir. Aynı kredi aynı olay kimliğine döner; yetki ve güncellik tekrar denetlenir.
- Değişmez payload: kurum/birim, kişi, hedef program/ders, kredi, karar/politika/kredi kimliği, varsa önceki olay ve içerik hash'i. Teknik görünüm kişiyi, karar ayrıntısını ve krediyi göstermez.
- Bilgi işlem yalnız LOCAL- ile başlayan yerel alındı örneği kaydeder. Aynı referans farklı içerikle kullanılamaz. Red, içerik uyuşmazlığı ve kaynak kararı bekletme ayrı sonuçlardır.
- Alındı ile mutabakat ayrıdır. Öğrenci işleri karşılaştırmayı kaydeder. Bu yerel mutabakat gerçek OBS kaydı kanıtı değildir.
- İnsan kararı değiştiğinde son mutabık olaya bağlı düzeltme/iptal hazırlanır. Eski kredi ve alındılar silinmez. Yeni hazırlık yoluyla düzeltme zinciri atlanamaz; eskimiş bekleyen düzeltme alındı kabul etmez.
- Kaynak karar veya itiraz hazırlık/alındı/mutabakat arasında değişirse her aşama mevcut durumu denetler. Tarihsel eşleşme kaydı geriye dönük başarı sayısını veya güncel uygunluğu değiştirmez.
- CSV raporu Türkçe, UTF-8 ve formül enjeksiyonuna karşı korumalıdır; her satır gerçek aktarım olmadığını taşır.

Dayanak: B22 kabul ölçütü ve mevcut atomik yerel işlem sözleşmesi; RFC 9110 idempotent işlem ayrımı EVENT-CONTRACT.md içinde kaynaklıdır. Sağlayıcıya özgü madde veya API yolu uydurulmadı.
