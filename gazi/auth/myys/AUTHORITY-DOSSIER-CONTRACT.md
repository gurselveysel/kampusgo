# B02 — belge ekli yerel yetki dosyası

Sürüm 2026.10.14.42. Dayanak: backlog.json B02'nin belge ekleri, geçerlilik ve sorumluluk kapsamı bağımsız işi. Bu ürün sözleşmesi bir mevzuat hükmü veya kurum yetkisi değildir. YÖK/Gazi kaynak okumasının sınırı SEM-SOURCE-REVIEW.md içinde kayıtlıdır.

## Ekran ve işlem

Kanıt ve akademik karar → Politika ve hak sicili içinde ek yükleme, program yetki dosyası, ayrı yönetici incelemesi, arama, yeni sürüm, indirme ve kullanım durdurma bulunur. Mevcut sicil türleri ve incelemeleri korunur.

Yönetici, kendi birimindeki kurum yetki siciline PDF veya düz metin isimli dosyanın **gerçek baytlarını** yükler. Dosya başlığı, kaynak referansı, sürüm, belge tarihi ve okunmuş kapsam zorunludur. Dosya başına 32 KiB, dosya başına tek komut sınırı vardır. SHA-256 sunucuda baytlardan hesaplanır. Uzantı dosya biçimini veya güvenliğini doğrulamaz; içerik ayrıştırılmaz, çalıştırılmaz, HTML olarak gösterilmez ve dış URL'den alınmaz. İndirme `application/octet-stream` ile yapılır. Zararlı içerik taraması, elektronik imza ve belge gerçekliği **doğrulanmış değildir**. Gerçek taranmış kurum evrakı arşivinin boyut/depolama/tarama sözleşmesi ayrıca gerekir.

Dosya, ek metadata kaydıyla aynı atomik işlemde değişmez `authority-file` kaydına yazılır. Çalışma alanına yalnız metadata çıkar. Yetkili indirme güncel kurum/birim/MFA kontrolü ve audit makbuzu üretir; ham dosya komut sonucu tablosunda veya indirme makbuzunda kopyalanmaz. Aynı komutun tekrarı dosyayı tekrar güncel yetkiyle okur ve SHA/boyutu yeniden denetler. `authority-file` içeriği kişisel özne özetine açılmaz; idari kayıtlar B28 envanterine sayım olarak bağlıdır. Dosya saklama süresi ve imhası henüz onaylı değildir.

## Program ve sorumluluk bağı

Dosya, değişmez tek program sürümüne ve ayrı incelenmiş aynı birim/yol/sorumluluk siciline bağlıdır. Program sahibi, akademik karar sahibi, hukuki düzenleyici ve teknik imzalayan alanlarının her biri farklı adlandırılır; her rolün somut kapsam açıklaması ve seçilmiş ekleri bulunur. Bu adlandırma tek başına kişiye görev atamaz veya bir tüzel kişinin yetkisini ispatlamaz. Profildeki gerçek kişi görevi ayrıca denetlenir.

Yerel hazırlık en az bir Senato dayanağı ve bir SEM kapsam dosyası ister; toplam 2–12 tekil ek bulunabilir. Bu, kullanıcının B02 kabul hedefi için iç kontrol kapısıdır; bütün üniversitelerde her program için aynı ekin hukuken zorunlu olduğu iddiası değildir. Kurumca uygulanabilirlik incelenmeden otomatik muafiyet veya resmî onay üretilmez.

Program, sicil, sicil incelemesi ve ek metadata SHA'ları dosyaya bağlanır; ek bayt bütünlüğü kullanımda yeniden denetlenir. Kapsamda seçilen her ek aynı sicilden olmalıdır. UTC başlangıç/bitiş geçerli ve sıralı olmalıdır. Gelecek başlangıçlı taslak kaydedilebilir, ancak başlamadan uygun inceleme veya kullanım yapılamaz. Kurumsal bir azami süre uydurulmaz. Belge profili bitişi yetki dosyasının bitişini aşamaz.

## İnsan incelemesi ve yaşam döngüsü

Hazırlayan, program yazarı veya eklerden birini yükleyen kişi dosyayı inceleyemez. Ayrı yönetici gerekçeli uygunluk veya düzeltme kararı verir. İnceleme tam dosya SHA'sını sabitler. Dosya hazırlayanın, sicil inceleyenin ve dosya inceleyenin güncel yönetici üyeliği kullanım sırasında aranır. Kurumca atanmış gerçek yetkili incelemeci kabulü halen açık kalır.

Yeni sürüm güncel önceki dosya kimliği ve değişiklik gerekçesini ister; iki SQLite bağlantısının aynı önceki sürümden ikinci güncel sürüm oluşturması reddedilir. Yeni taslak, ret, süre sonu, görev kaybı veya durdurma yeni kullanım için eski sürüme otomatik dönüş sağlamaz. Durdurmayı aynı birimdeki güncel yönetici gerekçesiyle uygulayabilir; yeni sürüm ayrı inceleme ister. Eski dosyalar/ekler/incelemeler değişmez kalır.

Belge profili artık kullanılabilir dosyanın kimliğini ve tam SHA'sını sabitler. Eski yalnız metin referanslı profil yeni ihraç için yeterli değildir; kaynak/kurum kabulü uydurarak otomatik dönüştürülmez. Yeni dosya incelense dahi eski profil bağı değiştirilmez; yeni profil ve ayrı komisyon incelemesi gerekir. `issue` ve bekleyen imza hazırlığı mevcut profil kontrollerinden bu kapıyı yeniden denetler. Önceden imzalanmış belge durdurma nedeniyle kendiliğinden iptal olmaz; B11/B13'ün ayrı karar/iptal zinciri korunur.

## Kabul ve üretim sınırı

Beş komut: `authority-attachment`, `authority-dossier`, `authority-review`, `authority-hold`, `authority-download`. Altı kayıt türü: bu beş tür ve `authority-file`. Bütün işlemler LocalAcceptanceStore ile sınırlıdır; Vercel kapalıdır. `official=false`, `legalAuthorityVerified=false`, `authenticityVerified=false` ve `externalSubmitted=false` ilgili kayıtlarda sabittir. Merkezi SEM yerel ihraç yasağı değişmez.

13 yeni sunucu senaryosu dosya baytları/eksikler/süre/ayrılık/MFA/birim/kurum, sürüm yarışı, audit geri alma, bozulmuş dosya, profil bağı ve eski imza korunmasını sınar. 13 yeni tarayıcı kontrolü gerçek dosya yükleme/indirme, iki dosya sürümü, ayrı yönetici ve komisyon, yeni profil, arama/yenileme, 390 px ve klavyeyi kapsar. Kaynak toplamı 570 sunucu +48 portal +46 regresyon =664; yerel kabul kanıtı `acceptance/B02-authority-20261014.json` içindedir. Bunlar gerçek kurum dosyası, gerçek e-imza, malware taraması, üretim deposu veya ekran okuyucu sertifikası değildir.

B02'nin sınırlı bağımsız yerel dilimi kabul edildi. Gerçek Senato/SEM kararları ve eklerin gerçekliği, program/görev/kurum kapsamı, güncel tam YÖK/Gazi usulü, üretim dosya deposu/tarama/imza/saklama ve canlı doğrulama açık. B02 ve B01–B36 bütünü tamamlanmış değildir.
