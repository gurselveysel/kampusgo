# Akıllı yeterlilik eşleme — kabul sözleşmesi

Bu belge, Türkçe öğrenme çıktılarının TYÇ ve AYÇ/EQF tanımlayıcılarıyla eşlenmesi için kontrollü pilot kabul ölçütlerini tanımlar. Sistem bir akademik karar motoru değildir; açıklanabilir aday eşlemeler üretir, seçim ve değişiklik yetkisini eğiticide bırakır ve inceleme rollerine salt-okunur görünüm sağlar.

## Kabul ölçütleri

| Kimlik | Kabul ölçütü | Otomatik kanıt |
| --- | --- | --- |
| AKIL-01 | TYÇ ve AYÇ/EQF için 1–8 seviyenin her birinde üç boyutun tanımlayıcısı bulunur; hiçbir öneri bu katalog dışına çıkmaz. | Domain sözleşmesi |
| AKIL-02 | Her Türkçe öğrenme çıktısında ölçülebilir eylemden türetilen kanonik boyut sinyali iki çerçevede ortak olabilir; TYÇ ve AYÇ/EQF seviyesi, resmî tanımlayıcısı ve puanı çerçeveye özgü metinlerle ayrı hesaplanır ve eşitliğe zorlanmaz. | Domain + tarayıcı QA |
| AKIL-03 | Her aday öneri 0–100 arası skor, eşleşen sinyaller ve insanın anlayabileceği bir gerekçe taşır. | Domain + tarayıcı QA |
| AKIL-04 | Her çıktı için ölçülebilir öğrenme düzeyi/eylem, ders içeriği, ölçme-değerlendirme yöntemi ve kanıt önerisi üretilir. | Domain + tarayıcı QA |
| AKIL-05 | Çoklu çıktıda program düzeyi kapsama özeti üretilir; çıktı bazlı analiz kaybolmaz ve kapsam eksikleri görünür kalır. | Domain + tarayıcı QA |
| AKIL-06 | Eğitici öneriyi seçebilir veya gerekçeli manuel seviye/boyut değişikliği yapabilir; seçim ve değişiklik yalnız aynı sıralı öğrenme çıktısı fingerprint'i için yeniden yükleme sonrasında korunur. Metin veya sıra değişikliğinde eski seçim geçersizleşir. | Tarayıcı QA |
| AKIL-07 | Yalnız üniversite içi ve kurum dışı eğitici mutasyon yapabilir. Koordinatörlük, Komisyon ve sistem yöneticisi salt-okunurdur. | Domain + tarayıcı QA |
| AKIL-08 | Boş, yalnız boşluk içeren, ölçülemeyen, 40 adedi veya çıktı başına 600 karakteri aşan ya da analiz hatasına düşen girdi kalite kapısında reddedilir; başvuru, program, taslak veya audit mutasyonu üretmez ve eski raporu temizler. | Domain + tarayıcı QA |
| AKIL-09 | 1440, 1024, 768 ve 390 px genişliklerde analiz, öneri, seçim ve kapsama alanı yatay sayfa taşması oluşturmadan kullanılabilir. | Tarayıcı QA |
| AKIL-10 | Arayüz ve kayıtlar öneriyi “nihai karar”, “otomatik onay” veya “resmî yerleştirme” olarak sunmaz; kurumsal doğrulama ve yetkili kurul sınırı görünürdür. | Kaynak sözleşmesi + tarayıcı QA |

## Temsilî Türkçe çıktı seti

Kabul testleri, farklı bilişsel eylemleri ayırmak için en az şu örnekleri kullanır:

1. **Bilgi:** “Alanındaki ileri kuramsal ve olgusal bilgiyi sorgulayıcı bir bakışla açıklar.”
2. **Beceri:** “Karmaşık ve öngörülemeyen bir veri problemini eleştirel olarak analiz eder ve kanıta dayalı yenilikçi çözüm tasarlar.”
3. **Yetkinlik:** “Öngörülemeyen çalışma ortamında karmaşık projeleri yönetir ve ekiplerin mesleki gelişim sorumluluğunu üstlenir.”

Bu örneklerde beklenen sonuç tek bir değişmez seviye kararı değil; her iki çerçevede geçerli bir seviye/boyut, açıklanabilir sıralama ve seçilebilir öneridir. Heuristik değişse bile kabul testi resmî 1–8 sınırını, boyut ayrımını, açıklamayı ve kullanıcı kontrolünü korur.

## DOM kabul işaretleri

Tarayıcı QA aşağıdaki kararlı işaretleri kullanır:

- `#smart-alignment-form`
- `[data-smart-outcome]`
- `[data-action="reanalyze-smart-suggestions"]`
- `[data-smart-suggestion]`
- `[data-action="apply-smart-suggestion"]`
- `[data-smart-framework="TYC"]` ve `[data-smart-framework="EQF"]`
- `[data-smart-coverage]`
- `[data-smart-override]`

Öneri kartları çıktı, çerçeve, seviye, boyut ve skor bilgisini `data-outcome-index`, `data-framework`, `data-level`, `data-dimension` ve `data-score` alanlarında taşır. Bu alanlar yalnız test kolaylığı için değil, erişilebilir arayüz ile veri sözleşmesinin aynı sonucu sunduğunu doğrulamak içindir.

## Pilot güvenlik sınırı

- Öneri, seçim veya manuel değişiklik **resmî TYÇ yerleştirmesi değildir**.
- Nihai akademik karar yetkili kurulundur.
- Gerçek öğrenci/personel verisi, canlı kurum servisi veya otomatik dış aktarım kullanılmaz.
- Skor, güven olasılığı gibi sunulmaz; açıklanabilir bir pilot eşleşme puanıdır.
