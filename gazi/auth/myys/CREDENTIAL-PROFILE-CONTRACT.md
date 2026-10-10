# B12 belge profili ve ihraç yetkisi — local-2026.10.10.1

Belge profilleri ekranı, program sürümünün akademik kararıyla yerel ihraç hazırlığı arasındaki zorunlu yetki bağını kurar. Yalnız izole yerel kabul deposu; gerçek kurum belgesi veya yetki ataması değildir. configuredCore Vercel'de kapalıdır.

## Yerel sözleşme

- Yönetici mevcut mikro yeterlilik programına profil hazırlar. Kurum yetki sicili farklı bir yönetici tarafından incelenmiş olmalı; aynı birimde, aynı hizmet yolunda ve programın dört sorumluluğuyla birebir eşleşmelidir.
- Profil program kimliği/sürümü/içerik özeti, yetki sicili ve inceleme kimliği/içerik özeti, kaynak sürümü, 11 alanın ayrı işaretlenmesi, kapsam gerekçesi, açık UTC bitiş zamanı ve etkin kişi bazlı belge görevlilerini saklar. Hukuki düzenleyen ile teknik imza görevi tek yetki gibi kabul edilmez.
- Hazırlayanlardan ve atanmış belge görevlilerinden ayrı komisyon profil incelemesi yapar. Pilot etiketi, sabit sentetik düzenleyen ve yerel çıktı biçimi değiştirilemez. Merkezi SEM yolu bu profili kullanamaz.
- Profil olmadan, inceleme yokken, süre dolduğunda, inceleme görevlisi yetkisizken veya işlem kişisi profilin atanmış belge görevlisi değilken ihraç hazırlığı reddedilir. Başarı kararı, güncel kanıt ve itiraz denetimi ayrıca sürer.
- Yeni profil taslağı yeni ihraç hazırlığını inceleme bitene kadar kapatır. Eski sürümler korunur. Hazırlanmış ihraç kendi sabit profiline bağlanır; imza öncesi ve sonrası aynı profil/yetki/süre tekrar denetlenir. Bu eski ihraç, yeni profil taslağına sessizce taşınmaz.
- Profil kullanımını durdurmak yeni hazırlık ve o profile bağlı bekleyen imzayı kapatır. Daha önce imzalanmış belgeleri topluca iptal etmez; belge iptal/değiştirme yetkisi ayrı zincirdir.
- İhraç kaydı profil kimliği/sürümü/özeti ve yetki sicilini taşır; imzalı academicDecision uzantısında aynı bağlar bulunur. Belge hazırlığı ekranı kaynak profil sürümünü gösterir. İkinci hazırlık düğmesi aynı öğrenen kaydı için kapanır.
- Öğrenen idari profil/atanmış görevli listesini alamaz; kendi ihraç hazırlığı ve kaynak sürümünü görür. İnceleme/komut/denetim atomiktir; tekrar güncel yetkiyi ister.

## Sentetik laboratuvar sınırı

Mevcut Dijital Rozet alanı korunur ve sentetik laboratuvar açıklamasıyla akademik çalışma alanına yönlendirir. Yalnız sabit örnek kişiler kabul edilir. İstemciden karar, akademik karar uzantısı, profil, resmîlik, düzenleyen veya pilot durumunu belirleyen alanlar reddedilir. Laboratuvar kayıtları MYYS akademik karar veya kişi siciline eklenmez. Üretimde gerçek kişiye rozet verilmedi/iptal edilmedi.

## Kaynaklar ve sürüm

- YÖK PDF: https://egitim.yok.gov.tr/documentFiles/178150949399.mikro-yeterlilikler-cercevesine-iliskin-usul-esas.pdf . 10.10.2026 yeniden açma erişim hatası verdi. Mevcut 2026.10.10.3 kamu özeti ve uygulamadaki 11 alan korundu; yeni okunmamış hüküm, otomatik kurumsal yetki veya güncel tam hukuk kabulü üretilmedi. Gerçek kurum kaynak/karar kabulü açık.
- Open Badges 3.0, belge sürümü 1.4.5, 29.06.2026: https://www.imsglobal.org/spec/ob/v3p0/ . 10.10.2026 §8.2.3–8.2.6, §8.4–8.5 ve §9.1 okundu. Alan/imza, düzenleyen/özne eşleşmesi, süre ve durum denetimi ayrı kontrollerdir. Mevcut yerel biçim RS256 ve güvenilen sunucu anahtarını kullanır; belge URL'sinden anahtar alınmaz. Bu inceleme tam standarda uygunluk veya 1EdTech sertifikası değildir. Anahtar/durum üretim adaptörü ve bağımsız dış doğrulama B13/B19 içinde açık.

## Kabul ve kalan

12 yeni sunucu senaryosu; güncel toplam 240 sunucu + 46 portal + 46 regresyon = 332 otomatik test. Yeni profil akışında 11 izole tarayıcı kontrolü; mobil, rol, sürüm, durdurma ve kalıcılık sınandı. Kanıt acceptance/B12-profile-20261010.json. İtiraz ve cüzdan regresyon sonuçları aynı kanıtta ayrıca kaydedilir.

Kurumun gerçek EK-1/issuer yetkisi, imza sağlayıcısı ve depo kabulü, eski imzalı belge değiştirme zinciri ile bağımsız standart doğrulaması açık. Profil hazırlanmış olması B12–B13–B19 bütün kabulünün kapandığı anlamına gelmez.
