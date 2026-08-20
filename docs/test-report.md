# Test ve teslim raporu

Tarih: 19–20 Ağustos 2026 (UTC)

Hedef ortam: Yalnız Vercel Preview

Karar: **Production NO-GO**

## Test kapsamındaki rotalar

- Uygulama rotası: `/pilot.html`
- Kök rota beklentisi: `/` → `/pilot.html`
- Exact Preview: <https://kdpu-myys-mockup-roliiwx2o-info-64116029s-projects.vercel.app/pilot.html> — `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`, READY, `target: null`, alias `[]`, asset smoke **PASS**
- Özel alias <https://kampusgo.uzemgo.com/pilot.html> bu çalışmada güncellenmedi; final exact Preview değildir.

## Güncel yerel otomatik kontroller

| Kontrol | Kapsam | Sonuç |
| --- | --- | --- |
| Domain kabul paketi | Dokuz rol, sahiplik, görünürlük, karar yetkisi, ödeme, TYÇ/AYÇ/TYYÇ, yönerge UI sözleşmesi, DPÜ katalog UI'sı, audit ve uçtan uca senaryolar | **36/36 başarılı** |
| Yapı doğrulama | 47 zorunlu dosya, marka/görsel referansı, production/secret ve yasak tarayıcı API taraması | **Başarılı** |
| DPÜ entegrasyon sözleşmesi | 32 iç sistem, 32 eşleme, 32 dry-run senaryosu, 32 sentetik audit; 4 FORCE RLS tablo, 4 `security_invoker` görünüm | **Başarılı** |
| TYÇ/AYÇ/TYYÇ bütünlüğü | TYÇ 1–8 + AYÇ/EQF 1–8 + TYYÇ 5–8; üç çerçevede ayrı öneri ve toplam 20 şablon | **Başarılı** |
| Akıllı eşleme motoru | Türkçe çıktı bazlı üç çerçeveli öneri, açıklanabilir skor/gerekçe, içerik/ölçme, aggregate, v15 değişmez snapshot, override hydration ve RBAC | **12/12 başarılı** |
| Akıllı eşleme şema sözleşmesi | TYYÇ/Bologna crosswalk, directive program/version composite FK, constructive-alignment zinciri ve remote/fallback yapısal paritesi | **Canlı PASS — `20260820123559` + `20260820124546`** |
| Anonim Supabase okuma sınırı | Yalnız 2 kaynak tablosu + 2 kamu görünümü; korumalı view isteği, Bearer ve anonim yazma yok | **Başarılı** |
| Ödeme RBAC | Öğrenen başlatır, Finans onaylar/revize eder/mutabakat yapar; admin mali karar veremez | **Başarılı** |
| Mali açıklama görünürlüğü | Ana sayfada GİB/e-Arşiv ve MYS/MAYS kontrollü entegrasyon açıklamaları | **Başarılı** |
| Canlı etki değişmezleri | Gerçek ödeme kanalı reddi; `realPayment=false`, dış aktarımda `realDataSent=false` | **Başarılı** |
| Güncel tarayıcı regresyonu | v15; 9 rol × 1440, 1024, 768 ve 390 px; ödeme, TYÇ/AYÇ/TYYÇ, yönerge, entegrasyon, sahiplik, kalıcılık ve anonim ağ sınırı | **PASS** — 36 bileşim/0 hata, [run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382) |
| Akıllı eşleme genişletilmiş tarayıcı QA | Üç çerçeveli öneriler, içerik/ölçme, override, tam snapshot/historical evidence, komisyon salt-okunur inceleme, bozuk state fallback ve dört viewport | **PASS** — job `96447182122`, artifact `9409045414` |
| Genişletilmiş migration canlı testi | Apply, sayımlar, FORCE RLS/grant, kataloglar, security/performance advisor | **PASS** |
| Exact Preview smoke | Rota, içerik, JS/CSS/görsel asset ve Vercel auth duvarı kontrolü | **PASS** |

Yerel test komutları:

```bash
npm test
npm run test:browser
```

Çalıştırma çıktısı:

- `Dokuz rol domain testi başarılı: 36/36 sözleşme`
- `Akıllı yeterlilik eşleme sözleşmesi başarılı: 12/12`
- `qualification-suggestion-contract: OK`
- `PASS institutional integration contract — 32 systems / 32 mappings / 32 scenarios / 32 audit events`
- `Doğrulama başarılı: 47 zorunlu dosya bulundu; production güvenlik taraması temiz.`

## 36/36 kabul kapsamı

36 alanlık regresyon paketine ek olarak akıllı eşleme motoru için ayrı 12/12 kabul sözleşmesi çalışır. Ayrı paket; TYÇ/AYÇ 1–8 ile TYYÇ 5–8 katalog bütünlüğünü, çıktı bazlı boyut/seviye ayrımını, açıklanabilir skor ve gerekçeyi, içerik/ölçme önerilerini, program aggregate'ini, eğitici seçimi/manuel düzeltmeyi, kaynak sürümü ve hash taşıyan değişmez tam snapshot'ı, tarihsel kanıtın yeniden hesaplanmamasını, koordinatörlük–Komisyon salt-okunur sınırını, bozuk girdiyi ve otomatik karar yasağını doğrular.

### Rol ve erişim

- Dokuz benzersiz rol ve her rolün tanımlı navigasyon hedefleri
- Rol kimliği ile sentetik aktör adının birebir eşleşmesi
- Aynı hash üzerinde rol değişiminde anlık yeniden render
- Role özgü genel bakış, görev listesi ve ayırt edici çalışma alanı işareti
- Başvuru sahipliği; aynı role sahip farklı demo kişilerin ayrılması
- Taslak, başvuru ve program görünürlüğünün rol/kişi bazında süzülmesi
- Koordinatör, Komisyon, Öğrenci İşleri, Bilgi İşlem, Finans ve admin yetki ayrımı

### TYÇ, AYÇ/EQF ve TYYÇ

- TYÇ ve AYÇ/EQF için ayrı ayrı 1–8 seviye dizisi
- Her seviye için Bilgi/Beceri/Yetkinlik veya Knowledge/Skills/Responsibility and autonomy alanları
- TYÇ ve AYÇ/EQF için sekizer hazır matris şablonu
- TYYÇ için 5–8 düzey, altı yükseköğretim yeterlilik türü adayı ve dört hazır şablon
- Yedi zorunlu matris sütunu ve 5–8. seviyeler için sentetik örnekler
- Matris rotasının yalnız iç/dış eğitici, koordinatörlük, Komisyon ve admin navigasyonunda görünmesi
- Taslak kaydının yalnız iç/dış eğiticiye; incelemenin koordinatörlük/Komisyon/admin'e salt-okunur açılması

### Ödeme ve finans

- Ücretli programdan öğrenen ödeme demosuna geçiş
- Yalnız Sanal POS ve Havale/EFT simülasyonu kanal etiketlerinin kabulü
- Finans rolüne bildirim ve uygulama içi yönlendirme
- `draft → pending_finance → approved/revision → reconciled` durumları
- Mutabakat sonrası sentetik eğitim kaydı ve denetim izi
- Finans dışındaki rolün mali karar verememesi
- Gerçek kart/banka kanalı ve gerçek ödeme davranışının reddedilmesi

### Mevcut domain sözleşmeleri

- Kurum dışı eğitici önerisinin doğru sahiplik ve audit rolüyle kaydı
- Kurum dışı eğiticinin dış kazanım tanıma başvurusu oluşturamaması
- Komisyonun gerekçeli onay, ret, revizyon ve çekimser görüş davranışı
- İnsan değerlendirici kararının yalnız iç eğitici, dış eğitici ve Komisyon rolüne açılması
- Tamamlanmış değerlendirmede tekrar karar ve geçersiz puan engeli
- Pilot yeterlilik oluşturma ve mükerrer kod engeli
- İki uçtan uca senaryoda kalıcı durum ve `realDataSent=false` aktarım kaydı

### DPÜ entegrasyon sözleşmesi

- 32 DPÜ iç sisteminin her biri için tam bir eşleme, dry-run senaryosu ve sentetik audit olayı
- Tier 1/2/3 teknik entegrasyon sınıfı ile `core`/`supporting`/`adjacent` MYYS öneminin bağımsız doğrulanması
- Kaynak URL, doğrulama temeli, kayıt sahibi, ana-veri sınırı, çatışma politikası, adapter ve fallback alanları
- GİB/e-Arşiv, mali MYS/MAYS, YÖKSİS/TÖMERSİS, e-Devlet ve e-posta/SMS'in beş ayrı dış pilot kapısı olarak korunması
- `realDataEnabled=false`, `realDataSent=false`, `liveRequestMade=false`, `productionAllowed=false`
- Giriş ekranı kazıma, kişi verisi, parola/token, gerçek API çağrısı veya production yazımı olmaması

## Tarayıcı QA durumu

Güncel v15 yayını 9 rol × dört viewport matrisini ödeme, entegrasyon, yönerge ve yeterlilik öneri akışlarıyla geçmiştir. Koşu kaydı [GitHub Actions run `32375917382`](https://github.com/gurselveysel/kampusgo/actions/runs/32375917382), job `96447182122`; kanıt paketi `9409045414` numaralı `nine-role-preview-qa` artifact'ıdır. ZIP 3.755.151 bayttır ve SHA-256 özeti `3cd1ee779d14fa68696f4c7885ada3a4a1a04cb915e957cd51e779fc153f3b8c` değeridir. Chromium içeren CI koşusunda 36 rol/viewport bileşimi ve aşağıdaki kapsam 0 hatayla doğrulanmıştır:

- Öğrenen ödeme talebi → Finans onayı → mutabakat → pilot kayıt
- TYÇ ve AYÇ/EQF için 1–8, TYYÇ için 5–8 seviye seçenekleri ve üç çerçeve arasında geçiş
- İç eğitici matris kaydı ve `localStorage` geri yükleme
- Türkçe öğrenme çıktılarında TYÇ/AYÇ/TYYÇ açıklanabilir önerileri, içerik/ölçme uygulama ve gerekçeli manuel override
- `smartAlignments` v15 serialize/hydrate; kaynak/referans sürümü, seçim bağlamı ve hash taşıyan tam snapshot; tarihsel TYYÇ kanıtının yeniden hesaplanmaması
- Kurum dışı eğitici düzenleme; koordinatör ve Komisyon salt-okunur görünümü
- Dokuz rolün ayrı overview başlığı, görev ve navigasyonu
- Entegrasyon Merkezi'nde 32 iç sistem, bağımsız Tier/MYYS önemi filtreleri, ana-veri sınırı ve beş dış kapı
- 1440, 1024, 768 ve 390 px'te yatay taşma, kırık görsel, modal, toast, odak ve mobil menü
- Exact Preview üzerinde Vercel giriş duvarı olmadan erişim; özel aliasın final kanıt olarak kullanılmaması

Sonuç durumu: **Güncel akıllı eşleme yayını PASS — 9/9 rol, 4/4 viewport, 36/36 bileşim, 0 hata**.

## Supabase canlı doğrulama sonucu

Canlı Supabase migration sürümleri:

- `20260819234334` — [çerçeve, matris, rol ve finans şeması](../supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql)
- `20260819234424` — [çeviri yabancı anahtarı performans indeksi](../supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql)
- `20260820003749` — [DPÜ kurumsal entegrasyon kataloğu](../supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql)
- `20260820003856` — [DPÜ entegrasyon yabancı anahtar performans indeksleri](../supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql)
- `20260820005626` — [DPÜ kaynak-provenans sertleştirmesi](../supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql)
- `20260820062225` — [akıllı yeterlilik öneri şeması](../supabase/migrations/20260820020000_smart_qualification_suggestion_engine.sql)
- `20260820062551` — [akıllı öneri bileşik yabancı anahtar performans indeksi](../supabase/migrations/20260820021000_smart_qualification_performance_indexes.sql)
- `20260820113725` — [yönerge kontrollü pilot program/version omurgası](../supabase/migrations/20260820030000_directive_alignment_pilot_schema.sql)
- `20260820114057` — [yönerge performans indeksleri](../supabase/migrations/20260820031000_directive_alignment_performance_indexes.sql)
- `20260820123559` — [TYYÇ akıllı eşleme program omurgası](../supabase/migrations/20260820032000_tyyc_smart_alignment_program_spine.sql)
- `20260820123602` — [yönerge kaynak ve erişim sertleştirmesi](../supabase/migrations/20260820033000_directive_reference_access_hardening.sql)
- `20260820124546` — [TYYÇ omurga bütünlüğü ve performans indeksleri](../supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql)

Canlı migration sayısı: **15**.

Doğrulanan güvenlik ve veri sözleşmeleri:

- Yönerge kapsamındaki 34 tabloda RLS + FORCE RLS
- 15 yönerge görünümünde `security_invoker`
- 27 resmî kaynak ve 33 madde–kaynak bağlantısı
- Anonim yüzey tam olarak 2 kaynak tablosu + 2 kamu görünümü; korumalı view isteği ve anonim yazma grant/policy'si yok
- Dokuz rol için rol, birim, organ üyeliği, görev süresi ve karar kapsamı birebir DTO sözleşmesi
- Çerçeve → tanımlayıcı/çeviri → matris ve taslak satırı yabancı anahtarları
- Ödeme talebi → ödeme olayı zinciri
- `real_payment=false`, `has_financial_identifiers=false`, `real_data_sent=false`
- `automated_ingestion_enabled=false`, `ingestion_status='manual_snapshot_only'`
- Sınırlı kamu üst verisi ile sentetik pilot verinin ayrı politikalarla okunması
- DPÜ iç sistem → eşleme → senaryo → sentetik audit yabancı anahtar zinciri
- Çıktı önerisi → program özeti, gerekçeli eğitici düzeltmesi → öneri ve kurul kararı → program özeti bileşik yabancı anahtarları
- Akıllı öneri kayıtlarında `autonomous_decision=false`; kurul kararı ayrı insan kaydıdır ve `suggestion_mutated=false`
- Bütün canlı-etki sayaçlarının sıfır olması: gerçek veri etkin/gönderilmiş, canlı istek yapılmış ve production izinli kayıt yok

Canlı doğrulama sayımları:

| Veri/güvenlik kümesi | Sayı |
| --- | ---: |
| Uygulanmış migration | 15 |
| Yönerge FORCE RLS tablo / `security_invoker` görünüm | 34 / 15 |
| Resmî kaynak / madde–kaynak bağlantısı | 27 / 33 |
| Rol kapsam DTO'su | 9 |
| Anonim kaynak tablosu / kamu görünümü / korumalı istek / yazma | 2 / 2 / 0 / 0 |
| DPÜ iç sistem / eşleme / dry-run senaryosu / sentetik audit | 32 / 32 / 32 / 32 |

Security advisor: **0 bulgu**. İndekslenmemiş yabancı anahtar: **0**. Performance advisor'da yalnız yeni/boş pilotta beklenen unused-index girdileri ile Auth bağlantı stratejisi girdisi olmak üzere **96 INFO** kaydı vardır; hata veya uyarı değildir. Sonuç: **PASS**.

## Ana demo senaryoları

1. İç eğitici programı ve TYÇ/AYÇ/TYYÇ matrisini taslaklar; koordinatörlük/Komisyon incelemesi, gerekçeli karar, katalog, öğrenen kaydı, değerlendirme ve cüzdan adımları pilot durumda güncellenir.
2. Öğrenen dış kazanım formunu gönderir; deterministik analiz işaretleri, Komisyon görüşü, tanınan kredi ve ÖBİS/YÖKSİS aktarım simülasyonu dış servis çağrısı olmadan izlenir.
3. Öğrenen ücretli programa başvurur; kanal etiketini seçer, Finans demo kuyruğuna aktarır, mali onay/mutabakat sonrası sentetik eğitime kaydolur. Gerçek ödeme veya e-belge oluşmaz.

## Bilinen pilot sınırları

- Supabase anonim referans katmanı yalnız iki kamu görünümünü okur; korumalı DTO'lar JWT kapsamı ister. Kullanıcı mutasyonları izole ve sürümlü `localStorage` alanında kalır.
- Gerçek QR, dijital imza, e-posta/SMS, ödeme, banka/kart verisi, dosya aktarımı veya dış entegrasyon yoktur.
- Matris, seviye ve mali parametreler otomatik karar veya kesin mevzuat kuralı değildir.
- Portal verisinin tamamı kopyalanmaz; doğrulanmamış yeniden kullanım lisansı ve bulk API/export sınırı nedeniyle yalnız sınırlı üst veri tutulur.
- DPÜ entegrasyon kataloğu kaynak izli bir aday tasarımdır; API/SSO/servis sözleşmesi, canlı bağlantı veya veri yazma yetkisi iddia etmez.
- Tam kimlik doğrulamalı sayfa kazıması, kişi verisi alımı ve gerçek kurumsal otomasyon çağrısı yapılmamıştır.
- Vercel exact Preview, canlı Supabase doğrulaması ve güncel tarayıcı matrisi kesinleşmiştir. Uygulama v15 kod/QA kanıtı [`1dd8dd6`](https://github.com/gurselveysel/kampusgo/commit/1dd8dd699992cf06463d9feeff522cb8a1a3d1cb), final workflow [`b966813`](https://github.com/gurselveysel/kampusgo/commit/b966813d1d6fb154eea209ff70e28c5b6a6b43ba), final QA koşusu `32375917382`'dir. Özel custom-domain alias güncellenmemiştir ve final Preview değildir.
- Production deployment, production branch yayını ve canlı kurumsal bağlantı kesin kapsam dışıdır.

## Production teyidi

Kabul edilebilir hedef yalnız Vercel **Preview** (`target: null`) dağıtımıdır. Production'a terfi, production branch yayını, gerçek veri veya canlı servis çağrısı yapılmayacaktır. Bu revizyonun doğrulanan kimliği `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`'dır; alias listesi boştur.
