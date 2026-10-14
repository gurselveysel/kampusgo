# B28 — tamamlanmış giriş isteği temizliği

14 Ekim 2026 · `expired-completed-identity-requests/1` · yalnız izole yerel kabul. Veri talepleri ekranında ayrı yanıt sonucu, aday önizlemesi, kişinin açık teyidi ve temizlik makbuzu. Eski süresi dolmuş oturum temizliği kapsamı değiştirilmedi. Üretim temizliği, fiziksel/yedek imhası veya hesabın tamamının silinmesi değildir.

## Kesin aday sınırı

`identity_challenges` satırı aynı tenant'ta olmalı, `status=used`, oluşturulma ≥0, oluşturulma ≤ tamamlanma < süre sonu ≤ önizleme kesim zamanı olmalıdır. Aynı tenant/kayıt için `identity.accept` denetim izi yalnız bu kişiyi göstermelidir. Farklı kabul aktörü olan, sahipliği belirsiz, pending/claimed/failed/cancelled, süresi bitmemiş veya zamanı tutarsız satır seçilmez. İstek birime bağlı olmadığından açık kapsam kişinin **kurum geneli** tamamlanmış istekleridir; talebi açtığı etkin birim, talep/yanıt yetkisini sınırlar.

`privacy-response` içindeki yeni `local-login-cleanup` sonucu, hesap/tüm kapsam türündeki kendi talebine, ayrı birim yöneticisi tarafından mevcut MFA ve gerekçe/dayanak/akademik saklama ayrımıyla yazılır. Kurum adına atanmış resmî veri sorumlusu kabulü değildir. Eski `local-session-cleanup` yanıtı yeni silme yetkisi oluşturmaz.

`privacy-login-preview` yalnız sahibi/MFA ile, güncel bu yanıta bağlıdır. İd sıralı en çok 100 aday seçilir; toplam uygun sayı ayrıca tutulur. Kişi+tenant+kesim zamanı+toplam+adayların güvenlik alanları SHA-256 özetine bağlanır; ham state/browser hash veya istek listesi kullanıcıya verilmez. Önizleme sadece saklanır, silmez. SHA bir anonimleştirme iddiası değildir.

`privacy-login-cleanup`, aynı sahibin MFA ve `confirm:true` teyidini ister. Güncel yanıt, tanımlı sürüm, 15 dakikalık pencere, monoton işlem zamanı ve aynı kesim anındaki bütün aday özeti tekrar denetlenir. Aday veya toplam değişirse yeni önizleme gerekir. Boş önizleme silme kaydı üretmez. En çok 100 seçilmiş used satır silinir; sonuç, audit ve silme aynı `BEGIN IMMEDIATE` transaction'ındadır. Audit arızası silmeyi de geri alır. Aynı önizlemenin başarılı tekrarı önceki sonucu döndürür; MFA/kişi/birim/Vercel kapısı tekrar denetlenir. Sonraki 100 kayıt için yeni önizleme gerekir.

## Korunanlar

Oturum satırı, scope, sağlayıcı oturum bağı, session-link ailesi, logout makbuzu, HTTP anahtar epoch/history ve oran kovaları bu komutla değiştirilmez. Kişi/üyelik ve akademik kayıtlar korunur. Kabul denetim izi kalır. Silinmiş state ile callback yok-kayıt olarak reddedilir; yeni oturum üretmez. Bu durum bir kayıt imhası kanıtı veya bütün kimlik metadatasının kaldırılması değildir.

Özellikle iptal makbuzunun token süresi doldu diye silinmesi, eski ebeveyn bağlantısının yaşayan alt oturumdan koparılması ve anahtar history/checkpoint silinmesi desteklenmez. Eski yedekte pending challenge bulunan dağıtık geri yükleme güvenliği B27/B07'nin ayrı checkpoint kabulüdür; bu yerel temizlik onu tamamlamaz. Komut/audit sonuç kopyaları, kişiye atanmayan başarısız istekler, güvenlik zincirleri, yedekler ve dış sistemler için amaç/dayanak/süre/erişim kararları açık kalır.

## Arayüz ve özne özeti

Ayrı görevli yanıtından sonra sahibi aday sayısını görür; işaretlenmemiş zorunlu onay kutusunu teyit edip klavyeyle işlemi yapabilir. 100 sınırı, 15 dakika, kalan aday sayısı, boş önizleme ve talebin tamamının kapanmadığı gösterilir. Sonuç yenilemede kalır. Kişisel özet yeni önizleme/makbuz alanlarını izin listesiyle içerir; aday digest ve gizli giriş verileri dahil edilmez. Kaynak envanteri artık 14 tablo/122 tür ve 60 türde izinli alan özeti içerir; kurumun tam veri envanteri değildir.

## Kabul

8 yeni test: kesin aday/sahiplik, ayrı yanıt/alan/MFA/Vercel sınırları, stale/saat, audit rollback/tekrar, 100+1 satır, boş/kurulmamış depo, iki SQLite bağlantısı, gerçek imzalı loopback HTTPS kabul kaydının temizliği ve callback tekrarının reddi. HTTPS testinde süre sonu sentetik olarak kısaltıldı; sağlayıcı kabulü ve kişi/audit bağı gerçek yerel callback tarafından oluşturuldu. Gerçek üretim IdP veya PostgreSQL testi değildir.

Tam 557 sunucu +48 portal +46 regresyon =651 otomatik; 9 yeni temizlik +11 veri talebi +15 kimlik +13 itiraz =48 tarayıcı kontrolü geçti. 390 px görüntü incelendi. 113 komut/16 HTTP, 5229 olumlu örnekten 41832 negatif kapsam kontrolü; 115 korumalı statik dosya. İlk toplu koşuda Paket39 sentetik saatli testin IdP tarafının duvar saati kullanması yakalandı; fixture IdP/logout belirteçleri aynı enjekte edilen saati kullanacak şekilde düzeltildi. Üretim zaman doğrulaması/toleransı gevşetilmedi; tam koşu yeniden geçti.

Hukuki sınır ve 14.10.2026 okunmuş resmî KVKK kaynakları `DATA-INVENTORY-CONTRACT.md` ve `PRIVACY-CONTRACT.md` içinde kayıtlıdır. Bu teknik aday seçimi Gazi'nin hukuki süre kararı değildir. B28 kısmi; yeni canlı yayın yok. B01–B36 tamamlanmadı.
