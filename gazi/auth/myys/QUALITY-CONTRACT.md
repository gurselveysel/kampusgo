# B29 kaynaklı göstergeler — 2026-10-10

Bütün hesaplar aynı yetkili kurum/birim/kişi görünümündeki kalıcı yerel kayıtlardan gelir. Tarayıcı taslakları, sunum profili ve eski örnek panel sayıları kullanılmaz. `qualityReport` sunucuda ve filtreli arayüzde aynı saf işlevdir; her pay, payda ve dayanak kayıt kimlikleriyle raporlanır. Bu kurum çapı istatistik veya dış kaynak mutabakatı değildir.

| Gösterge | Pay | Payda | Sınır |
|---|---|---|---|
| Başvurudan program kaydına geçiş | Kabul incelemesi geçerli öğrenen kaydına bağlı başvurular | Erişilebilir başvurular | Doğrudan program kaydı başvuru olarak türetilmez. |
| LMS tamamlama | En son kaynak sürümü açık `completed: true`, işlenmiş ve yetkisi geri çekilmemiş kayıt | Erişilebilir öğrenen-program kayıtları | Kaynaksız/işlenmemiş/çelişen/belirsiz bildirim sayılmaz; kısmi kaynak etiketi. |
| Akademik başarı | En son insan kararı onaylı ve kullanılabilir öğrenen-program kayıtları | Değerlendirilmiş öğrenen-program kayıtları | Tekrarlanan değerlendirme kişiyi çoğaltmaz; itiraz ve güncellik kapıları korunur. |
| Yerel imzalı belge teslimi | Kendi teslim teyidi olan güncel kullanılabilir imzalı belgeler | Güncel kullanılabilir imzalı belgeler | İmza bekleyen hazırlık ve dış kurum kabulü değildir. |
| Dış kurumda belge kabulü | Kaynak bekleniyor | Kaynak bekleniyor | Oran üretilmez; yerel teslim veya tanıma kararı dış alıcı bildirimi sayılmaz. |
| Destek çözümü | Güncel durumu çözülmüş destek kayıtları | Erişilebilir destek kayıtları | Yeniden açma payı azaltır; program bağı yoksa program filtresinde oran üretilmez. |

Başvurular yayımlanmış program sürümüne, aynı birimdeki etkin öğrenene bağlıdır. Ayrı koordinatör/öğrenci işleri MFA ile kabul/red verir. Kabul incelemesi ile program kaydı tek transaction'dır; audit başarısızsa ikisi de geri alınır. Tek sürüme yinelenen başvuru ve kendi başvurusunu kabul engellenir. Öğrenen hesabı oluşturmaz veya kurum kohortu açmaz.

Cüzdanda kişi imzalı yerel belgeyi aldığını açıkça teyit eder. Teyit tekildir; sahibi ve güncel kullanılabilir imzalı belge denetlenir. Dış kabul/kurumsal teslim bayrağı false kalır. Başvuru ve teslim teyidi kişinin veri özeti dışa aktarımına dahil edilir.

LMS yerel sentetik sözleşmesi `completed` için yalnız boolean kabul eder. Önceki `completion` olaylarında alan yoksa kayıt korunur ve belirsiz sayılır. `grade` başarıya veya tamamlamaya çevrilmez. Yeni sürüm işlenmeyi beklerken eski tamamlamayı güncel sonuç gibi göstermemek için en son alınan sürüm esas alınır. Aynı kişi için çelişen sözleşmeler uzlaştırılmadan tamamlandı sayılmaz. Gerçek LMS şeması/hizmeti bağlı değildir.

CSV bütün gösterge başlıklarını, mevcut pay/payda/dayanak kimliklerini ve yerel kapsamını taşır; formül enjeksiyonu mevcut `transferCsv` ile engellenir. Kaynaksız göstergeler de özete dahildir. Mobil görünüm ve rol izolasyonu sınandı.

## Kalanlar

Gerçek yetkili kohort, LMS, dış belge kabulü/delivery adaptörü ve kurumun gösterge tanımlarının kabulü açık. B29 yalnız bu bağımsız yerel dilimde doğrulandı. B17 toplu imza/dış teslim ve B30 gerçek kohort kabulü tamamlanmadı. Hiçbir gösterge kurumsal başarı ya da paket tamamlanma yüzdesi olarak kullanılmaz.
