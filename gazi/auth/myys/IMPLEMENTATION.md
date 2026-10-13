# MYYS uygulama kaydı — 10 Ekim 2026

Kaynak tabanı: `ffae561ebe5120f7d063d929b8b4954829ba0adc`.
Çalışma dalı: `feat/gazi-myys-governed-core-20261010`.
Özgün plan: `libfile_dcd1d1343b048191a8d94c43c1ac1be5`, içindeki 36 paket
`backlog.json` dosyasına kimlik, bağımlılık ve kabul ölçütleriyle aktarılmıştır.

## Teslim kapsamı

Bu değişiklik ilk kritik dilimin **izole yerel kabul uygulamasıdır**. Üretim
veritabanına migration uygulanmadı, kimlik sağlayıcısı bağlanmadı. İlk korumalı arayüz paketi canlıya yayımlandı; dağıtım ve gerçek kontrol kanıtı `RELEASE.md` dosyasındadır. B01–B36'nın tamamı bitmiş değildir. Her paketin tamlık,
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
Önceki turda yerel Chromium ve bulut loopback erişimi engelliydi. 10 Ekim devam turunda npm üzerinden sabit sürümlü Chromium 138.0.7204.0 yerel test için çalıştırıldı. B11 gerçek React/HTTP çekirdeğinde 9 çekirdek rol ve 12 sentetik kişiyle 13 tarayıcı kontrolünü geçti. Gerçek IdP, tam ekran okuyucu ve bütün ekranların kabulü değildir.

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

## Paket 4 — B11 tarayıcı kabulü

İtiraz ekranı bağlı yeni değerlendirmeyi ve yeni kararı gösterir; eski gerekçeler korunur. Karar formu yalnız sunucunun `allowedActions` izniyle görünür; verilmiş karar yeniden sunulmaz. Etiketler, mobil metin sarımı ve seçili sekme görünümü iyileştirildi. `scripts/myys-appeals-browser.cjs` loopback dışına çıkmaz, yalnız geçici sentetik kişileri kullanır ve üretim paketine alınmaz. 58 sunucu + 46 portal + 46 regresyon testi geçti.

## Paket 4 yayın sonucu ve B06/B07 hazırlığı

Paket 4 `2743da31b6b6e278dfc13b27e8bc79145b708731` / `dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV` ile production READY. Sınırlı canlı smoke ve geri dönüş hedefi `RELEASE.md` içinde.

`identity-contract.mjs` sürümlü issuer/audience/açık anahtar/MFA profilini doğrular; `resolveLocalMember` yalnız izole kabul deposunda mevcut kişi ve süreli üyelikleri okur. Token/e-posta/rol iddiaları yetki oluşturmaz. Yeni 29 testle sunucu toplamı 87, kaynak toplamı 179. Ayrıntılar `IDENTITY-CONTRACT.md`; yeni SSO giriş yolu veya üretim depo adaptörü değildir. Bu hazırlık canlıya dağıtılmadı. Kalıcı nonce/callback ve oturum yaşam döngüsü açık kalır.

## B06/B07 ikinci yerel kabul dilimi

`identity-flow.mjs` tek kullanımlık kalıcı istek ile PKCE/state/nonce, atomik oturum ve denetim, kurum kapsamı ve çıkış işlemlerini ekler. `store.mjs` yalnız yeni yerel oturumların tenant bağını denetler. 27 yeni testle sunucu 114, toplam 206; B11 13 tarayıcı kontrolü yeniden geçti. Gerçek HTTP/IdP ve üretim depo adaptörü açık. Yayın durumu RELEASE.md ve backlog.json içinde.

Paket 5 yayın sonucu: `24b41c8dba48bfa261a51613fbbc3a83a7939f13` / `dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg`, production READY. 136 kaynak dosyası SHA eşleşmesi ve sınırlı canlı smoke geçti. Kurumsal SSO etkinleştirilmedi; HTTP/IdP, kurum depo adaptörü ve dağıtık iptal açık.

## Paket 6 yerel dilimi — B16/B17

`LocalLmsWorker` append-only işçi geçmişi, atomik lease, süre aşımı sonrası geri kazanım, sınırlı üstel yeniden deneme ve karantina ekler. Alındı/denetim tek transaction içindedir. İki SQLite bağlantısında tek işçi ve geç sonuç reddi sınandı; dağıtık üretim testi değildir. Yalnız tanınan geçici hata kodları tekrar edilir; ham hata mesajları saklanmaz. Üyelik işleme sırasında yeniden kontrol edilir. Karantina incelemesi tekrar yetkisi vermez.

`#/academic` → Aktarım ve mutabakat: bilgi işlem/kalite minimal olay durumunu görür; teknik rol özel kanıtı görmez. Öğrenci işleri aynı birimde CSV veya karar seçimiyle 1–100 satır kayıt oluşturur, her satırı işler, kısmi sonuçları yeniden açar ve UTF-8 CSV indirir. Geçerli satırın ihraç yetkisi ile sonuç/denetim atomiktir. Eksik/yinelenen kişi satırları korunur; yetki ve itiraz tekrar denetlenir. Gönderilen/kabul/işlenen/hazırlanan/imzalı/teslim ayrı sayılır.

221 otomatik test, 8 yeni + 13 B11 tarayıcı kontrolü geçti. İmza, teslim, gerçek HTTP LMS alımı ve üretim adaptörü bu dilimde bağlı değildir; B16/B17 kısmi kalır.

## B18 özel cüzdan dilimi

`wallet.mjs` cüzdanı gerçek kişi/birim üyeliğine göre projekte eder; indirmede sahiplik ve güncel karar/iptal yeniden kontrol edilir. `wallet-workspace.jsx` indirme, tek sefer görünen süreli paylaşım ve iptali mevcut akademik alana bağlar. `#/shared/…` yerelde yalnız minimal özet gösterir. Token HTTP query yerine fragment ve POST gövdesindedir; kalıcı komut önbelleğine ham token yazılmaz. Production koruması değişmez; gerçek kamu hizmeti açılmadı. 9 sunucu ve 8 tarayıcı kontrolü geçti.


## Paket 8 — program ilişkileri ve tarihsel karar dayanağı

- Yeni görev ve rubriklerde çoklu outcomeIds/taskIds; eski outcomeId biçimi değiştirilmeden okunur. Tekil, dolu, aynı program kapsamlı ilişki ve toplam %100 denetlenir; çoklu ilişki puanı çoğaltmaz.
- Güncel önceki sürüme bağlı değişiklik gerekçesi, bağımsız yayın; eski öğrenci/kanıt/karar yeni sürüme otomatik taşınmaz.
- Değerlendirmede programSnapshot/programDigest; karar arşivinde tarihsel payload hash ve güncel kullanılabilirlik ayrı. Arşiv indirmesi aynı rol/birim kuralına tabidir. İmza veya kurum belge yetkisi iddiası yok.
- Program sürümleri ekranında katalog arama, çoklu yazarlık, ilişki özeti, sürüm farkı; Akademik kararlar ekranında dayanak arşivi indirme. Ekran okuyucu etiketleri Türkçe.
- 148 sunucu + 46 portal + 46 regresyon = 240 test; 8 program tarayıcı kontrolü. 390 px mobil, başka öğrenci gizliliği, arşiv içeriği ve yeniden yükleme doğrulandı.


## Paket 9 — kaynaklı politika, tanıma ve tekil yerel kredi

- B20 politika kaynağı/maddesi/sürümü/tarihi/geçerliliği, hedef diploma programı ve iki ayrı payda saklanır. Kurum kuralı önceden doldurulmaz; politika hazırlayan inceleyemez. Gazi RPL kaynağı okundu; YÖK metninin yeni erişim hatası ve taranmış transfer metni sınırlaması RECOGNITION-CONTRACT.md içinde.
- B21 talep aynı kişinin program kaydına bağlı. Dosya özeti istemcide; dosya kuruma teslim edilmiş sayılmaz. Teknik inceleme insanın rapor kaydıdır; kredi oluşturmaz. Akademik kararı başka yetkili verir.
- Tam/kısmi/red; kanonik kazanım + hedef ders + kaynak belge çıktısı çift sayım denetimi; yüzde sınırları tam sayı kredi alt birimiyle. Yeni politika eski başvuruyu ve mevcut kredi toplamını sıfırlamaz.
- İtiraz krediyi bekletir. Bağımsız yeni karar, eski kredinin ters kaydı ve yeni kredi aynı transaction içinde; geçmiş silinmez. IT yalnız gereken belge alanlarını görür, kredi/karar/akademik eşleme gerekçesi görmez.
- Tanıma ve kredi sekmesinde politikalar, başvurular/kararlar, tekil defter. 14 yeni sunucu testi, 12 tarayıcı kontrolü; toplam 254 otomatik test. Gerçek kurul/entegrasyon ve çok dersli kaynak kabulü açık.


## Paket 10 — OBS outbox ve mutabakat provası

B22: değişmez karar kaynaklı olay, ayrı yerel alındı ve öğrenci işleri mutabakatı; red, içerik uyuşmazlığı ve güncel karar bekletme ayrılır. Son mutabık olaya bağlı düzeltme/iptal; eski kararın daha yeni kredi değişiklikleri atlanmaz. Teknik rol kişi/kredi görmez. Vercel'de simülatör ayrıca kapalıdır. Ağ çağrısı yoktur.

Aktarım ve mutabakat ekranına OBS hazırlığı, filtre, alındı örneği, satır mutabakatı, güncel karar düzeltmesi ve CSV eklendi. 173+46+46=265 otomatik test; 11 OBS ve yeniden 8 B16/B17 tarayıcı kontrolü. Gerçek sağlayıcı şeması, yazma izni ve transkript/diploma eki kabulü açık.

## Paket 20 — B11 yerel politika dilimi

`APPEAL-POLICY-CONTRACT.md`: admin hazırlığı, ayrı komisyon incelemesi, kaynak/program/politika sürümü, karar anındaki değişmez dayanak, sahibi tarafından yerel teslim teyidi ve belirsiz/geç süre için ayrı insan incelemesi. Eski karar ve imzalı dosya korunur. UI politika sicili ve karar/itiraz bölümlerine bağlıdır. 384 otomatik + 13 politika + 13 itiraz + 17 değiştirme tarayıcı kabulü; canlı/kurum kabulü açık.
