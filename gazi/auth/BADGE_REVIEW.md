# Gazi pilot rozet denetimi — 10 Ekim 2026

Birsen Bilir'in paylaşılan notları doğrultusunda mevcut uygulama ve aşağıdaki birincil kaynaklar incelendi.

## Bulgular ve uygulama

- YÖK EK-1, sayfa 5, **11** asgari bilgi içerir. Sohbette anılan 10 sayısı belgedeki listeyle uyuşmamaktadır.
- Önceki rozet ekranı imzasız JSON taslağıydı. Ayrı tarayıcı laboratuvarı ECDSA örneği üretiyor fakat kurumsal güven zinciri sağlamıyordu. Bu eski laboratuvar korunur; yeni rozet üretimi onunla karıştırılmaz.
- İki portal artık aynı `badge-workspace.jsx` bileşenini kullanır. Üniversite, kurumsal akademi, eğitici eğitimi, hizmet içi eğitim ve öğretmen gelişimi şablonları vardır.
- 11 alan imzalanan OpenBadgeCredential içindeki `pilotMetadata` JSON-LD uzantısında bulunur; standart alanlarda üretici, özne, eğitim, ölçüt, kanıt ve tarih de yer alır. Boş zorunlu alanlar sunucuda reddedilir.
- Üniversite şablonunda 1 AKTS = 25 saat kontrolü vardır. Kurumsal şablonlar AKTS vermez. TYÇ düzey tanımı pilot örnektir, kurumsal tanınma değildir.
- RS256/RSA-3072 anahtarı yalnız Vercel sensitive environment variable içinde tutulur. Production/preview anahtarları ayrıdır. Anahtar yedeği kaynak ağacı dışındadır. Anahtar değişimi önce eski belgeler için güvenli anahtar geçmişi tasarımını gerektirir; mevcut anahtar silinmemelidir.
- İmzalı taşınabilir dosya `.jwt`; `.json` yalnız imzasız bilgi dökümüdür. Doğrulayıcı yalnız sabit ÜniGO pilot anahtarını ve üreticisini kabul eder; gelen belge içindeki key/URL'ye güvenmez ve bu adreslere ağ isteği göndermez.
- Gazi'ye özgü sunucu sicili kalıcıdır. İptal, W3C Bitstring Status List 1.0 içinde 131072 bitlik GZIP + multibase base64url listeyle yayımlanır. Halka açık anahtar ve durum listesi öğrenen verisi içermez. Tam belgeler TOTP oturumu gerektirir.
- Sicil RLS ile istemcilere kapalıdır; `anon`, `authenticated`, PUBLIC izinleri kaldırılmıştır. Gateway ve Edge Function oturumu ayrı kontrol eder. Yazma istekleri same-origin, sınırlı JSON boyutu ve 30 işlem/dakika/oturum kontrolündedir.
- Giriş logosunda mevcut marka çizgileri korunup SVG renk filtresiyle beyaz/kırmızı ve saydam görünüm sağlanır.

## EK-1 eşlemesi

| No | Asgari bilgi | İmzalı içerik |
|---|---|---|
|1|Öğrenenin kimliği|credentialSubject.id + pilotMetadata.learner|
|2|Eğitimin adı|achievement.name + pilotMetadata.title|
|3|Sertifikayı veren kurum|issuer + pilotMetadata.issuer|
|4|Sertifika tarihi|validFrom + pilotMetadata.date|
|5|Öğrenme çıktıları|achievement.description + pilotMetadata.outcomes|
|6|Kavramsal iş yükü (AKTS)|pilotMetadata.workload|
|7|Eğitimin düzeyi|pilotMetadata.level|
|8|Ölçme ve değerlendirme türü/yöntemi|pilotMetadata.assessment|
|9|Katılım şekli|pilotMetadata.participation|
|10|Başarı kriterleri|achievement.criteria.narrative + pilotMetadata.criteria|
|11|Kalite güvencesi|pilotMetadata.quality|

## Kapsam sınırları

Bu sürüm gerçek kriptografi kullanan **pilot** belgelendirmedir. Üretici ÜniGO MYYS Pilot Belgelendirme'dir; Gazi Üniversitesi adına veya MEB adına resmî belge düzenlemez. Gerçek öğrenen verisi girişi kapalıdır. Başarı kanıtları sentetiktir. Kurumun senato kararı, yetkili imza kimliği, bireysel kullanıcı/rol yönetimi ve kişisel veri saklama süreçleri resmî geçişte ayrıca kurulmalıdır. Paylaşılan PDF'nin yürürlük maddesi Genel Kurul kararını referanslar; açık karar tarihi verilmediğinden tarih uydurulmamıştır. Gazi'nin yerel senato düzenlemesi bu denetimde doğrulanamamıştır.

Open Badges resmi JSON şemasıyla doğrulama ve JWT imza testleri yapılmıştır. Bu testler 1EdTech ürün sertifikası anlamına gelmez. Doğrulayıcı şu an bu pilot üreticisinin belgelerini kabul eder; başka üretici cüzdanlarıyla tam uyumluluk kabul testi ayrıca gerekir. LinkedIn/e-Devlet otomatik aktarımı bağlı değildir.

Sayıştay haberinin konusu üniversitelerin araştırma veri tabanı aboneliklerinin eşgüdümüdür. Haber MYYS ürün fiyatını veya sıfır maliyet garantisini kanıtlamaz; maliyet ekranındaki değerler karşılaştırma senaryosudur. Resmî Sayıştay raporunun haberle ilişkisi bu denetimde birincil rapor üzerinden doğrulanmadı.

## Kaynaklar

- YÖK, Yükseköğretim Kurumlarında Mikro Yeterlilikler Çerçevesine İlişkin Usul ve Esaslar, özellikle Madde 4, 6, 8, 10 ve EK-1: https://egitim.yok.gov.tr/documentFiles/178150949399.mikro-yeterlilikler-cercevesine-iliskin-usul-esas.pdf — PDF doğrudan indirildi ve tamamı okundu.
- 1EdTech Open Badges 3.0, belge sürümü 1.4.5 (29 Haziran 2026): https://www.imsglobal.org/spec/ob/v3p0 — özellikle JWT/JOSE 8.2.4 ve dosya aktarımı.
- Resmî doğrulama şeması: https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json — testlerde yerel sabit kopya, 10 Ekim 2026.
- W3C Bitstring Status List 1.0: https://www.w3.org/TR/vc-bitstring-status-list/ — durum listesi ve bit sırası.
- Sohbetteki haberin bulunan asıl adresi: https://www.memurlar.net/haber/1180100/sayistay-dan-yok-e-tasarruf-icin-onemli-oneri-universitelerin-veri-tabani-aboneliklerini-tek-elden-koordine-edin.html — ikincil kaynak.

## Doğrulama

`npm test --prefix gazi/auth`: 15 test (resmî şema, zorunlu alanlar, RS256, kurcalama, farklı üretici, süre, iptal, durum listesi, TOTP/CSRF/oturum).

`tests/live-smoke.mjs`: özel yapılandırma dosyaları komut argümanlarıyla verilir; değerler loglanmaz. Preview kapsamı ve canlı ortamda giriş, yetkisiz erişim, üretim, tekrar isteği, doğrulama, kurcalama, iptal, durum listesi ve çıkış testlerini çalıştırır. Oluşturduğu sentetik test rozeti iptal edilerek sicilde bırakılır.

## Yayın ve sonuç

Canlı sürüm: `dpl_4CcewP7kpwNGJ5TLrJcTSJCTvrG5` — gazi.unigoturkiye.com. TOTP erişimi ve Vercel deployment protection korundu. Ana ve kurumsal demo derlemeleri tamamlandı. 15 güvenlik/rozet testi ve mevcut 31 uygulama testi geçti. Preview veri kapsamı ve canlı üretimde 14 adımlı sicil testi, ayrıca çıkış sonrası erişim engeli geçti. Canlı test kaydı `03760d41-c9af-46eb-b218-7d169c1b7df3` iptal edilerek sicilde bırakıldı.

İlk canlı üretim denemesinde geçici 503 yanıtı görüldü; sonraki tam akış başarılıydı. Hata durumunda sistem erişimi açmaz. Yeni sunucu logları yalnız hata türü/kodu ve güvenli işlem adını kaydeder; belge, oturum ve anahtar içerikleri loglanmaz.

Canlı giriş logosu tarayıcı ekran görüntüsüyle doğrulandı. Oturum içi yeni rozet ekranı tarayıcıda bu turda gezilmedi: güvenli doğrulayıcı girişi kullanıcı etkileşimi gerektiriyor. Yerel HTML görsel deneme dosyasının açılması da tarayıcı protokol politikasıyla engellendi; bu kısıtlama aşılmadı. Arayüz için derleme; üretim/doğrulama/iptal için canlı HTTP akışı test edildi.

Kaynaklar yerel git dalında korunur; önceki paylaşım kısıtı nedeniyle herkese açık GitHub deposuna gönderilmez. Anahtarlar ve özel erişim dosyaları git ağacına ve dağıtım dosyalarına eklenmedi.
