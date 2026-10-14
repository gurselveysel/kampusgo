# Koşullu mali işlem provası

14.10.2026 · Yazılım Paketi33 · B31 · Profil `local-simulator/1`.

## İşletim sınırı

Bu profil yalnız `LocalAcceptanceStore` ile izole sentetik kabul içindir. Vercel ve `configuredCore()` etkinleştirilmez. Gerçek PSP seçilmedi, hesabı/anahtarı/SDK'sı/ödeme sayfası/webhook bağlantısı kurulmadı. Kart, CVC, banka hesabı ve gerçek ödeme alınmaz; vergi hesaplanmaz, fatura veya resmî tahsilat belgesi üretilmez. Bu sınır uygulama kodunda `collectionAuthorized:false`, `providerConnected:false`, `externalSubmitted:false` ile açık kalır. Belirteç bir yerel tekil işlem referansıdır; gerçek kart tokenizasyonu veya sağlayıcı ödeme yetkisi değildir.

B31 özgün kabulü korunur: “Tahsilat yetkisi, vergi/iade şartı açık; PSP token akışı; başarılı/çift/bekleyen ödeme, iade ve ters ibraz mutabakatı geçti.” Aşağıdaki yerel kabul gerçek tahsilat yetkisi/vergi/iade kararı veya gerçek PSP kabulü yerine geçmez. B02/B04/B05 kurumsal bağımlılıkları açık kalır.

## Kişi ve program ile tutarlı arayüz

Mevcut Finans ve mutabakat menüsü ve tarayıcı örnek kuyruğu korunur. Buradan `#/academic/payments` Mali prova ve mutabakat sekmesine açık bağlantı vardır. Yeni kayıtlar sunucudaki aynı kişi/birim/program kaydına bağlıdır; eski örnek kuyrukla bir gerçek banka defteri oluşturulduğu iddia edilmez.

1. Yönetici, yayımlanmış program sürümünü seçer. Aynı birimde ayrı kişi tarafından incelenmiş yetki, veri akışı ve içerik hakkı sicillerini bağlar; tutar, tahsilat/vergi/iade kapsamı, kaynak sürümü/tarihi/okunan kapsam ve geçerlilik sonunu yazar.
2. Hazırlayandan ayrı mali işler kişisi kabul/reddetme incelemesi yapar. Yeni sürüm eski sürüme ve değişiklik gerekçesine bağlıdır. Yeni taslak, durdurma veya süre sonu yeni ödeme provası açmayı engeller. Üç sicilin tam özetleri ve inceleme özetleri sabittir; bunlar hukuki yetki kanıtı değildir.
3. Öğrenen yalnız kendi program kaydı için gerçek ödeme yapılmadığını teyit ederek tekil prova oluşturur. Tutar/para birimi kişi girdisinden alınmaz; incelenmiş mali koşuldan bağlanır. Aynı program kaydının farklı komut/depo bağlantısı üzerinden tekrarı mevcut sipariş/belirteci döndürür. Yeni mali koşul eski tutarı değiştirmez.
4. Bilgi işlem rolü açıkça etiketlenmiş yerel sağlayıcı simülatöründe sonuç oluşturur. Mali işler iade talebi ve bağımsız mutabakat yürütür. İki görevi olan kişi kendi sağlayıcı olayının mutabakatını onaylayamaz. Gerçek sağlayıcıdan doğrulanmış bildirim yoktur.
5. Öğrenen kendi kaydını, mali işler/bilgi işlem yetkili birim kayıtlarını arar, durumla filtreler, olay/inceleme geçmişini açar ve yetkili kişisel JSON kopyasını indirir. Diğer öğrenen, eğitici, komisyon veya kalite rolüne bu mali kişi kaydı açılmaz. Sunum profili yetki sağlamaz.

## Sürüm, tekrar ve tutar sözleşmesi

Para birimi yalnız bu yerel profil için TRY, tutarlar tam sayı kuruştur (1–100.000.000). Ondalık kayan noktalı tutar, bilinmeyen ödeme alanı, farklı para birimi, yanlış belirteç veya başka sipariş referansı reddedilir. Bu üst sınır kurumun tahsilat limiti değildir.

| Olay | Yerel sonuç |
|---|---|
| Belirteç hazır / bekliyor | Başarılı ödeme tutarı sıfır; nihai eşleşti mutabakatı kapalı |
| Başarılı / başarısız | Aynı belirteçte geçerli ilk sonuç; çelişen sonradan başarı otomatik kabul edilmez |
| İade talebi / bekliyor | Tutar kalan bakiyeden ayrılır; kesin iade sayılmaz |
| İade başarılı | Ayrılan tutar iade toplamına geçer |
| İade başarısız / geri döndü | Uygun önceki duruma bağlı olarak ayrılan veya iade edilmiş tutar geri çözülür |
| Ters ibraz açıldı | İnceleme tutarı ayrılır; nihai mutabakat bekler |
| Ters ibraz kaybedildi / kazanıldı | Ayrılan tutar kayıp toplamına geçer veya serbest bırakılır |
| Kaybedilmiş ters ibraz geri döndü | Aynı inceleme tutarı yeniden kullanılabilir olur |

Kalan tutar = başarılı ödeme − iade edilen − bekleyen iadeler − incelemedeki ters ibraz − kaybedilen ters ibraz. Yeni iade/ters ibraz bu bakiyeyi aşamaz. Gerçek sağlayıcıda aşan/çakışan olay, kısmi capture, yeniden tahsilat, ikinci ters ibraz veya düzeltme varsa bu sınırlı profilden otomatik sonuç çıkarılmaz; gerçek adaptörde ayrı istisna/mutabakat kuralı gerekir. Başarısız ödeme için kendiliğinden yeni tahsilat başlatılmaz.

Komut kimliği ve sağlayıcı olay kimliği ayrıdır. Aynı sağlayıcı olayının değişen içeriği reddedilir; aynı işlem/türün farklı olay kimliğiyle tekrarı ikinci tutar doğurmaz. Tekrarın ikinci kimliği de makbuz kaydıyla bağlanır; daha sonra farklı amaçla kullanılamaz. Makbuz, mali olay, tekil komut ve denetim kaydı tek atomik işlemde yazılır. Geçersiz sıra/beklenen sürüm reddedilir; otomatik yeniden sıralama veya gerçek sağlayıcı kuyruğu olduğu iddia edilmez. `providerSequence` yalnız yerel simülatörün ürettiği sıradır, bir PSP'nin teslim garantisi değildir. Saat mali tarihçenin gerisine gidemez.

İade, ters ibraz ve ödeme işlemleri öğrenme kanıtı/puan/akademik karar/belge/kredi kaydı yazmaz. Para ödemek başarı sağlamaz; ödeme iadesi veya ters ibraz akademik belgeyi kendiliğinden iptal etmez.

## Mutabakat

Mali işler geçerli revizyon ve tam dayanak özeti üzerinden altı tutarı karşılaştırır. Bekleyen sonuç varsa `pending`; bütün tutarlar eşleşip bekleyen kalmamışsa `matched`; tutar farkı varsa `difference` kaydedilir. Durum ve tutar çelişkisi reddedilir. Yeni mali olay/istek eski mutabakatı güncel olmaktan çıkarır; aynı dayanakta son inceleme güncel gösterilir, önceki yanlış/farklı inceleme silinmez. Bu yalnız yerel brüt işlem mutabakatıdır; banka ekstresi, settlement, komisyon, kur veya muhasebe/vergi kesin kaydı değildir.

## Resmî teknik kaynak incelemesi

Erişim14.10.2026. Bunlar örnek sağlayıcı davranışlarıdır; Gazi'nin sağlayıcı seçimi veya Türkiye'de kullanılabilirlik/tahsilat yetkisi sonucu çıkarılmaz. Kaynaklarda sabit belge sürümü yazmayan sayfalar erişim tarihiyle kayıtlıdır; uygulanan yerel profil ayrı `/1` sürümüdür.

| Kaynak | Okunan kapsam ve çıkarılan tasarım sınırı |
|---|---|
| [Stripe webhooks](https://docs.stripe.com/webhooks) | İmza/ham gövde, olay sırasının garanti edilmemesi, olay kimliği ve işlem/tür bazlı tekrarlar. Zaman damgası tek başına tekrar/sıra anahtarı değildir. Stripe normalizer/SDK bu projeye kurulmadı. |
| [Adyen olay işleme](https://docs.adyen.com/development-resources/webhooks/handle-webhook-events) | Aynı olay kodu/PSP referansı tekrarında başka alanlar farklı olabilir. Bu sağlayıcıya özgü normalizasyon gerekir; bütün PSP'lere tek ham JSON eşitliği kuralı uygulanamaz. |
| [Adyen iade](https://docs.adyen.com/online-payments/refund) | İade bildirimi sonrasında başarısızlık/geri dönüş olabilmesi ve iade/ters ibrazın ortak kalan bakiyeye etkisi. Yerel model gecikmiş düzeltmeyi ayrı olay olarak korur; gerçek bildirim kodlarına birebir uyumluluk iddiası yoktur. |

Vergi oranı, iade süresi, ücret/tahsilat yetkisi, tüketici usulü veya döner sermaye kararı bu teknik sayfalardan çıkarılmadı. Kurumun gerçek mali dayanak belgeleri ve PSP sözleşmesi okunmuş/onaylanmış değildir. Kaynak kaydı gerçek kişi verisi içermez.

## Kabul ve kalanlar

`myys-payment.test.mjs`13yeni test; `myys-payment-browser.cjs`16gerçek portal kontrolü. Kısmi/tam iade, sonradan iade hatası/geri dönüşü, ters ibraz kazanımı/kaybı/geri dönüşü, eşzamanlılık iddiası olmadan iki SQLite bağlantısından tekrar, kimlik/rol/MFA/birim ve değişmez akademik kayıt sınırı sınandı. Mobil390px, arama/filtre, geçmiş ve gerçek JSON indirme kontrol edildi. Ekran okuyucu ve gerçek banka/PSP dağıtık kabulü değildir.

Gerçek sağlayıcı seçilince imzalı olay normalizer'ı, sağlayıcıya özgü token/checkout, anahtar saklama, teslim/kuyruk sırası, rate-limit, istisna/settlement/komisyon/kur ve gerçek PSP sandbox kabulü gerekir. Yetkili tahsilat/vergi/iade kararı, B02/B04/B05 kararları ve veri saklama/aktarım incelemesi tamamlanmadan gerçek hizmet kapalı kalır. Yeni credential, ücretli hizmet veya üretim migration'ı oluşturulmadı. B31'in tamamı kapanmadı.
