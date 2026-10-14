# Yetki dosyası ve belge profili — aynı SQL zinciri

Paket72, 14.10.2026. Politika ve hak sicilindeki özel ek, yetki dosyası ve belge profili mevcut SQL kişi/üyelik/oturum zincirine bağlanmıştır. Gerçek Senato/SEM kararı, belge gerçekliği veya resmî ihraç yetkisi üretilmez.

## Kapsam ve ekranlar

Mevcut beş authority ve üç credential-profile komutunun iş kuralları korunur. Yerel SQL kapsamı24 komut ve24 akademik kayıt türüdür;112 komut henüz taşınmamıştır. Aynı16 PostgreSQL şema adayı kullanılır. İkinci kalıcı SQLite akademik deposu, üretim migration'ı veya yeni credential yoktur.

“Politika ve hak sicili” ekranında yönetici PDF/TXT ek yükler; kaynak, sürüm, tarih, Senato/SEM türü ve dört ayrı sorumluluğun kapsamını dosyaya bağlar. Ayrı yönetici ekin baytlarını indirip dosyayı inceler. “Belge profilleri” ekranında yönetici güncel dosyaya ve program sürümüne11 belge alanı, kaynak, biçim, süre ve etkin belge görevlisi bağlar; ayrı komisyon inceler. Yeni sürüm ve durdurma geçmişi korunur.320CSSpx, artırılmış metin aralığı ve klavye araması denendi.

Bu SQL diliminde belge düzenleme, imzalama ve program bilgi paketi indirme kapalıdır. Kullanıcıya profil hazırlığı/incelemesinin açık olduğu, düzenleme/imzanın henüz açık olmadığı açıklanır. Eski SQLite yerel kabul akışı korunur; iki depo tek kurumsal kayıt gibi sunulmaz.

## Dosya güvenliği ve atomiklik

Ek metadata ve özel dosya baytları aynı SERIALIZABLE işlemde iki değişmez kayıttır. Yalnız authority-attachment için bu kesin iki kayıt şekline izin verilir; kimlik, birim ve sahip eşleşir. Maksimum32KiB PDF/TXT, ad/biçim/base64/tarih denetimleri değişmez. Yetkili projeksiyonda dosya baytları bulunmaz.

İndirme makbuzu ve komut önbelleği dosya baytlarını içermez. Aynı komut tekrarında güncel kişi, üyelik, birim ve dosya özeti yeniden doğrulanır; byte değişimi veya yetki kaybı indirmeyi kapatır. Denetim yazımı başarısızlığı metadata/dosya/makbuzu birlikte geri alır. COMMIT sonucu belirsizse bayt veya başarı dönmez; doğrulanmış kalıcı sonuç açık tekrarın güncel kontrolleriyle alınabilir. Birleşik checkpoint etkinken belirsiz dış mühür ayrı kapalı kalma kuralına tabidir.

Çalışma kümesi10000 kayıt/16MiB sınırını ekleme öncesi korur.9999 kayıtta iki kayıtlık ek yarım bırakılmaz. SQL JSONB gösteriminin gerçek boyutu da COMMIT öncesi denetlenir. Bu sınır kapasite/load kabulü değildir. Yalnız özel aktif çalışma kümesi alan fonksiyonlarına erişir; genel nesne, prototip taklidi ve kapanmış küme reddedilir.

## Güncel yetki ve geçmiş

Dört sorumluluk, Senato ve SEM ek bağları, kaynak özeti, program kimliği/sürümü, ayrı inceleme, geçerlilik zamanı ve güncel görevler korunur. Profil için etkin kişiler/üyelikler yalnız tam tanımlı bir sorguyla okunur; SQL metni çalıştıran genel adaptör verilmez. Yeni dosya veya profil sürümü eski bağları değiştirmez. Dosya/profil durdurma, inceleyen veya belge görevlisinin üyelik kaybı ve süre sonu yeni kullanımı kapatır; önceden düzenlenmiş belgeyi kendiliğinden iptal etmez.

## Kabul ve açık koşullar

15 yeni SQL testi;899 sunucu+59 portal+46 regresyon=1004 otomatik test geçti.44 aynı SQL ve14 mevcut SQLite yetki akışı=58 tarayıcı kontrolü geçti.136 komut/18 HTTP için9035 olumlu ve72280 türetilmiş olumsuz SQLite kapsam örneği yeniden denendi; bunlar ayrı test veya native SQL RLS sayısı değildir.115 statik dosya paketlendi. Ayrıntılar `acceptance/B02-B12-authority-profile-sql-20261014.json` içindedir.

PGlite tek bağlantı kabulü native çok bağlantı/SSI/RLS, üretim checkpoint/depo, dosya tarama, gerçek kurum yetkisi veya tam yardımcı teknoloji kabulü değildir. B02/B12 ve ilgili B06/B07/B08/B16/B28 alt şartları ilerler; hiçbir B işi bütünüyle kapanmaz. Son canlı16;17–72 dağıtılmadı. `configuredCore()` Vercel'de kapalı; browserAuth iptali yenilenmedi.
