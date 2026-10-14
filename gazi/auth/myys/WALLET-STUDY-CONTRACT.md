# B36 — cüzdan seçenekleri ve gerekçeli erteleme

Sürüm 2026.10.14.38 · 14 Ekim 2026 · yazılım paketi 38. Yalnız izole yerel kabul. Bu keşif modülü cüzdan protokolü, tedarik onayı veya üretim bağlantısı değildir.

B36'nın değişmeyen ölçütü: “Somut kullanıcı ihtiyacı ve alternatif kıyası onaylı; kişisel veri zincire yazılmıyor; açık protokol gerçek cüzdanda ihraç/doğrulama/iptal testi geçiyor.” Burada bağımsız yapılabilen ihtiyaç/alternatif/erteleme sözleşmesi ve ekranı tamamlandı. Gerçek kurum ihtiyacı onayı ve gerçek cüzdan testleri tamamlanmadı; B36 kısmi.

## Ekran ve işlem

`#/academic/walletStudy` — Cüzdan seçenekleri. Kişisel cüzdanım ile karşılıklı bağlantılıdır. Mevcut belge ve paylaşım kaydı korunur. Üç seçenek görünür:

| Seçenek | Mevcut durum | Karar sınırı |
|---|---|---|
| Mevcut özel cüzdan ve süreli paylaşım | B18/B19 yerel kabul dilimleri | Yerel dosya/özet paylaşımı dış ürün kabulü veya güncel çevrimiçi durum garantisi değildir. |
| Açık protokollü dış cüzdan | Yalnız keşif adayı | Ürün, credential biçimi/profil, kişi anahtarı bağı, güven ve durum kabulü seçilmedi. |
| Zincir kaydı | Ertelenmiş, yazma kapalı | Zincire kişisel veri, belge veya ilişkilendirilebilir özet gönderilmez; NFT/işlem/ağ bağlantısı yok. |

Yönetici kendi birimindeki incelenmiş program sürümüne açık ihtiyaç, ihtiyaç dayanağı, amaç ve seçenek kıyası hazırlar. Her seçenekte katkı, sınır, mahremiyet ve kalan kabul ayrı zorunludur. Amaç, incelenmiş veri akışı sicilindeki tam amaçla; yerel keşif yetkisi, tam yetki referansıyla eşleşir. Veri alıcısı `not-connected` olmalıdır. Bu siciller gerçek kurum kararı yerine geçmez.

Öneri yalnız `defer` veya `study-offchain` olabilir. Ertelemede seçenek seçilmez; zincirsiz keşifte yalnız mevcut özel cüzdan veya açık protokol seçilebilir. Gerçek protokolü etkinleştir, zincire gönder, kart/anahtar bağla veya cüzdana ihraç komutu yok. En geç 366 günlük gözden geçirme günü teknik yerel sınırdır; saklama süresi veya mevzuat hükmü değildir.

| Komut | Görev | Etki |
|---|---|---|
| wallet-study | Birim yöneticisi + MFA | Değişmez program/sicil/catalog sürümüne bağlı keşif kaydı |
| wallet-study-review | Ayrı IT teknik incelemesi ve ayrı kalite mahremiyet incelemesi | İki ayrı kişi, ayrı disiplin, aynı özet; yalnız yerel keşif kabulü/ret |
| wallet-study-hold | Hazırlayandan ayrı kalite + MFA | Güncel öneriyi durdurur; kayıtları veya belgeleri silmez |

Hazırlayan kendi kaydını inceleyemez. Bir kişinin iki rolü olsa bile iki disiplinin incelemesini tek başına tamamlayamaz. Ret yeni sürüm gerektirir. Yeni taslak eski önerinin güncel kullanımını kapatır; önceki kayıtlar değişmez. Yeni sürüme eski incelemeler aktarılmaz. Gözden geçirme günü geçmiş, durdurulmuş veya dayanağı değişmiş kayıt güncel sayılmaz; eski sürüme kendiliğinden dönüş yok.

## Gerçeklik ve veri sınırı

`institutionNeedApproved`, `externalWalletAccepted`, `externalTransportEnabled`, `chainWriteEnabled`, `onChainPersonalData`, `official` false kalır. Her kayıtta beş dış kabul kontrolü yalnız `not-run / realWallet=false` olarak bulunur: gerçek cüzdana ihraç, kişi bağlı sunum/doğrulama, iptal/askı ve güncel durum, yanlış alıcı/nonce/tekrar reddi, asgari veri/izin/saklama. Kullanıcı bunları form alanıyla başarılıya çeviremez. Bu liste tam standart uygunluk veya sertifikasyon kontrol listesi değildir.

Komutlar strict alan izin listesine sahiptir; ham credential, belge özeti, etkinleştirme veya test başarısı alanı reddedilir. Serbest gerekçelerin içeriğinin otomatik anonimleştirildiği iddia edilmez; bu içerikler de yalnız yetkili yerel keşif deposunda kalır, hiçbir dış transport çağrısı yoktur. Burada zincire kişisel veri yazılmaması teknik kapalı durumla sağlanır; hash'i kişisel olmayan veri ilan eden hukuki kural üretilmez.

IT/kalite/yönetici yalnız kendi birimindeki keşfi görür. Öğrenen yalnız kendi programının iki incelemesi uygun sürümlerini; kişisel hazırlayan kimliği, sicil özeti ve yetki referansı çıkarılmış görünümle görür. Görevi olmayan eğitici veya başka öğrenene açılmaz. Her işlemde güncel kişi/MFA/birim kontrolü, atomik idempotency+audit ve kayıt değişmezliği korunur. Akademik puan, karar, belge, paylaşım ve kredi defterine yazmaz.

## Resmî teknik kaynak kaydı

14.10.2026 okuması; aşağıdaki standartlar kurumsal ihtiyaç, Türk hukuk hükmü veya Gazi adına belge yetkisi değildir.

- **OpenID for Verifiable Credential Issuance 1.0 Final**, 16.09.2025: <https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-final.html>. Özet/kapsam, §13.7–13.8 ve §14.3–14.4 incelendi. Belge ihracı API'sini tanımlar; belge yaşam döngüsü, tekrar önleme ve issuer/biçim bağı ayrıca değerlendirilir. Mevcut yerel JWT paketi bu protokolü uyguluyor sayılmaz.
- **OpenID for Verifiable Presentations 1.0 Final**, 09.07.2025: <https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html>. Özet/kapsam ve §5.2 istek/nonce/sunum bağı incelendi. Sunum/doğrulama, ihraçtan ayrı gerçek cüzdan testi gerektirir. Yeni adapter uygulanmadı.
- **OpenID Foundation karşılıklı çalışma/uygunluk test duyurusu**, 07.08.2026: <https://openid.net/openid4vp-and-openid4vci-conformance-tests-are-complete-and-open-for-self-certification/>. Duyuru, HAIP ile kullanılan OpenID4VP/VCI test paketlerini ve öz sertifikasyonu ayrı anlatır. Bizim kod bu testleri çalıştırmadı; sertifika alınmadı ve ücretli işlem yapılmadı.
- Mevcut B19 yerel profilinin gerçek kapsamı `STATUS-EXPORT-CONTRACT.md`: ayrı güven sicili ve Python/OpenSSL doğrulaması; tam 1EdTech/OpenID ürünü sertifikasyonu değildir. İnceleme bu yerel kanıtı gerçek dış cüzdan yerine koymaz.

Teknik tasarım çıkarımı: önce ihtiyaç ve zincirsiz seçenekleri karşılaştır; gerçek seçilen ürün/biçim/profil/yaşam döngüsünü kabul etmeden yeni transport açma. Kaynaklar “blokzincir zorunlu” veya “her cüzdan uyumludur” sonucu üretmez.

## Kanıt ve kalan koşullar

Sekiz yeni sunucu testi: tam ihtiyaç/sicil/kıyas, kapalı zincir/dış test alanları, iki farklı incelemeci, ret/sürüm, süre/durdurma, erişim/MFA, tekrar/atomik hata ve üretim kapalılığı. On bir yerel React/HTTP tarayıcı kontrolü: iki inceleme, erteleme/zincirsiz keşif, sürüm/durdurma, kişi görünümü, özel cüzdan bağlantıları, indirme/arama/yenileme, değişmeyen karar arşivi ve 390 px klavye. Güncel toplu kanıt `acceptance/B36-wallet-study-20261014.json`.

Kurum ihtiyacı/alternatif kıyası onayı, B28 gerçek saklama ve veri kararı, B19 seçilecek gerçek cüzdan/format/profil, ihraç-doğrulama-iptal ve karşılıklı çalışma testleri açık. Genel geliştirme yetkisi yeni cüzdan hesabı/credential/ücretli sertifika veya üretim verisi aktarımı vermez. `ACCESS-ACTIONS.md` madde 13 somut bilgi hedefini belirtir. Koşullu özellik sessizce atlanmadı; kurum ihtiyacı onaylanana dek gerekçeli kapalı durum korunur.
