# Güncel devam noktası — Paket 8 kaynak adayı

Son güvenli yayın Paket 7: uzak `3388af9f1a9d9cdc7aedbd36a03ade8b4f264743`, yerel `ee63166a7cd050411fd70ab5ea2889b40e1d6ad3`, aynı ağaç `f1aaec5d01b79bd69b0eeb6094a33a18be3be25b`; dağıtım `dpl_5byPykXgobPQbncALGBs39kEQ4tk`. 139 kaynak hash eşleşmesi ve canlı smoke geçti. Geri dönüş Paket 6 `dpl_3QxBAAEiFAEoESH86QRaggCyjBj3`.

B03/B09 kaynak dilimi yerelde geçti: 240 otomatik test + 8 program tarayıcı kontrolü; çoklu çıktı/görev/rubrik yazarlığı, sürüm karşılaştırması, eski karar dayanağı indirme. Arşiv imzasızdır; gerçek LMS imzalı kaynak kabulü açık. Yayın doğrulandığında aşağıdaki RELEASE kaydını güncelle. Sonra B20/B21 sürümlü tanıma politikası/başvuru/tekil kredi defteri; B28/B29/B30 veri talepleri/kalite/kapılar; kalan bağımsız B01–B36 kod ve ekran işleri. B16/B17 ve B18 ilk yerel dilimlerini tekrar yazma.

Aşağıdaki önceki kayıtlar tarihsel referanstır; güncel kaynak/aliası her yayında yeniden doğrula. configuredCore() kapalı kalır. B01–B36 bütünü tamamlanmadı.

# ÜniGO MYYS devam talimatı — 10 Ekim 2026

Ben Veysel Gürsel. gazi.unigoturkiye.com üzerindeki mevcut Gazi ÜniGO MYYS geliştirmesine devam et. Sıfırdan uygulama kurma; çalışan kodu, tasarımı, logoları, dersleri ve kayıtları koru. Tek entegrasyon sahibi olarak çalış; paralel editör açma. Araştır, uygula, test et; güvenle tamamlanan yayın kapsamını mevcut projeye dağıt ve canlıda doğrula. Benden genel yayın onayını veya sürekli devam komutunu bekleme.

## Yeniden doğrulanacak son kod/yayın referansı

- Repo: gurselveysel/kampusgo; dal: feat/gazi-myys-governed-core-20261010.
- Çalışma dizini: /workspace/scratch/395f9281820e/gazi-consistent.
- Son yayımlanan kod: 24b41c8dba48bfa261a51613fbbc3a83a7939f13; yerel aynı içerik: f4e51c0577580872a35ff32bdf9d7a6f4e24948a; ortak ağaç: eaf0b9ad3cd18961891ae29444a8c6c3a6017e99. Sonrasında yayın/başlangıç kaydı commitleri olabilir; güncel HEAD'i yeniden bul.
- Canlı kaynak: 24b41c8dba48bfa261a51613fbbc3a83a7939f13; dağıtım: dpl_DzCWthAQgmM2Gr1kjmVLHfgzxFGg; READY / production. Geri dönüş hedefi Paket 4: dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV (fiilen uygulanmadı).
- Vercel proje: prj_cZMPrJHrk7XrteeM7jeui2BktKwK / gazi-unigo-myys; ekip: team_QH2k9edmHSXuybZK3Ay9RVAo.
- React: gazi/portal; korumalı dağıtım kökü: gazi/auth; akademik çekirdek: gazi/auth/myys.

Bu değerler referanstır. Güncel uzak dal, ağaç ve canlı aliası yeniden denetle; daha yeni başka değişiklik varsa koruyarak birleştir. Reset/clean veya geçmiş silme yapma. Kaynaklı institutional-depth kolu birleşmiştir; eski dalı doğrudan canlıya gönderme.

## Oku ve uygula

AGENTS.md ve ilgili becerilerle birlikte backlog.json, ACCEPTANCE-MATRIX.md, ACCESS-ACTIONS.md, RELEASE.md, IMPLEMENTATION.md ve IDENTITY-CONTRACT.md dosyalarını oku. B01–B36 için kod, yerel kabul, canlı durum, kurum kararı ve dış erişimi ayrı değerlendir.

B11 güvenli dilimi yayımlandı: 150 otomatik test, 13 izole rol tarayıcı kontrolü. İtiraz, bağımsız inceleme, yeniden değerlendirme ve yeni karar bağları korundu. Kurum itiraz usulü ile önceden imzalanmış belge değiştirme zinciri açık.

B06/B07 doğrulayıcı ve yerel tek kullanımlık giriş akışı kodlandı: 29 belirteç/kişi testi + 27 PKCE/state/nonce/oturum testi. İki SQLite bağlantısında tekrar reddi, üyelik iptali, süre dolması, çıkış ve atomik denetim/oturum yazımı sınandı. Güncel toplam 114 sunucu + 46 portal + 46 regresyon = 206 test; 13 B11 tarayıcı kontrolü yeniden geçti. Bu hazırlık Paket 5 içinde dağıtıldı; canlı girişe bağlanmadı, gerçek HTTP callback/IdP yok. Tamamlanan dilimi yeniden yazma. İlk bağımsız iş için B16/B17 kalıcı olay işleme, karantina, idempotency ve toplu satır mutabakatını inceleyip eksik en küçük uçtan uca dilimi uygula. B06/B07 HTTP/cookie/CSRF, gerçek IdP eşlemesi, dağıtık iptal ve üretim depo adaptörü açık kalır. Ardından B18/B20/B21 cüzdan/tanıma/kredi defteri ve B28/B29/B30 veri hakları/kalite/kabul kapılarına devam et.

## Korunacak kapsam

6 mikro program, 22 modül, 66 ders; 24 kaynak, 6 Gazi programından 76 Öğrenme Çıktısı özeti, 20 seviye özeti, 46 kalite alt ölçütü, 33 sayfa rehberi, 9 çekirdek rol ve 11 sunum profili. Kaynak sürümü 2026.10.10.3 kamu kaynak özetidir; gerçek öğrenci veya tüm TYVT entegrasyonu değildir. Tarayıcı taslaklarını kurumsal kalıcı kayıt sayma. Arayüz Türkçe; Öğrenme Çıktısı terminolojisi ve orijinal Gazi/ÜniGO logoları korunsun.

## Yetki ve güvenlik sınırı

configuredCore() Vercel'de kapalı kalmalı. LocalAcceptanceStore yalnız izole yerel kabul deposu. Gerçek IdP, GUZEM/UzemGO/OBS/YÖKSİS, kurumsal depo ve resmî belge yetkisi etkin değil. Üretim migration'ı, yeni kalıcı erişim/credential, ücretli servis, gerçek kişiye rozet/iptal ve kurum adına belge için genel yayın talimatını yeterli sayma. Eksik somut yetkiyi tek eylem paketinde belirt; bağımsız işleri sürdür.

Giriş korumasını kaldırma; gerektiğinde yalnız desteklenen browserAuth güvenli formunu kullan. Sohbette parola/kod isteme, okuma, kaydetme veya üretme. Canlı ve preview TOTP anahtarları ayrı; kodu yanlış ortamda tekrarlama.

Her yayında doğru proje/dal/kaynak/canlı farkını denetle, gerekli test ve tarayıcı kabulünü yap, gazi/auth korumalı paketlemesini kullan, canlı smoke çalıştır ve tam commit/deploy/geri dönüş/sınırlamaları RELEASE.md'ye yaz. Test edilmeyeni doğrulanmış veya 36 paketi bitmiş gösterme.

## Desteklenen yerel tarayıcı kabulü

Chromium 138.0.7204.0 bu ortamda çalışıyor. Yeniden indirme veya güvenlik sınırını değiştirme: `MYYS_CHROMIUM_EXECUTABLE=/tmp/gazi-chromium/chromium MYYS_CHROMIUM_PACKAGE=/tmp/gazi-browser-runtime/node_modules/@sparticuz/chromium node scripts/myys-appeals-browser.cjs`. Geçici dosyalar yoksa güncel desteklenen araçları yeniden değerlendir. Bulut tarayıcının loopback erişimini zorlamayın. Canlı oturumun başka sohbete taşındığını varsaymayın.

## Güncel yerel devam — Paket 6 adayı

B16/B17 ilk uçtan uca dilim eklendi: kalıcı işçi, karantina, rol kapsamlı inceleme, satır bazlı toplu hazırlık/CSV. 221 otomatik test ve 8 yeni + 13 B11 tarayıcı kontrolü geçti. Ayrıntı: acceptance/B16-B17-20261010.json. Yayın kimlikleri RELEASE.md içinde ayrıca kaydedilir. Sonraki bağımsız iş: B18 özel cüzdan indirme/paylaşım iptal uçları; ardından sürümlü tanıma/tekil kredi ve veri hakları. B16 üretim/sağlayıcı adaptörü ve B17 imza/teslim açık.

## B18 tarihsel devam noktası

Paket 6 e10989a9084c42f131a798d65da465f392bc8993 / dpl_3QxBAAEiFAEoESH86QRaggCyjBj3 production READY; 138 kaynak SHA eşleşmesi ve canlı oturum/akademik kapı/rehber smoke geçti. B18 cüzdan kaynak dilimi: 230 otomatik test + 8 cüzdan tarayıcı kontrolü. Paket 7 yayımlanınca RELEASE kaydını güncelle. Sonraki bağımsız işler: B03/B09 çoktan çoğa sürümlü rubrik/görev eşlemesi, B20/B21 tanıma/tekil kredi, B28/B29/B30 veri/kalite/kabul; 36 iş henüz tamamlanmadı.
