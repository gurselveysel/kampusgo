# MYYS — 36 paket kabul matrisi

10 Ekim 2026. Her sütun bağımsızdır. “Kısmi” tam kabul, kurum onayı veya gerçek bağlantı anlamına gelmez. Ayrıntılı dosya/test/engel kanıtı `backlog.json` içindedir.

| Paket | Kod | Yerel kabul | Canlı | Kurum kararı | Dış erişim |
|---|---|---|---|---|---|
| B01 · Mevcut pilot envanterini sabitle | kısmi | kısmi | kısmi pilot | operasyonel kabul açık | bağımsız kod için gerekli değil |
| B02 · Akademik ve SEM yetki yollarını ayır | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B03 · Program bilgi paketini onayla | kısmi | kısmi · sürüm/arşiv dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B04 · Veri akışını ve saklamayı onayla | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B05 · İçerik ve sağlayıcı haklarını doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B06 · Kalıcı kişi ve üyelik modelini kur | kısmi | kısmi | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B07 · SSO ve yönetici MFA bağlantısını kur | kısmi; yerel imzalı iptal/oran bağlı | 99 kimlik testi, 15 HTTPS tarayıcı kontrolü | Paket25 canlı değil | IdP/MFA kabulü bekleniyor | üretim depo/anahtar adaptörü, dağıtık kabul ve IdP açık |
| B08 · Tenant ve görevler ayrılığını sınırla | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B09 · Program rubrik ve kanıtı sürümle | kısmi; imzalı kaynak/arşiv bağlı | 19 yeni test, 14 kaynak tarayıcı; bağımsız doğrulama | Paket26 canlı değil | kaynak yetki/usul kabulü açık | güven yaşam döngüsü, gerçek sağlayıcı/depo açık |
| B10 · Yetkili başarı kararını kalıcı yap | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B11 · İtiraz ve moderasyon yolunu kur | kısmi; bağımsız yerel dilim bağlı | yerel politika/değiştirme geçti | son iki dilim kaynakta; canlı kabul açık | usul/tebliğ/takvim/yetki bekleniyor | üretim kimlik/depo kabulü bekleniyor |
| B12 · Belgeyi akademik karara bağla | kısmi | kısmi | kısmi pilot | bekleniyor | bağımsız kod için gerekli değil |
| B13 · Anahtar ve durum güvenilirliğini doğrula | kısmi | kısmi | kısmi pilot | operasyonel kabul açık | teyit/erişim bekleniyor |
| B14 · LMS veri sözleşmesini onayla | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B15 · İlk LMS adaptörünü kabul et | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B16 · Olay kuyruğu ve idempotency kur | kısmi | kısmi · işçi/satır dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B17 · Toplu ihraç ve mutabakat ekle | kısmi | kısmi · işçi/satır dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B18 · Kişisel cüzdan ve paylaşım ekle | kısmi | kısmi · cüzdan dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B19 · Bağımsız belge taşımayı sınat | kısmi | kısmi | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B20 · Tanıma politika setini onayla | kısmi | kısmi · tanıma dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B21 · Dış belge ve tanıma akışını bağla | kısmi | kısmi · tanıma dilimi geçti | kod yayımlandı; kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B22 · OBS aktarımını kontrollü kabul et | kısmi | kısmi · outbox dilimi geçti | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B23 · SEM merkezi sürecini doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B24 · Erişilebilirlik açılış testini yap | kısmi | kısmi | kısmi pilot | operasyonel kabul açık | bağımsız kod için gerekli değil |
| B25 · İçeriği akademik ve lisans yönünden gözden geçir | kısmi | kısmi | kısmi pilot | bekleniyor | bağımsız kod için gerekli değil |
| B26 · Destek kılavuzu ve eğitimi güncelle | kısmi | kısmi | kısmi pilot | bekleniyor | bağımsız kod için gerekli değil |
| B27 · Olay ve geri yükleme provası yap | kısmi | yerel dilim doğrulandı | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B28 · Silme saklama ve çıkış haklarını sına | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B29 · Kalite göstergelerini gerçek veriye bağla | kısmi | kısmi | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B30 · Kontrollü kohortu aç ve değerlendir | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B31 · Ücretli hizmeti koşullu aç | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B32 · Çoklu birim ölçeğini kabul et | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B33 · Beceri grafını uzmanla doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B34 · İşveren portfolyo pilotunu aç | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B35 · Pilot AI araçlarını ayrı dene | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B36 · İsteğe bağlı gelişmiş cüzdan ve zinciri değerlendir | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |

## Sıradaki bağımsız işler

- B11: itiraz/sonuç arayüzü ve bağımsız yeniden değerlendirme bağlantısı kodlandı, 7 yeni test geçti. 9 çekirdek rol için 13 tarayıcı kontrolü geçti; imzalı belge değiştirme ve sürümlü politika açık.
- B06/B07: 29 doğrulayıcı + 27 akış testiyle yerel tek kullanımlık istek/PKCE/oturum/çıkış hazır. Gerçek HTTP callback, IdP, işlemsel kurum adaptörü ve dağıtık iptal açık.
- B16/B17: kalıcı işçi karantinası ve satır mutabakatı.
- B18/B20/B21: özel cüzdan arayüzü ve sürümlü tanıma/tekil kredi defteri.
- B28/B29/B30: veri talebi, kaynak sayımı ve ayrı kabul kapıları.
- B31/B33–B36: koşullu ödeme, uzman beceri eşlemesi, portfolyo ve modelden bağımsız öneri sözleşmeleri; dış servis etkinleştirilmez.

## Son kontrol

Paket 5 (`24b41c8dba48bfa261a51613fbbc3a83a7939f13`, `dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg`) READY / production. 206 otomatik test ve 13 izole B11 tarayıcı kontrolü geçti. Canlıda oturum, logolar, destek ve kapalı akademik görünüm doğrulandı. B06/B07 hazırlık kodu dağıtıldı; gerçek SSO, kurumsal destek ve akademik işlem etkin değildir. Bütün 36 satırın kurum ve dış erişim alanları ayrı tutulmaktadır.

## Paket 4 kabul güncellemesi

B11: 150 otomatik test ve 13 izole tarayıcı kontrolü geçti. Masaüstü 1440 px, mobil 390 px; kaynağı `acceptance/B11-20261010.json`. B11/B24 kısmi kalır; kurum, dış erişim, tam ekran okuyucu ve imzalı belge değiştirme kapıları kapanmadı. Yerel Chromium engeli giderildi. Yayın sonucu RELEASE.md içinde ayrı kaydedilir.

## B06/B07 hazırlık güncellemesi

`IDENTITY-CONTRACT.md` ve 29 yeni test imza, sağlayıcı, audience, nonce, MFA tazeliği ve kişi/üyelik okumasını kapsar. Yerel depo üretim adaptörü değildir; oturum yaratılmaz. Kod/yerel kabul kısmi; kurum ve dış erişim sütunları değişmez.

## Paket 5 kabul sonucu

206 otomatik test ve yeniden çalıştırılan 13 B11 tarayıcı kontrolü geçti. İki ayrı SQLite bağlantısıyla eşzamanlı tekrar denendi; bu dağıtık production testi değildir. B06/B07 kod/yerel kabul kısmi; kurumsal etkinleştirme kapalı. Paket 5 yayımlandı; kimlikler, canlı sınırlar ve geri dönüş RELEASE.md içinde.

## Paket 6 yerel kabul dilimi

B16/B17: kalıcı işçi, karantina inceleme ve CSV satır mutabakatı 15 yeni sunucu senaryosu ve 8 tarayıcı kontrolünden geçti. Toplam 221 otomatik test; 13 B11 tarayıcı kontrolü tekrarlandı. Kod/yerel kabul kısmi; gerçek LMS, dağıtık üretim işçisi, toplu imza/teslim ve kurum kabulü açık. Yayın sonucu ayrıca RELEASE.md içine işlenir. Kabul ölçütleri değiştirilmedi.

## Paket 7 adayı

B18 kişisel cüzdan, imzalı indirme, tek seferlik süreli bağlantı ve iptal: 9 yeni sunucu senaryosu ve 8 yerel tarayıcı kontrolü. Toplam 230 otomatik test. Canlı kamu paylaşım hizmeti açılmadı.


## Paket 8 adayı

B03/B09 çoklu görev/rubrik yazarlığı, arama, sürüm karşılaştırması ve karar dayanağı arşivi: 10 yeni sunucu senaryosu, 8 tarayıcı kontrolü. 240 otomatik test. İmzalı LMS arşivi ve kurum onayı açık; kabul ölçütleri değiştirilmedi. Paket 7 cüzdan kodu yayımlandı; kurumsal hizmet kapalı.


## Paket 9 adayı

B20/B21 politika sürümü, iki ayrı payda, öğrenci talebi, insan teknik incelemesi, ayrı tanıma kararı, itiraz ve tekil yerel kredi. 14 yeni sunucu senaryosu; 12 tarayıcı kontrolü; 254 otomatik test. Gerçek belge doğrulaması/teslimi, çok dersli teklif ve kurum kabulü açık. B03/B09 Paket 8 kod yayını doğrulandı.


## Paket 10 adayı

B22 karar kaynaklı outbox, yerel alındı, satır mutabakatı ve bağlı düzeltme/iptal; 11 yeni sunucu ve 11 yeni tarayıcı kontrolü. Toplam 265 otomatik test; B16/B17’nin 8 tarayıcı kontrolü yeniden geçti. Gerçek OBS, transkript/diploma eki ve dış test kabulü açık. Başlangıçla karşılaştırmada bütün B01–B36 kimlik/başlık/bağımlılık/kabul ölçütleri aynı.


## Paket 11 adayı — B28

Veri talepleri ekranı: kişisel özet, talep/ayrı gerekçeli yanıt/görüntüleme, cüzdan paylaşımını geri çekme, süresi dolmuş yerel oturum temizliği. 184 sunucu + 46 portal + 46 regresyon = 276 otomatik test; 11 tarayıcı kontrolü. 390 px taşma ve klavye seçimi geçti. Akademik kayıt/hesap silinmedi; resmî başvuru, tebligat ve fiziksel imha kabulü yok. B04/B28 açık koşullar PRIVACY-CONTRACT.md ve backlog.json içinde.


## Paket 12 adayı — B29

Başvurular, kaynaklı göstergeler ve cüzdan teslim teyidi. 194 sunucu + 46 portal + 46 regresyon = 286 otomatik test; 11 gösterge tarayıcı ve 8 cüzdan regresyon kontrolü. Başvuru-kabul-kayıt bağı, açık LMS tamamlama, ayrı başarı/teslim/destek paydaları, filtre ve kaynak CSV mutabakatı yerelde geçti. Gerçek kohort, LMS ve dış belge kabulü açık; bütün B29 kabulü kapanmadı.


## Paket 13 adayı — B30

Kontrollü grup kabulü ekranı: sürümlü plan, görev bazlı koşullar, ayrı üç inceleme, kaynak zinciri, kritik hata/bağımsız çözüm, yerel açılış ve dönem/kapanış. 204 sunucu + 46 portal + 46 regresyon = 296 otomatik test; 12 yeni tarayıcı kontrolü. Gerçek kurum grubu ve dönem gözlemi yapılmadı; bütün B30 kabulü kapanmadı. COHORT-CONTRACT.md sınırları ve backlog eksenleri güncel.


## Paket 14 adayı — B04

Akış ve saklama ekranı: sicile bağlı ülke/rol/aşama/süre, ayrı yönetici incelemesi, silmeden önizleme ve ayrı BT ile atomik yerel temizleme. 214 sunucu + 46 portal + 46 regresyon = 306 otomatik test; 12 tarayıcı kontrolü. Coursera aşamaları ayrıdır; ülke seçimi aktarım izni değildir. Gerçek saklama kararları, üretim işçisi ve fiziksel imha kabulü açık. Başlangıç B01–B36 kimlik/bağımlılık/kabul ölçütleri değişmedi.


## Paket 15 adayı — B06/B08

Kişi ve üyelik ekranı: süreli görev/geri çekme önerisi, ayrı yönetici incelemesi, sürüm özeti ve aynı kurum oturumlarının atomik iptali. Kurum bağı olmayan eski oturum reddedilir. 228 sunucu + 46 portal + 46 regresyon = 320 otomatik test; 11 yeni ve 13 B11 tarayıcı kontrolü. Akademik geçmiş ve başka kurumlar korunur. Gerçek kurum provizyonu/üretim depo/dağıtık iptal ve tam B08 birim matrisi açık; bütün paketler tamamlanmadı.


## Paket 16 adayı — B12

Belge profilleri ve ihraç hazırlığı: zorunlu program/karar/profil/ayrı yetki sicili bağı, süreli kişi ataması, ayrı komisyon incelemesi, sürüm ve durdurma. Sentetik rozet laboratuvarı açıklaması ve yetki alanı reddi eklendi. 240 sunucu + 46 portal + 46 regresyon = 332 otomatik test; 11 yeni profil, 13 itiraz, 8 cüzdan tarayıcı kontrolü. YÖK tam metnine tekrar erişilemedi; eski kamu özeti korundu. Gerçek kurum/issuer kabulü, üretim imza/durum ve bağımsız standart doğrulaması açık.

## Paket 17 adayı — B13

Anahtar ve belge durumu / Belge hazırlığı / Kişisel cüzdanım: açık anahtar, ayrı inceleme, imza, rotasyon, ele geçirilme ve ortak durum denetimi. 12 yeni güvenlik testi, 11 tarayıcı kontrolü; 252 sunucu + 46 portal + 46 regresyon = 344 otomatik test. Yerel rotasyon ve ele geçirilme prosedürü geçti. İmzalı durum listesi, B19 bağımsız doğrulama ve gerçek sağlayıcı işletim kabulü açık; B13 bütünü kapanmadı.

## Paket 18 adayı — B13/B19

Anahtar ve belge durumu / Kişisel cüzdanım: iki imzalı liste, ayrı açık güven sicili, kendi belge ve durum paketi. Python/OpenSSL bağımsız profilde geçerli/rotasyon/bozuk/yanlış issuer/süre/iptal/askı/gzip sınırları test edildi; 357 otomatik test. Eski imza değiştirilmedi. Gerçek dış cüzdan sertifikasyonu ve kurum durum servisi açık; canlı yayımlanmadı.

Paket 18 son yerel kanıt: 357 otomatik test; 16 durum/ihracat/Python-OpenSSL tarayıcı ve 8 cüzdan regresyon kontrolü geçti. 390 px görünüm incelendi. 36 özgün kimlik/başlık/bağımlılık/kabul ölçütü korundu.

## Paket 19 adayı — B11 imzalı belge zinciri

Belge hazırlığı ve özel cüzdan: öneri/ayrı inceleme/hazırlık/yeni imza/eski iptal; yeni olumsuz kararda belgesiz iptal; geri çekme ve tarihsel dosya bütünlüğü. 368 otomatik test, 17 yeni tarayıcı kontrolü. Sürümlü süre/etki politikası ve gerçek kurum kabulü açık; yeni dilim canlı yayımlanmadı.

Paket 19 son yerel kabul: 368 otomatik; 17 değiştirme, 11 profil, 13 itiraz, 8 cüzdan tarayıcı kontrolü geçti. 390 px görünüm incelendi; özgün 36 iş kimliği/bağımlılığı/kabulü korunuyor.

## Paket 20 adayı — B11 sürümlü politika (13.10.2026)

İtiraz politikaları, karara bağlı kaynak sürümü, tekil yerel teslim teyidi ve bağımsız süre gerekçesi ekranları. 384 otomatik + 13 politika + 13 itiraz + 17 değiştirme tarayıcı kontrolü. Kurum usulü ve gerçek tebliğ bağlı değildir; test sayısı tamamlanma yüzdesi değildir. Son canlı Paket 16; Paket 17–20 üretim yayını yok. Kanıt: `acceptance/B11-policy-20261013.json`.

## Paket 21 adayı — B07 HTTPS (13.10.2026)

Yerel giriş/oturum/çıkış/yeniden giriş ekranları aynı kişiyle akademik kayda bağlı. 403 otomatik + 11 HTTPS/ayrı-site + 13 itiraz tarayıcı kontrolü; cookie/Origin/CSRF ve yarışlar denetlendi. Gerçek kurum IdP/üretim depo/dağıtık iptal açık. Kaynak ve canlı durum RELEASE.md içinde ayrıdır.

## Paket 22 kaynak adayı — B08 (2026-10-13)

Yeni görünür ekran yok. Destek/veri talebi birim yetkisi ve saklama önizlemesi hataları düzeltildi. Mevcut 66 komut / 12 HTTP yolu; olumlu kayıtlardan 2.656 örnek / 21.248 kapsam kontrolü, 415 otomatik test geçti. Okuma, yeni işlem, idempotent tekrar, gerçek ihraç ve geçerli başka kurum oturumu ayrı sınandı. Meşru kişisel geçmiş/boş kurum/paylaşım/toplu satır istisnaları SCOPE-ACCEPTANCE-CONTRACT.md içinde açık. B08 gerçek görev ve üretim kabulü açık; kaynak adayı canlı yayın değildir.

Paket 22 ek yerel kanıt: 12 saklama + 11 veri talebi tarayıcı kontrolü geçti; 390 px saklama görünümü incelendi. 36 özgün iş kimliği/başlık/bağımlılık/kabul ölçütü korundu.

## Paket 23 kaynak adayı — B10/B08 (2026-10-13)

Öğrenme kanıtları ve Değerlendirmeler: alternatif ürün/yöntem kaydı, ayrı kalite incelemesi, gerekçeli ret/kabul, yeni sürüm, arama/filtre ve tarihsel dayanak etkisi. 428 otomatik, 15 yeni + 13 itiraz tarayıcı kontrolü; 390 px incelendi. 68 komut/12 HTTP kapsam matrisi geçti. Eksik/null/başarısız sonuç belgeye ilerlemez. Gerçek kurum yöntemi/yetki ve üretim kabulü açık; kaynak adayı canlı yayın değildir.

## Paket 24 kaynak adayı — B23/B08 (2026-10-14)

SEM dosyaları: iç kontrol listesi/kaynak kapsamı, eksik/düzeltme, sürüm, ayrı inceleme/aktarım hazırlığı, JSON indirme ve geri çekme. 440 otomatik; 13 SEM +13 itiraz tarayıcı, 390 px form incelendi. 72 komut/12 HTTP matrisi geçti. Merkezi onay, gönderim, düzenleyici teyidi ve yerel resmî SEM ihraç kapalı. Güncel YÖK/Gazi usul ve gerçek YÖKSİS kabulü açık; kaynak adayı canlı yayın değildir.

## Paket25 kaynak adayı — B07/B08 (14.10.2026)

Akademik panelin kapalı oturum/yeniden giriş davranışı sağlayıcı çıkışına bağlandı; yerel girişte Türkçe oran sınırı ekranı eklendi. İmzalı sub/sid iptali, kurum/issuer/audience sınırı, aynı jti tekrarı/çakışması, audit geri alma, gecikmiş callback ve başka tenant tarayıcı bağı denetlendi. 372+46+46=464 otomatik; 15 gerçek yerel HTTPS tarayıcı kontrolü geçti. 72 akademik komut/12 HTTP matrisi: 2945 pozitif örnek, 23560 türetilmiş kontrol; ayrı test veya tamamlanma oranı değildir. `acceptance/B07-backchannel-20261014.json`. Üretim transaction/anahtar adaptörü ve dağıtık kabul hâlâ bağımsız açıktır; gerçek IdP/MFA/kurum saklama/erişim ayrıca gerekir. Son canlı Paket16; Paket17–25 dağıtımı yok. B01–B36 bütünü tamamlanmadı.

## Paket26 kaynak adayı — B09/B15/B16/B08 (14.10.2026)

Aktarım ve mutabakat ekranında Türkçe imzalı dosya seçimi, 202 kabulü, ayrı kuyruk işleme ve açık güven kaydı indirme eklendi. İşlenmiş kanıt eğiticiye açılır; insan rubriği/ayrı karar/öğrenci arşivi aynı zincirdedir. Kaynak düzeltmesi eski karar arşivini değiştirmez. Bağımsız Python/OpenSSL kaynak imzasını ve rubrik hesabını doğrular; karar zarfı imzasızdır, güncel uygunluk iddiası yoktur. 391+46+46=483 otomatik, 14 kaynak +13 itiraz tarayıcı; 72 komut/15 HTTP, 3086 örnek/24688 kontrol. `acceptance/B09-source-20261014.json`. Kaynak güven sicili/iptal yaşam döngüsü hâlâ bağımsız açık; gerçek sağlayıcı ve kurum kabulü ayrıca açık. Son canlı Paket16; Paket17–26 dağıtımı yok.

## Paket27 kaynak adayı — B27/B07/B13/B16/B08 (14.10.2026)

Kurtarma tatbikatları ekranı: plan → sunucu sentetik provası → ölçüm/indirme → ayrı yönetici incelemesi. Eski/bozuk yedek, oturum/iptal, kesilen kuyruk/tek makbuz, riskli anahtar/yanlış ihraç ve tarihsel arşiv birlikte doğrulandı. 403+46+46=495 otomatik; 13 tatbikat +14 kaynak +13 itiraz tarayıcı; 74 komut/16 HTTP, 3128 örnek/25024 kontrol. 390 px form incelendi. Gerçek RPO/RTO, üretim adaptörleri ve dağıtık geri dönüş açık; kaynak yayını canlı yayın değildir. Son canlı Paket16; 17–27 dağıtımı yok.

`RECOVERY-CONTRACT.md` ve `acceptance/B27-recovery-20261014.json` sınırlar/kanıtlar. configuredCore kapalı. Korunan 115 dosyalı paket üretildi; başarısız veya doğrulanmamış dağıtım yapılmış sayılmadı. Canlı alias 14.10.2026 yeniden dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1, uygulanmadı.

## Paket28 kaynak adayı — B09/B15/B16/B13/B08 (14.10.2026)

Kaynak güven sicili: sürüm/tarih/dayanak, ayrı ret-kabul, açık güven dosyası ihracı, anahtar/kontrat kapanışı. İptal mevcut kanıt/karar/cüzdan/paylaşım/durum uygunluğuna yayılır; tarihsel arşiv aynı kalır. Eski statik kayda geriye dönük onay eklenmez; yeni incelemeli imzalı sürüm gerekir. 418+46+46=510 otomatik; 15 yeni sunucu testi, 14 güven sicili +14 kaynak +13 tatbikat +13 itiraz tarayıcı. 77 komut/16 HTTP: 3337 örnek/26696 denetim. 390 px görünüm ve odak incelendi; 115 korumalı statik dosya paketlendi. Kaynak adayı canlı yayın değildir; son canlı Paket16, Paket17–28 dağıtımı yok. Gerçek sağlayıcı, üretim adaptörü, kurumsal karar ve dış kabul açık.

`SOURCE-TRUST-CONTRACT.md` ve `acceptance/B09-trust-20261014.json`. configuredCore Vercel üzerinde kapalı; yeni credential, migration veya gerçek belge işlemi yok. Geri dönüş hedefi dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1; uygulanmadı.


## Paket29 — B07 işlem/anahtar sınırı, yerel ve kısmi

Görünür ekran değişikliği yok; yeni SQL/KMS/HTTP bağlantısı yok. 20 hata sürücüsü testi; 530 otomatik, mevcut HTTPS akışında 15 tarayıcı. 77 komut/16 HTTP kapsam sayıları değişmedi. Tek-client transaction, rollback/COMMIT belirsizliği ve sürümlü PKCE/nonce MAC doğrulandı. Gerçek PostgreSQL/RLS/KMS, SQL repository/HTTP ve atomik anahtar revizyon bariyeri açık. Kanıt: IDENTITY-ADAPTER-CONTRACT.md / acceptance/B07-adapters-20261014.json. B07 ve bütün B01–B36 tamamlandı denmez.


## Paket30 — B15 kaynak ders kaydı/ilerleme yerel dilimi

Aktarım ve mutabakat içinde aynı kişi/program/kaynak kaydı, tamamlama ve görev notu gösterilir; kayıt iptali eski kanıtı kapatır, yeniden kayıt eski notu canlandırmaz.11yeni sunucu +15yeni kayıt/ilerleme tarayıcı;14kaynak/14güven regresyonu.541otomatik;77komut/16HTTP3441örnek27528türetilmiş kontrol. B15 sağlayıcı bağımsız senaryolar kapandı; gerçek vendor şeması, kohort/worker/depo/dış kabul açık. B16/B29 aynı kayıt/güven uygunluğunu kullanır. B24 manuel ekran okuyucu kabulü açık. Kanıt LMS-REGISTRATION-CONTRACT.md ve acceptance/B15-registration-20261014.json.

## 14.10.2026 — B01/B24 gezinme ve özgün envanter (31. yazılım dilimi)

Özgün 27 Gazi satırı/13 kaynak kaydı aynen korundu ve güncel rota/davranış/test/açık koşula bağlandı. Menü/modal odağı, sekmeler, filtre ve alan adları düzeltildi; öğrenci katalog öneri düğmesi yetkiye göre gösterilir. 544 otomatik;18 gezinme+13 itiraz+8 cüzdan tarayıcı geçti. 98 hedef/11 sunum profili,234 panel/9 çekirdek rol,66 ders ve gerçek yerel indirme ayrı kabul kapsamıdır.

| Paket | Kod | Yerel kabul | Canlı | Kurum | Dış erişim |
|---|---|---|---|---|---|
| B01 | 27 satır envanteri/regresyon listesi hazır | Eşleme, korunacak sayılar ve gezinme geçti; bütün özellik kriterleri değil | Paketi31 yok; son canlı16 | Gerçek operasyonel kabul açık | Ayrı site/LMS/OBS/IdP kabulü açık |
| B24 | Menü/pencere/sekme/alan düzeltmeleri hazır | Sınırlı tarama geçti; ekran okuyucu/altyazı/belge ve bütün form/modal koşulları açık | Yeni dilim yok | Erişilebilirlik açılış kabulü açık | Gerçek sağlayıcı medya ve canlı oturum kabulü açık |

PILOT-INVENTORY.md, NAVIGATION-ACCESSIBILITY.md ve acceptance/B01-B24-navigation-20261014.json esas kanıttır. Backlog üst metadata alanlarındaki eski5–7 paket özeti tarihçe korunarak güncellendi; en son canlı16 bilgisi yeni girişli smoke diye sunulmadı.
