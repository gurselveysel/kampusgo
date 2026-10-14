# Kişi ve sunum profili ayrımı — 14.10.2026

Paket70, B06/B07 kişi ve oturum zincirinin arayüz tutarlılığı ile B24'ün yerel klavye/mobil dilimidir. B23 SEM kabulünün yerine geçmez. B01–B36'nın özgün kimlikleri ve kabul şartları değiştirilmez.

## Kullanıcı davranışı

Üst panelin altındaki “Oturum kişisi” alanı, imzalı yerel kurum girişinden sonra sunucunun kişi kimliğini, kurumunu, birim/rollerini ve oturum sonunu gösterir. Sunucuda doğrulanmış ad-soyad alanı bulunmadığından isim uydurulmaz. “Sunum profili” menüsündeki 11 örnek profil korunur; seçim yalnız örnek ekranları değiştirir. Örnek bildirimler açıkça etiketlidir. Akademik alan dışındaki kaynak özetleri ve tarayıcı taslakları oturum kişisinin kurumsal kaydı gibi sunulmaz.

Gerçek rol ve işlem yetkisi sunucudaki güncel kimlik/üyelik/oturumdan gelir. Üst panel, sessionStorage'daki sunum seçimi ve istemci durumu yetki kaynağı değildir. SQL kişisiyle akademik kaydın sahibi aynıdır; bu çalışma kalıcı bir ad-soyad rehberi veya üretim IdP bağlantısı oluşturmaz.

## İstek ve durum yaşam döngüsü

`myys-client.mjs` yalnız aynı kökten `/api/myys/` isteklerini gönderir. Aynı sekmenin istekleri yanıt gövdesi tamamlanana kadar sırada tutulur. Bunun nedeni birleşik SQL/akademik checkpoint'in kalıcı rezervasyonudur. Başlatılmış fetch isteği, çağıran bileşen ayrıldığı için erkenden bırakılmaz: sunucu işlemi hâlâ çalışıyor olabilir. Sırada iptal edilen istek hiç gönderilmez; çalışan isteğin sonucu tüketildikten sonra iptal çağırana bildirilir. Yazma isteği kendiliğinden tekrarlanmaz. Belirsiz yanıt başarı sayılmaz.

CSRF yalnız modül belleğinde tutulur; oturum belirteci HttpOnly çerezdedir. React'e sunulan değişmez özet yalnız kişi/kurum/üyelik/süre/kapsam içerir. Yerel ve SQL yerel kapsamları dışında, eksik/uyuşmayan kişi, bilinmeyen rol, süresi bitmiş veya 15 dakikayı aşan metadata doğrulanmış gösterilmez. Kurumsal yetki yine sunucudadır; tarayıcı saati yalnız görüntü kapatmayı sağlar.

Aktif görünen sekmede en çok 60 saniyelik aralıkla oturum yeniden okunur; sekme görünür olup odaklandığında kapalı oturum da tekrar kontrol edilir. Aynı anda başlayan oturum okumaları birleştirilir. Süre dolunca kişi/CSRF temizlenir. 401, çıkış, bağlantı/yanıt hatası, kimlik güvenliği hatası ve checkpoint uyuşmazlığı eski gösterimi kapatır. Başka sekmede imzalı giriş kişisi değişirse önceki akademik veri kapanır; “Yenile” yeni kişinin kayıtlarını getirir. Checkpoint hatasında kendiliğinden yeniden giriş/onarım veya bekleyen rezervasyonu sıfırlama yapılmaz.

Bu sıra yalnız aynı sekmenin arayüz isteklerini düzenler; dağıtık kilit, çok istemcili çalışma garantisi, sunucu yetki kontrolü veya checkpoint kurtarma mekanizmasının yerine geçmez. Başka istemcilerle çakışma sunucunun güvenli kapalı sonucunu korur. Gözlem aralığı boyunca revokasyonun ekrana yansıması gecikebilir; her gerçek işlem güncel sunucu denetiminden geçer.

## Kabul ve sınırlar

Kanıt: `acceptance/B06-B07-B24-session-display-20261014.json`. Testler derlenmiş React, gerçek loopback HTTPS, ayrı sentetik IdP, gerçek SQL kişi/üyelik ve birleşik kalıcı checkpoint kullanır. Kullanıcı hesabı/parolası, gerçek öğrenci veya kurum kararı kullanılmaz. 320 CSS px ve metin aralığı incelemesi tam ekran okuyucu/WCAG kabulü değildir.

Son canlı yayın16'dır. Paket70 kaynak/yerel kabul çalışmasıdır; üretim dağıtımı ve kimlikli canlı smoke değildir. `configuredCore()` kapalı kalır. Üretim IdP, ad-soyad kaynağı, kurum görevlendirmesi, kalıcı erişim, native SSI/RLS ve dağıtık iptal kabulü açıktır. Mevcut14 SQL komut dışındaki122 akademik komutun taşınması ayrı çalışma olarak sürer.
