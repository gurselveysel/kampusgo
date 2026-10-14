# Tanıma kaynak ve istisna incelemesi — 14.10.2026 / Paket47

“Tanıma ve kredi → Kaynak ve istisna incelemesi” görünümü idari kaynak dosyası, bağımsız inceleme ve yeni kullanımın durdurulmasını sunar. “Politika ve hak sicili” tanıma yolunu Türkçe seçenekle kaydeder. Kaynaklar Paket46 inceleme kaydındadır; bu sürüm yeni mevzuat veya kurum yorumu üretmez.

## Zorunlu yeni politika zinciri

Yeni `recognition-policy` her zaman `basisRequired:true` kaydeder; istemci false göndererek bu kuralı değiştiremez. Yönetici aynı birim/yoldaki, ayrı yönetici tarafından incelenmiş `recognition-policy` siclini seçer. Kaynak dosyası politika/sicil/sicil incelemesinin tam SHA’larını; politika kaynağının referans/madde/sürüm/tarihini; okunan belgenin kullanıcıca bildirilen SHA-256 özetini, okuma kapsamı/tarihini, ölçü birimini, istisna şartlarını, müfredat/önceki ders ve yetkili karar dayanağını bağlar. Belge baytları bu akışta yüklenmez; `sourceFileStored`, `authenticityVerified`, `official` false kalır. Hash bildirmek belge özgünlüğünü kanıtlamaz.

Ayrı komisyon görevlisi kaynak/politika/sicil hazırlayan ve sicil inceleyenden farklı olmalıdır. Kabul için dört ayrı kapsam teyidi, güncel üyelikler ve geçerlilik gerekir. Politika kabul incelemesi bundan sonra yapılır. Başvuru ve pozitif kredi kararı güncel kaynak durumunu sunucuda yeniden kontrol eder. Kayıtlı kaynak ve inceleme özetleri başvuruda ve yeni kararda saklanır. İstemci bu denetimi veya ölçü birimini kendi alanıyla değiştiremez.

## Desteklenen ve kapalı hesap yolları

Açıkça incelenmiş `credit-units` + `none`, mevcut sentetik kredi oranı algoritmasını kullanabilir. Bu, YÖK 10/3 hükmünün kurumsal ölçü birimi kabulü değildir. `training-count`, `hours`, `unresolved` veya özel yol seçildiğinde dosya incelenip başvuru alınabilir fakat pozitif kredi hesabı kapalı kalır. Arayüz tam/kısmi seçeneklerini kapatır; API bunları ayrıca reddeder. İnsan teknik raporu bu sınırı açmaz. Red kararı ve itiraz gibi yeni kredi üretmeyen işlemler kaynak hesabını aşmaz.

RPL zorunlu yabancı dil, lisansüstü makale, hizmet içi eğitim ve önceki yükseköğretim dersi birbirinden ayrıdır. Yol politika pathway’iyle eşleşir. Akademik uygunluk/kurul onayı veya saat, eğitim adedi, önceki ders eşdeğerliği ve özel istisna hesap adaptörü uydurulmaz. Bu yollar için gerçek müfredat, önceki kayıt kaynağı ve kapsamı onaylanmış kurum kararı gerekir. Politikada mevcut kredi alanları bulunması kapalı yolu otomatik açmaz.

## Sürüm, durdurma ve geçmiş

Yeni kaynak taslağı önceki kaynak yerine güncel inceleme bekler; aynı sürüm tekrar incelenmez. Yeni başvurular ve pozitif kararlar; taslak, red, hold, süre veya bağlı görev değişiminde kapanır. Yönetici ya da kalite güncel incelenmiş kaynağı durdurabilir. Önceki karar/kredi/OBS olayı otomatik iptal edilmez; bunun için mevcut akademik itiraz/yeni karar/OBS düzeltme zinciri vardır. Daha önceki başvurunun kaynak snapshotı korunur; sonraki karara o anda geçerli bağımsız inceleme ayrıca bağlanır.

Paket47 öncesi depodaki `basisRequired` alanı olmayan politika değişmez geçmiş olarak `legacy-local-test` statüsünü korur. Yeni API bu biçimi üretemez. Eski yazılımla eşzamanlı yazım, genel bir veri migration’ı veya üretim uyumluluk kabulü yoktur. Canlı kurumsal çekirdek kapalı; gerçek üretim geçmişi/migration uygulanmadı.

Dosya ayrıntıları yalnız yetkili idari/akademik görevlilerdedir. Öğrenen kendi talebini ve politikanın hesap durumunu görür; IT bu idari dosyayı alamaz. Tenant/birim/MFA ve idempotent tekrar yetkileri yeniden kontrol edilir. Kaynak dosyasının resmî tebligat/kurul imzası, tam Senato kararı veya dosya arşivi olduğu iddia edilmez.

## Kabul kanıtı

11 yeni sunucu testi;626+48+46=720 otomatik.131 komut/17 HTTP7625 pozitif örnek61000 türetilmiş kapsam denetimi.10 kaynak+12 tek ders+11 çok dersli+11 OBS=44 gerçek React/HTTP tarayıcı kontrolü;390px/klavye ve ekran görüntüsü. İki SQLite bağlantısında kaynak durdurma/eski karar formu; audit rollback; eski yerel politika koruma kontrolü geçti. İlk browser kontrolünde option devre dışılığı genel locator yerine yerel DOM `disabled` özelliği üzerinden doğrulandı; son akış geçti. Gerçek yardımcı teknoloji, kurum kabulü, dağıtık depo veya canlı smoke değildir.115 korumalı statik dosya,16 teknik tablo141 kayıt türü.
