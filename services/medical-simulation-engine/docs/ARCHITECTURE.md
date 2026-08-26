# TEYS Medikal Simülasyon Mimarisi

## Eğitim döngüsü

```text
GÖZLEMLE → DÜŞÜN → KARAR VER → UYGULA → SONUCU GÖR → DEĞERLENDİR → YENİDEN DENE
```

Sekiz modül sıralıdır. Bir modülün minimum başarı ve kritik güvenlik kriteri tamamlanmadan sonraki modül açılmaz.

## Bileşenler

```text
KampüsGO / TEYS arayüzü
          │
          ▼
FastAPI oturum ve yeterlilik katmanı
          │
          ├── Deterministik klinik durum makinesi
          ├── Karar zaman çizelgesi ve debriefing
          ├── UÇEP %70 / özerklik %30 portföy kapısı
          │
          ▼
Medical Storyboard Adapter
          │
          ▼
Vendored arXivisual backend
  Section/LLM logic · ManimGenerator · CodeValidator
          │
          ▼
İzole Manim render worker
          │
          ▼
Onay bekleyen video / animasyon çıktısı
```

## Güvenlik kararları

1. API ham Python kodu kabul etmez.
2. AI tarafından üretilen kodun çalıştırılması varsayılan olarak kapalıdır.
3. Kontrollü pilot yalnız önceden onaylanmış `ClinicalMonitorScene` dosyasını render eder.
4. Render süreci ayrı, yetkisiz kullanıcıyla, süre/bellek/dosya sistemi sınırlı container içinde çalışır.
5. Gerçek hasta verisi kabul edilmez; tüm veri sentetiktir.
6. Üretilen materyal eğitici onayı olmadan yayımlanmaz.
7. Motor klinik bakım desteği değil, eğitim simülasyonudur.

## Müfredat yönetişimi

Modül ağırlıkları toplamda:

- UÇEP çekirdeği: `%70`
- Kurumsal özerklik: `%30`
- Toplam: `%100`

Yatay entegrasyon disiplinler arası bağlantıları; dikey entegrasyon temel bilimlerden intörnlüğe uzanan beceri sürekliliğini kaydeder.
