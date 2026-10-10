from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
from pathlib import Path
root=Path(__file__).resolve().parents[2]
pdfmetrics.registerFont(TTFont('DejaVu','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
c=canvas.Canvas(str(root/'demo/Unigo_Yonetici_Ozeti.pdf'),pagesize=(595,842))
c.setTitle('ÜniGO MYYS - Yönetici Özeti - Kurumsal Değerlendirme Taslağı')
navy=HexColor('#193650'); muted=HexColor('#71869c'); blue=HexColor('#316fcc')
def page(n,kicker,title,subtitle):
 c.setFillColor(HexColor('#f7f9fc'));c.rect(0,0,595,842,fill=1,stroke=0)
 c.setFillColor(navy);c.rect(0,633,595,209,fill=1,stroke=0)
 c.setFillColor(HexColor('#a7c3e9'));c.setFont('DejaVuBold',9);c.drawString(42,794,'ÜNİGO MYYS   /   GAZİ ÜNİVERSİTESİ')
 c.setFillColor(HexColor('#bfd1e6'));c.setFont('DejaVu',8);c.drawString(42,758,kicker)
 c.setFillColor(HexColor('#ffffff'));c.setFont('DejaVuBold',24);c.drawString(42,715,title)
 c.setFillColor(HexColor('#b8cce2'));c.setFont('DejaVu',9)
 for i,line in enumerate(simpleSplit(subtitle,'DejaVu',9,500)):c.drawString(42,681-i*15,line)
 c.setFillColor(muted);c.setFont('DejaVu',7);c.drawString(42,30,'Kurumsal değerlendirme taslağı • Sentetik pilot • 10 Ekim 2026');c.drawRightString(552,30,str(n)+' / 2')
def block(y,num,title,text):
 c.setFillColor(blue);c.setFont('DejaVuBold',10);c.drawString(42,y,num)
 c.setFillColor(navy);c.setFont('DejaVuBold',12);c.drawString(70,y,title)
 c.setFont('DejaVu',9);c.setFillColor(muted)
 for i,line in enumerate(simpleSplit(text,'DejaVu',9,480)):c.drawString(70,y-23-i*16,line)
page(1,'YÖNETİCİ ÖZETİ','Öğrenmeden kurumsal değere.','Öğrenme çıktıları, akademik kararlar ve dijital belgeler için ortak bir yönetişim alanı.')
block(587,'01','Tek çatı altında dokuz çalışma alanı','Maliyet analizi, uyum kontrol alanları, kurumsal görünüm, paydaşlar, öğrenme çıktısı matrisi, başvuru inceleme, gözetim, dijital rozet ve entegrasyon provası.')
block(480,'02','İnsan denetimi ve ayrı karar kayıtları','YZ yüzdeleri bu pilotta sabit senaryo verileridir. Kurula sevk akademik onay değildir. Belge düzenleme, kredi tanıma ve ders yerine sayma birbirinden ayrı kurumsal kararlardır.')
block(371,'03','Şeffaf örnek maliyet hesabı','5 yıllık dış lisans varsayımı: 45.000 $ × 5 = 225.000 $. Kurum içi senaryo: 20.000 $ kurulum + 8.000 $ × 5 işletim = 60.000 $. Hesaplanan fark: 165.000 $. Bunlar fiyat teklifi veya piyasa araştırması değildir.')
block(247,'04','0 $ dış lisans, sıfır toplam maliyet değildir','Kurum içi mimari senaryosu üçüncü taraf lisansı gerektirmeyecek şekilde modellenmiştir. UniGO hizmet bedeli, destek, bakım, vergi, altyapı ve uyarlama maliyetleri kurum özelinde tekliflendirilir. Web ekranındaki hesap değiştirilebilir.')
block(122,'05','Kontrol alanı, uygunluk onayı değildir','%10 ve %50 bu gösterimde örnek eşiklerdir. Gazi Senatosu, ilgili düzenlemeler, kapsam ve hesaplama tabanı doğrulanmadan bağlayıcı kural olarak uygulanmaz.')
c.showPage()
page(2,'PİLOT KABUL ÇERÇEVESİ','Kararınızı kanıtla hazırlayın.','Kurum içi bir pilotun başarı ölçütleri ve gerçek kullanımdan önce gereken doğrulamalar.')
block(588,'01','Akademik ve hukuki kabul','Senato ve ilgili birimler; kredi politikası, öğrenme çıktıları, ölçme rubrikleri, karar mercileri, itiraz yolu ve yürürlük sürümünü doğrular. Hukuk Müşavirliği ve kalite birimi kapsamı değerlendirir.')
block(477,'02','Veri ve erişim güvenliği','Bu pilot sentetik veriler kullanır. Kamera, mikrofon veya biyometrik veri işlenmez. Gerçek kullanım öncesinde kimlik doğrulama, sunucu yetkilendirmesi, saklama-imha, erişilebilirlik ve olay müdahalesi kurumca kabul edilir.')
block(350,'03','Belge ve entegrasyon kabulü','Rozet JSON kaydı imzasız bir örnektir. Open Badges 3.0 uygunluğu veya ihraççı güveni iddia edilmez. ÖBİS, YÖKSİS, e-Devlet ve RabbitMQ gerçek servisleri bağlı değildir; aktarım ve yeniden deneme yalnız yerel provadır.')
block(223,'04','Önerilen başlangıç kapsamı','Bir fakülte, üç program ve sentetik kullanıcılarla başlayın. Matris tamlığı, gerekçeli kurul sevki, ayrı tanıma kararları, negatif yetki senaryoları ve aktarım tekrar koruması için kurumunuzun kabul ölçütlerini belirleyin.')
c.setFillColor(muted);c.setFont('DejaVu',7)
c.drawString(42,103,'Standart başvuru kaynağı: https://www.1edtech.org/standards/open-badges')
c.drawString(42,88,'Bu belge resmî üniversite hizmeti, Senato kararı veya hukuk müşavirliği görüşü değildir.')
c.save()
