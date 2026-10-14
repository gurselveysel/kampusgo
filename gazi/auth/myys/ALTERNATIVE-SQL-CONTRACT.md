# Aynı SQL zincirinde alternatif ölçme ve ayrı kalite incelemesi

14 Ekim 2026 · Paket69 · `myys-academic-sql-alternative/1`. İzole yerel kabul.

## Ekranda tamamlanabilen akış

**Öğrenme kanıtları** ekranında güncel eğitici görevi olan kişi, mevcut öğrenen kaydı ve görevi için sözlü uygulama, gözlenen uygulama, portfolyo incelemesi veya erişilebilir alternatif biçim kaydedebilir. Gözlem zamanı, ürün/gözlem içeriği, kanıt ve yöntem dayanağı ile gerekçe gerekir. Dosya veya dış hizmet doğrulanmış gösterilmez. Kurumun gerçek yöntem kabulü açık kalır.

Öğrenen, eğitici ve program hazırlayandan ayrı kalite görevlisi aynı SQL kanıtını inceler. İncelemesiz veya reddedilmiş kanıt **Değerlendirmeler** ekranında seçilemez; nedeni görünür. Kabul edilmiş kanıt, bütün görevler ve rubrik puanlarıyla insan değerlendirmesine girer. Boş kanıt, null puan veya başarısız sonuç istemci beyanıyla başarıya çevrilemez. Akademik karar ve itiraz incelemesi, alternatif kanıtın hazırlayanı ve kalite inceleyeninden de ayrı kişiye gider.

Eğitici yeni sürümü güncel önceki kanıta ve değişiklik gerekçesine bağlar. Sonraki kabul edilmiş sürüm gelecekteki rubrik seçiminde kullanılır; eski sürüm seçilemez olur. Önceki değerlendirme, karar, gözlem ve inceleme dayanakları aynı içerikle korunur. Panel, eski kaydın hangi kanıt sürümüyle korunduğunu gösterir. Karar değişikliği itiraz zincirinde kalır.

## Aynı kaynak ve yetki

`alternative-evidence` ve `evidence-moderate` mevcut kuralları SQL adaptörüne bağlanır. 14 komut ve 13 akademik kayıt türü aynı üç akademik tablo, aynı kişi/üyelik/oturum ve 15 veri tablosu checkpoint'i içindedir. `evidence-moderation` zaten mevcut yerel ürün türüdür; ikinci bir veri modeli oluşturulmadı. Toplam PostgreSQL adayları16, mevcut SQLite envanteri16tablo/149tür olarak korunur. Yeni kurum hesabı veya rolü oluşturulmaz; yalnız fixture'a ayrı sentetik kalite kişisi eklenir.

Mevcut `alternativeCommand`, digest, inceleme ve snapshot fonksiyonları korunur. Politika kapısı yalnız mevcut `LocalAcceptanceStore` veya açık, özel alanıyla doğrulanmış `LocalSqlAcademicWorkingSet` kabul eder. Generic nesne, kopyalanmış prototype, kapalı çalışma kümesi ve Vercel ortamı kabul edilmez. Gerçek SQL runtime kimliği, üyelik sürümlerini, MFA, süre, iptal ve HTTP güvenlik iznini aynı transactiondan önce ve sonra denetler.

İnceleme tam kanıt/yöntem/program digestine bağlıdır; inceleme anında hazırlayanın eğitici görevi güncel olmalıdır. İlk hazırlıkta öğrenen üyeliği güncel olmalıdır. Eski oturum üyelik kapat/aç işlemiyle tekrar canlanmaz. Yeni kayıt, komut makbuzu, audit ve checkpoint aynı zincirde kalır. Audit hatası kısmi kayıt bırakmaz; aynı komut aynı sonucu güncel yetkiyle bulur, farklı payload reddedilir. Eski SQL yedeği kabul edilmiş yeni kanıt veya moderasyonu silemez; ayrı güncellik kontrolü erişimi kapatır.

## Kabul ve açık koşullar

10 yeni SQL testi ve 13 mevcut alternatif kural testi hedefli koşuda geçti. Tam kapsam 876 sunucu +48 portal +46 regresyon =970 otomatik testtir. 136 komut/18 HTTP için mevcut SQLite kopya matrisinde9035pozitif/72280türetilmiş negatif örnek yeniden denetlendi; bu sayılar bağımsız test veya SQL RLS kabulü değildir. Tarayıcı sonuçları `acceptance/B09-B10-alternative-sql-20261014.json` içindedir.

Yerel gerçek HTTPS, ayrı sentetik IdP, derlenmiş React, tek exclusive PGlite0.5.9/PostgreSQL18.6 ve ayrı güncellik dosyası kullanılır. Tarayıcının geçici sertifika SPKI sabitlemesi korunur; başka HTTP istemcisindeki sertifika hatasını aşmak için genel TLS doğrulaması kapatılmaz. 320 CSS px/metin aralığı ve eski390px formları sınanır; gerçek ekran okuyucu/tam WCAG kabulü değildir.

Belge hazırlığı veya imzalama bu SQL diliminde açılmaz. Kalan122komut, gerçek kurum yöntem/usul kararı, IdP/MFA/KMS, native SSI/RLS/çok bağlantı, bütün yazıcılar/gerçek checkpoint hizmeti, production migration ve canlı smoke ayrı koşullardır. Mevcut6program/22modül/66ders ve kaynakları korunur. Son canlı16; bu bir yerel geliştirme dilimidir. `configuredCore()` kapalıdır.

Yeni hukuk veya eğitim standardı kuralı çıkarılmadı. Bu dilim önceki alternatif ölçme modelindeki açık yerel kaynak/dayanak/sürüm kurallarını aynı SQL kaydına taşır. Önceki kaynak kayıtları ve gerçek kurum kabulü koşulları korunur.
