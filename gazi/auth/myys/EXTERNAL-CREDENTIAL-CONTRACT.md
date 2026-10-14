# B21 — Dış belge imzası ve düzenleyici güveni

Sürüm 2026.10.14.49. Yalnız sentetik LocalAcceptanceStore / `.invalid` düzenleyici / geçici test anahtarları. Üretim bağlantısı, yeni gerçek credential, kurumsal tanıma veya genel W3C/Open Badges uygunluk iddiası yoktur.

## Görünür akış

Tanıma ve kredi → Dış belge düzenleyicileri: bilgi işlem sunucuda tanımlı kaynağı, açık anahtar ve kişi eşleme dayanaklarıyla hazırlar. Ayrı yönetici kaynak/kişi/amaç için üç teyitle inceler. Öğrenci listesi ve özel anahtar arayüze gönderilmez. Başvurular ve kararlar → Belge teslimi: yetkili bilgi işlem arşivlenmiş gerçek dosyanın imzasını denetler; öğrenci ve akademik roller makbuzun güncel durumunu görür.

Sonuç **imza ve kişi eşlemesi** içindir. İnsan teknik raporu ayrı kalır; otomatik teknik kabul, kredi, kurul kararı veya OBS olayı oluşmaz. `statusChecked` ve `academicAccepted` daima false. Kaynak kapanışı makbuzun güncel kullanımını kapatır; geçmiş makbuzu ve akademik kayıtları silmez/değiştirmez. Mevcut insan raporu yolu bu imza makbuzuna henüz zorunlu bağlanmış değildir; bu sonraki bağımsız dilimdir.

## Kaynak sözleşmesi

`myys-external-issuer/1`: kurum, birim, yayımlanmış program, düzenleyici, audience, sürüm, amaç profili; özel sunucu kişi eşlemesinin SHA/count'u ve 1–8 RSA açık anahtarı. Profil `myys-vc-jwt-rs256-local/1`, yalnız 2048–8192 bit RS256. JWK özel alanları reddedilir. Dışarıdan sunulan JWT/JWK/URL hiçbir zaman anahtar veya kişi eşlemesi kaynağı değildir. LMS ve IdP sözleşmesi bu amaçla yeniden kullanılmaz.

Üç komut: `recognition-issuer`, `recognition-issuer-review`, `recognition-issuer-state`. Tam program/kaynak SHA, ayrı yönetici incelemesi, süre, önceki sürüm ve güncel IT/admin görevleri denetlenir. Yeni taslak eski adaptörün yeni doğrulamasını kapatır. Kaynak emekliye ayrılabilir/geri çekilebilir; anahtar emekliye ayrılabilir/riskli işaretlenebilir. Kapanış geri alınamaz. Aynı kid başka anahtara bağlanamaz, anahtar birimler arasında paylaştırılamaz, kapalı anahtar yeni sürüm/kimlikle açılamaz. Ham eşleme yalnız enjekte edilen yerel adaptör yapılandırmasındadır; değiştirilebilir dış referans klonlanır.

## İmza denetimi ve son işlem bariyeri

POST `dis-belge-dogrula`: oturum, IT/MFA, aynı kurum/birim/program, kendi belgesini incelememe ve güncel öğrenci üyeliği. Bağsız doğrulayıcı 503; üretimde `configuredCore()` kapalı kalır.

Dosya yalnız B21 teslim arşivinden okunur; tarayıcı doğrulanacak JWT veya güvenilir iddia gönderemez. Sınırlı profil: compact canonical base64url/JSON, `typ=vc+jwt`, isteğe bağlı `cty=vc`, sabit RS256 ve kayıtlı kid. Header URL/JWK/crit gibi desteklenmeyen alanlar, yinelenen JSON üyeleri, farklı kodlama/serileştirme reddedilir. JOSE `jwtVerify` imzayı/issuer/audience ve imza süresini denetler. İmza zamanı ile belgedeki `validFrom`/`validUntil` ayrı kontrol edilir. `iss`/`issuer`, `sub`/`credentialSubject.id`, `jti`/`id` ve talep belge kimliği eşit olmalıdır. Sunucu eşlemesi gerçek yerel talep sahibini göstermelidir.

Bu sürüm yalnız tek VC v2 context'i, tek `VerifiableCredential` türü, tek `credentialSubject.id` ve izinli temel alanları destekler. JSON-LD genişletme/semantik doğrulama, Open Badges ekleri, çoklu subject, credentialStatus/schema, DID/ağ keşfi, SD-JWT, COSE ve VP desteklenmez. Bilinmeyen profil kapalıdır. Bu ek sınırlar yerel uygulama profilidir; standarttaki her geçerli belgeyi kabul ettiği söylenmez.

Asenkron imza işleminden sonra aynı SQLite transaction içinde kişi/oturum/görev, dosya ve talep SHA, kaynak/inceleme sürümü, anahtar durumu ve süre yeniden denetlenir. Yetki kaldırılır veya anahtar kapanırsa makbuz yazılmaz. `recognition-verification` ve audit atomiktir; aynı dosya+güven sürümü tek makbuz verir. Makbuz raw JWT/claim/özel eşlemeyi içermez. Kişi özeti pozitif alan şemasını kullanır; kanıt geçmişi ile güncel kullanılabilirlik ayrı gösterilir.

## Okunan teknik kaynaklar

- RFC 8725, BCP 225, Şubat 2020; erişim 14.10.2026. https://www.rfc-editor.org/rfc/rfc8725.html . Okunan kapsam §3.1–3.3 ve §3.4–3.12: algoritma/anahtar kontrolü, UTF-8, issuer-subject-audience, güvenilmeyen header adresleri ve JWT amaç ayrımı. Kurum kararı değildir. Bu ilkeler sabit algoritma, bağımsız güven kaynağı ve birbirine karışmayan doğrulama profillerine uygulandı.
- W3C *Securing Verifiable Credentials using JOSE and COSE*, Recommendation **13.10.2026**, https://www.w3.org/TR/2026/REC-vc-jose-cose-20261013/ ; latest sayfası 14.10.2026 okundu. İncelenen kapsam §1.1.2.1, §3.1.1, §3.1.3, §5.1 ve §5.4. İmza güvenliği ve belge iddialarının yorumlanması ayrıdır; `vc+jwt`/`vc` türleri, `vc`/`vp` claim sınırı ve imza zamanı-belge geçerliliği ayrımı esas alındı. Şema/durum ve genel JSON-LD uygunluk kabulü yapılmadı; dış test süiti çalıştırılmış sayılmaz. 2025 veya taslak sürümler otomatik olarak güncel kaynak yerine kullanılmadı.

## Kalan bağımsız ve kurumsal işler

1. Doğrulama makbuzunu seçili insan teknik raporuna bağlama; durum/iptal inceleme dayanağı, güven kapanışının yeni karar/OBS kullanımına etkisi ve yeniden inceleme akışı.
2. Desteklenecek gerçek dış belge profili/status/schema ve bağımsız doğrulama testleri. Geniş standart uygunluğu ve gerçek düzenleyici kabulü açık.
3. Kurumun onaylı kaynak/anahtar/kişi eşlemesi, gerçek önceki ders/kazanım verisi, yetkili kurul ve başvuru/teslim usulü; üretim depo/tarama/saklama ve gerçek bağlantı kabulü.

Kanıt: `tests/myys-recognition-verifier.test.mjs`, `scripts/myys-external-credential-browser.cjs`, `acceptance/B21-external-20261014.json`. B01–B36 özgün kimlik/bağımlılık/ölçütleri değişmez.
