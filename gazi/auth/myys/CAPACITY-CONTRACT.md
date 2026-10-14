# B32 — İkinci birim kapasitesi ve ilk grubun korunması

Sürüm: 2026.10.14.34. Kapsam: yalnız `LocalAcceptanceStore` ve sentetik yerel kabul. Kurumun kapasite kararı, gerçek ikinci birim açılışı veya üretim yük garantisi değildir. Özgün B32 ölçütü ve B08/B30 bağımlılıkları değiştirilmedi.

## Kullanılabilir işlem zinciri

Akademik çalışma alanı / **Birim kapasitesi** sekmesinde iki birimde yönetici görevi olan kişi, güncel yerel kabulü açık ilk gruba dayanan ikinci birim planı hazırlar. Plan ilk grubun kimliğini, birimini, program/sürümünü, inceleme revizyonunu, üye ve tamamlanmış zincir sayısını sabit özetle bağlar. Hedef birim farklı olmalıdır. İlk grubun kayıtları, kişi hakları, imzalı belge özeti veya program sürümü güncellenmez.

İki birimde kalite görevi ve MFA'sı bulunan ayrı kişi kabul/ret kaydeder. Kabul anında ilk grup hâlâ açık ve aynı özette olmalıdır. İlk grup dayanağı hazırlık ve inceleme anının kaydıdır; sonraki olaylar geçmiş kabulü yeniden yazmaz. Yetkili kalite görevlisi yeni alımı durdurabilir. Yeni sürüm tam önceki kimlik ve değişiklik gerekçesi ister; geçmiş sürümler korunur. Kurumsal ilk kohort kabulü B30 kapsamında ayrıca açıktır.

## Sayım ve sınırlar

| Sınır | Sayılan kaynak | Yerel doğrulama aralığı |
|---|---|---|
| Öğrenen program kaydı | Hedef birimdeki değişmez enrollment kayıtları; etkin kişi sayısı değildir | 1–2000 |
| Bekleyen kaynak olayı | Makbuzu olmayan kabul edilmiş LMS olayları; karantina dahildir | 1–10000 |
| Toplu işlem satırı | Tek yeni batch içindeki satır sayısı; birikimli sayı değildir | 1–100 |

Bu aralıklar yerel girdi denetimidir, onaylanmış kurum kotası değildir. Sürüm sonu açık UTC zamanıdır ve en çok 366 gün olabilir. Yeni sınır mevcut kayıt veya kabul edilmiş olay sayısının altına inemez; incelemede kullanım yeniden kontrol edilir. Önceden kapasite planı olmayan mevcut izole pilot birimler aynı davranışı korur; bu durum gerçek kurumda sınırsız kapasite izni vermez.

En son kapasite sürümü yeni alım için esastır. Yeni taslak, ret, durdurma veya süre sonu yeni program kaydı, normal kaynak olayı ve yeni toplu işi kapatır; eski kabul edilmiş sürüme geri düşülmez. Kontrol ve yeni kayıt aynı yerel işlemde yapılır. Kabul edilen enrollment, lms-event ve batch, `capacityBinding` içinde sürüm/plan özeti/inceleme kimliğini sabitler. Tekrar edilmiş komut veya aynı kaynak olayı ikinci kapasite tüketmez. Eski batch satırı ve kaynak işi işlenebilir; kapasite durdurma öğrencinin kanıtını, kararını veya belgesini otomatik iptal etmez.

Kaynak kimliği/imzası/sözleşmesi/sürümü doğrulanan **lisans iptali** ve **ders kaydı iptali**, normal kuyruk dolu veya kapalı olsa da alınır. Böylece iptal geciktirilerek eski kanıt açık tutulamaz. Bağda `source-safety-closure` muafiyeti kayıtlıdır; bekleyen toplam bu nedenle kotayı aşabilir. Muafiyet kaynak yetkisini, tekrarı veya sürüm denetimini kaldırmaz. Arayüz bu ayrımı açıklar.

## Veri ve görev ayrımı

Hedef birim bilgi işlem görevlisi kendi kullanım/sınır/sürüm/durumunu görür. İlk grup kimliği, kaynak birim, kişi, hazırlayan, dayanak ve özeti bu kişiye verilmez. Tam dayanak yalnız iki birimde yönetici veya iki birimde kalite görevi olan MFA'lı kişiye açılır. Başka kurumun geçerli oturumu dahi ilk grubun kimliğiyle hazırlık/inceleme yapamaz. İkinci birim görevlisi ilk birimin kararıyla belge hazırlayamaz veya ilk birim anahtarıyla imzalayamaz. İkinci birim kendi profili, yetkili kişisi ve ayrı incelenmiş anahtarıyla yerel imza akışını sınar.

## Kabul kanıtı ve gerçeklik sınırı

`tests/myys-capacity.test.mjs`: on bir senaryo; iki SQLite bağlantısı, atomik kota, olay tekrarları/işleme, durdurma, güvenlik iptalleri, satır sınırı, ilk grup revizyonu, MFA/kurum/birim/issuer/rapor ayrımı, imzalı ilk belge özeti ve denetim hatasında geri alma. İki bağlantı gerçek dağıtık yük veya yarış kabulü değildir.

`scripts/myys-capacity-browser.cjs`: gerçek derlenmiş portal ve geçici loopback sunucusunda hazırlık, bağımsız inceleme, kota dolması, eski işin bitmesi, yetkili özet indirme, sürüm artırma, ilk grubun korunması, arama/yenileme, klavye ve 390 px kontrolleri. Gerçek ekran okuyucu kabulü değildir.

B32 genel durumu kısmi: gerçek ilk kohort/B30, ikinci birimin katılım/issuer/yetki/kapasite kararı, üretim kalıcı depo/RLS/dağıtık işçi/yük ve gerçek kurum rapor kabulü açık. Yeni üyelik veya gerçek kurum otomatik oluşturulmaz. Vercel'de çekirdek kapalı; üretim migration'ı, credential veya gerçek öğrenci işlemi yapılmadı.
