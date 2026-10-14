# B04/B28 — kaynak envanteri ve kişisel kayıt kapsamı

14 Ekim 2026 · `2026.10.14.40` · izole yerel kabul. Veri talepleri ekranında **Kayıt kapsamım**: sekiz kategori, kendi kayıt sayısı, indirilebilir alan özeti sayısı, görev katkısı, alıcı işlemi, etkin/süresi dolmuş kurum oturumları, filtre ve klavyeyle açılan ayrıntılar. Kurum saklama kabulü ve tam hesap silmesi açık gösterilir. Yeni üretim bağlantısı yoktur.

## Envanterin sınırı

`data-inventory.json`, kodun oluşturduğu 14 teknik tablonun bütün sütun adlarını, kapsamını, amacını ve saklama riskini içerir. Gerçek SQLite şemasıyla birebir kontrol edilir. `privacy-inventory-model.mjs` 120 kayıt türünü sekiz aileye ayırır. Kaynakta literal put/list ile anılan türün kataloğa eklenmemesi testi bozar. Bu denetim tam AST çözümlemesi değildir; dinamik kayıt adları için insan incelemesi de gerekir. Bilinmeyen tür çalışma sırasında otomatik açılmaz: yalnız kişinin kendi kaydı/görev katkısı sayılır ve ayrı inceleme gereği gösterilir.

Bu, kurumun tüm sistem/alan/veri işleyen/ülke/yedek envanteri değildir. `records.data` içindeki bütün olası iş alanları için hukuki değerlendirme veya onaylı süre üretilmez. 14 tabloya süre atanmadı; `approvedRetentionDays:null`. Kurumsal saklama/işleme kabulü, üretim envanteri ve dış hizmetler kapalıdır. 120 tür sayısı tamamlanma yüzdesi değildir.

## Kişisel özet sürüm 2

`myys-subject-export/2`, önceki `records` ve `programs` bölümlerini koruyan, alan izin listelerini sıkılaştıran yeni biçimdir. 58 tür için sahibine/öznesine ait izinli alan özeti tanımlıdır. Destek olayları ve güncel durum, mali prova/iade/mutabakat, belge iptal/değiştirme, tanıma teknik inceleme/itiraz, LMS kayıt/olay, üyelik değişiklikleri ve veri talebi/okuma/indirme geçmişi kapsama alınır. Türün özete alınması bütün alanlarının veya bütün kurumsal verinin verildiği anlamına gelmez.

- Oturumun güncel kişi, tenant, etkin birim üyeliği ve indirmede MFA denetlenir. Gönderilen kişi kimliğiyle seçim yapılamaz. Eski/inaktif birim veya dış kurum kaydı verilmez; bu kayıtlar için resmî başvuru yolu ayrıca gerekir.
- OBS olayının sahibi işlem görevlisidir. Öğrenenin özeti, aynı birimdeki kendi değişmez tanıma talebi → olay → alındı/mutabakat bağından seçilir. Aktarım görevlisi başka öğrenenin kredi verisini kendi özeti adıyla alamaz. Dış anahtar/payload özeti verilmez.
- Portfolyo alıcısı kendi yazdığı erişim teyidi ve mesajı, izin geri çekilse de sınırlı alanlarla indirir. Öğrenen/izin/kanıt/belge kimliği, kanıt içeriği, puan veya imzalı belirteç yeniden açılmaz. Öğrenen kendi portfolyo geçmişini alır. Alıcıya ait geçmişin hukuki saklama süresi bu teknik seçimle belirlenmiş sayılmaz.
- Görevli katkısı yalnız tür ailesinde sayıdır; başka kişinin veya toplu işlemin içeriği aktarılmaz. Katkı ve alıcı sayıları örtüşebilir; bunlar toplanarak tekil kişi/kayıt toplamı hesaplanmaz.
- Pozitif alan şeması iç içe nesne/diziler için de uygulanır. Bilinmeyen alan ve nesneyi skaler alan içine koyma kapalıdır. JWT, oturum/paylaşım sırrı ve ham güvenlik kayıtları verilmez. Kullanıcının yazdığı serbest metinde başka kişinin adı bulunabileceği için anlamsal anonimleştirme iddiası yoktur.
- Kurum oturumları birimlere ayrılamadığı için yalnız kişinin aynı tenant kapsamındaki etkin/süresi dolmuş sayıları gösterilir. Ham hash, subject, sid, issuer, challenge veya denetim satırı verilmez. Yeni indirme izi sonraki yenilemede sayılır. Dışa aktarım/audit tek transaction'dır.

## Saklama ve güvenlik ayrımı

Mevcut sınırlı `privacy-cleanup` davranışı değişmedi: yalnız kapsamı kanıtlı süresi dolmuş bindings ve bağlı FK satırları; akademik kayıt veya kişi hesabı silinmez. Canlı oturum, diğer kişi/tenant ve kapsamsız kayıt korunur. Fiziksel/yedek imhası doğrulanmış değildir.

Oturum ailesi bağlantısı, süresi bitmiş ebeveynin yaşayan alt oturumunu iptal etmek için gerekebilir. Çıkış makbuzu, belirteç süresi dolduktan sonra da gecikmiş callback'i engelleyebilir. Anahtar epoch/history önceki anahtarın tekrarını engeller. Bunları yalnız expires alanına göre silmek güvenliği bozabilir. Komut sonuçları kişisel kayıt kopyaları barındırır; idempotency süresi ve yeniden oynatma davranışı ayrı kabul edilmelidir. Sonraki bağımsız iş: kullanılmayan hesap kayıtlarının sahiplik ve güvenlik bağını kanıtlayan sınırlı temizleme/geri yükleme sözleşmesi; hiçbir güvenlik bariyeri otomatik gereksiz sayılmayacak.

## Resmî kaynak kaydı

14.10.2026 tarihinde [KVKK Başvuru Hakkı](https://www.kvkk.gov.tr/Icerik/2062/Basvuru-Hakki) sayfasının haklar, başvuru muhatabı ve şekil bölümleri tekrar okundu. Kişisel özet indirmesi resmî başvurunun veya gerekçeli resmî yanıtın yerine geçirilmedi. Tebliğin bütün metni bu dilimde okunmuş sayılmaz.

Aynı tarihte [KVKK silme, yok etme ve anonimleştirme](https://www.kvkk.gov.tr/Icerik/2038/kisisel-verilerin-silinmesi-yok-edilmesi-veya-anonim-hale-getirilmesi) kamu sayfasının sebeplerin sona ermesi, yükümlülük ve üç yöntemin tanımı bölümleri okundu. Mantıksal satır temizliği, fiziksel imha ve anonimleştirme birbirine eşitlenmedi. Bu kaynaklar Gazi'nin belirli verisi için dayanak/süre veya yetkili kişi atamaz. Önceki PRIVACY/RETENTION sözleşmeleri ve kaynak sürümü korunur.

## Kabul

9 yeni test: 14 gerçek tablo/sütun ve 120 tür envanteri, destek/mali prova, talebe bağlı OBS, geri çekme sonrası alıcı ayrımı, iç içe alan reddi, bilinmeyen tür, kişi/birim/tenant sınırı, oturum sayacı/temizlik ve imzalı belge sırrının dışlanması. 549 sunucu +48 portal +46 regresyon =643 otomatik test. 9 yeni kapsam +11 veri talebi +13 itiraz +19 gezinme =52 tarayıcı kontrolü geçti; 390 px görüntü incelendi. 98 menü, 279 akademik panel ve 66 ders korunuyor. 111 komut/16 HTTP kapsam matrisinde 5174 olumlu örnekten 41392 negatif kontrol; 115 statik dosya korumalı paketlendi.

B28'in yerel envanter/özne özeti dilimi geçti; tam gereksiz hesap verisi temizliği, resmî bildirim, üretim silme/yeniden saklama, yedek imhası ve dış hesap kapanışı kabulü açık. B04 kurum dayanak/süre/ülke/alıcı kabulü açık. Yeni canlı yayın yok; B01–B36 tamamlanmadı.

## Paket41 izleme — 14.10.2026

Yukarıdaki 120/58 sayıları Paket40 tarihsel kanıtıdır. İki yeni veri hakkı türüyle güncel katalog 122 tür/60 izinli alan özeti; teknik tablo sayısı14. `identity_challenges` için ayrı ve sınırlı used/expired sahipli temizlik sözleşmesi eklendi; ham güvenlik exportu/kurum süresi veya diğer bariyerlerin silinmesi açılmadı.
