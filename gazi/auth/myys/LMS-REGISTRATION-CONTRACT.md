# B15 — kaynak ders kaydı ve ilerleme

14 Ekim 2026 · `myys-source-registration/1` · sağlayıcıdan bağımsız, sentetik yerel kabul. Gerçek GUZEM/UzemGO veya başka LMS kurulmadı. `configuredCore()` kapalıdır. Kayıt türü mevcut imzalı dosya alımı, kalıcı olay kuyruğu ve kaynak güven siciliyle bağlıdır; ayrı örnek depo kurulmadı.

## Ekran ve işlem

**Aktarım ve mutabakat → Kaynak ders kaydı ve ilerleme**: kişi, program kaydı, kaynak ders, kayıt kimliği/sürümü, olumlu/olumsuz tamamlama, görev başına son kaynak notu ve kayıt geçmişi aynı kartta gösterilir. Kişi/program/kaynak araması ve durum filtresi vardır. Öğrenen yalnız kendi birimindeki kendi kaydını; eğitici/koordinatör/komisyon/öğrenci işleri/kalite güncel MFA ve birim yetkisiyle; bilgi işlem kendi biriminin aktarım özeti olarak görür. Ham imzalı JWT, çalışma içeriği ve kişi eşleme listesi yeni kartta gösterilmez. Diğer öğrenen ve ilgisiz yöneticiye kayıt sızmaz. Dosya alma/işleme yetkisi bilgi işlemde kalır.

Kaynakta ders kaydı, kurumun program kaydı veya akademik başarı değildir. Mevcut yetkilendirilmiş program kaydı ve etkin öğrenen üyeliği olmadan kaynak kayıt olayı alınmaz. Kaynak bildirimi yeni kişi, üyelik, rol, program kaydı, puan, karar veya belge yaratmaz. İnsan rubriği ve bağımsız akademik karar ayrı mevcut işlemlerdir.

## Kayıt bildirimi profili

Yeni dar yerel profil `myys-source-registration/1`; önceki `myys-source-packet/1` grade/completion/license-revoked biçimi değişmedi. Aynı `myys-source+jwt` RS256 taşıması, güven onayı, program/rubrik özeti, kaynak issuer/audience/ders/kişi eşlemesi, süre ve tek olay kimliği denetimleri sürer. Yeni profil yalnız `registration` türünü kabul eder. Görev/çalışma/not/tamamlama alanları null; `registered` zorunlu boolean ve `registrationId` 1–160 karakterlik opak kaynak anahtarıdır. Submission/olay revizyonu birebir eşittir. Bu adlar LMS vendor, LTI, OneRoster veya kurumun mevcut API şeması değildir.

Kaynak kayıt kimliği aynı sözleşme/kişi için sabittir; başka kişiye yeniden bağlanamaz. Değişecek kaynak kimlikleri için gözden geçirilmiş yeni kaynak sözleşmesi gerekir; tahmini eşleştirme veya e-posta birleştirmesi yapılmaz. Gerçek sağlayıcının yeniden kayıt kimliği davranışı ayrıca eşlenmelidir.

- Kabul ayrı; işleme ayrı. Etkin kayıt bildirimi işlendiğinde kaynak ders kaydı etkin görünür. Kabul edilmiş fakat işlenmemiş en yeni kayıt sürümü, yeni grade/completion alımını ve mevcut kaynak uygunluğunu kapatır.
- En yüksek kayıt revizyonu geçerlidir. Aynı olay/digest tekrarı yeni olay oluşturmaz; aynı revizyon farklı olay çakışmadır. Geç gelen düşük sürüm işlenirken stale olur; son durumu geriletemez.
- Kayıt iptali kabul edildiği anda, worker işlemesini beklemeden ilgili kaynak kanıtını yeni değerlendirme/belge işlemine kapatır. Eski insan puanı, karar ve arşiv değiştirilmez. Bu olay programdan resmî çıkarma veya önceden imzalanmış belgenin otomatik iptali değildir.
- Yeniden kayıt etkinleşince iptal öncesi notlar kendiliğinden açılmaz. Yeni grade/completion olayı yeni etkin kayıt olayına yerel `registrationEventId` ile bağlanır. Eski kanıtın bağlı kayıt revizyonundan sonraki herhangi bir iptal, o eski kanıtı kapalı tutar. Bağlı kayıt aynı kişi/birim/program/kaynakta işlenmiş ve güvenilir olmalıdır.
- Claim almış işçi bu sırada kayıt iptal edilirse geç sonucu commit edemez; hata güvenli `lms_registration` koduyla karantinaya gider. Kalıcı lease/tekrar/audit kuralları korunur.
- Kaynak not düzeltmesi, lisans iptali ve kaynak/anahtar güven kapanışı aynı mevcut uygunluk zincirinden ilerleme, insan değerlendirmesi, karar, cüzdan ve belge durumuna yansır. Yeni ilerleme kartı kurum adına karar vermez.

## Önceki kayıtların korunması

Önceki yerel profil kayıt bildirimi içermez. Bu kayıtlar `Kaynak kaydı bildirilmedi` olarak açıkça gösterilir; geriye dönük etkin kaynak kaydı uydurulmaz. Mevcut yerel kaynak kabulü korunur. Kaynak ilk kez kayıt bildirimi gönderirse bu noktadan sonra kayıt yaşam döngüsü uygulanır. Sonradan gelen iptal eski bildirimsiz kanıtı da kapatır; yeniden kayıt eski notu otomatik açmaz.

Kaynak kayıt olayları append-only kalır. Bu dilimde değişen `registrationEventId` bağı yerel sunucu kaydıdır; eski grade JWT formatına ek bir imzalı kayıt iddiası sokulmadı. Bağımsız Python arşiv doğrulayıcısı grade imzasını ve tarihsel içeriği doğrulamayı sürdürür; **güncel kayıt/uygunluk doğrulaması yapmaz**. Dış doğrulayıcı ve gerçek sağlayıcı bu kayıt profilini ayrıca kabul etmedikçe dış entegrasyon tamamlandı sayılmaz.

## Kalite göstergesi ve erişilebilirlik

Tamamlama `false`, `true`, bildirilmemiş ve kullanıma kapalı olarak ayrılır. `quality-report.mjs` sunucunun güncel kaynak uygunluğu false olan tamamlamayı paya alamaz; kaynak iptali veya güven kapanışı sonrası eski true bildirimi başarı oranını yükseltmez. Eksik/eski/belirsiz bildirim tamamlandı sayılmaz. Kaynak bildirimi notu, akademik rubrik puanına çevrilmez.

390 px taşma, Türkçe metin, gerçek arama/select odak sırası ve native details/summary klavye açılımı tarayıcıda denetlendi. Manuel ekran okuyucu testi yapılmadı; B24 genel kabulü kapanmadı. Mobil tam sayfa görüntüsü incelendi; element görüntüsündeki sabit başlığın konumu otomatik scroll kaynaklıdır, tam sayfada içerik çakışması yok.

## Kabul ve kalan

11 yeni sunucu senaryosu: kayıt alımı/işleme, önceden yetkili enrollment, yanlış kişi, profil karışımı/alan türleri, kayıt kimliği tekilliği, tamamlama false→true, kaynak not düzeltmesi, iptal→yeniden kayıt, tarihsel karar/arşiv sabitliği, geç worker karantinası, çift bağlantı/idempotency/sırasız sürüm, audit rollback, güven kapanışı/gösterge ve rol/birim/tenant. 15 yeni gerçek React/HTTP tarayıcı kontrolü;14 kaynak aktarımı ve14 kaynak güveni regresyonu geçti.

Güncel 449 sunucu +46 portal +46 regresyon =541. Kapsam matrisi77komut/16HTTP,3441olumlu örnekten27528türetilmiş kontrol. Bunlar ürün tamamlanma yüzdesi değildir.115statik dosyalı mevcut korumalı paketleme geçti.

B15'in sağlayıcıdan bağımsız kayıt/tamamlama/not düzeltme/lisans iptali/yanlış kişi senaryo dilimi kapandı. İş paketi genel durumu **kısmi**: B10/B14 bağımlılıkları, seçilen gerçek LMS ürün/sürüm sözleşmesi, yetkili sentetik kohort, gerçek taşıma/depoya bağlanan worker ve dış kabul açık. Üretim veri/migration/credential/gerçek öğrenci işlemi yok. ACCESS-ACTIONS madde4 aynı somut dış bilgi paketidir; yeni ayrı erişim talebi oluşturulmadı.
