# B24 — ölçülebilir metin karşıtlığı

14.10.2026 · Paket60 · yalnız yerel kabul.

Matris, ders rehberleri, akademik sekmeler, durum etiketleri, açıklama metinleri ve ortak menülerde metin renkleri belirginleştirildi. Kullanıcılar aynı işlemleri daha okunur açıklamalarla sürdürebilir. Koyu terminalin yorum metni açıklaştırıldı; örnek belge damgasının anlamı korunarak saydamlık yerine okunur metin rengi kullanıldı. Mevcut arka planlar, sınırlar, yerleşim, geçişler, özgün logolar ve iş akışları korunur. Yeni canlı yayın değildir.

## Ölçüm ve değişiklik

Axe-core4.14.0 `color-contrast` kuralı, gerçek derlenmiş portal ve aynı-origin legacy iframe içeriklerinde çalıştı. 11sunum profili98menü,9çekirdek rol288panel,66ders rehberi ve22modülün sunum/uygulama/kaynak sekmeleri; matris sekmeleri, dosya doğrulayıcı, profil/kapsam penceresi ve mobil menü de kapsandı. Toplam571 frame ölçümü vardır; tekrarlanan uygulama kabuğu her ölçümde yeniden görünür.

İlk koşu22824 tekrarlanan ihlal düğümü ve8825 inceleme bulgusu verdi. Bunlar22824 benzersiz kusur değildir.137 hesaplanmış foreground renk grubunun CSS kaynakları izlendi.8 kaynak dosyada152metin rengi bildirimi ve2semantik muted değişkeni düzeltildi. Açık zemindeki tonlar kendi renk yönünü koruyarak koyulaştırıldı; koyu terminaldeki tek grup açıklaştırıldı. Seçilen renkler gözlenen solid arka planlara karşı4.65:1 iç hedefle hesaplandı; açık zeminler için ek ihtiyatlı #e5eef9 karşılaştırması yapıldı. Bu iç hedef bir standart metni veya tüm gradient'lere ilişkin matematiksel garanti değildir.

İlk düzeltme sonrası1752 kalan ihlal yalnız --ui-muted/--muted değerlerindeydi. Bunlar da düzeltildi. Son aynı kapsam taramasında **0 belirlenmiş violation** vardır; **8809 incomplete inceleme bulgusu açık kalır**. Incomplete, başarısızlığın veya başarının otomatik belirlenemediği durumdur. Bu sonuç bütün metinlerin erişilebilir olduğu veya tüm WCAG1.4.3 ölçütünün kapandığı anlamına gelmez.

| Son inceleme nedeni | Tekrarlanan bulgu |
|---|---:|
| Başka öğe tarafından kısmen örtülme/kırpılma | 4173 |
| Geçişli arka plan | 3482 |
| Metnin çok kısa olması; sayaçlar dahil | 1124 |
| Pseudo öğenin etkisi | 20 |
| Metin dışı karakter içeriği | 6 |
| Başka öğeyi kısmen örtme | 4 |

Kırpılmış yatay sekmelerin görünür hâlleri, kısa rakamların gerçek metin anlamı, gradient metinleri, grafik/ikon/odak ve form sınırları ayrı inceleme ister. Özgün logo istisnası sıradan açıklama metinlerine uygulanmadı. İnaktif öğe istisnası etkin düğmeye veya görevi engelleyen renge genişletilmedi. Sonraki bağımsız dilim bu review sınıflarıdır.

## Doğrulama ve üretim sınırı

106 yeniden koşulan otomatik test (12gateway/envanter48portal46regresyon),19 gezinme ve7reflow kontrolü geçti.928 dar ekran/metin aralığı ölçümünde taşma yok. Son tam784sunucu testi Paket59dur; CSS değişikliğinde tüm sunucu suite'i yeniden koşulmuş gibi gösterilmedi. Mevcut program/içerik/rol sayıları gate testleriyle korundu.8kaynakCSS diff'i normalize edilerek yalnız foreground bildirimi ve iki semantik foreground değişkeninin değiştiği doğrulandı; runtime JS/JSX/iş akışı değişmedi.

Portal ve demo CSS derlendi. Enhancements tam build'i o klasörde esbuild bulunmadığından çalışmadı; yalnız değişen CSS, mevcut Tailwind3.4.17 CLI ile kendi yapılandırması/cwd'sinde üretildi. Yeni bağımlılık eklenmedi. Demo tam build'inin ilgisiz JS çıktısı, yalnız bu koşunun ürettiği değişiklik olduğu doğrulanarak önceki commit bytesına döndürüldü. Mevcut kullanıcı koduna reset/clean uygulanmadı.115 dosyalı korumalı paket hazır.

Öğrenme ve bağlantılar masaüstü görüntüleri, mobil menü/metin aralığı ve dar form/vaka görselleri incelendi. Bu görüntüler bütün grafik karşıtlığı, gerçek ekran okuyucu,200% text zoom, video altyazısı veya PDF/indirme okuma sırası kabulü değildir. B24 kısmi kalır; gerçek canlı rol kabulü de açıktır.

## Araç ve kaynak kaydı

- [WCAG2.2, W3C Recommendation12.12.2024](https://www.w3.org/TR/2024/REC-WCAG22-20241212/),14.10.2026 okuma:1.4.3 normal metin4.5:1, büyük metin3:1; large-scale tanımı18pt veya14ptbold; inaktif/dekoratif/görünmeyen/logo istisnaları.1.4.11 gerekli kontrol/durum ve grafiklerin komşu renkle3:1 sınırı ayrıca okundu; bu otomatik kural1.4.11'in tamamını sınamaz.
- [Deque axe-core API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md),14.10.2026 yaşayan kaynak:runOnly ile yalnız belirtilen kural; passes/violations/incomplete ayrımı. Yerel kurulu axe.d.ts seçilen options ile karşılaştırıldı.
- [axe-core4.14.0 release](https://github.com/dequelabs/axe-core/releases/tag/v4.14.0),5Ekim yayını;14.10.2026 erişildi. Paket npm registry üzerinden exact4.14.0, --ignore-scripts ile yalnız geçici test runtime'ına kuruldu;MPL-2.0. Integrity `sha512-9WTZxEjsZ7b13TH8JPmbV2z8CHbl80/2hm3XPEG4JgNdQLK81IBRXmSxHfMAOkSqQeRxT/0dwNDz2GOm3zzpcQ==`. Production bağımlılığı veya dış hizmet bağlantısı değildir.

`B24-contrast-20261014.json` kapsam/sayıları; `B24-contrast-colors-20261014.json` tam renk eşlemesi; `B24-contrast-review-20261014.json` nedenler ve sınırlı örnekleri kaydeder. Tam yeniden üretim scripts/myys-contrast-browser.cjs ile mümkündür. Yerel baseline/after-literals/result raporları test-results/myys-contrast altındadır; yayın dosyası değildir.
