# UniGO MYYS ortak arayüz

Üniversiteye özel alanlarda Gazi Üniversitesi amblemi ve adı sol üstte birincil kimliktir. ÜniGO logosu, MYYS ve sürüm bilgisi sol altta ikincil platform imzasıdır. Ana panel ve demo aynı `institution.jsx` bileşenlerini kullanır; mobil üst çubukta üniversite amblemi görünür kalır.

Ana panel, öğrenci ekranları ve kurumsal demo aynı kurumsal görsel dilini kullanır.

- `portal/src/style.css` → `portal.css`: React çalışma alanlarının ortak bileşen ve yerleşim dosyası. Ana panel ve demo **aynı dosyayı** yükler.
- `demo-app/src/style.css` → `demo/portal.css`: yalnız maliyet, uyum, karşılama ve pilot formu gibi demoya özgü bileşenler. Genel menü, tablo, kart veya tipografi kuralları burada tekrar tanımlanmaz.
- `ui-theme.css`: ortak renkler, tipografi, kartlar, durumlar, kontroller; öğrenci ve mevcut modüller için uyarlamalar. Üç HTML girişi de bu dosyayı en son yükler.
- `learning.css`, `styles.css`, `workspace.css`, `enhanced.css`: işlevlere özgü yerleşimler. Ortak tema bunların görsel bileşenlerini eşler; iş akışlarını değiştirmez.

## Görsel kararlar

Açık renkli sabit sol menü, lacivert içerik başlıkları, mavi seçili menü ve birincil düğmeler; beyaz kartlar, soluk gri kenarlar, hafif gölgeler. Orijinal ÜniGO ve Gazi görselleri kullanılır. Ana başlık 25 px; mobilde 24 px. Kart köşeleri 11 px, kontrol köşeleri 7 px. Başarı/uyarı/hata renkleri bütün ekranlarda aynı anlamı taşır.

## Değişiklik sınırı

Kayıt anahtarları, öğrencinin dersleri/ilerlemesi, rol denetimi, API adresleri, YÖKSİS provaları ve form davranışları korunur. Demo ayrı kayıt alanını kullanmaya devam eder. Görsel tutarlılık, veri alanlarının birleştirilmesini gerektirmez.
