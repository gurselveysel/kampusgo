# Program bilgi paketi — aynı SQL kimlik ve kaynak zinciri

Paket73, 14.10.2026. B03 program bilgi paketi mevcut SQL program/yayın/profil/yetki dosyasından indirilir. İmzasız yerel bilgi çıktısıdır; gerçek kurum yayını, kullanım hakkı, resmî belge veya dış başvuru değildir.

## Kullanıcı işlemi

“Kanıt ve Akademik Karar → Program sürümleri” ekranı yedi dayanağı gösterir: Öğrenme Çıktıları, iş yükü, görev/rubrik, eğitici, içerik lisansı beyanı, ayrı program incelemesi ve güncel belge profili/yetki dosyası. Güncel MFA ve birim yetkisi bulunan koordinatör/eğitici/komisyon/kalite görevlisi bağlı JSON dosyasını indirir. Öğrenen kendi programının durumunu görür; idari paket indirme yetkisi edinmez. Yönetici ve belge görevlisi rolleri tek başına bu akademik indirmeyi açmaz.

Mevcut SQLite iş kuralı `programPackageForPrincipal` fonksiyonuna ayrıldı; SQL için ayrı bir izin veya akademik kural kopyası yazılmadı. Fonksiyon yalnız LocalAcceptanceStore veya etkin özel SQL çalışma kümesini kabul eder. SQLite dış katmanının güncel principal/transaction ve üretim kapısı korunur.

## HTTP ve işlem sınırı

Yalnız açıkça seçilmiş izole SQL akademik profilde `POST /api/myys/program-paketi` vardır. Varsayılan kimlik profili bu yolu açmaz. Gövdede yalnız `tenant` ve `programId` kabul edilir; sorgu, rol/aksiyon ekleme, farklı tenant, aşırı boyut, eksik oturum, yanlış Origin/Sec-Fetch-Site/CSRF, forwarded başlık veya yanlış yöntem reddedilir. TLS/Host ve UTF-8/JSON sınırları önceki uçlarla aynıdır.

Bu okuma indirmesi, kişiye bağlı POST olduğundan mevcut `academic-write` istek bütçesi ve doğrulanmış CSRF permit'ini kullanır. İşlem kaydı veya yeni akademik komut üretmez. Kimlik güvenliği geçmişi/bütçesi normal kurallarına tabidir. HTTP politika parmak izi `same-sql-academic/2` oldu; eski profil ile yeni kod kendiliğinden eşleşmez. Eski kalıcı epoch'tan geçiş için mevcut ayrı yetkili rotasyon/boş bütçe kuralları gerekir; bu çalışma böyle bir üretim geçişi yapmaz.

Aynı SERIALIZABLE işlemde güncel SQL kişi/üyelik/oturum, tenant kilidi ve sınırlı çalışma kümesi kullanılır. Kaynak denetimi snapshot yüklemesinden sonra güncel zamanda yapılır; sonuçtaki `checkedAt` bu kontrol zamanıdır. İşlem sonunda kimlik ve HTTP permit'i yeniden doğrulanır, birleşik checkpoint mühürlenir. Başarısız veya belirsiz COMMIT sonuç/payload döndürmez. Yeni açık indirme her defasında güncel kaynakları yeniden denetler; önbelleğe alınmış bir yetki makbuzu yoktur.

## Dayanak, sürüm ve özel alanlar

Program kimliği/sürümü/özeti, ayrı komisyon yayını, profile bağlı yetki dosyası, geçerli süre ve görevli üyelikleri aynen korunur. İncelenmemiş yeni profil, profil/dosya durdurma, yayın/dosya incelemecisinin veya atanmış belge görevlisinin görev kaybı yeni indirmeyi kapatır. Yeni program sürümü öncekinin profil bağını ödünç alamaz. Merkezi SEM yolu bu mikro program paketiyle düzenlenmez.

Çıktı yalnız önceki açık alan listesini taşır. Özel belge baytları, profil görevlilerinin kişi listesi ve inceleyen kimlikleri çıkarılmaz. Kaynak özetleri özel kayıt referanslarıdır; paketin kendi içeriği için ayrıca SHA-256 doğrulanabilir. `signed`, `official`, `institutionApproved`, `licenseRightsVerified`, `externalSubmitted` false kalır. Daha önce indirilen tarihsel dosya yeni kullanım yetkisi değildir; değiştirilmez.

## Açık koşullar

24 SQL komut/24 akademik tür ve16 şema adayı değişmez;112 komutun SQL aktarımı sürer. Yeni HTTP yolu mevcut18 SQLite HTTP kabul yolundan biridir; mevcut kapsam matrisinin sayısı artmış gibi gösterilmez. İhraç ve imzalama SQL profilinde kapalıdır. Gerçek program/içerik hakkı/yetki/IdP/depo/checkpoint, native çok bağlantı/SSI/RLS ve tam yardımcı teknoloji kabulü açık kalır. `configuredCore()` Vercel'de kapalıdır; son canlı16, bu dilim yayımlanmadı.

## Doğrulama

Paket73:9yeni SQL+4yeni HTTPS testi;912sunucu+59portal+46regresyon=1017.51SQL+9mevcut program paketi=60tarayıcı.136komut/18HTTP için9035pozitif72280türetilmiş negatif SQLite kapsam örneği;115statik paket. Tarayıcı ilk koşusunda dar durum rozeti görsel olarak kesiliyordu; yalnız program durumu satırı sarıldı, rozet metninin kendi kutusunda kaldığı ölçülerek51 SQL ve9 mevcut paket kontrolü yeniden geçirildi. İlk HTTP testindeki semantik eksik alan422 beklentisi ve testin sentetik hız bütçesi düzeltildi; ürün yetki/hız sınırı gevşetilmedi. [Kanıt](acceptance/B03-program-package-sql-20261014.json).
