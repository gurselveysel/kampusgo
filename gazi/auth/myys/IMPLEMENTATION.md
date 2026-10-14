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

## Paket 21 — B07 yerel HTTPS dilimi

`identity-http.mjs` ve HTTP-IDENTITY-CONTRACT.md; mevcut akış ve üyelik doğrulamasını aynı kişiyle gerçek React paneline bağlar. Cookie/Origin/CSRF, tek kullanımlık callback/iptal ve çıkış yarışları; panelde oturum süresi/çıkış/yeniden giriş. 403 otomatik + 11 HTTPS + 13 itiraz tarayıcı kabulü. Mevcut pilot gateway ve configuredCore üretim kapısı korunur.

## B08 mevcut yerel yüzey matrisi — 2026-10-13

SCOPE-ACCEPTANCE-CONTRACT.md, scope-inventory.json ve myys-scope-acceptance.mjs: geçerli komut kopyasıyla tüm mevcut kurum/birim/tekrar/okuma kontrolleri; HTTP arşiv/cüzdan/imza/durum/toplu/kişi ihracı. Alan hatasıyla karışan 403 ayrıldı, saklama yabancı önizlemesi 404. Kurum görevi veya üretim RLS kabulü uydurulmadı; configuredCore kapalı.

## B10 alternatif ölçme — 2026-10-13

ALTERNATIVE-EVIDENCE-CONTRACT.md: eğitici kaydı → ayrı kalite incelemesi → tam rubrik → ayrı komisyon → mevcut belge profili/ihraç. Değişmez kanıt/moderasyon snapshotı ve kişisel arşiv; yeni sürüm geçmişi değiştirmez, ekranda etkisi görünür. Hazırlayan/moderatör bağımsız karar ve kendi itirazında görev alamaz. Kaynak doğrulaması yerel insan incelemesidir; kurum usulü veya gerçek dış dosya kabulü diye sunulmaz.

## B23 yerel SEM dosyası — 2026-10-14

SEM-DOSSIER-CONTRACT.md ve SEM-SOURCE-REVIEW.md: kaynakların okunan/kalan kapsamı, program snapshotı, iç kontrol listesi ve ayrı görevlerle hazırlık paketi. Tarihsel duyuru/genel haber teknik şema veya otomatik karar yapılmadı. Güncel sürüm/geri çekme ve tekrar/atomiklik denetlendi. Merkezi düzenleyici yetkisi yerel kullanıcıya verilmedi; dış gönderim/resmî ihraç kapalı.

## Paket25 — B07 yerel sağlayıcı çıkışı ve oran sınırı

Akademik panelin yeniden giriş akışı ve yerel giriş bekleme ekranı tamamlandı. `identity-revocation.mjs` doğrulanmış provider eşlemesi/tek makbuz/iptal bariyerini, `identity-rate-limit.mjs` kalıcı kapsamlı kotayı mevcut HTTPS akışına bağlar. Başka tenant tarayıcı bağını döndürme de başlangıç ve commit sırasında reddedilir. 372 sunucu +46 portal +46 regresyon; 15 HTTPS tarayıcı kontrolü. BACKCHANNEL-IDENTITY-CONTRACT ve kabul JSON sınırları açıklar. Gerçek transaction/anahtar adaptörü, dağıtık kabul ve IdP hâlâ açıktır.

## Paket26 — B09 imzalı kaynak dosyası ve arşiv

`source-packet.mjs` mevcut LMS olay/worker/kanıt/değerlendirme/karar zincirine bağlıdır; ikinci veri deposu oluşturulmadı. Üç yeni özel HTTP yolu ve Aktarım ve mutabakat dosya akışı; yalnız işlenmiş güncel kanıta eğitici işlemi. `verify-source-archive.py` ayrı güven dosyasıyla özgün kaynak imzası ve tarihsel rubrik hesabını denetler. Karar dış zarfı imzasız; gerçek sağlayıcı ve kaynak güven sicili yaşam döngüsü açık. 391 sunucu +46 portal +46 regresyon, 14 kaynak/13 itiraz tarayıcı. Sözleşme ve sınırlar SOURCE-PACKET-CONTRACT.md içinde.

## Paket27 kaynak adayı — B27/B07/B13/B16/B08 (14.10.2026)

Kurtarma tatbikatları ekranı: plan → sunucu sentetik provası → ölçüm/indirme → ayrı yönetici incelemesi. Eski/bozuk yedek, oturum/iptal, kesilen kuyruk/tek makbuz, riskli anahtar/yanlış ihraç ve tarihsel arşiv birlikte doğrulandı. 403+46+46=495 otomatik; 13 tatbikat +14 kaynak +13 itiraz tarayıcı; 74 komut/16 HTTP, 3128 örnek/25024 kontrol. 390 px form incelendi. Gerçek RPO/RTO, üretim adaptörleri ve dağıtık geri dönüş açık; kaynak yayını canlı yayın değildir. Son canlı Paket16; 17–27 dağıtımı yok.

`RECOVERY-CONTRACT.md` ve `acceptance/B27-recovery-20261014.json` sınırlar/kanıtlar. configuredCore kapalı. Korunan 115 dosyalı paket üretildi; başarısız veya doğrulanmamış dağıtım yapılmış sayılmadı. Canlı alias 14.10.2026 yeniden dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1, uygulanmadı.

## Paket28 kaynak adayı — B09/B15/B16/B13/B08 (14.10.2026)

Kaynak güven sicili: sürüm/tarih/dayanak, ayrı ret-kabul, açık güven dosyası ihracı, anahtar/kontrat kapanışı. İptal mevcut kanıt/karar/cüzdan/paylaşım/durum uygunluğuna yayılır; tarihsel arşiv aynı kalır. Eski statik kayda geriye dönük onay eklenmez; yeni incelemeli imzalı sürüm gerekir. 418+46+46=510 otomatik; 15 yeni sunucu testi, 14 güven sicili +14 kaynak +13 tatbikat +13 itiraz tarayıcı. 77 komut/16 HTTP: 3337 örnek/26696 denetim. 390 px görünüm ve odak incelendi; 115 korumalı statik dosya paketlendi. Kaynak adayı canlı yayın değildir; son canlı Paket16, Paket17–28 dağıtımı yok. Gerçek sağlayıcı, üretim adaptörü, kurumsal karar ve dış kabul açık.

`SOURCE-TRUST-CONTRACT.md` ve `acceptance/B09-trust-20261014.json`. configuredCore Vercel üzerinde kapalı; yeni credential, migration veya gerçek belge işlemi yok. Geri dönüş hedefi dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı.


## Paket29 · B07 bağımsız adaptör sınırları

Ekran değişikliği yok. PostgresIdentityTransactions yalnız enjekte edilen tek client ile serializable transaction, sıralı xact kilidi, başarısız audit rollback, opt-in 40001/40P01 bütün işlem tekrarı ve belirsiz COMMIT için sonuç vermeme/bağlantıyı atma uygular. IdentityKeyProvider yalnız PKCE/nonce için version/purpose/tenant/contract bağı, zamanlı MAC ve öncesi/sonrası metadata denetimi yapar; sır çıkmaz. Yeni bağımlılık, driver bağlantısı, migration veya credential yok. 20 yeni hata sürücüsü testi ve 15 mevcut HTTPS tarayıcı kontrolü; toplam530. SQL repository/HTTP bağlaması, atomik key revision bariyeri ve gerçek PostgreSQL/KMS kabulü açık. IDENTITY-ADAPTER-CONTRACT.md sınırları belirler.


## Paket30 · B15 kaynak ders kaydı ve ilerleme

Aktarım ve mutabakat ekranına kişi/program/ders kayıt ve ilerleme kartı, arama/filtre/kayıt geçmişi eklendi. Yeni imzalı myys-source-registration/1 bildirimi mevcut kaynak güveni, kuyruğu ve yerel program kaydına bağlanır; kendi başına enrollment/karar üretmez. İptal kabul anında uygunluğu kapatır; yeni etkin kayıt ve yeni görev bildirimi gerekir, eski insan kararı ve arşiv aynı kalır. Worker geç sonucu karantinaya alır. Güncel kaynak güveni/registrationFalse veya lisans iptali completion göstergesine de yansır.11sunucu,15yeni+28regresyon tarayıcı;449+46+46=541. Sağlayıcı bağımsız B15 dilimi geçti, gerçek vendor/kurum/üretim kabulü açık. LMS-REGISTRATION-CONTRACT.md ayrıntıları.

## 14.10.2026 — 31. yazılım dilimi / B01–B24

PILOT-INVENTORY.md: özgün ZIP’te27 Gazi satırı ve13 kaynak kaydı; gazi-baseline-27.json değişmemiş alanlar, pilot-inventory.json güncel davranış/rota/regresyon/açık koşullar. NAVIGATION-ACCESSIBILITY.md: mobil odak/inert, Radix geri dönüş, rota odağı, kaynak/matris/rozet sekmeleri, filtre semantiği ve kararlı alan adları. Öğrenci katalog öneri düğmesi sunum rolüne göre kısıtlandı.

544otomatik (452+46+46),18yeni gezinme+13itiraz+8cüzdan;98menü/11profil,234panel/9rol,66ders ve iki tür gerçek dosya indirmesi. Yerel test sunucusunda eski modüller ve yalnız kamu reference.json sunulur; üretim koruması değişmedi. Başarılı tarama gerçek iframe başlığını/içeriğini bekler. Tam ekran okuyucu, altyazı, belge ve her modal/form kabulü açık. configuredCore Vercel’de kapalı;17–31 yayını yok.

## Paket32 — Destek kayıtları ve güncel rehber

B26: `support-service.mjs` sürümlü yerel takvim/ayrı inceleme/hold; `support-service-model.mjs` açık çalışma dakikası ve sabit hedef döngüsü. `support.mjs` çözüm/sahip teyidi/yeniden açma ve mevcut kuyruk sınırı; kalite payı teyitli kapanışı korur. Yeni rol arayüzü arama/filtre/geçmiş/indirme ve mobil takvim içerir. Rehber2026.10.14.1 eski bilinen soruları ve yanıtları korur; akademik derin bağlantılar/yenileme çalışır. Kullanıcının yeni sayfada seçtiği odak animasyon tamamlanınca değiştirilmez. 559 otomatik,16 destek/19 gezinme/13 itiraz/8 cüzdan;80komut/16HTTP,3502örnek/28016kontrol. Gerçek hizmet taahhüdü veya kurum eğitimi kabulü değildir; `SUPPORT-SERVICE-CONTRACT.md` sınırları ve ACCESS-ACTIONS madde7 geçerlidir. Dağıtım yok.

## Paket33 — Koşullu mali akış

`payment.mjs` yedi yerel komut, aynı öğrenen/program/sicil bağı ve görev ayrılığı; `payment-model.mjs` kuruş bazlı durum/iadeler/ters ibraz/toplam/dayanak; olay kimliği ve semantik tekrar için atomik makbuz. Mali durum akademik kayıt değiştirmez. Yeni Mali prova ve mutabakat sekmesi Finans menüsüne bağlıdır; arama/filtre/geçmiş/indir ve mobil form kabulü var. 478+48+46=572otomatik;16mali+19gezinme+13itiraz;87komut/16HTTP3752örnek30016kontrol. Gerçek tokenizasyon/PSP/muhasebe veya kurum mali yetkisi yok; PAYMENT-CONTRACT/ACCESS-ACTIONS8 sınırları. B31koşullu genel kabul açık.

## Paket34 — İkinci birim kapasitesi

`capacity.mjs` iki birimde yönetici hazırlığı/ayrı kalite incelemesi, ilk kohort revizyon özeti, sürüm/son gün/durdurma ve kayıt-kuyruk-satır kotasını bağlar. Core enrollment, LMS intake ve batch-create aynı işlemde kapasiteyi doğrular ve kabul sürümünü sabitler. Eski iş bitirilebilir; kaynak iptali güvenlik muafiyetiyle gelir. CapacityWorkspace mevcut akademik kişi/rol/kurum verisini kullanır.11yeni sunucu ve14tarayıcı;583otomatik;90komut/16HTTPkapsam matrisi. B32 genel kabul kısmi; gerçek kurum ve dağıtık depo/yük açık. CAPACITY-CONTRACT.md esas ayrıntıdır.

## Paket35 — Uzman eşleme ve düzeltme

`skill-map.mjs` program/kaynak/sicil sürümlerini, tam kaynak adresi ve görev dayanağını sabitler. Atanmış bağımsız komisyon görevlisi her ilişkiyi inceler. Kendi programındaki öğrenen hata bildirir; düzeltme yeni sürüm ve aynı bildirim referanslarıyla ayrı kabul edilir. Eski akademik kayıt/SHA değişmez. `projections.mjs` aynı kişinin güncel karar/kanıtından ayrı taksonomi durumunu çıkarır; kurumsal expertTaxonomyApproved=false. `SkillMapWorkspace` mevcut Beceri ilişkileri sekmesini kullanır; yeni rol veya kopya öğrenci deposu yok.11yeni sunucu/14tarayıcı;594otomatik,94komut/16HTTP. SKILL-MAP-CONTRACT.md kaynak ve gerçeklik sınırını kaydeder.

## Paket36 — Amaçlı portfolyo ve ayrı geri bildirim

`portfolio-model.mjs/portfolio.mjs` aynı enrollment/imzalı belge/B33ilişki/karar kanıtlarını dar izinle bağlar; ayrı incelenmiş tamamaç/alıcıdataflow,issuer-subject özeti,MFA,süre,source ve replayguards. Yeni core rol yok; sentetik alıcı yalnız somut izinle okur. Erişim makbuzu içerik taşımaz;view güncelizin+teyit varsa seçili veri döndürür. Strictfeedback puan/başarı/ret yazmaz. Privacy-withdraw-shares portfolyoyu da kapatır; öğrenen exportallowlist sınırlı yeni kayıtları içerir. PortfolioWorkspace consentdefaultempty/arama/geçmiş/export/mobil/klavye.11yeni sunucu/14browser;605otomatik;101komut/16HTTP. Gerçek işveren ve tam B28saklama/başvuru kabulü ayrı açık.

## B35 · Paket37 bağımsız yerel öneri kıyası

`advice.mjs` ve `advice-workspace.jsx`: yedi komutla sürümlü protokol, ayrı kalite incelemesi/durdurma, tam rubrikli sentetik öneri, atanmış bağımsız uzman kıyası, öğrenen itirazı ve ayrı düzeltme. Akademik puan/karar/belgeye yazma yolu yok. Kişisel özet dört yeni kayıt türünün dar alanlarını içerir. `ADVICE-CONTRACT.md` ve B35 kabul JSON'u geçerli sınır ve kanıtı açıklar. 618 otomatik/56 tarayıcı kontrolü; gerçek sağlayıcı-plan-dil kabulü ve canlı yayın açık.

## B36 · Paket38 bağımsız cüzdan keşfi

`wallet-study.mjs`, `wallet-study-model.mjs` ve `wallet-study-workspace.jsx`: mevcut özel cüzdan/açık protokol/zincir alternatiflerini kaydeden, iki ayrı disiplin incelemesiyle erteleme veya zincirsiz keşif önerisini sürdüren yerel modül. Üç komut, sürüm/durdurma; gerçek test sonuçlarını veya transportu açan alan yok.626otomatik/51tarayıcı geçti;kurum ihtiyacı ve gerçek dış cüzdan kabulü açık. Ayrıntı `WALLET-STUDY-CONTRACT.md` veB36JSON.

## B02 · Paket42 belge ekli yetki dosyası

Politika ve hak sicili içinde gerçek yerel ek yükleme/indirme, program/sicil/ek SHA bağı, dört sorumluluk kapsamı, UTC geçerlilik, ayrı yönetici incelemesi, yeni sürüm ve durdurma. `authority.mjs` beş komut ve altı kayıt türü; ham dosya workspace/command.result dışında. Belge profili dosyanın kimliğini/SHA'sını sabitler; yeni dosya eski profil bağını veya imzalı belgeyi değiştirmez. 13 yeni test/13 yeni tarayıcı kontrolü; 664 otomatik toplam. `AUTHORITY-DOSSIER-CONTRACT.md` ve B02 kabul JSON'u sınırları açıklar. Gerçek kurum yetkisi, tam kaynak, dosya tarama/e-imza/üretim deposu ve canlı kabul açık.

## B03 · Paket43 program bilgi paketi görünürlüğü

`program-package.mjs` program/profil/yetki bağını aynı SQL okuma işleminde denetler; yeni `program-paketi` HTTP yolu idari atama ve ek baytlarını açmadan program snapshotı/profil referansını indirir. Program sürümleri yedi dayanak durumunu gösterir; eski ekrandan indirmede güncel kontrol ve yenileme vardır. Mevcut yerel publish tam kurumsal onay sayılmaz.672 otomatik/30 tarayıcı;ayrıntı PROGRAM-PACKAGE-CONTRACT.md ve B03 JSON.

## Paket44 — B05/B25 ders ve materyal kabulü (14.10.2026)

Ders ve materyal ekranı 66 dersin envanterini, program/görev/rubrik eşlemesini, sürüme bağlı hak sicilini, ayrı yönetici hak kararını ve ders başına kalite incelemesini sunar. Yalnız kayıtlı öğrenen veya yetkili görevli özgün HTML/CSV teslimi alır; kalite incelemesi için ayrı indirme amacı vardır. Öğrenme kanıtı aynı kişinin teslimine bağlanır; insan değerlendirmesi ve ayrı karar korunur. Harici dosya kopyası/marka/API kapalı; yeniden yayın yalnız ayrıca izinli dosya hazırlığı, gerçek yayın yok.

591+48+46=685 otomatik;14 materyal+19 gezinme+13 itiraz=46 tarayıcı;123 komut/17 HTTP,7028 pozitif örnek/56224 türetilmiş olumsuz denetim;98 menü/288 rol paneli,390 px/klavye. 6 koleksiyon22 modül66 ders ve88 özgün dosya baytları aynı,115 korumalı statik dosya. Kaynak altında yeni133 kayıt türü,14 tablo. İlk tarayıcı koşusundaki aynı adlı summary/button seçici belirsizliği testte giderildi; son tam akış geçti.

B05/B25 bağımsız yerel alt koşulları kapandı; gerçek yazılı sağlayıcı/hak sahibi kararı, seçili Gazi programının akademik/dil/erişilebilirlik incelemesi ve üretim dağıtım adaptörü açık. Bütün iş paketleri tamamlanmadı. Ayrıntı MATERIAL-RIGHTS-CONTRACT.md, MATERIAL-SOURCE-REVIEW.md ve B05-B25 kabul JSON’unda. Yeni canlı yayın ve canlı smoke yok; son canlı16 READY,17–44 dağıtılmadı;configuredCore kapalı.

## Paket45 — B07 yerel türetme anahtarı commit bariyeri (14.10.2026)

Yeni panel/menü yok. Mevcut HTTPS girişinde anahtar sürümü/durdurma, tek kullanımlık challenge ve oturumun aynı commit işlemine bağlıdır. Güvenilen yerel operatör dönüşümü ve paylaşılan anahtarı tenant/issuer/audience kapsamlarında durdurma, audit ile atomiktir. Eski işçi/istek yeni revizyonu kullanamaz; doğru anahtarlı isteği yanlış işçi tüketmez. Provider beklerken ve imza doğrulamasından sonra ikinci bağlantıda iptal yeni çerezi engeller. Önceki akademik oturumun normal süre/üyelik/çıkış denetimleri korunur.

11 yeni test;602+48+46=696 otomatik;15 kimlik+9 temizlik=24 tarayıcı;123komut/17HTTP7056örnek56448denetim;115statik;16teknik tablo/133kayıt türü. B07 yerel alt koşul geçti; IdentityKeyProvider metadata/üretim repository köprüsü, gerçek PG/KMS/IdP/RLS, tüm session yazarları/karma dağıtım ve geri yükleme checkpoint’i açık. `DERIVATION-EPOCH-CONTRACT.md` ayrıntıdır.36 özgün kabul ölçütü değişmedi.

Canlı alias yeniden kontrol edildi: Paket16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY.17–45 dağıtılmadı; yeni canlı smoke yok;configuredCore kapalı. Gerçek credential/migration/kurum kararı yok.

## Paket46 — B20/B21 çok dersli teklif (14.10.2026)

Tanıma ve kredi → Çok dersli teklifler güncellendi. Öğrenen aynı kayıt/politikaya bağlı2–10 dersi birleştirir ve karar öncesi geri çeker. Komisyon tek teklif altında her satırı karara bağlar; toplam uzaktan payda ve ders başına pay/çifte sayım kontrolü yapılır. İtiraz bütün satırları bekletir; bağımsız yeniden karar eski kredileri atomik tersler. OBS eski mutabık satırlardan ayrı replace/cancel zincirini korur. Gerçek belge/kurul/transkript işlemi değildir.

615+48+46=709 otomatik;13 yeni sunucu;11 teklif+12 tek ders+11 OBS=34 tarayıcı;128komut/17HTTP7321pozitif58568türetilmiş denetim;115statik;16teknik tablo138kayıt türü.390px ekran görüntüsü incelendi. İlk hedef testlerinde politika okuma kapsamı ve test fixture referansları düzeltildi; son tam koşular geçti. B20/B21 yalnız belirtilen yerel alt koşullarda kabul; özel istisna/ölçü birimi sözleşmesi, kriptografik dış belge/teslim arşivi, gerçek müfredat/önceki ders, kurum ve dış sistem kabulü açık.

YÖK5sayfa ve Gazi kredi transferi4sayfa önceki erişim/okuma engeli giderildi; Gazi RPL5sayfa yeniden okundu. Kaynak SHA/kapsam/tarih ve yorum sınırları RECOGNITION-SOURCE-REVIEW-20261014.md içinde. YÖK10/3 ölçü birimi otomatik AKTS oranı olarak atanmadı. Ayrıntı RECOGNITION-OFFER-CONTRACT.md ve B20-B21-offers kabul JSON’unda.36 özgün kimlik/başlık/bağımlılık/kabul değişmedi.

Yeni canlı yayın yok:17–46 dağıtılmadı; alias16 READY. Son canlı kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, deploy `dpl_Coaq5KN2VcNpPjwyXke4neroq877`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Authenticated canlı smoke yenilenmedi; browserAuth13Ekim iptali yeniden denenmedi;configuredCore kapalı.

## Paket47 — B20 kaynak ve istisna incelemesi (14.10.2026)

Tanıma ve kredi → Kaynak ve istisna incelemesi eklendi; Politika ve hak sicili tanıma yolunu Türkçe seçimle kaydeder. Yeni politikada zorunlu kaynak/sicil bağı, bağımsız dört teyitli inceleme, sürüm/süre/görev/hold kontrolleri vardır. Eğitim adedi, saat, belirsiz birim ve özel RPL/önceki ders yolları inceleme kaydı alabilir ancak pozitif kredi hesaplamaz. Yeni başvuru ve pozitif karar sunucuda güncel kaynağa bağlıdır; eski karar/kredi/OBS otomatik değiştirilmez. Önceki yerel politika korunur; yeni istemci legacy biçimi üretemez.

626+48+46=720 otomatik;11 yeni sunucu;10kaynak+12tekders+11çokdersli+11OBS=44tarayıcı;131komut/17HTTP7625örnek61000türetilmiş kapsam denetimi;115statik;16tablo141tür.390px görsel inceleme/klavye ve iki SQLite bağlantısında eski karar formu/durdurma geçti. İlk browser option kontrolü DOM disabled özelliğiyle kesinleştirildi; son akış geçti. Kaynak dosyasının baytları veya özgünlüğü doğrulanmış sayılmaz; kaynak/istisna kapalı sözleşmesi B20 kurum kabulü değildir. Gerçek ölçü birimi/istisna/müfredat ve önceki kayıt kaynağı ile buna bağlı koşullu hesap adaptörleri açık.

Ayrıntı RECOGNITION-BASIS-CONTRACT.md ve B20-basis kabul JSON.36 özgün iş/kabul/bağımlılık değişmedi. Yeni canlı yayın yok;17–47 dağıtılmadı. Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Yeni authenticated smoke yok;browserAuth iptali tekrar denenmedi;configuredCore kapalı.

## Paket48 — B21 gerçek belge teslimi

Paket48: gerçek 32 KiB JWT baytları aynı talep/kişi/kurum/birim ve sunucu SHA ile değişmez özel arşive teslim edilir; güncel yetkili indirme ve audit/idempotency atomiktir. İnceleme sonrası değiştirme kapalı; ham dosya çalışma ekranı/kişi özeti/commands sonucuna girmez. İmza/düzenleyici/subject doğrulaması yapılmadı, teslim kredi üretmez. 11 yeni sunucu,11 teslim+34 mevcut tanıma/OBS tarayıcı kontrolü geçti; toplam731 otomatik. 16 teknik tablo144 kayıt türü. Sözleşme `RECOGNITION-DOCUMENT-CONTRACT.md`. Kriptografik doğrulama ve kurumsal/üretim kabulü sıradadır.

## Paket49 — B21 dış belge doğrulayıcısı

Paket49: dış belgeye özel sunucu issuer/anahtar/kişi eşleme sözleşmesi, IT hazırlığı/ayrı yönetici incelemesi, sürüm/süre/anahtar kapanışı; arşiv baytlarından gerçek JOSE RS256, typ/issuer/audience/subject/id/süre denetimi ve asenkron işlem sonrası atomik yeniden yetkilendirme. Makbuz yalnız imza/kişi eşlemesidir; durum/insan teknik kabulü ve kredi üretmez. Mevcut insan raporuna ve karar/OBS güven zincirine zorunlu bağ sonraki bağımsız dilimdir. Sözleşme `EXTERNAL-CREDENTIAL-CONTRACT.md`;743otomatik/47tarayıcı;16tablo148tür.

## Paket50 — B21/B22 bağlı insan raporu ve karar/aktarım (14.10.2026)

Paket50: arşivli olumlu insan raporu güncel imza makbuzuna ve ayrıca insanın incelediği durum kaynağına bağlı; değişmez rapor sürümleri ve kararın sabitlediği teknik rapor korunur. Yeni rapor eski krediyi otomatik yenilemez. Güven kapanışı pozitif kararı ve bütün teklifin OBS kullanımını bekletir; ayrı olumsuz kararın sıfır kredili iptal düzeltmesi yürür. Kişi özeti iç SHA/görevli alanlarını açmaz.

14.10.2026 Paket50:661+48+46=755 otomatik;12 yeni sunucu;12 bağlı inceleme+12 tanıma+11 teklif+11 OBS+13 kriptografik+11 teslim=70 tarayıcı;136komut/18HTTP8453örnek67624kapsam denetimi. 390px geçmiş görüntüsü incelendi; yeni tarayıcıda sekme ve aynı adlı option/Pill seçicileri düzeltildi. Son altı akış tam geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-REVIEW-CONTRACT.md; kanıt acceptance/B21-review-20261014.json.36 özgün iş/bağımlılık/kabul aynı. Yeniden imzalanan belge için kanonik çift kredi koruması, gerçek durum kaynağı/kurul/OBS/üretim kabulü açık.

Paket50 dağıtılmadı; son canlı16 alias dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY yeniden okundu. Yeni authenticated smoke yok; configuredCore kapalı. 17–50 dağıtılmadı. Canlı kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. BrowserAuth iptali tekrar denenmedi. Kaynak commit ve tam ağaç eşitlemesi ayrı kaydedilecek.

## Paket51 — B21 yeniden imzalı belge ve çift kredi (14.10.2026)

Paket51: aynı doğrulanmış issuer/belge/kanonik çıktı kimliği, yeniden imzalanmış farklı dosya veya ders/gain anahtarıyla ikinci kredi oluşturamaz. Eski kredi kararının sabitlediği makbuz, anahtar kapansa veya son rapor değişse de ters kayda kadar sayılır. Tüm teklif rollback ve iki bağlantıda eski form sınandı. Öğrenci/akademik ekranda neden görünür, pozitif seçenek kapalı; yalnız teknik role kredi ayrıntısı açılmaz. Manuel çıktı etiketleri arasındaki anlamsal eşdeğerlik gerçek uzman/kaynak incelemesine bağlıdır.

14.10.2026 Paket51:672+48+46=766 otomatik;11 yeni sunucu;12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=58 tarayıcı;136komut/18HTTP8761örnek70088kapsam denetimi. 390px görsel incelendi. İlk yeni testte ekran için zenginleştirilmiş talep yerine değişmez kaynak talebinin özeti kullanılarak uyarı bağı düzeltildi; son tam koşular geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-IDENTITY-CONTRACT.md ve B21-identity JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul değişmedi.

Paket51 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–51 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

## Paket52 — B21 kararın görülen teknik rapora bağlanması (14.10.2026)

Paket52: her yeni tek ders ve teklif satırı kararı expectedTechnicalId ile insanın gördüğü raporu veya açık null yokluğunu taşır. Eksik/eski/başka rapor409; tek eski satır tüm teklifi geri alır. Arşivsiz yeni karar da aynı kurala bağlı; eski kayıtlar korunur. Ekran yenilenince eski karar taslağı temizlenir; geçmiş kararda gerçekten kullanılan rapor sürümü/ref görünür. Negatif0kredi için imza geçerliliği şartı eklenmez.

14.10.2026 Paket52:678+48+46=772 otomatik;6 yeni sunucu;10 sürüm+12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=68 tarayıcı;136komut/18HTTP8924örnek71392kapsam denetimi. İki ayrı Chromium sürecinde eski komisyon kimliği ayrıca doğrulandı; diğer oturumun ikinci olumlu raporundan sonra eski form gerçekHTTP409 aldı, güncel form başarılı oldu.390px görsel incelendi.16tablo148tür/115statik. RECOGNITION-VERSION-CONTRACT.md ve B21-version JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul aynı.

Paket52 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–52 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

## Paket53 — B07 SQL anahtar commit bağı

Paket53 IdentityKeyProvider genel metadata revizyonunu aynı SQL transaction öncesi/sonrası yeniden denetleyen PostgresIdentityKeyBridge ekledi. SQL değişiklik/denetim atomik; strict+1 ve terminal iptal, amaç/bağlam/scope, emekli devam, süre ve belirsiz COMMIT kapalı. İki aday tablo sadece PGlite testinde; LocalAcceptanceStore16tablo148tür değişmedi. Gerçek oturum repository ve HTTP bağlantısı hâlâ açık. Paket53:16 yeni SQL testi;694 sunucu+48 portal+46 regresyon=788. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite0.5.9/PostgreSQL18.6 tek bağlantı SQL kabulü; gerçek çok bağlantı/KMS/HTTP repository kabulü değil.

## Paket54 — B07 kalıcı SQL giriş isteği

Paket54 PostgresIdentityChallenges anahtar köprüsüyle begin/claim/finish/fail/cancel yaşam döngüsünü bağladı. Claim provider I/O öncesi commit, değişmez state/browser/scope/redirect/contract bağı, tek kullanımlık handle, terminal durumlar ve atomik audit. Belirsiz claim/final COMMIT yeniden kullanılmaz; saat geri giderse kapalıdır. İki yeni SQL adayıyla toplam4 uygulanmamış PGtablosu; aktifSQLite16tablo148tür değişmedi. Kişi/üyelik/session/iptal/HTTP bağlantısı açık. Paket54:18 yeni SQL giriş isteği testi;712 sunucu+48 portal+46 regresyon=806. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite tek bağlantılıdır; yeni repository HTTP/oturum kabulü değildir.

## Paket55 — SQL kişi/üyelik/oturum

Paket55 PostgresIdentityFlow config+redirect tek özetiyle kişi/üyelik, opaque signed proof/MFA, challenge/keybarrier, session ve audit atomik zincirini bağladı. Strict+1 directory control; person ve membership revizyonu sessiona pinli, kapat/aç eski sessionı canlandırmaz. Rotate/parentfamilylogout, sub/sidANDJTI backchannel ve session öncesi iptal bariyeri, timeout ve belirsiz COMMIT kapalı.9 uygulanmamışPGadayı; aktifSQLite16tablo148tür aynı. YeniSQL HTTP/rate/CSRF/akademik sınırı ve güvenilirrestore checkpoint açıktır. Paket55:21 yeni imzalı SQL akış testi;733 sunucu+48 portal+46 regresyon=827. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. Yeni SQL flow henüz HTTP/React/akademik depo bağlantısı değildir; tek bağlantılı PGlite kabulüdür.

## Paket58 — B07 SQL HTTP güvenliği (14.10.2026)

Görünür ekran değişikliği yok. Paket58 SQL HTTP epoch/history/buckets üç adayını bağladı: strict+1 ve anahtar yeniden kullanım yasağı, tüm amaçların aktif bütçe sönmesini bekleyen atomik rotasyon/audit; kapsamlı per-purpose global/peer/browser bütçesi; COMMIT sonrası opak kısa ömürlü permit ve aynı tx sahipliği; cookie/contract/revision HMAC CSRF ve güncel SQL epoch. Yeni toplam12 uygulanmamış PGadayı; aktifSQLite16tablo148tür aynı. Gerçek HTTP claim/finalsession bağı bu pakette açık. Paket58:22 yeni SQL HTTP güvenlik testi;755 sunucu+48 portal+46 regresyon=849. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti; yeni SQL sınırı henüz HTTP/flowa bağlı değil.115 statik;36 özgün kimlik/bağımlılık/kabul değişmedi. IDENTITY-HTTP-SECURITY-CONTRACT.md ayrıntıdır. B07 tam kabul ve yeni canlı yayın değildir.

## Paket59 — yerel SQL HTTPS giriş/oturum ekranı (14.10.2026)

Paket59 LocalPostgresIdentityHttp ayrı loopback HTTPS ve Türkçe giriş/oturum ekranını SQL kişi/üyelik/sessiona bağladı. Aynı private güvenlik nesnesinin permit/epoch guardı begin/claim/finalsession/principal/logout/backchannel transactionlarının başı/sonunda; sağlayıcı beklerken üyelik veya epoch değişirse kabul yok. No-store/TLS/Host/Origin/CSRF/cookie/body/tek callback/timeout/unknownCOMMIT kapalı. Akademik SQL zinciri bağlı değil;academicAccessfalse,officialfalse;Vercelde kapalı.12 PGadayı/16aktifSQLite148tür aynı. Paket59:29 yeni test (26 gerçek HTTPS+SQL,3 guard);784 sunucu+48 portal+46 regresyon=878. Yeni SQL giriş ekranında13, eski yerel girişte15 Chromium kontrolü geçti;320CSSpx/metin aralığı/odak/logolar incelendi. IDENTITY-SQL-HTTP-CONTRACT.md ayrıntıdır.36 özgün kimlik/bağımlılık/kabul korunur. B06/B07 tam kabul veya canlı etkinleştirme değildir.

## Paket60 — B24 ölçülebilir metin karşıtlığı

Paket60 8kaynakCSS içinde152metin foreground bildirimi ve2semantik muted değişkenini ölçüme göre düzeltti;137 ölçülen foreground rengi, hue korunarak açık zeminde koyulaştı, terminal yorumu açıklaştı, örnek damgası okunur oldu. Background/layout/logo değişmedi. 571 aynı kapsam taraması önce22824 yinelenen violation, sonra0; gradient/kısa sayaç/örtüşme gibi8809 inceleme bulgusu pass değildir. Tam1.4.3/WCAG/AT/nontext kabulü açık. Paket60:106 yeniden koşulan test (12 gateway/envanter48portal46regresyon),19 gezinme+7reflow;928 geometri ölçümünde0 taşma. Axe-core4.14.0 yalnız color-contrast:98menü/288panel/66ders,571frame taramasında0 belirlenmiş violation;8809 yinelenen incomplete açık. Son tam784sunucu Paketi59dur; bu dilimde runtime JS değişmedi. CONTRAST-ACCEPTANCE.md ayrıntıdır.115statik/36özgün kabul korundu; tamB24ve canlı kabul değildir.

## Paket61 — B24 sayaç ve kısa metin

Paket61: bildirim sayaçları, sunum sayfa düğmeleri ve rehber adım numaralarında beş renk çifti düzeltildi. Aynı 571 taramada tek karakterleri de değerlendiren profille 703 yinelenen ihlal 0 oldu; 8106 incomplete bulgusu açık. Eşikler 4.5:1/3:1 değişmedi. Tam B24/WCAG kabulü değildir. 106 otomatik test (12 gateway/envanter,48 portal,46 regresyon) ve19 gezinme kontrolü yeniden geçti; ölçüm profilinin8 karşı örnek kontrolü geçti. Son tam784 sunucu testi Paket59dadır; bu dilimde runtime JS değişmedi. Ayrıntı: CONTRAST-ACCEPTANCE.md ve acceptance/B24-single-character-20261014.json.

## Paket62 — B24 geçişli zemin metinleri

Paket62: öğrenme akışı, ders/sunum açıklamaları ve kaynak dipnotlarında7 foreground değeri düzeldi; koyu bilgi/rozet kartlarının2 başlık rengi tema seçicisi önceliğiyle korundu. Geçişli arka planlar/yerleşim/logolar aynı.88 ayrı ölçüm imzasından85i bu renderda karşıtlık hedefini geçti;3ü incelemede.3815 tekrar ayrı ölçülmedi. Axe571taramada0violation;8106incomplete hâlâ açık, pass olarak yeniden yazılmadı. 106otomatik (12gateway/envanter48portal46regresyon),19gezinme,8kısa metin ve16gradient ölçüm kontrolü geçti. Son tam784sunucu Paketi59; runtime JS değişmedi. Ayrıntı CONTRAST-ACCEPTANCE.md ve acceptance/B24-gradient-20261014.json.

## Paket63 — B24 ad, tablo, hedef ve odak

Paket63: öğrenme kartı/dinamik bildirim erişilebilir adları, İşlem sütun başlıkları,4grup/gezinme rolü ve rozet seçimi pressed durumu düzeldi.9React/9eski tablo ve takip tahtası adlandırılmış klavye kaydırma bölgesi; program özet/bağlantıları en az28CSSpx. İki Radix menüsünde arka plan inert, kapanış odağı korunur. 106otomatik12gateway/envanter48portal46regresyon;19gezinme10yeni etkileşim7reflow kontrolü geçti.928geometri ölçümünde0taşma. Axe4.14.0ile69WCAGetiketli kural:1440ve320genişliklerde571er toplam1142frame taramasında0violation;8ve530incomplete ham olarak korunur. Son tam784sunucu Paketi59; sunucu çalışma kodu değişmedi. SEMANTIC-ACCESSIBILITY.md ve acceptance/B24-semantics-20261014.json sınırlamaları esastır; tam B24/canlı kabulü yok.


## Paket64 · SQL kimliği ve ayrı kalıcı kontrol kaydı

Görünür yeni menü/ekran yok. Opsiyonel PostgresIdentityCheckpoint, 12kimlik tablosunun tam özetini ve depo genelindeki fence başlığını ayrı makbuza bağlar. SQL öncesi rezervasyon; aynı transactionda iş/yeni başlık; kesin COMMIT sonrası ayrı kalıcı onay olmadan sonuç dönmez. Sürüm/iptal/aile/bütçe ve audit eski yedekten geri açılamaz; aynı yedekteki özetle yetinilmez. Yerel sürücü yeni0700/0600SQLite DELETE/EXTRA; eski kayıt veya üretim kurulumu otomatik kabul edilmez. Belirsiz işlemde otomatik kilit açma/uzlaştırma yok.23yeni senaryo,807sunucu+48portal+46regresyon=901;13SQL HTTPS tarayıcı. Bütün yazarlar, gerçek dış kontrol hizmeti, async akademik repository, restore kuyruğu ve kurum saklama/işletim kabulü açık. configuredCore kapalı; son canlı16.

## Paket65 — kurum kapsamlı giriş saklama

Akış ve saklama aynı dört komutla yeni dar hedefe bağlandı. Açık kontrol düzlemi görevlendirmesi ve üç kişi ayrımı; tek kurum kural zinciri; grant revizyon pinleri;100aday/15dközet; atomik silme/denetim; gerçek TLS callback tekrarının reddi. Ham güvenlik satırları görünümde yok. Yeni149.kayıt türü;16SQLite ve13PostgreSQLadayı korunur.13yeni/914tamotomatik,14yeni12mevcuttarayıcı;136komut72280negatif örnek. [Sözleşme](UNASSIGNED-LOGIN-RETENTION.md) ve [kanıt](acceptance/B28-unassigned-retention-20261014.json). Gerçek kurum yetkisi/üretim/yedek imhası açık. Son canlı16;65dağıtılmadı.

## Paket66 — aynı SQL kimlik ve akademik akış

Mevcut altı akademik sekme ilk8komutla PostgresIdentityFlow özel ön/son guardına bağlandı. SQLrecords/commands/audit atomik; ortak MyysCore kuralları; hiçbir ikinci kalıcı örnek depo yok. 22yeni/936otomatik,49tarayıcı;115statik.16PGadayı;16SQLite149tür korunur. [Sözleşme](ACADEMIC-SQL-CONTRACT.md) ve [kanıt](acceptance/B06-B11-academic-sql-20261014.json). Kalan128komut, birleşikcheckpoint/native SSI/RLS ve gerçekkurum/IdP/KMS açık. Son canlı16;66yerel.

## Paket67 — birleşik akademik checkpoint

15kimlik+akademik tablo ayrı profil pinine bağlandı. Eski SQL/yeni başlık kopyalama ve akademikrecord/command/audit değişimi kapanır; belirsizCOMMIT/ayrıseal sonuç vermez. Eskiidentity-only dosya migration olmadan okunur. AkademikUIuyarı odağı/formları kapatma;13yeni/949otomatik29tarayıcı. [Sözleşme](ACADEMIC-CHECKPOINT-CONTRACT.md).16PGadayı/16SQLite149tür/115statik korundu. Gerçekhizmet/nativeSSI/RLS/RPO/RTO/kurum açık;soncanlı16.
