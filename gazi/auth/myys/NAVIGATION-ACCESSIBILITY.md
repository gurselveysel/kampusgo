# Gezinme, odak ve yerel tarama

14 Ekim 2026 · B01/B24 · Yazılım Paketi31 kaynak dilimi; canlıda henüz yok.

## Kullanıcıya görünen değişiklik

- Mobil ana menü açılınca odak menüye geçer; arka alan ve kapalı menü etkileşime kapatılır. Tab/Shift+Tab menü içinde döner. Escape/kapatma düğmesi odağı açan düğmeye döndürür. Masaüstüne geçiş eski kilidi kaldırır. Menü aramasının boş sonucu açıklanır.
- Sayfa seçimi, geçiş tamamlanınca adlandırılmış ana içeriği odaklar. Aynı sayfa yeniden seçildiğinde de odak gizli menüde kalmaz.
- Ortak Radix pencereleri, görünür ve etkin açıcıya döner; açıcı kaybolmuş/gizlenmişse mobil menü düğmesi veya ana içerik kullanılır. Menüden açılan kapsam penceresi tek modal olur. Çalışma alanı penceresinden rota seçimi yeni ana içeriğe gider.
- Kaynak merkezi, matris ve eski rozet laboratuvarı sekmeleri ok/Home/End tuşları, tek Tab durağı ve adlandırılmış panel ile çalışır. Akademik panel de klavyeyle odaklanabilir. Ders materyali sekmelerinin mevcut davranışı korunur.
- Kalite ve paydaş kategori seçimi, sekme yerine seçili durumu açıklanan filtre düğmeleridir. Öğrenci katalog görünümündeki yetkisiz program öneri düğmesi kaldırılır. Bunlar sunum davranışıdır; sunucu yetkisi vermez.

## Testin neyi ölçtüğü

`scripts/myys-navigation-browser.cjs` gerçek derlenmiş React uygulamasını izole loopback HTTP sunucusunda açar. Yalnız sentetik aktör/SQLite ve yeni geçici tarayıcı profili kullanır. Dış ağ istekleri kapalıdır; canlı koruma kaldırılmaz. Eski ekranların modülleri ve kamu kaynak özeti de yerel sunucudan sunulur. Ana çerçeve metniyle yetinilmez: iframe içindeki ana başlık ve içerik beklenir. Eski katalogdan dört örnek program normal düğmelerle plana eklenir; P01/P06 başlangıç planı korunur.

İlk kaba tarama yalnız iframe kabuğunu denetlediği için yeterli kabul sayılmadı. Son tarama gerçek içeriği bekler. İlk test denemelerindeki zamanlama/başlık seçicileri ve indirme içerik varsayımı düzeltildi; başarılı son koşu ayrı kaydedilir. HTML/CSV indirmesi sunucudaki dosya ile içerik düzeyinde eşleştirilir. Başka kaynaktan indirilen aynı adlı dosya kabul edilmez.

Mevcut gateway testleri 66 sunum +22 vaka dosyasının oturumsuz reddini ve sentetik oturumla indirilmesini gerçek handler üzerinden denetler. Yeni envanter testi korunacak sayıları güncel modüllerden çıkarır; eski test sayıları kabul yerine kullanılmaz. Sonuçlar `acceptance/B01-B24-navigation-20261014.json` içindedir. 98 menü hedefi ve 234 rol-panel açılışı ayrı test/özellik yüzdesi değildir.

## Kaynak kaydı

| Kaynak | Sürüm / okunan kapsam | Bu değişiklikteki kullanım |
|---|---|---|
| [W3C APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 14.10.2026 erişimi; Keyboard Interaction ve WAI-ARIA Roles, States, and Properties | Modal içinde odak, Escape, geri dönüş, ad ve arka alanın kapatılması. Rehber örüntüdür; kurum yönetmeliği değildir. |
| [W3C APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) | 14.10.2026 erişimi; Keyboard Interaction, roller/ilişkiler | Yerel ve gecikmesiz sekme seçimi, ok/Home/End, tek Tab durağı, panel bağı. |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 14.10.2026 erişimi; 1.2.2, 2.4.1–3, 2.4.7, 2.4.11 | Altyazı ve odak incelemesi için kapsam kaydı. Bütün standart veya tüm ürün uygunluğu beyan edilmez. |

## Açık kalan kabul

Tarayıcı otomasyonu; gerçek NVDA/JAWS/VoiceOver/TalkBack okuma deneyimi değildir. Bütün modal/form hataları, 200/400% büyütme, yüksek karşıtlık, belge çıktısı okuma sırası, bütün üçüncü taraf videoların Türkçe altyazı/döküm doğruluğu ve canlı oturum akışları tamamlanmış sayılmaz. Medya sağlayıcıları bu koşuda dış ağ kapalı olduğundan oynatılmadı. B24’ün “kritik engel sıfır” koşulu bütün ürün için kapanmadı. B01 kaynak/rota/regresyon eşlemesi yerelde hazır; özgün 27 yetenek kabulü ve dış servisler ayrıca izlenir.

`configuredCore()` Vercel’de kapalı kalır. Son canlı Paketi16; 17–31 dağıtılmadı. BrowserAuth iptalinden sonra yeni giriş veya alternatif kimlik yolu denenmedi. Üniversite adına onay, atama veya belge üretilmedi.

## Paket56 — Türkçe dosya alanı ve güncel sonuç bağı

14 Ekim 2026. Tanıma ve kredi (talep ve arşive teslim), Politika ve hak sicili / Yetki dosyaları ve pilot rozet / Dosya doğrula güncellendi. Native file input form/required/klavye davranışı korunur; Türkçe görünen yüzey, seçili ad duyurusu, açıklama bağı, odak ve küçük ekran satırlaması eklenir. Yetki eki okuma/kayıt sırasında alanlar kilitlenir; native FormData gerçek dosya baytlarını taşır. Kayıt ardından seçim temizlenir.

Dosya doğrulayıcıda her seçim/metin/sekme değişimi önceki okuma veya doğrulama sonucunu geçersiz kılar. Dosya okumak doğrulama sayılmaz. Tanıma talebindeki boş/büyük seçim eski SHA sonucunu kullanamaz; bekleme durumu takılı kalmaz.

40 yerel tarayıcı kontrolü:14 kontrollü dosya UI,14 gerçek yerel yetki HTTP,12 gerçek yerel tanıma teslimi HTTP. Rozet yanıtları ve okuma zamanlaması yalnız UI yarışını sınamak için kontrollüdür; kriptografik veya canlı kabul değildir. İlk denemede Chromium native dosya seçicisi Enter ile açılmadı; native Boşluk tuşuyla açılış doğrulandı, özel klavye emülasyonu eklenmedi. 390px ve forced-colors görüntüleri incelendi. `test-results/myys-file-input` geçici görsel çıktıdır; kalıcı özet `acceptance/B24-file-input-20261014.json` içindedir.

Kaynaklar14.10.2026 yeniden okundu: [WCAG2.2 /12.12.2024 Recommendation](https://www.w3.org/TR/2024/REC-WCAG22-20241212/) 3.3.1–3.3.3 ve4.1.2–4.1.3; görünür hata/etiket ve programatik ad/durum ilişkisinin dayanağı. [WHATWG HTML Living Standard](https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)) §4.10.5.1.17, reset ve value/files IDL; seçili dosya/required korunur, accept ipucudur ve sunucu denetiminin yerine geçmez. Standartların tümüne uygunluk beyanı yapılmaz.

Genel büyütme/yeniden akış, gerçek AT, altyazı ve erişilebilir çıktı kabulü açıktır. Son canlı16;17–56 dağıtılmadı; canlı giriş denemesi yenilenmedi.

## Paket57 — yeniden akış ve metin aralığı

14 Ekim2026. Matris program seçimleri, müfredat başlık düğmeleri, bağlantı kartları, eski ekranların rol/alım formu ve22 vaka tablosu düzeltildi. Seçimlerin doğal genişliği sayfayı büyütmez; düğmeler ve hücre metinleri satıra geçer. Yatay sayfa taşması overflow-hidden eklenerek gizlenmedi; mevcut iki boyutlu veri tabloları kendi kaydırma alanında kalır.

`scripts/myys-reflow-browser.cjs`:11 sunum profili98 menü,9 çekirdek rol288 panel,22 vaka; gerçek iframe içeriği dahil320 CSS px normal/metin aralığı928 geometri ölçümü. İlk taramada68 sorunlu ölçüm (tekrarlanan ortak kusurlar), ek ders kontrolünde1 vaka taşması görüldü; son koşuda0. Boş panel kabuğuna bakmakla yetinilmez. Matris program seçimi/gerçek JSON indirmesi, ders öz değerlendirmesi, mobil menü/pencere/profil kontrolü yapıldı. Bunlar sentetik çalışma taslaklarıdır.66 tarayıcı kontrolü toplamı7 yeniden akış +19 gezinme +14 dosya UI +14 yetki HTTP +12 tanıma teslimi HTTPdir.

[WCAG2.2 /12.12.2024](https://www.w3.org/TR/2024/REC-WCAG22-20241212/) §1.4.10 ve1.4.12, not/istisnalarıyla14.10.2026 okundu. Test320 CSS px kullanır; gerçek tarayıcı yakınlaştırması veya AT koşusu değildir. Metin aralığı yalnız dört özellik değiştirilerek artırılır: satır1.5, paragraf sonrası2em, harf.12em, sözcük.16em. Ekran okuyucu,200% metin büyütme, karşıtlık, altyazı ve belge çıktısı kabulü açık. Geometri denetimi tek başına uygunluk belgesi değildir.

106 otomatik test yeniden çalıştı:12 gateway/envanter,48 portal,46 regresyon. Son tam733 sunucu koşusu Paketi56dır; sunucu kodu değişmedi. İlk seçili gateway denemesi depo kökünde yapıldığı için göreli statik dosya yolu ENOENT verdi; doğru `gazi/auth` çalışma dizinindeki12/12 tekrar geçti, kapı davranışı değiştirilmedi.115 dosyalı korumalı paketleme başarılı. Son canlı16;17–57 dağıtılmadı.
