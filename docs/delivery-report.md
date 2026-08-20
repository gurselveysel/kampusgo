# MYYS kontrollü pilot — tek teslim raporu

Tarih: 19–20 Ağustos 2026 (UTC)

Karar: **Production NO-GO**

## Teslim durumu

| Çıktı | Durum | Not |
| --- | --- | --- |
| Çalışan uygulama kodu | Hazır | Gerçek HTML/CSS/ES module bileşenleri; ekran görüntüsü tabanlı arayüz değildir |
| Dokuz rol kabulü | **PASS** | Dokuz rolün farklı özet, navigasyon, görünürlük ve işlem sınırları; 36/36 yerel sözleşme ve 36 rol/viewport tarayıcı bileşimi geçti |
| Ödeme ve finans akışı | **PASS** | Gerçek ödeme almayan öğrenen → Finans / Döner Sermaye akışı, revizyon/onay/mutabakat ve audit |
| TYÇ / AYÇ / TYYÇ matrisleri | **PASS** | TYÇ 1–8 + AYÇ/EQF 1–8 + TYYÇ 5–8; çıktı bazlı açıklanabilir öneri, v15 değişmez snapshot, eğitici seçimi/düzeltmesi ve salt-okunur inceleme |
| Supabase migration | **PASS** | Toplam 15 canlı migration; yönerge kapsamında 34 FORCE RLS tablo, 15 `security_invoker` görünüm, security advisor 0 ve indekslenmemiş yabancı anahtar 0 |
| DPÜ entegrasyon kataloğu | **PASS** | 32 iç sistem, 32 eşleme, 32 dry-run senaryosu ve 32 sentetik audit olayı; gerçek veri/canlı istek/production sayaçları 0 |
| Vercel Preview | **READY / PASS** | [`dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`](https://kdpu-myys-mockup-roliiwx2o-info-64116029s-projects.vercel.app/pilot.html), `target: null`, alias `[]`; exact Preview QA geçti |
| GitHub uzak deposu | **PASS** | [`gurselveysel/kampusgo`](https://github.com/gurselveysel/kampusgo); [v15 kod/QA düzeltmesi `1dd8dd6`](https://github.com/gurselveysel/kampusgo/commit/1dd8dd699992cf06463d9feeff522cb8a1a3d1cb), [final workflow `b966813`](https://github.com/gurselveysel/kampusgo/commit/b966813d1d6fb154eea209ff70e28c5b6a6b43ba), final QA [run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382); otomatik production yayını yok |
| Production | Yapılmayacak | Kesin NO-GO; terfi, production branch yayını veya production hedefi yok |

## Birsen Hoca geri bildirimlerinin karşılığı

| Geri bildirim | Uygulanan karşılık |
| --- | --- |
| “Ödeme bölümü yok” | Öğrenen panelinde ücretli programa başvuru, kanal seçimi, mali birime yönlendirme ve durum geçmişi |
| “Ödeme sayfasına ve mali işlere yönlendirme olsun” | `draft → pending_finance → approved/revision → reconciled` akışı; Finans rolüne tek tıkla geçiş, bildirim ve audit |
| “GİB, MYS/MAYS açıklamaları eksik” | Ana sayfa ve mali akışta GİB/e-Arşiv ile MYS/MAYS'ın amacı, onay kapısı ve canlı bağlantı sınırı |
| “Rol değişince genel bakış değişmiyor” | Dokuz rol için ayrı çalışma alanı başlığı, görev listesi, veri görünürlüğü, navigasyon ve işlem kapıları |
| “TYÇ ve Avrupa yeterlilikleri için hazır şablon” | TYÇ ve AYÇ/EQF için 1–8, TYYÇ için 5–8 ayrı sekmeler; doldurulabilir öğrenme hedefi–içerik–ölçme matrisi ve örnekler |
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
- TYÇ 1–8, AYÇ/EQF 1–8 ve TYYÇ 5–8 seviye seçimi, resmî referans kartları ve 20 matris şablonu
- Her öğrenme çıktısı için ayrı TYÇ/AYÇ/TYYÇ seviye, boyut, puan, gerekçe, içerik, ölçme ve kanıt önerisi; program kapsama/tutarlılık özeti
- Tam öneri raporunun kaynak/referans sürümü, seçim bağlamı ve hash ile değişmez v15 snapshot'ı; tarihsel kanıtın güncel motorla yeniden hesaplanmaması
- İç/dış eğitici için tek tek öneri seçimi veya gerekçeli düzeltme; koordinatörlük/Komisyon için salt-okunur inceleme ve ayrı insan kurul kararı
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
- [`20260820020000_smart_qualification_suggestion_engine.sql`](../supabase/migrations/20260820020000_smart_qualification_suggestion_engine.sql) — Supabase sürümü `20260820062225`; akıllı öneri, program özeti, eğitici düzeltmesi ve insan kurul kararı katalogları
- [`20260820021000_smart_qualification_performance_indexes.sql`](../supabase/migrations/20260820021000_smart_qualification_performance_indexes.sql) — Supabase sürümü `20260820062551`; bileşik öneri-provenans yabancı anahtar indeksi
- [`20260820030000_directive_alignment_pilot_schema.sql`](../supabase/migrations/20260820030000_directive_alignment_pilot_schema.sql) — Supabase sürümü `20260820113725`; yönerge kontrollü program/version omurgası
- [`20260820031000_directive_alignment_performance_indexes.sql`](../supabase/migrations/20260820031000_directive_alignment_performance_indexes.sql) — Supabase sürümü `20260820114057`; yönerge yabancı anahtar performans indeksleri
- [`20260820032000_tyyc_smart_alignment_program_spine.sql`](../supabase/migrations/20260820032000_tyyc_smart_alignment_program_spine.sql) — Supabase sürümü `20260820123559`; ayrı TYYÇ katmanı, composite FK ve constructive-alignment zinciri
- [`20260820033000_directive_reference_access_hardening.sql`](../supabase/migrations/20260820033000_directive_reference_access_hardening.sql) — Supabase sürümü `20260820123602`; kaynak sicili ve JWT rol/birim/kapsam RLS sertleştirmesi
- [`20260820034000_tyyc_spine_integrity_performance.sql`](../supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql) — Supabase sürümü `20260820124546`; aynı omurga bütünlüğü ve performans indeksleri

### Tablolar

Önceki kataloglara ek olarak `qualification_higher_education_cycle_crosswalks`, `pilot_qualification_suggestion_engine_profiles`, `pilot_qualification_program_summaries`, `pilot_learning_outcome_suggestions`, `pilot_qualification_manual_override_examples` ve `pilot_qualification_board_decision_examples`.

### Salt-okunur katalog görünümleri

Önceki kataloglara ek olarak `qualification_higher_education_cycle_catalog`, `pilot_qualification_suggestion_profile_catalog`, `pilot_qualification_program_summary_catalog`, `pilot_learning_outcome_suggestion_catalog`, `pilot_qualification_manual_override_catalog` ve `pilot_qualification_board_decision_catalog`.

Toplam **15 migration** canlı projeye başarıyla uygulandı. Yönerge kapsamındaki doğrulanan sözleşme: 34 FORCE RLS tablo, 15 `security_invoker` görünüm, 27 resmî kaynak (S01–S27), 33 madde–kaynak bağlantısı ve dokuz rol için rol/birim/üyelik/görev/karar kapsamlı DTO. Anonim istemci tam olarak iki resmî kaynak tablosunun iki kamu görünümünü okur; korumalı görünüm isteği yapmaz, anonim yazma grant'i veya policy'si yoktur. `real_payment=false`, `real_data_sent=false`, `live_request_made=false`, `production_allowed=false`, `autonomous_decision=false` ve `automated_ingestion_enabled=false` değişmezleri korunur. Security advisor **0**, indekslenmemiş yabancı anahtar **0**; performance advisor yalnız boş pilotta beklenen unused-index ve Auth bağlantı stratejisi sınıfında **96 INFO** kaydı verir.

Canlı yönerge omurgası sayımları: resmî kaynak `27`, madde–kaynak bağlantısı `33`, rol kapsam DTO'su `9`. Anonim erişim yüzeyi iki kaynak tablosu ve iki kamu görünümüyle sınırlıdır.

Canlı DPÜ entegrasyon sayımları: iç sistem `32`, eşleme `32`, dry-run senaryosu `32`, sentetik audit olayı `32`. Güvenlik sorgularında gerçek veri etkin, gerçek veri gönderilmiş, canlı istek yapılmış veya production'a izin verilmiş kayıt sayılarının her biri `0` sonucunu verdi.

### Entegrasyon sınıflandırması ve ana-veri sınırı

- `tier1`: kamuya açık salt-okunur referans; `tier2`: kontrollü kimlik/durum/veri servisi; `tier3`: işlem, resmî belge veya mali handoff adayıdır.
- `core`, `supporting` ve `adjacent` MYYS önem etiketleri Tier'dan bağımsızdır; bir sistemin MYYS için önemli olması canlı yazma yetkisi anlamına gelmez.
- Kimlik merkezî kimlikte; öğrenci/kazanılmış AKTS OBS'de; planlanan müfredat ve çıktılar Bologna'da; teslim/değerlendirme kanıtı ÖYS'de; karar EBYS'de; kalite BKYS'de; tahsilat/hak ediş Döner Sermaye ve mali birimlerde kalır.
- MYYS yalnız onaylanmış asgari veri sözleşmelerinin orkestrasyon adayıdır; kaynak sistem ana verisini aynalamaz.
- GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS DPÜ iç kataloğunun parçası değil, ayrı ve bağlı-olmayan beş dış pilot kapısıdır.

## Resmî referans ile pilot verinin ayrımı

- Resmî kamu referansı: TYÇ 1–8, AYÇ/EQF 1–8 ve TYYÇ 5–8 kaynak/tür referansları.
- Sınırlı kamu üst verisi: altı doğrulanmış KDPÜ kamu üst veri kaydı; kod, başlık, kurum, kredi değeri (kaynakta bulunduğunda), geçici seviye ve yerleştirme durumu.
- Sentetik pilot veri: matris şablonları/örnekleri, rol akışları, ödeme kayıtları, finans olayları ve kullanıcı işlemleri.

Türkiye Yeterlilikler Veri Tabanı'nın tam kopyası oluşturulmamıştır. Portalın toplu yeniden kullanım lisansı ve kamuya açık bulk API/export sözleşmesi doğrulanmadığı için yalnız elle doğrulanmış sınırlı üst veri saklanır. Portalda listelenmek resmî TYÇ yerleştirmesi değildir; bu ayrım veri modelinde `placement_status`, `level_status` ve `institutional_validation_required` alanlarıyla korunur.

## Test özeti

- Güncel yerel domain/rol/ödeme/matris/entegrasyon ve yönerge UI sözleşmesi kabul paketi: **36/36 başarılı**.
- Akıllı TYÇ/AYÇ/TYYÇ eşleme ve değişmez snapshot sözleşmesi: **12/12 başarılı**.
- Yapı ve production güvenlik taraması: **47/47 zorunlu dosya başarılı**.
- Ödeme akışında yetkisiz rol, gerçek ödeme kanalı ve admin mali kararı reddedildi; `realPayment=false` korundu.
- TYÇ ve AYÇ/EQF için 1–8, TYYÇ için 5–8 düzeyleri, 20 şablon ve zorunlu matris alanları doğrulandı.
- Güncel v15 sürümün 9 rol × 1440/1024/768/390 px matrisi, ödeme uçtan uca akışı, akıllı TYÇ/AYÇ/TYYÇ eşleme, immutable kanıt, entegrasyon kataloğu ve sahiplik kontrolleri: **PASS** — 36 bileşim/0 hata ([run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382), job `96447182122`, artifact `9409045414`; 3.755.151 bayt; SHA-256 `3cd1ee779d14fa68696f4c7885ada3a4a1a04cb915e957cd51e779fc153f3b8c`).
- Exact Preview ve asset/smoke kontrolü: **PASS**. Özel custom-domain alias bu çalışmada güncellenmedi ve final Preview değildir.
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

- Supabase anonim referans katmanı yalnız iki kamu kaynak görünümünü okur; korumalı DTO'lar JWT kapsamı ister. Kullanıcı mutasyonları Preview tarayıcısındaki sürümlü `localStorage` alanında kalır.
- Gerçek ödeme, banka/kart bilgisi, e-fatura, muhasebe fişi, kişisel veri veya canlı entegrasyon yoktur.
- Matrisler otomatik seviye tayini veya akademik karar üretmez; yetkili kurul doğrulaması gerekir.
- AYÇ/EQF Türkçe gösterim katmanı, kaynak ve çeviri temelini kayıt bazında belirtir; kurumsal doğrulamaya açıktır.
- Türkiye Yeterlilikler Veri Tabanı tam scrape/mirror değildir; lisans ve bulk API/export sınırı nedeniyle `manual_snapshot_only` yaklaşımı kullanılır.
- DPÜ katalog kaydı, resmî kamu sayfası üzerinden sistemin varlığı/amacı için kaynak izidir; API, SSO, servis sözleşmesi, veri yazma yetkisi veya aktif entegrasyon kanıtı değildir.
- Giriş gerektiren ekranlar, kişi kayıtları, tam portal içerikleri ve kurumsal veri tabanları kazınmamış; gerçek kişisel veri, token veya parola depolanmamıştır.
- QR görünümü dekoratif simülasyondur; üretim imzası veya standart uygunluk iddiası yoktur.
- Uygulama veri sürümü v15'tir. GitHub kanıtı `1dd8dd699992cf06463d9feeff522cb8a1a3d1cb`, final workflow `b966813d1d6fb154eea209ff70e28c5b6a6b43ba` ve READY exact Preview `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX` olarak doğrulandı. Özel custom-domain alias güncellenmemiştir ve final exact Preview değildir.

## Kurulum

```bash
npm install
npm run dev
npm test
npm run build
```

Yerel adres: `http://localhost:3000`; kök rota `/pilot.html`'e yönlenir. Statik sunucu: `npm run dev:static` → `http://localhost:4173`.

## Production teyidi

Karar kesin **NO-GO**'dur. Bu çalışma production deployment, production branch yayını, canlı kurumsal sistem bağlantısı, gerçek Supabase kullanıcı mutasyonu veya production alan adı hedefi oluşturmaz. Kabul edilen dağıtım `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX` kimlikli READY, `target: null`, alias `[]` Vercel Preview'dır.
