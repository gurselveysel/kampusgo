# B24 — ad, tablo, hedef ve odak ilişkileri

14.10.2026 · Paket63 · yalnız izole yerel kabul.

Programlarım ve derslerim, eski bildirimler/başvurular, Paydaş listesi, Program sürümleri, Kaynak merkezi, rozet şablonları, aktarım/OBS/kurumsal hareket tabloları ve görüşme tahtası güncellendi. Kullanıcı görünür düğme sözüyle eşleşen erişilebilir adı kullanır; bildirim okunduğunda sayı ve ad birlikte değişir. Tablo sütunları anlamlı başlık taşır; dar tablolar adlandırılmış bölgeye odaklanarak sağ okla kayar. Program ayrıntıları yerel summary/Enter davranışını korur, hedefleri en az28CSSpxdir.

Profil ve bildirim menüleri Radix modal davranışını korur. Menü açıkken app-shell inert olur; portal DOMda bunun dışındadır. Arka plan odak alamaz; menü kapanınca tetikleyiciye dönülür. Açılan menüyü `modal=false` yaparak kontrol kaldırılmadı. Platform imzası/göstergeler/şablonlar group; aşama şeridi navigation rolü taşır. Rozet şablonunda seçili düğmenin aria-pressed durumu görünür seçimle aynıdır. Öğrenci/akademik yetki veya veri deposu değişmedi.

## Tarama ve sınır

Axe-core4.14.0 WCAG2/2.1/2.2 A-AA etiketlerinden69kural seçildi. `color-contrast` Paket60–62nin ayrı ölçümündedir; hiçbir DOM öğesi dışlanmadı. 11sunum profili98menü,9çekirdek rol288panel,66ders/22modül ve ek sekme/pencere durumları iki genişlikte tarandı:1440ve320CSSpx. Bu gerçek400%tarayıcı zoom veya ekran okuyucu değildir. Her koşu571frame, toplam1142; sayılar benzersiz kusur veya ürün tamamlanma oranı değildir.

Başlangıç masaüstü tam571taramada204yinelenen violation/827incomplete.320baseline568frame sonra betik kapalı yan menüdeki kapsam düğmesine basmaya çalışıp timeout oldu;207violation/822incomplete bu tamamlanmamış kayda aittir. Harness önce mobil menüyü açacak şekilde düzeltildi. Final iki tam571koşuda0violation;8masaüstü/530dar ekran incomplete korunur. Başlangıç ve sonuç JSONları ayrı saklanır.

## İnceleme kayıtları

- `demo-narration` bir paragraftır: mevcut h2nin altında açıklama içerir. Başlık anlamı taşımadığı kaynak/bağlamda incelendi; sırf otomatik uyarıyı kaldırmak için h etiketi verilmedi. İki sunum rolünde yinelenir.
- Radix focus-guard öğeleri görünmez klavye koruyucularıdır. Profil/bildirim menüsünde ve pilot penceresinde bunlara/arka plana gerçek focus denemesi yapıldı; odak1s yerel kontrol sınırı içinde aktif pencereye geri taşındı. Tab/Escape/tetikleyici dönüşü geçti. Ham incomplete yeniden pass yapılmadı.
- Kapalı mobil yan menü, inert/aria-hidden durumunda DOMda tek `primary-navigation` idsi taşır. Tetikleyicinin aria-controls bağı açılan aynı idli dialoga gider; expanded ve odak dönüşü gerçek tıklama/klavyeyle doğrulandı. Araç gizli popup bağını otomatik kesinleştiremediği için dar ekrandaki523tekrar inceleme olarak kalır.

Bu incelemeler gerçek sesli komut veya ekran okuyucu deneyimi yerine geçmez. Dış video/medya altyazısı, indirme/PDF okuma sırası, bütün dinamik hata ve modal durumları, nontext karşıtlığı ve gerçek canlı kabul açık. Önceki8106contrast incomplete bu raporun içine gizlenmedi.

## İşlevsel doğrulama

106otomatik test:12gateway/envanter,48portal,46regresyon.19gezinme+10yeni semantik etkileşim+7reflow=36tarayıcı kontrolü;928geometri ölçümünde0taşma. Etkileşimler görünür öğrenme etiketi/seçim, iki modal menü arka planı/Escape/koruyucu, gerçek okundu işlemi ve sayı adı, iki gerçek klavye yatay kaydırması, summary Enter/hedef/odak, mobil id/expanded ve pilot pencere odağıdır. Bölge odak çerçevesi, kart overflow alanında kırpılmaması için3px içeri alındı; ardından10etkileşim kontrolü yeniden geçti.

Sunucu çalışma kodu değişmedi; son tam784sunucu Paketi59dur, bu dilimde yeniden koşuldu denmez.115dosyalı korumalı paket hazır. React/Tailwind/Lucide/Radix ve logolar korundu. Enhancements esbuild kendi klasöründe bulunmadığından aynı exact React19.2.0/lucide1.54.0/esbuild0.28.2 bağımlılıklarını taşıyan portal node_modules, esbuild nodePaths ile kullanıldı; build.mjsdeki entry/target/minify/format/define seçenekleri aynıdır. Yeni paket/credential kurulmadı, CSS yeniden üretilmesi gerekmeyen enhancement kısmında CSS değişmedi.

## Kaynak ve yeniden üretim

14.10.2026 ilgili bölümler okundu. Aşağıdaki açıklamalar/teknikler bilgilendiricidir; normatif ölçüt WCAG2.2 Recommendation12.12.2024tür.

- [W3C2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html),5Nisan2026güncellemesi: görünür sözün erişilebilir adda bulunması; adın başında kullanma önerisi ve aria-label önceliği.
- [W3C2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):24×24CSSpx veya belirtilen aralık/eşdeğer/inline/kullanıcı aracının belirlemesi/essential istisnaları. Burada hedef büyütüldü; istisna uydurulmadı.
- [W3C H63](https://www.w3.org/WAI/WCAG22/Techniques/html/H63.html),12Ocak2026güncellemesi: scope row/col ilişkisi; basit ilk satır/sütun th ile karmaşık id/headers ayrımı. Boş işlem başlıkları adlandırıldı, basit eski tabloların sütun kapsamı açık yazıldı.
- Axe getRules/runOnly/incomplete API kaynak ve exact4.14.0 integrity kaydı CONTRAST-ACCEPTANCE.md içinde. Bu tarama69kuralı JSONda tam listeler; tüm WCAG ölçütlerinin otomatik test edildiği iddiası yoktur.

`scripts/myys-semantics-browser.cjs`; `MYYS_ACCESSIBILITY_WIDTH=320` dar genişlik, `MYYS_ACCESSIBILITY_BASELINE=1` başlangıç kaydı. `scripts/myys-semantic-interactions.cjs`10yerel davranış kontrolüdür. Kanıt acceptance/B24-semantics-20261014.json. Üretim ayarları ve configuredCore kapalı kalır.
