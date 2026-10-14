# Veri talebi ve saklama ayrımı — 2026-10-10

B04/B28'in izole yerel kabul dilimi. Kurum saklama kararı veya resmî başvuru hizmeti değildir. `configuredCore()` Vercel'de kapalıdır. Sentetik kayıtlar dışında işlem yapılmadı.

## Kaynak kaydı

| Kaynak | Sürüm / okuma | Kapsam ve kullanılan hüküm |
|---|---|---|
| [KVKK başvuru hakkı](https://www.kvkk.gov.tr/Icerik/2062/Basvuru-Hakki) | Kamu sayfası, 10.10.2026 okundu | Bilgi, erişim, düzeltme, silme/yok etme ve itiraz hakları; geçerli başvurunun veri sorumlusuna yapılması. Yerel taslak resmî başvuru sayılmaz. |
| [KVKK silme, yok etme veya anonimleştirme](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi) | Kamu sayfası, 10.10.2026 okundu | İşleme sebeplerinin ortadan kalkması ve yöntemlerin ayrımı. Mantıksal iptal, özet alma veya SQLite satır temizliği fiziksel yok etme/anonimleştirme kanıtı değildir. |
| [KVKK yanıt bildirim usulü duyurusu](https://www.kvkk.gov.tr/Icerik/9024/ilgili-kisilerin-basvurularina-verilecek-cevabin-bildirim-usulune-iliskin-kamuoyu-duyurusu) | Haber dizini 01.10.2026; metin 10.10.2026 okundu | Gerekçeli yazılı/elektronik yanıt ve bildirimin kanıtı. Sözlü açıklama nihai yanıt yerine geçmez. Kanun 13'teki en geç 30 gün, kabul zamanı olmayan yerel taslaktan başlatılmadı. |
| [Tebliğ yayımlanma duyurusu](https://www.kvkk.gov.tr/Icerik/4109/Veri-Sorumlusuna-Basvuru-Usul-ve-Esaslari-Hakkinda-Teblig-Resmi-Gazetede-yayinlanmistir) | Duyuru okundu; [Resmî Gazete bağlantısı](https://www.resmigazete.gov.tr/eskiler/2018/03/20180310-6.htm) zaman aşımı | Tebliğin tamamının okunduğu veya başvuru kanalının kabul edildiği iddia edilmez. |

Bu kaynaklar genel veri hakları kapsamındadır. Gazi'ye özgü akademik saklama süresi, aktarım ülkesi veya kurum yetkilisi belirlemez. Kamu kaynak sürümü 2026.10.10.3 ve önceki 24 kaynak kaydı korunur.

## İşlem sözleşmesi

- Talep kişi/kurum/birim kapsamlı, sürümü değişmez; tür, kategori ve açıklama zorunludur. Yönetici yalnız aynı birimdeki talepleri MFA ile inceler; kendi talebine yanıt veremez. Yönetici rolü hukuki atama yerine geçmez.
- Yanıt önceki sürüme bağlanır; gerekçe, işlem dayanağı, akademik saklama ayrımı ve sonraki inceleme tarihi zorunludur. Tarih kurumun hukuki saklama süresi değildir. Resmî kabul, resmî bildirim ve tam yerine getirme bayrakları açılmaz.
- Görüntülendi kaydı yerel portal okuma teyididir; tebligat kanıtı sayılmaz.
- Kişisel JSON indirmesi yalnız sahibin izinli alan özetlerini içerir. Paylaşım/oturum anahtarı, JWT veya diğer kişinin verisi verilmez. İndirme MFA ve atomik denetim kaydı gerektirir.
- Paylaşımı geri çekme mevcut cüzdanın aynı paylaşım kayıtlarını iptal eder. Önceden indirilmiş kopya, akademik veri veya dış hesap değişmez.
- Temizlik yalnız güncel yanıt sahibi tarafından MFA ile, `LocalAcceptanceStore` ve Vercel kapalı koşulunda uygulanır. Yalnız aynı kişiye/kuruma bağlı, süresi dolmuş `bindings` satırları ve FK bağlı `identity_scopes` temizlenir. Canlı oturum, diğer kurum/kişi, kapsamı bulunmayan eski oturum, kişi kimliği ve akademik kanıt korunur. Silme ve denetim tek transaction'dır; denetim hatası tümünü geri alır. Fiziksel imha kanıtı yoktur.
- Dış platform kapanışı kaynak kayıt/durum hizmetinin erişimini etkileyebilir. Bağımsız doğrulama ve saklanan belgenin etkisi sağlayıcı bazında kabul edilmelidir. MYYS talebi dış hesabı kapatmaz veya belgeyi otomatik iptal etmez.

## Açık kabul

B04 ülke/süre doğrulamalı sicil ve politika kaynaklı saklama işçisi; B28 gereksiz hesap verisinin tam envanteri, hukuki dayanak/süreyle akademik arşiv, fiziksel imha ve yedeklerde saklama, geçerli başvuru/bildirim adaptörleri, dış platform kapanış kabulü açık. Üretim silmesi, migration veya yeni erişim yapılmadı. UI/test bu eksiklerin kapandığı anlamına gelmez.

## Paket40 izleme — 14.10.2026

`DATA-INVENTORY-CONTRACT.md`: 14 teknik tablo ve 120 kayıt türü kaynak envanteri, 58 türde kişisel izinli alan özeti ve sekiz kategorili Veri talepleri görünümü eklendi. Önceki test sayıları tarihsel kanıttır. Sınırlı oturum temizliği korunur; tam hesap silmesi, hukuki saklama ve üretim/yedek kabulü açık kalır.
