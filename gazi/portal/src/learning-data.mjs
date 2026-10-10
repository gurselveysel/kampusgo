// Authored pilot curriculum, not a university-approved syllabus or hosted course.
// Stable identifiers keep personal progress independent of display order.
const lesson = (id, title, outcome, brief, task, minutes = 12) => ({id, title, outcome, brief, task, minutes});
const module = (id, title, lessons) => ({id, title, lessons});
export const curricula = {
 P01: [
  module('P01-M01','Veri okuryazarlığına giriş',[
   lesson('P01-L01','Veri, bilgi ve karar','Veri ile yorum arasındaki farkı açıklar.','Bir ölçüm tek başına bir karar değildir. Veriyi anlamlandırmak için kaynağı, birimi, kapsadığı dönemi ve hangi soruyu yanıtladığını birlikte inceleyin.','Günlük yaşamdan üç veri örneği yazın. Her örnek için bir ölçüm ve bu ölçümden çıkarılabilecek bir yorum belirleyin.'),
   lesson('P01-L02','Veri türleri ve değişkenler','Sayısal ve kategorik değişkenleri ayırt eder.','Yaş, süre ve adet sayısal; bölüm ve ulaşım türü kategorik değişkenlere örnektir. Kod olarak kullanılan sayılar her zaman ölçüm değildir.','Beş sütunlu bir örnek öğrenci anketi tasarlayın. Her sütunun veri türünü ve ölçü birimini belirtin.'),
   lesson('P01-L03','Doğru soruyu sormak','Ölçülebilir bir analiz sorusu oluşturur.','İyi bir analiz sorusu hedef grubu, zaman aralığını ve karşılaştırmayı açıklar. Belirsiz bir başarı tanımı farklı sonuçların karıştırılmasına yol açabilir.','“Öğrenme deneyimi nasıl iyileşir?” sorusunu veriyle yanıtlanabilecek iki alt soruya dönüştürün.')]),
  module('P01-M02','Veri toplama ve kalite',[
   lesson('P01-L04','Kaynak seçimi ve veri sözlüğü','Verinin kaynağını ve alanlarını belgeler.','Bir veri sözlüğü her alanın adını, anlamını, veri türünü ve eksik değer gösterimini açıklar. Kaynak ve güncelleme tarihi analizin izlenebilirliğini sağlar.','Örnek anketinizin beş alanı için bir veri sözlüğü hazırlayın.'),
   lesson('P01-L05','Eksik ve yinelenen kayıtlar','Veri kalitesi sorunlarını tespit eder.','Boş hücre, sıfır ve “yanıt yok” aynı anlama gelmeyebilir. Aynı görünen iki kayıt da her zaman yinelenmiş değildir; tekil kayıt tanımını önce belirleyin.','On satırlık kurgu bir tabloda iki eksik değer ve bir yinelenen kayıt oluşturun. Düzeltme kararınızın gerekçesini not edin.'),
   lesson('P01-L06','Temizleme ve dönüşüm planı','Tekrarlanabilir bir veri temizleme planı hazırlar.','Ham verinin bir kopyasını koruyun. Biçim dönüşümleri, geçersiz değerler ve dışlanan satırlar için işlem sırasını kaydedin; sonucu önce ve sonra karşılaştırın.','Tarih biçimi, kategori yazımı ve eksik değerler için üç adımlı bir temizleme kontrol listesi oluşturun.',18)]),
  module('P01-M03','Analiz ve görselleştirme',[
   lesson('P01-L07','Özet istatistikleri yorumlama','Ortalama ve ortancayı karşılaştırır.','Ortalama tüm değerlerin toplamının gözlem sayısına bölünmesidir. Ortanca sıralı verinin ortasındaki değerdir. Aykırı değerler ortalamayı belirgin biçimde etkileyebilir.','2, 3, 3, 4, 18 değerlerinin ortalamasını ve ortancasını hesaplayın. Hangisinin tipik gözlemi daha iyi anlattığını tartışın.'),
   lesson('P01-L08','Sorunuza uygun grafik','Karşılaştırmaya uygun bir grafik seçer.','Sütun grafiği kategorileri karşılaştırmak, çizgi grafiği zaman içindeki değişimi incelemek için kullanılabilir. Başlık, birim, eksen aralığı ve kaynak anlaşılır olmalıdır.','Üç bölümün örnek katılım sayılarını sütun grafiğine dönüştürün. Grafiğe birim ve açıklayıcı başlık ekleyin.'),
   lesson('P01-L09','Bulguları anlatmak','Veri bulgularını sınırlarıyla birlikte sunar.','Birlikte değişen iki değişken arasında doğrudan neden-sonuç ilişkisi kurulamaz. Sunumda gözlemi, yorumu ve belirsizliği ayrı ifade edin.','Bir grafiğinizi kullanarak bir bulgu, bir sınırlılık ve bir sonraki araştırma sorusu yazın.',18)]),
  module('P01-M04','Yapay zekâ ve sorumlu kullanım',[
   lesson('P01-L10','Yapay zekâya temel bakış','Model girdisi ile model çıktısını ayırt eder.','Bir model, verilerdeki örüntülerden üretilmiş bir tahmin veya yanıt sunar. Bir çıktının akıcı görünmesi doğru olduğu anlamına gelmez; görev ve doğrulama ölçütü açık olmalıdır.','Bir sınıflandırma ve bir metin üretimi örneği seçin. Girdiyi, beklenen çıktıyı ve doğrulama yöntemini tanımlayın.'),
   lesson('P01-L11','Üretilen çıktıyı doğrulamak','YZ yanıtını kanıtlarla değerlendirir.','Tarih, sayı ve kaynak iddialarını bağımsız kayıtlarla kontrol edin. Kaynağın gerçekten var olması, verilen iddiayı desteklediği anlamına gelmez.','Kurgu bir YZ yanıtındaki üç iddiayı seçin. Her biri için gerekli kanıt türünü ve kontrol adımını yazın.'),
   lesson('P01-L12','Mahremiyet, önyargı ve etik','Veri kullanımındaki etik riskleri yorumlar.','Amaca gerekmeyen kişisel bilgileri paylaşmamak ve bir veri kümesinde kimlerin temsil edilmediğini sorgulamak temel inceleme adımlarıdır. İnsan incelemesi için açık bir sorumluluk belirleyin.','Örnek bir öğrenci destek sistemi için veri minimizasyonu, temsil ve insan incelemesi başlıklarında birer risk yazın.')]),
  module('P01-M05','Uygulama ve öğrenme kanıtı',[
   lesson('P01-L13','Mini analiz projesi','Bir analiz sorusuna uygun çalışma planı oluşturur.','Projenizi soru, veri sözlüğü, temizleme adımları, görselleştirme ve sınırlılıklar olarak bölün. Gerçek kişisel veri yerine kurgu veri kullanın.','Önceki derslerde oluşturduğunuz tabloyu kullanarak bir sayfalık analiz planı hazırlayın.',20),
   lesson('P01-L14','Portfolyo ve öz değerlendirme','Çalışmasını öğrenme çıktılarıyla ilişkilendirir.','Portfolyo yalnız sonuç dosyasından oluşmaz. Bir kararın nedenini ve hangi öğrenme çıktısını desteklediğini açıklayan kısa notlar da içermelidir.','Veri kalitesi, görselleştirme ve etik risk başlıklarına birer kanıt ve iyileştirme notu ekleyin.',18),
   lesson('P01-L15','Programı değerlendirme','Öğrenme sürecini değerlendirir ve gelişim hedefi belirler.','Ders ilerlemesi kişisel çalışma takibidir. Akademik değerlendirme, kanıt incelemesi ve kredilendirme ayrı süreçlerde yürütülür.','En çok geliştiğiniz alanı, hâlâ zorlandığınız konuyu ve bir sonraki öğrenme hedefinizi yazın.')])
 ],
 P02: [
  module('P02-M01','Öğrenme tasarımının temelleri',[
   lesson('P02-L01','Öğrenen gereksinimleri','Hedef grubun gereksinimlerini belirler.','Bir tasarıma başlamadan önce ön bilgi, amaç ve erişim koşullarını birlikte düşünün.','Kurgu bir hedef grup için üç gereksinim ve bunları öğrenme yöntemini yazın.'),
   lesson('P02-L02','Ölçülebilir öğrenme çıktısı','Gözlenebilir bir öğrenme çıktısı yazar.','Çıktı öğrencinin ne yapacağını ve hangi bağlamda göstereceğini açıklar.','Bir konu için gözlenebilir fiillerle iki öğrenme çıktısı yazın.'),
   lesson('P02-L03','Etkinlik ve çıktı uyumu','Etkinlikleri çıktılarla ilişkilendirir.','Her etkinliğin desteklediği öğrenme çıktısını ve ortaya çıkardığı kanıtı belirleyin.','Çıktı, etkinlik ve kanıttan oluşan üç sütunlu bir eşleme hazırlayın.')]),
  module('P02-M02','Dijital ders geliştirme',[
   lesson('P02-L04','İçeriği modüllere ayırma','İçeriği anlamlı öğrenme birimlerine böler.','Her modül açık bir hedefe, çalışma sırasına ve tamamlanma işaretine sahip olmalıdır.','Bir dersi üç modüle ayırın ve her modül için bir hedef yazın.'),
   lesson('P02-L05','Etkileşimli etkinlikler','Katılımı destekleyen etkinlik tasarlar.','İzleme veya okumayı kısa bir karar, üretim ya da tartışma göreviyle birleştirin.','Bir okuma metni için karşılaştırma ve uygulama etkinliği oluşturun.'),
   lesson('P02-L06','Erişilebilir materyal','Materyaldeki erişim engellerini belirler.','Anlamı yalnız renk, ses veya görselle aktarmayın; metinsel karşılıklar hazırlayın.','Bir sunumunuz için başlık, alternatif metin ve okunabilirlik kontrolü yapın.')]),
  module('P02-M03','Değerlendirme ve geri bildirim',[
   lesson('P02-L07','Öğrenme kanıtları','Bir çıktıya uygun kanıt seçer.','Bir ürün, performans veya gerekçeli çözüm öğrenmenin farklı yönlerini gösterebilir.','İki çıktı için uygun kanıt türünü gerekçesiyle seçin.'),
   lesson('P02-L08','Rubrik tasarlama','Açık ölçüt ve performans düzeyleri oluşturur.','Bir rubrik, aynı ölçütte farklı performans düzeylerini gözlenebilir ifadelerle ayırır.','Üç ölçüt ve dört düzey içeren örnek bir rubrik yazın.'),
   lesson('P02-L09','Geliştirici geri bildirim','Sonraki adımı gösteren geri bildirim yazar.','Geri bildirim gözlemi, ölçütle ilişkisini ve somut iyileştirme önerisini içermelidir.','Kurgu bir öğrenci ürününe iki güçlü yön ve bir gelişim önerisi yazın.')]),
  module('P02-M04','Tasarım portfolyosu',[
   lesson('P02-L10','Ders akışı oluşturma','Etkinlikleri tutarlı bir sıraya yerleştirir.','Ön bilgiyi etkinleştirme, uygulama ve değerlendirme adımlarını bir bütün olarak planlayın.','Bir modülün başlangıç, çalışma ve değerlendirme akışını çizin.'),
   lesson('P02-L11','Akran incelemesi','Tasarımı ölçütlerle inceler.','İncelemeyi kişisel beğeniden ayırmak için önceden tanımlı ölçütler kullanın.','Çıktı uyumu ve erişilebilirlik için bir akran kontrol listesi hazırlayın.'),
   lesson('P02-L12','Revizyon ve öz değerlendirme','Geri bildirime dayalı revizyon planlar.','Yapılan değişikliği, dayanağını ve beklenen etkisini birlikte kaydedin.','Ders tasarımınızda üç revizyonu gerekçesiyle listeleyin.')])
 ],
 P03: [
  module('P03-M01','Sürdürülebilirlik ve üretim',[
   lesson('P03-L01','Üretim sistemine bütüncül bakış','Bir üretim sürecinin girdilerini ve çıktılarını tanımlar.','Süreç sınırı hangi adımların değerlendirmeye dahil olduğunu belirler.','Kurgu bir ürün için süreç sınırını, girdileri ve çıktıları çizin.'),
   lesson('P03-L02','Kaynak ve enerji akışı','Kaynak kullanım noktalarını belirler.','Malzeme, su ve enerji kullanımını süreç adımlarıyla eşleştirin.','Üç süreç adımı için ölçülebilir birer kaynak göstergesi yazın.'),
   lesson('P03-L03','Atık ve döngüsel yaklaşım','Atık azaltma fırsatlarını belirler.','Önleme, yeniden kullanım ve geri dönüşüm seçeneklerini bağlam içinde karşılaştırın.','Seçtiğiniz süreç için iki atık önleme önerisi geliştirin.')]),
  module('P03-M02','Etki ve veri incelemesi',[
   lesson('P03-L04','Çevresel gösterge seçimi','Amaçla uyumlu göstergeler seçer.','Mutlak tüketim ile ürün başına tüketim farklı sorulara yanıt verir.','Bir mutlak ve bir yoğunluk göstergesi tanımlayın.'),
   lesson('P03-L05','Karbon verisini yorumlama','Etki hesabının varsayımlarını açıklar.','Bir hesabın anlamı kullanılan sınır, veri kalitesi ve dönüşüm katsayılarına bağlıdır.','Örnek bir hesap için doğrulanması gereken üç varsayımı yazın.'),
   lesson('P03-L06','Veri kalitesi ve belirsizlik','Verinin sınırlılıklarını belgeler.','Tahmini ve ölçülmüş değerleri ayırt edin; veri dönemini ve kaynağını saklayın.','Beş kayıt için kaynak ve belirsizlik alanları olan bir tablo tasarlayın.')]),
  module('P03-M03','İyileştirme projesi',[
   lesson('P03-L07','Seçenekleri karşılaştırma','İyileştirme seçeneklerini ortak ölçütlerle karşılaştırır.','Etki, uygulanabilirlik ve maliyet gibi ölçütleri karar öncesinde açıklayın.','İki öneriyi üç ölçüte göre karşılaştırın.'),
   lesson('P03-L08','Eylem ve izleme planı','Sorumlu ve gösterge içeren plan oluşturur.','Her eylem için bir sorumlu, hedef tarih ve izleme göstergesi belirleyin.','Üç eylemlik bir iyileştirme planı yazın.'),
   lesson('P03-L09','Proje sunumu ve değerlendirme','Önerisini kanıt ve sınırlılıklarla sunar.','Önerinin beklenen etkisini doğrulanmış sonuçtan ayrı ifade edin.','Bir sayfalık öneri raporu ve bir öz değerlendirme notu hazırlayın.')])
 ],
 P04: [
  module('P04-M01','Araştırma sorusu ve kapsam',[
   lesson('P04-L01','Araştırma problemini tanımlama','Sınırları belirli bir araştırma sorusu yazar.','İyi tanımlanmış bir problem hedefi, bağlamı ve inceleme kapsamını açıklar.','Bir ilgi alanınızdan ölçülebilir bir araştırma sorusu üretin.'),
   lesson('P04-L02','Kaynak tarama planı','Kaynak seçimi için ölçüt belirler.','Arama terimlerini ve dahil etme ölçütlerini belgelemek taramayı izlenebilir kılar.','Üç arama terimi ve iki kaynak seçme ölçütü yazın.'),
   lesson('P04-L03','Amaç ve teslimler','Projenin somut teslimlerini tanımlar.','Amaç beklenen yönü, teslim ise ortaya çıkacak somut ürünü açıklar.','Bir amaç ve bu amaca bağlı üç teslim tanımlayın.')]),
  module('P04-M02','Proje planlama',[
   lesson('P04-L04','İş paketleri','Projeyi yönetilebilir iş paketlerine ayırır.','Her paketin kapsamı, sorumlusu ve tamamlanma ölçütü açık olmalıdır.','Projeniz için dört iş paketi oluşturun.'),
   lesson('P04-L05','Takvim ve bağımlılıklar','İşler arasındaki bağımlılıkları belirler.','Bir işin başlaması için hangi çıktının hazır olması gerektiğini not edin.','Dört paketin başlangıç sırasını ve bağımlılıklarını gösterin.'),
   lesson('P04-L06','Kaynak ve bütçe taslağı','Kaynak gereksinimini gerekçelendirir.','İnsan zamanı, araç ve diğer giderleri varsayımlarıyla birlikte planlayın.','Her iş paketi için bir kaynak gereksinimi yazın.')]),
  module('P04-M03','Risk ve izleme',[
   lesson('P04-L07','Risk kaydı','Riskleri olasılık ve etkiyle değerlendirir.','Risk henüz gerçekleşmemiş bir belirsizliktir; mevcut sorunlardan ayrı izlenir.','Üç risk için etki, önlem ve sorumlu belirleyin.'),
   lesson('P04-L08','İlerleme göstergeleri','Proje durumunu ölçülebilir göstergelerle izler.','Harcanan süre her zaman tamamlanan iş miktarını göstermez.','İki teslim için tamamlanma kanıtını tanımlayın.'),
   lesson('P04-L09','Değişiklik yönetimi','Kapsam değişikliğinin etkisini inceler.','Yeni bir talebin takvim, kaynak ve teslimlere etkisini karar öncesinde kaydedin.','Kurgu bir değişiklik isteği için etki değerlendirmesi yazın.')]),
  module('P04-M04','Raporlama ve kapanış',[
   lesson('P04-L10','Ara rapor hazırlama','Durum, risk ve sonraki adımı raporlar.','Bir ara rapor tamamlananları, açık sorunları ve gereken kararları görünür kılar.','Projeniz için bir sayfalık durum raporu hazırlayın.'),
   lesson('P04-L11','Çıktı ve kanıt arşivi','Teslimleri sürüm ve kaynak bilgisiyle düzenler.','Dosya adı, tarih, sürüm ve sorumlu bilgisi yeniden kullanımı kolaylaştırır.','Proje arşiviniz için bir klasör ve sürümleme planı yazın.'),
   lesson('P04-L12','Öğrenilen dersler','Süreçten gelişim önerileri çıkarır.','Beklenen ve gerçekleşen durum arasındaki farkı somut örneklerle değerlendirin.','Bir güçlü yön, bir güçlük ve bir iyileştirme eylemi yazın.')])
 ],
 P05: [
  module('P05-M01','İletişimin temelleri',[
   lesson('P05-L01','Etkin dinleme','Anladığını kontrol eden iletişim kurar.','Özetleme ve açık uçlu sorular, farklı yorumları görünür kılmaya yardımcı olur.','Kurgu bir ekip konuşması için iki açık uçlu soru yazın.'),
   lesson('P05-L02','Açık ve anlaşılır anlatım','Mesajı hedef kişiye uygun biçimde düzenler.','Kısa cümleler ve açık sorumluluk ifadeleri belirsizliği azaltır.','Belirsiz bir görev talebini açık bir iş tanımına dönüştürün.'),
   lesson('P05-L03','Empati ve mahremiyet','İletişimde kişisel sınırları dikkate alır.','Örnek çalışmalarda gerçek kişilerin özel bilgilerini kullanmayın; kurgu vakalarla çalışın.','Bir ekip görüşmesinde mahremiyeti koruyacak üç davranış yazın.')]),
  module('P05-M02','Ekip koordinasyonu',[
   lesson('P05-L04','Rol ve sorumluluklar','Ekip görevlerini açıklar.','Ortak hedef, görev sahibi ve tamamlanma ölçütü birlikte tanımlanmalıdır.','Kurgu bir ekip için görev-sorumlu tablosu hazırlayın.'),
   lesson('P05-L05','Yapılandırılmış bilgi aktarımı','Bilgiyi tutarlı bir sırayla sunar.','Durum, ilgili bağlam, gözlem ve beklenen eylemi ayrı başlıklarla aktarın.','Tıbbi karar içermeyen bir toplantı organizasyonu vakasını bu başlıklarla özetleyin.'),
   lesson('P05-L06','Geri bildirim ve anlaşmazlık','Gözleme dayalı geri bildirim verir.','Kişi hakkında etiket kullanmak yerine gözlenen davranışı ve etkisini açıklayın.','Kurgu bir ekip anlaşmazlığı için yapıcı geri bildirim yazın.')]),
  module('P05-M03','Vaka ve öz değerlendirme',[
   lesson('P05-L07','İletişim vakasını inceleme','Bir iletişim aksamasının nedenlerini analiz eder.','Bilgi eksikliği, belirsiz görev ve zamanlama gibi etkenleri ayrı inceleyin.','Kurgu bir toplantı gecikmesinin nedenlerini sınıflandırın.'),
   lesson('P05-L08','Ekip eylem planı','Ortak bir iyileştirme planı oluşturur.','Eylemin nasıl izleneceğini ve kimin takip edeceğini belirleyin.','Vaka için üç adımlı iletişim iyileştirme planı oluşturun.'),
   lesson('P05-L09','Yansıtıcı değerlendirme','Kendi iletişimine yönelik gelişim hedefi belirler.','Somut bir davranışı değerlendirmek genel bir öz yargıdan daha uygulanabilirdir.','Bir dinleme ve bir geri bildirim hedefi belirleyin.')])
 ],
 P06: [
  module('P06-M01','Erişilebilirliğin temelleri',[
   lesson('P06-L01','Farklı erişim gereksinimleri','Dijital erişim engellerini örneklerle açıklar.','Kullanıcılar aynı içeriğe farklı araç ve koşullarla erişir. Küçük yazı, yalnız sesle aktarılan bilgi veya belirsiz düğmeler katılımı zorlaştırabilir.','Günlük kullandığınız bir sayfada üç olası erişim engeli belirleyin.'),
   lesson('P06-L02','Anlamlı başlık ve bağlantılar','İçerik yapısını anlaşılır biçimde düzenler.','Başlıklar içerik hiyerarşisini, bağlantı metinleri ise gidilecek yeri açıklamalıdır.','Bir metni başlıklarla düzenleyin; “buraya tıklayın” bağlantısını anlamlı bir ifadeyle değiştirin.'),
   lesson('P06-L03','Görsel ve işitsel alternatifler','Metin dışı içerik için uygun alternatif önerir.','Bilgi taşıyan görselin amacını anlatan metin hazırlayın. Sesli anlatımın metin karşılığına duyulan gereksinimi inceleyin.','Bir bilgi grafiği için kısa açıklama ve ayrıntılı metin karşılığı yazın.')]),
  module('P06-M02','Arayüz ve belge incelemesi',[
   lesson('P06-L04','Klavye ile gezinme','Temel görevleri klavye ile kontrol eder.','Odak işaretinin görünür olması ve etkileşimli öğelere mantıklı sırayla erişilebilmesi kullanımı kolaylaştırır.','Bir sayfada fare kullanmadan gezinip ulaşılamayan veya odağı görünmeyen öğeleri not edin.'),
   lesson('P06-L05','Renk ve okunabilirlik','Bilginin yalnız renge bağımlı olup olmadığını değerlendirir.','Durumu renk yanında metin ya da simgeyle açıklayın. Yakınlaştırıldığında içeriğin okunabilirliğini kontrol edin.','İki durum göstergesini renge ek olarak metinle yeniden tasarlayın.'),
   lesson('P06-L06','Formlar ve hata mesajları','Form alanlarının açıklığını değerlendirir.','Bir alanın etiketi istenen bilgiyi; hata mesajı ise sorunu ve düzeltme yolunu açıklamalıdır.','Üç alanlı bir form için etiket, yardım metni ve hata mesajı yazın.')]),
  module('P06-M03','İyileştirme ve kanıt',[
   lesson('P06-L07','Erişilebilirlik kontrol listesi','Tekrarlanabilir bir inceleme planı oluşturur.','Otomatik araçlar tek başına tüm kullanıcı deneyimini değerlendiremez. İncelemeye klavye ve içerik kontrollerini de dahil edin.','Başlık, klavye, alternatif metin ve form için dört kontrol adımı yazın.'),
   lesson('P06-L08','Önceliklendirme ve düzeltme','Sorunları kullanıcı etkisine göre sıralar.','Görevin tamamlanmasını engelleyen sorunları ve tekrarlanan hataları öncelikle değerlendirin.','Üç sorun için etki, önerilen düzeltme ve doğrulama adımını kaydedin.'),
   lesson('P06-L09','Önce-sonra portfolyosu','İyileştirmeyi karşılaştırmalı kanıtlarla sunar.','Düzeltmenin etkisini göstermek için önceki durumu, yapılan değişikliği ve tekrar kontrol sonucunu birlikte belgeleyin.','Bir düzeltmenin önce-sonra açıklamasını ve kalan sınırlılıklarını hazırlayın.',18)])
 ]
};
export const lessonsFor = id => (curricula[id] || []).flatMap(m => m.lessons.map(l => ({...l,moduleId:m.id,moduleTitle:m.title})));
export const curriculumVersion = '2026.10.10-1';
