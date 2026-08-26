# TEYS arXivisual medikal simülasyon pilot runbook'u

## Değişmeyen sınırlar

- Production kararı `NO-GO`.
- Yalnız sentetik hasta durumu ve uzman tarafından onaylanmış geçiş kullanılır.
- Ham Python/Manim render uç noktası yoktur.
- API anahtarı yalnız Next.js sunucu geçidinde ve backend secret alanında tutulur.
- Bir saatlik pencerede varsayılan olarak en fazla üç iş ve aynı anda bir render çalışır.
- Gerçek hasta, öğrenci, hastane, cihaz veya biyometrik veri işlenmez.

## Yerel kontrollü pilot

1. `.env.example` dosyasını `.env` olarak kopyalayın ve en az 32 karakterlik servis anahtarı üretin.
2. Azure OpenAI veya Dedalus bilgilerinden yalnız birini tanımlayın.
3. `docker compose -f docker-compose.pilot.yml config` ile modeli doğrulayın.
4. `docker compose -f docker-compose.pilot.yml up --build` ile servisi yalnız `127.0.0.1:8002` üzerinde başlatın.
5. `/api/medical/health` yanıtında `provider`, `manim`, `rawRenderEnabled=false` ve `productionAllowed=false` alanlarını doğrulayın.
6. Anahtarsız `/api/medical/pilot` isteğinin `401`, doğru anahtarlı isteğin `200` verdiğini doğrulayın.
7. `X-Expert-Approval-Confirmed: true` olmadan iş oluşturmanın `428` verdiğini doğrulayın.
8. Tek bir onaylı sentetik geçişle iş başlatın; durum `queued → generating → validating → rendering → completed` olmalıdır.
9. Dönen video bağlantısını Next.js geçidi üzerinden oynatın; backend anahtarının tarayıcıya çıkmadığını ağ kaydında doğrulayın.

## Geri alma

- Next.js tarafında `MEDICAL_SIMULATION_GATEWAY_ENABLED=false` ayarlayın.
- Backend servisini durdurun; üretim rotaları gateway kapalıyken `503` verir.
- Kalıcı diskteki sentetik pilot iş ve videolarını koruyun; kullanıcı onayı olmadan silmeyin.

## Dış pilot öncesi zorunlu kapılar

- bağımsız tıp eğitimi içerik incelemesi,
- kurumsal rol ve kimlik doğrulaması,
- kalıcı denetim izi ve onay iş akışı,
- UÇEP eşleme kaynaklarının sürümlü doğrulanması,
- AI maliyet bütçesi ve alarmı,
- container güvenlik testi ve bağımsız kod çalıştırma incelemesi,
- nesne depolama erişim politikası,
- gerçek kullanıcı veya hasta verisi için KVKK/hukuk onayı.
