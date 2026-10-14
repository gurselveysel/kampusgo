# Kurumsal etkinleştirme için tek eylem paketi

10 Ekim 2026 · Teknik hazırlık; kurum kararı veya erişim talebinin gönderildiği anlamına gelmez.

## Mevcut sistem hedefleri ve doğrulanan sınır

| Alan | Kullanılacak mevcut sistem yönü | Kesinleşmeyen konu |
|---|---|---|
| Kişi kimliği | Gazi Bilgi İşlem Daire Başkanlığının yönettiği mevcut öğrenci/personel kimlik kaynağı | IdP ürün adı, OIDC/SAML desteği, issuer ve MFA iddiası kamu kaynağıyla doğrulanmadı. Supabase Auth veya yeni bir sağlayıcı kendiliğinden seçilmedi. |
| Akademik işlem deposu | Mevcut Gazi projesiyle ilişkili `xpjkrwzgimdxsasqszfi` Supabase/PostgreSQL altyapısının uygunluğu ilk inceleme hedefi | Bu projede kaynak yayını ve pilot rozet/oturum kayıtları var; MYYS akademik işlemleri için kabul edilmiş transaction/RLS/şema yok. Kamu kaynak tablosu akademik depo değildir. Kurum bu altyapıyı kabul etmiyorsa kendi mevcut PostgreSQL hizmetini belirtmeli. |
| LMS | GUZEM'in resmî sayfasında gösterilen `https://lms.gazi.edu.tr` | Ürün/sürüm, test API tabanı, not/tamamlama sözleşmesi ve erişim kapsamı henüz teyitli değil. UzemGO ayrı seçenek; şu anda bağlı değil. |
| Öğrenci kaydı/ileride aktarım | Gazi'nin resmî sayfasında gösterilen `https://obs.gazi.edu.tr` | OBS yazma entegrasyonu bu ilk erişim diliminde istenmiyor. Önce kimlik eşleme ve şema dokümanı gerekiyor. |

Kaynaklar: [Gazi BIDB](https://bidb.gazi.edu.tr/) GUZEM ve OBS bağlantılarını listeler; [GUZEM e-Hizmetler](https://guzem.gazi.edu.tr/view/page/290411/e-services) LMS, sınav ve destek hizmetlerini listeler (sayfa güncellemesi 19.08.2022). 10.10.2026 erişiminde görülen bu listeler entegrasyon izni veya güncel API sözleşmesi değildir. Mevcut depo kanıtı: `gazi/INSTITUTIONAL-RELEASE-20261010.md`, `gazi/portal/src/knowledge-model.mjs`, `gazi/database/knowledge-schema.sql`. Hiçbir gizli anahtar bu belgede yoktur.

## Kullanıcıdan tek seferde gereken somut koordinasyon

1. **Gazi BIDB ve GUZEM için yetkili teknik muhatabı belirtin.** Mesaj veya erişim isteği bu çalışma tarafından gönderilmedi. Muhataplar aşağıdaki üç teknik bilgi paketini sağlayabilir; parola/tek kullanımlık kod paylaşmaları gerekmez.
2. **Kimlik bilgi paketi:** mevcut IdP adı; herkese açık veya yetkili kanaldan verilecek metadata; OIDC ise issuer/JWKS/audience ve `sub`/birim/rol/ayrılma/MFA alanlarının anlamı, SAML ise metadata/entityID/NameID sözleşmesi. İlk adım doküman ve maskelenmiş örnek iddia incelemesidir. Dizin genel okuma, parola, `offline_access` veya yönetici hesabı istenmiyor.
3. **Depo kararı:** yukarıdaki mevcut projenin kurumsal akademik veri için kullanılmasına ilişkin yetkili uygunluk yanıtı veya kurumun mevcut alternatif hizmeti; veri bölgesi, saklama/yedek sahibi ve ayrı test veritabanı adı. İlk teknik erişim yalnız şema/indeks/RLS tanımlarını okumak içindir; kişisel tablo satırları, service-role anahtarı, DDL ve üretim yazma yetkisi istenmiyor.
**3a. Giriş saklama yetki ve süre kararı (B04/B28, Paket65):** kişiye/birime bağlanmamış giriş istekleri için kurum genelinde hazırlama, ayrı inceleme ve ayrı BT çalıştırma görevlilerinin yazılı kapsamı/süre/revizyonu; veri sorumlusunun amaç/dayanak/süre başlangıcı, muhafaza ve geri çekme usulü; komut/audit/yedek kopyaları ve imha kanıtı. İlk adım belge incelemesidir. Yerel kontrol kaydı kurum kararı değildir; gerçek görevlendirme, üretim migration, silme veya yeni credential yetkisi varsayılmaz.

4. **GUZEM bilgi paketi:** LMS ürün/sürümü ve API belgesi, kaynak issuer/audience ve yetkili açık anahtar/rotasyon kaynağı, sürümlü kişi-ders-program-rubrik eşleme ve kaynak kullanım hakkı, bir sentetik ders/kohort, maskelenmiş kayıt/not/tamamlama/düzeltme örnekleri, değişiklik sürümü ve hata/kota kuralları. İlk erişim yalnız bu sentetik kohortun kayıt/not/tamamlama okuması; tüm kullanıcılar, içerik indirme, not yazma veya belge düzenleme izni istenmiyor.

5. **GAZİSEM / merkezi SEM belge paketi (14.10.2026 ek inceleme):** güncel YÖK SEM başvuru yazısı ve ekleri, Gazi/GAZİSEM güncel eğitim-sertifika usulü, program açma/görev kararı ve merkezî düzenleyici teyidi; yetkili YÖKSİS başvuru sahibince sağlanacak teknik alan/şema ve maskelenmiş örnek kabul yanıtı. İlk adım belge incelemesidir; kurum hesabı, parola, kod veya resmî belge üretme yetkisi istenmiyor. Hedef, yerel hazırlık dosyasını gerçek usulle karşılaştırmaktır; otomatik gönderim kapalı kalır.

**5a. B02 yetki ve ek gerçekliği (Paket42):** seçili program sürümü için Senato dayanağı, SEM uygulanabilirlik/kapsam dosyası, dört sorumluluğun görev dayanağı, başlangıç/bitiş ve yetkili incelemeciler; belge doğrulama yöntemi ve üretim ek deposunun boyut, e-imza, zararlı içerik tarama ve saklama sözleşmesi. Yerel 32 KiB bayt arşivi kurum evrak deposu değildir. İlk adım belge ve kapsam incelemesidir; resmî belge verme/iptal, yeni credential veya üretim migration yetkisi istenmez ya da varsayılmaz.

6. **Geri dönüş işletim kararı (B27):** yetkili olay ve geri dönüş sorumlusu; sözleşmedeki RPO/RTO ve ölçüm başlangıç/bitiş tanımları; yedek kapsamı/bölgesi/saklama sahibi; son güvenlik/iptal noktasının ayrı güvenilir saklama yöntemi; onaylı ayrı geri dönüş hedefi ve sentetik prova yetkisi. İlk adım doküman ve topoloji incelemesidir; gerçek yedeği kopyalama, üretimi geri yükleme veya yeni credential oluşturma yetkisi varsayılmaz.

7. **Destek işletim ve eğitim kararı (B26):** kurumsal destek sahibi; birimlere göre teknik/akademik/veri koruma görevlileri, gerçek çalışma aralıkları ve kapalı gün takvimi, ilk yanıt/çözüm hedefleri, izinli eskalasyon ve yeniden açma usulü; destek içeriği saklama/erişim kapsamı; öğrenen/eğitici/yönetici eğitim kabul sorumlusu. Hedef, yerel sürümlü kural ve rehberi kurumun yazılı kararıyla karşılaştırmaktır. Mevcut sentetik süreler hizmet taahhüdü değildir; yeni destek servisi, gerçek kişiye mesaj veya üretim kaydı oluşturma izni varsayılmaz.

8. **Koşullu ücretli hizmet kararı (B31):** önce ücretli hizmetin gerçekten açılacağına ilişkin kurum kararı; program/ücret/tahsilat sahibinin yetki dayanağı, vergi-fatura ve iade/itiraz usulünün güncel belge/sürümü; B02/B04/B05 veri ve içerik hakları incelemesi; kurumca seçilmiş PSP'nin sözleşmesi, ayrı sentetik sandbox ve kamuya açık token/checkout/imzalı bildirim/settlement dokümanı. İlk adım belge incelemesidir; gerçek para, kart, banka hesabı veya yeni PSP credential'ı istenmiyor. Hedef, `local-simulator/1` provası ile gerçek sağlayıcı davranışını karşılaştırmaktır. Genel geliştirme onayı gerçek tahsilat veya ücretli hizmet açmaz.

9. **İkinci birim katılımı ve kapasitesi (B32):** gerçek ilk kohortun B30 kabul sahibi ile ikinci birimin katılım/issuer/rol/veri/rapor sorumluları; program ve korunacak ilk kohort sürümü; gerçek kayıt/kuyruk/toplu satır kapasitesi, izleme ve durdurma yetkisi. Hedef, yerel kapasite planını onaylı birim kararına ve üretim depo/RLS/işçi yük kabulüne bağlamaktır. İlk adım yazılı karar ve kapsam incelemesidir; yeni gerçek üyelik, kurum veya ücretli kaynak açma yetkisi varsayılmaz.

10. **Taksonomi ve uzman kabulü (B33):** seçili veri paketi/kavram sürümü, gerçek lisans ve varsa üçüncü taraf/çeviri/atıf şartları; program-beceri eşlemesi kapsamı ve kurumca görevlendirilmiş akademik uzman; gerçek ders/kanıt örneklemi, hata düzeltme ve dönemsel gözden geçirme sorumlusu. Hedef, sentetik ilişkileri gerçek hak ve uzman kararıyla karşılaştırmaktır. Kamuya açık ESCO açıklamaları tüm veri paketinin/markanın/çevirinin kullanım hakkı veya Gazi uzman görevlendirmesi yerine geçmez. Gerçek kişiye meslek yeterliliği atama izni varsayılmaz.

11. **Amaçlı işveren pilotu (B34):** kurumun kariyer/veri sorumlusu; gerçek alıcının tüzel/kişisel kimliği ve görevi, tek açık işleme amacı, gerekli asgari portfolyo alanları, alıcı ülkesi/aktarım düzeni, saklama ve yeniden kullanım sınırı; öğrenen bilgilendirmesi ve uygun izin/geri çekme usulü. Hedef, sentetik dar izin modelini gerçek kurum kararı ve alıcı kimliğiyle karşılaştırmaktır. Genel geliştirme yetkisi gerçek öğrenci portfolyosunu işverene açmayı veya yeni dış hesap/credential oluşturmayı kapsamaz. Önce belge/kapsam incelemesi; mesaj veya gerçek veri aktarımı yapılmadı.

12. **Koşullu yapay zekâ pilotu (B35):** ölçme/veri koruma sorumlusu, somut kullanım ihtiyacı, kurumca değerlendirilecek sağlayıcı-model-plan-sürüm, veri işleme ve içerik hakları, Türkçe çıktı değerlendirmesi için gerçek sentetik örneklem/uzman görevlendirmesi ve itiraz usulü. İlk adım belge, kullanım şartları ve protokol incelemesidir. Hedef, yerel elle girilen benzetim sözleşmesini onaylı sağlayıcının gerçek davranışıyla karşılaştırmaktır. Yerel protokol formu bu onayları vermez. Yeni API anahtarı, abonelik, gerçek öğrenci verisi gönderimi veya otomatik akademik karar yetkisi varsayılmaz.

13. **İsteğe bağlı gelişmiş cüzdan kararı (B36):** somut ve kurumca doğrulanmış kullanıcı ihtiyacı, mevcut özel cüzdanla karşılanamayan kapsam, zincirsiz alternatif kıyası, veri/saklama ve tedarik sorumluları. İhtiyaç onaylanırsa gerçek cüzdan ürün/sürümü, açık protokol/biçim/profil, güven ve durum kaynağı, yalnız sentetik test kapsamı ile ihraç/doğrulama/iptal kabul sahibi gerekir. İlk adım belge ve ihtiyaç incelemesidir; yeni hesap/credential, ücretli sertifika, kişisel veri veya belge özetiyle zincir işlemi, gerçek ihraç/iptal yapılmaz. Gerekçeli erteleme geçerli seçenektir; yerel keşif onayı gerçek kurum kararını veya dış test başarısını üretmez.

Bu bilgiler geldiğinde mevcut adaptör sözleşmesi kesin uçlarla eşlenebilir. Şu aşamada bilinmeyen issuer, API yolu veya test veritabanı adı uydurulmadı. Bilgi eksikliği bağımsız yerel kod/test işlerini durdurmaz.

## Ayrı özel yetki gerektiren sonraki işlemler

| Somut işlem | Hedef | Risk ve gerekli ayrı karar |
|---|---|---|
| IdP uygulaması kaydı / test istemcisi | Kurumun teyit ettiği IdP | Yeni erişim oluşturur. Tam redirect URI, audience, kapsam, süre, iptal sahibi ve MFA politikası incelendikten sonra kurum yetkilisi tarafından onaylanmalı. Bu işlem yapılmadı. |
| Akademik şema kurulumu ve kalıcı sunucu rolü | Onaylanan ayrı test deposu; sonra ayrıca üretim | Migration ve yazma erişimi oluşturur. Önce sürümlü SQL, RLS negatif testleri, geri dönüş ve yedek planı sunulmalı; üretim uygulaması için ayrı yetki gerekir. |
| LMS test bağlantısını açma | Yalnız teyitli sentetik kohort | Yeni kimlik bilgisi/erişim gerekiyorsa kapsam ve süreyle ayrıca onaylanmalı; gizli değer kurumun güvenli ortamında kurulmalı. |
| Gerçek kohort / gerçek belge / OBS yazma | Yetkili kurum akışları | Akademik, hukuki ve operasyonel kabuller ayrıdır. Genel yayın izni bu işlemleri kapsamaz. |

Bu pakette yeni abonelik, kalıcı erişim, üretim migration'ı, gerçek veri aktarımı veya resmî belge işlemi yapılmadı.

## Kimlik sözleşmesinin güncel hazırlığı

`IDENTITY-CONTRACT.md` ve 29 sentetik test mevcut. Kurumdan hâlâ gereken somut belge: IdP protokolü/issuer/client audience/açık anahtar kaynağı ile MFA (acr/amr), kişi anahtarı, ayrılma ve rol/birim yaşam döngüsü tanımı. Bu aşamada parola, tek kullanımlık kod, yönetici hesabı veya yeni kalıcı credential istenmiyor. Belgeler gelmeden gerçek bağlantı açılmaz; bağımsız callback/depo testleri geliştirilebilir.

## Paket46 kaynak okuma ve tanıma sınırı

YÖK mikro yeterlilik5sayfa ve Gazi kredi transferi4sayfa okuma engeli kaldırıldı; bağlantı ve SHA’lar RECOGNITION-SOURCE-REVIEW-20261014.md içinde. Bu okuma Senato politikası, Genel Kurul yürürlük kararının tarihi/sayısı, YÖK10/3 ölçü birimi yorumu, özel RPL istisnası, gerçek müfredat/önceki kredi, şahsen başvuru veya yetkili kurul kabulü sağlamaz. Yeni erişim istenmedi/oluşturulmadı. B20/B21 yerel çok dersli kabul üretime etkinleştirilmedi.

## Paket53 SQL adayının özel yetki sınırı

`identity-key-schema.sql` yalnız PGlite testine kuruldu. Mevcut üretim veya Supabase projesine DDL, credential ya da servis kurulmadı. Gerçek kabul için önce mevcut ayrı test deposunun sürüm/rol/RLS/bağlantı ve anahtar kontrol düzlemi sözleşmesi gerekir; bu başlık yeni bir erişim isteğinin gönderildiği anlamına gelmez. Tek bağlantılı WASM sonucu çok bağlantılı PostgreSQL veya KMS kabulü sayılmaz. Bağımsız repository geliştirmesi sürer.

## Paket55 kişi/üyelik/session özel yetki sınırı

Beş yeni SQL adayı yalnız PGlite sentetik testine kuruldu; toplam9PGadayı üretime uygulanmadı. putPerson merkezi issuer kişi yaşam döngüsü yetkisi, putMembership tenant/birim kaynak yetkisi gerektirir; bu fonksiyonlar normal yönetici veya anonim HTTPye açılmadı. Yeni credential/üretim migration/gerçek kişi kaydı yok. Native çok bağlantı/RLS/IdP/KMS ve geri yükleme checkpoint dış kabulü mevcut tek eylem listesinde açık kalır.

## Paket58 HTTP güvenliği özel yetki sınırı

Üç yeni adayla toplam12 PGtablosu yalnız sentetik PGlite testinde; production DDL/credential/KMS yok. HTTP epoch activate ayrı yetkili kontrol düzlemine aittir; parametre operatör/dayanak kendiliğinden yetki sağlamaz. Ortak HTTP MAC anahtarının güvenli temini, gerçek transport/proxy sözleşmesi, bütün yazarlar ve geri yükleme checkpoint kabulü gerekir. AktifSQLite16/148 değişmedi.

## Paket59 yerel HTTPS sınırı

Yeni SQL giriş ekranı yalnız loopback; Vercelde reddedilir. Gerçek IdP, production proxy/TLS, KMS/credential, şema veya kişi kaydı kurulmadı. Tek bağlantılı PGlite/HTTPS kabulü, native DB/kurum erişimi onayı sağlamaz. Mevcut tek eylem listesi geçerli; bağımsız async akademik depo ve restore checkpoint geliştirmesi sürer.


## Paket64 · mevcut 3 ve 6 numaralı eylemlerin somut kapsamı

SQL kimlik deposundan ayrı, geri yüklemede birlikte geri alınmayacak kontrol hizmetinin mevcut kurumsal hedefi/sahibi; bütün okuyucu-yazıcıların aynı depo kapsamına bağlanması; kesin olmayan işlemlerde eski yazıcıları durdurma/uzlaştırma yetkisi; güvenlik kuyruğu, saklama ve yedek imha usulü gerekir. Yerel özel SQLite dosyası bu hizmetin üretim kabulü değildir. Yeni servis/credential/ücretli kaynak veya13PGadayını üretime kurma işlemi yapılmadı. Önce mevcut hedef ve yazılı işletim sözleşmesi incelemesi; bağımsız kod devam eder.

### Paket66 kapsam notu

İlk8akademik komut aynı SQL kimliğine bağlandı; yeni erişim veya migration uygulanmadı. Mevcut tek eylem listesindeki kurum deposu/IdP/MFA/KMS/control-plane ve native RLS/SSI kabulü değişmez.16PGadayı yalnız testte; birleşik akademik checkpoint bağımsız kod olarak sıradadır.

### Paket67 kapsam notu

Birleşik15veri tablosu profili yerel kabulde. Mevcut tek eylem listesindeki SQLden bağımsız güvenilir kontrol hizmeti, bütün okuyucu/yazıcılar, belirsiz işlem kurtarma yetkisi ve RPO/RTO işletimi gereksinimleri değişmez. Yeni hizmet/credential/migration yok; kurum kararı beklerken bağımsız geliştirme sürer.

### Paket68 kapsam notu

Yerel itirazpolitikası ve kişiselteslim aynıSQLakışında. GerçekGaziusulü, yetkilikişiler, resmîtebligat/kanıtı ve imzalıbelgeiptal/değişim usulü mevcut tek eylem listesinde açık. Sentetik günhesabı gerçek süre kuralı değildir. Şema adayı değişti; üretim/öncekişema migrationı veya yeni erişim uygulanmadı.

### Paket69 kapsam notu

Alternatifgözlem/ayrı kaliteincelemesi aynıSQL yerel zincirde. Gerçek kurumun yöntem ve kanıt kabulü, güncel eğitici/kalite/komisyon görevleri ve gerçek kaynak doğrulaması mevcut tek eylem listesinde açık. Fixturedaki yeni kişi sentetiktir; gerçek hesap/rol/yeni erişim oluşturulmadı.

### Paket70 durum notu

Üst panel kişi/sunum ayrımı bağımsız olarak tamamlandı; yeni erişim talebi yaratmadı. Gerçek IdP ve ad-soyad kaynağı, kurum görev yetkisi, üretim depo/checkpoint/nativeSSI/RLS ve kimlikli canlı smoke mevcut tek eylem listesindeki yetkilerle sınırlı kalır. browserAuth iptali yenilenmedi. Son canlı16;17–70yayımlanmadı. Kalan122SQLişlem geliştirmesi sürer.

### Paket71 durum notu

Sicil taslağı ve ayrı yönetici incelemesi bağımsız geliştirildi; yeni erişim gerektirmedi. Gerçek veri/saklama/hak/LMS/tanıma/kurum yetki sözleşmeleri kurum kararlarıyla açık kalır. Yerel uygun incelemesi bu yetkilerin yerine geçmez. configuredCorekapalı; soncanlı16; browserAuthiptali yenilenmedi.120SQLkomut geliştirmesi sürer.

### Paket72 durum notu

Yetki eki/dosyası ve profil aynı SQL zincirinde yerel olarak doğrulandı. Gerçek Senato/SEM dayanakları, görev/süre, belge deposu/tarama/e-imza ve üretim kabulü mevcut tek eylem listesinde açık. Yeni credential/migration/gerçek belge işlemi yok. Son canlı16; browserAuth iptali yenilenmedi.112SQLkomut ve B03 aynı SQL program paketi bağımsız olarak sürer.
