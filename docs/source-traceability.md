# Kaynak ve gereksinim izlenebilirliği

Bu belge; `MYYS_KDPU_Komisyon_Sunumu_Nihai_20_Slayt(1).pdf`, `DOC-20260811-WA0039 (1)(3).pdf`, 19 Ağustos 2026 tarihli kullanıcı geri bildirimi ve resmî TYÇ/AYÇ kaynaklarının pilot bilgi mimarisine dönüşümünü özetler. Sunum ve çalışma belgeleri resmî mevzuat metninin kendisi olarak kabul edilmez.

## Yaşam döngüsü izi

| Evre | Kaynak odağı | Uygulamadaki karşılık | Pilot sınırı |
| --- | --- | --- | --- |
| 1. Başvuru | Tek kapıda program önerisi ve dış kazanım tanıma | Çok alanlı formlar, üst veri yükleme alanı, doğrulama, taslak/gönderim, durum kaydı | Gerçek kimlik, kurum teyidi veya dosya içeriği yok |
| 2. Ön inceleme | Koordinatörlük kontrolü, Komisyon kararı, karşılaştırma desteği | 30 günlük sayaç, eksik kanıt, TYÇ/AYÇ matrisi, AKTS ve uzaktan kredi göstergeleri, gerekçeli karar/audit | AI ve matris karar vermez; değerler pilot parametredir |
| 3. Eğitim ve değerlendirme | Proje/portfolyo/sınav kanıtı, insan incelemesi | Örnek oturum, rubrik, güvenilirlik göstergesi, metinsel olay günlüğü, değerlendirici eylemi | Kamera, mikrofon, yüz tanıma veya biyometri yok |
| 4. Dijital yeterlilik | Yapılandırılmış belge, QR doğrulama, birlikte çalışabilirlik hedefi | Cüzdan, belge alanları, pilot QR görünümü, doğrulama rotası, geçerlilik durumu | Üretim imzası veya W3C/Open Badges uygunluk iddiası yok |
| 5. Akademik entegrasyon | Doğrudan DB yerine servis/onay katmanı | ÖBİS, YÖKSİS, e-Devlet ve diğer entegrasyonlarda redakte paket, dry-run, onay kapısı ve audit | Tümü bağlı değil/simülasyon; gerçek veri gönderilmez |
| 6. Finansal yönetim | Tahsilat, fatura, hak ediş ve mali onay | Öğrenen ödeme demosu, Finans kuyruğu, revizyon/onay/mutabakat, GİB/e-Arşiv ve MYS/MAYS açıklamaları | Gerçek tahsilat, e-belge veya muhasebe aktarımı yok |

## Birsen Hoca geri bildirim izi

| Geri bildirim | Tasarım / domain kararı | Veri modeli |
| --- | --- | --- |
| Ödeme akışı eksik | Ücretli programdan ödeme demo sayfasına ve Finans rolüne yönlendirme | `pilot_finance_routes`, `pilot_payment_requests`, `pilot_payment_events` |
| GİB ve MYS/MAYS açıklamaları eksik | Ana sayfa ile finans akışında amaç, görev ayrılığı, hata/yeniden deneme ve “bağlı değil” uyarısı | `gib_explanation`, `mys_mays_explanation`, gerçek etkiyi kapatan boolean değişmezler |
| Rol değişince overview değişmiyor | Dokuz ayrı overview, rol görevleri, veri filtreleri, navigasyon ve mutasyon kapıları | `pilot_role_overviews`, `pilot_role_workflow_steps` |
| Avrupa ve Türkiye yeterlilik şablonları | TYÇ ve AYÇ/EQF ayrı sekme; 1–8 seviye; eğitici girişi; kurul için salt-okunur inceleme | `qualification_frameworks`, `qualification_level_descriptors`, `qualification_level_descriptor_translations`, matris tabloları |
| Öğrenme hedefi–içerik–ölçme matrisi | Yedi zorunlu alan, aday eğitici yönergesi ve örnek satırlar | `pilot_matrix_templates`, `pilot_matrix_example_rows`, `pilot_matrix_drafts`, `pilot_matrix_draft_rows` |
| Resmî veri ve Supabase uyumu | Kaynak kütüğü, sınırlı KDPÜ üst verisi, lisans/alım durumu | `qualification_dataset_registry`, `official_qualification_references` |
| DPÜ otomasyon keşfi | 32 iç sistem için kaynak, Tier, MYYS önemi, kayıt sahibi, ana-veri sınırı, eşleme, dry-run ve audit | `institutional_system_registry`, `pilot_integration_mappings`, `pilot_integration_scenarios`, `pilot_integration_audit_events` |

## Resmî kaynaklar

| Kaynak | Kullanılan kapsam | Uygulamadaki durum |
| --- | --- | --- |
| [MYK — TYÇ yayınları](https://myk.gov.tr/tr/page/90) | TYÇ'nin sekiz seviyesi; Bilgi, Beceri, Yetkinlik boyutları ve resmî kaynak bağlantıları | Resmî referans; 8 seviye |
| [TYÇ seviye tanımlayıcıları PDF](https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf) | TYÇ 1–8 tanımlayıcı metinleri | `content_basis='official_verbatim'` |
| [Europass — sekiz AYÇ/EQF seviyesi](https://europass.europa.eu/en/description-eight-eqf-levels) | Knowledge, Skills, Responsibility and autonomy tanımlayıcıları | Resmî İngilizce referans; 8 seviye |
| [Europass Türkçe seviye görünümü](https://europass.europa.eu/tr/description-eight-eqf-levels) | Türkçe gösterim katmanı | Kaynak/basis alanlarıyla ayrı çeviri tablosu; kurumsal doğrulama gerekir |
| [2017 AYÇ/EQF Tavsiye Kararı](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017H0615(01)) | AYÇ/EQF'nin hukuki referansı | Çerçeve kaynak üst verisi |
| [Türkiye Yeterlilikler Veri Tabanı](https://portal.tyc.gov.tr/) | Sınırlı KDPÜ yeterlilik üst verisi | Elle doğrulanmış snapshot; tam scrape yok |
| [Europass Qualifications Dataset Register](https://europass.europa.eu/en/stakeholders/qdr) | ELM/JSON-LD/TTL/SPARQL veri ekosistemi ve veri sağlayıcı yaklaşımı | Kaynak kütüğünde; otomatik alım kapalı |

## DPÜ otomasyon keşfi ve entegrasyon sınırı

Resmî DPÜ sayfaları yalnız sistemin varlığı, kamuya açıklanan amacı veya görünür iş akışı için kanıt kabul edilir. API/protokol, veri sahipliği, kimlik yöntemi ve yazma yetkisi ayrıca BİDB ve ilgili süreç sahibi tarafından doğrulanmadan etkinleştirilmez.

Sürüm `2026-08-20.2` kataloğu **32 DPÜ iç sistem**, 32 veri eşlemesi, 32 dry-run senaryosu ve 32 sentetik audit olayı içerir. Bu dört sayı birebir kapsama denetimidir; canlı entegrasyon sayısı değildir. Tier 1/2/3 teknik entegrasyon türü ile `core`/`supporting`/`adjacent` MYYS önemi birbirinden bağımsız tutulur.

| Sistem / kaynak | MYYS'deki olası kullanım | Doğrulanan sınır |
| --- | --- | --- |
| [OBS](https://obs.dpu.edu.tr/) | Öğrenci referansı, aktif kayıt, kazanılmış AKTS ve kontrollü yeterlilik aktarımı | Amaç ve giriş yüzeyi görünür; API sözleşmesi doğrulanmadı, giriş ekranı kazınmaz |
| [Bologna Bilgi Paketi](https://obs.dpu.edu.tr/oibs/bologna/index.aspx) | Program, ders, öğrenme çıktısı, TYYÇ, planlanan AKTS ve ölçme yöntemi karşılaştırması | Kamu referansı; kaynak zamanı ve sürümü tutulur, akademik karar üretmez |
| [ÖYS](https://oys.dpu.edu.tr/almsp) ve [UZEM açıklaması](https://uzem.dpu.edu.tr/tr/index/duyuru/23087/2025-2026-bahar-donemi-uzaktan-ogretimle-ders-alan-ogrencilerimizin-dikkatine) | Ders kabuğu, kayıt, katılım, değerlendirme ve tamamlanma kanıtı taslağı | OBS/e-Devlet ilişkisi resmî açıklamada var; API kanıtı değildir, ürün adaptörü sürümlenebilir olmalıdır |
| [DPÜSEM](https://dpusem.dpu.edu.tr/), [başvuru süreci](https://dpusem.dpu.edu.tr/tr/index/sayfa/18505/egitim-basvuru-sureci) | Program kataloğu, ön kayıt–uygunluk–ödeme–kesin kayıt handoff taslağı | Gerçek ödeme/dekont, iletişim ve kesin kayıt aktarımı yok |
| [DİLMER](https://dilmer.dpu.edu.tr/), [KODSİS](https://kodsis.dpu.edu.tr/) | Dil/mesleki program kataloğu ve öğrenme kanıtı referansı | Kamu kataloğu görülebilir; kimlik/API sözleşmesi doğrulanmadı |
| [TÖMER](https://tomer.dpu.edu.tr/), [başvuru](https://tomerbasvuru.dpu.edu.tr/), [doğrulama](https://tomer.dpu.edu.tr/tr/index/sayfa/10346/sertifika-dogrulama) | Dil programı, dış kazanım ve kullanıcı kontrollü belge doğrulama referansı | Pasaport, iletişim, sonuç veya güvenlik kodu otomatik sorgulanmaz |
| [YDYO sonuç açıklaması](https://ydyo.dpu.edu.tr/tr/index/duyuru/21623/01-temmuz-2025-ydys-1-asama-sinav-sonuclari-2024-2025) | Dil ön koşulu için adayın sunduğu kanıt | Öğrenci numarası/OBS parolası isteyen ekran kazınmaz |
| [Merkezî kimlik / BİDB](https://bidb.dpu.edu.tr/tr/index/sayfa/119/sistem-yonetimi-sube-mudurlugu) | Kurum ilişkisi ve rol claim'i için asgari SSO taslağı | OIDC/SAML/LDAP protokolü kamu sayfasından doğrulanmadı; parola MYYS'de tutulmaz |
| [EBYS](https://ebys.dpu.edu.tr/) ve [BİDB açıklaması](https://bidb.dpu.edu.tr/index/slide/12/elektronik-belge-yonetim-sistemi-ebys) | Kurul karar numarası, belge durumu ve imzalı karar referansı | E-imza/resmî belge yazımı Tier 3'tür; pilotta belge oluşturulmaz |
| [BKYS](https://bkys.dpu.edu.tr/) ve [Kalite Koordinatörlüğü](https://kalite.dpu.edu.tr/index/home/) | Kalite, risk, PUKÖ, kanıt ve toplulaştırılmış memnuniyet göstergesi | Bireysel cevap ve serbest metin aktarılmaz; kalite MYS mali MYS/MAYS değildir |
| [Akademik Portal](https://portal.dpu.edu.tr/tr) | Eğitici profilini destekleyen kamu referansı | Tek başına yetkinlik veya aktif görev kanıtı değildir |
| [Kütüphane](https://kutuphane.dpu.edu.tr/), [VETİS](https://kutuphane.dpu.edu.tr/tr/index/sayfa/13858/vetis-kutuphane-kaynaklarina-uzaktan-erisim), [Açık Arşiv](https://openaccess.dpu.edu.tr/xmlui/) | Kaynakça ve açık erişim kanıt bağlantısı | Lisanslı içerik veya kullanıcı arama geçmişi alınmaz |
| [Mezun Portalı](https://mezun.dpu.edu.tr/) ve [KAMER](https://kamer.dpu.edu.tr/) | Opt-in cüzdan devamlılığı ve toplulaştırılmış etki | Mezun profili kazınmaz, kişi bazlı aktarım açık rıza ister |
| [İME otomasyonu](https://dumlupinarmyo.dpu.edu.tr/tr/index/sayfa/19036/ime-otomasyon-sistemi) | İşyeri öğrenmesi için kanıt referansı | İşveren, sigorta ve öğrenci belgesi otomatik alınmaz |
| [Döner Sermaye](https://ds.dpu.edu.tr/) | Ödeme talebi, tahsilat, fatura/hak ediş ve mutabakat handoff taslağı | Gerçek ödeme, vergi kuralı, fatura veya mali servis çağrısı yok |
| [DPÜ ana sistem envanteri](https://www.dpu.edu.tr/) | Kamuya duyurulan otomasyon yüzeylerinin başlangıç keşfi | Envanter kaydı API, sahiplik veya erişim yetkisi kanıtı değildir |
| [eBAP](https://ebap.dpu.edu.tr/) ve [EKBYS](https://etikkurul.dpu.edu.tr/) | Eğitici kanıtı ile etik izin üst verisi için insan incelemeli referans | Proje/başvuru içeriği ve özel nitelikli veri alınmaz |
| [Kütüphane kataloğu](https://katalog.dpu.edu.tr/) | VETİS'ten ayrı bibliyografik kamu referansı | Kullanıcı hesabı, ödünç kaydı veya lisanslı içerik alınmaz |
| [ULMER / Uluslararası İlişkiler](https://iro.dpu.edu.tr/) ve [LabSis](https://iltemlabsis.dpu.edu.tr/) | Uluslararası hareketlilik ve laboratuvar kanıtı için kaynak bağlantısı | Başvuru, kişi, analiz veya gizli araştırma verisi alınmaz |
| [E-Randevu](https://www.dpu.edu.tr/index/duyuru/936/e-randevu-sistemi) ve [KAMER](https://kamer.dpu.edu.tr/) | İnsan tarafından başlatılan randevu/rehberlik yönlendirmesi | Randevu oluşturulmaz; sağlık/destek vakası veya kişi verisi taşınmaz |
| [DPÜWEB yönetim duyurusu](https://bidb.dpu.edu.tr/tr/index/duyuru/20846/birimler-web-yonetim-paneli-guvenlik-guncellemesi) | Onaylanmış içerik için site sahibi handoff taslağı | Panele giriş, otomatik yayın veya kimlik bilgisi aktarımı yok |
| [Akademik performans duyurusu](https://haber.dpu.edu.tr/tr/haber_oku/652655d14eea2/dpu-akademik-performans-modulu-yayinda) ve [OBS/otomasyon açıklaması](https://tubif.dpu.edu.tr/tr/index/sayfa/15505/obs-ogrenci-bilgi-sistemi) | Performans, puantaj ve personel durumuna yalnız kaynak referansı | Kişi puanı, puantaj detayı, bordro veya YÖKSİS sorgusu yok |
| [DPU-Form duyurusu](https://www.dpu.edu.tr/index/duyuru/2985/2025-faaliyet-yili-akademik-tesvik-odenegi-basvuru-duyurusu) ve [DDYO iş akışları](https://ddyo.dpu.edu.tr/tr/index/sayfa/18068/is-akislari) | Başvuru yönlendirme ve entegrasyon değişikliği için yönetişim taslağı | Dosya yüklenmez, otomatik başvuru/talep açılmaz ve production değişikliği yapılmaz |
| [BİDB](https://bidb.dpu.edu.tr/) ve [DPÜ otomasyon açıklaması](https://tubif.dpu.edu.tr/tr/index/sayfa/15505/obs-ogrenci-bilgi-sistemi) | Ek ders/hak ediş ve DPÜMobil gibi yardımcı yüzeyler için aday keşif kaydı | Mali/personel ana verisi veya push/iletişim verisi alınmaz; adaptör sözleşmesi doğrulanmalıdır |

DPÜ dışı **beş** hedef — GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS — ayrı dış kapı kataloğudur. Bunların hiçbiri 32 DPÜ iç sistem sayısına dahil değildir ve tamamı `simulation / disconnected / no real data` durumundadır. [TÖMER–SEM–DİLMER–DDYO istişare haberi](https://tomer.dpu.edu.tr/tr/index/slide/13110/bilgilendirme-ve-istisare-toplantisi-gerceklestirildi), YÖKSİS/TÖMERSİS hakkında görüşme yapıldığını doğrular; canlı entegrasyon bulunduğunu doğrulamaz.

### Ana veri sahipliği ilkesi

- Kimlik/kurum ilişkisi: merkezî kimlik
- Öğrenci, program kaydı, kazanılmış AKTS ve mezuniyet: OBS
- Müfredat, öğrenme çıktıları, TYYÇ ve planlanan AKTS: Bologna Bilgi Paketi
- Eğitim teslimi, katılım ve değerlendirme kanıtı: ÖYS
- Mikro-yeterlilik teklifi, komisyon, tanıma ve pilot yeterlilik: MYYS
- Kalite/risk/PUKÖ: BKYS
- Resmî karar ve belge numarası: EBYS
- Tahsilat, hak ediş ve mutabakat: Döner Sermaye / mali birimler

Her adaptör varsayılan `simulation/disconnected` durumundadır. Kaynak parola, T.C. kimlik, pasaport, kart veya canlı token saklanmaz; outbox/inbox, idempotency, onay kapısı ve denetim izi olmadan hiçbir aktarım kurgulanmaz.

Canlı Supabase güvenlik sorgularında `real_data_enabled`, `real_data_sent`, `live_request_made` ve `production_allowed` için unsafe kayıt sayıları ayrı ayrı `0` bulunmuştur. Kamuya açık kaynak keşfi; giriş gerektiren sayfaların kazınması, kişi verisi alınması, tam içerik aynası veya gerçek API çağrısı anlamına gelmez.

## Sınırlı KDPÜ kamu üst verisi

| Kod | Kamu portalında görülen başlık | Seviye göstergesi | Yerleştirme ihtiyatı |
| --- | --- | --- | --- |
| `TR0030009160` | Makine Resim ve Konstrüksiyon Ön Lisans Diploması | TYÇ 5 / AYÇ 5 | Portal ayrıntısında yerleştirilmemiş; seviye geçici referans olarak tutulur |
| `TR0030008977` | Büro Yönetimi ve Yönetici Asistanlığı Ön Lisans Diploması | TYÇ 5 | Liste görünümünden; yerleştirme doğrulanmadı |
| `TR0030009146` | İç Mimarlık Lisans Diploması | TYÇ 6 | Yerleştirme doğrulanmadı |
| `TR0030009064` | Biyokimya Lisans Diploması | TYÇ 6 / AYÇ 6 • 240 AKTS | Portal ayrıntısında yerleştirilmemiş; seviye geçici referans olarak tutulur |
| `TR0030009057` | Cebir ve Sayılar Teorisi Doktora Diploması | TYÇ 8 / AYÇ 8 • 240 AKTS | Portal ayrıntısında yerleştirilmemiş; seviye geçici referans olarak tutulur |
| `TR0030009011` | Devreler ve Sistemler Doktora Diploması | TYÇ 8 / AYÇ 8 • 240 AKTS | Portal ayrıntısında yerleştirilmemiş; seviye geçici referans olarak tutulur |

Bu altı doğrulanmış KDPÜ kamu üst veri kaydı yalnız `minimal_public_metadata` kapsamındadır. Program içeriği, öğrenme çıktısı, kişi bilgisi veya resmî yerleştirme kararı kopyalanmaz. Portalda görünmek, bir yeterliliğin TYÇ'ye yerleştirildiğini tek başına kanıtlamaz.

## Tam portal alımının yapılmama gerekçesi

- TYÇ portalı için herkese açık bir bulk API/export sözleşmesi doğrulanmadı.
- Yeniden kullanım lisans koşulları portal geneli için açık ve makinece uygulanabilir biçimde doğrulanmadı.
- “Tüm gerçek verileri çekme” ifadesi kişisel/kurumsal veri veya telifli içeriğin sınırsız kopyalanması olarak yorumlanmadı.
- Bu nedenle veri kaynağı `manual_snapshot_only`, otomatik alım `false` ve lisans durumu “koşullar ayrıca doğrulanmalı” olarak modellenir.
- Kurumun yazılı izni, açık lisans ve resmî veri servisi sağlanırsa kontrollü importer ayrı migration/adaptörle tasarlanmalıdır.

## Matris izlenebilirliği

| Matris alanı | Kaynak / amaç | Karar sınırı |
| --- | --- | --- |
| Seviye tanımlayıcısı | Seçilen TYÇ veya AYÇ/EQF seviyesinin resmî referansı | Kilitli referans; kullanıcı değiştiremez |
| Öğrenme hedefi / çıktısı | Aday eğiticinin gözlenebilir kazanımı | Kurumsal inceleme gerekir |
| Öğrenme düzeyi ve eylem fiili | Seviye ile ölçülebilir fiil ilişkisi | Otomatik seviye tayini değildir |
| Ders içeriği / öğrenme etkinliği | Çıktıyı sağlayacak içerik ve etkinlik | Eğitici taslağıdır |
| Ölçme-değerlendirme yöntemi | Proje, rubrik, portfolyo, sınav vb. yöntem | Yetkili kurul doğrular |
| Başarı ölçütü ve kanıt | Gözlenebilir kanıt ve başarı standardı | Gerçek dosya içeriği alınmaz |
| Uyum gerekçesi | Tanımlayıcı–çıktı–içerik–ölçme bağının açıklaması | AI kararı veya otomatik onay değildir |

## Rol–yetki izi

- Öğrenen: katalog, program başvurusu, ödeme demo yönlendirmesi, eğitim, değerlendirme, cüzdan
- İç eğitici: program ve TYÇ/AYÇ matris önerisi, kendi başvuru/program takibi
- Kurum dışı eğitici: kendi program ve matris önerisi; öğrenci dış kazanım başvurusu yapamaz
- Koordinatörlük/SEM: idari ön kontrol, eksik belge ve revizyon; matris salt-okunur
- Komisyon: gerekçeli akademik pilot karar; AI/şablon karar değildir
- Öğrenci İşleri: AKTS, kayıt ve aktarım ön kontrolü
- Bilgi İşlem: entegrasyon ve audit kapıları; akademik/mali karar yok
- Finans/Döner Sermaye: mali ön onay, revizyon, mutabakat; gerçek ödeme yok
- Sistem yöneticisi: teknik pilot denetimi; akademik veya mali karar veremez

## Kaynak çelişkileri için uygulanan kararlar

- Tutarlı altı evreli yaşam döngüsü esas alındı.
- Otomatik onay/blok eşikleri uygulanmadı; insan incelemesi ve gerekçe zorunlu tutuldu.
- “Risk sıfır”, “%100 uyum” ve benzeri kesin iddialar kullanılmadı.
- `%50` göstergesi tek eğitimin sunum oranından ayrılarak transfer edilen uzaktan kaynaklı kredi portföyü bağlamında sunuldu.
- `5651`, kurumsal imza, e-Devlet/YÖKSİS/GİB erişimi veya standart uygunluğu canlı kazanım gibi gösterilmedi.
- Vergi/kesinti oranları kesin hukuki kural olarak kodlanmadı; mali birim doğrulaması gerekir.
- Portal listesi, öngörülen seviye ve resmî TYÇ yerleştirmesi birbirinden ayrıldı.

## Doğrulama durumu

- Yerel domain/rol/ödeme/matris/entegrasyon kabulü: **25/25 başarılı**.
- DPÜ entegrasyon sözleşmesi: **32 sistem / 32 eşleme / 32 dry-run / 32 sentetik audit**.
- Yapı ve production güvenlik doğrulaması: **24/24 başarılı**.
- Canlı Supabase migration sürümleri `20260819234334`, `20260819234424`, `20260820003749`, `20260820003856` ve `20260820005626`: **PASS**; 18 FORCE RLS tablo, 14 `security_invoker` görünüm, 32 benzersiz HTTPS kaynak izi, security advisor 0 bulgu. [Çerçeve takip migration'ı](../supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql) ile [entegrasyon takip migration'ı](../supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql) indekslenmemiş yabancı anahtar uyarılarını kapattı; [provenans migration'ı](../supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql) sekiz genel dizin kaydını özgül resmî kaynaklarla değiştirdi. Yalnız beklenen unused-index ve `auth_db_connections_absolute` INFO girdileri kaldı.
- Canlı etki güvenlik sayımları: gerçek veri etkin `0`, gerçek veri gönderilmiş `0`, canlı istek yapılmış `0`, production izinli `0`.
- Yeni revizyonun exact Vercel Preview ve public alias smoke sonucu: **PASS** — `dpl_4WMU5dATnnE4PXaKLDUuYSr3AhX5`, READY `target: null`; anonim erişim, uygulama sürümü 9, dokuz rol ve asset yüklemeleri doğrulandı.
- Dokuz rol, TYÇ 8 + AYÇ/EQF 8 seviye, ödeme simülasyonu ve mali açıklamalar için ortak public Preview hedefi: <https://kampusgo.uzemgo.com/pilot.html>.
- Tam portal aynası için lisans ve bulk API/export koşulları doğrulanmadığından otomatik alım kapalıdır.
- **Production NO-GO**.
