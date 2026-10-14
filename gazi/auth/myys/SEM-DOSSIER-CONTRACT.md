# B23 — merkezi SEM yerel dosya hazırlığı

Sürüm 2026.10.14.24. Uygulama dayanağı: backlog.json B23 bağımsız işi. Resmî kaynak/kapsam okuması ve kalan asıl belgeler SEM-SOURCE-REVIEW.md içinde kayıtlıdır. Bu sözleşme YÖKSİS API'si, Gazi'nin resmî program açma onayı veya merkez adına belge yetkisi değildir.

## Ekran ve görev akışı

Kanıt ve akademik karar → SEM dosyaları sekmesi, yayımlanmış **yerel merkezi SEM** program sürümüne bağlı hazırlık dosyası tutar. Mikro yeterlilik programı burada kullanılamaz. Koordinatör merkezî ve kurum içi kaynakların başlık/referans/sürüm/tarih/okunan kapsamını ve sekiz iç kontrol satırını kaydeder. Satırlar program paketi, yöntem/eğitici, kurum yetkisi, merkezî usul, hak/erişilebilirlik, veri/saklama, ücret veya ücretsiz kapsam ve yetkili teslim planını kapsar.

Liste MYYS'nin iç hazırlık kontrolüdür; kamuya açık doğrulanmış YÖKSİS teknik şeması diye sunulmaz. “Yerel dayanak kaydedildi” dış belgenin gerçekliğinin veya kurum onayının otomatik doğrulandığı anlamına gelmez. Eksik satır kaydedilebilir, fakat dosya uygun incelemesine ve aktarım hazırlığına ilerleyemez.

Ayrı komisyon görevlisi gerekçeli düzeltme veya yerel dosya uygunluğu incelemesi verir. Dosya hazırlayan ve program hazırlayan inceleyemez. Tamamlanmış inceleme değişmez; düzeltme yeni dosya sürümü gerektirir. Aktarım dosyasını hazırlayan öğrenci işleri görevlisi hem hazırlayandan hem inceleyenden hem program hazırlayandan ayrıdır. Hazırlayan/inceleyenin güncel birim görevleri yeniden denetlenir.

## Durum ve sürüm

Hazırlık dosyası → düzeltme bekliyor veya yerel inceleme uygun → aktarım dosyası hazır / gönderilmedi. Güncel dosya geri çekilebilir. Yeni sürüm güncel önceki kimliğe, değişiklik gerekçesine ve aynı değişmez program sürümüne bağlıdır; önceki dosya/inceleme/paket tarihsel kalır. Yeni sürüm önceki incelemeyi kullanamaz. Yeni sürüm veya geri çekme eski paketi güncel indirme seçeneği olarak göstermez; geçmiş verisi yetkili görevlerde korunur. Dış sisteme iptal gönderilmez.

Kaynak özetine bağlı iyimser eşzamanlılık, atomik kayıt/komut/denetim ve güncel yetkiyle idempotent tekrar korunur. Kurum/birim sınırı B08 matrisindedir. Öğrenen ve BT idari dosyaları okuyamaz; koordinatör/komisyon/öğrenci işleri/kalite/yönetici kendi yetkili biriminde okuyabilir. Hazırlık paketi kişisel öğrenci listesi içermez.

## Aktarım dosyasının anlamı

İndirilen JSON, değişmez program snapshotı/özeti, dosya ve kontrol listesi, kaynak okuma kapsamı ve ayrı incelemeyi taşır. SHA-256 özeti aynı içeriğin izlenmesini sağlar; kriptografik imza değildir. Bütün paketlerde:

- `official=false`, `signed=false`
- `externalSubmitted=false`, `externalApproval=null`
- `centralIssuerVerified=false`, `localIssuanceAllowed=false`

Bu bayraklar kullanıcı girdisiyle açılamaz. Gerçek başvuru, uygunluk, merkezî düzenleyici ve teknik şema/yetki kabulü ayrı kurum eylemidir. Yerel paketin hazır olması gerçek başvurunun yapıldığı, kabul edildiği veya bir belgenin düzenlendiği şeklinde gösterilmez. `configuredCore()` Vercel'de kapalıdır. Merkezi SEM başarı kararı alınsa bile mevcut `issue` yolu `issuer_pathway` ile kapalı kalır. Mikro belge profili merkezi SEM'e dönüştürülemez.

## Kabul sınırı

Yerel testler: doğru yol, eksik satır, kaynak doğrulama alanları, görevler ayrılığı, sürüm ve özet yarışları, güncel görev kaybı, geri çekme, başka birim/kurum, iki depo bağlantısı ve denetim hatasında geri alma. Tarayıcı: eksik dosya → düzeltme → yeni sürüm → ayrı inceleme → ayrı aktarım hazırlığı → gerçek JSON indirme, bayrak denetimi, arama/boş sonuç, sürüm/geri çekme/yenileme, yetkisiz rol, klavye ve 390 px form.

Güncel YÖK asıl yazısı/ekleri, Gazi/GAZİSEM güncel iç usul ve yetkili program kararı, YÖKSİS teknik sözleşmesi/test erişimi ve gerçek merkezî kabul açık kalır. B23 bütünü tamamlanmış değildir. Başka üniversitenin iç usulü veya tarihsel Gazi program duyurusu genel kural yapılmadı; merkezi düzenleyici yetkisi yerel kullanıcıya verilmedi.
