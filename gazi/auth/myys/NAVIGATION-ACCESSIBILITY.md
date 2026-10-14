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
