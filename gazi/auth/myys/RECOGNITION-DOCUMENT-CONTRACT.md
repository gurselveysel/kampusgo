# B21 — Tanıma belgesinin yerel teslimi ve arşivi

Sürüm: 2026.10.14.48. Yalnız LocalAcceptanceStore üzerinde sentetik kabul; Vercel ve gerçek kurum işlemi kapalıdır. B21'in özgün kabul ölçütü değişmez. Bu dilim kriptografik doğrulama değildir.

## Kullanıcının yaptığı işlem

Tanıma ve kredi → Başvurular ve kararlar → Belge teslimi. Öğrenci önce kendi program kaydına dosya özetiyle talep açar, sonra aynı JWT dosyasını ayrıca teslim eder. Dosya en çok 32 KiB; kişi başına 25, kurum başına 250 değişmez teslim kaydı vardır. Bunlar yerel kaynak sınırlarıdır; kurum saklama politikası değildir. PDF ve diğer biçimlerin gerçek teslimi bu yolda kapalıdır; eski insan raporu inceleme yolu korunur.

Teslimden önce talebin sahibi, güncel öğrenci rolü, kurum/birim ve MFA kontrol edilir. Sunucu gerçek baytlardan SHA-256 hesaplar; talepteki özetle uyuşmalıdır. Dosya adı izinli karakter/uzantı/uzunluk, içerik canonical base64 ve üç parçalı ASCII compact-token biçimiyle sınırlıdır. Bu biçim denetimi header, payload, imza, issuer, subject, süre veya belge türünü doğrulamaz. Sahte imzalı sentetik örnek arşivlenebilir ama uygun teknik inceleme veya kredi oluşturamaz.

## Değişmez kayıt ve yetki

- `recognition-document`: talep kimliği ve tam talep SHA, dosya SHA/boyut/adı, sahip/birim ve doğrulanmamış durumları.
- `recognition-document-file`: aynı kimlikle özel ham baytlar. Web köküne yazılmaz, yorumlanmaz, uygulamada açılmaz, URL izlenmez, dış tarayıcı/tarama servisine gönderilmez.
- `recognition-document-download`: güncel yetkili kişinin indirme makbuzu. Öğrencinin kendisi veya aynı birimin IT, komisyon, kalite ve öğrenci işleri rolü; MFA zorunlu. Koordinatör yalnız teslim bilgisini görür.

Her talebe tek değişmez belge; teknik veya akademik inceleme başladıktan sonra yükleme kapalıdır. Yeni dosya için yeni talep gerekir. Aynı komut tekrarında sonuç korunur; yeni komut/ikinci SQLite bağlantısı ikinci dosya oluşturamaz. Teslim, özel dosya, idempotency ve audit aynı transaction içindedir. İndirme öncesi ve tekrarında güncel yetki, talep SHA ve arşiv bayt SHA kontrol edilir. Audit hatasında yanıt verilmeden işlem geri alınır.

İndirme `application/octet-stream` ve uygulamanın ürettiği dosya adıyla yapılır. Çalışma ekranında ve kişi özetinde ham bayt bulunmaz. `commands.result` indirme dosyasını içermez; tekrar gerçek özel dosyayı yetki/bütünlük kontrolünden sonra okur. Kişi özetinde izinli teslim/indirme metadata alanları vardır; dosya ve talep SHA'sı bu özete eklenmez.

## Kaynak ve kalan sınır

OWASP File Upload Cheat Sheet, 14.10.2026 erişimi; okunan kapsam: izinli dosya türü, ad/boyut sınırı, yetkilendirme, depolama, indirme ve zararlı içerik savunmaları. Kaynak: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html . Dinamik teknik rehber; yasal/kurumsal kaynak veya tam uygunluk belgesi değildir. Bu dilim kısıtlı tür, uygulama adı, özel depolama ve denetimli erişim önerilerini kullanır. Antivirüs, sandbox/CDR veya zararsızlık kanıtı yoktur; arayüz bunu açıkça belirtir. Üretim nesne deposu, kota/oran sınırları, tarama, saklama/yedek imhası ve gerçek belge teslim usulü ayrı kabul ister.

Sırada dış belgeye özel güvenilir issuer/key/subject sözleşmesi ve kriptografik adaptör vardır. Belgenin kendi header/JWK/URL alanı güven kaynağı olamaz. Mevcut LMS olay anahtarı başka amaçlı belge için otomatik yetki değildir. Teknik doğrulama akademik karar, önceki ders incelemesi, kurul yetkisi veya tekil kredi kontrolünün yerine geçmez. Gerçek kurum anahtarı/credential oluşturulmadı; `configuredCore()` üretimde açılmadı.

Kanıt: `acceptance/B21-document-20261014.json`, `tests/myys-recognition-document.test.mjs`, `scripts/myys-recognition-document-browser.cjs`. İki gerçek SQLite bağlantısı yalnız yerel kalıcılık/yarış kanıtıdır; dağıtık üretim depo kabulü değildir.
