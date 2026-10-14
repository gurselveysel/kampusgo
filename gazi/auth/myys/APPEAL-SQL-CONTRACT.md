# Aynı SQL zincirinde yerel itiraz politikası ve teslim teyidi

14 Ekim 2026 · Paket68 · `myys-academic-sql-appeal/1`. İzole yerel kabul; kurumun resmî itiraz usulü değildir.

## Kullanıcı akışı

Yetkili yönetici **İtiraz politikaları** sekmesinde mevcut program sürümünü seçer; kaynak başlığı, referansı, sürümü, tarihi, okunan kapsamı, yerel yetki dayanağı ve gerekçeyi kaydeder. Ayrı komisyon kişisi inceler. Takvim günü, açık iş günü takvimi veya bağımsız süre incelemesi seçenekleri korunur. Politika sürümleri ve bağımsız inceleme aynı SQL kişi/üyelik/oturumuyla kaydedilir.

**Akademik kararlar** ekranında kararın bağlı politika sürümü ve kaynak özeti görünür. Yalnız kararın sahibi olan öğrenen, açık onay kutusuyla kararı yerel ortamda gördüğünü teyit eder. Bu kayıt resmî tebliğ değildir; resmî süre başlatmaz. Aynı karar için farklı komut kimliğiyle tekrar bile ikinci teslim teyidi oluşturmaz. Kurum oturumu ve güncel yetki her tekrarda yeniden denetlenir.

Yeni politika önceki kararın dayanağını değiştirmez. Bağımsız komisyon, incelenmiş politikanın yeni kararlardaki kullanımını durdurabilir; eski kararlar bağlı sürümü korur. Geç veya belirsiz yerel süre başvurusu otomatik reddedilmez. İnsan incelemesinin sonuçlandırılması için ayrı süre inceleme kararı ve gerekçesi gerekir. Açık itiraz kararın kullanılabilirliğini kapalı tutar.

## Aynı veri ve güvenlik sınırı

SQL komut kapsamı 8'den 12'ye çıkar: `appeal-policy`, `appeal-policy-review`, `appeal-policy-hold`, `decision-receive` eklenir. Aynı üç akademik tabloda dört mevcut kayıt türü tutulur; toplam 12 akademik türdür. Bütün yerel SQLite envanteri 16 tablo/149 tür, PostgreSQL adayları 16 tablo olarak korunur. Birleşik checkpoint aynı 15 veri tablosunu kapsar; ayrı veritabanı veya tarayıcı taslağı işlem zinciri gibi kullanılmaz.

Mevcut `appealPolicyCommand`, `appealPolicyReplay`, `bindAppealPolicy` ve `decisionTiming` iş kuralları yeniden yazılmadı. `LocalSqlAcademicWorkingSet` önceki transaction içi SQL çalışma kümesini açık bir sunucu türüne ayırır. Özel sınıf alanıyla doğrulanan, hâlen açık SQL çalışma kümesi veya mevcut `LocalAcceptanceStore` dışında politika çalışmaz. Genel nesne, kopyalanmış prototype ve kapanmış çalışma kümesi reddedilir. Bu tür kalıcı depo, generic SQL parser veya üretim erişim kapısı değildir; Vercel kapısı korunur. Yalnız iki mevcut üyelik sorgusu desteklenir; gerçek kimlik ve yetki önce/sonra aynı SQL transactionında denetlenir.

Her yeni politika/inceleme/askı/ilk teslim kaydı, komut makbuzu, audit ve checkpoint başlığı birlikte yazılır. Sadece mevcut aynı karar teslim teyidi bulunduğunda sıfır yeni kayıtla yeni komut makbuzu ve audit yazılabilir; diğer komutlarda tam bir yeni değişmez kayıt şartı korunur. Belirsiz COMMIT birleşik checkpoint'i beklemede bırakır; otomatik kör tekrar veya başarılı yanıt yoktur.

## Sürüm sırası

Akademik kayıtların sırası, bağımsız PostgreSQL sequence durumuna bağlı değildir. Kurumun değişmez satırlarındaki en büyük sıra, aynı SERIALIZABLE işlem ve kurum kilidi içinde bir artırılır. `(tenant, position)` tekildir; pozitif güvenli tamsayı sınırı vardır. Sıra da kayıt satırıyla birlikte rollback ve checkpoint kapsamındadır. Böylece ayrı sequence durumunun değiştirilmesi semantik sürüm sırasını etkileyemez.

Bu, yalnız boş izole test deposuna açıkça kurulan SQL şema adayının yeni sürümüdür. Önceki aday şemasını kendiliğinden değiştirme veya üretim migration yoktur. Eski adayda yazma uyumsuzluğu kapalı hata verir; mevcut kayıtların üstüne yazılmaz. Gerçek çok bağlantılı SSI, bütün yazıcılar, native RLS, production schema upgrade ve ölçek kabulü ayrı koşuldur. Audit'in teknik satır kimliği akademik sürüm sırası olarak kullanılmaz.

## Yerel süre sınırı

UTC+03:00, teyidin ertesi gününden başlama ve sentetik gün sayısı açık yerel profil parametreleridir; Gazi veya Türkiye için otomatik hukuk kuralı değildir. İş günü hesabı yalnız belirtilen hafta sonu ve hariç günleri kullanır. Kapsayan takvim yoksa süre bağımsız incelemeye döner. Politika kaynağındaki `officialApproval` ve politika `official` alanları false olmak zorundadır. Okunmamış kurum hükmü ya da gerçek tebligat tarihi üretilmez.

## Kabul

11 yeni test; politika/rol ayrımı, sürüm/askı, tekil teslim, kaynak/kapsam, geç başvurunun gerekçeli incelemesi, açık iş günü takvimi, audit rollback, kapalı çalışma kümesi, belirsiz COMMIT ve gerçek HTTPS/CSRF içerir. Sıra sıkılaştırmasından sonra 25 ilgili SQL testi yeniden geçti. Son tam kabul sayıları ve tarayıcı kanıtı `acceptance/B11-appeal-sql-20261014.json` içindedir.

Yeni SQL/HTTPS/derlenmiş React akışında 21; mevcut SQLite politika ekranında 13 tarayıcı kontrolü. 320 CSS px/metin aralığı ve politika sicili; eski 390 px politika/takvim formu yeniden doğrulandı. Gerçek ekran okuyucu, resmî tebliğ, imzalı belge değişimi/iptali veya kurumun süre usulü kabulü değildir.

Kalan 124 mevcut komut SQL akışına aktarılmadı. Gerçek Gazi yetkisi/usulü, IdP/MFA/KMS, native SSI/RLS, güvenilir kontrol hizmeti, canlı smoke ve üretim migration ayrı açık koşullardır. Son canlı16; bu bir yerel geliştirme paketidir. `configuredCore()` kapalıdır.

## Kaynak kaydı

[PostgreSQL 18 §9.17](https://www.postgresql.org/docs/18/functions-sequence.html), 14 Ekim 2026 tarihinde okundu. `nextval` ve `setval` durumu transaction rollback'iyle geri alınmaz; sayaç boşlukları normaldir. Akademik sıralamayı değişmez satırlardan üretme seçimi bu projenin tasarımıdır. Bu kaynak bir kurum itiraz kuralı koymaz. Önceki teknik transaction ve ayrı checkpoint kaynakları kendi sözleşmelerinde korunur.
