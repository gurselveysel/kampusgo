# KampüsGO Visual Lab

Bu dizin, KampüsGO Görsel Akademi arayüzünün gerçek içerik analiz ve animasyon motoruyla entegrasyonu için ayrılmıştır.

## Güncel durum

- ArXivisual kaynak çalışma ağacı sabit bir commit üzerinden içe aktarıldı.
- Dosya bütünlük manifesti üretildi: `UPSTREAM_FILES.sha256`.
- Upstream atıf ve provenance kaydı `THIRD_PARTY_NOTICES.md` içine alındı.
- KampüsGO güvenlik overlay'i eklendi.
- Ham Python/Manim render uç noktası varsayılan olarak kapatıldı.
- Korunan backend API uç noktaları için sunucu taraflı servis anahtarı zorunlu hâle getirildi.
- Yerel pilot için kaynak ve işlem sınırları bulunan Docker Compose tanımı eklendi.
- Next.js tarafında sağlık, pilot metadata, iş başlatma, durum, sonuç ve korunan video geçitleri oluşturuldu.
- Pilot erişimi ayrı bir anahtar ve sekiz saatlik HttpOnly/SameSite=Strict oturum çereziyle sınırlandı.
- Görsel Akademi çalışma alanı gerçek job polling ve sonuç görüntüleme akışına hazırlandı.
- İnceleme sonrası kurulabilecek, otomatik deploy'u kapalı Render Blueprint'i eklendi.
- Production kararı hâlâ **NO-GO** durumundadır.

## Kaynak taban

İlk teknik taban, aşağıdaki açık kaynak proje sürümüne sabitlenmiştir:

- Kaynak: `rajshah6/arXivisual`
- Sabit commit: `bbdbc8768948ed201b2825d2618dea3e8f1f7ea1`
- Sabit tree: `4f483551de136cb99f2f2871e8a6f7b946a0c405`
- İçe aktarım yolu: `services/visual-lab/upstream/arxivisual`
- İçe aktarım biçimi: çalışma ağacı kaynak görüntüsü; iç içe `.git` dizini tutulmaz

`UPSTREAM.json` makine tarafından okunabilen kaynak kaydını içerir. `scripts/visual-lab/sync-upstream.sh` aynı commit'i tekrar üretilebilir biçimde içe aktarır. Kaynak senkronizasyonu ile rutin entegrasyon QA birbirinden ayrı GitHub Actions işlerinde yürütülür.

## Mimari sınır

KampüsGO'nun mevcut Next.js uygulaması yalnızca kullanıcı arayüzü ve güvenli API geçidi olarak kalır. Ağır işlemler ayrı servislerde çalıştırılır:

1. **KampüsGO Web:** Vercel üzerinde Next.js arayüzü ve server-side gateway.
2. **Visual Lab API:** FastAPI tabanlı iş kabulü, durum ve sonuç API'si.
3. **Render Worker:** Manim, FFmpeg, LaTeX, Cairo ve Pango içeren izole container.
4. **İş kuyruğu:** Dayanıklı yürütme ve yeniden deneme katmanı.
5. **Depolama:** Üretilen video, transkript ve görsel kanıtlar için nesne depolama.
6. **Yayın kapısı:** Eğitici onayı olmadan öğrenciye otomatik yayın yapılmaz.

## Güvenlik overlay'i

`overlays/backend/main.py`, container oluşturulurken upstream `main.py` dosyasının üzerine uygulanır ve şu kontrolleri getirir:

- `/api/health` dışındaki API uç noktalarında `X-Visual-Lab-Key` doğrulaması,
- `/api/render` için bağımsız ve varsayılan kapalı güvenlik anahtarı,
- istek gövdesi boyut sınırı,
- daraltılmış CORS listesi,
- `no-store`, `nosniff`, frame engeli ve referrer güvenlik başlıkları,
- docs/OpenAPI görünürlüğünün ortama göre kapatılabilmesi,
- pilot durumunu açıkça gösteren `/api/pilot` metadata uç noktası.

`overlays/backend/db/connection.py`, SQLite ve PostgreSQL adreslerini açıkça destekler; PostgreSQL pool parametrelerinin SQLite'a yanlışlıkla uygulanmasını engeller.

## KampüsGO server gateway

`src/server/visual-lab.ts` ve `app/api/visual-lab/**` aşağıdaki sınırları uygular:

- tüm iş ve medya uç noktalarında pilot oturumu,
- backend servis anahtarının yalnız server-side kullanılması,
- modern arXiv kimliği, job kimliği ve video kimliği doğrulaması,
- same-origin kontrolü,
- kontrollü timeout ve hata eşleme,
- bulut medya yönlendirmelerinde servis anahtarının ikinci hosta gönderilmemesi,
- yalnız `VISUAL_LAB_MEDIA_ALLOWED_HOSTS` içinde tanımlı HTTPS medya hostlarının kabul edilmesi,
- video URL'lerinin korunan KampüsGO gateway adreslerine dönüştürülmesi.

Geçit `.env.example` içinde `VISUAL_LAB_GATEWAY_ENABLED=false` olarak gelir. Backend ve secret doğrulaması tamamlanmadan etkinleştirilmez.

## Kullanıcı ekranları

- `/gorsel-akademi`: Motor bağlı değilken de çalışan etkileşimli ürün prototipi.
- `/gorsel-akademi/motor`: Backend erişilebilirliği ve güvenlik sınırlarını gösteren teknik durum ekranı.
- `/gorsel-akademi/calismalar`: Pilot anahtarıyla açılan iş başlatma, dört saniyelik polling, sonuç, bölüm özeti ve video görüntüleme çalışma alanı.

## Yerel pilot

Ayrıntılı yönerge: [`PILOT-RUNBOOK.md`](PILOT-RUNBOOK.md)

Temel başlangıç:

```bash
cd services/visual-lab
cp .env.example .env
docker compose -f docker-compose.pilot.yml build
docker compose -f docker-compose.pilot.yml up -d
```

API yalnızca `127.0.0.1:8001` üzerinden yerel makineye bağlanır. Next.js uygulaması bu servise `VISUAL_LAB_API_URL` ve sunucuda tutulan `VISUAL_LAB_API_KEY` ile erişir.

## Render kontrollü pilot

Kök dizindeki `render.yaml`, Docker web servisini Frankfurt bölgesinde, tek örnek ve otomatik deploy kapalı olarak tanımlar. Blueprint kurulumu ücretli kaynak seçer; onaydan önce güncel ücretler kontrol edilmelidir.

Ayrıntılı yönerge: [`RENDER-DEPLOYMENT.md`](RENDER-DEPLOYMENT.md)

[Deploy controlled pilot to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fgurselveysel%2Fkampusgo%2Ftree%2Ffeature%2Farxivisual-upstream-integration)

Bu bağlantı yalnız Render inceleme/onay ekranını açar. Kullanıcı onayı ve gerekli secret değerleri verilmeden servis oluşturulmaz.

## Uyarlama yöntemi

`upstream/arxivisual` değişmeden saklanır. KampüsGO'ya özgü değişiklikler `overlays/`, API adaptörleri ve ayrı konfigürasyon dosyaları üzerinden geliştirilir. Böylece:

- kaynak proje sürümü izlenebilir,
- güvenlik yamaları karşılaştırılabilir,
- marka ve ürün değişiklikleri upstream koddan ayrıştırılabilir,
- yeni upstream sürümleri kontrollü olarak alınabilir.

## Production durumu

**NO-GO.** Bu entegrasyon dalı geliştirme ve kontrollü preview içindir. Kurum/kullanıcı kimliği, kalıcı kota, denetim izi, içerik lisans kapısı, production nesne depolama, dayanıklı kuyruk, secret manager ve maliyet koruması tamamlanmadan production dağıtımı yapılmaz.
