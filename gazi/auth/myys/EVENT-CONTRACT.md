# Olay ve toplu satır sözleşmesi

Sürüm: local-2026.10.10.1. Kapsam: izole yerel kabul; GUZEM veya UzemGO sağlayıcı sözleşmesi değildir.

| Dayanak | Sürüm / erişim | Uygulama | Sınır |
|---|---|---|---|
| https://www.rfc-editor.org/rfc/rfc9110.html §15.3.3, §15.5.10 | Haziran 2022 / 10.10.2026 | Kabul/işleme ayrı; çakışma kör tekrar edilmez | Gerçek webhook veya kurum API kabulü yok |
| https://www.sqlite.org/lang_transaction.html | 10.10.2026 erişimi | BEGIN IMMEDIATE; claim, alındı, denetim atomik sınırları | Yerel SQLite; dağıtık PostgreSQL kabulü değil |
| https://www.rfc-editor.org/rfc/rfc4180.html §2 | Ekim 2005, Informational / 10.10.2026 | Tırnak/virgül/CRLF, iki sütunlu CSV | UTF-8/BOM ve formül etkisizleştirme uygulama tercihidir |

Üstel yeniden deneme ve 3 deneme sınırı yerel test varsayılanıdır; üniversite SLA'sı değildir. Olay verisi akademik karar üretmez. Not düzeltmesi ve lisans iptali eski kanıtın kullanılmasını engeller. Karantina eski olayı serbest bırakmaz; kaynak düzeltmesi yeni sürümle gelmelidir.

Toplu satır durumları: gönderilen, ön doğrulamayı geçen, sonucu kaydedilen, reddedilen, hazırlanan, imzalanan, teslim edilen. İmza yalnız mevcut imzalı kayda dayanır; teslim adaptörü bağlı olmadığından teslim 0 kalır. Satır sonuçları değişmez. Yetki her işlem ve tekrarda yeniden okunur. İmza/teslim, gerçek sağlayıcı ve üretim depo etkinleştirmesi ayrıca kabul gerektirir.
