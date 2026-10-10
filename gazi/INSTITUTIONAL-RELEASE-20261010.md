# Gazi MYYS kaynaklı çalışma alanları — 10 Ekim 2026

Mevcut uygulama genişletildi. Canlıya bu çalışma sırasında gelen `37704e15` akademik çekirdeği, korumalı gateway ve kaynak dosyaları birleştirmede aynen korundu.

## Kapsam

- 24 kaynak kaydı; YÖK, YÖKAK, Gazi, TYÇ/AYÇ/TYYÇ, AB, Open Badges, WCAG, KVKK ve UzemGO.
- Altı gerçek Gazi programından 76 kısa, kaynaklı çıktı özeti. Özgün resmî program onayı yerine geçmez.
- TYÇ 8, AYÇ 8 ve TYYÇ 4 seviye özeti. Türkiye Yeterlilikler Veri Tabanının tamamı aktarılmadı. TYÇ/TYYÇ önceki referans paketi korunuyor; yeniden erişim doğrulaması bekleyen kaynaklar açıklamasında belirtiliyor.
- YÖKAK KİDR 3.2.1: 46 alt ölçüt, özgün kanıt önerileri, gerekçeli öz değerlendirme, sorumlu/tarihli iyileştirme ve sonuçla kapanış.
- Mevcut 66 ders için Gazi program çıktısı matrisi; dört ölçütlü ağırlıklı rubrik, iş yükü ve seviye gerekçesi. Taslaklar program çifti bazında ayrı tutulur. Bir satır bir hedef çıktı içerir; bu sürüm çoktan çoğa akademik eşdeğerlik motoru değildir.
- 33 sayfa bağlamında kaynak, süreç ve hazırlık kontrolü; not kaydı ve yerel çalışma geçmişi.
- 11 sunum rolünün farklı menüleri ve başlangıç sayfaları. Sunum rolü sunucu yetkisi vermez.

## Kaynak ve hesap ayrımı

YÖK mikro yeterlilik çerçevesinde 25 saat/AKTS, toplam program kredisinin %10 sınırı ve teklif edilen eğitimlerin en fazla %50'sinin uzaktan olması ayrı kontrol edilir. Uzaktan oranı eğitim adediyle gösterilir; hibrit sınıflandırması kurumca teyit edilmelidir. Gazi 14.05.2026 / 2026-84 yönergesinin Madde 8 kapsamındaki %80 içerik uyumu ile Madde 7/4 hizmet içi 10 kredi sınırı yalnız ilgili başvuru yollarına uygulanır. Hesaplama kurul kararı değildir; özel istisnalar ve iş günü takvimi otomatik hesaplanmaz.

24.07.2026 / 2026-151 kredi transfer yönergesi taranmış PDF olarak bulundu. Yalnız belge/sürüm kaydı eklendi; okunamamış maddeler hesap kuralı olarak kullanılmadı.

## Veri ve koruma

`gazi_knowledge_releases` yalnız kamuya açık kaynak özetlerini içerir. `2026.10.10.3` sürümü SHA-256 `2658e1348083693fa863df2b4158542cb192276cf2b82872f962fe070eee3e64` ile eklendi. RLS açık; anon/authenticated yalnız SELECT alır, INSERT/UPDATE yok. Eski referans ve akademik tablolar değiştirilmedi. REST istemcisi sürümü doğrular; erişim kesilirse paketlenmiş kaynaklara döner ve durumunu gösterir.

Matris/kalite/not kayıtları bu tarayıcıya ait çalışma taslaklarıdır. Kurumsal çok kullanıcılı işlem deposuna aktarılmaz. Önceki kalite ve tanıma kayıtlarına bağlantılar korunur. Akademik çekirdeğin kişi/kurum üyeliği, resmî tanıma ve LMS/OBS/YÖKSİS üretim kapıları açılmadı.

## Doğrulama

- Portal: 35 test (14 yeni kaynak/rol/mevzuat/kalite/matris testi dahil).
- Korumalı gateway, rozet, akademik çekirdek ve LMS kabulü: 45 test.
- Eski model, rol, tanıma ve kaynak akışları: 32 test.
- Toplam 112 test geçti. Üretim derlemesi ve 115 dosyalı korumalı paket oluşturuldu.
- Kaynak REST okuması, satır sayıları, SHA ve SELECT-only yetkileri doğrulandı.
- Supabase güvenlik kontrolünde yeni tablo için bulgu yok. Önceki dört sunucu tablosu RLS/no-policy bilgisiyle kapalı; mevcut Supabase Auth parola koruması uyarısı bu TOTP akışında kullanılmıyor ve ayarı değiştirilmedi. Başvuru: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy ve https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- Oturumlu canlı görsel kabul, güvenli doğrulama kodu gerektiriyor; test sonucu olarak henüz raporlanmadı.

## Geri dönüş

Önceki Vercel dağıtımı `dpl_FJBzrCUuxD93XssE2rmrNGubRDYM` korunur. Arayüz geri alınırsa kaynak sürümü pasif olarak kalabilir; hiçbir kişisel kayıt taşınmadığından veri silme gerekmez.
