# KampüsGO Visual Lab

Bu dizin, KampüsGO Görsel Akademi arayüzünün gerçek içerik analiz ve animasyon motoruyla entegrasyonu için ayrılmıştır.

## Kaynak taban

İlk teknik taban, aşağıdaki açık kaynak proje sürümüne sabitlenmiştir:

- Kaynak: `rajshah6/arXivisual`
- Sabit commit: `bbdbc8768948ed201b2825d2618dea3e8f1f7ea1`
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

## Güvenlik kararı

- Üretimde ham Python/Manim kodu kabul eden genel bir uç nokta açılmaz.
- Render işlemleri ana Next.js/Vercel sürecinde çalıştırılmaz.
- Her iş kurum, kullanıcı, süre, CPU, bellek ve depolama kotasına bağlanır.
- Pilot aşamasında gerçek öğrenci verisi, canlı ödeme veya kurumsal sistem aktarımı kullanılmaz.
- Secret değerler kaynak koda, tarayıcıya veya `.env.example` dosyalarına yazılmaz.

## Uyarlama yöntemi

`upstream/arxivisual` başlangıçta değişmeden saklanır. KampüsGO'ya özgü değişiklikler önce `overlays/`, API adaptörleri ve ayrı konfigürasyon dosyaları üzerinden geliştirilir. Böylece:

- kaynak proje sürümü izlenebilir,
- güvenlik yamaları karşılaştırılabilir,
- marka ve ürün değişiklikleri upstream koddan ayrıştırılabilir,
- yeni upstream sürümleri kontrollü olarak alınabilir.

## Production durumu

**NO-GO.** Bu entegrasyon dalı geliştirme ve kontrollü preview içindir. Backend kimlik doğrulaması, render sandbox'ı, kota, denetim izi, içerik lisans kapısı ve maliyet koruması tamamlanmadan production dağıtımı yapılmaz.
