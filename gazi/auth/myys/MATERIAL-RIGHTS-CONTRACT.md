# Ders, materyal ve hak kararı — B05/B25

14.10.2026 · Yazılım paketi 44 · Yalnız izole yerel kabul. Kurum/hak sahibi kararı, üretim lisans kabulü veya yeni yayın değildir.

## Tek içerik ve işlem zinciri

`learning-data/cases/resources/materials.mjs` dosyaları aynı içerikle `auth/myys` altında kanonik hale getirildi; eski portal yolları yalnız yeniden dışa aktarır. Böylece sunucu dağıtım kökü dışına bağımlı olmaz. 6 koleksiyon, 22 modül, 66 ders ve 88 özgün Türkçe HTML/CSV dosyasının baytları testle karşılaştırılır. 13 ders kaynağı bağlantısı, 24 kamu kaynak sicilinden ayrıdır; kaynak merkezi ve eski sürüm etiketleri korunur.

İçerik koleksiyon kodu, gerçek program kimliği değildir. Koordinatör güncel, incelenmiş program sürümünü açıkça seçer. Koleksiyondaki her ders tek kez, bir veya çok görevle eşlenir; ilgili rubrikler programdan türetilir. Her program görevi kapsanmalıdır. Ders/görev başlıklarının benzerliği akademik eşdeğerlik üretmez. Program, koleksiyon, ders, sicil ve sicil incelemesi tam SHA-256 ile bağlanır.

## İnsan işlemleri ve indirme

1. Yönetici dokuz zorunlu alandan oluşan `content-rights` sicilini hazırlar; ayrı yönetici inceler. Kaynak referansı tam koleksiyon sürümünün `urn:myys:original-pilot:<id>:<sha>` değeridir.
2. Koordinatör 66 derslik envanterden seçtiği koleksiyonun bütün derslerini programın görev/rubrik zincirine bağlar; gerekçe ve UTC son tarih verir.
3. Ayrı yönetici yazılı dayanağı ve okuduğu kapsamı kaydeder. Kopyalama ve yeniden yayın **hazırlığı** ayrı açık kararlar; çıkış ve abonelik sonrası koşullar ayrı metindir. Sabit kullanıcı grubu kayıtlı öğrenenler ve yetkili birim görevlileridir. Dış materyal kopyası, marka ve API izinleri bu akıştan açılamaz.
4. Hazırlayanlardan ayrı kalite görevlisi hak verilmiş özgün dosyaları `review` işlemiyle indirebilir. Bu makbuz öğrenen kanıtına bağlanamaz. Her ders için kaynak/lisans, Türkçe anlatım, erişilebilirlik ve görev/rubrik ilişkisinin sonucu ve bulgusu kayıtlı olmalıdır. Uygun sonuç tüm satırların uygun olmasını gerektirir; olumsuz sonuç da korunur.
5. Güncel kabulden sonra kayıtlı öğrenen kendi programının dersini HTML veya CSV olarak alır. Yetkili birim görevlileri inceleyebilir. Yeniden yayın hazırlığı ayrıca `republishing=true` ve koordinatör rolü ister; dosyayı herhangi bir siteye göndermez, `published=false` kalır.
6. Öğrenen kendi teslimini yalnız aynı kayıt ve bağlı görevin çalışmasına ekleyebilir. Teslim, çalışma, insan rubriği ve bağımsız karar aynı kişiye bağlanır. İndirme, izleme veya katalog kaydı başarı/ders tamamlama sayılmaz.

Her yeni teslimde ve aynı işlem kimliğinin tekrarında kişi/kurum/birim/MFA, öğrenen kaydı veya görev, süre, en yeni eşleme, sicil ve kaynak özetleri, hazırlayan/incelemecilerin güncel rolleri, hak kararı ve durdurma yeniden kontrol edilir. Yeni taslak eski eşlemeye geri düşmez. Başka program dersi, dosya yolu, harici PPTX biçimi ve kaydı olmayan öğrenen kapalıdır. Dosya baytları komut sonucu/teslim/audit içinde çoğaltılmaz; yetkili yanıtta kanonik kaynaktan yeniden hazırlanır. Denetim hatası teslim ve idempotency kaydını aynı işlemde geri alır.

Teslim dayanağı çalışmada SHA ile sabitlenir; sonradan hak durdurma, önceki akademik notu veya kararı değiştirmez. Yeni materyal teslimi ve eski teslimden yeni çalışma bağlama kapanır. Önceki çalışmanın değerlendirmesi arşivlenmiş teslim bağıyla yapılabilir. Gerçek bir içerik hakkı ihlalinde akademik kararın ayrıca gözden geçirilmesi/geri çekilmesi kurum sürecidir; burada otomatik hukuki sonuç çıkarılmaz. İndirildikten sonraki fiziksel kopyayı geri çağırma/DRM iddiası yoktur.

## Eski pilot ile sınır

Mevcut pilotta hazırlanmış özgün Türkçe çalışma rehberleri, kurgu vaka CSV’leri ve indirme yolları korunur. Bunlar zaten üniversite onaylı izlence olarak sunulmaz. Yeni denetim **programda yönetilen kullanım ve teslim** içindir; eski pilot erişimi kurum öğrenen kaydı veya yönetilen teslim sayılmaz. Bu nedenle yerel kontrolün tüm mevcut dosya erişim yollarına DRM uyguladığı veya mevcut özgün rehberlerin telif sahipliğini doğruladığı iddia edilmez.

Üçüncü taraf metin, slayt ve video dosyaları bu hizmette kopyalanmaz veya yeniden yayımlanmaz. Yalnız bağlantı listesi özgün rehberde korunur. Açık lisans koşulları bu yerel kullanıcı grubu tarafından yeniden yazılmaz; yayıncıdaki eser kendi lisansıyla erişilebilir. Kaynağın açık olması marka, video, görsel, API veya kurum adına kullanım hakkı olarak yorumlanmaz.

## Kabul ve açık koşullar

13 yeni sunucu testi; 14 gerçek tarayıcı kontrolü; aynı indirmenin iki ayrı SQLite bağlantısında durdurulması; iki ayrı Chromium sürecinde eski ekran yarışı; gerçek HTML/CSV bayt karşılaştırması. Tam kurum/birim yetki matrisi ve eski itiraz/gezinti regresyonu ayrıca çalışır. Envanter 14 tablo/133 kayıt türünü kapsar; yeni beş kayıt türünün hukukî saklama süresi verilmemiştir.

Sentetik P01’in 15 dersi iş akışını kanıtlar; Gazi’deki bir programa akademik uygunluk, içerik sahipliği veya yardımcı teknoloji kabulü sağlamaz. Gerçek seçili programın kaynak, dil, erişilebilirlik ve rubrik incelemesi; sağlayıcı hak sahipliği/istisnaları; gerçek onay belgesi ve üretim dosya deposu/dağıtım sözleşmesi açık. `configuredCore()` Vercel’de kapalıdır. Değişiklik 44. yazılım paketidir; B05/B25’in bütünü tamamlanmış değildir.
