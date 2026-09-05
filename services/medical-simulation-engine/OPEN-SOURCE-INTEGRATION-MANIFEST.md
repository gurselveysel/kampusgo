# TEYS Medikal Simülasyon — 40 Kaynaklı Açık Kaynak Entegrasyon Manifestosu

Bu manifesto, 27 Ağustos 2026 tarihinde GitHub üzerinden doğrulanan 40 deponun TEYS/MAMS medikal simülasyon mimarisindeki rolünü tanımlar. Kaynakların tamamı bir özellik, mimari, değerlendirme veya birlikte çalışabilirlik girdisi olarak kullanılır; bu durum kaynak kodlarının topluca kopyalandığı anlamına gelmez.

Makinece okunabilir kayıt: [`open-source-sources.json`](open-source-sources.json)

## Kullanım sınıfları

Çalışan ürün kütüğü her kaynağı ayrıca altı izinli rolden tam birine dönüştürür: `RUNTIME_INTEGRATED`, `ISOLATED_ADAPTER`, `TEST_OR_BENCHMARK`, `ARCHITECTURE_REFERENCE`, `LICENSE_BLOCKED` veya `ARCHIVED_OR_DUPLICATE`. Bu dönüşüm ve zorunlu risk/kanıt alanları `source-usage.js` içinde merkezi olarak uygulanır ve `medical-open-source-contract.mjs` tarafından 40/40 doğrulanır.

- `direct-dependency`: Sürümü `package.json` ve `package-lock.json` içinde sabitlenmiş, çalışma zamanı kodunda doğrudan kullanılan bağımlılık.
- `candidate`: Lisansı doğrulanmış ve mevcut web/servis mimarisiyle teknik olarak değerlendirilebilecek doğrudan bağımlılık veya adaptör adayı.
- `isolated-service`: C++, Java veya ayrı çalışma zamanı gerektiren; ana Next.js paketine gömülmeden servis/çevrimdışı hat olarak ele alınacak kaynak.
- `reference`: Kod alınmadan ürün, mimari veya araştırma kıyası olarak kullanılan kaynak.
- `blocked`: Lisanssız, lisansı doğrulanmamış veya ticari kullanımı kısıtlı olduğu için kod ve varlık alınmayan kaynak.
- `retired-reference`: Arşiv, sunset, staging veya eski WIP niteliği nedeniyle yalnız tarihsel referans.

## Birleşik mimari

1. **Sanal hasta deneyimi:** Rohy, Medkit, VPS, NurseSim, OLab/OpenLabyrinth, MAS, TraumaMaster, OPD Sim, VPatient ve Unity simülatörleri; görüşme, oda, görev, dallanma ve debrief kabul ölçütlerine katkı verir.
2. **LLM hasta ve değerlendirme:** PatientHub, EasyMED, MedAgentSim, AI Hospital, AgentClinic, EvoPatient, VeriSim ve Awesome listesi; hasta tutarlılığı, kontrollü bilgi açılımı, çok ajanlı roller ve benchmark tasarımına katkı verir.
3. **Fizyoloji:** Explain Engine tarayıcıda ilk adaptör adayıdır. BioGears daha yüksek gerçeklikli ayrı servis adayıdır. PulsePhysiology yalnız eski entegrasyon referansıdır.
4. **Cerrahi/prosedürel fizik:** SOFA ayrı servis sınırında değerlendirilir. iMSTK ailesi, CathSim, PAO ve anestezi/acil simülatörleri prosedür, VR, haptik ve DICOM iş akışlarını tanımlar.
5. **3B sunum:** Three.js + React Three Fiber ana web yolu adayıdır; Babylon.js karşılaştırma/yedek mimari referansıdır. İki render motoru aynı istemci paketine birlikte alınmaz.
6. **Durum ve yazarlık:** XState klinik olay/durum makinesi; xyflow eğitici senaryo grafiği adayıdır.
7. **Tıbbi görüntüleme:** Cornerstone3D düşük düzey kitaplık, OHIF radyoloji çalışma alanı, VolView yerel hacim görüntüleme seçenekleridir. Yalnız sentetik veya açık lisanslı eğitim görüntüleri kullanılır.
8. **Sentetik veri ve cihazlar:** Synthea çevrimdışı sentetik kayıt üretir; OpenICE ayrı cihaz test yatağı ve telemetri adaptörü sınırını tanımlar.

## Zorunlu kapılar

- Klinik doğruluk hiçbir GitHub deposundan otomatik kabul edilmez.
- UÇEP eşlemesi, güncel klinik kılavuz, yerel protokol ve uzman onayı ayrı tutulur.
- Veri kümesi, model ağırlığı, 3B varlık ve örnek olgu hakları kod lisansından ayrıca denetlenir.
- GPL/LGPL, ticari olmayan, ShareAlike veya lisanssız kaynaklar ana ürün koduna alınmaz; gerekirse yalnız izinli ve izole çalışma modeli hukuk incelemesiyle değerlendirilir.
- Her gerçek bağımlılık sabit sürüm/commit, SBOM, güvenlik taraması, performans bütçesi ve geri alma planıyla eklenir.
- Mevcut pilot gerçek hasta, gerçek DICOM, canlı tıbbi cihaz veya bağımsız klinik karar desteği kullanmaz.

## Mevcut uygulama durumu

40 deponun tamamı kaynak kütüğüne ve tekil kullanım rolüne bağlıdır. Bunlardan yalnızca `mrdoob/three.js@0.185.1`, `pmndrs/react-three-fiber@9.7.0` ve `statelyai/xstate@5.32.6` V2 dikey diliminde sabitlenmiş doğrudan çalışma zamanı bağımlılığıdır. Kalan 37 depo için kaynak/benchmark/izole adaptör/lisans engeli/tarihsel referans ayrımı korunur; referans olmak entegrasyon değildir.

İlk çalışan dikey dilimde gerçek XState paralel durum makinesi, deterministik latent fizyoloji, çalışan klinik araçlar, Three.js/React Three Fiber hasta sahnesi, geçersiz geçiş kapıları, olay hash'i, replay, eğitim/değerlendirme/OSCE farkı, UÇEP-TYÇ kanıt ayrımı ve eğitici analitiği uygulanmıştır. Explain Engine bu dilimde benchmark rolündedir; bağımlılık olarak kurulduğu iddia edilmez.

Sonraki ayrı entegrasyon paketleri:

1. xyflow senaryo yazarlığı ve senaryo snapshot sürümlemesi,
2. Explain Engine Web Worker adaptörü,
3. Three.js + React Three Fiber sahne erişilebilirliği ve varlık hattının genişletilmesi,
4. Cornerstone3D sentetik görüntüleme,
5. Synthea, BioGears ve OpenICE için izole servis adaptörleri,
6. PatientHub, AI Hospital, AgentClinic ve VeriSim tabanlı değerlendirme koşumları.

Production durumu: **NO-GO**.
