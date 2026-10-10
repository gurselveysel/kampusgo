# MYYS uygulama kaydı — 10 Ekim 2026

Kaynak tabanı: `ffae561ebe5120f7d063d929b8b4954829ba0adc`.
Çalışma dalı: `feat/gazi-myys-governed-core-20261010`.
Özgün plan: `libfile_dcd1d1343b048191a8d94c43c1ac1be5`, içindeki 36 paket
`backlog.json` dosyasına kimlik, bağımlılık ve kabul ölçütleriyle aktarılmıştır.

## Teslim kapsamı

Bu değişiklik ilk kritik dilimin **izole yerel kabul uygulamasıdır**. Üretim
veritabanına migration uygulanmadı, kimlik sağlayıcısı bağlanmadı, canlı
dağıtım yapılmadı. B01–B36'nın tamamı bitmiş değildir. Her paketin tamlık,
test ve dış bağımlılık durumu `backlog.json` içinde ayrı kaydedilir.

- `store.mjs`: dosyaya kalıcı yerel kabul deposu; sabit issuer/subject kişi
  eşlemesi, süreli kurum/birim üyeliği, sunucu oturum bağlantısı, değiştirilemez
  akademik kayıtlar ve işlem günlüğü. E-posta kimlik anahtarı değildir.
- `core.mjs`: program/rubrik sürümü, bağımsız program yayını, kayıt, zorunlu
  görev kanıtı, insan değerlendirmesi, akademik karar, itiraz, ihraç yetkisi,
  iptal, özel cüzdan kaydı ve süreli paylaşım. Kimlik/rol HTTP gövdesinden alınmaz.
- `credentials.mjs`: kayıttaki başarı kararı üzerinden gerçek JWT imzası.
  İmza sırasında değişen yetki yeniden denetlenir. Anahtarlar yalnız sunucudaki
  güvenilir listeden alınır. Toplu hazırlık satır bazında sonuç verir; hazırlık
  imzalanmış/teslim edilmiş belge değildir.
- `projections.mjs`: yetkili kayıtlardan pay/payda ve çıktı–görev–değerlendirme
  ilişkileri. Tamamlama/istihdam verisi yoksa null kalır; uzman taksonomi
  onayı varsayılmaz.
- `http.mjs`: mevcut gateway altında `/api/myys/calisma`, `/islem`,
  `/toplu-hazirlik`, `/imzala`, `/dogrula`. İmzalayıcı bağlantısı yoksa 503.
- `portal/src/academic-workspace.jsx`: mevcut tasarıma bağlı `#/academic`;
  kanıt, rubrik, gerekçeli karar ve belge hazırlığı. Kurumsal bağlantı yoksa
  gerçek kayıt veya başarı uydurmaz, açık kurulum mesajı gösterir.

Mevcut `localStorage` depoları okunup dönüştürülmedi veya silinmedi. Eski
dersler, 66 materyal, rol sunumları ve pilot rozet sicili korunmuştur. Yeni
akademik zincir eski örnek tamamlama bayraklarını başarı saymaz.

## Güvenlik ve gerçek kapsam

`LocalAcceptanceStore` üretim/preview Vercel ortamında açılmaz. Geçici yerel
dosya deposu yeni bir canlı veritabanı değildir; üretimde geçici disk kullanımı
ve yanlış kalıcılık iddiası özellikle engellenmiştir. Gateway, Vercel'de bu
akışa 503 döndürür; mevcut pilot erişim kapısı korunur.

Testler sunucuya bağlanmaz, gerçek kişiyi oluşturmaz, kalıcı erişim vermez.
İzole kişi/oturum eşlemeleri test fixture'larında hazırlanır; HTTP üzerinden
rol veya üyelik verme yolu yoktur. Gerçek IdP/SSO/MFA doğrulaması henüz yoktur.
SSO callback, session revocation, üyelik yönetimi ve aynı mevcut Supabase
projesinde işlemsel üretim deposu ayrıca tamamlanmalıdır. Test fixture'ı canlı
kimlik doğrulaması diye sunulamaz.

Mevcut `/api/rozet/uret` yalnız mevcut üç sentetik kişiyle çalışan eski pilot
laboratuvarıdır; bu turda kaldırılmadı. Yeni akademik ihraç yolunu atlayıp
gerçek belge düzenleme yolu olarak kullanılamaz. Resmî kullanıma geçişte bu
laboratuvar yazma yolunun ayrılması/kapatılması B12'nin açık kabul maddesidir.

Yeni yerel imzalar `https://local-acceptance.invalid` kapsamındadır; dış
kurum, kamu doğrulama servisi veya üretim durum listesi gibi sunulamaz.
Eski pilot imza anahtarları okunmadı veya değiştirilmedi. Anahtar rotasyonu
testi yeni kabul çekirdeğine ilişkindir; eski canlı rozet servisinin anahtar
geçmişi henüz bu modele taşınmadı.

`share` yalnız sınırlı yerel kayıt özeti döndürür; kamu HTTP paylaşım hizmeti
henüz açılmadı. Resmî tanıma, OBS aktarımı, ücretli tahsilat, işveren erişimi,
AI değerlendirme ve NFT hizmeti bu değişiklikle açılmaz.

## Testler

29 yerel çekirdek/LMS/sicil testi, 15 mevcut erişim/rozet testi, 1 yeni gateway testi, 21 portal testi ve
28 model/kaynak testi kendi kapsamlarında geçti. Test sayıları kurumsal
üretim hazır oluş puanı değildir.

- `node --test tests/myys.test.mjs`: yeni yerel kabul ve negatif güvenlik testleri.
- `npm test` (`gazi/auth`): eski rozet/oturum + yeni çekirdek.
- `npm test` (`gazi/portal`): 21 mevcut durum, ders ve materyal testi.
- `node --test gazi/model.test.mjs gazi/governance.test.mjs gazi/workspaces.test.mjs gazi/enhancements/reference.test.mjs`: 28 eski model, rol, tanıma ve kaynak testi.
- `npm run build --prefix gazi/portal`: arayüz derlemesi.

Bu testler canlı entegrasyon, resmî akademik kabul veya WCAG uygunluğu değildir.
Yeni ekranın tarayıcı/ekran okuyucu kabulü geçmedi: yerel Chromium bulunamadı, standart Playwright indirmesi geçersiz arşiv döndürdü; bulut tarayıcı yerel kabul portunda ERR_CONNECTION_REFUSED verdi. Bu sonuç başarılı görsel kabul değildir.

## Sonraki üretim kapıları — tek liste

1. Mevcut Gazi kimlik sağlayıcısı, test erişimi, kişi anahtarı, dokuz rolün
   gerçek atamaları ve MFA/oturum iptal sözleşmesi.
2. Mevcut Supabase projesindeki yeni işlemsel şema/adapter için ayrı üretim
   migration yetkisi, veri yerleşimi/saklama ve yedek/geri dönüş kararı.
3. Program sahibi, karar sahibi, hukuki düzenleyici, teknik imzalayan ve
   program/kurum yetki kanıtları; mikro yeterlilik ile merkezi SEM yolu ayrı.
4. GUZEM veya seçili LMS'nin gerçek veri sözleşmesi ve yetkili test ortamı.
5. 10 Ekim 2026 13:50:07 Türkiye saati itibarıyla güvenli paketlerin kademeli yayın yetkisi verildi. Bu yetki canlı migration, dış abonelik, kalıcı erişim veya kurum adına belge yetkisi sayılmadı. Dağıtım sonuçları ayrıca RELEASE kaydında doğrulanır.

Bu kapılar yerel kod/test çalışmalarını engellemez; canlı kurum verisi veya
resmî hizmet açılışı yerine sentetik örneklerle tamamlandı gösterilemez.

## İkinci kod dilimi

- `registry.mjs`: veri akışı, içerik hakları, tanıma politikası, LMS sözleşmesi ve kurum sorumlulukları için zorunlu alanlı değişmez sicil. Hazırlayan kendi sicilini inceleyemez. Yerel kabul hukuki onay veya lisans hakkı yaratmaz. Hak sicilinin materyal dağıtımına zorunlu bağlanması hâlâ açık iştir.
- `lms.mjs`: yalnız iç sentetik sözleşme için HMAC imzalı olay alımı; kaynak kişi eşlemesi sunucu tarafında; kabul/işleme ayrı; tekrar, aynı sürüm çakışması ve sırasız olaylar denetlenir. Gerçek GUZEM/UzemGO/LTI adaptörü değildir.
- Not düzeltmesi ve lisans iptali kabul edildiğinde eski kaynak kanıtı ihraç için kullanılamaz; eski akademik karar silinmez. Kaynak notu tek başına yeni başarı kararı oluşturmaz.
- `academic-forms.jsx`: program/çıktı/görev/rubrik, kayıt ve sicil formları.
- `scripts/myys-local-acceptance.mjs`: yalnız loopback adresinde, geçici sentetik kişileri kullanan görsel kabul sunucusu; üretim paketine alınmaz.
- 36 paketin her birinde `independent_remaining_work`, `development_blocker` ve `production_activation_blocker` ayrı tutulur. Dış erişim eksikliği bağımsız kodun tamamlandığı anlamına gelmez.

## Gereken eylemler ve etkileri

| Eylem | Hedef | Etki / sınır |
|---|---|---|
| Güvenli giriş üzerinden tek kullanımlık doğrulama | Mevcut Gazi pilotunda oturumlu canlı smoke | Yeni yetki veya kalıcı hesap yaratmaz; kod sohbette istenmez |
| IdP sözleşmesi ve yetkili test kimlikleri | Kişi bazlı SSO/MFA adaptörü | Kurum/birim yetkilerinin yanlış eşlenmesi erişim riski taşır |
| Test edilmiş şema için ayrı migration izni | Mevcut kurum üretim deposu | Kalıcı veri değişikliği; geri alma ve yedek planı gerekir |
| LMS/OBS teknik şema ve yetkili test ortamı | Gerçek sağlayıcı adaptörleri | Yanlış kişi/not eşlemesi riski; sentetik test önce gelir |
| Akademik/hukuki sorumluluk ve saklama kararları | Resmî hizmet etkinleştirme | Yazılım sicili kurum onayı yerine geçmez |

Genel yayın yetkisi mevcut pilotun korumalı ekranını güncellemeyi kapsar; bu tabloda ayrı belirtilen kurum/veri yetkilerini sağlamaz.
