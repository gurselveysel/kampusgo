# KampüsGO Visual Lab — Kontrollü Pilot Çalıştırma Kılavuzu

## 1. Ön koşullar

- Docker Engine ve Docker Compose
- En az 4 GB kullanılabilir RAM
- Azure OpenAI üzerinde uygun model dağıtımı
- İlk kurulum için internet erişimi

Manim, FFmpeg ve LaTeX bağımlılıkları container içine kurulur; ana KampüsGO/Vercel uygulamasına eklenmez.

## 2. Backend ortam dosyasını oluştur

```bash
cd services/visual-lab
cp .env.example .env
```

`.env` içinde en az şu değerleri gerçek değerlerle doldur:

- `VISUAL_LAB_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`

`VISUAL_LAB_RAW_RENDER_ENABLED=false` değeri pilot boyunca korunmalıdır. Servis anahtarı en az 32 rastgele karakterden oluşmalı ve başka bir sistem parolasıyla aynı olmamalıdır.

## 3. Container'ı oluştur ve başlat

```bash
docker compose -f docker-compose.pilot.yml build
docker compose -f docker-compose.pilot.yml up -d
```

Yerel pilotta API yalnız `127.0.0.1:8001` adresine bağlanır ve dış ağa doğrudan açılmaz.

## 4. Backend sağlık ve güvenlik kontrolü

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
- `authenticationRequired: true`
- `productionAllowed: false`

Ham render uç noktasının kapalı olduğunu ayrıca doğrula:

```bash
curl -i \
  -H "X-Visual-Lab-Key: $VISUAL_LAB_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"code":"print(1)"}' \
  http://127.0.0.1:8001/api/render
```

Beklenen yanıt `404 Not Found` olmalıdır.

## 5. KampüsGO Next.js geçidini bağla

KampüsGO sunucu ortamında şu değerleri tanımla:

```dotenv
VISUAL_LAB_GATEWAY_ENABLED=false
VISUAL_LAB_API_URL=http://127.0.0.1:8001
VISUAL_LAB_API_KEY=backend-ile-ayni-uzun-rastgele-deger
VISUAL_LAB_PILOT_ACCESS_TOKEN=backend-servis-anahtarindan-farkli-en-az-32-karakter
```

Kurulum tamamlanana kadar `VISUAL_LAB_GATEWAY_ENABLED=false` kalmalıdır. Aşağıdaki kontroller başarıyla tamamlandıktan sonra yalnız kontrollü pilot ortamında `true` yapılır.

`VISUAL_LAB_API_KEY` ve `VISUAL_LAB_PILOT_ACCESS_TOKEN` hiçbir zaman `NEXT_PUBLIC_` önekiyle tanımlanmaz. Tarayıcıya gönderilmez. Pilot erişim anahtarı doğru girildiğinde tarayıcıya anahtarın kendisi yerine sekiz saatlik, `HttpOnly`, `SameSite=Strict` oturum çerezi verilir.

KampüsGO sunucu geçidi kontrolleri:

```bash
curl --fail http://localhost:3000/api/visual-lab/health
curl --fail http://localhost:3000/api/visual-lab/pilot
```

İkinci istek, Next.js sunucusunun backend servis anahtarıyla korunan `/api/pilot` uç noktasına erişebildiğini doğrular.

## 6. Pilot geçidini etkinleştir

Aşağıdakilerin tamamı doğrulanmadan geçidi etkinleştirme:

1. Backend sağlık durumu erişilebilir.
2. `/api/pilot` servis anahtarıyla doğrulanıyor.
3. `/api/render` 404 döndürüyor.
4. Container non-root kullanıcıyla çalışıyor.
5. CPU, RAM ve PID sınırları uygulanıyor.
6. Yalnız kullanım hakkı doğrulanmış örnek makale seçildi.
7. Azure OpenAI maliyet ve kota sınırları tanımlandı.

Sonra:

```dotenv
VISUAL_LAB_GATEWAY_ENABLED=true
```

Next.js sunucusunu yeniden başlat.

## 7. KampüsGO çalışma ekranları

- `/gorsel-akademi/calismalar`: Pilot anahtarıyla açılan gerçek iş başlatma, ilerleme ve sonuç ekranı.
- `/gorsel-akademi/motor`: Backend erişimi, servis anahtarı ve güvenlik sınırlarını gösteren teknik durum ekranı.
- `/gorsel-akademi`: Motor bağlı olmasa da çalışan etkileşimli ürün prototipi.

Çalışma ekranı:

- modern arXiv kimliği veya bağlantısı kabul eder,
- işi yalnız server-side geçit üzerinden başlatır,
- dört saniyede bir iş durumunu sorgular,
- tamamlanan makaleyi ve bölüm özetlerini getirir,
- video URL'lerini servis anahtarı göstermeden korunan KampüsGO medya geçidine dönüştürür,
- ham Python/Manim kodu kabul etmez.

## 8. Yerel ve uzak ağ farkı

`VISUAL_LAB_API_URL=http://127.0.0.1:8001` yalnız Next.js uygulaması da aynı makinede yerel olarak çalışıyorsa geçerlidir. Vercel Preview veya başka bir uzak frontend, operatör bilgisayarındaki `127.0.0.1` adresine erişemez.

Uzak preview için backend ayrı bir container platformunda HTTPS ile yayınlanmalı ve şu kontroller uygulanmalıdır:

- doğrudan genel kullanıcı erişimi yerine servis anahtarı,
- dar ingress ve CORS listesi,
- secret manager,
- TLS,
- kurum/kullanıcı kotası,
- denetim izi,
- kalıcı PostgreSQL ve nesne depolama,
- render worker izolasyonu.

## 9. Log ve durum inceleme

```bash
docker compose -f docker-compose.pilot.yml ps
docker compose -f docker-compose.pilot.yml logs --tail=200 visual-lab-api
```

## 10. Durdurma

```bash
docker compose -f docker-compose.pilot.yml down
```

Veri ve üretilen videoları da silmek için yalnızca bilinçli olarak:

```bash
docker compose -f docker-compose.pilot.yml down -v
```

## 11. Pilot sınırları

- Production yayını yapılmaz.
- Ham Python/Manim render uç noktası açılmaz.
- Gerçek öğrenci verisi kullanılmaz.
- Yalnız kullanım hakkı doğrulanmış içerikler işlenir.
- Eğitici onayı olmadan içerik yayımlanmaz.
- Kurum ve kullanıcı bazlı kimlik, kota ve denetim izi tamamlanmadan internetten genel kullanıma açılmaz.
