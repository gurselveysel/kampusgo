# B09/B15/B16 — kaynak güven sicili ve kapanış zinciri

14.10.2026 · Paket28 · İzole yerel kabul. `SOURCE-PACKET-CONTRACT.md` üzerindeki statik güven dilimini tamamlar. Gerçek LMS, kurum IdP'si veya üretim deposu bağlanmadı. Resmî yetki, yeni credential, migration veya gerçek öğrenci işlemi yoktur.

## Ekran ve tamamlanan yerel işlem

**Kaynak güven sicili** ekranında bilgi işlem görevlisi sunucuda tanımlı açık kaynak sözleşmesini, geçerlilik tarihlerini ve kaynak/kişi-ders eşleme dayanaklarını hazırlayıp incelemeye verir. Sunucunun ham kişi eşleme listesi gösterilmez; yalnız SHA-256 özeti ve eşleme adedi kayıtlıdır. Açık anahtarlar, kaynak/ders/program/rubrik sürümleri ve kapsam aynı sözleşmeye bağlıdır.

Hazırlayandan ayrı bir yönetici tam sürüm özetiyle gerekçeli kabul/ret verir. Yeni taslak yeni dosya alımını durdurur; önceki kabul anında güvenilir bulunan kanıtı tek başına geçersizleştirmez. Reddedilmiş sürüm yeni bir hazırlıkla düzeltilebilir. **Aktarım ve mutabakat** kaynağın alıma kapalı olduğunu açıklar; etkisiz dosya/işleme düğmeleri sunulmaz. İncelenmiş, zamanı gelmiş, süresi dolmamış ve sunucu sözleşmesiyle birebir eşleşen sürümden dosya alınabilir.

Kapanışlar ayrı gerekçe ve olay referansı ister. Aynı kaynağın sözleşme kapanışı tüm inceleme sürümlerine, aynı açık anahtar parmak izinin kapanışı o birimde onu kullanan bütün sürümlere uygulanır. Kapanış geri alınamaz. Anahtar riski ana ekranda da görünür; ayrıntıların içinde gizli kalmaz. Arama, yeni sürüm hazırlığında alan odağı, 390 px görünüm ve klavyeyle ayrıntı açma denetlendi.

## Kayıt, sürüm ve yetki

| Kayıt/işlem | Bağ ve sınır |
|---|---|
| `source-contract` | Açık descriptor, program özeti, kişi eşleme özeti/adedi, kaynak sürümü, kaynak/eşleme dayanağı, tarih aralığı, artan inceleme sürümü, tam önceki kayıt ve değişiklik gerekçesi. Bilgi işlem + MFA. |
| `source-contract-review` | Son sürümün SHA-256 özeti, kabul/ret ve gerekçe. Hazırlayandan ayrı yönetici + MFA. |
| `source-trust-state` | İncelenmiş kaynak/anahtar hedefi, beklenen güncel durum, yeni durum ve olay dayanağı. Bilgi işlem + MFA; atomik audit ve tekrar koruması. |
| Olay `sourceProof` | Özgün kaynak JWT'sine ek olarak `trustRecordId` ve değişmez `trustDigest`. Bunlar kaynak JWT'sini değiştirmez; alımda kullanılan yerel güven dayanağıdır. |

Descriptor tam `myys-source-contract/1` alanlarıdır: tenant/birim/program, kaynak kimliği/adı, issuer/audience/ders ve dış sürümler, mappingDigest/mappingCount, 1–8 RS256 açık anahtar. Yalnız HTTPS `.invalid` kaynak; RSA 2048–8192 bit. Özel anahtar/ek alan, aynı kid ile farklı açık anahtar, birimler arasında aynı anahtar veya aynı kaynak-ders-program zincirini yeni kimlikle yeniden kurma reddedilir. Riskli parmak izi yeni sürümle yeniden açılamaz. Yeni sözleşmedeki başlangıç anahtar durumu etkin olmalıdır; kapanış ayrı sicil işlemidir.

İnceleme sürümü ile dış kaynak sözleşme sürümü farklıdır. Tarih/dayanak yeniden incelemesi aynı dış sözleşme üzerinde yeni inceleme sürümü oluşturabilir. Anahtar rotasyonu veya dış sözleşme değişikliğinde yeni açık yapılandırma, yeni inceleme ve sunucu adaptörünün eşleşen yapılandırması birlikte gerekir. **Bu ekran sunucu yapılandırmasını veya gerçek sağlayıcı bağlantısını kendiliğinden değiştirmez.** Yeni anahtar/dış sürüm ve eski sürümün ayrı güven ihracı yerel testte doğrulandı; gerçek sağlayıcı anahtar sahipliği ayrıca teyit edilmelidir.

## Durumların etkisi

| Durum | Yeni alım | Kabul edilmiş eski dayanak |
|---|---|---|
| Taslak/ret/başlangıcı gelmemiş/süresi dolmuş inceleme | Kapalı | Önceki kabulün kendi tarih/sürüm dayanağı korunur |
| Sözleşme emekliliği | Kapalı | Kapanıştan önce kabul edilmiş dayanak korunur |
| Anahtar emekliliği | O anahtarla kapalı | Önceki imzalı dayanak korunur; bağımsız doğrulayıcı ayrıca kaynak imzasının anahtar geçerlilik/emeklilik zamanını denetler |
| Sözleşme güven iptali | Kapalı | O kaynağa dayanan kanıtın güncel kullanımı kapalı |
| Anahtar riski | O anahtarla kapalı | O anahtara dayanan kanıtın güncel kullanımı kapalı |

Güncel kapanış kanıt alma/puanlama, akademik karar uygunluğu, yeni imza, cüzdan indirme, paylaşım ve doğrulamaya aynı zincirden yayılır. Eski durum listesi güncel sayılmaz; yeniden hazırlanan listede akademik uygunluk askıya yansır. Akademik puan veya geçmiş karar değiştirilmez; otomatik yeni karar veya otomatik belge iptali üretilmez. Belge iptali mevcut yetkili işlem olarak ayrıdır.

Kuyruktaki olay da sonuç transaction'ında güncel güveni yeniden denetler. Kapanış sonrasında receipt üretilmez; hata karantinaya alınır. Asenkron imza denetlenirken kapanan güven olay commit edemez. Başka bağlantıdaki iptal hemen görülür. Üretim dağıtık/region kabulü değildir.

Paket26'da yalnız statik güvenle alınmış eski kayıtlara geriye dönük inceleme yazılmaz. Sicil bağı bulunmayan kaynak kaydı/historik arşiv korunur; yeni akademik kullanımı kapalıdır. Aynı dosyanın tekrarı eski proof'u değiştirmez. Gerekli yeni incelemeden sonra yeni imzalı kaynak sürümü alınmalıdır. HMAC yerel kabul sınırı ayrı kalır; eski HMAC kanıtları asimetrik sicil onayı almış gibi gösterilmez.

## Tarihsel güven dosyası ve bağımsız kontrol

Her incelenmiş sürüm için **Bu sürümün açık güven kaydını indir** düğmesi vardır. `/kaynak-guveni` isteği isteğe bağlı `trustRecordId` ile aynı kaynak/birimdeki tarihsel descriptor'ı seçer. Anahtar/kontrat durumları daima güncel sicilden gelir. Dosya, aynı descriptor için kabul edilmiş yerel inceleme kimliklerini/özetlerini ve tarihlerini `approvals` içinde taşır; ham kişi eşlemesi veya özel anahtar taşımaz. Tazelik yine beş dakikadır; daha önce indirilmiş dosya bu süre içinde sonraki kapanıştan habersiz kalabilir. Çevrimdışı tazelik mutlak güncellik değildir. Kaynak anahtarı riskli veya sözleşme iptal edilmişse dosya bunu saklamaz.

`verify-source-archive.py` ayrı Python/OpenSSL doğrulayıcısı kaynak JWT'si, program/rubrik/görev/teslim bağları yanında güven dosyasındaki inceleme referansı ve zamanlarını denetler. Arşivdeki onay bağı değiştirilip bütün imzasız dış özetler yeniden hesaplansa da ret gelir. Güncel sicil içeren güven dosyası verildiğinde arşivden sicil alanlarını silerek eski profile düşürme de reddedilir. Sonuç `sourceApprovalReferencesVerified` ile bu referans kontrolünü açıkça ayırır.

**Güven dosyası ve akademik karar zarfı imzalı kurumsal karar değildir.** Doğrulayıcı güven dosyasını ayrıca güvenilen yerel operatör girdisi olarak kullanır; dosyanın kaynağını/imzasını kendiliğinden doğrulamaz. Akademik insan puanlarının ve imzasız dış zarfın tutarlı biçimde yeniden yazılması, LMS kaynak imzasıyla tespit edilemez. `academicDecisionSignature:false`, `currentEligibilityVerified:false`, `official:false` sürer. Eski statik güven dosyasıyla eski profilin kriptografik kontrolü yerel inceleme referansını doğrulamış sayılmaz. Güncel durumu öğrenmek için güncel ayrı güven dosyası gerekir.

## Kanıt, kaynak ve kalan kabul

15 yeni yaşam döngüsü testi: bağımsız ret/kabul, sürüm/tarih, eşleme/config değişimi, rol/MFA/kapsam, anahtar çakışması, emeklilik/risk/kontrat iptali, cüzdan/paylaşım/durum yayılımı, asenkron yarış, karantina, atomic audit/replay, Vercel kapısı, yeni anahtar/eski arşiv ihracı ve eski statik kayıt. Son otomatik ve tarayıcı sonuçları `acceptance/B09-trust-20261014.json` içindedir. Tarayıcıda gerçek form → ret → yeni sürüm → ayrı onay → dosya/kuyruk → insan rubriği/karar → yeni taslak → anahtar riski → aynı arşiv/güncel ret tamamlandı.

Teknik kaynaklar, 14.10.2026 okunmuş [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515.html) §5.1–5.2/6 ve [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html) §3.12'dir; önceki kaynak kaydı `SOURCE-PACKET-CONTRACT.md` içindedir. Yukarıdaki yerel sicil şeması ve durum makinesi proje tasarımıdır; IETF veya Gazi tarafından belirlenmiş kurumsal usul diye sunulmaz.

B09'un sürümlü ayrı kaynak incelemesi ve kapanış yayılımı bağımsız yerel dilimi kapandı. **B09/B15/B16 bütün kabulü kapanmadı.** Gerçek sağlayıcı dosyası/kişi-ders-rubrik eşlemesi ve haklar, anahtar yetkisi, taşıma/üretim depo/worker/backup adaptörü, gerçek dış kabul ve canlı doğrulama açıktır. Son canlı Paket16; Paket17–28 dağıtımı yoktur. `configuredCore()` Vercel'de kapalıdır.
