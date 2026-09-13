# 13 Eylül 2026 devam çalışması

Bu kayıt önceki teslimin yerine PASS üretmez. Yeni kontrollerin sınırını ve değişiklikleri kaydeder. Test edilen Preview/commit eşlemesi draft PR #33 ve dağıtımın `/api/build-info` cevabında tutulur.

## Başlangıç

- Yerel başlangıç: `8deba16d5f913953ab6ed0f091bd34f571103d69`.
- Uzak feature başlangıcı: `d6cbf274a4cd7b9ac68475762e01ab98be6d3663`; aynı kaynak ağacı `6674ef23cf4f69051b45c4e9bb231b38efb7fec5`.
- Main / PR tabanı: `42e2a5b5afb6d94fdb3c65a752e5b2d89573e8cc`; PR #33 taslak ve birleştirilmemiş.
- Önceki Preview: `dpl_84cxFyDrtC6DWmsGZtzaXw5xqMCm`, READY, target:null, aynı Vercel proje kimliği.
- Eski DPÜ: `https://kampusgo.uzemgo.com/pilot.html`; yayın kimliği `dpl_2zaxrgj1ZUG3BjaVpo6AJyPgn8pX`.
- Paylaşılan Supabase broker kaynak dosyası değişiklik öncesinde yerel başlangıçla birebir karşılaştırıldı: sürüm 2 eşleşti.

## Düzeltmeler

- Next sunucusu çıkış iptali başarısız olduğunda çerezi silip başarılı çıkış ilan etmiyor; veri göstermeyen `/oturum-durumu` sayfasında yeniden deneme sunuyor.
- Edge broker v3, Auth yenileme/kullanıcı servisinden bağımsız olarak yalnız sunulan opaque oturumu iptal ediyor. Veri tabanı iptali başarısızsa 503 döndürüyor. İptalden sonra ilgili Auth refresh oturumu `auth.admin.signOut(jwt, "local")` ile temizleniyor. Auth temizliği geçici olarak başarısız olsa bile iptal edilmiş opaque değer yeni uygulama işleminde kullanılamıyor. JWT'ler tarayıcıya verilmez.
- Servis erişim hatası, üyelik iptali veya oturum süresi dolmasıyla karıştırılmıyor.
- Hesap değişimi, çıkış ve geri/önbellek dönüşlerinde istemci sınırı güncel sunucu kimliğini yeniden kontrol ediyor. BroadcastChannel yalnız ekranı geçersiz kılar; kurum seçimini veya yetkiyi taşımaz. Yeni oturum durum uç noktası private/no-store'dur.
- DPÜ yan menüsü ve Gazi süreç menüsü çalışan bölüm bağlantılarına dönüştürüldü. Katalog, başvuru/karar geçmişi, ayrı belge/AKTS/ders tanıma durumları, finans/entegrasyon dry-run ve yönetim kayıtları sunucu snapshot'ından gösterilir. Kural kaydında kaynak/sürüm/karar sahibi/yürürlük/hesaplama temeli açılır.
- Rollback dosyasındaki ortak `private` şeması USAGE yetkisini kaldıran satır çıkarıldı. Rollback paylaşılan veritabanında çalıştırılmadı.
- Yeni read-only source CI, feature dalını ve ilgili PR yollarını kapsar. İçerik yazan eski iş akışlarının koşulları yeniden incelendi; eski alias iş akışı tetiklenmedi.

## Bu oturumda çalıştırılan kontroller

| Kontrol | Sonuç | Sınır |
|---|---|---|
| `npm test` | PASS | Legacy 36 domain testi, 12 eşleme testi, kaynak sözleşmeleri; canlı auth/browser testi değildir |
| `scripts/session-boundary-test.mjs` | PASS | Gerçek Next/Edge modüllerinde kontrollü DB/ağ/Auth hata enjeksiyonu; canlı Auth yerine geçmez |
| `npm run build` | PASS | İlk denemede dönüş tipi hatası bulundu ve düzeltildi; son build TypeScript ve tüm yolları geçti |
| `20260907014000_accounted_pilot_security.sql` | PASS | Güncel DB'de transaction + ROLLBACK; RLS, FORCE, grant, kurum/rol iptali ve legacy sınırları |
| `20260907015000_accounted_pilot_role_workflow.sql` | PASS | Güncel DB'de dokuz Gazi rolü; transaction + ROLLBACK; gerçek parola girişini test etmez |
| Canlı HTTP Auth kontratı | BLOCKED | İlk istekte curl proxy CONNECT zaman aşımı; uygulama cevabı alınmadı |
| İzole migration replay/rollback | BLOCKED | Kullanılabilir yerel Postgres/izole test bağlantısı yok; ortak DB rollback yapılmadı |
| Hesaplı Preview tarayıcı matrisi | BEKLİYOR | Yeni kesin Preview üzerinde güvenli tarayıcı girişinden sonra yürütülmeli |

Hesap dosyasında çoklu kurum kullanıcısı **`cift.kurum`**'dur. Önceki sohbet yanıtındaki `coklu.kurum` adı yanlıştı; hesap dosyası değiştirilmedi. Parolalar rapora/koda/CI loguna eklenmedi.

## Referans ve etki sınırı

- Supabase sunucu oturum iptali: https://supabase.com/docs/reference/javascript/auth-admin-signout
- Supabase kapsamlar ve JWT sınırı: https://supabase.com/docs/guides/auth/signout
- Gazi kaynakları ve kurumsal karar bekleyen maddeler: `docs/accounted-pilot-delivery.md`.
- Tarihsel migration'lar, legacy DPÜ kaynak/varlıkları, Görsel Akademi ve TEYS dosyaları değiştirilmedi. Ortak Next build yeni korumalı yolları içerir.
- Bu çalışmada yeni tablo/migration uygulanmadı, hesap/parola değiştirilmedi, davet/bildirim gönderilmedi.
- Production, main merge, özel alan adı/DNS/alias değişimi yapılmadı.
- Tam hesaplı tarayıcı matrisi ve izole migration geri alma kanıtı olmadan genel kabul tamamlanmış sayılmaz. Eski v15'in geniş iş akışlarının hesaplı DPÜ'ye tam eşdeğerliği ayrıca kabul testine tabidir; yalnız legacy dosya hash'inin korunması bu eşdeğerliği kanıtlamaz.
