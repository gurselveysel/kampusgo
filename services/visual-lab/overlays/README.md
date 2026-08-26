# KampüsGO Visual Lab Overlays

Bu dizin, sabitlenmiş upstream kaynak görüntüsüne uygulanacak KampüsGO değişikliklerini kaynak tabandan ayırmak için kullanılır.

Planlanan overlay katmanları:

- `backend/`: kurum ve kullanıcı kimliği, tenant sınırı, kota, audit log ve güvenli iş kabulü.
- `ingestion/`: PDF, DOCX, PPTX, ders notu ve kurum içi içerik adaptörleri.
- `prompts-tr/`: Türkçe akademik anlatım, eğitim düzeyi ve pedagojik kalite şablonları.
- `render/`: izole container politikası, ağ sınırı, süre/CPU/RAM kotası ve dosya taraması.
- `frontend-adapter/`: KampüsGO Next.js arayüzünün Visual Lab API sözleşmesi.
- `legal/`: kaynak, atıf, içerik lisansı ve türev eser karar kayıtları.

İlk upstream içe aktarımı tamamlanana kadar bu dizinde yalnız mimari kayıt tutulur. Upstream kaynak doğrudan değiştirilmeden önce her uyarlama için ayrı test ve gerekçeli değişiklik kaydı oluşturulacaktır.
