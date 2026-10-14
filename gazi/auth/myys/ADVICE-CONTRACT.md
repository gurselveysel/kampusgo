# B35 — sentetik öneri, uzman kıyası ve itiraz sözleşmesi

Sürüm 2026.10.14.37 · 14 Ekim 2026 · yazılım paketi 37. Yalnız `LocalAcceptanceStore` ve izole yerel kabul. Vercel'de `configuredCore()` kapalı kalır. Dış model çağrısı, API anahtarı, gerçek kişi verisi veya ücretli hizmet yok.

B35'in değiştirilmeyen ölçütü: “Pilot/plan/dil doğrulandı; sentetik örneklerde uzman kıyası ve itiraz var; model tek başına yüksek etkili ret/başarı kararı vermiyor.” Bu dilim modelden bağımsız sözleşmeyi, ekranı ve sentetik zinciri sınar. Gerçek sağlayıcı/pilot/plan/dil doğrulaması yapılmadı; B35 genel kabulü kısmi.

## Kullanılabilen akış

`#/academic/advice` → Öneri ve uzman kıyası. Gözetim ve örnek başvuru ekranlarından da bu sekmeye gidilir. Önceki örnekler korunur; kayıtlar sunucudaki aynı kişi/program/enrollment/assessment zincirine bağlıdır. Yerel örneğin kaynağı `manual-synthetic`: insanın elle girdiği benzetim puanı. Bir model çıktısı veya model başarısı olarak sunulmaz.

| Komut | Aktör ve sınır | Sonuç |
|---|---|---|
| advice-protocol | Aynı birimde MFA'lı yönetici | İncelenmiş program sürümü, veri akışı ve içerik hakkı sicil özetlerine bağlı protokol |
| advice-protocol-review | Hazırlayan ve atanmış uzmandan ayrı kalite | Sürüm/digest/dayanak/uzman üyeliği/süre yeniden denetlenerek kabul veya ret |
| advice-protocol-hold | Hazırlayan ve uzmandan ayrı kalite | Yeni örnek/kıyası kapatma; geçmiş ve itiraz çözümü korunur |
| advice-sample | Aynı programda MFA'lı eğitici | Sabit insan değerlendirmesi ve rubriğe bağlı ayrı sentetik öneri |
| advice-compare | Protokolde atanmış ayrı komisyon uzmanı | Her ölçütte uzman puanı/gerekçesi ve sunucuda hesaplanan fark |
| advice-contest | Kayıt sahibi MFA'lı öğrenen | Tam kıyasa bağlı tekil yerel itiraz; resmî başvuru/tebliğ değil |
| advice-resolve | Öğrenen, öneri hazırlayan, insan değerlendirici ve kıyas uzmanından ayrı kalite | Koru, geri çek veya ayrı düzeltme; özgün kayıtlar değişmez |

Protokol veri akışındaki amaçla birebir eşleşir; alıcı yalnız `local-simulator` olur. İçerik hakkı tam kaynak referansını kapsar. Yerel aday araç açıklaması, plan/Türkçe deneme/görevlendirme referansları belge alanıdır; girilmeleri gerçek sağlayıcı lisansı veya kurum onayı üretmez. `providerConnected`, `providerPlanLanguageVerified` ve `official` daima false. Türkçe dışındaki dil bu yerel sözleşmenin dışında; gerçek sağlayıcıya genellenmez. Yerel süre en fazla 366 gün; bu teknik üst sınır kurum saklama süresi değildir.

Yeni taslak önceki kabulün geçmişini silmez. Yeni kabulden sonra eski protokole yeni kıyas yapılmaz; süre bitmesi ve durdurma daha eski bir kabulü kendiliğinden açmaz. Her yeni örnek/kıyasta güncel protokol, dayanak sicilleri, program, kanıt özeti ve kaynak/alternatif kanıt durumu yeniden kontrol edilir. Kıyas eski insan değerlendirmesinin açıkça seçilmiş sabit sürümünü inceler; daha yeni değerlendirme var diye eski kayıt yeniden yazılmaz veya güncel akademik karar sayılmaz.

## Ölçme ve karar sınırı

Her rubrik ölçütü tam bir kez gelir; puan 0–4 tam sayı ve ayrı gerekçe zorunludur. Fazla alanlar, eksik/tekrarlı ölçüt, otomatik uygulama, başarı/ret ve dışarıdan toplam puan alanları reddedilir. Kıyas uzmanı programı hazırlayan, öğrenen, öneriyi giren veya insan değerlendirmesini yapan kişi olamaz. Kıyas kör değildir: önceki insan puanı ve öneri görünür.

Her satırda sabit insan puanı, sentetik öneri, uzman puanı ve iki fark tutulur. Ortalama mutlak öneri–uzman farkı, yalnız o örneğin ölçüt sayısına bölünür; ağırlıklı akademik not, doğruluk oranı veya geniş evrenin temsilî başarısı değildir. `sampleCount=1`, gerçek `criterionCount` ve `providerEfficacyVerified=false` açık kaydedilir. Gerçek pilot; uygun örneklem, farklı gruplar/diller, uzman mutabakatı ve sağlayıcı koşullarıyla ayrıca kabul edilmelidir.

Öneri itirazı akademik B11 itirazından ayrıdır. Düzeltme ayrı kayıttır; eski kıyas, kanıt, değerlendirme, kurul kararı ve belge değiştirilmez. Durdurulmuş/süresi bitmiş protokolde mevcut itirazın giderilmesi mümkündür. Bu modül `assess`, `decide`, `issue` veya `revoke` çağırmaz; model tek başına yüksek etkili karar veremez. Biyometrik izleme, duygu çıkarımı veya kamera/mikrofon özelliği eklenmedi.

## Yetki, dayanıklılık ve veri

Her komut mevcut kişi/kurum/birim/MFA ile atomik kayıt+idempotency+audit işleminde çalışır. Replay kayıt oluşturan kişi ve güncel görevi yeniden gerektirir. Her protokol/değerlendirme çifti için tek örnek, örnek için tek kıyas ve ona tek itiraz vardır; yeni protokol ayrı sürümdür. Denetim yazılamazsa kıyas da geri alınır.

Öğrenen kendi örneklerini, akademik yetkili yalnız kendi biriminin kayıtlarını görür. Yönetici protokol hazırlayabilir ama genel yönetici göreviyle kişi kıyasları verilmez; IT, mali işler ve başka öğrenene açılmaz. Sahip veri özeti dört yeni kişisel kayıt türünün izinli alanlarını kapsar; oturum sırrı/digest/başka öğrenen verisi dışa çıkmaz. Bu dar ekleme B28'in bütün kayıt tarafları, saklama, gerçek başvuru kanalı ve fiziksel imha kabulünü kapatmaz.

## Kaynak kaydı

14.10.2026 tarihinde okunan resmî teknik kaynaklar:

- NIST **AI 600-1, Generative Artificial Intelligence Profile**, nihai Temmuz 2024 sürümü: <https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf>. İncelenen kapsam GV-1.6 insan gözetimi/kaynak envanteri, MP-2.3 değerlendirme ve örneklem, MEASURE 3.3 geri bildirim/itiraz, MANAGE 4.1 izleme. Teknik yaklaşım için gönüllü rehber; Türk hukuk kuralı, Gazi kararı veya otomatik eşik kaynağı değildir. Taslak `GenAI-Profile.ipd` kullanılmadı.
- NIST **AI RMF Playbook**: <https://airc.nist.gov/airmf-resources/playbook/>. Sayfa önerilerin gönüllü ve tam uygulanacak kontrol listesi olmadığını, AI RMF 1.0 revizyonunun beklendiğini belirtiyor. Tam standarda uygunluk iddiası yok; kurum/model seçimi yapmaz.

Bu kaynaklardan teknik tasarım çıkarımı: öneri kökenini belirt, dayanakları sabitle, insan kıyasını ve itirazı ayrı kaydet. Protokoldeki kurumsal/veri/içerik hakları hâlâ kurumca teyit edilmelidir; okunmamış hüküm uygulanmadı.

## Kabul ve açık koşullar

`myys-advice.test.mjs`: 13 sunucu testi. `myys-advice-browser.cjs`: 13 gerçek yerel React/HTTP kontrolü; protokol/örnek/kıyas/itiraz/düzeltme/durdurma, ayrı roller, karar arşivi SHA, indirme/arama/yenileme ve 390 px klavye kontrolü. Tam güncel sonuç `acceptance/B35-advice-20261014.json` içindedir. İki ölçütlü senaryo doğru payda/farkı ayrıca doğrular. Manuel ekran okuyucu kabulü yapılmadı.

B04/B05/B10'un gerçek kurum kabulleri, onaylı sağlayıcı/plan/sürüm/veri-içerik hakkı, gerçek Türkçe pilot/uzman örneklemi, üretim kimlik/depo ve canlı kabul açık. `ACCESS-ACTIONS.md` madde 12 hedefi somutlaştırır. B35 tamamlandı değildir; B36 ve kalan bağımsız işler sürer.
