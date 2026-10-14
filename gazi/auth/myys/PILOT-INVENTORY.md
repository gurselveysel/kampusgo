# Pilot envanteri — özgün 27 Gazi satırı

14 Ekim 2026 · Kaynak çalışma Paketi31 · Canlı son doğrulanan yazılım Paketi16. İş paketi numaralarıyla yazılım paketleri farklıdır.

## Kaynak ve kapsam

`gazi-baseline-27.json`, kullanıcıya ait Gazi_UniGO_Uygulama_Ekleri.zip içindeki Gazi_UniGO_Hizmet_Modeli_Ek_Veriler.json dosyasının `capability_crosswalk` alanından `origin == Gazi` olan 27 satırı, bütün alan değerleri değiştirilmeden içerir. İlgili 13 kaynak kaydı da aynen alınmıştır. ZIP ve üye SHA-256 değerleri, Library/file kimlikleri bu dosyada kayıtlıdır. Özgün metadata 10.10.2026 tarihlidir. Kamu kaynaklarının tümü bu envanter çalışmasında yeniden okunmuş değildir. S/D/K/B kanıt sınıfları korunur; eski teslim iddiası yeni canlı kabul diye sunulmaz.

27 yetenek satırı, 33 çalışma rehberi, dokuz çekirdek rol, 11 sunum profili ve B01–B36 birbirinden farklı listelerdir. `pilot-inventory.json` bugünkü davranış, rota, kaynak bağı, ilgili B işleri, mevcut regresyon dosyaları ve açık koşulları özgün satırdan ayrı kaydeder. Kaynak eşlemesinin kurulması, 27 yeteneğin özgün kabul koşullarının kapandığı anlamına gelmez.

## Kaynak–ekran–davranış eşlemesi

| Özgün satır / yetenek | Kaynak | Ekran rotası | Güncel davranış ve sınır |
|---|---|---|---|
| GAZI-001 · Kurumsal yönetişim | GAZ-03, GAZ-04 | `#/academic`, `#/stakeholders`, `#/commission`, `#/audit` | Sunucu çekirdeği insan değerlendirmesi, bağımsız karar ve denetim izini yerel kabulde uygular; eski panel tarayıcı örneğidir. **Açık:** Resmî görev, kurul usulü, üretim kişi/depo ve canlı yetki kabulü açık. |
| GAZI-002 · Yeterlilik kataloğu | GAZ-05 | `#/knowledge`, `#/catalog`, `#/academic` | Kaynak sürümü 2026.10.10.3: 24 kaynak, 20 seviye özeti; program sürüm/sicil ve rubrik yayın denetimi yerelde. **Açık:** Ulusal sicilin bütünü değil; gerçek program açma/yayın yetkisi ve içerik hakkı kabulü açık. |
| GAZI-003 · Gazi program çıktıları | GAZ-05, GAZ-12 | `#/knowledge`, `#/curriculum`, `#/academic` | Altı Gazi programından 76 çıktı özeti korunur; kaynak özeti ile kurumun onaylı program sürümü ayrı. **Açık:** Özgün 13 çıktı iddiası tarihsel kapsamdır; özet genişlemesi resmî onay veya tüm Gazi verisi değildir. |
| GAZI-004 · Öğrenme çıktısı–çerçeve eşleme | GAZ-05 | `#/assessment`, `#/academic` | Çoktan çoğa çıktı-görev-rubrik bağları ve değişmez karar dayanak arşivi yerel çekirdekte; stüdyo taslakları tarayıcıda. **Açık:** Kapsamlı uzman kalibrasyonu ve gerçek kurumsal eşleme kabulü açık. |
| GAZI-005 · Rubrik ve değerlendirme | GAZ-05 | `#/academic`, `#/assessment` | Eksik ölçüt/kanıt başarıya gidemez; alternatif kanıt ve bağımsız inceleme, gerekçeli insan değerlendirmesi ve itiraz zinciri yerelde. **Açık:** Gerçek teslim dosyası saklama, değerlendirici ataması/kalibrasyonu ve kurum yöntemi açık. |
| GAZI-006 · AKTS iş yükü | GAZ-05, GAZ-13 | `#/matching`, `#/recognition`, `#/academic` | Tarayıcı iş yükü hesapları örnek olarak kalır; yerel tanıma politikası ve tekil kredi defteri ayrı karar ister. **Açık:** 25 saat varsayımı bütün üniversitelere genellenmez; gerçek kurum politikası/kararı açık. |
| GAZI-007 · Başvuru/tanıma | GAZ-03, GAZ-05 | `#/applications`, `#/recognition`, `#/academic`, `#/obs` | Gerekçeli tam/kısmi/red, tekrar kredi kazanımı engeli ve yerel OBS mutabakatı var. **Açık:** Dış doğrulama, çok dersli istisnalar, gerçek tanıma/OBS aktarımı açık. |
| GAZI-008 · Kurumsal roller | GAZ-04 | `#/stakeholders`, `#/academic` | Dokuz çekirdek rol sunucuda; 11 sunum profili menü seçimi olarak ayrı tutulur. Süre/birim/kurum kontrolleri yerel. **Açık:** Kurumun gerçek kişi üyeliği, rol ataması ve üretim izolasyonu açık. |
| GAZI-009 · Kimlik/giriş | GAZ-07, GAZ-11 | `#/academic` | Eski korumalı giriş korunur; ayrı yerel HTTPS OIDC/PKCE, kalıcı tek kullanım, kurum kapsamlı çıkış ve oran denetimi. **Açık:** Gerçek IdP, üretim SQL deposu/anahtar sürüm bariyeri ve canlı SSO kabulü açık. |
| GAZI-010 · Program kataloğu | GAZ-06 | `#/learning`, `#/catalog`, `#/academic` | 6 program/22 modül/66 ders korunur; yerel sunucu başvurusu bağımsız inceleme ile öğrenen kaydına bağlanır. **Açık:** Örnek ders kataloğu gerçek kurul onayı veya ücretli kayıt ilanı değildir. |
| GAZI-011 · Ders deneyimi | GAZ-06 | `#/learning`, `#/academic` | Ders notu/tamamlama tarayıcıya bağlıdır. Ayrı yerel kaynak kayıt/ilerleme zinciri imzalı sürüm ve tek olayla işler. **Açık:** Örnek ders notları otomatik LMS kanıtı değildir; gerçek cihazlar arası LMS senkronizasyonu açık. |
| GAZI-012 · Zengin öğrenme içeriği | GAZ-02 | `#/learning` | 66 Türkçe sunum, 22 açıklamalı vaka ve kaynak/lisans etiketleri korunur. **Açık:** Tüm üçüncü taraf lisans/yayın hakkı ve altyazı/akademik inceleme kabulü açık. |
| GAZI-013 · Materyal indirme | GAZ-02 | `#/learning` | 66 HTML sunum ve 22 CSV vaka dosyası korumalı sunucu paketindedir; indirme bağlantıları korunur. **Açık:** Yerel tarayıcı indirmesi canlı oturum indirme kabulünün yerine geçmez; üçüncü taraf yeniden dağıtım yetkisi çıkarılmaz. |
| GAZI-014 · UzemGO öğrenme yolculuğu | GAZ-02 | `#/learning`, `#/connections`, `#/academic` | UzemGO yolculuğu canlı/kayıtlı ders, çalışma, değerlendirme ve kanıt taslağını senaryo olarak açıklar. İmzalı kuyruk yerelde ayrı. **Açık:** Gerçek UzemGO canlı sınıf/kayıt/ilerleme bağlantısı kurulmadı. |
| GAZI-015 · Öğrenme kanıtı aktarımı | GAZ-02, GAZ-05 | `#/learning`, `#/academic` | Tarayıcı kanıt taslağı sunucuya gönderilmez. İmzalı kaynak ürünü aynı kişi/program/sürümle çekirdeğe, insan değerlendirmesine ve arşive bağlanır. **Açık:** Gerçek dış sağlayıcı ve üretim kanıt saklama/aktarım kabulü açık. |
| GAZI-016 · Rozet zorunlu verisi | GAZ-01, GAZ-08 | `#/badges`, `#/credentials`, `#/academic` | Eski rozet alan/şema testleri korunur; çekirdekte profil, yetki ve tek karar/ihraç denetlenir; SEM dosyası ayrı ve resmî düzenleme kapalıdır. **Açık:** EK-1/kurum düzenleme yetkisi, gerçek sağlayıcı ve bağımsız standart sertifikasyonu açık. |
| GAZI-017 · Rozet üretim ve doğrulama | GAZ-01, GAZ-08 | `#/badges`, `#/academic` | Eski sabit sentetik rozet laboratuvarı korunur; çekirdekte anahtar yaşam döngüsü, imza ve süre/iptal/askı ayrımı yereldedir. **Açık:** Gerçek anahtar hizmeti, halka açık üretim doğrulayıcı ve bağımsız birlikte çalışabilirlik açık. |
| GAZI-018 · Cüzdan | GAZ-01 | `#/wallet`, `#/academic`, `#/shared` | Kişisel çekirdek cüzdanı özel; tek kullanımlı paylaşım, iptal ve sınırlı kamu özeti yerelde. Eski cüzdan örnek sicildir. **Açık:** Üretim cüzdanı/harici holder binding ve dış cüzdan kabulü açık. |
| GAZI-019 · Kurumsal eğitim rozeti | GAZ-08 | `#/badges`, `#/academic` | Eski beş eğitim şablonu/sabit sentetik laboratuvar korunur; çekirdekte bağımsız yetki ve profil gereklidir. **Açık:** Gazi/MEB adına gerçek belge veya rozet verme yetkisi yok; kurum onayı beklenir. |
| GAZI-020 · Yığılabilir öğrenme yolları | GAZ-03 | `#/pathways`, `#/recognition`, `#/academic` | Öğrenme yolu örnekleri ile yerel politika/tekil kredi defteri ayrı tutulur; gerekçesiz veya mükerrer kazanım yok. **Açık:** Gerçek yığılabilir yeterlilik, önkoşul/eşdeğerlik ve çok dersli tanıma anlaşmaları açık. |
| GAZI-021 · Sınav gözetimi | GAZ-03 | `#/proctoring`, `#/academic` | Gözetim kamera/mikrofon açmayan sentetik simülasyondur; işaretler otomatik başarı/başarısızlık kararı vermez. **Açık:** Gerçek gözetim, biyometrik/AI hizmeti veya buna ilişkin kurum kararı yok. |
| GAZI-022 · OBS/YÖKSİS/API | GAZ-03, GAZ-05 | `#/connections`, `#/integrations`, `#/obs`, `#/academic` | Kuyruk/karantina/tekrar koruma, satır mutabakatı, yerel OBS zarfı ve SEM hazırlık dosyası var; kabul yanıtı teslim değildir. **Açık:** OBS/YÖKSİS/e-Devlet gerçek şema/erişim/karşı kabulü açık; dışa iletilen kayıt sıfır. |
| GAZI-023 · Raporlama/kalite | GAZ-03 | `#/quality`, `#/audit`, `#/notifications`, `#/academic` | Kaynak paydaları ayrılmış yerel göstergeler, görev/denetim, hata ve düzeltme izi var; 11 profil/9 çekirdek rol gezinmesi sınanır. **Açık:** Gerçek kohort analitiği/istihdam/dış denetim ve tam ekran okuyucu kabulü açık. |
| GAZI-024 · Ekip eğitimi/ürün kılavuzu | GAZ-09 | `#/guide`, `#/academic` | Yerel MYYS rehberi ve kişisel verisiz destek özeti; çekirdekte sahipli destek kaydı ve öğrenci kapanış teyidi ayrı. **Açık:** lms.uzemgo.com ayrı hizmettir; bu taramada açılmadı. Kurum SLA/eskalasyon politikası açık. |
| GAZI-025 · Kurumsal tanıtım ve talep yönetimi | GAZ-10 | `#/sales`, `#/executive`, `#/demo`, `#/applications` | Gazi sunum/saha/demoları korunur; yerel MYYS başvurusu gerçek kurum kaydı sayılmaz. **Açık:** ÜniGO TR/EN kurumsal site ve gerçek talep listesi ayrı hedef; bu depoda güncel dış kabulü yeniden kanıtlanmadı. |
| GAZI-026 · Ücret, ödeme, lisans ve ticari katalog | Özgün satırda kaynak yok; boşluk korunur | `#/finance`, `#/business` | Finans ve yatırım ekranı örnek hesap/mutabakat sunar; gerçek ödeme, fiyat veya lisans satışı etkin değildir. **Açık:** Koşullu PSP/ödeme-iade/ters ibraz sözleşmesi ve bağımsız durum makinesi halen geliştirme kapsamındadır. |
| GAZI-027 · Çok kurumlu hizmet | Özgün satırda kaynak yok; boşluk korunur | `#/stakeholders`, `#/academic`, `#/settings` | Gazi görsel kimliği ve alt alanı korunur; yerel çekirdek kurum/birim negatif testleri uygular. **Açık:** Üretim multi-tenant onboarding/kota/ikinci kurum kabulü ve ölçekleme açık. |

## Regresyon kaydı

| Alan | Güncel yürütülebilir kanıt | Kapsam sınırı |
|---|---|---|
| Özgün 27 satır, kaynak sınıfları ve eşleme | `tests/myys-pilot-inventory.test.mjs` · özgün JSON değerleri SHA-256 sabiti; 27 kimlik, kaynak ve test dosyası bağı | Kaynak hükmü veya tüm özellik kabulü değildir. |
| 6/22/66 ders; 24 kaynak, 76 çıktı, 20 seviye, 46 kalite; 33 rehber | Aynı envanter testi; portal learning/learning-content/knowledge testleri | Gerçek kayıt ve akademik onay değildir. |
| Eski giriş ve indirme | `tests/gateway.test.mjs`: 66 sunum +22 vaka, oturumsuz ret ve sentetik oturumla gerçek handler indirmesi; süre/tekrar/oran/çıkış | Canlı giriş yeniden denenmedi; koruma değiştirilmedi. |
| Eski rozet | `tests/badges.test.mjs`: beş şablon, 11 alan, imza/üretici/anahtar/süre/iptal/tahrifat | Laboratuvar sentetik; gerçek kurum yetkisi veya sertifikasyon yok. |
| Dokuz çekirdek rol | Sunucu kapsam matrisi; `scripts/myys-navigation-browser.cjs` dokuz sentetik kişi ve tüm akademik sekmeler | Gerçek kurum ataması/üretim RLS değildir. |
| 11 sunum profili ve eski menüler | Navigation tarayıcısı bütün menü rotalarını ve iframe içindeki `main h1` + içerik varlığını bekler | Kabuk yüklenmesi yeterli sayılmaz. Her düğme/iş akışı bu tek taramayla kabul edilmiş sayılmaz. |
| Ders–program ve indirme | Navigation tarayıcısı katalogdan dört ilave örnek programı öğrenme planına ekler; 66 ders; HTML/CSV gerçek tarayıcı indirmesi; not/tamamlama yenilemesi | Başlangıçta P01/P06 örnek plan vardır; diğer dördü testte normal kullanıcı işlemiyle eklenir. Tarayıcı ilerlemesi çekirdek kanıtına dönüştürülmez. |
| İtiraz ve cüzdan | Mevcut appeals/wallet tarayıcıları ortak odak değişikliğinden sonra yeniden çalıştırılır | Gerçek belge/öğrenci işlemi yok. |

## Beş kabul ekseni

- Kod: 27 satırın kaynak/rota/regresyon eşlemesi hazır; hiçbir özgün satır veya B kabul ölçütü yeniden yazılmadı.
- Yerel kabul: koşu sonucu `acceptance/B01-B24-navigation-20261014.json`; kapsanmayan düğme, ekran okuyucu, altyazı ve belge erişilebilirliği açık tutulur.
- Canlı: Paketi31 dağıtılmadı; alias Paketi16 READY olarak salt okunur kontrol edildi. Bu yeni oturum içi smoke değildir.
- Kurum: gerçek rol ataması, içerik onayı, akış politikaları ve operasyonel kabul açık.
- Dış erişim: LMS/OBS/IdP/cüzdan ve ayrı ÜniGO site/kılavuz servisleri bu taramada bağlı kabul edilmez. Kullanıcının önceki browserAuth iptali yeniden denenmedi.
