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

- Yerel domain/rol/ödeme/matris kabulü: **22/22 başarılı**.
- Yapı ve production güvenlik doğrulaması: **17/17 başarılı**.
- Canlı Supabase migration sürümleri `20260819234334` + `20260819234424`: **PASS**; 14 FORCE RLS tablo, 10 görünüm, security advisor 0 bulgu. [Performans takip migration'ı](../supabase/migrations/20260820011000_framework_matrix_performance_indexes.sql) indekslenmemiş yabancı anahtar uyarısını kapattı; yalnız beklenen unused-index ve Auth connection strategy INFO girdileri kaldı.
- Yeni revizyonun Vercel Preview ve public alias smoke sonucu: **uygulama sonrası doğrulanacak**.
- Dokuz rol, TYÇ 8 + AYÇ/EQF 8 seviye, ödeme simülasyonu ve mali açıklamalar için ortak public Preview hedefi: <https://kampusgo.uzemgo.com/pilot.html>.
- Tam portal aynası için lisans ve bulk API/export koşulları doğrulanmadığından otomatik alım kapalıdır.
- **Production NO-GO**.
