# B09/B15/B16 — imzalı kaynak dosyası ve tarihsel karar dayanağı

Güncel ek: Paket28 `SOURCE-TRUST-CONTRACT.md` ile sürümlü bağımsız inceleme ve kaynak/anahtar kapanışları eklendi. Aşağıdaki Paket26 kayıtları bu ekle birlikte okunmalıdır.

14.10.2026 · `myys-source-packet/1` / `myys-source+jwt` · İzole yerel kabul. Gerçek UzemGO, LTI, OBS veya başka sağlayıcı kurulmuş değildir. Gerçek öğrenci, credential, üretim migration'ı ve resmî ihraç yoktur. `configuredCore()` Vercel'de kapalı kalır.

## Kullanıcının tamamladığı işlem

1. Bilgi işlem görevlisi **Aktarım ve mutabakat** ekranında yapılandırılmış sentetik kaynak sözleşmesini ve JSON dosyasını seçer. Türkçe dosya düğmesi ve dosya adı görünür; yanlış biçim veya geçersiz imza açıklamayla reddedilir.
2. Geçerli dosya 202 ile mevcut olay kuyruğuna kabul edilir. Bu, işlenme veya başarı değildir. Aynı dosya ikinci olay yaratmaz. Ayrı işleme düğmesi mevcut lease/receipt/karantina sınırlarını kullanır; kör yeniden çalışma yoktur.
3. İşlenmiş ve güncel kaynak olayı eğiticiye açılır. Eğitici **LMS kaynak olayları** üzerinden aynı öğrencinin kanıtını incelemeye alır; **Öğrenme kanıtları** ekranında teslim kimliği ve sürümü görülür.
4. Tam rubrikte insan puanı ve ayrı komisyon kararı gerekir. Kaynak notu akademik puana çevrilmez. Öğrenci **Akademik kararlar** ekranından özgün kaynak imzasını da içeren tarihsel dayanak arşivini indirir.
5. Yeni kaynak sürümü eski kanıtın yeni işlem uygunluğunu kapatır. Önceki puan, karar, içerik ve arşiv özeti değişmez; karar değişikliği mevcut itiraz zincirini izler.

Karar arşivinin dış zarfı **imzasızdır**. İçerdiği kaynak dosyasının imzası, komisyon kararının imzası veya resmî belge değildir. B12/B13 belgelendirme sınırı korunur.

## Yerel dosya ve güven sözleşmesi

Yüklenen JSON tam iki alan taşır: `format: "myys-source-upload/1"`, `token: "<kaynağın imzaladığı compact JWT>"`. Dosya en fazla 64 KB; token en fazla 50.000 karakterdir. Özel anahtar, dosya URL'si, istemci rolü veya istemcinin verdiği doğrulandı işareti kabul edilmez.

Sunucuya ait sabit sözleşme tenant/birim/program, kaynak issuer/audience, course kimliği, sözleşme/program/rubrik kaynak sürümleri, kişi eşlemesi ve en fazla sekiz açık RSA anahtarı içerir. Kurucu girdisi kopyalanır; istemci bunu değiştiremez. Bu dilimde issuer yalnız portsuz HTTPS `.invalid` köküdür. Anahtarlar yalnız RS256/2048–8192 bit; etkin veya imza zamanından sonra emekli anahtar geçerli olabilir; ele geçirilmiş anahtar kabul edilmez. Gerçek sağlayıcı güven sicili/rotasyon entegrasyonu yoktur.

İmzalı içerik şunları birlikte bağlar:

| Alan | Bağ |
|---|---|
| `iss/aud/iat/exp/jti/sub/personId` | Kaynak, tek alıcı, zaman, tek olay ve kaynak/yerel kişi. Sunucu kişi eşlemesi ayrıca karşılaştırılır. |
| `scope` | Tenant, birim, sözleşme ve sürümü, ders kimliği, kaynak program/rubrik sürümleri |
| `binding` | Yayımlanmış yerel program kimliği/sürümü ve SHA-256, rubrik özeti, görev kimliği/özeti |
| `event` | Olay türü, artan kaynak sürümü, gerçekleşme zamanı, teslim kimliği/sürümü, içerik/özeti ve kaynak notu veya tamamlanma değeri |

`grade`, `completion` ve `license-revoked` ayrı türlerdir. Tamamlanma doğru/yanlış olarak kalır; null/eksik not başarı yaratmaz. Sadece grade türü çalışma kanıtına alınır. Lisans iptali güncel uygunluğu kapatır. Önceden yetkilendirilmiş program/öğrenen kaydı gerekir; dosya öğrenci kaydı veya rol oluşturmaz.

Yerel profil azami bir günlük token ömrü ve kesin ISO UTC zaman kullanır. Compact JSON, yinelenen üyesiz ve alternatif kodlamasız olmalıdır; base64url kanonik olmalıdır. `alg/kid/typ` dışında header yoktur; payload anahtar listesi sabittir. Tokenin getirdiği JWK/URL/discovery takip edilmez. Bu dar profil bütün JWS üreticileri veya vendor şemalarıyla kendiliğinden uyumlu değildir.

## Kalıcılık, yetki ve sürüm

`LocalLmsAdapter` HMAC alımı korunur. Ortak `acceptLmsEvent` ve `processLmsEventInTransaction` mevcut kalıcı olay/işçi zinciridir; paralel örnek veri deposu kurulmadı. Eski HMAC olaylarına geriye dönük asimetrik imza atfedilmez.

Yeni `LocalSignedSourceAdapter` yalnız yetkili birimde MFA ile bilgi işlem görevlisine açıktır. İmza doğrulaması sonrasında kişinin/üyeliğin ve program bağının tekrar denetimi, olay ve audit aynı transaction içinde yapılır. İptal edilen yetki geç gelen imza sonucuyla kayıt yaratamaz. İşçinin claim, finish ve fail işlemleri de güncel yetkiyi kendi transaction’ları içinde tekrar denetler; yetkisi sonradan kaldırılan işçi receipt veya karantina yazamaz. Aynı olayın farklı içeriği çakışmadır; aynı kaynak sürümünün başka olayı da çakışmadır. Sırasız eski olay yeni sürümü geri açmaz. İki SQLite bağlantısı denetlendi; dağıtık üretim kabulü değildir.

Özgün kaynak JWT'si öğrenme kanıtıdır; giriş bearer tokeni değildir. Olayın `sourceProof` alanı, kanıtın `sourceProofDigest` özeti, değerlendirmenin `evidenceDigests[].source` anlık kopyası ve karar arşivi birbirine bağlıdır. Görev/teslim/kişi/hash/zaman değiştirilirse bütünlük veya imza doğrulaması başarısız olur. Ham çalışma ve kaynak subject kişisel veri sayılır; yalnız ilgili kişi/yetkili birim görünümündedir. Gerçek saklama, dosya/backup envanteri ve imha kabulü B04/B28 kapsamında açıktır.

## HTTP ve bağımsız doğrulama

`/api/myys/kaynak-al` POST → 202 kabul; `/kaynak-isle` POST → mevcut worker sonucu; `/kaynak-guveni` POST → ayrı açık güven kaydı. Oturum, doğru sözleşme ve yetkili birim gerekir. Adaptör yokken 503. Ana çalışma görünümü yalnız uygun kişiye sözleşme seçeneği verir. Bu yollar varsayılan üretim ayarıyla etkin değildir.

```bash
python gazi/auth/scripts/verify-source-archive.py karar-arsivi.json --trust kaynak-guveni.json
```

Doğrulayıcı Python standart kitaplığı ve OpenSSL kullanır; uygulama/JOSE/çekirdek kodunu içe almaz, ağa çıkmaz, özel anahtar kullanmaz. **Ayrıca güvenilen** açık kaynak dosyası zorunludur; arşivin içindeki bir anahtarı kendiliğinden güvenilir saymaz. Güven ihracının tazelik sınırı beş dakikadır. Operatör güven dosyasının doğru kaynaktan geldiğini ayrıca sağlamalıdır; bu sentetik dosya kurumsal kök güveni değildir.

İmza, kaynak sözleşmesi, program/rubrik/görev/teslim/kişi bağları, içerik özetleri ve tam rubrik puan hesabı kontrol edilir. Tarihsel token kabul anındaki süreye göre incelenir; key trust dosyası güncel olmalıdır. Dış karar zarfının özeti yeniden üretilse bile değişmiş kaynak metni, imza, sürüm veya rubrik hesabıyla çelişen puan reddedilir. İnsan puanlarını ve imzasız karar zarfını birbiriyle tutarlı biçimde yeniden yazma, kaynak imzasıyla tespit edilemez; akademik kararın ayrı imzası bu dilimde yoktur. Yalnız yerel sınırlı JSON modelinin özetlemesi desteklenir; genel RFC 8785 iddiası yoktur. Çıktı açıkça `academicDecisionSignature: false`, `currentEligibilityVerified: false` bildirir. Çevrimdışı dosyadan güncel itiraz, lisans veya kurum kararı sonucu türetilmez.

## Kaynak ve açık kalanlar

14.10.2026 incelemesi: [IETF RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html), Mayıs 2015, §5.1–5.2 ve §6: imza girdisi, doğrulama ve güvenilen anahtar seçimi. [IETF RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html), BCP 225, Şubat 2020, §3.12: amaçlar arasında farklı tür/alıcı/doğrulama koşulları. Bunlar teknik kaynaklardır; yerel paket şeması ekip tasarımıdır, resmî LMS veya Gazi usulü değildir.

Gerçek sağlayıcı örnek dosyası, kişi/ders/program/rubrik sürüm eşlemesi, lisans sözleşmesi, anahtar yetkisi ve taşıma protokolü dış kabule bağlıdır. Paket26 statik güven sınırından sonra Paket28 kaynak sicili/ayrı inceleme/iptal yayılımı yerel dilimi tamamlandı; bkz. SOURCE-TRUST-CONTRACT.md. Gerçek üretim depo/worker adaptörü ve onaylı sağlayıcı kabulü açık. B09/B15/B16 genel kabulü kapanmış sayılmaz. Yeni canlı yayın ve smoke ayrıca açık kalır.


## Paket30 — ayrı kayıt bildirimi profili

LMS-REGISTRATION-CONTRACT.md yeni myys-source-registration/1 biçimini, kayıt iptali/yeniden kayıt ve ilerleme görünümünü tanımlar. Önceki myys-source-packet/1 grade/completion/license-revoked alanları değişmedi. Yeni kayıt biçimi gerçek LMS standardı değildir. Bağımsız arşiv doğrulayıcısı tarihsel grade imzasını doğrular; güncel registration uygunluğunu doğruladığı iddia edilmez.
