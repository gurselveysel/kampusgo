# B10 — alternatif ölçme kanıtı ve bağımsız moderasyon

Sürüm 2026.10.13.23. Kaynak: backlog.json B10 kabul şartı ve projenin görevler ayrılığı tasarımı. Bu yerel teknik sözleşme Gazi Üniversitesi'nin onaylı alternatif ölçme usulü değildir. Gerçek yöntem, düzenleme ve görev ataması kurumca kararlaştırılmadan üretim etkinleştirilmez. `configuredCore()` Vercel'de kapalıdır; özel migration, gerçek öğrenci veya resmî belge işlemi yoktur.

## Kullanıcının tamamladığı zincir

Öğrenme kanıtları ekranında eğitici, kendi yetkili birimindeki etkin öğrenen kaydı/görev için sözlü uygulama, gözlenen uygulama, portfolyo incelemesi veya erişilebilir alternatif biçim seçer. Gözlem zamanı, ürün/gözlem içeriği, kanıt dayanağı, yöntem dayanağı ve gerekçe zorunludur. Bunlar yerel kayıt ve beyanlardır; dosya özgünlüğü, dış hizmet veya kurumsal yöntem izni otomatik doğrulanmış sayılmaz.

Ayrı kalite görevlisi güncel kanıt sürümünü, içerik ve yöntem/program özetini görerek gerekçeli kabul veya ret verir; kanıtı nasıl kontrol ettiğini ayrıca yazar. Hazırlayan, öğrenen ve program hazırlayan aynı incelemeyi yapamaz. Hazırlayanın görevi incelemeden önce kapanmışsa kabul yolu kapalıdır. Tamamlanmış inceleme değişmez; düzeltme yeni kanıt sürümü ve yeni inceleme gerektirir.

Kabul edilmiş alternatif kanıt Değerlendirmeler ekranında seçilebilir. Bütün zorunlu görevler, her rubrik ölçütüne 0–4 puan ve gerekçe hâlâ gereklidir. Null puan, eksik kanıt, başarısız sonuç, istemcinin `passed` veya toplam puan beyanı başarı üretmez. Ayrı komisyon kararı ve belge profili/ihraç yetkisi ayrıca gerekir. Alternatif kanıtı hazırlayan veya inceleyen kişi nihai akademik karar veremez; kendi dayanağının itiraz incelemesi veya bağımsız yeniden değerlendirmesinde de görev alamaz.

## Sürümler ve tarihsel etkiler

- Yerel profil her öğrenen kaydı/görev için tek bir alternatif kanıt sürüm zinciri tutar. Farklı biçimlerin paralel bağımsız zincirleri bu profilin parçası değildir.
- Yeni sürüm güncel önceki kimliğe ve değişiklik gerekçesine bağlıdır. Eski ve aynı işlem kimliği tekrarları güncel yetkiyle denetlenir. Başka kurum/birim kaydı kullanılamaz.
- Yeni kabul edilmiş sürüm varsa yeni değerlendirme eski alternatif sürümü seçemez. Yeni taslak veya reddedilmiş sürüm önceki kabulü silmez.
- Değerlendirme içerik özetiyle birlikte yöntem sürümünü, moderasyon kaydını ve moderasyon özetini değişmez olarak yakalar. Sonraki kanıt sürümü eski değerlendirme veya karar dayanağını sessizce değiştirmez. Ekran eski dayanağın hangi sürümde kaldığını ve sonraki sürüm bulunduğunu belirtir.
- Akademik karar değişikliği mevcut itiraz → bağımsız yeniden değerlendirme → yeni karar → gerekiyorsa belge değiştirme/iptal zincirinden geçer. Yeni alternatif kayıt tek başına not veya belge iptal etmez.
- Hazırlayanın/inceleyenin daha sonra görevden ayrılması tarihsel inceleme gerçeğini kendiliğinden değiştirmez. Yeni işlemde güncel görev denetlenir. Üretimde ayrıca kurumun düzeltme, şüpheli kanıt ve görev devri usulü gereklidir.

## Arşiv, hak ve erişim

Karar dayanak arşivi aynı program/rubrik/görev/kanıt ve moderasyon snapshotını yeniden üretir. Mevcut B09 arşivi imzasız yerel arşivdir; B09'un dış kaynağı doğrulanmış imzalı aktarım kabulü kapanmış değildir. Kişi özeti yalnız o kişinin yetkili birimindeki alternatif kanıtı ve incelemesini kapsar. Kişi kendi kayıtlarını görür; başka öğrenen görmez.

Yeni komutlar `alternative-evidence` ve `evidence-moderate`, B08 kapsam envanterine eklendi. Gerçekten geçerli başka kurum oturumu, başka birim, idempotent tekrar, okuma ve HTTP ihraç matrisi yeniden çalıştırılır. Moderasyon kaydı, komut ve denetim yazımı aynı işlemdedir; denetim hatası tüm yazımı geri alır. SQL deposu yalnız izole kabul içindir.

## Kabul ve açık sınır

Yerel uçtan uca akış, dört yöntem, bağımsızlık, olumsuz/null kanıt, sürüm ve eski arşiv, atomik geri alma ve iki depo bağlantısı test edilir. Tarayıcı gerçek React formlarından gerekçeli ret, yeni sürüm, kabul, rubrik, karar, belge hazırlığı ve kişisel arşivi tamamlar; arama/filtre, klavye ve 390 px görünüm sınanır. Otomatik tarayıcı testi gerçek ekran okuyucu/kurum kabulü değildir.

Gerçek akademik yöntem, yetkili karar sahipleri, üretim kimlik/depo ve kaynak dosya doğrulaması açık kalır. Yerel moderasyon hükmü bütün üniversitelere genellenmez. Dört seçenek uzman veya kurum onayı verilmiş alternatif yöntem kataloğu diye sunulmaz.
