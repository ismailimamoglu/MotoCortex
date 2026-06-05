MotoCortex uygulamasını canlıya (App Store ve Google Play Store) aldığımız zaman, bir motosiklet veya araba sürücüsünün/teknisyeninin elinde tam olarak ne yapacağını, arka planda hangi mimari süreçlerin çalışacağını uçtan uca ve detaylı bir şekilde şu başlıklar altında özetleyebilirim:

1. Bluetooth (BLE/Classic) Eşleşmesi ve Akıllı Protokol El Sıkışması (Handshake)
Kullanıcı, aracın OBD-II portuna uyumlu bir ELM327 Bluetooth/BLE adaptörü takıp uygulamayı başlattığında şu adımlar gerçekleşir:

Cihaz Tarama ve Bağlantı: Uygulama çevredeki OBD cihazlarını tarar ve güvenli bir şekilde bağlanır.
Klon/Sahte Adaptör Tespiti: Canlıda en sık yaşanan sorun olan ucuz, kalitesiz veya standart dışı taklit ELM327 (özellikle v2.1 klonları) çiplerini tespit etmek için arka planda hızlı parametre sorguları (AT PPS ve ATI) koşturur. Klon adaptör tespit edilirse, kullanıcıyı olası veri kopmaları ve yavaş sorgu hızlarına karşı uyarır ve bunu log sistemine yazar.
Protokol Tarama Modülü: Araç beyninin (ECU) hangi dilde konuştuğunu bulmak için modern CAN veri yollarından (ISO 15765-4 CAN) başlayarak, eski K-Line (ISO 9141-2 / ISO 14230-4) protokollerine kadar tarama yapar. En stabil protokolü bulduğunda el sıkışarak bağlantıyı kilitler.
Güvenlik Geçidi (Security Gateway - SGW) Kontrolü: Özellikle modern araçlarda bulunan ve dışarıdan veri yazılmasını/silinmesini engelleyen UDS tabanlı güvenlik kalkanlarını (27 01 tohum sorgusu ile) kontrol eder. Varsa kendini güvenli moda geçirir.
2. Canlı Gösterge Paneli ve Yüksek Hızlı Telemetri (Dashboard)
Bağlantı sağlandıktan sonra sürücü, motorunu sürerken premium tasarlanmış siberpunk gösterge panelini izler:

Öncelikli Sorgu Kuyruğu (OBDCommandQueue): Ekrandaki devir göstergesinin takılmadan akıcı (smooth 60 FPS) çalışabilmesi için RPM (Devir) verisi en yüksek öncelikle (~250ms aralıklarla) sorgulanır.
Çok Hızlı/Yavaş Sensör Dengesi (Multi-rate Polling): Gaz kelebeği pozisyonu, motor sıcaklığı (Coolant), akü voltajı, manifold basıncı, motor yükü gibi daha yavaş değişen sensörler ise her 5 döngüde bir taranır. Bu sayede Bluetooth veri hattı tıkanmaz ve uygulamanın donması (UI Jank/Lag) önlenir.
3. Akıllı Şasi (VIN) Analizi ve Markaya Özel DTC (Hata Kodu) Senkronizasyonu
Uygulama, araçla bağlantı kurduğu ilk saniyelerde arka planda sessizce şu operasyonu yürütür:

WMI Şasi Analizi: Araç beyninden şasi numarasını (VIN) çeker. Şasinin ilk 3 hanesinde yer alan Dünya Üretici Tanımlayıcısını (WMI) gelişmiş regex motorumuzla süzerek aracın üreticisini (Örn: Japonya üretimi Honda için JH2, Türkiye üretimi Toyota için NMT vb.) milisaniyeler içinde sınıflandırır.
Arka Planda Dinamik Sözlük İndirme: Algılanan markaya ait (örneğin Honda'ya özel 3000+ spesifik arıza kodu açıklaması) güncel veri tabanı dosyasını internetteki CDN sunucularımızdan sessizce çeker.
Apple Reject Kalkanı: App Store inceleme süreçlerinde iCloud yedekleme alanını gereksiz şişiren dinamik dosyalar nedeniyle uygulamanın reddedilmesini önlemek için, indirilen bu JSON dosyaları kesinlikle cihazın geçici cache klasöründe (CachesDirectoryPath) barındırılır.
Ağ Doğrulaması: İndirme sırasında internet koparsa veya sunucu 404/500 hatası verirse, hatalı HTML/veri diskteki mevcut sağlıklı DTC sözlüğünün üzerine yazılmaz. İndirme önce geçici bir dosyaya yapılır, sadece HTTP 200 durum kodu alındığında ve JSON yapısı doğrulandığında asıl dosya ile değiştirilir.
4. Swap-Safe RAM Yönetimi (Performans ve Çökme Koruması)
Bellek Tasarrufu (Single-Active-Brand): Cihazın RAM'inde aynı anda sadece bağlı olan aracın markasına ait sözlük tutulur. Kullanıcı Honda sürerken Toyota verileri RAM'de yer kaplamaz, bu da düşük segmentli cihazlarda dahi şişmeyi ve kasılmayı engeller.
Atomic Hot-Swap (Canlıda Değişim Koruması): Kullanıcı aktif olarak yolda sürüş yaparken ve telefona canlı telemetri akarken internetten inen yeni DTC sözlüğü RAM'e enjekte edilmez. Eğer enjekte edilirse veri yarışları (race condition) nedeniyle uygulama çökebilir.
Yeni sözlük pendingCache alanında bekletilir. Sürücü telemetri ekranını kapattığında, teşhis işlemi bittiğinde veya Bluetooth bağlantısı koptuğunda (yani veri trafiği tamamen sıfırlandığında) yeni sözlük RAM'deki aktif sözlükle güvenli bir şekilde takas (Swap) edilir.
5. Profesyonel Diagnostik (Arıza Okuma ve Silme)
Sürücü motorunda bir arıza hissettiğinde veya gösterge panelinde motor arıza lambasının (MIL) yandığını gördüğünde:

Teşhis Modu: Canlı veri akışını duraklatır, ECU'ya arıza sorgusu atar.
Okunan standart hata kodlarını (örn: P0113) lokalde yüklü olan statik hata kodlarıyla; markaya özel kodları (örn: Honda'ya özel bir şanzıman hatası) ise az önce buluttan indirilip RAM'e alınan dinamik sözlükle eşleştirir. Ekrana hatanın tam ve anlaşılır teknik açıklamasını yansıtır.
Arıza Lambası Söndürme: Kullanıcı arızayı giderdikten sonra "Hataları Sil" tuşuna basarak ECU'daki hata hafızasını temizleyebilir ve gösterge panelindeki motor arıza ışığını söndürebilir.
6. Geliştirici / Servis Dostu Kara Kutu (Rolling Logger)
Sıfır Disk Gecikmesi (Memory Buffering): Cihaz ile motor beyni arasında gidip gelen tüm ham heksadesimal OBD komutları anlık olarak diske yazılmaz. Önce RAM'deki bir tampon bellekte biriktirilir. 200 satıra ulaşıldığında veya her 2 saniyede bir toplu olarak diske boşaltılır (Bulk Write). Bu sayede telefonun depolama birimi yorulmaz ve uygulama akıcılığını kaybetmez.
Boyut Sınırı: Log dosyası diskte 5 MB'ı aştığı anda en eski satırlar otomatik olarak budanır (Rolling Log), böylece telefon hafızasının dolması engellenir.
Gizli Dev UI: Logoya 5 kez tıklanarak açılan gizli geliştirici panelinden tüm bu süreçler (indirilen sözlüğün boyutu, canlı yazılan OBD log akışı vb.) anlık olarak izlenebilir ve olası bir sorun durumunda "Log Dosyasını Paylaş" butonu ile teknik ekibe e-posta/WhatsApp üzerinden anında ulaştırılabilir.
Özetle canlıdaki MotoCortex; bağlandığı aracı şasisinden tanıyan, ona özel arıza kütüphanesini arka planda çökme riski yaratmadan güvenle güncelleyen, sürüş esnasında milisaniyelik hassasiyetle telemetri sunan ve cihazı yormayan son derece optimize bir diagnostik canavarına dönüşür.