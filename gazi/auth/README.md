# Gazi MYYS - Doğrulayıcı uygulama ile pilot erişimi

Gazi demosunun mevcut 26 dosyası değiştirilmeden sunucu fonksiyonunun özel paketine alınır. Ana panel, kurumsal demo, eski modüller, PDF ve JavaScript dosyaları aynı oturum denetiminden geçer. Genel dosya sunucusuna geçiş yolu bulunmaz. Giriş ekranı ve iki kurumsal logo herkese açıktır.

## İşleyiş

- 6 haneli TOTP; 30 saniyelik dönem; saat farkı için bir dönem tolerans.
- Kabul edilen son dönem veritabanında atomik olarak güncellenir. Aynı kod, eşzamanlı isteklerde de ikinci kez kabul edilmez.
- IP başına 5 dakikalık pencere içinde 5 giriş denemesi; ayrıca ortam başına dakikada 100 deneme sınırı. IP adresleri ham biçimde saklanmaz; gizli anahtarlı özet kullanılır.
- Rastgele 256 bit oturum; tarayıcıda Secure, HttpOnly, SameSite=Strict ve __Host önekli çerez. Veritabanında yalnız SHA-256 özeti tutulur.
- Oturum 60 dakika sonra biter. Her korunan istekte süre ve iptal durumu sunucuda kontrol edilir. Çıkış, sunucudaki kaydı da siler.
- Saklama servisi yanıt vermezse erişim açılmaz. POST isteklerinde aynı kaynak denetimi ve JSON boyut sınırı bulunur.
- HTML, uygulama dosyaları ve oturum yanıtları için önbellekleme kapalıdır. İstemci sürenin dolmasını ve sekmenin tekrar açılmasını izler.

## Yayınlama

1. Portal veya demo değiştiyse ilgili mevcut derlemeyi çalıştırın.
2. Bu klasörde `npm ci --ignore-scripts`, `node scripts/package.mjs`, `npm test` çalıştırın.
3. **Yayın kökü bu `gazi/auth` klasörüdür.** `gazi/` klasörünü eski statik yapılandırmayla yayımlamak erişim kapısını kaldırır.
4. Yalnız `api/gateway.mjs`, `lib/*`, `login/*`, `private/*`, `package.json`, `package-lock.json` ve `vercel.json` dağıtılır. SQL, testler, dokümanlar ve kurulum anahtarları dağıtıma dahil edilmez.
5. Önizlemeyi doğrulayın; ardından aynı dosya listesini production ortamına yayımlayın.

Vercel'de yalnız sunucuya açık hassas değişkenler:

- `GAZI_TOTP_SECRET`: production ve preview için farklı Base32 anahtarları.
- `GAZI_GATE_STORE_TOKEN`: 32 rastgele baytın onaltılık biçimi.
- `GAZI_GATE_IP_KEY`: IP özetleri için ayrı rastgele anahtar.

Supabase `gazi-demo-gate-store` fonksiyonu, gateway anahtarının SHA-256 özetiyle özel sunucu doğrulaması yapar. `store-edge.ts` içindeki yer tutucu yalnız bu özetle değiştirilir. Supabase sunucu anahtarı Vercel'e veya tarayıcıya taşınmaz. Yeni üç tablo RLS açık, anon/authenticated erişimi kapalı olacak biçimde `store.sql` ile kurulur. Fonksiyonlar SECURITY INVOKER'dır.

Vercel Standard Protection (`prod_deployment_urls_and_all_previews`) eski yayın ve önizleme URL'lerini de korur; özel canlı alan adı kendi TOTP ekranını kullanır. Kaynak kodun herkese açılması kapalı tutulur.

## Anahtar yenileme / erişimi iptal etme

Kaybolan telefon veya paylaşılan kurulum belgesi durumunda production TOTP anahtarını yenileyin, yeni anahtarla yeniden yayımlayın ve yeni QR kaydını yalnız pilot yöneticisine iletin. Bu anahtar hiçbir zaman kaynak koduna eklenmez. Tüm pilot oturumlarını iptal etmek için yalnız `gazi_gate_sessions` tablosunun production kayıtlarını geçersiz kılın. Süre dolmuş kayıtlar yeni giriş denemelerinde temizlenir. Kayıp anahtar için gizli bir arka kapı yoktur.

## Doğrulama ve sınırlar

2026-10-10: 8 yerel güvenlik testi. Önizlemede oturumsuz ana panel/dosya erişimi, geçerli giriş, eşzamanlı kod tekrarı, eski kod, yanlış kaynak, çerez bayrakları, kaynak dosyası gizleme, IP başlığı değiştirerek deneme sınırını aşma girişimi ve sunucuda çıkış doğrulandı. Eski uygulama paketinin 26 dosyası canlı sürümle birebir karşılaştırıldı. Auth üretim bağımlılıklarının npm denetiminde bilinen açık bulunmadı.

Supabase danışmanı üç tablo için politika yok bilgilendirmesi verir: bu tasarımda istemci erişimi kasten tamamen kapalıdır; yalnız sunucu service_role kullanır. Projenin mevcut Supabase Auth parola sızıntısı koruması uyarısı bu parolasız TOTP kapısından bağımsızdır; mevcut diğer uygulamaların ayarları değiştirilmez.

Bu kapı, tek pilot yöneticisi kaydıyla demo erişimini sınırlar. Gerçek öğrenci/akademisyen hesapları, kişi bazında yetkiler ve kurumsal SSO yerine geçmez. Demo içindeki rol seçimi sunucu yetkisi vermez. Paylaşılan pilot kodu kayıtları kişi bazlı denetim sağlamaz. Bu nedenle gerçek kişisel veri barındıran üretim sistemi için ayrıca kullanıcı ve rol yetkilendirmesi gerekir.
