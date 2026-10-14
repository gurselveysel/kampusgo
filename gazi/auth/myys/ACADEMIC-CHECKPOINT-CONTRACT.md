# Kimlik ve akademik kayıt için birleşik güncellik profili

14 Ekim 2026 · Paket67 · `myys-sql-identity-academic-checkpoint/1`. Yalnız izole yerel kabul.

## Paneldeki davranış

Akademik Kayıt ve Karar ekranında programdan itiraz sonucuna kadar Paket66'nın aynı SQL zinciri bu kontrol bağlıyken çalışır. Kayıtların güncelliği doğrulanamazsa yeni işlem başarılı gösterilmez; önceki kayıtlar ve işlem formları kapanır. Türkçe “Kayıt güvenliği kontrol edilmeli” durumu görünür; odak uyarıya taşınır. Yanlış bir “oturum kapalı, yeniden giriş yapın” yönlendirmesi verilmez. Kontrol düzeldiği gösterilmeden kurum kaydı açılmaz.

Bu profil gerçek kurumsal hizmet veya canlı yayın değildir. `configuredCore()` kapalıdır. Yerel tarayıcı kabulünde ayrı sentetik IdP, gerçek loopback HTTPS, tek SQL veritabanı ve ondan ayrı yerel güncellik dosyası kullanılır. SQL verisi ile birlikte kontrol dosyasını da eskiye döndürebilen bir yetki bu güven sınırının dışındadır.

## Tam kapsama bağlanan tablolar

Önceki profilin 12 kimlik tablosuna `myys_academic_records`, `myys_academic_commands`, `myys_academic_audit` eklenir. Profil 15 veri tablosunu, ayrıca tek SQL kontrol başlığını kapsar. Toplam SQL aday tablosu hâlâ 16'dır; yeni tablo, üretim migration veya erişim oluşturulmaz.

`PostgresIdentityCheckpoint` açık profil seçimi ister; varsayılan kimlik profilidir. SQL başlığı, ayrı dosya, rezervasyon, önceki kabul ve sonraki kabul aynı profile sabitlenir. Kimlik profili akademik tablolar bulunan veritabanında artık kapalı kalır. Her iki profil de tanınmayan kimlik veya akademik tabloyu sessizce atlamaz. Birleşik profil yalnız boş tablo kümesinde yetkili başlangıç işlemiyle kurulabilir; dolu eski veriyi kendiliğinden benimseme veya profil değiştirme API'si yoktur.

Yerel dosyanın yeni sürümü profili başlangıçta saklar. Önceki Paket64 dosyasında profil sütunu yoksa sadece eski kimlik profiliyle okunur; çalışma anında schema değiştirilmez. Böyle bir dosyayı akademik diye yeniden etiketlemek reddedilir. Bu uyumluluk sentetik önceki biçim dosyasıyla sınandı.

## İşlem ve geri yükleme sınırı

1. SQL dışında ayrı kalıcı rezervasyon alınır. Kurumlar ve issuer'lar arasında paylaşılan kimlik tablosu nedeniyle aynı deponun bütün okuyucu/yazıcıları aynı kontrol kaydına katılmalıdır.
2. SERIALIZABLE işlemde önceki SQL başlığı ve bütün kapsanan satırların deterministik özeti doğrulanır. Ancak bundan sonra oturum ve akademik iş kuralları çalışır.
3. Kimlik denetimleri, akademik kayıt, tekil komut makbuzu, denetim ve yeni kontrol başlığı birlikte commit edilir.
4. SQL client bırakıldıktan sonra ayrı kayıt yeni başlığı kalıcı kabul eder. Yanıt ancak iki onay da kesinleşince verilir.
5. Kesin rollback tüm SQL değişikliklerini geri alır; kullanılan rezervasyon sıra numarası tekrar kullanılmaz. Belirsiz COMMIT veya henüz verilmemiş ayrı onay, kalıcı bekleyen rezervasyon bırakır. Otomatik süre dolumu, başlık sıfırlama veya kurtarma bypass'ı yoktur.
6. Ayrı onay gerçekten yazıldı fakat cevabı kaybolduysa, aynı komut kimliğiyle açık tekrar yalnız güncel eşleşen başlıktaki makbuzu bulabilir. Bu, yeni karar veya ikinci kayıt üretmez.

Eski SQL veri dizini kopyası, ayrı kontrol dosyası güncelse reddedilir. Eski kopyaya yeni SQL başlığını yapıştırmak da tam veri özeti nedeniyle reddedilir. Kanıt/karar, komut sonucu veya denetim değiştirilirse kontrol kapanır. Güncel tam kopya ile ayrı dosyanın yeniden açılması kabul edilir. Bunlar sentetik PostgreSQL WASM veri dizini restore kontrolleridir; üretim kurtarma yetkisi, tam sistem RPO/RTO, anahtar kurtarma veya gerçek güç kesintisi sertifikasyonu değildir.

## Kanıt ve sınırlar

`acceptance/B07-B28-academic-checkpoint-20261014.json` 13 yeni testi ve tarayıcı kanıtını içerir. 855 sunucu + 48 portal + 46 mevcut regresyon = 949 otomatik test. Birleşik profilde 16 tarayıcı kontrolü; mevcut SQL girişinde 13 kontrol. 320 CSS px, artırılmış metin aralığı, sekme klavyesi ve kapanma uyarısının odağı sınandı. Tam ekran okuyucu/WCAG kabulü değildir.

PGlite 0.5.9 / PostgreSQL 18.6 tek exclusive bağlantı; ayrı dosya SQLite DELETE/EXTRA ve özel dizin/dosya izinleridir. Native çok bağlantı/SSI/RLS, dağıtık konsensüs, gerçek fsync/güç kaybı, bütün üretim yazıcıları ve yetkili kurtarma işletimi açık kalır. Kapsam tablosu başına 10.000 satır ve toplam 16 MiB kabul sınırıdır; ölçekleme taahhüdü değildir. Ayrı kontrol dosyasının gövdesinde kişi veya akademik içerik yoktur; başlık özetleri ve işlem rezervasyonları vardır. Bu dosyanın saklama ve gerçek hizmet yetkileri ayrıca kabul ister.

Önceki `IDENTITY-CHECKPOINT-CONTRACT.md` rezervasyon/commit/abort güven sınırı bu profilde de geçerlidir. Kalan 128 akademik komut bu SQL dilimine aktarılmadı. Belge, LMS/OBS ve tanıma/cüzdan zincirinin SQL bağını tamamlamış sayılmaz. Hukuki saklama/silme veya B27 sözleşmeli RPO/RTO ölçütü kapanmış değildir.

## Kaynak kaydı

14 Ekim 2026 tarihinde doğrulanan [PostgreSQL 18 §13.2.3](https://www.postgresql.org/docs/18/transaction-iso.html), transaction sonuçlarının başarılı commit öncesi kabul edilmemesi ve serialization hatasında bütün işin tekrarı sınırını destekler. Ayrı güncellik profilinin kapsamı proje tasarımıdır; PostgreSQL'in kendiliğinden eski yedeği saptadığı veya kurum kuralı koyduğu iddia edilmez. SQLite/Node/PGlite sürüm ve kaynak kayıtları Paket64 sözleşmesinde korunur.
