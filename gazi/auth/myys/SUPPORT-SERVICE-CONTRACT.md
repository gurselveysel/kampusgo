# Destek hizmet kuralı ve rol kabulü

14.10.2026 · Yazılım Paketi 32 · B26 · Yalnız izole yerel kabul.

## Kullanıcının tamamlayabildiği akış

`#/academic/support` içindeki Destek kayıtları ekranında kişi kendi biriminde kayıt açar, konu/kayıt/birim araması ve durum/kuyruk filtresi kullanır, erişebildiği kayıt ve olay geçmişini JSON olarak indirir. Teknik, akademik ve veri koruma kuyrukları sırasıyla bilgi işlem, kalite ve yönetici rolüne bağlıdır. Görevli için güncel birim rolü ve çok faktörlü oturum gerekir. Sahip erişimi de güncel birim üyeliği gerektirir. Sunum profili yetki vermez.

Yetkili yanıtlar, çözüm bildirir veya izinli başka kuyruğa yönlendirir. Yönlendirme sonrasında eski kuyruk yetkisi kayıt erişimini sürdürmez. Çözüm bildirimi kaydı kendiliğinden kapatmaz: yalnız talep sahibi açık kutu teyidi ve gerekçeyle kapatır. Çözülmüş ya da kapatılmış kayıt sahibi tarafından yeniden açılabilir. Olaylar silinmez; beklenen sürüm, tekil komut ve atomik denetim izi korunur. Destek işlemi akademik kanıt, puan, karar veya belgeyi değiştirmez; resmî akademik itiraz yerine geçmez.

## Sürümlü çalışma takvimi

Yönetici kendi biriminde `support-policy` hazırlar. Başlık, kaynak başlığı/referansı/sürümü/tarihi/okunan kapsam, gerekçe ve yerel yetki dayanağı zorunludur. `official:false`, `officialApproval:false` ve `scope:local-acceptance` açıktır. Yeni sürüm güncel önceki sürüme ve değişiklik gerekçesine bağlıdır. Ayrı kalite görevlisi `support-policy-review` ile tam kayıt özetini inceler; hazırlayan kendi çok rollü hesabıyla dahi inceleyemez. Kabul edilmiş sürüm `support-policy-hold` ile yeni kayıtlara kapatılabilir.

Takvim açık UTC+03:00 ofseti, en çok 371 günlük tarih aralığı, benzersiz çalışma günleri, 1–6 çakışmayan aynı gün aralığı ve açıkça yazılmış kapalı günler içerir. Resmî tatil, nöbet, yaz saati, yasal süre veya kurum hizmet taahhüdü çıkarılmaz. Her üç kuyruk için ilk yetkili yanıtı/çözüm çalışma dakikası ve en çok iki farklı yönlendirme hedefi belirtilir. Çözüm hedefi yanıt hedefinden kısa olamaz. Hedef takvim kapsamı içinde hesaplanamıyorsa bilinmez kalır; 24/7 veya eski takvime dönüş yoktur.

Yeni kayıt ve yeniden açma anında sunucu, uygulanabilir son kabul edilmiş sürümün kimliğini, sürümünü, SHA-256 özetini ve inceleme kimliğini bağlar. İstemcinin gönderdiği bağ kullanılmaz. Yeni incelenmemiş taslak mevcut kabulü silmez. Seçili kabul durdurulmuş/sona ermişse eski sürüm kendiliğinden seçilmez. Daha önce bağlanan hedefler yeni kural, durdurma veya inceleyenin sonraki görev değişiminden etkilenmez; tarihsel inceleme bağı ve özet yine doğrulanır.

İlk yanıt, kaydın sahibinden farklı yetkili bir kişinin yanıtı veya çözüm bildirimidir. Sahip mesajı veya kuyruk değişimi yanıt sayılmaz. Kuyruk değişimi döngünün hedefini sıfırlamaz; yönlendirmede aynı sabit kuralın mevcut kuyruk izinleri kullanılır. Yeniden açma güncel kural ile ayrı döngü başlatır. Geçmiş döngüler aynı hedef ve sonuçla görünür. Sunucu saatinin tarihçenin gerisine gitmesi yeni olayı reddeder. Görünüm sunucunun hesaplama anını gösterir; yenileme gerekir, arka plan zamanlayıcısı/bildirim hizmeti yoktur.

Kalite göstergesinin destek çözüm payı `resolved` ve sahibi tarafından teyit edilmiş `closed` kayıtları sayar. Yeniden açılan kayıt paydan düşer; payda ve akademik göstergeler değişmez. Bu bir SLA uyum yüzdesi veya resmî yanıt süresi ölçümü değildir.

## Rehber sürümü ve erişilebilirlik

Rehber sürümü `2026.10.14.1`; öğrenen, eğitici ve yönetici adımları mevcut destek akışına bağlandı. Destek, öğrenme kanıtı ve kaynak aktarımı bağlantıları doğru akademik sekmeyi açar; URL ve yenileme seçimi korur. Önceki bilinen `2026.10.10.1` sürümünün altı soru kimliği/seçenekleri/doğru yanıtları değişmediğinden doğrulanmış yanıtlar korunur, göç açıklaması gösterilir. Okuma işlemi depoya yazmaz; yeni yanıt kaydında önceki yanıt özeti korunur. Bilinmeyen sürüm kendiliğinden dönüştürülmez. Rehber yanıtı sertifika, öğrenme kanıtı veya yetki değildir.

390 px destek, arama/filtre, tarihçe ve çalışma aralığı ekleme/kaldırma odağı gerçek Chromium ile sınandı. Adlandırılmış doğal form alanları, checkbox ve details kullanılır. Gerçek ekran okuyucu, bütün yardımcı teknolojiler, tüm içerik/belge erişilebilirliği kabul edilmiş sayılmaz. Gezinme regresyonunda, hedef içerikte odağı seçen kullanıcının odağını animasyon bitiminde yeniden taşıyan yarış giderildi: yeni içerik odağı bekleyen geçiş odağını iptal eder; son denetim bir sonraki çizim anında yapılır. Dar ekran testi de önceki sayfa geçişinin odak sonucunu bekler.

## Kabul kanıtı ve sınırlar

- `gazi/auth/tests/myys-support-service.test.mjs`: 13 yeni takvim/yetki/sürüm/tekillik/iki SQLite bağlantısından tekrar/atomik denetim/akademik değişmezlik testi.
- `scripts/myys-support-browser.cjs`: gerçek derlenmiş portal, geçici SQLite ve yalnız sentetik kişilerle 16 kontrol; dokuz çekirdek rol, ayrı kuyruklar, arama, gerçek JSON indirme, kapanış/yeniden açma, sürüm geçişi ve mobil klavye.
- `scripts/myys-local-acceptance.mjs --support`: yalnız loopback ve açık senaryo bayrağıyla ileri taşınabilen sentetik saat; dağıtım API'sine eklenmez.
- `acceptance/B26-support-service-20261014.json`: güncel toplu sonuç, kapsam matrisi ve tarayıcı kanıtı.
- `configuredCore()` Vercel'de kapalı; yeni tablo/migration/credential/servis/mesaj gönderimi yok. Son doğrulanmış canlı Paket16; Paket17–32 yayımlanmadı. Bu dosya veya kural Gazi'nin hizmet taahhüdü değildir.

B26'nın bağımsız yerel öğrenen/eğitici/yönetici senaryosu, notu değiştirmeyen destek sınırı ve rehber sürümü kabulü sağlandı. Kurum destek sahibi, gerçek çalışma saatleri/tatil takvimi, yanıt/çözüm hedefleri, kuyruk eskalasyonu, destek verisi saklama/erişim kararı ve gerçek eğitim kabulü bekleniyor. Kalıcı kurumsal depo/kimlik, üretim dağıtımı ve gerçek kullanıcı kabulü ayrıca gerekir. B26 ve B01–B36 genel tamamlanması iddia edilmez.
