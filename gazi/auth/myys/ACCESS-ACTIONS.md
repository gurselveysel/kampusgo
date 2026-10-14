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
4. **GUZEM bilgi paketi:** LMS ürün/sürümü ve API belgesi, kaynak issuer/audience ve yetkili açık anahtar/rotasyon kaynağı, sürümlü kişi-ders-program-rubrik eşleme ve kaynak kullanım hakkı, bir sentetik ders/kohort, maskelenmiş kayıt/not/tamamlama/düzeltme örnekleri, değişiklik sürümü ve hata/kota kuralları. İlk erişim yalnız bu sentetik kohortun kayıt/not/tamamlama okuması; tüm kullanıcılar, içerik indirme, not yazma veya belge düzenleme izni istenmiyor.

5. **GAZİSEM / merkezi SEM belge paketi (14.10.2026 ek inceleme):** güncel YÖK SEM başvuru yazısı ve ekleri, Gazi/GAZİSEM güncel eğitim-sertifika usulü, program açma/görev kararı ve merkezî düzenleyici teyidi; yetkili YÖKSİS başvuru sahibince sağlanacak teknik alan/şema ve maskelenmiş örnek kabul yanıtı. İlk adım belge incelemesidir; kurum hesabı, parola, kod veya resmî belge üretme yetkisi istenmiyor. Hedef, yerel hazırlık dosyasını gerçek usulle karşılaştırmaktır; otomatik gönderim kapalı kalır.

6. **Geri dönüş işletim kararı (B27):** yetkili olay ve geri dönüş sorumlusu; sözleşmedeki RPO/RTO ve ölçüm başlangıç/bitiş tanımları; yedek kapsamı/bölgesi/saklama sahibi; son güvenlik/iptal noktasının ayrı güvenilir saklama yöntemi; onaylı ayrı geri dönüş hedefi ve sentetik prova yetkisi. İlk adım doküman ve topoloji incelemesidir; gerçek yedeği kopyalama, üretimi geri yükleme veya yeni credential oluşturma yetkisi varsayılmaz.

7. **Destek işletim ve eğitim kararı (B26):** kurumsal destek sahibi; birimlere göre teknik/akademik/veri koruma görevlileri, gerçek çalışma aralıkları ve kapalı gün takvimi, ilk yanıt/çözüm hedefleri, izinli eskalasyon ve yeniden açma usulü; destek içeriği saklama/erişim kapsamı; öğrenen/eğitici/yönetici eğitim kabul sorumlusu. Hedef, yerel sürümlü kural ve rehberi kurumun yazılı kararıyla karşılaştırmaktır. Mevcut sentetik süreler hizmet taahhüdü değildir; yeni destek servisi, gerçek kişiye mesaj veya üretim kaydı oluşturma izni varsayılmaz.

8. **Koşullu ücretli hizmet kararı (B31):** önce ücretli hizmetin gerçekten açılacağına ilişkin kurum kararı; program/ücret/tahsilat sahibinin yetki dayanağı, vergi-fatura ve iade/itiraz usulünün güncel belge/sürümü; B02/B04/B05 veri ve içerik hakları incelemesi; kurumca seçilmiş PSP'nin sözleşmesi, ayrı sentetik sandbox ve kamuya açık token/checkout/imzalı bildirim/settlement dokümanı. İlk adım belge incelemesidir; gerçek para, kart, banka hesabı veya yeni PSP credential'ı istenmiyor. Hedef, `local-simulator/1` provası ile gerçek sağlayıcı davranışını karşılaştırmaktır. Genel geliştirme onayı gerçek tahsilat veya ücretli hizmet açmaz.

9. **İkinci birim katılımı ve kapasitesi (B32):** gerçek ilk kohortun B30 kabul sahibi ile ikinci birimin katılım/issuer/rol/veri/rapor sorumluları; program ve korunacak ilk kohort sürümü; gerçek kayıt/kuyruk/toplu satır kapasitesi, izleme ve durdurma yetkisi. Hedef, yerel kapasite planını onaylı birim kararına ve üretim depo/RLS/işçi yük kabulüne bağlamaktır. İlk adım yazılı karar ve kapsam incelemesidir; yeni gerçek üyelik, kurum veya ücretli kaynak açma yetkisi varsayılmaz.

10. **Taksonomi ve uzman kabulü (B33):** seçili veri paketi/kavram sürümü, gerçek lisans ve varsa üçüncü taraf/çeviri/atıf şartları; program-beceri eşlemesi kapsamı ve kurumca görevlendirilmiş akademik uzman; gerçek ders/kanıt örneklemi, hata düzeltme ve dönemsel gözden geçirme sorumlusu. Hedef, sentetik ilişkileri gerçek hak ve uzman kararıyla karşılaştırmaktır. Kamuya açık ESCO açıklamaları tüm veri paketinin/markanın/çevirinin kullanım hakkı veya Gazi uzman görevlendirmesi yerine geçmez. Gerçek kişiye meslek yeterliliği atama izni varsayılmaz.

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
