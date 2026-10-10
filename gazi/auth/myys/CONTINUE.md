# ÜniGO MYYS devam talimatı — 10 Ekim 2026

Ben Veysel Gürsel. gazi.unigoturkiye.com üzerindeki mevcut Gazi ÜniGO MYYS geliştirmesine devam et. Sıfırdan uygulama kurma; çalışan kodu, tasarımı, logoları, dersleri ve kayıtları koru. Tek entegrasyon sahibi olarak çalış; paralel editör açma. Araştır, uygula, test et; güvenle tamamlanan yayın kapsamını mevcut projeye dağıt ve canlıda doğrula. Benden genel yayın onayını veya sürekli devam komutunu bekleme.

## Başlangıçta yeniden doğrulanacak referans

- Repo: gurselveysel/kampusgo; dal: feat/gazi-myys-governed-core-20261010.
- Çalışma dizini: /workspace/scratch/395f9281820e/gazi-consistent.
- Uzak kaynak: 2f58f210905fee96bfb4a38d18c423cb251f0d0e; yerel aynı içerik: b19c2aa37db889afbc9b94f781f3edef51706c21; ortak ağaç: d66d585eedbe04f12336664ba0a9870f13365373.
- Canlı kaynak: 2743da31b6b6e278dfc13b27e8bc79145b708731; dağıtım: dpl_3KJc8BhJLm5Agu289W2eQ5oWUUoV; READY / production.
- Vercel proje: prj_cZMPrJHrk7XrteeM7jeui2BktKwK / gazi-unigo-myys; ekip: team_QH2k9edmHSXuybZK3Ay9RVAo.
- React: gazi/portal; korumalı dağıtım kökü: gazi/auth; akademik çekirdek: gazi/auth/myys.

Bu değerler referanstır. Güncel uzak dal, ağaç ve canlı aliası yeniden denetle; daha yeni başka değişiklik varsa koruyarak birleştir. Reset/clean veya geçmiş silme yapma. Kaynaklı institutional-depth kolu birleşmiştir; eski dalı doğrudan canlıya gönderme.

## Oku ve uygula

AGENTS.md ve ilgili becerilerle birlikte backlog.json, ACCEPTANCE-MATRIX.md, ACCESS-ACTIONS.md, RELEASE.md, IMPLEMENTATION.md ve IDENTITY-CONTRACT.md dosyalarını oku. B01–B36 için kod, yerel kabul, canlı durum, kurum kararı ve dış erişimi ayrı değerlendir.

B11 güvenli dilimi yayımlandı: 150 otomatik test, 13 izole rol tarayıcı kontrolü. İtiraz, bağımsız inceleme, yeniden değerlendirme ve yeni karar bağları korundu. Kurum itiraz usulü ile önceden imzalanmış belge değiştirme zinciri açık.

B06/B07 imzalı OIDC belirteç doğrulaması ve issuer/subject ile salt okuma kişi/üyelik çözümlemesi kaynakta hazır: 29 yeni test, toplam 179. Canlı girişe bağlanmadı. İlk bağımsız iş: yerel kabul deposunda state/nonce/PKCE bağlı tek kullanımlık giriş isteğini, eşzamanlı tekrar reddini, oturum sabitleme önlemini, üyelik iptali ve çıkışı kodla/test et. Gerçek callback/IdP varmış gibi sunma. Ardından B16/B17 olay işleme/karantina/mutabakat; B18/B20/B21 cüzdan/tanıma/kredi defteri; B28/B29/B30 veri hakları/kalite/kabul kapılarına geç.

## Korunacak kapsam

6 mikro program, 22 modül, 66 ders; 24 kaynak, 6 Gazi programından 76 Öğrenme Çıktısı özeti, 20 seviye özeti, 46 kalite alt ölçütü, 33 sayfa rehberi, 9 çekirdek rol ve 11 sunum profili. Kaynak sürümü 2026.10.10.3 kamu kaynak özetidir; gerçek öğrenci veya tüm TYVT entegrasyonu değildir. Tarayıcı taslaklarını kurumsal kalıcı kayıt sayma. Arayüz Türkçe; Öğrenme Çıktısı terminolojisi ve orijinal Gazi/ÜniGO logoları korunsun.

## Yetki ve güvenlik sınırı

configuredCore() Vercel'de kapalı kalmalı. LocalAcceptanceStore yalnız izole yerel kabul deposu. Gerçek IdP, GUZEM/UzemGO/OBS/YÖKSİS, kurumsal depo ve resmî belge yetkisi etkin değil. Üretim migration'ı, yeni kalıcı erişim/credential, ücretli servis, gerçek kişiye rozet/iptal ve kurum adına belge için genel yayın talimatını yeterli sayma. Eksik somut yetkiyi tek eylem paketinde belirt; bağımsız işleri sürdür.

Giriş korumasını kaldırma; gerektiğinde yalnız desteklenen browserAuth güvenli formunu kullan. Sohbette parola/kod isteme, okuma, kaydetme veya üretme. Canlı ve preview TOTP anahtarları ayrı; kodu yanlış ortamda tekrarlama.

Her yayında doğru proje/dal/kaynak/canlı farkını denetle, gerekli test ve tarayıcı kabulünü yap, gazi/auth korumalı paketlemesini kullan, canlı smoke çalıştır ve tam commit/deploy/geri dönüş/sınırlamaları RELEASE.md'ye yaz. Test edilmeyeni doğrulanmış veya 36 paketi bitmiş gösterme.
