# B03 — sürüme bağlı yerel program bilgi paketi

Sürüm 2026.10.14.43. B03'ün belge profil sicilini program sürümü ve yetkili incelemeye bağlama bağımsız dilimi; B12/Paket16 ve B02/Paket42 bağlarının program ekranına ve tek bilgi paketine taşınmasıdır. Gerçek akademik veya içerik hakkı onayı değildir.

## Ekran ve kapsam

Program sürümleri ekranı aynı kaydın Öğrenme Çıktıları, iş yükü, görev/rubrik, eğitici bilgisi, içerik lisansı **beyanı**, ayrı program incelemesi ve güncel belge profili/yetki dosyasını yedi durum satırında gösterir. Öğrenen yalnız kayıtlı olduğu programın durumunu görür; idari paket indirme yetkisi kazanmaz. Komisyon aynı ekrandan belge profili incelemesine; merkezi SEM programı kendi hazırlık dosyasına geçebilir.

Yerel programın mevcut `publish` işlemi program içeriğinin ayrı komisyon incelemesidir. Tek başına tam bilgi paketi onayı, içerik hakkı veya belge düzenleme yetkisi değildir. Eski program yayını/öğrenen kaydı/kararlar bu dilimle silinmez ya da yeniden yazılmaz. Tam kurumsal yayında eksiksiz ve gerçek onayların zorunlu tutulması kurum/üretim kabulünün açık parçasıdır; mevcut yerel akademik prova akışı kurumsal açılış kabulü diye sunulmaz.

## İndirme kapısı ve sürüm

`POST /api/myys/program-paketi`, güncel kişi/kurum/birim/MFA ve koordinatör/eğitici/komisyon/kalite görevini denetler. Mevcut akademik okuma ayrımı korunur; yönetici rolü tek başına bu akademik paketi açmaz. Kişi/rol dışı, başka birim veya geçerli başka tenant oturumu özel kaynak kimliğiyle veri alamaz. Oturumsuz 401, yapılandırılmamış üretim çekirdeğinde 503 döner. `configuredCore()` Vercel'de kapalıdır.

Tek yerel SQL okuma işlemi içinde:

- Değişmez program sürümünün alanları ve güncel ayrı komisyon yayını bulunur.
- Belge profilinin program kimliği/sürümü/tam SHA'sı eşleşir; güncel profil incelemesi ve B02 dosyası geçerli olmalıdır.
- En az bir atanmış belge görevlisinin üyeliği hâlâ etkin olmalıdır. Profil/yetki dosyası süre sonu, durdurma, yeni incelenmemiş sürüm veya ilgili görev kaybı indirmeyi kapatır.
- Merkezi SEM mikro yeterlilik profiliyle indirilemez. Dış başvuru veya resmî ihraç yolu açılmaz.

İndirilen `myys-program-information/1` JSON, program snapshotı, program içerik SHA'sı, yayın incelemesi referansı, belge profili sürümü/alanları/kaynak özeti/formatı/süresi ve yetki dosyası kimliği/SHA referansını birleştirir. Atanmış kişi listesi, idari belge baytları ve inceleyen kişi kimlikleri dışarı verilmez. Kaynak SHA'ları özel kayıtlara referanstır; kırpılmış profil içeriğinden bütün özel kaydın SHA'sını yeniden hesaplama iddiası yoktur. Paket içeriğinin ayrıca SHA-256 özeti doğrulanabilir; elektronik imza değildir.

`checkedAt` değişebilir güncel durum bilgisidir; tarihsel payload ve SHA dışında tutulur. Önceden indirilmiş dosya yeni yetki göstermez. Her yeni indirme mevcut durumu yeniden denetler; ekranda eski düğme görünse bile sonradan durdurulan dosyada 409 döner, arayüz güncellenir. Yeni program sürümü öncekinin profil bağını ödünç alamaz. Eski öğrenci/kanıt/rubrik/karar arşivi ve önceki indirilmiş dosya değişmez kalır.

## Kabul ve açık sınırlar

7 yeni program paketi testi ve 1 yeni HTTP kapsam satırı; toplam 578 sunucu +48 portal +46 regresyon =672 test. 118 komut/17 HTTP; 6816 olumlu örnekten 54528 türetilmiş kapsam kontrolü. 9 bilgi paketi +8 program +13 itiraz =30 tarayıcı kontrolü. Eski ekran ile ayrı yönetici oturumu yarışı iki ayrı Chromium işlemiyle sınandı; tek süreçte çoklu test bağlamı sorunu yetki kontrolü gevşetilerek aşılmadı. 390 px ve klavye ayrıntıları kontrol edildi. B02'nin önceki 13 dosya ve 11 profil tarayıcı kanıtı Paket42'ye aittir; bu paketin yeniden koşusu sayılmaz.

İçerik lisansı beyanı ve kaynak özeti gerçek kullanım hakkı değildir. Paket `signed=false`, `official=false`, `institutionApproved=false`, `licenseRightsVerified=false`, `externalSubmitted=false` taşır. YÖK/Gazi tam güncel usul ve gerçek program/lisans/akademik karar kabulü halen açık. B03 bağımsız profil/program bağının yerel kabulü ilerledi; B03 ve B01–B36 bütünü tamamlanmadı.
