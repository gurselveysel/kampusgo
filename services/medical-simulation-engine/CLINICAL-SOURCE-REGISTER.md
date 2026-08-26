# TEYS Medikal Simülasyon — Klinik ve Eğitim Kaynak Kütüğü

Bu kayıt, kontrollü pilot senaryonun klinik ve eğitimsel dayanaklarını izlenebilir kılmak için tutulur. Kaynakların varlığı tek başına senaryonun akademik kurul, uzman hekim veya yerel protokol onayı aldığı anlamına gelmez.

## 1. Mezuniyet Öncesi Tıp Eğitimi Ulusal Çekirdek Eğitim Programı

- Kaynak sahibi: Yükseköğretim Kurulu / Tıp Eğitimi Ulusal Çekirdek Eğitim Programı
- Kullanılan sürüm: **UÇEP 2020**
- Resmî kaynak dizini: `https://egitim.yok.gov.tr/page/499`
- Pilot kullanım amacı: temel hekimlik uygulamaları, klinik durumlar, profesyonellik, iletişim, hasta güvenliği ve bütünleşik eğitim mimarisi için referans çerçeve
- Durum: `reference_only_pending_formal_mapping`

Arayüzde gösterilen `%70 UÇEP referanslı çekirdek / %30 kurumsal özerklik` oranı, ürün tasarım sınırıdır. UÇEP'in resmî bir oran şartı veya akreditasyon sonucu olarak sunulmaz. Her program çıktısı, klinik durum, temel hekimlik uygulaması ve değerlendirme kanıtı ayrı eşleme tablosunda akademik kurul tarafından doğrulanmalıdır.

## 2. Akut Koroner Sendrom

- Kaynak sahibi: European Society of Cardiology
- Kaynak: **2023 ESC Guidelines for the management of acute coronary syndromes**
- Resmî sayfa: `https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/`
- Pilot kullanım amacı: akut göğüs ağrısı, EKG ile STEMI tanı yolu, antitrombotik yaklaşım, invaziv değerlendirme ve zaman kritik reperfüzyonun genel eğitim çerçevesi
- Durum: `educational_reference_pending_local_protocol_review`

ESC materyali telif korumasındadır. Metin, şekil, tablo veya algoritmalar olduğu gibi kopyalanmaz. Pilot senaryo, kaynak ilkelerini kendi sentetik olay sözleşmesiyle ifade eder. Ticari yeniden kullanım veya görsel çoğaltma gerekiyorsa ayrıca izin değerlendirmesi yapılmalıdır.

## 3. Kardiyopulmoner Resüsitasyon

- Kaynak sahibi: European Resuscitation Council
- Kaynak: **ERC Guidelines 2025**
- Resmî sayfa: `https://www.erc.edu/science-research/guidelines/guidelines-2025/guidelines-2025-english`
- Pilot kullanım amacı: erişkin temel yaşam desteği, erişkin ileri yaşam desteği, şoklanabilir ritim, erken defibrilasyon, CPR sürekliliği, resüsitasyon sonrası bakım ve resüsitasyon eğitimi
- Durum: `educational_reference_pending_local_protocol_review`

ERC, kılavuzlarının yerel mevzuat ve sağlık sistemi düzenlemelerine göre uygulanacağını açıkça belirtir. Bu nedenle pilot içindeki algoritmik akış, kurumun güncel resüsitasyon protokolü ve yetkili eğitici onayı olmadan resmî eğitim senaryosu olarak yayımlanmaz.

## 4. Yerel ve Kurumsal Kaynaklar — Zorunlu Tamamlama Alanı

Production veya kurumsal pilot öncesinde aşağıdaki kayıtlar doldurulmalıdır:

- kurumun güncel akut koroner sendrom protokolü,
- kurumun güncel erişkin resüsitasyon protokolü,
- ilaç doz ve kontrendikasyon onay kaydı,
- simülasyon merkezi senaryo tasarım standardı,
- UÇEP çıktı–senaryo–ölçme eşleme matrisi,
- sorumlu uzman hekim ve tıp eğitimi uzmanı onayı,
- kaynak sürüm tarihi ve yeniden değerlendirme tarihi,
- telif/lisans kullanım kararı.

## 5. Klinik İçerik Kalite Kapısı

Her senaryo sürümü yayımlanmadan önce şu kontroller tamamlanır:

1. Klinik durum geçişleri kaynak ve uzman onayıyla doğrulanır.
2. İlaç, doz, uygulama yolu, kontrendikasyon ve zamanlama ayrı kontrol edilir.
3. Kritik eylemler ile kritik hatalar açıkça tanımlanır.
4. Öğrenciye verilen geri bildirim, tek bir yöntemi tüm klinik bağlamlarda evrensel doğru gibi sunmaz.
5. Senaryo sentetik hasta olarak etiketlenir; gerçek hasta kimliği veya benzerliği kullanılmaz.
6. Yapay zekâ yeni klinik kural üretmez; yalnız onaylanmış olay sözleşmesini anlatım ve görselleştirmeye dönüştürür.
7. Kaynak sürümü değiştiğinde önceki senaryo otomatik olarak güncellenmez; yeni uzman onayı ve yeni sürüm gerekir.

## 6. Mevcut Pilot Sınırı

Bu repodaki senaryo, ürün davranışını göstermek için oluşturulmuş sentetik ve deterministik bir prototiptir. Klinik karar desteği, sağlık hizmeti sunumu veya bağımsız öğrenci yeterlilik belgelendirmesi amacıyla kullanılamaz. Production durumu: **NO-GO**.
