# Test ve teslim raporu

Tarih: 19–20 Ağustos 2026 (UTC)

Hedef ortam: Yalnız Vercel Preview

Karar: **Production NO-GO**

## Test kapsamındaki rotalar

- Public Preview: <https://kampusgo.uzemgo.com/pilot.html>
- Uygulama rotası: `/pilot.html`
- Kök rota beklentisi: `/` → `/pilot.html`
- Bu revizyonun son Preview kimliği ve alias smoke sonucu: **uygulama sonrası doğrulanacak**

## Güncel yerel otomatik kontroller

| Kontrol | Kapsam | Sonuç |
| --- | --- | --- |
| Domain kabul paketi | Dokuz rol, sahiplik, görünürlük, karar yetkisi, ödeme, TYÇ/AYÇ, DPÜ katalog UI'sı, audit ve iki uçtan uca senaryo | **25/25 başarılı** |
| Yapı doğrulama | 23 zorunlu dosya, marka/görsel referansı, production/secret ve yasak tarayıcı API taraması | **Başarılı** |
| DPÜ entegrasyon sözleşmesi | 32 iç sistem, 32 eşleme, 32 dry-run senaryosu, 32 sentetik audit; 4 FORCE RLS tablo, 4 `security_invoker` görünüm | **Başarılı** |
| TYÇ/AYÇ bütünlüğü | TYÇ 8 + AYÇ/EQF 8 tanımlayıcı; iki çerçevede 8'er şablon | **Başarılı** |
| Ödeme RBAC | Öğrenen başlatır, Finans onaylar/revize eder/mutabakat yapar; admin mali karar veremez | **Başarılı** |
| Mali açıklama görünürlüğü | Ana sayfada GİB/e-Arşiv ve MYS/MAYS kontrollü entegrasyon açıklamaları | **Başarılı** |
| Canlı etki değişmezleri | Gerçek ödeme kanalı reddi; `realPayment=false`, dış aktarımda `realDataSent=false` | **Başarılı** |
| Önceki temel sürüm tarayıcı QA | 9 rol × 1440, 1024, 768 ve 390 px | **36/36 başarılı** — [run #7](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557) |
| Güncel revizyon tarayıcı QA | Ödeme uçtan uca akışı, TYÇ/AYÇ düzenleme/salt-okunur kapıları ve dört viewport | **Uygulama sonrası doğrulanacak** |
| Genişletilmiş migration canlı testi | Apply, sayımlar, FORCE RLS/grant, kataloglar, security/performance advisor | **PASS** |
| Public alias smoke | Rota, içerik, JS/CSS/görsel asset ve Vercel auth duvarı kontrolü | **Uygulama sonrası doğrulanacak** |

Yerel test komutları:

```bash
node scripts/test.mjs
node scripts/institutional-integration-contract.mjs
node scripts/validate.mjs
```

Çalıştırma çıktısı:

- `Dokuz rol domain testi başarılı: 25/25 sözleşme`
- `PASS institutional integration contract — 32 systems / 32 mappings / 32 scenarios / 32 audit events`
- `Doğrulama başarılı: 23 zorunlu dosya bulundu; production güvenlik taraması temiz.`

## 25/25 kabul kapsamı

### Rol ve erişim

- Dokuz benzersiz rol ve her rolün tanımlı navigasyon hedefleri
- Rol kimliği ile sentetik aktör adının birebir eşleşmesi
- Aynı hash üzerinde rol değişiminde anlık yeniden render
- Role özgü genel bakış, görev listesi ve ayırt edici çalışma alanı işareti
- Başvuru sahipliği; aynı role sahip farklı demo kişilerin ayrılması
- Taslak, başvuru ve program görünürlüğünün rol/kişi bazında süzülmesi
- Koordinatör, Komisyon, Öğrenci İşleri, Bilgi İşlem, Finans ve admin yetki ayrımı

### TYÇ ve AYÇ/EQF

- TYÇ ve AYÇ/EQF için ayrı ayrı 1–8 seviye dizisi
- Her seviye için Bilgi/Beceri/Yetkinlik veya Knowledge/Skills/Responsibility and autonomy alanları
- Her çerçeve için sekiz hazır matris şablonu
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

Önceki kabul sürümünde 9 rol × dört viewport matrisi 36/36 geçmiştir; ekran görüntüleri ve JSON raporu [GitHub Actions kanıt paketinde](https://github.com/gurselveysel/kampusgo/actions/runs/32268491557/artifacts/9371422369) bulunur.

Bu raporda ödeme ve TYÇ/AYÇ matrisleri eklendiği için önceki 36/36 sonucu yeni revizyonun nihai tarayıcı kabulü gibi sunulmaz. Güncellenmiş tarayıcı testi aşağıdakileri kapsayacak şekilde son Preview üzerinde yeniden çalıştırılacaktır:

- Öğrenen ödeme talebi → Finans onayı → mutabakat → pilot kayıt
- TYÇ ve AYÇ/EQF sekme geçişi ile 1–8 seviye seçenekleri
- İç eğitici matris kaydı ve `localStorage` geri yükleme
- Kurum dışı eğitici düzenleme; koordinatör ve Komisyon salt-okunur görünümü
- Dokuz rolün ayrı overview başlığı, görev ve navigasyonu
- Entegrasyon Merkezi'nde 32 iç sistem, bağımsız Tier/MYYS önemi filtreleri, ana-veri sınırı ve beş dış kapı
- 1440, 1024, 768 ve 390 px'te yatay taşma, kırık görsel, modal, toast, odak ve mobil menü
- Public alias üzerinde Vercel giriş duvarı olmadan erişim

Sonuç durumu: **uygulama sonrası doğrulanacak**.

## Supabase canlı doğrulama sonucu

Canlı Supabase migration sürümleri:

- `20260819234334` — [çerçeve, matris, rol ve finans şeması](../supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql)
- `20260819234424` — [çeviri yabancı anahtarı performans indeksi](../supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql)
- `20260820003749` — [DPÜ kurumsal entegrasyon kataloğu](../supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql)
- `20260820003856` — [DPÜ entegrasyon yabancı anahtar performans indeksleri](../supabase/migrations/20260820013000_dpu_institutional_integration_performance_indexes.sql)
- `20260820005626` — [DPÜ kaynak-provenans sertleştirmesi](../supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql)

Doğrulanan güvenlik ve veri sözleşmeleri:

- 18 tabloda RLS + FORCE RLS
- `anon` ve `authenticated` için yalnız `SELECT`
- 14 `security_invoker`/`security_barrier` katalog görünümü
- Çerçeve → tanımlayıcı/çeviri → matris ve taslak satırı yabancı anahtarları
- Ödeme talebi → ödeme olayı zinciri
- `real_payment=false`, `has_financial_identifiers=false`, `real_data_sent=false`
- `automated_ingestion_enabled=false`, `ingestion_status='manual_snapshot_only'`
- Sınırlı kamu üst verisi ile sentetik pilot verinin ayrı politikalarla okunması
- DPÜ iç sistem → eşleme → senaryo → sentetik audit yabancı anahtar zinciri
- Bütün canlı-etki sayaçlarının sıfır olması: gerçek veri etkin/gönderilmiş, canlı istek yapılmış ve production izinli kayıt yok

Canlı sayımlar:

| Veri kümesi | Sayı |
| --- | ---: |
| Çerçeve / seviye tanımlayıcısı / matris şablonu / örnek satır | 2 / 16 / 16 / 8 |
| Mali rota / rol özeti / rol adımı | 4 / 9 / 25 |
| Veri kaynağı / doğrulanmış KDPÜ üst verisi / Türkçe çeviri | 2 / 6 / 8 |
| Matris taslağı / taslak satırı | 2 / 6 |
| Ödeme talebi / ödeme olayı | 1 / 2 |
| DPÜ iç sistem / eşleme / dry-run senaryosu / sentetik audit | 32 / 32 / 32 / 32 |

Security advisor: **0 bulgu**. Performance advisor'ın bildirdiği indekslenmemiş çeviri ve entegrasyon yabancı anahtarları `20260819234424` ile `20260820003856` takip migration'larıyla kapatıldı. Kalan kayıtlar yalnız yeni/boş pilot şemada beklenen unused-index INFO girdileri ve `auth_db_connections_absolute` INFO girdisidir. Sonuç: **PASS**.

## Ana demo senaryoları

1. İç eğitici programı ve TYÇ/AYÇ matrisini taslaklar; koordinatörlük/Komisyon incelemesi, gerekçeli karar, katalog, öğrenen kaydı, değerlendirme ve cüzdan adımları pilot durumda güncellenir.
2. Öğrenen dış kazanım formunu gönderir; deterministik analiz işaretleri, Komisyon görüşü, tanınan kredi ve ÖBİS/YÖKSİS aktarım simülasyonu dış servis çağrısı olmadan izlenir.
3. Öğrenen ücretli programa başvurur; kanal etiketini seçer, Finans demo kuyruğuna aktarır, mali onay/mutabakat sonrası sentetik eğitime kaydolur. Gerçek ödeme veya e-belge oluşmaz.

## Bilinen pilot sınırları

- Supabase referans katmanı salt-okunurdur; kullanıcı mutasyonları izole ve sürümlü `localStorage` alanında kalır.
- Gerçek QR, dijital imza, e-posta/SMS, ödeme, banka/kart verisi, dosya aktarımı veya dış entegrasyon yoktur.
- Matris, seviye ve mali parametreler otomatik karar veya kesin mevzuat kuralı değildir.
- Portal verisinin tamamı kopyalanmaz; doğrulanmamış yeniden kullanım lisansı ve bulk API/export sınırı nedeniyle yalnız sınırlı üst veri tutulur.
- DPÜ entegrasyon kataloğu kaynak izli bir aday tasarımdır; API/SSO/servis sözleşmesi, canlı bağlantı veya veri yazma yetkisi iddia etmez.
- Tam kimlik doğrulamalı sayfa kazıması, kişi verisi alımı ve gerçek kurumsal otomasyon çağrısı yapılmamıştır.
- Bu revizyonun Vercel Preview smoke ve GitHub SHA'sı henüz kesinleşmemiştir; canlı Supabase doğrulaması tamamlanmıştır.
- Production deployment, production branch yayını ve canlı kurumsal bağlantı kesin kapsam dışıdır.

## Production teyidi

Kabul edilebilir hedef yalnız Vercel **Preview** (`target: null`) dağıtımıdır. Production'a terfi, production branch yayını, gerçek veri veya canlı servis çağrısı yapılmayacaktır. Bu revizyonun Preview kimliği ancak deployment ve smoke testi tamamlandıktan sonra rapora eklenmelidir.
