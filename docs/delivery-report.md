# MYYS kontrollü pilot — tek teslim raporu

Tarih: 19–20 Ağustos 2026 (UTC)

Karar: **Production NO-GO**

## Teslim durumu

| Çıktı | Durum | Not |
| --- | --- | --- |
| Çalışan uygulama kodu | Hazır | Gerçek HTML/CSS/ES module bileşenleri; ekran görüntüsü tabanlı arayüz değildir |
| Dokuz rol kabulü | Yerelde hazır | Dokuz rolün farklı özet, navigasyon, görünürlük ve işlem sınırları; 25/25 domain ve entegrasyon UI sözleşmesi geçti |
| Ödeme ve finans akışı | Yerelde hazır | Gerçek ödeme almayan öğrenen → Finans / Döner Sermaye akışı, revizyon/onay/mutabakat ve audit |
| TYÇ / AYÇ matrisleri | Yerelde hazır | TYÇ 8 + AYÇ/EQF 8 seviye, 16 şablon, eğitici girişi ve salt-okunur inceleme |
| Supabase migration | **PASS** | Canlı sürümler `20260819234334`, `20260819234424`, `20260820003749`, `20260820003856`, `20260820005626`; 18 FORCE RLS tablo, 14 `security_invoker` görünüm ve security advisor 0 bulgu |
| DPÜ entegrasyon kataloğu | **PASS** | 32 iç sistem, 32 eşleme, 32 dry-run senaryosu ve 32 sentetik audit olayı; gerçek veri/canlı istek/production sayaçları 0 |
| Vercel Preview | Public adres tanımlı | <https://kampusgo.uzemgo.com/pilot.html>; bu revizyonun son deploy/smoke sonucu **uygulama sonrası doğrulanacak** |
| GitHub uzak deposu | Mevcut | [`gurselveysel/kampusgo`](https://github.com/gurselveysel/kampusgo); bu revizyonun push SHA'sı **uygulama sonrası doğrulanacak** |
| Production | Yapılmayacak | Kesin NO-GO; terfi, production branch yayını veya production hedefi yok |

## Birsen Hoca geri bildirimlerinin karşılığı

| Geri bildirim | Uygulanan karşılık |
| --- | --- |
| “Ödeme bölümü yok” | Öğrenen panelinde ücretli programa başvuru, kanal seçimi, mali birime yönlendirme ve durum geçmişi |
| “Ödeme sayfasına ve mali işlere yönlendirme olsun” | `draft → pending_finance → approved/revision → reconciled` akışı; Finans rolüne tek tıkla geçiş, bildirim ve audit |
| “GİB, MYS/MAYS açıklamaları eksik” | Ana sayfa ve mali akışta GİB/e-Arşiv ile MYS/MAYS'ın amacı, onay kapısı ve canlı bağlantı sınırı |
| “Rol değişince genel bakış değişmiyor” | Dokuz rol için ayrı çalışma alanı başlığı, görev listesi, veri görünürlüğü, navigasyon ve işlem kapıları |
| “TYÇ ve Avrupa yeterlilikleri için hazır şablon” | TYÇ ve AYÇ/EQF ayrı sekmeler; her biri 1–8 seviye; doldurulabilir öğrenme hedefi–içerik–ölçme matrisi ve örnekler |
| “Verileri Supabase şemasına uyumla” | Resmî referans, çeviri, matris, ödeme, rol ve veri kaynağı kütüklerini kapsayan RLS'li migration |
| “DPÜ otomasyonlarını araştır ve entegre olacak şekilde kurgula” | Kaynak izli 32 iç sistem kataloğu; Tier ile MYYS önemini bağımsız sınıflandırma; ana-veri sahipliği, onay, fallback ve audit sözleşmeleri |

## Tamamlanan ekran ve işlevler

- Kurumsal açılış, kontrollü pilot sınırı, altı evre, demo giriş ve rol değiştirici
- Dokuz rol için role özgü genel bakış, görevler, veri görünürlüğü ve doğrudan rota engeli
- Katalog, program detayları, öğrenen eğitim/AKTS görünümü
- Ücretli program başvurusu, Sanal POS/Havale-EFT etiketli ödeme simülasyonu ve mali yönlendirme
- Finans/Döner Sermaye kuyruğu, mali ön onay, revizyon, mutabakat ve eğitime pilot kayıt
- GİB/e-Arşiv ve MYS/MAYS açıklama kartları; hata/yeniden deneme ve onay kapısı
- Program önerisi ve dış kazanım tanıma formları; doğrulama, taslak ve sentetik dosya üst verisi
- TYÇ 1–8 ile AYÇ/EQF 1–8 seviye seçimi, resmî tanımlayıcı kartları ve 16 matris şablonu
- İç/dış eğitici için matris kaydı; koordinatörlük, Komisyon ve admin için salt-okunur inceleme
- Başvuru arama/filtreleme, SLA, durum takibi ve denetim izi
- Komisyon karşılaştırma, kanıt, görüş, gerekçeli onay/ret/revizyon/çekimser kayıtları
- Ölçme-değerlendirme simülasyonu, olay günlüğü ve insan değerlendirici kararı
- Dijital yeterlilik cüzdanı ve pilot doğrulama rotası
- 32 kaynak izli DPÜ iç sistem kartı; Tier, MYYS önemi, ana-veri sahibi, onay, fallback ve dry-run denetim izi
- DPÜ iç kataloğundan ayrı 5 bağlı-olmayan dış pilot kapısı: GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS
- Raporlama, grafikler, bildirimler, boş/hata/yükleniyor durumları
- İki uçtan uca senaryo çalıştırıcısı

## Supabase şema teslimi

Canlı uygulanan kaynak migration'lar:

- [`20260820010000_framework_matrix_finance_role_seed.sql`](../supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql) — Supabase sürümü `20260819234334`
- [`20260820011000_framework_matrix_performance_indexes.sql`](../supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql) — Supabase sürümü `20260819234424`
- [`20260820012000_dpu_institutional_integration_catalog.sql`](../supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql) — Supabase sürümü `20260820003749`
- [`20260820013000_dpu_institutional_integration_performance_indexes.sql`](../supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql) — Supabase sürümü `20260820003856`
- [`20260820014000_dpu_institutional_source_provenance.sql`](../supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql) — Supabase sürümü `20260820005626`; sekiz genel dizin kaydını özgül resmî kaynak bağlantılarıyla sertleştirir

### Tablolar

`qualification_frameworks`, `qualification_level_descriptors`, `qualification_level_descriptor_translations`, `qualification_dataset_registry`, `official_qualification_references`, `pilot_matrix_templates`, `pilot_matrix_example_rows`, `pilot_matrix_drafts`, `pilot_matrix_draft_rows`, `pilot_finance_routes`, `pilot_payment_requests`, `pilot_payment_events`, `pilot_role_overviews`, `pilot_role_workflow_steps`, `institutional_system_registry`, `pilot_integration_mappings`, `pilot_integration_scenarios`, `pilot_integration_audit_events`.

### Salt-okunur katalog görünümleri

`qualification_level_catalog`, `qualification_level_bilingual_catalog`, `qualification_dataset_catalog`, `official_qualification_reference_catalog`, `pilot_matrix_template_catalog`, `pilot_matrix_draft_catalog`, `pilot_finance_handoff_catalog`, `pilot_payment_request_catalog`, `pilot_payment_event_catalog`, `pilot_role_workflow_catalog`, `institutional_system_catalog`, `pilot_integration_mapping_catalog`, `pilot_integration_scenario_catalog`, `pilot_integration_audit_catalog`.

Migration'lar canlı projeye başarıyla uygulandı. Doğrulanan sözleşme: 18 FORCE RLS tablo; `anon`/`authenticated` için yalnız `SELECT`; 14 `security_invoker` görünüm; 32 benzersiz HTTPS kaynak izi; `real_payment=false`, `real_data_sent=false`, `live_request_made=false`, `production_allowed=false` ve `automated_ingestion_enabled=false` değişmezleri. Security advisor sonucu **0 bulgu**. Entegrasyon yabancı anahtar indeks bulgusu `20260820003856` takip migration'ıyla kapatıldı; yalnız yeni/boş pilotta beklenen unused-index INFO kayıtları ve `auth_db_connections_absolute` INFO kaydı kaldı.

Canlı sayımlar: çerçeve `2`, tanımlayıcı `16`, şablon `16`, örnek satır `8`, mali rota `4`, rol özeti `9`, rol adımı `25`, veri kaynağı `2`, KDPÜ üst veri kaydı `6`, çeviri `8`, matris taslağı `2`, taslak satırı `6`, ödeme talebi `1`, ödeme olayı `2`.

Canlı DPÜ entegrasyon sayımları: iç sistem `32`, eşleme `32`, dry-run senaryosu `32`, sentetik audit olayı `32`. Güvenlik sorgularında gerçek veri etkin, gerçek veri gönderilmiş, canlı istek yapılmış veya production'a izin verilmiş kayıt sayılarının her biri `0` sonucunu verdi.

### Entegrasyon sınıflandırması ve ana-veri sınırı

- `tier1`: kamuya açık salt-okunur referans; `tier2`: kontrollü kimlik/durum/veri servisi; `tier3`: işlem, resmî belge veya mali handoff adayıdır.
- `core`, `supporting` ve `adjacent` MYYS önem etiketleri Tier'dan bağımsızdır; bir sistemin MYYS için önemli olması canlı yazma yetkisi anlamına gelmez.
- Kimlik merkezî kimlikte; öğrenci/kazanılmış AKTS OBS'de; planlanan müfredat ve çıktılar Bologna'da; teslim/değerlendirme kanıtı ÖYS'de; karar EBYS'de; kalite BKYS'de; tahsilat/hak ediş Döner Sermaye ve mali birimlerde kalır.
- MYYS yalnız onaylanmış asgari veri sözleşmelerinin orkestrasyon adayıdır; kaynak sistem ana verisini aynalamaz.
- GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS DPÜ iç kataloğunun parçası değil, ayrı ve bağlı-olmayan beş dış pilot kapısıdır.

## Resmî referans ile pilot verinin ayrımı

- Resmî kamu referansı: TYÇ 1–8, AYÇ/EQF 1–8 seviye tanımlayıcıları ve kaynak bağlantıları.
- Sınırlı kamu üst verisi: altı doğrulanmış KDPÜ kamu üst veri kaydı; kod, başlık, kurum, kredi değeri (kaynakta bulunduğunda), geçici seviye ve yerleştirme durumu.
- Sentetik pilot veri: matris şablonları/örnekleri, rol akışları, ödeme kayıtları, finans olayları ve kullanıcı işlemleri.

Türkiye Yeterlilikler Veri Tabanı'nın tam kopyası oluşturulmamıştır. Portalın toplu yeniden kullanım lisansı ve kamuya açık bulk API/export sözleşmesi doğrulanmadığı için yalnız elle doğrulanmış sınırlı üst veri saklanır. Portalda listelenmek resmî TYÇ yerleştirmesi değildir; bu ayrım veri modelinde `placement_status`, `level_status` ve `institutional_validation_required` alanlarıyla korunur.

## Test özeti

- Güncel yerel domain/rol/ödeme/matris/entegrasyon kabul paketi: **25/25 başarılı**.
- Yapı ve production güvenlik taraması: **23/23 zorunlu dosya başarılı**.
- Ödeme akışında yetkisiz rol, gerçek ödeme kanalı ve admin mali kararı reddedildi; `realPayment=false` korundu.
- TYÇ ve AYÇ/EQF için ayrı ayrı sekiz seviye, sekiz şablon ve zorunlu matris alanları doğrulandı.
- Önceki temel sürümün 9 rol × 1440/1024/768/390 px matrisi: **36/36 başarılı** ([run #7](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557)).
- Yeni ödeme/matris revizyonunun tam tarayıcı QA'sı, Preview asset/smoke kontrolü ve public alias kontrolü: **uygulama sonrası doğrulanacak**.
- Genişletilmiş migration'ın canlı apply/RLS/grant/advisor doğrulaması: **PASS**.
- DPÜ entegrasyon sözleşmesi: **32/32/32/32**; dört yeni FORCE RLS tablo, dört `security_invoker` görünüm ve tüm unsafe sayaçlar `0`.

## Demo kullanıcıları ve roller

1. Öğrenen / Öğrenci
2. Üniversite içi eğitici
3. Kurum dışı eğitici
4. Koordinatörlük / SEM
5. Mikro Yeterlilik Komisyonu üyesi
6. Öğrenci İşleri yetkilisi
7. Bilgi İşlem yetkilisi
8. Finans / Döner Sermaye yetkilisi
9. Sistem yöneticisi — akademik veya mali karar yetkisi yok

Gerçek hesap açılması veya gerçek kimlik doğrulama zorunlu değildir; tüm kullanıcı adları sentetiktir.

## ChatGPT Images varlıkları

1. MYYS ekosistemi ana sayfa hero illüstrasyonu
2. Komisyon karar destek masası illüstrasyonu
3. Dijital yeterlilik ve güven zinciri illüstrasyonu
4. Kontrollü entegrasyon kapıları illüstrasyonu

Logolar yüklenen özgün dosyalardan ayrı `<img>` bileşenleriyle kullanılır; oluşturulan görsellere logo, düğme, form, tablo veya uzun metin gömülmez.

## Bilinen pilot sınırları

- Supabase uzak referans katmanı salt-okunurdur; kullanıcı mutasyonları Preview tarayıcısındaki sürümlü `localStorage` alanında kalır.
- Gerçek ödeme, banka/kart bilgisi, e-fatura, muhasebe fişi, kişisel veri veya canlı entegrasyon yoktur.
- Matrisler otomatik seviye tayini veya akademik karar üretmez; yetkili kurul doğrulaması gerekir.
- AYÇ/EQF Türkçe gösterim katmanı, kaynak ve çeviri temelini kayıt bazında belirtir; kurumsal doğrulamaya açıktır.
- Türkiye Yeterlilikler Veri Tabanı tam scrape/mirror değildir; lisans ve bulk API/export sınırı nedeniyle `manual_snapshot_only` yaklaşımı kullanılır.
- DPÜ katalog kaydı, resmî kamu sayfası üzerinden sistemin varlığı/amacı için kaynak izidir; API, SSO, servis sözleşmesi, veri yazma yetkisi veya aktif entegrasyon kanıtı değildir.
- Giriş gerektiren ekranlar, kişi kayıtları, tam portal içerikleri ve kurumsal veri tabanları kazınmamış; gerçek kişisel veri, token veya parola depolanmamıştır.
- QR görünümü dekoratif simülasyondur; üretim imzası veya standart uygunluk iddiası yoktur.
- Bu revizyonun GitHub SHA'sı, READY Preview kimliği ve custom-domain smoke testi henüz kesinleştirilmemiştir.

## Kurulum

```bash
npm install
npm run dev
npm test
npm run build
```

Yerel adres: `http://localhost:3000`; kök rota `/pilot.html`'e yönlenir. Statik sunucu: `npm run dev:static` → `http://localhost:4173`.

## Production teyidi

Karar kesin **NO-GO**'dur. Bu çalışma production deployment, production branch yayını, canlı kurumsal sistem bağlantısı, gerçek Supabase kullanıcı mutasyonu veya production alan adı hedefi oluşturmaz. Kabul edilecek dağıtım yalnız `target: null` Vercel Preview olmalıdır; bu revizyonun deployment teyidi uygulama sonrası kayda geçirilecektir.
