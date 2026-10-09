# ÜniGO MYYS 1.1 — Saha ve karar verici sürümü

Tarih: 10 Ekim 2026 (Türkiye). Kaynak: `gurselveysel/kampusgo`, `feat/myys-sales-governance-20261010`. Hedef: mevcut `gazi-unigo-myys` Vercel projesi. Dumlupınar uygulaması, veritabanı ve dağıtımı bu sürümün kapsamı dışındadır.

## Kabul edilen davranış

| İhtiyaç | Çalışan davranış | Üretim bağımlılığı |
|---|---|---|
| Rektörlük / kalite | Örnek kayıtlardan kanıt ve yetenek paneli, JSON raporu | Gerçek etki verisi, kurum gösterge eşlemesi |
| Komisyon | İş yükü, kanıt, gerekçeli oy, çoğunluk, çıkar çatışması ve tanıma sınırı kontrolü | SSO, üye atamaları, kurum politikası, e-imza |
| Öğrenci İşleri | Sürümlü oran, önceki AKTS, mükerrer korumalı aktarım provası | OBS sözleşmesi, kimlik eşleme, kabul testi |
| Bilgi İşlem | Hata/tekrar kuyruğu, kabul planı, marka önizlemesi | Sunucu, kimlik doğrulama, güvenli bağlantılar ve işletim |
| Eğitim metni analizi | Dayanak cümleyi gösteren sözcük karşılaştırması | Ölçülmüş semantik/AI modeli ve veri işleme koşulları |
| Belge kontrolü | Dosya izi, örnek zarfın gerçek imza doğrulaması ve tahrifat deneyi | Güvenilen ihraççı, OB3/VC imza profili, iptal/durum servisi |
| Belge yaşam döngüsü | Gerekçeli süre değişikliği ve tarihçe; akademik karar korunur | Kurumsal geçerlilik ve saklama kuralları |
| Saha görüşmesi | Persona taslakları, itiraz yanıtları, yerel fırsat takibi | Ekip CRM’i, yetkilendirilmiş mesajlaşma |
| Satın alma | Dönem, konum, kurum türü, net/gross tutar karşılaştırması | İdarenin usul, ödenek ve onay değerlendirmesi |
| Kongre demosu | Beş adımlı ayrı sentetik senaryo, kanıt paketi | Gerçek ürün performans ölçümü ve kurum onayı |

## Doğrulama

- 20 model testi: eski durumun korunması, kredi sınırının iki kritik noktada uygulanması, geçersiz girdiler, dönem/konum ayrımı, kuyruk deneme sınırı, rol koşulları, imza değişikliği ve akademik kararların korunması.
- Tarayıcı: beş aşamalı demo tamamlandı; tek oyla karar engellendi, üç örnek üyeyle onay, 3 AKTS aktarım provası ve örnek belge üretimi görüldü.
- İmza: özgün zarf doğrulandı; içeriği değiştirilen zarf reddedildi. Her iki durumda da ihraççı güveni doğrulanmamış olarak kaldı.
- Satış: kuruma ve BT personasına göre taslak üretildi, fırsat kaydı Demo aşamasına taşındı.
- Satın alma: 1.000.000 TL net için büyükşehir farkı 21.827 TL; diğer konumda limit aşımı görüldü.
- Kuyruk: yanlış rol engellendi, 503 hatası sonrası ikinci denemede prova tamamlandı, yeniden ekleme engellendi, yenilemede yerel kayıt korundu.
- Mobil: 320 px genişlikte karar paneli taşma kontrolü ve menü kullanımı incelendi. Küçük ekranda başlık/eylem yerleşimi dikeyleştirildi.

Bu kontroller kurumun üretim kullanıcı kabul testi değildir. Tarayıcıdaki değiştirilebilir örnek veriler, demo rol seçimi ve yerel denetim izi bir güvenlik veya yasal uyum kanıtı olarak sunulmaz.

## Kaynaklar

- KİK, 01.02.2026–31.01.2027 limitleri: https://dosyalar.kik.gov.tr/yardim/dokumanlar/2026_Esik_Degerler_Parasal_Limitler_Karsilastirma.pdf
- 1EdTech Open Badges: https://www.1edtech.org/standards/open-badges
- W3C Verifiable Credentials 2.0: https://www.w3.org/TR/vc-data-model-2.0/

KİK limiti fiyatın otomatik satın alınabilir olduğu anlamına gelmez. Mevcut yayımlanmış kaynaklar bu ürünün üniversite tarafından onaylandığını veya tüm standartlara uyumlu olduğunu göstermez.

## Yayın / geri dönüş

Önceki canlı dağıtım: `dpl_HafMxKUJ2p9TqhaK5WNrLJPUaRe5`. Önizleme kontrolü sonrasında test edilmiş dosyalar mevcut projenin üretim ortamına taşınır. Yeni alan adı ya da veri tabanı oluşturulmaz. Geri dönüş önceki Vercel dağıtımına yapılabilir; localStorage uzantı alanları eski uygulama tarafından göz ardı edilir.
