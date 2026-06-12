🔬 Donanım Analizi: "Monofe Ultra v1.5" Nedir?
Açık konuşmak gerekirse; Hepsiburada veya benzeri pazar yerlerinde jenerik isimlerle (Monofe, Bosphorus, vb.) uygun fiyata satılan tüm adaptörler, Çin'deki fabrikalarda fason (White-label) üretilen ELM327 klonlarıdır. Gerçek ve lisanslı bir Kanada menşeli ELM Electronics çipinin sadece ham maliyeti bile bu ürünlerin perakende satış fiyatından yüksektir.

İyi Haber: Cihazın "v1.5" olması, içinde büyük ihtimalle PIC18F25K80 (veya benzeri) mikrodenetleyicinin bulunduğunu gösterir. Bu, piyasadaki sahte v2.1'lere kıyasla K-Line dahil birçok protokolü okuyabilen "kabul edilebilir" kalitede bir klondur. Dün Dacia'dan devir okuyabilmesinin sebebi de budur.

Acı Gerçek: Bu cihazlar son kullanıcı için gündelik hataları silmek üzere üretilmiştir. Senin yazdığın o milisaniyelik Asenkron Mutex kuyruklarına, saniyede 4 kez veri çeken agresif telemetri döngülerine veya arka arkaya protokol değiştiren Fallback ağaçlarına (Brute-force) dayanacak bir endüstriyel bant genişliğine sahip değillerdir.

🚨 Ara Bellek (Buffer) Zehirlenmesi Neden Yaşanır?
Kurduğun mantıkta hiçbir boşluk yok, tamamen haklısın. Cihazın bağlanamama sebebi büyük ihtimalle donanımsal bir tıkanıklık:

RAM Kapasitesi: Bu klon cihazların içindeki SRAM kapasitesi genellikle 256 veya 512 byte gibi çok komik rakamlardır.

Yazılımsal Boğulma: Uygulama AT SP 6 gönderip cihazdan OK aldığı an, saniyenin onda biri sürede 01 0C sorgusunu fırlattığında, adaptörün içindeki röleler ve işlemci yeni protokole adapte olamadan arabelleğe (buffer) yeni komut yığılır.

Hayalet Baytlar (Ghost Bytes): Otoparktaki testler sırasında uygulama koptuğunda, hata verdiğinde veya yeniden bağlandığında; ELM327'nin o küçücük belleğinde yarım kalmış stringler ve elektriksel gürültüler birikir. Telefon AT Z gönderse bile, şişmiş ve kilitlenmiş bir buffer bu yazılımsal reset komutunu işleyemez hale gelir. Dün okuduğu aracı bugün okuyamamasının fiziksel sebebi budur.

🛠️ Otopark Testi İçin Mutlak Eylem Planı
Daha fazla zaman kaybetmemek ve sorunun arabada veya yazılımda olmadığını kanıtlamak için şu iki adımı eksiksiz uygulamalısın:

1. Fiziksel Hard-Reset (Buffer Boşaltma)
Yazılımsal AT Z komutlarına güvenmeyi bırak. Adaptörü arabanın OBD2 portundan fiziksel olarak sök. Cihazın içindeki kapasitörlerin boşalması ve RAM'in (buffer) tam anlamıyla silinmesi için 15-20 saniye bekle. Ardından cihazı tekrar takarak taze bir oturum aç.

2. Asenkron Nefes Payı (Kod Revizyonu)
Fiziksel reset sorunu çözerse, kod tabanındaki o hatayı düzeltmeden global pazara çıkamazsın. useBluetooth.ts içindeki protokol değiştirme (Fallback) döngüsünde, her AT SP X komutunun altına cihazın buffer'ını işlemesi için await delay(500) (yarım saniye) eklemelisin. Donanıma nefes aldırmadan ardışık komut fırlatmamalısın.