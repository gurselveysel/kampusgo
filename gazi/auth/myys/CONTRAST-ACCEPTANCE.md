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

## Paket61 — sayaç ve kısa metinler

14.10.2026; yalnız yerel kabul. Bildirim sayaçları, sunum sayfa numaraları, Kaynak ve Mevzuat Merkezi döngü adımları ve eski demo adımları daha belirgin oldu. Beş CSS değeri dışında ürün kodu değişmedi; iki kırmızı sayaç zemini ve üç sayı metni tonu koyulaştı. Logolar, yerleşim ve işlevler korunur.

Axe4.14.0 varsayılanı başarısız tek karakteri `shortTextContent` olarak belirsiz bırakır. Kaynak kodu ve kamu API'si okundu; `ignoreLength:true` tek karakteri denetimden çıkarmak değil bu belirsizlik kestirmesini kaldırmaktır. Kuralın gömülü seçenekleri check-only ayarını bastırdığı için check-only deneme karşı örnekte başarısız oldu ve kullanılmadı. Son profil aynı `color-contrast` checkini documented `rules.any` listesinde adla tutar; bütün4.14.0 seçenekleri check configuration'a aynen aktarılır, yalnız ignoreLength değişir. Değerlendirme işlevi,4.5/3 eşikleri,18pt/14ptbold ayrımı, pseudo ve Unicode davranışı değiştirilmez.

Her koşunun başında bağımsız gerçek Chromium sayfasında8 kontrol yapılır: düşük karşıtlıklı tek rakam eski profilde incomplete/yeni profilde violation; normal düşük metin iki profilde violation; yüksek karşıtlıklı rakam ve uygun büyük metin iki profilde pass; gradient iki profilde incomplete. Normal ve büyük metin eşikleri ayrıca doğrulanır. Bu profili geçemeyen koşu ürün taramasına başlamaz.

571 frame taraması önce703 yinelenen ihlal, düzeltmeden sonra0 verdi. 518yeni bildirim,45eski bildirim,110sunum sayfası,20döngü adımı,10demo adımı görünümü; bunlar703 benzersiz kusur değildir. Yeni beş çift beyaza karşı en az4.70:1 hesaplandı; tam değerler kabul JSON'undadır.

Kalan8106 inceleme bulgusu:3903gradient,4173kısmen örtülme,20pseudo,6nonBmp,4kısmen örtme. Önceki1124shortTextContent'ın703'ü belirlenmiş ihlale dönüştü ve düzeldi;421'i asıl gradient belirsizliğine taşındı.421bulgu geçmiş sayılmadı.

106otomatik ve19gezinme kontrolü geçti; 8profil kontrolü ayrıca kaydedildi. Son tam784sunucu testi Paket59; yeniden akış Paketi60ın928ölçümüdür, bu dilimde yeniden koşulmuş gibi sunulmaz. Sunum ve mobil bağlantı ekranları görsel incelendi.115dosyalı korumalı paket hazır. Tam B24, gerçek AT, zoom, nontext, medya/belge ve canlı kabulü açık.

Yeniden üretim: `scripts/myys-contrast-browser.cjs` artık varsayılan olarak tek karakter profilini kullanır. Eski ölçüm karşılaştırması için `MYYS_CONTRAST_SINGLE_CHAR=0`; değişiklik öncesi kayıt için `MYYS_CONTRAST_BASELINE=1`. Axe exact4.14.0/integrity önceki araç kaydıyla aynıdır. `single-char-result.json` ve `single-char-baseline.json` ayrı tutulur; Paket60ın raporları korunur. Kamu kaynak [Deque API axe.configure](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md),14.10.2026: checks.options, rules.any ve her frame için ayrı yapılandırma bölümleri okundu. Kurulu4.14.0 axe.js ve axe.d.ts ile karşılaştırıldı.

## Paket62 — gerçek render üzerinde geçişli zemin örnekleri

14.10.2026; yalnız yerel kabul. Öğrenme akışı, ders tanıtımı, sunum etiketi/açıklaması ve kaynak dipnotlarının7 metin rengi düzeldi. Koyu Kaynak ve Mevzuat Merkezi/rozet başlıklarında ortak `.unigo-ui :is(...)` kuralının yüksek seçici önceliği özgün açık rengi bastırıyordu;2dar kapsamlı renk kuralı bu önceliği düzeltti. Arka plan, ölçü, yerleşim, geçiş ve logo değiştirilmedi.

Axe hâlâ gradient'i incomplete bildirir. Ayrı ölçüm, tarayıcının gerçek8bitPNG görüntüsündeki arka planı kullanır. Doğrudan metin satırlarının dikdörtgenleri bir piksel dışa yuvarlanır; her pikselin sRGB luminansı ve ön planın alfa bileşimi hesaplanır. En düşük oran saklanır. Normal/büyük metin4.5/3 sınırlarına yerel yakalama için0.15iç marj eklenir; bu ek marj WCAG hükmü değildir. Aynı renk/stil/arka plan geometrisi ve HTML imzası tekrarında yalnız ilk örnek ölçülür; diğerleri `not-sampled-repeat` referansıdır ve ayrı pass değildir.

Arka plan görüntüsünü elde etmek için yalnız ölçüm sırasında `-webkit-text-fill-color:transparent` uygulanır; `color`/currentColor/sınır/zemin/yerleşim korunur. Asıl axe kontrolü bundan önce özgün DOM'da yapılır. Sonra tam inline style ve bütün üst kaydırma konumları, iframe üst sayfası dahil, geri yüklenir ve doğrulanır. Ürün CSS'sine şeffaf metin eklenmez. Bu yöntem öğe gizleyerek axe kabulünü yükseltmez; axe incomplete sonuçları aynen kalır.

Tam görünmeyen, noktalarla örtüşme kontrolünü geçmeyen, saydam üst katmanı/dönüşümü/filtre-karışımı olan, pseudo içeriği veya metin gölgesi/stroke taşıyan, resmi/animasyonu bulunan ya da desteklenmeyen renk kullanan öğe `review` kalır. Bu konservatif örnek ölçümü tam glyph/örtüşme kanıtı değildir: dokuz nokta kontrolü her olası katmanı ispatlamaz. Gerçek cihaz, renk profili, farklı görünüm/etkileşim, ekran okuyucu ve bütün metinlerin kabulü türetilmez.

Bağımsız16kontrol:21:1siyah-beyaz hesabı; alfa bileşimi; eşik altı gri; gerçek gradientte uygun/düşük/alfa metin; opacity/gölge/pseudo/örtü reddi; inline style/null/currentColor/scroll geri dönüşü; ekran dışı metni görünür kılıp kaydırmayı geri alma. Kullanılan PNG ayrıştırıcı mevcut test runtime'ındaki pngjs7.0.0dır; uygulamaya bağımlılık eklenmez.

571axe taramasındaki3903gradient görünümünden88ayrı ölçüm imzası örneklendi;3815tekrar ayrıca ölçülmedi. Başlangıçta10örnek iç hedef altındaydı;9u4.5/3sayısal eşiğinin de altındaydı, biri4.648:1ile yalnız iç marj altındaydı. Düzeltme sonrası85örnek bu renderda yeterli,3örnek review: masaüstü giriş başlığındaki em metni örtüşme kontrolü; mobil menüde iki pilot metni transform kontrolü. Bu3örnek geçmedi; ilk75örneğin zaten hedefi geçtiği de saklanır.

Axe toplam0violation/8106incomplete olarak kalır; bu8106bulgu silinmedi veya topluca kapatılmadı.106otomatik ve19gezinme yeniden geçti;8kısa metin/16gradient kontrolü ayrı kaydedildi.115statik paket hazır. Kaynak merkezi ve ders sunumu görüntüleri incelendi. Son tam784sunucu Paketi59; tüm sunucu yeniden koşulmadı.

Kaynak: [W3C G18](https://www.w3.org/WAI/WCAG22/Techniques/general/G18.html),6Eylül2026güncellemesi,14Ekim2026okundu; değişen zemin üzerinde harf arkasının ölçümü, sRGB/0.04045luminans ve oran hesabı. G18 bilgilendirici yeterli teknik örneğidir; tek zorunlu yöntem veya sertifikasyon değildir. WCAG2.2 Recommendation12.12.2024 ve1.4.3ölçütü esas kalır.

Yeniden üretim: `MYYS_CONTRAST_GRADIENT=1` ile aynı `myys-contrast-browser.cjs`; başlangıç için ayrıca `MYYS_CONTRAST_BASELINE=1`. Son rapor `test-results/myys-contrast/gradient-result.json`; kalıcı örnek/kanıt `acceptance/B24-gradient-20261014.json`. Varsayılan kısa metin koşusu PNG yardımcılarını yüklemez.
