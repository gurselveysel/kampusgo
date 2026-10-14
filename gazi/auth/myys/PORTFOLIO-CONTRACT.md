# B34 — Amaçla sınırlı portfolyo izni ve ayrı geri bildirim

Sürüm 2026.10.14.36. Yalnız izole yerel kabul; gerçek işveren kimliği, işe alım değerlendirmesi veya kurumsal veri aktarımı değildir. B34'ün özgün kabul ölçütü, B18/B33 bağımlılıkları ve dokuz çekirdek rol korunur.

## Kullanılabilir zincir

**Amaçlı portfolyo** sekmesi mevcut kişi, program kaydı, B18 yerel imzalı belge, B33 incelenmiş beceri ilişkileri ve aynı kararın çalışma kanıtlarını kullanır. Bağımsız örnek öğrenci deposu oluşturulmaz. Yönetici alıcı/amaç koşulunu hazırlar; ayrı kalite görevlisi inceler. Öğrenen paylaşılacak becerileri ve varsa çalışma metinlerini tek tek seçip açık alıcı/amaç/son tarih için izin verir. Varsayılan içerik seçimleri boştur.

Alıcı ilk aşamada yalnız amaç ve süreli izin durumunu görür; öğrenen kimliği ve içerik verilmez. Alıcı tam amaç ve yeniden kullanım sınırını teyit ettiğinde içerik açılır. Alıcı yalnız güçlü yön/gelişim önerisi/soru türünde açıklama kaydedebilir. Bu geri bildirim puan, başarı veya ret kararı yazmaz. Öğrenen aynı izin kaydında geri bildirimi okuyup izin/geri bildirim özetini indirebilir.

## Kurumsal dayanak ve alıcı

MFA'lı yönetici aynı birimde kayıtlı ve kendisinden farklı alıcı kimliğini kullanır. Alıcının issuer ve subject özeti sunucuda sabitlenir. Amaç en az 20 karakterle açıktır; saklama ve amaç dışı yeniden kullanım sınırının yazılı referansı gerekir. Aynı birimde ayrı incelenmiş veri akışı sicili, **tam alıcı kişi kimliği** ve **tam amaç metni** ile eşleşir. Sicil ve inceleme özetleri politika sürümüne bağlanır. Bu referanslar gerçek hukuki dayanağın yeterliliğini otomatik onaylamaz.

Hazırlayandan ve alıcıdan farklı kalite görevlisi kabul/ret kaydeder. Yeni sürüm tam önceki sürüm ve değişiklik gerekçesi ister. Yeni taslak eski kabulü genişletmez veya silmez. Yeni kabul, aynı alıcının eski politika sürümündeki izinlerini yeni erişime kapatır; öğrenen yeni koşul için yeniden izin vermelidir. Kalite durdurması eski sürüme geri düşmez. Yerel politika sonu en çok 366 gündür; bu süre kurumun saklama veya sözleşme kuralı değildir.

Yeni çekirdek rol yoktur. Sentetik alıcılar mevcut kişi/birim üyeliğine, boş akademik rol listesine ve MFA'lı oturuma sahiptir; yalnız somut portfolyo izninden dar erişim alırlar. Gerçek dış işveren IdP'si, görevlendirmesi, üyelik modeli veya sözleşmesi kurulmadı. Yeni gerçek hesap, credential veya işverene mesaj oluşturulmadı.

## İzin ve içerik sınırı

İzin sahibi güncel öğrenen üyeliği ve MFA ile kendi program kaydını seçer. Aynı kayıt için kullanılabilir yerel imzalı belge gerekir. B33'te aynı programın güncel, incelenmiş, durdurulmamış ve açık hata bildirimi olmayan ilişkilerinden 1–30 seçim yapılır. İsteğe bağlı 0–10 çalışma kanıtı, seçilen belgenin insan kararında kullanılan kanıtlar arasından ve mevcut kaynak/alternatif inceleme uygunluğu yeniden doğrulanarak alınır. Ham JWT, rubrik puanı, değerlendirme gerekçesi ve itiraz metni portfolyo içeriğine taşınmaz.

Alıcı, amaç, politika özeti, program kaydı, belge, seçili ilişki/kanıt kimlikleri, içerik özeti ve süre izin kaydında sabittir. Aynı program ve politika için ikinci etkin izin oluşturulamaz; değişiklik önce geri çekme ve yeni açık izin ister. İzin en çok 30 gündür ve politika sonunu aşamaz. Bu sınır yerel prova denetimidir; yasal saklama süresi değildir.

Erişimde alıcının kişi/issuer/subject/birim/MFA bağı, politika kabulü/sonu/durdurması, öğrenen üyeliği, belge/karar/kaynak durumu, B33 eşlemesi, seçili kanıt ve özetler yeniden kontrol edilir. Yeni eşleme sürümü veya seçilen kaynağın kapanması eski izni kendiliğinden yeni içeriğe taşımaz. Başka alıcı, başka öğrenen, başka birim/kurum veya farklı amaç ile açma reddedilir. Genel yönetici yetkisi kişi portfolyosuna erişim sağlamaz.

Amaç teyidi makbuzu içerik tutmaz; kimlikli izin, amaç, politika ve seçim özeti referanslarını taşır. Eski erişim/geri bildirim komutu tekrarında güncel izin yeniden doğrulanır; geri çekilmiş izin eski komut yanıtıyla açılmaz. İşlem ve denetim atomiktir; denetim hatasında teyit/geri bildirim geri alınır.

## Geri çekme, geçmiş ve veri talepleri

Öğrenen tek izni veya **Veri talepleri / Paylaşımlarımı geri çek** yoluyla kendi birimindeki bağlantı ve portfolyo izinlerini birlikte geri çeker. Onay metni her iki kapsamı açıkça söyler. Yeni alıcı içeriği ve geri bildirim işlemi kapanır; akademik kayıt silinmez. Yeni ağ isteğinde kapsam yeniden denetlenir. Önceden yetkili gösterilmiş veya kopyalanmış içeriğin alıcının cihazından geri alınabildiği iddia edilmez.

Öğrenenin izin ve geri bildirim geçmişi korunur. Kişisel dışa aktarıma kendi izin/geri çekme/erişim/geri bildirim kayıtlarının sınırlı alanları eklendi. Bu, bütün tarafların tüm kişisel verilerinin veya alıcının tüm oluşturduğu kayıtların resmî KVKK başvuru yanıtı değildir; B28 tam veri envanteri ve kurum saklama/başvuru kabulü ayrıca açıktır. Alıcı ekranında ham belge indirme veya geniş kapsamlı kişi dışa aktarma yoktur.

## Yerel kanıt ve açık koşullar

11 yeni sunucu senaryosu: tam amaç/alıcı/sicil, ayrı inceleme, açık izin, amaç teyidi ve seçili veri, başka kişi/alıcı/rol, puan alanı reddi, arşiv korunması, tekrar/geri çekme/süre, toplu veri talebi geri çekmesi, beceri hatası/itiraz, yeni politika sürümü, MFA/issuer-subject/birim ve denetim hatası.14 tarayıcı kontrolü gerçek portalda öğrenen-yönetici-kalite-alıcı akışını, çalışma metni seçilmediğinde paylaşılmamasını, arşiv SHA'sını, yenileme/arama/klavye/390 px kullanımını doğrular.

B34 genel durumu kısmi. Gerçek alıcı ve kurumun amaç/hukuki dayanak/alıcı ülkesi/saklama/aktarım kararı, öğrenen bilgilendirmesi ve uygun izin usulü; gerçek B18/B33 kaynağı, üretim kimlik/depo ve işveren pilotu kabulü açık. Gerçek kullanıcı verisi veya kurumsal sözleşme kabulü uydurulmadı. Vercel'de configuredCore kapalıdır.
