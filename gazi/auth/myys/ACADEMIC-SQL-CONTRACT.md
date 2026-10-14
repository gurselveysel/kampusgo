# Ortak SQL kimlik ve akademik işlem dilimi

Sürüm: `myys-academic-sql/1`. Tarih: 14 Ekim 2026. Yazılım paketi 66; bir iş paketinin veya kurum kabulünün tamamlandığı anlamına gelmez.

## Panelde görünen işlem

İzole HTTPS kabul sunucusunda ayrı sentetik sağlayıcıdan imzalı giriş yapan kişi, aynı SQL kişi/üyelik/oturum kaydıyla altı mevcut sekmeye erişir: Programlar, Öğrenen kayıtları, Öğrenme kanıtları, Değerlendirmeler, Akademik kararlar ve İtiraz incelemeleri. Koordinatör programı hazırlar; başka yetkili inceler; mevcut öğrenen kaydedilir; kendi kanıtını sunar; eğitici rubrikle değerlendirir; komisyon karar verir; öğrenen itiraz eder ve bağımsız inceleyen sonuçlandırır. Yeniden değerlendirme eski karar ve kanıtı korur. Yenileme ve yeniden giriş aynı kayıtlara döner.

`academic: true` yalnız yerel SQL HTTP sunucusunun açık sunucu yapılandırmasıdır. Varsayılan false; Vercel ortamında bu adaptör açılamaz. Belge düzenleme, arşiv indirme, alternatif kanıt ve diğer henüz taşınmamış işlemler bu dilimde sunulmaz. Desteklenmeyen sekme bağlantısı açık kanıt sekmesine döner. Mevcut tam yerel SQLite çalışma alanının işlevleri korunur.

## Veri ve işlem sınırı

- `myys_academic_records`, `myys_academic_commands`, `myys_academic_audit` aynı SQL bağlantısındadır. Önceki 13 aday ile toplam 16 uygulanmamış PostgreSQL tablosu adayı vardır. Aktif yerel SQLite envanteri 16 tablo/149 kayıt türü olarak korunur.
- `PostgresIdentityFlow.withPrincipal` mevcut özel oturum, kişi, üyelik, revizyon, süre, HTTP permit/epoch ve iptal kontrollerini SQL işinden önce ve sonra uygular. Actor, rol veya üyelik istemciden alınmaz.
- `program`, `publish`, `enroll`, `evidence`, `assess`, `decide`, `appeal`, `resolve` mevcut `MyysCore.execute` kurallarını ve ortak `academicView` izdüşümünü kullanır. Transaction içindeki salt SQL kaynaklı sınırlı çalışma kümesi ikinci kalıcı depo değildir; tamamlanınca kapatılır. Genel SQL çeviricisi yoktur.
- SERIALIZABLE transaction, kimlik kapsamı/tarayıcı kilidinden sonra kurum genelinde akademik advisory kilidi alır. Program/kanıt/karar, tekil komut makbuzu ve denetim birlikte yazılır. Her komut tam bir değişmez kayıt üretir. Payload farklı replay reddedilir; aynı replay güncel kişi/üyelik ve işlem yetkisini yeniden denetler.
- Yalnız doğrulanmış rollback sonrası 40001/40P01 bütün işi tekrar başlatabilir. Belirsiz COMMIT otomatik tekrar veya başarılı yanıt üretmez. Aynı komut kimliğiyle açık tekrar, gerçekten kaydedilmiş makbuzu güncel yetkiyle bulabilir.
- Değişmez kayıt, komut ve denetimde UPDATE/DELETE engellenir. JSON kimlik alanları, mevcut SQL üyeliği/kişisi için foreign key ve indeksler vardır. `public` adları açıktır; PUBLIC tablo/fonksiyon yetkileri kaldırılmıştır. Ayrı en az yetkili üretim rolü, RLS ve bütün yazıcıların katılımı henüz kabul edilmemiştir.
- Kurum başına en fazla 10.000 akademik kayıt/üyelik ve 16 MiB çalışma kümesi yerel sınırdır. Akademik kayıt sayısı/boyutu payload alınmadan denetlenir. Bu değerler üretim kapasitesi veya performans taahhüdü değildir.

## HTTP ve arayüz

Mevcut `/api/myys/calisma?kurum=gazi` ve `/api/myys/islem` yolları yalnız bu opt-in sunucuda aynı SQL akışına bağlıdır. Gerçek HTTPS, tam Host/Origin, Secure/HttpOnly/SameSite cookie, özel permit, SQL bütçesi ve güncel CSRF kontrolü gerekir. Gövde alanları allowlist, JSON UTF-8/boyut ve query tekilliği denetlenir. Akademik yazma permit'i yalnız başarılı özel CSRF doğrulamasından sonra kullanılabilir; istemci nesnesi veya klonu bunu üretemez. Akademik profil HTTP epoch digestine bağlıdır; eski identity-only worker sessizce yeni işlemleri açamaz. JSON çıkışı aynı gerçek SQL oturumunu kapatır.

## Kabul kanıtı ve kapsam dışı

Kanıt: `acceptance/B06-B11-academic-sql-20261014.json`. 14 akademik SQL, 6 gerçek HTTPS ve 2 HTTP güvenlik testi bu paketin 22 yeni testidir. 15 yeni React/TLS tarayıcı kontrolü; 13 mevcut SQL giriş, 8 program ve 13 itiraz kontrolü yeniden çalıştırıldı. 320 CSS px/metin aralığı/sekme klavyesi ve ekran görüntüsü incelendi. Gerçek ekran okuyucu veya tam WCAG kabulü değildir.

PGlite 0.5.9 / PostgreSQL 18.6, tek exclusive bağlantı kullanıldı. Serialization hata enjeksiyonu native çok bağlantılı SSI kabulü değildir. Tüm SQL veri dizininin başka motora yüklenmesi kişi, program ve komut makbuzunun kalıcılığını doğrular; eski yedeğin güvenle reddedildiğini göstermez. Paket64 checkpoint'i yalnız 12 kimlik tablosunu kapsar; yeni üç akademik tabloyu korumaz. Bu yüzden birleşik fixture checkpoint + academic seçimini reddeder. Sıradaki bağımsız iş birleşik kapsam profilidir.

Kalan 128 mevcut komut, belge/iptal/yenileme, LMS/OBS, cüzdan/tanıma, kurum politikaları ve dış servisler bu SQL dilimine aktarılmadı. Bunları birbirine bağlı gerçek üretim zinciri gibi sunmuyoruz. Gerçek IdP/MFA/KMS, kurum yetkisi, native SQL/RLS/SSI, depo/backup/checkpoint işletimi, migration ve güvenli canlı doğrulama ayrı açık koşullardır. `configuredCore()` kapalı; yeni erişim, gerçek kişi işlemi veya migration yapılmadı.

## Doğrulanan resmî teknik kaynaklar

14 Ekim 2026 tarihinde okunmuştur; kurum kararı oluşturmaz.

| Kaynak | Sürüm/kapsam | Uygulamadaki karşılığı |
|---|---|---|
| [PostgreSQL transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) | PostgreSQL 18, §13.2.3 | Serialization hatasında bütün transaction tekrar edilir; doğrulanmış commit öncesi sonuç kabul edilmez. Native SSI testinin yerine geçmez. |
| [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) | PostgreSQL 18, §5.5.1–2 | CHECK null sonucunu kabul edebildiği için zorunlu JSON anahtarları ve NOT NULL ayrıca tanımlanır; tablo arası bağ foreign key ile kurulur. |

## Paket67 devamı

Paket66 sırasında açık olan akademik checkpoint yerel alt dilimi [ayrı birleşik profil](ACADEMIC-CHECKPOINT-CONTRACT.md) ile kabul edildi. HTTP fixture artık `academic:true,checkpoint:true` seçimini doğru15tablo profiliyle kullanır. Varsayılan kapalı kalır; gerçek hizmet ve bütün üretim yazıcıları kabulü açık. Önceki22test/936sayısı Paket66 tarihsel kaydıdır.

## Paket68 devamı

[SQL itiraz dilimi](APPEAL-SQL-CONTRACT.md) dört işlemi daha bağladı:12komut/12akademik kayıt türü. Yerel politika sekmesi yalnız yönetici/komisyon/kalite rolüne; kişisel karar teslimi yalnız sahibine açılır. Akademikposition artık ordinaryBIGINT ve kurum+positionunique; sıra aynıtransaction değişmez satırlardan üretilir. Eski aday şeması otomatik değiştirilmez. Kalan124komut/gerçekkurumusulü/resmîtebligat/üretim açık.
