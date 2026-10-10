# Ders içerikleri ve UzemGO senaryosu

2026-10-10 sürümü. Mevcut müfredat, öğrenci planları, notlar, rol akışı, erişim kapısı ve imzalı rozet modülü korunmuştur.

- 6 program, 22 modül, 66 ders. Her ders için 6 sayfalık özgün Türkçe çalışma sunumu; toplam 396 sayfa.
- 22 kurgu vaka: dört satırlık örnek veri, üç adımlı çözüm, açıklamalı kontrol sorusu. Aynı modülün üç dersinde ortak vaka açıkça belirtilir.
- 13 yayın kaydı: Data Carpentry, Microsoft, The Carpentries, W3C WAI, BCcampus, OER Project, AHRQ. Kaynak türü, dil ve kullanım koşulu ayrı tutulur. Açık lisans, yayıncının bütün eserlerine veya videolarına genellenmez.
- P01, P02 ve P06 için gömülü destek videoları; P03 ve P05 için yayıncı video atölyeleri; P04 için açık kitap ve özgün PowerPoint sunumları. Videolar modül destek materyalidir, 66 ayrı video olarak sunulmaz.
- W3C giriş videosu tam ve değiştirilmeden sunulur. Türkçe altyazı W3C'nin yayımladığı dosyadan aynen alınmıştır: https://www.w3.org/WAI/wai-videos/video-introduction/video-introduction.tr.vtt . Kaynak ve kullanım izni öğrenci ekranında yer alır.
- Türkçe sunum HTML olarak indirilebilir ve tarayıcıdan PDF yazdırılabilir. Vaka verileri CSV; öğrencinin çalışma dosyası JSON olarak indirilebilir. Bunlar akademik sertifika değildir.
- Ders içi sorular biçimlendirici öz değerlendirmedir; sonuçları resmî nota dönüşmez. Mevcut ders notları yerel öğrenci kaydına kaydedilir.

## UzemGO → MYYS akışı

UzemGO'nun resmî platform kılavuzundaki canlı ders, kayıt tekrarı, kişisel çalışma planı, test ve gelişim raporu yetenekleri üzerinden üniversite senaryosu hazırlanmıştır:
https://www.uzemgo.com/_files/ugd/23ebe2_ca9cc59fef0a4a908cf401bdecdc44ba.pdf

Altı etkileşimli adım: planla, katıl, çalış, değerlendir, kanıt hazırla, akademik incele. Yerel kanıt taslağı, mevcut öğrenci notları ve kişisel ilerleme ile oluşturulur. Öğrenme çıktısı ve içerik sürümü korunur. Başarı, AKTS veya belge otomatik verilmez.

Canlı UzemGO sınıfı, eğitmen raporu ve kurumlar arası kayıt aktarımı bağlı değildir. Ekran bunu kurum bağlantısı gerektiren senaryo olarak gösterir; gönderilmemiş paketi gönderilmiş saymaz. Sonraki entegrasyon için öğrenci kimliği, kayıt, ders sürümü, katılım/ölçme olayları ve insan değerlendirme yetkileri kurumlarla doğrulanmalıdır.

## Güvenlik ve yayın

Yayın kökü `gazi/auth`. Korunan manifest yeni altyazı dosyasını içerir. Altyazı da oturum gerektirir. CSP yalnız `media.w3.org` medya ve `youtube-nocookie.com` çerçevesini ekler; mevcut aynı kaynaklı çerçeveler korunur. Harici oynatıcı yalnız öğrenci tıklayınca yüklenir. Oturum, rozet ve kaynak dosyası güvenliği gevşetilmez.

Kaynak sayfaları resmî yayıncılar üzerinden incelenmiştir. Bazı yayıncılar sunucu HEAD isteklerini 403 ile sınırlar; bu, kullanıcı tarayıcısında erişimin test edildiği anlamına gelmez. Her dersin Türkçe rehberi ve indirilebilir vaka verisi harici yayıncıdan bağımsızdır.
