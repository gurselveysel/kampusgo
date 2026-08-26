# KampüsGO Visual Lab — Render Kontrollü Pilot Dağıtımı

Bu dosya, `render.yaml` Blueprint'ini kullanarak Visual Lab backend'ini ayrı bir Docker web servisi olarak kurmak için hazırlanmıştır.

> **Maliyet uyarısı:** Blueprint, `standard` web service ve 1 GB kalıcı disk seçer. Render onay ekranında güncel ücretleri incelemeden kurulumu onaylamayın. Blueprint'i depoya eklemek tek başına kaynak oluşturmaz veya ücret başlatmaz.

## 1. Blueprint'i aç

Aşağıdaki bağlantı, özellikle entegrasyon dalındaki `render.yaml` dosyasını seçer:

[Deploy controlled pilot to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fgurselveysel%2Fkampusgo%2Ftree%2Ffeature%2Farxivisual-upstream-integration)

Blueprint şu güvenlik kararlarıyla gelir:

- Frankfurt bölgesi,
- tek servis örneği,
- otomatik deploy kapalı,
- preview üretimi kapalı,
- `/api/health` sağlık kontrolü,
- 300 saniye kontrollü kapanma süresi,
- 1 GB kalıcı `/data` diski,
- raw render kapalı,
- API anahtarı zorunlu,
- kaynak kullanım hakkı onayı zorunlu,
- docs/OpenAPI kapalı,
- tek eşzamanlı pipeline ve render sınırı,
- saatlik en fazla üç yeni iş,
- iki saatlik mükerrer makale engeli.

## 2. Render'ın isteyeceği gizli değerler

Blueprint kurulumunda aşağıdaki `sync: false` değerleri girilir:

### `VISUAL_LAB_API_KEY`

En az 32 karakterli, rastgele ve yalnız KampüsGO server gateway ile backend arasında kullanılan servis anahtarıdır.

Örnek üretim komutu:

```bash
openssl rand -base64 48
```

Bu değeri güvenli şekilde saklayın; daha sonra Vercel sunucu ortamında aynı değer `VISUAL_LAB_API_KEY` olarak tanımlanacaktır.

### `AZURE_OPENAI_ENDPOINT`

Azure OpenAI kaynağının endpoint adresi.

### `AZURE_OPENAI_API_KEY`

Azure OpenAI API anahtarı.

### `AZURE_OPENAI_DEPLOYMENT`

Kullanılacak GPT model deployment adı.

## 3. İlk deploy sonrası backend doğrulaması

Render servis adresini `VISUAL_LAB_RENDER_URL` değişkenine atayın:

```bash
export VISUAL_LAB_RENDER_URL="https://kampusgo-visual-lab-pilot.onrender.com"
export VISUAL_LAB_API_KEY="GERCEK_SERVIS_ANAHTARI"
```

Sağlık kontrolü:

```bash
curl --fail "$VISUAL_LAB_RENDER_URL/api/health"
```

Korunan pilot metadata kontrolü:

```bash
curl --fail \
  -H "X-Visual-Lab-Key: $VISUAL_LAB_API_KEY" \
  "$VISUAL_LAB_RENDER_URL/api/pilot"
```

Beklenen kritik alanlar:

- `mode: controlled_pilot`
- `rawRenderEnabled: false`
- `sourceRightsConfirmationRequired: true`
- `authenticationRequired: true`
- `productionAllowed: false`

Yetkisiz API isteğinin engellendiğini doğrulayın:

```bash
curl -i "$VISUAL_LAB_RENDER_URL/api/papers"
```

Beklenen yanıt: `401 Unauthorized`.

Kaynak hakkı onayı olmadan üretimin başlamadığını doğrulayın:

```bash
curl -i \
  -H "X-Visual-Lab-Key: $VISUAL_LAB_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"arxiv_id":"1706.03762"}' \
  "$VISUAL_LAB_RENDER_URL/api/process"
```

Beklenen yanıt: `428 Precondition Required`. Bu istek LLM veya render işi başlatmaz.

Ham kod render uç noktasının kapalı olduğunu doğrulayın:

```bash
curl -i \
  -H "X-Visual-Lab-Key: $VISUAL_LAB_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"code":"print(1)"}' \
  "$VISUAL_LAB_RENDER_URL/api/render"
```

Beklenen yanıt: `404 Not Found`.

## 4. Vercel/KampüsGO geçidini bağla

KampüsGO Vercel ortamında şu değerleri tanımlayın:

```dotenv
VISUAL_LAB_GATEWAY_ENABLED=true
VISUAL_LAB_API_URL=https://GERCEK-RENDER-SERVIS-ADI.onrender.com
VISUAL_LAB_API_KEY=RENDER-ILE-AYNI-SERVIS-ANAHTARI
VISUAL_LAB_PILOT_ACCESS_TOKEN=SERVIS-ANAHTARINDAN-FARKLI-EN-AZ-32-KARAKTER
VISUAL_LAB_MEDIA_ALLOWED_HOSTS=
```

`VISUAL_LAB_PILOT_ACCESS_TOKEN` için ikinci ve farklı bir rastgele değer üretin. Hiçbir Visual Lab secret'ına `NEXT_PUBLIC_` öneki eklemeyin.

Render pilotu `STORAGE_MODE=local` kullandığı için `VISUAL_LAB_MEDIA_ALLOWED_HOSTS` boş kalır; videolar backend üzerinden KampüsGO'nun korunan medya geçidine stream edilir.

## 5. KampüsGO uçtan uca doğrulama

KampüsGO preview ortamında:

1. `/gorsel-akademi/motor` sayfasını açın.
2. Sağlık durumunun `Motor erişilebilir` olduğunu doğrulayın.
3. Servis anahtarı durumunun `Güvenli geçit doğrulandı` olduğunu doğrulayın.
4. `/gorsel-akademi/calismalar` sayfasını açın.
5. Ayrı pilot erişim anahtarını girin.
6. Kullanım hakkı doğrulanmış tek bir modern arXiv kimliği girin.
7. Zorunlu kaynak kullanım hakkı kutusunu yalnız gerçekten yetkiliyseniz işaretleyin.
8. İşin kuyruk, analiz, üretim ve render aşamalarını izleyin.
9. Bölüm özetleri ile korunan video akışını kontrol edin.
10. Aynı saat içinde üçten fazla yeni iş kabul edilmediğini doğrulayın.

## 6. Kontrollü pilot sınırı

Render servisi kurulmuş olsa bile aşağıdaki kararlar değişmez:

- production domainine bağlanmaz,
- genel kullanıcı kaydı açılmaz,
- gerçek öğrenci verisi işlenmez,
- otomatik akademik yayın yapılmaz,
- aynı anda yalnız bir üretim işi çalıştırılır,
- saatlik üç iş limiti yükseltilmez,
- yalnız kullanım hakkı doğrulanmış kaynaklar kullanılır,
- Azure harcama kotası olmadan pilot başlatılmaz.

## 7. Durdurma ve maliyet kontrolü

Pilot tamamlandığında Render Dashboard üzerinden servisi askıya alın veya silin. Disk ayrıca incelenmelidir; yalnız web service'i silmek, bağlı kalıcı kaynağın yaşam döngüsünü her durumda garanti etmez. Silmeden önce gerekli pilot çıktılarını dışarı aktarın.
