# B13 yerel anahtar sicili — 2026-10-10

## Kapsam

Yalnız LocalAcceptanceStore ve sentetik yerel düzenleyici. Vercel yolu kapalıdır. Üretim anahtarı okunmadı, taşınmadı veya döndürülmedi. Özel anahtar yalnız geçici test sürecinin belleğindedir. Sicil; açık RSA JWK, SHA-256 anahtar özeti, hazırlayan, ayrı inceleme, rotasyon bağlantısı ve gerekçeli durum olaylarını tutar.

BT açık anahtarı hazırlar; ayrı yönetici kabul veya ret verir. Kimlik ve anahtar özeti kurum içinde tekrar kullanılamaz. RS256, 2048–8192 bit RSA ve 65537 üssü bu yerel profilin teknik seçimidir; bir hukuk veya üniversite kararı değildir. Özel JWK alanları ve tanınmayan parametreler reddedilir.

## Yaşam döngüsü

Etkin anahtar yeni imza atabilir. Emekliye ayrılan anahtar yeni imza atamaz; daha önce sicile kaydedilmiş geçerli imzası doğrulanabilir. Ele geçirilmiş anahtar geri açılamaz; yeni anahtar ayrı kayıt ve inceleme ister. BT gerekçeli güvenlik olayını gecikmeden kaydedebilir; akademik not veya kurul kararı değişmez. İncelemecinin daha sonra görevden ayrılması tarihsel kriptografik güveni kendiliğinden iptal etmez; anahtarın kullanım durumu ayrı kayıttır.

İmzalama öncesi ve sonrasında aynı kişi/profil/karar/anahtar yetkisi aranır. Doğrulama sonrasında güncel erişim ve belge durumu yeniden okunur. Cüzdan, anonim paylaşım özeti, teslim teyidi ve kontrollü grup kapısı aynı anahtar güvenini kullanır. Ele geçirilme resmî akademik iptal değildir; belgenin güvenilirliği kapatılır. Ayrı bağlantı güncel durumu hemen görür.

## Yerel olay provası

1. BT yeni açık anahtarı kaydeder; ayrı yönetici gerekçeyle inceler.
2. Atanmış belge görevlisi geçerli karar/profil üzerinden sentetik belgeyi imzalar. Öğrenen özel cüzdanından indirir.
3. BT eski anahtarı emekliye ayırır: eski belge kullanılabilir, yeni imza kapalıdır.
4. BT ele geçirilme olayını dayanağıyla kaydeder: doğrulama/indirme/paylaşım/teslim kapanır; kayıtlar silinmez.
5. Yeni anahtar eski anahtara rotasyon bağlantısıyla hazırlanır. Yeniden belge düzenleme B11 inceleme zincirine bağlı ayrı iştir; otomatik başarı veya resmî belge üretilmez.

## Kaynak, sürüm ve sınırlar

1EdTech Open Badges 3.0, doküman 1.4.5 (2026-06-29), https://www.imsglobal.org/spec/ob/v3p0/; 2026-10-10 tarihinde §8.2.3–8.2.6, §8.4 ve §9.1 okundu. JOSE imzası, anahtar kimliği, issuer ve kimlik/zaman bağlarının doğrulanması yerel tasarımı destekler. Anahtar saklama/rotasyon işletim kabulü standarda uygunluk iddiasıyla ikame edilmez. Şema kontrolü sertifikasyon değildir.

W3C Bitstring Status List v1.0, Recommendation 2025-05-15, https://www.w3.org/TR/vc-bitstring-status-list/; 2026-10-10 tarihinde §2–4 okundu. İptal kalıcı, askı geri alınabilir durumdur; statusPurpose ayrımı korunmalıdır. Anahtar güveni, belge iptali ve açık itiraz aynı olay değildir. Durum listesi adaptörü bu dilimde henüz tamamlanmadı; mevcut yerel belgenin kamu status endpoint'i varmış gibi gösterilmez.

Kalan: imzalı durum listesi ve önbellek/TTL/bozuk veri kabulü; bağımsız araçta ihracat doğrulaması (B19); gerçek imza sağlayıcısı ve işletim anahtar rotasyonu kabulü.
