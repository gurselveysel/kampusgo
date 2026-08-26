# KampüsGO Visual Lab

Bu dizin, KampüsGO Görsel Akademi arayüzünün gerçek içerik analiz ve animasyon motoruyla entegrasyonu için ayrılmıştır.

## Güncel durum

- ArXivisual kaynak çalışma ağacı sabit bir commit üzerinden içe aktarıldı.
- Dosya bütünlük manifesti üretildi: `UPSTREAM_FILES.sha256`.
- KampüsGO güvenlik overlay'i eklendi.
- Ham Python/Manim render uç noktası varsayılan olarak kapatıldı.
- Korunan API uç noktaları için sunucu taraflı servis anahtarı zorunlu hâle getirildi.
- Yerel pilot için kaynak ve işlem sınırları bulunan Docker Compose tanımı eklendi.
- Next.js tarafına sağlık ve kimliği doğrulanmış pilot metadata geçitleri eklendi.
- Production kararı hâlâ **NO-GO** durumundadır.

## Kaynak taban

İlk teknik taban, aşağıdaki açık kaynak proje sürümüne sabitlenmiştir:

- Kaynak: `rajshah6/arXivisual`
- Sabit commit: `bbdbc8768948ed201b2825d2618dea3e8f1f7ea1`
- Sabit tree: `4f483551de136cb99f2f2871e8a6f7b946a0c405`
- İçe aktarım yolu: `services/visual-lab/upstream/arxivisual`
- İçe aktarım biçimi: çalışma ağacı kaynak görüntüsü; iç içe `.git` dizini tutulmaz

`UPSTREAM.json` makine tarafından okunabilen kaynak kaydını içerir. `scripts/visual-lab/sync-upstream.sh` aynı commit'i tekrar üretilebilir biçimde içe aktarır.

## Mimari sınır

KampüsGO'nun mevcut Next.js uygulaması yalnızca kullanıcı arayüzü ve güvenli API geçidi olarak kalır. Ağır işlemler ayrı servislerde çalıştırılır:

1. **KampüsGO Web:** Vercel üzerinde Next.js arayüzü.
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

## Uyarlama yöntemi

`upstream/arxivisual` değişmeden saklanır. KampüsGO'ya özgü değişiklikler `overlays/`, API adaptörleri ve ayrı konfigürasyon dosyaları üzerinden geliştirilir. Böylece:

- kaynak proje sürümü izlenebilir,
- güvenlik yamaları karşılaştırılabilir,
- marka ve ürün değişiklikleri upstream koddan ayrıştırılabilir,
- yeni upstream sürümleri kontrollü olarak alınabilir.

## Production durumu

**NO-GO.** Bu entegrasyon dalı geliştirme ve kontrollü preview içindir. Kurum/kullanıcı kimliği, kota, denetim izi, içerik lisans kapısı, kalıcı nesne depolama, dayanıklı kuyruk ve maliyet koruması tamamlanmadan production dağıtımı yapılmaz.
