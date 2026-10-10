# B04 akış ve saklama sözleşmesi — 2026-10-10

Akış ve saklama ekranı, bağımsız inceleme ve sınırlı saklama işçisi yalnız izole yerel kabulde uygulanmıştır. Kurumsal saklama/aktarım onayı veya üretim temizliği değildir.

## Okunan resmî kaynaklar

- [ISO 3166 ülke kodları](https://www.iso.org/iso-3166-country-codes.html), 10.10.2026: alpha-2 kod amacı, ücretsiz kod kullanımı, resmen atanmış kodların OBP'de tutulması okundu. ISO standardının tam metni veya ücretli kod koleksiyonu alınmadı. Kod, hukuki aktarım izni değildir.
- [UNSD M49](https://unstats.un.org/unsd/methodology/m49/overview/), 10.10.2026: İngilizce 248 ülke/alan satırının ISO-alpha2 sütunu okundu; yalnız iki harfli olgusal kodlar retention-model.mjs'ye aktarıldı. Bu M49 kapsamıdır, bütün ISO kodlarının veya yeterli korumalı ülkelerin listesi değildir. Veri kaynağı sürümü koda yazıldı. Türkçe görüntüleme adları çalışma ortamının Intl çevirisidir.
- [KVKK Yurt Dışına Aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim), 10.10.2026: 2024 değişikliği, yeterlilik/uygun güvence/arızi istisna ayrımı okundu. Sayfa okuma anında yeterli koruma ülkesi belirlenmediğini bildiriyordu. Yerel ülke seçimi hiçbir yeterlilik, izin veya sözleşme imzası oluşturmaz; kurumun aktarım dayanağı ayrıca gerekir.
- [KVKK Standart Sözleşmeler](https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler), 10.10.2026: taraf rolleri için dört ayrı kategori görüldü: sorumlu-sorumlu, sorumlu-işleyen, işleyen-işleyen, işleyen-sorumlu. Sözleşmelerin bütün eki bu dilimde okunmadı ve imzalanmadı. Rol alanları bu ayrımı kaydeder; otomatik sözleşme/uygunluk kararı vermez.
- [05.02.2025 sözleşme duyurusu](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu): açma zaman aşımı; okunmamış hüküm uygulanmaz.

B28'in başvuru/yanıt/silme ayrımı kaynakları PRIVACY-CONTRACT.md içinde korunur. Gazi saklama süresi veya gerçek sağlayıcı ülkesi varsayılmadı.

## Uygulanan yerel sözleşme

Eski veri akışı sicilini değiştirmeden ona bağlı sürümlü akış ayrıntısı: ülke kodları, taraf rolleri, sağlayıcı ve ayrı davet/kullanıcı/ilerleme aşamaları, sayısal süre/başlangıç olayı, silme yöntemi, akademik saklama ayrımı ve dayanak. Bağımsız yerel admin incelemesi. Ülke/süre doğrulaması gerçek hukuk kabulü sayılmaz.

Saklama işçisi yalnız MYYS-local/session/expired-sessions hedefinde, süre dolumundan itibaren politika gün sayısını aşmış bu kurum/birimde tek üyelikli oturumları önizler. Kapsamsız veya çok birimli oturumları korur. Önizleme içerik özetiyle yeniden doğrulanıp ayrı BT kişisi tarafından tek transaction/audit içinde temizlenir; yeni politika veya değişen aday kümesi eski önizlemeyi geçersizleştirir. Akademik kayıt, kimlik, etkin oturum, dış hesap ve diğer kurum değişmez. Üretim ve fiziksel imha kapalıdır. Bu akış 10 sunucu senaryosu ve 12 tarayıcı kontrolünden geçti. B04 bütün kabulü kapanmadı; gerçek veri sorumlusu/sağlayıcı envanteri ve süre kararları gereklidir.


## Kabul ve sınırlar

- Her politika var olan veri akışı sicilinin değişmez içerik özetine bağlanır. Coursera davet/kullanıcı/ilerleme üç ayrı aşama ve kuraldır; bağlantı veya aktarım kurulmaz.
- 1–36500 gün teknik doğrulama sınırıdır, mevzuat süresi değildir. Ülke listesi yeterlilik kararı vermez. Dış akışlar yalnız sicil incelemesidir.
- Hazırlayan, bağımsız yönetici inceleyen ve BT temizleyen üç farklı kişidir. Güncel rol/MFA ve kurum/birim kapsamı her işlemde yeniden uygulanır. Yeni sürüm hazırlanır hazırlanmaz önceki sürümle temizleme kapanır.
- Önizleme silmez; en fazla 100 oturum seçer. 15 dakika işlem penceresi ve aday içerik özeti vardır. Denetim yazılamazsa silme de geri alınır. Tekrar aynı sonucu verir. Çok birimli, kapsamı belirsiz, etkin ve başka kurum oturumları korunur.
- Mantıksal oturum satırı temizliği fiziksel imha değildir. Akademik kayıt, kimlik, harici hesap ve yedekler değişmez.
- Kanıt: acceptance/B04-20261010.json; 214 sunucu + 46 portal + 46 regresyon = 306 otomatik test. 390 px inceleme ve ülke seçimi formunda taşma yok; rol/yenileme/kalıcılık ve istemci hata kontrolleri geçti. Ekran okuyucuyla insan kabulü ayrıca gerekir.
- Üretim depo/işçi, gerçek saklama kararları, sağlayıcı ülke/rol belgeleri ve fiziksel imha kabulü açıktır. configuredCore Vercel'de kapalıdır.
