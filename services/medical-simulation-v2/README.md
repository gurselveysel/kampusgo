# TEYS/MAMS V2 — STEMI, VF, ROSC dikey dilimi

Bu paket `/medikal-simulasyon/v2` rotasının olay kaynaklı klinik motorudur. Üretim kararı **NO-GO**; fizyoloji, UÇEP ve TYÇ uzman onayı **DOĞRULANMADI** durumundadır.

## Çalışan sınır

- Sabitlenmiş `xstate@5.32.6` ile paralel klinik, ekip ve yaşam döngüsü durumları.
- Aynı seed ve olay dizisinde aynı final hash'i üreten değişmez audit kayıtları ve replay.
- Doğrudan vital delta yazmayan; iskemi, perfüzyon, oksijen rezervi, elektriksel instabilite, ritim, tedavi ve zamanı birlikte işleyen deterministik fizyoloji adaptörü.
- Görüşme, muayene, tetkik, ilaç, müdahale ve ekip araçlarında ölçülebilir bilgi, zaman, maliyet, rubrik, güvenlik veya fizyoloji sonucu.
- `three@0.185.1` ve `@react-three/fiber@9.7.0` ile dinamik yüklenen sentetik hasta/oda sahnesi.
- Eğitim, değerlendirme ve OSCE için farklı geri bildirim ve saat davranışı.
- Olay → API iş tanımı → arXivisual/Manim render sonucu sözleşmesi. Yalnız API'nin döndürdüğü `video_url` oynatılır.

## Açık engeller

- Canlı arXivisual/Manim işi; gateway, pilot erişimi ve render servisi olmadan `BLOCKED_EXTERNAL_ACCESS` olur. Hazır MP4 fallback kullanılmaz.
- Serbest metin görüşme deterministik yerel niyet eşlemesidir; yapay zekâ görüşmesi değildir.
- Fizyoloji klinik karar desteği değildir ve uzman doğrulaması yoktur.
- UÇEP eşlemeleri görev, uygulama düzeyi ve kaynak lokasyonu taşır ancak uzman onayı/tarihi yoktur; bu nedenle `DOĞRULANMADI` kalır.
- TYÇ bilgi, beceri ve yetkinlik bağlamları ayrıdır; resmî sayısal seviye atanmaz.
- 40 GitHub deposundan yalnız three.js, React Three Fiber ve XState doğrudan runtime bağımlılığıdır. Diğer 37 kayıt için kaynak kütüğündeki referans/benchmark/izole/lisans/tarihsel ayrımı geçerlidir.

## Doğrulama

```text
npm run test:medical-v2
npm run test:medical-v2:browser
npm run build
```

Tarayıcı testi üç modu, serbest görüşmeyi, altı araç grubunu, gecikmeli EKG'yi, VF–CPR–defibrilasyon–ROSC–SBAR yolunu, Manim engel fallback'ini, replay/hash kalıcılığını, klavye odağını, azaltılmış hareketi ve 390 piksel taşma kontrolünü çalıştırır.
