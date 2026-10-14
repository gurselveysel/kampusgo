# Açık anahtar sicili — aynı SQL kişi ve inceleme zinciri

Paket75, 14.10.2026. B13'ün açık anahtar metadata, ayrı insan incelemesi ve durum geçmişi SQL zincirine bağlanır. Özel anahtar, KMS hizmeti, gerçek kurum anahtarı veya imzalama yetkisi oluşturulmaz.

## Ekran ve kapsam

“Anahtar ve belge durumu” ekranında bilgi işlem görevlisi yalnız açık JWK, gerekçe ve sorumluluk dayanağı kaydeder; ayrı yönetici uygun/uygun değil incelemesi yapar. Yeni anahtar önceki incelenmiş kayda bağlanabilir. Anahtar kullanımındaki emeklilik ve ele geçirilme durumları gerekçeleriyle görünür. Arama boş sonucunu belirtir; uzun durum rozeti dar ekranda sarılır.

İmza sağlayıcısı bağlı olmayan SQL kapsamı, uygun metadata incelemesini “İmzalama bağlı değil” açıklamasıyla gösterir. İmzalama ve durum listesi güncelleme düğmesi açılmaz. Kamuya açık doğrulama hizmeti varmış gibi sunulmaz. Eski SQLite kabulünün mevcut imza, durum listesi ve doğrulama davranışı korunur.

SQL kapsamı28 komut/28 akademik kayıt türüdür; aynı16 şema adayı kullanılır.108 komutun SQL aktarımı açıktır. `key-register`, `key-review`, `key-state` mevcut iş kurallarını kullanır; yalnız keyCommand etkin özel SQL çalışma kümesini kabul eder. `signingKey` fabrikasının LocalAcceptanceStore sınırı korunur. Genel nesne, prototip taklidi veya kapanmış küme yetki vermez.

## Açık anahtar ve görev sınırları

Mevcut yerel RS256 profili korunur: RSA2048–8192bit, kanonik base64url modulus, sabit exponent, yerel `.invalid` issuer/kid ve yalnız izinli JWK alanları. Özel anahtar alanları, uzaktaki anahtar adresleri ve bilinmeyen alanlar reddedilir. Yeni kabul testlerinde yalnız bellek içinde oluşturulan sentetik anahtar çiftinin açık kısmı kullanılır; özel erişim veya kalıcı credential üretilmez. Saklanan metadata `privateKeyStored=false`, `official=false` taşır.

Kişi/kurum/birim/MFA/oturum işlem başı ve sonunda denetlenir. Bilgi işlem kaydeder ve kullanım durumunu değiştirir; farklı yönetici inceler. Aynı kişi iki rolü taşısa bile kendi kaydını inceleyemez. Öğrenen veya akademik görevli anahtar yönetim formuna geçemez. Aynı kid veya açık anahtar parmak izi kurum içinde tekrar kullanılamaz. Rotasyon öncülü aynı birimde incelenmiş olmalıdır.

## Değişmez durum ve atomiklik

İnceleme yoksa bekleyen, olumsuzsa reddedilmiş, uygunsa etkin metadata durumu oluşur. Etkin anahtar emekli veya ele geçirilmiş olabilir; emekli anahtar sonradan ele geçirilmiş kaydına geçebilir. Beklenen önceki durum zorunludur. Ele geçirilmiş veya reddedilmiş anahtar yeniden açılamaz; yeni anahtar ayrı kayıt ve inceleme gerektirir. Akademik karar veya not değiştirilmez.

Aynı komut tekrarında tek kayıt kalır; başka içerik aynı kimliği kullanamaz. Tarihsel komut makbuzu güncel durumu geri almaz. Görev kaybı tekrar isteğini kapatır. Anahtar/inceleme/durum, komut makbuzu ve denetim izi aynı SERIALIZABLE işlemde yazılır; denetim hatası hepsini geri alır. Birleşik checkpoint eski yedeğin ele geçirilme kaydını silmesini reddeder. PGlite sıralanmış tek bağlantı yarış kabulü native çok bağlantı/SSI/RLS kanıtı değildir.

## Açık koşullar

Bu dilim gerçek imza hizmeti, anahtar emaneti/rotasyon usulü, durum hizmeti, bağımsız doğrulayıcı veya kurum yetkisi kabulü değildir. Yerel SQL imzasız hazırlıklar imzalı hale gelmez; paylaşım ve doğrulama paketi kapalıdır. Gerçek KMS/depo/checkpoint, kurum olay müdahalesi ve dış doğrulama kabulü açık kalır. `configuredCore()` Vercel'de kapalı; son canlı16, bu dilim yayımlanmadı. B13 veya B01–B36 bütünü tamamlanmadı.

## Yerel doğrulama

Paket75:10yeni SQL/HTTPS testi;933sunucu+59portal+46regresyon=1038.66SQL+11mevcutanahtar=77tarayıcı.136komut/18HTTP için9035pozitif72280türetilmiş negatif SQLite kapsam örneği;115statik paket. İlk testte aynıvarsayılan kid çakışması düzeltilerek incelenmemiş öncül koşulu ayrı anahtarla sınandı. İlk tarayıcı yenileme sonrası kayıt yüklenmeden sayım yapıyordu; iki kaydın yüklenmesi beklendi ve son66 kontrol geçti. Ürün yetkisi gevşetilmedi; ilk başarısız koşular kabul sayılmadı. Mobil tam sayfa görüntüsünde iki durum rozeti ve anahtar özetleri incelendi. [Kanıt](acceptance/B13-key-sql-20261014.json).
