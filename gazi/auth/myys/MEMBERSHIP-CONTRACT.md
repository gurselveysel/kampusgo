# B06/B08 kişi ve üyelik yaşam döngüsü — local-2026.10.10.1

Kişi ve üyelik ekranı yalnız izole yerel kabul deposundaki mevcut kişilerin birim üyeliklerini yönetir. Yeni kişi veya gerçek kurum yetkisi oluşturmaz. Kişi `(issuer, subject)` ile tekildir; e-posta üzerinden eşleme yapılmaz. Kimlik doğrulama kaynakları ve gerçek IdP kapıları IDENTITY-CONTRACT.md içinde korunur.

## Akış ve yetki

- Birim yöneticisi, kendisi dışındaki mevcut etkin kişi için süreli görev değişimi veya üyelik geri çekme önerir. Dokuz mevcut çekirdek rol, açık UTC bitiş zamanı, gerekçe ve atama dayanağı zorunludur. Kurumsal süre veya yetki varsayılmaz.
- Farklı yönetici inceler; hazırlayan ve hedef kişi inceleyemez. Kabul anında hazırlayanın güncel yetkisi, hedef kişinin etkinliği, mevcut üyeliğin özeti ve önerilen süre yeniden kontrol edilir. Red, yetki değiştirmez.
- Üyelik özeti en son uygulanmış inceleme kimliğini içerir: değerler daha sonra eski haline dönse bile eski öneri canlanmaz. Aynı kaynakta yarışan önerilerden yalnız güncel olan uygulanabilir. Değişiklikler ve gerekçeler değişmez kayıt zincirinde korunur.
- Kabul, üyelik güncellemesi ve aynı kişinin aynı kurumdaki bütün yerel oturumlarının iptalini tek işlemde yapar. Birim değişimi başka kurum oturumunu veya başka birim üyeliğini değiştirmez. Oturuma bağlı bilinen pending/claimed giriş istekleri de iptal edilir; her istek için identity.cancel denetimi yazılır. Henüz kişiye bağlanmamış ön giriş isteği kişiye aitmiş gibi tahmin edilmez; tamamlanırken güncel üyelik tekrar denetlenir.
- Denetim yazılamazsa üyelik ve oturum iptali birlikte geri alınır. Komut tekrarı ikinci etki yaratmaz ve güncel yetkiyi yeniden ister. Eski oturumla yeni görev kullanılamaz; yeni yerel kimlik girişi gerekir.
- Global kişi kapatma tüm kurumları etkileyeceğinden bu birim ekranına verilmez. Kurumdan ayrılma birim üyeliğini geri çekme olarak kaydedilir; etkin başka birim üyeliği ayrı kalır.

## Kapsam ve gizlilik

Kurum bağı olmayan eski bindings kayıtları artık principal tarafından reddedilir. Test fixture'ları da açık identity_scopes kaydı taşır; bu kayıt gerçek IdP doğrulaması değildir. Aynı kişi iki kurumun üyesi olsa da bir kurum oturumu diğer kuruma çevrilemez. Her istek kişi etkinliğini, üyelik etkinliğini ve süreyi sunucudan okur.

Öğrenen yalnız kendi üyelik/öneri geçmişini görür. Yönetici yalnız kendi yönetim birimlerini görür; diğer görevliler başkalarının idari rosterini alamaz. Ekran ve görünüm issuer/subject, e-posta, oturum özeti veya ham belirteç taşımaz. Akademik kanıt, karar ve belge geçmişi üyelik değişiminde silinmez.

## Kabul ve açık koşullar

14 yeni sunucu senaryosu: görev/süre doğrulaması, üç kişi ayrılığı, eşzamanlı kaynak ve eski öneri, iki kurum/iki birim, iptal, taze giriş, süre dolumu, kalıcılık, audit rollback, aktarım/imza/komut sınırları, bekleyen giriş ve Vercel kapısı. Toplam 228 sunucu + 46 portal + 46 regresyon = 320 otomatik test.

Yeni üyelik tarayıcı akışında görev önerisi, ayrı inceleme, iptal edilen eski oturum, ikinci geri çekme, kalıcılık, 390 px görünüm ve klavye geçişi sınanır. B11 itiraz tarayıcı regresyonu kapsamı da korunur. Güncel kanıt acceptance/B06-B08-lifecycle-20261010.json dosyasındadır.

Gerçek kurum görev sicili, kişi eşleme/provizyon sözleşmesi, onaylı üretim depo adaptörü/migration ve dağıtık iptal kabulü açıktır. B08'in bütün modüller için doğru kurum içindeki çapraz birim eylem matrisi ayrıca genişletilecektir; bu dilim tam paket kapanışı değildir. configuredCore Vercel'de kapalıdır.
