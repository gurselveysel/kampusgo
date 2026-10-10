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
4. **GUZEM bilgi paketi:** LMS ürün/sürümü ve API belgesi, bir sentetik ders/kohort, maskelenmiş kayıt/not/tamamlama/düzeltme örnekleri, değişiklik sürümü ve hata/kota kuralları. İlk erişim yalnız bu sentetik kohortun kayıt/not/tamamlama okuması; tüm kullanıcılar, içerik indirme, not yazma veya belge düzenleme izni istenmiyor.

Bu bilgiler geldiğinde mevcut adaptör sözleşmesi kesin uçlarla eşlenebilir. Şu aşamada bilinmeyen issuer, API yolu veya test veritabanı adı uydurulmadı. Bilgi eksikliği bağımsız yerel kod/test işlerini durdurmaz.

## Ayrı özel yetki gerektiren sonraki işlemler

| Somut işlem | Hedef | Risk ve gerekli ayrı karar |
|---|---|---|
| IdP uygulaması kaydı / test istemcisi | Kurumun teyit ettiği IdP | Yeni erişim oluşturur. Tam redirect URI, audience, kapsam, süre, iptal sahibi ve MFA politikası incelendikten sonra kurum yetkilisi tarafından onaylanmalı. Bu işlem yapılmadı. |
| Akademik şema kurulumu ve kalıcı sunucu rolü | Onaylanan ayrı test deposu; sonra ayrıca üretim | Migration ve yazma erişimi oluşturur. Önce sürümlü SQL, RLS negatif testleri, geri dönüş ve yedek planı sunulmalı; üretim uygulaması için ayrı yetki gerekir. |
| LMS test bağlantısını açma | Yalnız teyitli sentetik kohort | Yeni kimlik bilgisi/erişim gerekiyorsa kapsam ve süreyle ayrıca onaylanmalı; gizli değer kurumun güvenli ortamında kurulmalı. |
| Gerçek kohort / gerçek belge / OBS yazma | Yetkili kurum akışları | Akademik, hukuki ve operasyonel kabuller ayrıdır. Genel yayın izni bu işlemleri kapsamaz. |

Bu pakette yeni abonelik, kalıcı erişim, üretim migration'ı, gerçek veri aktarımı veya resmî belge işlemi yapılmadı.
