# Akıllı yeterlilik eşleme — kabul sözleşmesi

Bu belge, Türkçe öğrenme çıktılarının TYÇ, AYÇ/EQF ve yükseköğretime özgü TYYÇ katmanıyla ayrı ayrı eşlenmesi için kontrollü pilot kabul ölçütlerini tanımlar. Sistem bir akademik karar motoru değildir; açıklanabilir aday eşlemeler üretir, seçim ve değişiklik yetkisini eğiticide bırakır ve inceleme rollerine salt-okunur görünüm sağlar. TYYÇ sonuçları YÖK/MYK form siciline dayalı, verbatim olmayan advisory özetlerdir.

## Kabul ölçütleri

| Kimlik | Kabul ölçütü | Otomatik kanıt |
| --- | --- | --- |
| AKIL-01 | TYÇ ve AYÇ/EQF için 1–8; TYYÇ için 5–8 seviyelerinde üç boyut bulunur. TYYÇ ayrıca altı resmî yeterlilik türü form sicil kaydını aday olarak gösterir; hiçbir öneri çerçeve aralığı dışına çıkmaz. | Domain sözleşmesi |
| AKIL-02 | Her Türkçe öğrenme çıktısında ölçülebilir eylemden türetilen kanonik boyut sinyali ortak olabilir; TYÇ, AYÇ/EQF ve TYYÇ seviyesi, tanımlayıcı/operational özeti ve puanı ayrı hesaplanır ve eşitliğe zorlanmaz. | Domain + tarayıcı QA |
| AKIL-03 | Her aday öneri 0–100 arası skor, eşleşen sinyaller ve insanın anlayabileceği bir gerekçe taşır. | Domain + tarayıcı QA |
| AKIL-04 | Her çıktı için ölçülebilir öğrenme düzeyi/eylem, ders içeriği, ölçme-değerlendirme yöntemi ve kanıt önerisi üretilir. | Domain + tarayıcı QA |
| AKIL-05 | Çoklu çıktıda program düzeyi kapsama özeti üretilir; çıktı bazlı analiz kaybolmaz ve kapsam eksikleri görünür kalır. | Domain + tarayıcı QA |
| AKIL-06 | Eğitici öneriyi seçebilir veya gerekçeli manuel seviye/boyut değişikliği yapabilir; seçim ve değişiklik yalnız aynı sıralı öğrenme çıktısı fingerprint'i için yeniden yükleme sonrasında korunur. Metin veya sıra değişikliğinde eski seçim geçersizleşir. | Tarayıcı QA |
| AKIL-07 | Yalnız üniversite içi ve kurum dışı eğitici mutasyon yapabilir. Koordinatörlük, Komisyon ve sistem yöneticisi salt-okunurdur. | Domain + tarayıcı QA |
| AKIL-08 | Boş, yalnız boşluk içeren, ölçülemeyen, 40 adedi veya çıktı başına 600 karakteri aşan ya da analiz hatasına düşen girdi kalite kapısında reddedilir; başvuru, program, taslak veya audit mutasyonu üretmez ve eski raporu temizler. | Domain + tarayıcı QA |
| AKIL-09 | 1440, 1024, 768 ve 390 px genişliklerde analiz, öneri, seçim ve kapsama alanı yatay sayfa taşması oluşturmadan kullanılabilir. | Tarayıcı QA |
| AKIL-10 | Arayüz ve kayıtlar öneriyi “nihai karar”, “otomatik onay”, “resmî yerleştirme”, “eşdeğerlik”, “akreditasyon” veya “logo hakkı” olarak sunmaz; kurumsal doğrulama ve yetkili kurul sınırı görünürdür. | Kaynak sözleşmesi + tarayıcı QA |
| AKIL-11 | Program özeti, altı çıktı önerisi, eğitici override'ı, ayrı insan kurul kararı ve constructive-alignment zinciri aynı directive program/version omurgasına composite FK ile bağlıdır. | Migration + DTO sözleşmesi |
| AKIL-12 | Uygulama v15 tam öneri raporunu kaynak/referans sürümleri, seçim bağlamı ve bütünlük hash'iyle değişmez snapshot olarak saklar; tarihsel kanıt güncel motorla yeniden hesaplanmaz. | Domain + tarayıcı QA |

## Temsilî Türkçe çıktı seti

Kabul testleri, farklı bilişsel eylemleri ayırmak için en az şu örnekleri kullanır:

1. **Bilgi:** “Alanındaki ileri kuramsal ve olgusal bilgiyi sorgulayıcı bir bakışla açıklar.”
2. **Beceri:** “Karmaşık ve öngörülemeyen bir veri problemini eleştirel olarak analiz eder ve kanıta dayalı yenilikçi çözüm tasarlar.”
3. **Yetkinlik:** “Öngörülemeyen çalışma ortamında karmaşık projeleri yönetir ve ekiplerin mesleki gelişim sorumluluğunu üstlenir.”

Bu örneklerde beklenen sonuç tek bir değişmez seviye kararı değil; üç katmanda geçerli bir seviye/boyut, açıklanabilir sıralama ve seçilebilir öneridir. Heuristik değişse bile kabul testi TYÇ/AYÇ 1–8 ve TYYÇ 5–8 sınırını, boyut ayrımını, açıklamayı ve kullanıcı kontrolünü korur.

## DOM kabul işaretleri

Tarayıcı QA aşağıdaki kararlı işaretleri kullanır:

- `#smart-alignment-form`
- `[data-smart-outcome]`
- `[data-action="reanalyze-smart-suggestions"]`
- `[data-smart-suggestion]`
- `[data-action="apply-smart-suggestion"]`
- `[data-smart-framework="TYC"]`, `[data-smart-framework="EQF"]` ve `[data-smart-framework="TYYC"]`
- `[data-smart-coverage]`
- `[data-smart-override]`

Öneri kartları çıktı, çerçeve, seviye, boyut ve skor bilgisini `data-outcome-index`, `data-framework`, `data-level`, `data-dimension` ve `data-score` alanlarında taşır. Bu alanlar yalnız test kolaylığı için değil, erişilebilir arayüz ile veri sözleşmesinin aynı sonucu sunduğunu doğrulamak içindir.

## Pilot güvenlik sınırı

- Öneri, seçim veya manuel değişiklik **resmî TYÇ yerleştirmesi değildir**.
- Nihai akademik karar yetkili kurulundur.
- Gerçek öğrenci/personel verisi, canlı kurum servisi veya otomatik dış aktarım kullanılmaz.
- Skor, güven olasılığı gibi sunulmaz; açıklanabilir bir pilot eşleşme puanıdır.

## Doğrulanmış kabul kanıtı

- Yerel akıllı eşleme sözleşmesi: **12/12 PASS**; TYÇ + AYÇ/EQF + TYYÇ, değişmez snapshot, RBAC ve insan karar sınırı.
- Canlı Supabase: toplam **15 migration**; v15 omurgasını tamamlayan sürümler `20260820113725`, `20260820114057`, `20260820123559`, `20260820123602` ve `20260820124546`. Yönerge kapsamında 34 FORCE RLS tablo, 15 `security_invoker` görünüm, 27 resmî kaynak/33 bağlantı ve dokuz tam kapsamlı rol DTO'su doğrulandı. Anonim yüzey yalnız 2 kaynak tablosu + 2 kamu görünümüdür; korumalı okuma ve anonim yazma yoktur. Security advisor 0, indekslenmemiş yabancı anahtar 0, yalnız 96 INFO kaydı vardır.
- GitHub: [v15 kod/QA düzeltmesi `1dd8dd6`](https://github.com/gurselveysel/kampusgo/commit/1dd8dd699992cf06463d9feeff522cb8a1a3d1cb) ve [final workflow `b966813`](https://github.com/gurselveysel/kampusgo/commit/b966813d1d6fb154eea209ff70e28c5b6a6b43ba).
- Vercel exact Preview: [`dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`](https://kdpu-myys-mockup-roliiwx2o-info-64116029s-projects.vercel.app/pilot.html), **READY**, `target: null`, alias `[]`.
- Tarayıcı QA: [run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382), job `96447182122`, artifact `9409045414`; 9 rol × 4 viewport = 36/36 bileşim, 0 hata. Kanıt paketi 3.755.151 bayt, SHA-256 `3cd1ee779d14fa68696f4c7885ada3a4a1a04cb915e957cd51e779fc153f3b8c`.
- Özel custom-domain alias bu çalışmada güncellenmemiştir ve final exact Preview değildir. Production kesin **NO-GO**'dur.
