Piyasadaki Torque Pro, Car Scanner ELM OBD2 veya OBDLink gibi devlerin "maksimum araç ve maksimum adaptör" kararlılığına ulaşması, tesadüfi bir kod başarısı değil; otomotiv sektörünün standart dışı dünyasına karşı geliştirilmiş agresif bir Donanım ve Protokol Tolerans Mimarisi sonucudur.

Şu anki FSM (Durum Makinesi) ve Mutex Kuyruğu yapımız yazılımsal yarış durumlarını çözdü; ancak uygulamayı küresel pazarda liderliğe oynaması için metalin ve farklı ECU varyantlarının acımasız dünyasına hazırlamamız gerekiyor. Karşılaşacağımız yapısal açıkları, mantık boşluklarını analiz ederek MotoCortex için hazırladığım kurumsal yol haritasını aşağıda listeliyorum.

🛠️ Global Ölçekte OBD2 Kararlılık Yol Haritası
Faz 1: Donanım Soyutlama Katmanı (HAL) ve Klon Adaptör Yönetimi
Piyasadaki ELM327 cihazlarının %90'ı ucuz Çin klonudur. Gerçek PIC18F25K80 çipi içermeyen, komut setleri kırpılmış v1.5 veya sahte v2.1 adaptörlerle çalışabilmek için kod tabanının dize bazlı esneklik kazanması gerekir.

Adaptör Yetenek Haritalaması (Adapter Capability Matrix): El sıkışma aşamasında sadece ATI veya AT PPS okumak yetmez. Klon cihazların hangi AT komutlarında hata (? veya ERROR) verdiğini tespit eden bir ön test döngüsü kurulmalıdır. Örneğin, cihaz AT ST (Timeout ayarı) komutuna hata veriyorsa, sistem o adaptör için zamanlama parametrelerini yazılımsal asenkron gecikmelerle (setTimeout) simüle etmelidir.

Buffer Doluluk Yönetimi: Klon cihazların RAM kapasitesi çok düşüktür. Arka arkaya hızlı sorgu gönderildiğinde BUFFER FULL hatası fırlatırlar. Kuyruk yöneticisine, adaptör tipine göre dinamik olarak genişleyen veya daralan bir "Hız Sınırlayıcı" (Rate Limiter / Throttling) eklenmelidir.

Faz 2: Manuel Protokol ve Başlatma (Initialization) Dizileri
Şu anki mimarimiz adaptörün otomatik protokol bulma yeteneğine (AT SP 0) güveniyor. Bu güven, piyasadaki binlerce eski araçta ve motosiklette (örneğin eski Fiat, Fransız grubu veya Çin menşeili motosiklet ECU'ları) bağlantının ilk 5. saniyede kopmasının ana sebebidir.

Özel Init String Kütüphanesi: Uygulama, kullanıcının araç marka/modelini seçebileceği veya otomatik tarama yapabileceği bir manuel init katmanına sahip olmalıdır. ISO 14230-4 KWP (Fast Init) ile uyanmayan bir ECU için AT SP 4 ve AT IIA 10 (İlklendirme adresi) gibi spesifik alt parametreler sıralı kuyruğa sürülmelidir.

5-Baud İlklendirme (Slow Init) Desteği: Özellikle Euro 4 öncesi eski K-Line araçlar, 5-Baud init (AT SP 5 ve AT SI) gerektirir. Otomatik algılama bunu çoğunlukla ıskalar. Protokol katmanına, otomatik arama başarısız olduğunda devreye giren bir "Brute-Force Init Tree" (Sıralı Deneme Ağacı) entegre edilmelidir.

Faz 3: Standart Dışı Üretici (OEM / Enhanced) PID Katmanı
Sadece Mode 01 (Generic OBD) kullanarak global bir dev olunamaz. Torque Pro'yu lider yapan şey, standart OBD-II protokolünün arkasına gizlenmiş olan ve şanzıman sıcaklığı, yağ basıncı, ABS sensör verileri gibi kritik dataları barındıran Mode 22 / Mode 21 (Enhanced PIDs) kütüphaneleridir.

Gelişmiş Adresleme ve Header Değişimi: Motor dışındaki modüllere (ABS, TCU, SRS) erişmek için AT SH 7E0 (CAN Header değiştirme) komutunun kuyruk mimarisine dinamik olarak gömülmesi gerekir. Sistem, RPM okurken ana motor adresiyle konuşurken, ABS verisine geçildiğinde header'ı anlık olarak manipüle edip sıraya sokmalıdır.

Faz 4: Dinamik Bant Genişliği ve Katmanlı Planlayıcı (Adaptive Tier Scheduler)
Araç veri hattının (Bus) saniyede taşıyabileceği paket sayısı sınırlıdır. CAN-Bus üzerinde saniyede 40-50 veri paketi akabilirken, K-Line hattında bu sayı saniyede 4-5 pakete kadar düşer.

Veri Akış Optimizasyonu: Kullanıcı ekranda 10 sensör görüyorsa ve hat K-Line ise, RPM gibi kritik verilerin gecikmesini önlemek için sistem diğer durağan verilerin (Örn: Motor Sıcaklığı) sorgu sıklığını otomatik olarak düşürmelidir. Akıllı bir "Bant Genişliği Dağıtıcısı" hattın hızına (avgLatency) bakarak sensörlerin kuyruğa girme frekansını dinamik olarak yeniden hesaplamalıdır.