# Yeniden imzalı belge ve tekil kredi

Sürüm 2026.10.14.51. B21, yalnız izole yerel kabul. Kullanıcı gereksinimi: aynı kazanım ikinci kredi oluşturmaz. Bu dilim dosya baytları değişse bile aynı doğrulanmış belge ve aynı çıktı kimliğinin tekrar sayılmasını önler; tüm anlamsal eşdeğerlikleri otomatik tespit ettiği iddia edilmez.

## Kimliğin kaynağı

Yeni karar için güncel teknik raporun sabitlediği imza makbuzu kullanılır. Makbuzun tam özeti, talep özeti, kişi/birim, arşiv kaydı özeti, dosya özeti ve belge kimliği karşılaştırılır. Kimlik, aynı kurum ve yerel kişi kapsamında **doğrulanmış issuer + credentialId + kanonik sourceOutcomeKey** bileşiminden türetilir. Çıktı anahtarının boşluk/NFKC/büyük harf normalizasyonu mevcut tanıma modeliyle aynıdır; issuer ve belge URI'si keyfî biçimde yeniden yazılmaz.

Öğrenenin serbest metin düzenleyici adı veya istemcinin gönderdiği kimlik özeti güven kaynağı değildir. Anahtar, dosya özeti ve imza zamanı kimliğe katılmaz; bunlar yeni imzalı nüshada değişebilir. Dış `sub` farklı bir onaylı eşlemeyle aynı yerel kişiye bağlanırsa kişi yine aynı sayılır. Ham dış kişi kimliği yeni bir kayda veya ekrana kopyalanmaz.

Eski kredi için **kararın sabitlediği eski teknik rapor ve makbuz** okunur; son rapor kullanılmaz. Bu tarihsel kimlik bugünkü anahtar/geçerlilik durumundan bağımsızdır. Kredi bekletilmiş olsa da defterden ters kayıtla kaldırılana kadar ikinci kredi kontrolünde yer tutar. Mevcut kayıtlara yeni alan yazılmaz, migration yapılmaz; iç kimlik özeti arayüze veya kişi özetine eklenmez.

## Karar ve ekran

Mevcut kazanım anahtarı, hedef ders ve dosya/çıktı kontrollerine bu doğrulanmış kimlik kontrolü eklenir. Kapsam mevcut tekil defterle aynıdır: aynı kurum/öğrenen/hedef diploma programı. Ayrı doğrulanmış düzenleyici, ayrı belge kimliği, ayrı kişi veya ayrı insan eşlemeli çıktı kimliği birbiriyle karıştırılmaz.

Çok dersli teklifte satırlar aynı işlem içinde denetlenir. İkinci satır aynı çıktıyı tekrar krediye çevirirse ilk satırın kararı/kredisi ve denetim kaydı da geri alınır. İki SQLite bağlantısından önce açılmış form, ilk kredi kaydedildikten sonra ikinci kredi yazamaz.

Tanıma ve kredi ekranı mevcut krediyle çakışan talebe açıklama gösterir; tam/kısmi karar seçenekleri kapanır. Çok dersli teklifin ilgili satırı da pozitif krediye kapanır. Teknik role başka akademik kredi bilgisi açılmaz. Öğrenci itirazı veya teknik raporun yenilenmesi krediyi boşaltmaz. Ancak bağımsız olumsuz kararın ters kaydı yeni nüshanın yeniden incelenmesine izin verir; eski karar ve yeni karar geçmişte birlikte durur.

## Kabul ve açık sınırlar

`myys-recognition-identity.test.mjs` gerçek RSA imzalı farklı baytları, anahtar kapanışı/yeni anahtar, eski kararın teknik bağı, bağımsız ters kayıt, düzenleyici/belge/kişi/çıktı ayrımını, toplu rollback ve iki bağlantıyı sınar. `myys-recognition-identity-browser.cjs` iki gerçek sentetik nüshayla kredi → ikinci talep engeli → itiraz → bağımsız red → yeni nüsha kararı akışını yürütür; mobil, klavye, rol ve yeniden yükleme kontrolleri vardır.

`sourceOutcomeKey` hâlâ insan tarafından eşlenir; mevcut sınırlı imza profili imzalı başarı/çıktı ontolojisini taşımaz. Farklı çıktı etiketlerinin aynı akademik kazanım olduğunu belirlemek gerçek müfredat, önceki ders ve yetkili uzman incelemesini gerektirir. Arşivsiz eski elle incelenmiş kayıt için doğrulanmış issuer uydurulmaz; mevcut manuel kazanım/ders/dosya kontrolleri sürer. Genel VC/status/schema/başarı profili, gerçek kurum/OBS kabulü ve üretim deposu açıktır. B21 bütün kabul alanlarında tamamlandı sayılmaz.

`configuredCore()` Vercel'de kapalı; gerçek kişi, kurum belgesi, veri aktarımı veya üretim migration'ı yoktur. Ayrıntılı güncel kabul sayıları `acceptance/B21-identity-20261014.json` içindedir.
