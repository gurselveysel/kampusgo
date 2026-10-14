# B33 — Sürümlü beceri eşlemesi, inceleme ve düzeltme

Sürüm 2026.10.14.35; yalnız izole yerel kabul. B33'ün özgün ölçütü ve B09/B29 bağımlılıkları korunur. Gerçek taksonomi lisansı, akademik uzman görevlendirmesi veya kurum kabulü bu kayıtlarla oluşmaz.

## Aynı kayıt zincirinden görünüm

Mevcut **Beceri ilişkileri** sekmesi programın Öğrenme Çıktıları, kayıt sahibi, görev/kanıt, insan değerlendirmesi ve güncel kullanılabilir akademik karar üzerinden çalışır. Hedeflenen, gelişen ve insan değerlendirmesiyle ilişkili durumlar korunur. Ayrı taksonomi ilişkileri bunlara bağlanır; incelenmiş kullanılabilir ilişki ve uygun insan kararı varsa “Yerel kanıtla ilişkili” gösterilir. İtirazla karar kullanıma kapanırsa bu gösterge gelişen duruma döner. Ders tamamlanma işareti, model önerisi veya dış beceri etiketi tek başına başarı kararı değildir. `expertTaxonomyApproved` kurumsal anlamda false kalır.

## Hazırlık ve dayanak

MFA'lı birim koordinatörü yayımlanmış program sürümünde bir ile yüz ilişki hazırlar. Her satır sabit satır kimliği, programın Öğrenme Çıktısı kimliği, kavramın HTTPS adresi, Türkçe/özgün adı ve gerekçe içerir. Aynı çıktı çok kavrama; aynı kavram çok çıktıya bağlanabilir. Aynı çıktı/kavram çifti tekrarlanamaz; aynı kavram kimliğinin adları sürüm içinde tutarlı olmalıdır. İlişki `related` düzeyindedir; tam eşdeğerlik, meslek yeterliliği veya kredi tanınması iddiası üretmez.

Kaynak adı/adresi/sürümü/tarihi/özgün dili/okunan kapsamı, kullanım-lisans ve Türkçe aktarım dayanağı zorunludur. Kaynağın okunduğu açıkça teyit edilir. Aynı birimde ayrı kişilerce hazırlanıp incelenmiş içerik hakkı ve kurum yetkisi sicilleri bağlanır; kayıt ve inceleme özetleri sabitlenir. İçerik hakkı sicilinin `sourceReference` alanı tam kaynak adresiyle, görevlendirme referansı yetki sicilinin `authorityReference` alanıyla eşleşir. Erişilebilir kaynak tek başına açık lisans veya çeviri yetkisi olarak kullanılmaz. En çok 366 günlük açık yerel son tarih gerekir.

Program/eşleme hazırlayan kişiden farklı, aynı birimde etkin komisyon görevi bulunan kişi açıkça incelemeci seçilir. Bu yerel iş akışı atamasıdır; kişinin gerçek akademik uzmanlığını veya kurumca görevlendirildiğini doğrulamaz. `expertAuthorityVerified` ve `externalTaxonomyVerified` false kalır.

## İnsan incelemesi ve düzeltme

Yalnız atanmış ayrı kişi, güncel görevi/MFA'sı yeniden doğrulanarak inceleyebilir. Tanımlı yerel örneklem hazırlanan ilişkilerin tamamıdır: her satıra ayrı uygun/hatalı sonucu ve gerekçe, ayrıca genel kabul/ret gerekir. Eksik/tekrarlı satır veya hatalı satırla kabul reddedilir. Örneklem büyüklüğü/toplam satır sayısı kayıtlıdır; bu, dış taksonominin veya bütün üniversite derslerinin temsilî uzman örneklemi değildir.

Güncel kabul edilmiş eşlemede öğrenen yalnız kendi programından hata bildirebilir; yetkili akademik görevli kendi biriminden bildirebilir. Aynı kişinin aynı ilişkiye açık bildirimi çoğaltılamaz. Bildirilen ilişki yerel kullanımda incelemeye alınır; diğer ilişkiler ve değişmez değerlendirme/karar arşivi korunur. Başka öğrenene bildirimin sahibi/metni/kimliği verilmez; ilişki düzeyinde açık bildirim sayısı görülebilir.

Düzeltme yeni sürümdür: tam önceki kimlik, değişiklik gerekçesi ve güncel kabuldeki bütün açık bildirimler bağlanır. Hazırlık sırasında yeni bildirim gelirse eski hazırlık kabul edilemez. Yeni kabul öncesinde eski kabul sürümü ve açık bildirim durumu korunur. Yeni kabul bildirimleri geçmişi silmeden çözüm sürümüne bağlar. Kalite görevlisi ayrı gerekçeyle kullanımı durdurabilir. En son kabul edilmiş sürümün durması/süresinin dolması eski kabul sürümüne geri düşürmez.

## Yetki, kalıcılık ve arayüz

Kurum/birim, güncel üyelik, kişi ve görev ayrımı sunucuda uygulanır. Teknik ve mali roller bu yeni sicile erişmez. Öğrenen yalnız kayıtlı programının kabul edilmiş sürümlerini ve kendi hata bildirimlerini görür; hazırlanma sahibi/görevlendirme ayrıntısı verilmez. Yetkili personel hazırlık, inceleme ve düzeltme geçmişini görür. Kaydetme/komut tekrarı/denetim tek yerel işlemdedir; denetim hatası sonucu geri alır. Geçmiş kayıtlar güncellenmez veya silinmez.

Arayüz kaynak/lisans ayrıntısı, ilişki satırları, atanmış inceleme, hata/düzeltme/durdurma, yetkili JSON kopyası, arama/boş sonuç ve mobil/klavye kullanımını içerir. Satır ekleme/kaldırma odağı korunur. Kaynak adresi sunucuda otomatik ziyaret edilmez veya veri seti indirilmez.

## Okunan resmî kaynaklar — 14 Ekim 2026

- [ESCO Use ESCO](https://esco.ec.europa.eu/en/use-esco): okunan kapsam; kavram adresleri, kaynak kapsamı, bağlantılı veri ve dil paketleri. Sayfa altı ESCO v1.2.1 / 10.12.2025 ve portal Release v6.0.0 gösterdi. Listelenen diller arasında Türkçe yoktur; otomatik Türkçe resmî çeviri varsayılmadı. Uygulanan teknik sonuç: kavram kimliği, özgün dil/ad, ayrı Türkçe aktarım dayanağı ve kaynak sürümü alanları. Tam veri seti alınmadı.
- [ESCO FAQ](https://esco.ec.europa.eu/en/about-esco/faq): okunan kapsam; kavram, bağlantı ve yardımcı modüllerin ayrımı. Bu açıklama bir ders–beceri ilişkisinin akademik doğruluğunu onaylamaz; ayrı insan incelemesi tutulur.
- [Avrupa Komisyonu legal notice](https://commission.europa.eu/legal-notice_en): ESCO sayfasının yönlendirdiği genel telif bildirimi okundu. AB'nin sahip olduğu içerikte aksi belirtilmedikçe CC BY 4.0, atıf ve değişiklik belirtme şartı; üçüncü kişi hakları ve marka/logo/isim vb. istisnalar ayrıdır. Bu genel sayfa seçilmemiş veri paketinin bütün özel haklarını veya Gazi'nin kullanım/çeviri yetkisini otomatik kabul etmek için kullanılmadı. Gerçek seçili paket/lisans sürümü ayrıca incelenmelidir.

Kaynaklar teknik model ve hak incelemesi sınırını belirler; kurumun uzman ataması veya otomatik karar kuralı değildir. Sentetik test kavramları `taxonomy.invalid` altındadır; ESCO kavramı taklidi değildir.

## Kabul ve kalan koşullar

11 yeni sunucu senaryosu: bağımlılık/görev/kimlik, çoktan çoğa, eksik-hatalı inceleme, aynı kişi/program projeksiyonu, itiraz, hata/düzeltme yarışı, veri ayrımı, tekrar, durdurma/süre, MFA ve atomik geri alma.14 tarayıcı kontrolü gerçek derlenmiş portalda aynı zinciri, arşiv SHA korunmasını ve 390 px/klavyeyi sınar. Bunlar gerçek uzman kabulü, gerçek ekran okuyucu veya dış taksonomi lisans doğrulaması değildir.

B33 genel durumu kısmi. Gerçek lisanslı taksonomi paketi/sürümü/atıf-çeviri koşulları, kurumca uzman ataması ve temsilî akademik örneklem, B29 gerçek kaynak verisi, üretim depo/kimlik ve canlı kabul açıktır. Vercel çekirdeği kapalı; gerçek kişiye yeterlilik verilmez.
