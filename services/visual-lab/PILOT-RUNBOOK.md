# KampüsGO Visual Lab — Kontrollü Pilot Çalıştırma Kılavuzu

## 1. Ön koşullar

- Docker Engine ve Docker Compose
- En az 4 GB kullanılabilir RAM
- Azure OpenAI üzerinde uygun model dağıtımı
- İlk kurulum için internet erişimi

Manim, FFmpeg ve LaTeX bağımlılıkları container içine kurulur; ana KampüsGO/Vercel uygulamasına eklenmez.

## 2. Ortam dosyasını oluştur

```bash
cd services/visual-lab
cp .env.example .env
```

`.env` içinde en az şu değerleri gerçek değerlerle doldur:

- `VISUAL_LAB_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

`VISUAL_LAB_RAW_RENDER_ENABLED=false` değeri pilot boyunca korunmalıdır.

## 3. Container'ı oluştur ve başlat

```bash
docker compose -f docker-compose.pilot.yml build
docker compose -f docker-compose.pilot.yml up -d
```

API yalnız yerel makinenin `127.0.0.1:8001` adresine bağlanır. Dış ağa doğrudan açılmaz.

## 4. Sağlık kontrolü

```bash
curl --fail http://127.0.0.1:8001/api/health
```

Korunan pilot metadata uç noktası:

```bash
curl --fail \
  -H "X-Visual-Lab-Key: $VISUAL_LAB_API_KEY" \
  http://127.0.0.1:8001/api/pilot
```

Beklenen kritik alanlar:

- `mode: controlled_pilot`
- `rawRenderEnabled: false`
- `productionAllowed: false`

## 5. KampüsGO Next.js geçidini bağla

KampüsGO sunucu ortamında aşağıdaki değerleri tanımla:

```dotenv
VISUAL_LAB_API_URL=http://127.0.0.1:8001
VISUAL_LAB_API_KEY=aynı-uzun-rastgele-değer
```

`VISUAL_LAB_API_KEY` hiçbir zaman `NEXT_PUBLIC_` önekiyle tanımlanmaz. Tarayıcıya gönderilmez.

KampüsGO tarafındaki kontrol:

```bash
curl --fail http://localhost:3000/api/visual-lab/health
```

## 6. Log ve durum inceleme

```bash
docker compose -f docker-compose.pilot.yml ps
docker compose -f docker-compose.pilot.yml logs --tail=200 visual-lab-api
```

## 7. Durdurma

```bash
docker compose -f docker-compose.pilot.yml down
```

Veri ve üretilen videoları da silmek için yalnızca bilinçli olarak:

```bash
docker compose -f docker-compose.pilot.yml down -v
```

## 8. Pilot sınırları

- Production yayını yapılmaz.
- Ham Python/Manim render uç noktası açılmaz.
- Gerçek öğrenci verisi kullanılmaz.
- Yalnız kullanım hakkı doğrulanmış içerikler işlenir.
- Eğitici onayı olmadan içerik yayımlanmaz.
- Kurum ve kullanıcı bazlı kimlik, kota ve denetim izi tamamlanmadan internetten genel kullanıma açılmaz.
