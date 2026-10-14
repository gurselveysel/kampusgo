# MYYS — 36 paket kabul matrisi

10 Ekim 2026. Her sütun bağımsızdır. “Kısmi” tam kabul, kurum onayı veya gerçek bağlantı anlamına gelmez. Ayrıntılı dosya/test/engel kanıtı `backlog.json` içindedir.

| Paket | Kod | Yerel kabul | Canlı | Kurum kararı | Dış erişim |
|---|---|---|---|---|---|
| B01 · Mevcut pilot envanterini sabitle | kısmi | kısmi | kısmi pilot | operasyonel kabul açık | bağımsız kod için gerekli değil |
| B02 · Akademik ve SEM yetki yollarını ayır | kısmi; belge ekli yerel dosya bağlı | 13 yeni test ve 13 yeni tarayıcı; profil bağı geçti | Paket42 canlı değil | gerçek Senato/SEM/görev/süre kabulü açık | tam usul, dosya deposu/tarama/e-imza kabulü açık |
| B03 · Program bilgi paketini onayla | kısmi; program/profil/yetki paketi bağlı | 8 yeni test, 9 yeni tarayıcı; güncel indirme geçti | Paket43 canlı değil | gerçek program/lisans/kurum yayını kabulü açık | bağımsız kod için gerekli değil |
| B04 · Veri akışını ve saklamayı onayla | kısmi; güncel kaynak envanteri16tablo/148tür | yerel kapsam/özne özeti geçti; kurum alan kabulü değil | yeni envanter dilimleri canlı değil | kurum alan/dayanak/süre/ülke/alıcı kararı açık | üretim saklama/işçi ve yedek imhası açık |
| B05 · İçerik ve sağlayıcı haklarını doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B06 · Kalıcı kişi ve üyelik modelini kur | kısmi; Paket55 SQL kişi/üyelik/oturum/iptal bağlı |21 yeni imzalı SQL testi;15 mevcut kimlik tarayıcı; tek bağlantı | Paket55 canlı değil | gerçek kaynak/IdP/MFA/control-plane açık | HTTP/akademik SQL, çok bağlantı/RLS/KMS/checkpoint açık |
| B07 · SSO ve yönetici MFA bağlantısını kur | kısmi; Paket55 SQL kişi/üyelik/oturum/iptal bağlı |21 yeni imzalı SQL testi;15 mevcut kimlik tarayıcı; tek bağlantı | Paket55 canlı değil | gerçek kaynak/IdP/MFA/control-plane açık | HTTP/akademik SQL, çok bağlantı/RLS/KMS/checkpoint açık |
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
| B21 · Dış belge ve tanıma akışını bağla | kısmi; imza/insan raporu/tekil kredi/karar sürümü bağlı | Paket52:6 yeni sunucu,68 tarayıcı; tanımlı dilim geçti | Paket52 canlı değil | gerçek teslim/usul/çıktı/önceki ders/kurul kabulü açık | gerçek issuer/status/schema ve üretim kabulü açık |
| B22 · OBS aktarımını kontrollü kabul et | kısmi; kaynak güveni ve iptal düzeltmesi bağlı | Paket50 bağlı zincir ve11 OBS tarayıcı geçti | Paket50 canlı değil | operasyonel kabul açık | gerçek OBS şeması/transkript/diploma eki/işçi kabulü açık |
| B23 · SEM merkezi sürecini doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B24 · Erişilebilirlik açılış testini yap | kısmi; gezinme/dosya/yeniden akış bağlı | Paket57:66 tarayıcı;320px/metin aralığı dilimi geçti | Paket57 canlı değil | gerçek AT/altyazı/çıktı/karşıtlık ve kritik engel sıfır kabulü açık | canlı kimlikli kabul açık |
| B25 · İçeriği akademik ve lisans yönünden gözden geçir | kısmi | kısmi | kısmi pilot | bekleniyor | bağımsız kod için gerekli değil |
| B26 · Destek kılavuzu ve eğitimi güncelle | kısmi | kısmi | kısmi pilot | bekleniyor | bağımsız kod için gerekli değil |
| B27 · Olay ve geri yükleme provası yap | kısmi | yerel dilim doğrulandı | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B28 · Silme saklama ve çıkış haklarını sına | kısmi; envanter, özne özeti ve sınırlı giriş isteği temizliği | 8 yeni test, 48 tarayıcı kontrolü | Paket41 canlı değil | dayanak/süre/başvuru usulü bekleniyor | tam silme, güvenlik checkpoint, yedek ve dış hesap kabulü açık |
| B29 · Kalite göstergelerini gerçek veriye bağla | kısmi | kısmi | kurumsal etkinleştirme kapalı | operasyonel kabul açık | teyit/erişim bekleniyor |
| B30 · Kontrollü kohortu aç ve değerlendir | engelli | başlamadı | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B31 · Ücretli hizmeti koşullu aç | kısmi; Paket33 yerel mali simülatör hazır |16mali tarayıcı; yerel iade/itiraz/mutabakat geçti | Paket33 canlı değil | ücret/tahsilat/iade yetkisi ve uygulanabilirlik açık | gerçek PSP/settlement/vergi-fatura kabulü koşullu açık |
| B32 · Çoklu birim ölçeğini kabul et | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | bağımsız kod için gerekli değil |
| B33 · Beceri grafını uzmanla doğrula | kısmi | kısmi | kurumsal etkinleştirme kapalı | bekleniyor | teyit/erişim bekleniyor |
| B34 · İşveren portfolyo pilotunu aç | kısmi; Paket36 dar amaçlı izin/geri bildirim bağlı |11sunucu ve14tarayıcı dilimi geçti | Paket36 canlı değil | gerçek amaç/alıcı/veri/izin kararı açık | gerçek alıcı kimliği, üretim depo ve dış kabul açık |
| B35 · Pilot AI araçlarını ayrı dene | kısmi; sentetik öneri/kıyas/itiraz bağlı | 13 sunucu + 13 tarayıcı; tanımlı dilim geçti | Paket37 canlı değil | sağlayıcı/veri/içerik/pilot yetkisi açık | gerçek model-plan-Türkçe pilotu ve üretim depo açık |
| B36 · İsteğe bağlı gelişmiş cüzdan ve zinciri değerlendir | kısmi; bağımsız alternatif/erteleme dilimi hazır | 8 sunucu + 11 tarayıcı; tanımlı dilim geçti | Paket38 canlı değil | somut ihtiyaç/alternatif kararı açık | gerçek cüzdan/protokol ihraç-doğrulama-iptal açık |

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

## Paket32 — B26 destek hizmet kuralı ve rehber

Destek kayıtları: arama/filtre, çalışma aralığı hedefleri, sürümlü yönetici hazırlığı/ayrı kalite incelemesi, sahip kapanış teyidi ve yeni döngüde yeniden açma. Dokuz rol kendi kaydını açıp indirdi; teknik destek akademik kaydı değiştirmedi. Rehber2026.10.14.1 bilinen önceki yanıtları korur ve doğru sekmelere bağlanır. 559 otomatik;16 destek+19 gezinme+13 itiraz+8 cüzdan,80 komut/16HTTP kapsam kabulü. Yeni içerikte seçilmiş odağı geçiş animasyonunun çalması düzeltildi. `SUPPORT-SERVICE-CONTRACT.md` ve `acceptance/B26-support-service-20261014.json` kapsamı esas. B26 yerel ölçütleri geçti; gerçek destek sahibi/hedef/takvim/eskalasyon/saklama/eğitim, kurumsal kimlik/depo ve canlı yayın açık. B24 gerçek ekran okuyucu/bütün içerik kabulü açık. Son canlı16;17–32 yayımlanmadı.

## Paket33 — B31 koşullu mali prova

Finans menüsünden Mali prova ve mutabakat: aynı kişi/program/sicil bağlı koşul ve ayrı mali inceleme; tekil belirteç, bekleyen/başarılı/başarısız/çift olay, kısmi/tam iade ve sonradan düzeltme, ters ibraz ve tam dayanaklı mutabakat. 572otomatik,16mali+19gezinme+13itiraz;87komut/16HTTP3752örnek30016kapsam kontrolü. Gerçek kart/para/PSP yok; belirteç yerel referans. B31 teknik simülatör kabulü geçti, tahsilat/vergi/iade ve B02/B04/B05 kurum kararları, gerçek PSP/adaptör/settlement/sandbox ve canlı kabul açık. `PAYMENT-CONTRACT.md` ve `acceptance/B31-payment-20261014.json` esas. Son canlı16;17–33yayın yok.

## Paket34 — B32 yerel kapasite kabulü (14.10.2026)

Birim kapasitesi sekmesi: iki birimde ayrı görev/MFA, ilk grubun sabit program/sürüm dayanağı, kayıt/kuyruk/satır kotası, eski işin korunması, güvenlik iptali muafiyeti, yetkili özet/arama/sürüm.11sunucu+14kapasite tarayıcı;489+48+46=583otomatik.19gezinme/12grup/15ders kaydı/13itiraz regresyonu;90komut/16HTTP4194örnek33552türetilmiş denetim. Bunlar paket tamamlanma yüzdesi değildir.

| B32 ekseni | Durum |
|---|---|
| Kod | Tanımlı bağımsız yerel kapasite dilimi hazır; üretim bağlama kısmi |
| Yerel işlev/güvenlik | İkinci birim/başka kurum, issuer/rapor/rol negatifleri; ilk kayıt/imzalı belge özeti korundu |
| Canlı | Paket34 yayımlanmadı; son canlı16 |
| Kurum kararı | Gerçek ilk kohort ve ikinci birim katılım/issuer/kota kararı açık |
| Dış erişim | Üretim depo/RLS/işçi/dağıtık yük ve gerçek rapor kabulü açık |

`CAPACITY-CONTRACT.md` ve `acceptance/B32-capacity-20261014.json` ayrıntılı kanıttır. Özgün36işin kimlik, bağımlılık ve kabul ölçütleri değişmedi.

## Paket35 — B33 yerel beceri eşlemesi (14.10.2026)

Beceri ilişkileri: program/kaynak/lisans/görevlendirme sicili, atanmış ayrı satır incelemesi, çoktan çoğa ilişki, hedef-gelişen-yerel kanıtlı durum, öğrenen bildirimi/düzeltme sürümü/kalite durdurma.11yeni sunucu/14eşleme tarayıcı;500+48+46=594otomatik;19gezinme/13itiraz;94komut/16HTTP4386örnek35088türetilmiş denetim.

| B33 ekseni | Durum |
|---|---|
| Kod | Tanımlı bağımsız eşleme/inceleme/düzeltme dilimi hazır; üretim bağlama kısmi |
| Yerel işlev/güvenlik | Rol/kurum/birim/kişi ayrımı, inceleme yarışı, hata/düzeltme, karar arşivi SHA korunması geçti |
| Canlı | Paket35 yayımlanmadı; son canlı16 |
| Kurum kararı | Gerçek uzman ataması, taksonomi/çeviri hakkı ve temsilî akademik örneklem açık |
| Dış erişim | Seçili gerçek taksonomi paketi, B29 gerçek kaynak, üretim depo/kimlik kabulü açık |

SKILL-MAP-CONTRACT.md ve B33-skill-map-20261014.json sınırları esastır. Gerçek kurumsal taksonomi onayı false kalır; özgün36işin kriterleri değiştirilmedi.

## Paket36 — B34 amaçlı portfolyo (14.10.2026)

Amaçlı portfolyo: veri akışı/alıcı/amaç sürümü ve ayrı inceleme, seçili içerik için açık öğrenen izni, alıcı amaç teyidi, nottan ayrı geri bildirim, bireysel/toplu geri çekme.11yeni sunucu/14portfolyo tarayıcı;511+48+46=605otomatik;19gezinme/11veri talebi/8cüzdan/13itiraz;101komut/16HTTP4674örnek37392türetilmiş denetim.

| B34 ekseni | Durum |
|---|---|
| Kod | Tanımlı bağımsız izin/amaç/alıcı/geri bildirim dilimi hazır; üretim bağlama kısmi |
| Yerel işlev/güvenlik | İzin yokken içerik kapalı; amaç/kişi/birim/kurum/MFA/süre/sürüm/geri çekme ve arşiv SHA korundu |
| Canlı | Paket36 yayımlanmadı; son canlı16 |
| Kurum kararı | Gerçek alıcı/amaç/veri işleme-saklama/aktarım ve öğrenen bilgilendirme-izin usulü açık |
| Dış erişim | Gerçek işveren kimliği ve pilotu; üretim kimlik/depo kabulü açık |

PORTFOLIO-CONTRACT.md ve B34-portfolio-20261014.json sınırları esastır. Yazılım dilimi36, iş paketiB36'nın veya bütün36işin bittiği anlamına gelmez. Özgün kriterler değişmedi.

## 14.10.2026 — B35 bağımsız öneri ve uzman kıyası dilimi

Öneri ve uzman kıyası sekmesinde protokol/ayrı inceleme, sabit insan değerlendirmesine bağlı elle girilen sentetik öneri, atanmış uzman kıyası, öğrenen itirazı ve ayrı düzeltme/geri çekme bağlı. Akademik karar arşivi korunuyor. 13 yeni sunucu, 13 yeni tarayıcı; 524+48+46=618 otomatik ve 56 tarayıcı kontrolü. 108 komut/16 HTTP kapsam matrisi güncel. Sayılar ürün tamamlanma yüzdesi değildir.

Gerçek model, sağlayıcı planı, Türkçe pilot başarısı ve kurum/veri-içerik hakkı doğrulanmadı. B35 kısmi; Paket37 canlı değil. `ADVICE-CONTRACT.md` ve `acceptance/B35-advice-20261014.json`.

## 14.10.2026 — B36 bağımsız seçenek kıyası ve erteleme

Cüzdan seçenekleri sekmesi özel cüzdanla bağlantılıdır. Mevcut özel cüzdan, açık protokollü dış cüzdan ve zincir için ihtiyaç/katkı/sınır/mahremiyet/kalan kabul kaydı; ayrı teknik ve kalite incelemesi, erteleme/zincirsiz keşif, yeni sürüm ve durdurma. Hiçbir onay gerçek cüzdan bağlantısı açmaz veya dış testleri başarılı yapmaz.

8 yeni sunucu ve 11 yeni tarayıcı; toplam532+48+46=626 otomatik,51tarayıcı.111komut/16HTTP kapsamı güncel; ürün tamamlanma yüzdesi değildir. Kurum ihtiyacı onayı, B19/B28gerçek kabulü ve dış cüzdan ihraç/doğrulama/iptal testleri açık. `WALLET-STUDY-CONTRACT.md` ve B36JSON.

## Paket39 — yerel giriş anahtarı dönüşümü

634 otomatik test; 28 tarayıcı regresyonu. Yerel CSRF/oran bütçesi yeni anahtarla sıfırlanmaz; etkin yeni sürüm eski işçiyi kapatır. Eski işçiler boşaltılmadan kesin geçiş süresi yoktur. HTTP başlangıç denetimi, atomik PKCE/nonce session-commit bariyeri değildir. `HTTP-KEY-ROTATION-CONTRACT.md` ve B07 kabul JSON’u ayrıntıdır. B07 beş eksende açık; yeni canlı yayın yok.

## Paket40 — veri kapsamı ve özne özeti

643 otomatik, 52 tarayıcı kontrolü. 14 teknik tablo/120 tür kaynak envanteri; 58 tür için izinli alan özeti, sekiz kategori. Destek/mali prova/tanıma/OBS ve alıcı ayrımı aynı kişi zincirinde. Kaynak envanteri tam kurum alan envanteri değildir; süre/dayanak veya tam hesap silmesi kabulü kapanmadı. `DATA-INVENTORY-CONTRACT.md` ve B04-B28 kabul JSON’u ayrıntıdır. Yeni canlı yayın yok.

## Paket41 — sahipli tamamlanmış giriş isteği temizliği

651 otomatik ve 48 tarayıcı kontrolü. Ayrı kapsamlı yanıt, sahibi/MFA, ençok100 adayın özetli önizlemesi, 15dakika ve açık teyit. Giriş devamı/iptal/aile/anahtar/akademik kayıtlar korunur; fiziksel ve tam hesap imhası iddiası yok. `LOGIN-CLEANUP-CONTRACT.md` ve B28 JSON’u ayrıntıdır. Yeni canlı yayın yok.

## Paket44 — B05/B25 ders ve materyal kabulü (14.10.2026)

Ders ve materyal ekranı 66 dersin envanterini, program/görev/rubrik eşlemesini, sürüme bağlı hak sicilini, ayrı yönetici hak kararını ve ders başına kalite incelemesini sunar. Yalnız kayıtlı öğrenen veya yetkili görevli özgün HTML/CSV teslimi alır; kalite incelemesi için ayrı indirme amacı vardır. Öğrenme kanıtı aynı kişinin teslimine bağlanır; insan değerlendirmesi ve ayrı karar korunur. Harici dosya kopyası/marka/API kapalı; yeniden yayın yalnız ayrıca izinli dosya hazırlığı, gerçek yayın yok.

591+48+46=685 otomatik;14 materyal+19 gezinme+13 itiraz=46 tarayıcı;123 komut/17 HTTP,7028 pozitif örnek/56224 türetilmiş olumsuz denetim;98 menü/288 rol paneli,390 px/klavye. 6 koleksiyon22 modül66 ders ve88 özgün dosya baytları aynı,115 korumalı statik dosya. Kaynak altında yeni133 kayıt türü,14 tablo. İlk tarayıcı koşusundaki aynı adlı summary/button seçici belirsizliği testte giderildi; son tam akış geçti.

B05/B25 bağımsız yerel alt koşulları kapandı; gerçek yazılı sağlayıcı/hak sahibi kararı, seçili Gazi programının akademik/dil/erişilebilirlik incelemesi ve üretim dağıtım adaptörü açık. Bütün iş paketleri tamamlanmadı. Ayrıntı MATERIAL-RIGHTS-CONTRACT.md, MATERIAL-SOURCE-REVIEW.md ve B05-B25 kabul JSON’unda. Yeni canlı yayın ve canlı smoke yok; son canlı16 READY,17–44 dağıtılmadı;configuredCore kapalı.

## Paket45 — B07 yerel türetme anahtarı commit bariyeri (14.10.2026)

Yeni panel/menü yok. Mevcut HTTPS girişinde anahtar sürümü/durdurma, tek kullanımlık challenge ve oturumun aynı commit işlemine bağlıdır. Güvenilen yerel operatör dönüşümü ve paylaşılan anahtarı tenant/issuer/audience kapsamlarında durdurma, audit ile atomiktir. Eski işçi/istek yeni revizyonu kullanamaz; doğru anahtarlı isteği yanlış işçi tüketmez. Provider beklerken ve imza doğrulamasından sonra ikinci bağlantıda iptal yeni çerezi engeller. Önceki akademik oturumun normal süre/üyelik/çıkış denetimleri korunur.

11 yeni test;602+48+46=696 otomatik;15 kimlik+9 temizlik=24 tarayıcı;123komut/17HTTP7056örnek56448denetim;115statik;16teknik tablo/133kayıt türü. B07 yerel alt koşul geçti; IdentityKeyProvider metadata/üretim repository köprüsü, gerçek PG/KMS/IdP/RLS, tüm session yazarları/karma dağıtım ve geri yükleme checkpoint’i açık. `DERIVATION-EPOCH-CONTRACT.md` ayrıntıdır.36 özgün kabul ölçütü değişmedi.

Canlı alias yeniden kontrol edildi: Paket16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877` READY.17–45 dağıtılmadı; yeni canlı smoke yok;configuredCore kapalı. Gerçek credential/migration/kurum kararı yok.

## Paket46 — B20/B21 çok dersli teklif (14.10.2026)

Tanıma ve kredi → Çok dersli teklifler güncellendi. Öğrenen aynı kayıt/politikaya bağlı2–10 dersi birleştirir ve karar öncesi geri çeker. Komisyon tek teklif altında her satırı karara bağlar; toplam uzaktan payda ve ders başına pay/çifte sayım kontrolü yapılır. İtiraz bütün satırları bekletir; bağımsız yeniden karar eski kredileri atomik tersler. OBS eski mutabık satırlardan ayrı replace/cancel zincirini korur. Gerçek belge/kurul/transkript işlemi değildir.

615+48+46=709 otomatik;13 yeni sunucu;11 teklif+12 tek ders+11 OBS=34 tarayıcı;128komut/17HTTP7321pozitif58568türetilmiş denetim;115statik;16teknik tablo138kayıt türü.390px ekran görüntüsü incelendi. İlk hedef testlerinde politika okuma kapsamı ve test fixture referansları düzeltildi; son tam koşular geçti. B20/B21 yalnız belirtilen yerel alt koşullarda kabul; özel istisna/ölçü birimi sözleşmesi, kriptografik dış belge/teslim arşivi, gerçek müfredat/önceki ders, kurum ve dış sistem kabulü açık.

YÖK5sayfa ve Gazi kredi transferi4sayfa önceki erişim/okuma engeli giderildi; Gazi RPL5sayfa yeniden okundu. Kaynak SHA/kapsam/tarih ve yorum sınırları RECOGNITION-SOURCE-REVIEW-20261014.md içinde. YÖK10/3 ölçü birimi otomatik AKTS oranı olarak atanmadı. Ayrıntı RECOGNITION-OFFER-CONTRACT.md ve B20-B21-offers kabul JSON’unda.36 özgün kimlik/başlık/bağımlılık/kabul değişmedi.

Yeni canlı yayın yok:17–46 dağıtılmadı; alias16 READY. Son canlı kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`, deploy `dpl_Coaq5KN2VcNpPjwyXke4neroq877`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Authenticated canlı smoke yenilenmedi; browserAuth13Ekim iptali yeniden denenmedi;configuredCore kapalı.

## Paket47 — B20 kaynak ve istisna incelemesi (14.10.2026)

Tanıma ve kredi → Kaynak ve istisna incelemesi eklendi; Politika ve hak sicili tanıma yolunu Türkçe seçimle kaydeder. Yeni politikada zorunlu kaynak/sicil bağı, bağımsız dört teyitli inceleme, sürüm/süre/görev/hold kontrolleri vardır. Eğitim adedi, saat, belirsiz birim ve özel RPL/önceki ders yolları inceleme kaydı alabilir ancak pozitif kredi hesaplamaz. Yeni başvuru ve pozitif karar sunucuda güncel kaynağa bağlıdır; eski karar/kredi/OBS otomatik değiştirilmez. Önceki yerel politika korunur; yeni istemci legacy biçimi üretemez.

626+48+46=720 otomatik;11 yeni sunucu;10kaynak+12tekders+11çokdersli+11OBS=44tarayıcı;131komut/17HTTP7625örnek61000türetilmiş kapsam denetimi;115statik;16tablo141tür.390px görsel inceleme/klavye ve iki SQLite bağlantısında eski karar formu/durdurma geçti. İlk browser option kontrolü DOM disabled özelliğiyle kesinleştirildi; son akış geçti. Kaynak dosyasının baytları veya özgünlüğü doğrulanmış sayılmaz; kaynak/istisna kapalı sözleşmesi B20 kurum kabulü değildir. Gerçek ölçü birimi/istisna/müfredat ve önceki kayıt kaynağı ile buna bağlı koşullu hesap adaptörleri açık.

Ayrıntı RECOGNITION-BASIS-CONTRACT.md ve B20-basis kabul JSON.36 özgün iş/kabul/bağımlılık değişmedi. Yeni canlı yayın yok;17–47 dağıtılmadı. Son canlı16 `dpl_Coaq5KN2VcNpPjwyXke4neroq877`, kaynak `16bd55eefed251ce5d23e1791f87ed3871c6a8c6`; geri dönüş `dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1` uygulanmadı. Yeni authenticated smoke yok;browserAuth iptali tekrar denenmedi;configuredCore kapalı.

## Paket48 — B21 belge teslimi

Paket48: gerçek 32 KiB JWT baytları aynı talep/kişi/kurum/birim ve sunucu SHA ile değişmez özel arşive teslim edilir; güncel yetkili indirme ve audit/idempotency atomiktir. İnceleme sonrası değiştirme kapalı; ham dosya çalışma ekranı/kişi özeti/commands sonucuna girmez. İmza/düzenleyici/subject doğrulaması yapılmadı, teslim kredi üretmez. 731 otomatik/45 tarayıcı;133 komut/17 HTTP;7843 pozitif örnek/62744 türetilmiş kapsam denetimi. Ayrıntı `acceptance/B21-document-20261014.json`. Son canlı16;17–48 dağıtılmadı. B21 tam kabulü açık.

## Paket49 — B21 dış belge imzası

Paket49: dış belgeye özel sunucu issuer/anahtar/kişi eşleme sözleşmesi, IT hazırlığı/ayrı yönetici incelemesi, sürüm/süre/anahtar kapanışı; arşiv baytlarından gerçek JOSE RS256, typ/issuer/audience/subject/id/süre denetimi ve asenkron işlem sonrası atomik yeniden yetkilendirme. Makbuz yalnız imza/kişi eşlemesidir; durum/insan teknik kabulü ve kredi üretmez. Mevcut insan raporuna ve karar/OBS güven zincirine zorunlu bağ sonraki bağımsız dilimdir. 743 otomatik/47 tarayıcı;136komut/18HTTP8145örnek65160denetim. Ayrıntı `acceptance/B21-external-20261014.json`. B21 ve bütün36 işin tam kabulü açık; son canlı16,17–49 dağıtılmadı.

## Paket50 — B21/B22 bağlı insan raporu ve karar/aktarım (14.10.2026)

Paket50: arşivli olumlu insan raporu güncel imza makbuzuna ve ayrıca insanın incelediği durum kaynağına bağlı; değişmez rapor sürümleri ve kararın sabitlediği teknik rapor korunur. Yeni rapor eski krediyi otomatik yenilemez. Güven kapanışı pozitif kararı ve bütün teklifin OBS kullanımını bekletir; ayrı olumsuz kararın sıfır kredili iptal düzeltmesi yürür. Kişi özeti iç SHA/görevli alanlarını açmaz.

14.10.2026 Paket50:661+48+46=755 otomatik;12 yeni sunucu;12 bağlı inceleme+12 tanıma+11 teklif+11 OBS+13 kriptografik+11 teslim=70 tarayıcı;136komut/18HTTP8453örnek67624kapsam denetimi. 390px geçmiş görüntüsü incelendi; yeni tarayıcıda sekme ve aynı adlı option/Pill seçicileri düzeltildi. Son altı akış tam geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-REVIEW-CONTRACT.md; kanıt acceptance/B21-review-20261014.json.36 özgün iş/bağımlılık/kabul aynı. Yeniden imzalanan belge için kanonik çift kredi koruması, gerçek durum kaynağı/kurul/OBS/üretim kabulü açık.

Paket50 dağıtılmadı; son canlı16 alias dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY yeniden okundu. Yeni authenticated smoke yok; configuredCore kapalı. 17–50 dağıtılmadı. Canlı kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı. BrowserAuth iptali tekrar denenmedi. Kaynak commit ve tam ağaç eşitlemesi ayrı kaydedilecek.

## Paket51 — B21 yeniden imzalı belge ve çift kredi (14.10.2026)

Paket51: aynı doğrulanmış issuer/belge/kanonik çıktı kimliği, yeniden imzalanmış farklı dosya veya ders/gain anahtarıyla ikinci kredi oluşturamaz. Eski kredi kararının sabitlediği makbuz, anahtar kapansa veya son rapor değişse de ters kayda kadar sayılır. Tüm teklif rollback ve iki bağlantıda eski form sınandı. Öğrenci/akademik ekranda neden görünür, pozitif seçenek kapalı; yalnız teknik role kredi ayrıntısı açılmaz. Manuel çıktı etiketleri arasındaki anlamsal eşdeğerlik gerçek uzman/kaynak incelemesine bağlıdır.

14.10.2026 Paket51:672+48+46=766 otomatik;11 yeni sunucu;12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=58 tarayıcı;136komut/18HTTP8761örnek70088kapsam denetimi. 390px görsel incelendi. İlk yeni testte ekran için zenginleştirilmiş talep yerine değişmez kaynak talebinin özeti kullanılarak uyarı bağı düzeltildi; son tam koşular geçti.16tablo148tür/115statik. Sözleşme RECOGNITION-IDENTITY-CONTRACT.md ve B21-identity JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul değişmedi.

Paket51 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–51 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

## Paket52 — B21 kararın görülen teknik rapora bağlanması (14.10.2026)

Paket52: her yeni tek ders ve teklif satırı kararı expectedTechnicalId ile insanın gördüğü raporu veya açık null yokluğunu taşır. Eksik/eski/başka rapor409; tek eski satır tüm teklifi geri alır. Arşivsiz yeni karar da aynı kurala bağlı; eski kayıtlar korunur. Ekran yenilenince eski karar taslağı temizlenir; geçmiş kararda gerçekten kullanılan rapor sürümü/ref görünür. Negatif0kredi için imza geçerliliği şartı eklenmez.

14.10.2026 Paket52:678+48+46=772 otomatik;6 yeni sunucu;10 sürüm+12 kimlik+12 bağlı inceleme+12 tanıma+11 teklif+11 OBS=68 tarayıcı;136komut/18HTTP8924örnek71392kapsam denetimi. İki ayrı Chromium sürecinde eski komisyon kimliği ayrıca doğrulandı; diğer oturumun ikinci olumlu raporundan sonra eski form gerçekHTTP409 aldı, güncel form başarılı oldu.390px görsel incelendi.16tablo148tür/115statik. RECOGNITION-VERSION-CONTRACT.md ve B21-version JSON ayrıntıdır.36 özgün iş/bağımlılık/kabul aynı.

Paket52 dağıtılmadı; son doğrulanan canlı16 dpl_Coaq5KN2VcNpPjwyXke4neroq877 READY, kaynak16bd55eefed251ce5d23e1791f87ed3871c6a8c6. Yeni authenticated smoke yok;configuredCore kapalı. 17–52 dağıtılmadı; geri dönüş dpl_FCDsn7bJN1Cns4LZ8BiNMovTZpM1 uygulanmadı;browserAuth iptali tekrar denenmedi. Kaynak kimliği ve tam ağaç eşitlemesi ayrıca kaydedilir.

## Paket53 — B07 SQL anahtar metadata köprüsü

Paket53:16 yeni SQL testi;694 sunucu+48 portal+46 regresyon=788. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite0.5.9/PostgreSQL18.6 tek bağlantı SQL kabulü; gerçek çok bağlantı/KMS/HTTP repository kabulü değil. Paket53 IdentityKeyProvider genel metadata revizyonunu aynı SQL transaction öncesi/sonrası yeniden denetleyen PostgresIdentityKeyBridge ekledi. SQL değişiklik/denetim atomik; strict+1 ve terminal iptal, amaç/bağlam/scope, emekli devam, süre ve belirsiz COMMIT kapalı. İki aday tablo sadece PGlite testinde; LocalAcceptanceStore16tablo148tür değişmedi. Gerçek oturum repository ve HTTP bağlantısı hâlâ açık. 136komut/18HTTP8924olumlu/71392negatif;115statik.36 özgün kimlik/bağımlılık/kabul değişmedi. IDENTITY-KEY-BRIDGE-CONTRACT.md ve B07-key-bridge JSON ayrıntıdır. B07 tam kabul değildir.

## Paket54 — B07 SQL giriş isteği

Paket54:18 yeni SQL giriş isteği testi;712 sunucu+48 portal+46 regresyon=806. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. PGlite tek bağlantılıdır; yeni repository HTTP/oturum kabulü değildir. Paket54 PostgresIdentityChallenges anahtar köprüsüyle begin/claim/finish/fail/cancel yaşam döngüsünü bağladı. Claim provider I/O öncesi commit, değişmez state/browser/scope/redirect/contract bağı, tek kullanımlık handle, terminal durumlar ve atomik audit. Belirsiz claim/final COMMIT yeniden kullanılmaz; saat geri giderse kapalıdır. İki yeni SQL adayıyla toplam4 uygulanmamış PGtablosu; aktifSQLite16tablo148tür değişmedi. Kişi/üyelik/session/iptal/HTTP bağlantısı açık.136komut/18HTTP8924olumlu/71392negatif;115statik.36 özgün kimlik/bağımlılık/kabul değişmedi. IDENTITY-CHALLENGE-SQL-CONTRACT.md ve B07-challenge-sql JSON ayrıntıdır.

## Paket55 — B06/B07 SQL kişi/üyelik/oturum

Paket55:21 yeni imzalı SQL akış testi;733 sunucu+48 portal+46 regresyon=827. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti. Yeni SQL flow henüz HTTP/React/akademik depo bağlantısı değildir; tek bağlantılı PGlite kabulüdür. Paket55 PostgresIdentityFlow config+redirect tek özetiyle kişi/üyelik, opaque signed proof/MFA, challenge/keybarrier, session ve audit atomik zincirini bağladı. Strict+1 directory control; person ve membership revizyonu sessiona pinli, kapat/aç eski sessionı canlandırmaz. Rotate/parentfamilylogout, sub/sidANDJTI backchannel ve session öncesi iptal bariyeri, timeout ve belirsiz COMMIT kapalı.9 uygulanmamışPGadayı; aktifSQLite16tablo148tür aynı. YeniSQL HTTP/rate/CSRF/akademik sınırı ve güvenilirrestore checkpoint açıktır.136komut/18HTTP8924olumlu/71392negatif;115statik.36 özgün kimlik/bağımlılık/kabul değişmedi. IDENTITY-SQL-FLOW-CONTRACT.md ve B06-B07-sql-flow JSON ayrıntıdır.

## Paket56 — dosya alanı kabulü

ACCEPTANCE-MATRIX.md içindeki B24 satırı tam kapanmadı. 14 kontrollü dosya UI +14 yetki HTTP +12 tanıma belge HTTP =40;390px/klavye/zorunlu renk; tam AT değil. Ayrıntı: `acceptance/B24-file-input-20261014.json`. Özgün36 kimlik, başlık, bağımlılık ve kabul ölçütü başlangıç kaydıyla aynıdır.

## Paket57 — dar ekran ve metin aralığı

98 menü,288 panel ve22 vaka;320 CSS px normal/artırılmış metin aralığı928 ölçümde0 taşma kaydı.66 tarayıcı kontrolü ve106 yeniden koşulan otomatik test; tam sunucu733 Paketi56dan kalır, sunucu kodu değişmedi. Bu sayılar tam B24/AT/zoom/altyazı/karşıtlık kabulü değildir. `acceptance/B24-reflow-20261014.json`. Özgün36 ölçüt korunur.

## Paket58 — B07 SQL HTTP güvenliği (14.10.2026)

Görünür ekran değişikliği yok. Paket58 SQL HTTP epoch/history/buckets üç adayını bağladı: strict+1 ve anahtar yeniden kullanım yasağı, tüm amaçların aktif bütçe sönmesini bekleyen atomik rotasyon/audit; kapsamlı per-purpose global/peer/browser bütçesi; COMMIT sonrası opak kısa ömürlü permit ve aynı tx sahipliği; cookie/contract/revision HMAC CSRF ve güncel SQL epoch. Yeni toplam12 uygulanmamış PGadayı; aktifSQLite16tablo148tür aynı. Gerçek HTTP claim/finalsession bağı bu pakette açık. Paket58:22 yeni SQL HTTP güvenlik testi;755 sunucu+48 portal+46 regresyon=849. Mevcut yerel HTTPS girişinin15 tarayıcı kontrolü geçti; yeni SQL sınırı henüz HTTP/flowa bağlı değil.115 statik;36 özgün kimlik/bağımlılık/kabul değişmedi. IDENTITY-HTTP-SECURITY-CONTRACT.md ayrıntıdır. B07 tam kabul ve yeni canlı yayın değildir.
