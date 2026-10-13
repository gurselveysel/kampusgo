# B13/B19 durum listesi ve bağımsız doğrulama — 2026-10-13

## Seçilen yerel profil

Belge profili OB-3.0-VC-2.0-RS256-local-1 korunur; yeni imzalarda akademik kararın imzalı `statusProfile` değeri MYYS-LOCAL-STATUS-1 olur. İki ayrı durum girdisi standart BitstringStatusListEntry biçimindedir. Taşıma dosyası MYYS-LOCAL-OB3-JWT-BUNDLE-1, kurum sertifikası veya genel bir OB cüzdan protokolü değildir. Önceki imzalı belgeler değişmez; bu eklentiyi taşımayan belge için yeni biçimde paket üretilmez.

Yerel düzenleyici https://local-acceptance.invalid/api/rozet/kurum. Durum adresleri aynı sentetik kökte kurum/birim özeti ve amaçla ayrılır. Bu adresler çevrimdışı paketteki imzalı listelere eşlenir; üretimde çalışan HTTP hizmeti oldukları iddia edilmez ve doğrulayıcı hiçbir URL'ye ağ isteği yapmaz.

## Durum ve işlem bütünlüğü

Her ihraç hazırlığı ilk imzada rastgele bir indeks alır. İndeks yeniden kullanılmaz. Teknik yerel sınır birimde 10000 kayıt ve 100 açık anahtardır; liste 131072 bit/16384 bayttır. İndeks rezervasyonu başarısız imza sonrasında korunabilir; bu, imzalı belge sayılmaz. MSB-first bitler GZIP ve `u` önekli base64url biçimindedir.

Kalıcı iptal yalnız açık iptal kaydından gelir. Askı, güncel akademik karar/kanıt/itiraz uygunluğundan hesaplanır; itirazın uygun bulunması askıyı kaldırabilir. Anahtar ele geçirilmesi güven sicilinde ayrı kalır; öğrenci kurumdan ayrıldı diye akademik iptal üretilmez.

Birim BT görevlisi MFA ile iki listeyi birlikte hazırlar. Aktif ve ayrı incelenmiş anahtar zorunludur. Başlangıç ve bitiş işleminde kişi/anahtar/kaynak özeti yeniden denetlenir. Eşzamansız imza sırasında değişiklik varsa yayın reddedilir. İki liste ve denetim olayı aynı yerel işlemde kaydedilir. Yeni olay eski paketi yerel ihraca kapatır. Beş dakikalık geçerlilik ve 60 saniyelik önbellek TTL değeri teknik profil seçimidir; mevzuat süresi değildir.

## Ekran ve veri kapsamı

Anahtar ve belge durumu: BT listeleri yeniler; BT veya yönetici yalnız kendi biriminin açık güven sicilini indirir. Kişisel cüzdanım: MFA'lı öğrenen yalnız kendi imzalı belgesini iki durum JWT'siyle indirir. Askıda/iptal edilmiş belge de mevcut durumuyla inceleme amacıyla paketlenebilir; kullanım için geçerli sayılmaz. Her iki dosyada da özel anahtar yoktur.

Güven sicili ayrı yetkili kanaldan alınmalıdır. Paket içindeki bir anahtar kendiliğinden güvenilir sayılmaz. Çevrimdışı kopya, ihracattan sonraki yeni iptali veya anahtar olayını öğrenemez; geçerlilik sınırı içinde bile en son çevrimiçi durumu garanti etmez. Üretim durum servisi, dağıtık yenileme, önbellek ve işletim kabulü açık kalır.

## Bağımsız araç

`gazi/auth/scripts/verify-local-bundle.py` yalnız Python standart kütüphanesi ve OpenSSL komut satırını kullanır; uygulamadan, jose'den veya MYYS doğrulama işlevlerinden kod içe aktarmaz. RS256 kriptografik imza, dışarıdan açıkça güvenilen issuer/kid, tarih/kimlik bağları, seçilen OB/VC profil alanları, iki imzalı liste ve MSB bitleri denetlenir. GZIP açılması sınırlıdır; bozuk/kısa/aşırı büyük liste ve bilinmeyen alanlı JOSE başlığı reddedilir. Ağ erişimi yoktur. Test zamanı `--at` yalnız sentetik kabul içindir; normal kullanım güncel UTC kullanır.

Depo kökünde örnek yerel kullanım (dosyalar ilgili ekranlardan indirilir):

```bash
python gazi/auth/scripts/verify-local-bundle.py --bundle MYYS_dogrulama.json --trust MYYS_guven-sicili.json --issuer https://local-acceptance.invalid/api/rozet/kurum
```

OpenSSL 3.0.13 / Python 3.12.14 ile kabul yapıldı. Sonuç JSON ve çıkış koduyla bildirilir. Profil denetimi tam JSON-LD anlambilim çözümlemesi veya 1EdTech sertifikasyonu değildir. Depodaki önceki OB şeması bir uyarlamadır; bağımsız ürün sertifikası diye sunulmaz. Gerçek dış cüzdan/tedarikçi karşılıklı çalışma testi ayrıca gerekir.

## Resmî teknik kaynak kaydı

- 1EdTech Open Badges 3.0, doküman 1.4.5 (29.06.2026): https://www.imsglobal.org/spec/ob/v3p0/ — 10.10.2026'da §8.2.3–8.2.6, §8.4, §9.1 okundu. JOSE, kimlik/zaman bağları ve doğrulama gerekleri yerel profilin dayanağıdır; kurum düzenleme yetkisi sağlamaz.
- W3C Bitstring Status List v1.0, Recommendation 15.05.2025: https://www.w3.org/TR/vc-bitstring-status-list/ — 10.10.2026'da §2–4 okundu. Amaç ayrımı, bit sırası, sıkıştırma/çok tabanlı kodlama ve asgari liste boyutu uygulanır. Kurumsal iptal usulü bu standarttan türetilmez.

## Kalan kabul

Gerçek imza sağlayıcısı, kurum durum yayın adresi/anahtar işletimi ve bağımsız dış cüzdan kabulü yoktur. configuredCore Vercel'de kapalıdır. Canlı güvenli giriş isteği kullanıcı tarafından iptal edildiğinden Paket 17/18 canlı yayını ve smoke yapılmadı. B11 imzalı belge değiştirme zinciri sonraki bağımsız iştir.
