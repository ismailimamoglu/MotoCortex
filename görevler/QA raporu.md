MotoCortex Global Automotive QA & Security Audit Report
Tarih: 23 Temmuz 2026
Denetçi: Senior Automotive QA Engineer, ECU Diagnostic Validation Architect & Security Auditor
Proje / Uygulama: MotoCortex Mobile (iOS & Android / Expo React Native)
Hedef Pazarlar: ABD, AB (Avrupa), Japonya (JDM), Güney Kore, Çin, Rusya, Birleşik Krallık, Türkiye

EXECUTIVE SUMMARY & AUDIT SCOPE
MotoCortex uygulamasının tüm mimarisi, OBD-II/UDS protokol motoru, ECU kodlama (özellik açma/kapama) güvenlik mekanizmaları, UI/UX bileşenleri, veri depolama, paket yönetim sistemleri ve global pazar uyumluluğu uçtan uca incelenmiştir.

Statik kod analizi (tsc, eslint), birim/entegrasyon testleri (jest), ISO 14229 (UDS), ISO 15765-2 (ISO-TP), SAE J1979 (OBD-II), UNECE WP.29 / R155 (Siber Güvenlik) ve ISO 26262 (Fonksiyonel Güvenlik) standartları referans alınarak bağımsız denetim raporu hazırlanmıştır.

1. DETAYLI AUDIT BULGULARI
Bulgu #1
Başlık: Pseudonym SHA-256 Hash Yerine Zayıf Bitwise JS Algoritması Kullanımı (PendingWriteStore.ts)
Risk Seviyesi: Critical
Kategori: Security / ECU
Problem: PendingWriteStore.ts içinde 13 aşamalı journal kaydı için yazılan generateHash metodu docstring'de SHA-256 olarak belirtilmiş ancak gerçekte zayıf 32-bit JS bitwise kaydırma (hash = ((hash << 5) - hash) + char; hash |= 0;) algoritması içermektedir.
Neden Problem?: UNECE R155 ve ISO 26262 standartlarına göre ECU yazma kayıtlarının (durable journal) kurcalanmaya karşı koruması (tamper-proofing) kriptografik olarak güvenli hash zincirlerine (SHA-256) dayanmalıdır. Zayıf 32-bit hash çakışmalara (collision) ve manipülasyona açıktır.
Olası Sonuç: Yarım kalan ECU yazma işlemlerinde journal manipüle edilebilir, hatalı rollback adımları tetiklenebilir veya ECU brick olma riski doğar.
Nasıl Düzeltilmeli?: generateHash metodu src/utils/crypto.ts içerisindeki Crypto.digestStringAsync(CryptoDigestAlgorithm.SHA256) veya tweetnacl/expo-crypto SHA-256 uygulaması ile değiştirilmelidir.
Öncelik: P0
Bulgu #2
Başlık: Geliştirici Backdoor ve Gizli PRO Lisans Bypass Mekanizması (AdminSecretModal.tsx & useAppStore.ts)
Risk Seviyesi: Critical
Kategori: Security
Problem: AdminSecretModal.tsx içerisinde 7 kez dokunma jesti ile isBackdoorPro bayrağı aktifleşmekte ve useAppStore.ts içindeki checkIsProStatus kontrolü bu bayrak açık olduğunda ödeme doğrulamasını (RevenueCat) bypass ederek tüm PRO/ECU özelliklerini ücretsiz açmaktadır.
Neden Problem?: Production (Canlı) derlemesinde gizli backdoor kodunun kalması hem ticari kayba hem de yetkisiz kullanıcıların tehlikeli ECU kodlama fonksiyonlarına erişmesine neden olur.
Olası Sonuç: Saldırganlar veya son kullanıcılar uygulamayı decompile ederek veya modal jestini tetikleyerek ödeme yapmadan kritik ECU değişiklikleri yapabilir.
Nasıl Düzeltilmeli?: isBackdoorPro ve handleProSecretTap fonksiyonları __DEV__ şartına bağlanmalı, production build'lerinden tamamen strip edilmelidir (babel-plugin-transform-remove-console ve dead-code elimination).
Öncelik: P0
Bulgu #3
Başlık: UDS Security Access (0x27) Statik Sabit Dummy Algoritması (SecurityAccessEngine.ts)
Risk Seviyesi: Critical
Kategori: ECU / Security
Problem: SecurityAccessEngine.ts içerisinde varsayılan Seed-to-Key hesabı (seed) => seed.map(b => (b ^ 0x55) & 0xFF) şeklinde sabit XOR 0x55 işlemiyle tanımlanmıştır.
Neden Problem?: Modern OEM'lerde (VAG, BMW, Mercedes, Toyota vb.) Security Access (0x27) Challenge-Response mekanizması dinamik AES-128, RSA veya OEM-özel dinamik anahtar hesaplama algoritmaları gerektirir. Basit XOR güvenlik katmanını karşılamaz ve yetkisiz yazmaya izin verir.
Olası Sonuç: Yeni araç platformlarında 0x27 güvenlik kilidi açılamaz (NRC 0x35 Invalid Key alınır) ya da yanlış anahtar denemeleri sonucunda ECU güvenlik kilidine geçer (NRC 0x36 Exceeded Attempts / NRC 0x37 Time Delay Expired).
Nasıl Düzeltilmeli?: OEM bazlı dinamik anahtar hesaplama motoru eklendiğinde HSM/Secure Enclave tabanlı güvenli key provider mimarisine geçilmeli, başarısız denemelerde 0x36/0x37 NRC kodları yakalanıp bekleme süresi yönetilmelidir.
Öncelik: P0
Bulgu #4
Başlık: Ham UDS Mesajları ve Hassas Araç Verilerinin Maskelenmeden Loglanması (Logger.ts)
Risk Seviyesi: High
Kategori: Security / Data Protection
Problem: Logger.ts uygulamadaki tüm logları motocortex_rolling.log dosyasına düz metin olarak yazmaktadır. AdminSecretModal üzerinden bu loglar panoya kopyalanabilmekte veya paylaşılan dosya olarak aktarılabilmektedir. Log içeriğinde VIN numarası, ECU read/write payload'ları ve cihaz UUID'leri yer almaktadır.
Neden Problem?: GDPR (AB), CCPA (ABD), KVKK (TR) ve Çin PIPL yasalarına göre Araç Şasi Numarası (VIN) ve Cihaz ID'leri kişisel veri (PII) kabul edilir. Düz metin loglanması ve dışarı aktarılması güvenlik/gizlilik ihlalidir.
Olası Sonuç: Cihaz çalındığında veya loglar dışarı aktarıldığında araç VIN ve ECU konfigürasyon verileri üçüncü şahısların eline geçebilir.
Nasıl Düzeltilmeli?: Logger.ts içerisine Regex tabanlı anonymizeSensitiveData filtresi eklenmeli; VIN (17 karakterlik şasi no) ve Security Access anahtarları loglanmadan önce 1FA6P8CF****1289 şeklinde maskelenmelidir.
Öncelik: P1
Bulgu #5
Başlık: Insecure Bluetooth RFCOMM Reflection Fallback Kullanımı (BluetoothManager.ts)
Risk Seviyesi: High
Kategori: OBD / Security
Problem: Bluetooth Classic bağlantısı kurulurken güvenli socket başarısız olursa otomatik olarak insecure-reflection-rfcomm (insecure socket) profil bağlantısına düşmektedir.
Neden Problem?: İkinci nesil ucuz klon ELM327 adaptörlerde bağlantı sağlamak için kullanılan insecure socket, şifrelemesiz ve PIN onaysız RFCOMM kanalı açmaktadır. Bu durum araya girme (Man-in-the-Middle) saldırılarına açıktır.
Olası Sonuç: Yoldayken yakındaki kötü niyetli bir Bluetooth tarayıcısı RFCOMM kanalını dinleyebilir veya araya veri enjekte ederek ECU'ya yetkisiz komut gönderebilir.
Nasıl Düzeltilmeli?: Insecure RFCOMM bağlantısına geçilmeden önce kullanıcıya bir uyarı gösterilmeli veya ECU kodlama işlemleri yapılması durumunda Secure Bluetooth / BLE 4.2+ zorunlu kılınmalıdır.
Öncelik: P1
Bulgu #6
Başlık: UDS NRC 0x78 (Response Pending) Yanıtında Olası Sonsuz Döngü ve Zaman Aşımı Riskleri (UdsClient.ts)
Risk Seviyesi: High
Kategori: OBD / Architecture
Problem: UdsClient.ts içindeki parseResponse metodu NRC 0x78 (Response Pending) kodunu doğru tespit etmekte fakat transport/queue katmanında zaman aşımı sayacını sıfırlayıp ECU'dan nihai yanıt gelene kadar bekleyecek asenkron akış yönetimi eksiktir.
Neden Problem?: ECU'lar özellikle EEPROM yazma, Flash silme veya adaptasyon işlemlerinde 5-10 saniye gibi uzun süren işlemler yaparken 7F xx 78 yanıtı gönderirler. Standart 2-4 saniyelik komut zaman aşımları bu durumda devredışı kalmazsa uygulama bağlantıyı koparabilir.
Olası Sonuç: ECU kod yazma işleminin tam ortasında uygulama timeout vererek hattı keser, bu da ECU'nun yazma aşamasında kilitlenmesine (brick) yol açar.
Nasıl Düzeltilmeli?: OBDCommandQueue / ProtocolEngine katmanında NRC 0x78 alındığında aktif komut zaman aşımı süresi 5000ms uzatılmalı ve TesterPresent (0x3E) gönderimi sürdürülmelidir.
Öncelik: P0
Bulgu #7
Başlık: BLE Parçalanmış Paket Derlemesinde Tamper/Out-of-Order Koruma Eksikliği (BLEMultiFrameAssembler.ts)
Risk Seviyesi: Medium
Kategori: OBD / Code Quality
Problem: BLEMultiFrameAssembler.ts çerçeve sıralamasını (sequence number) kontrol etmekte fakat frame paketi eksik kaldığında veya paket içi crc/checksum hatası olduğunda paketi timeout'a kadar saklamaktadır.
Neden Problem?: BLE 20-byte MTU sınırlaması nedeniyle çoklu paket aktarımında hat paraziti sonucu aradaki bir frame kaybolursa buffer temizlenene kadar sonraki veri paketleri bozulur.
Olası Sonuç: Canlı motor verisi (Live Data) veya DTC okuma sırasında ekranda anlık bozuk değerler görünür veya yanıt okuma başarısız olur.
Nasıl Düzeltilmeli?: Çerçeve bekleme zaman aşımı (frame gap timeout) max 150ms'ye çekilmeli, out-of-order gelen ilk pakette tüm paket serisi re-transmit edilmelidir.
Öncelik: P2
Bulgu #8
Başlık: Akü Voltaj Düşüşünde (Battery Voltage Drop) Donanımsal Kesinti İkazı ve Kurtarma Operasyonu (FeatureActivationEngine.ts)
Risk Seviyesi: High
Kategori: ECU / Edge Case
Problem: Voltaj kontrolü validateSafetyGate ile yalnızca işlem başlamadan önce yapılmaktadır. İşlem sırasında (örneğin 3 saniyelik UDS yazma esnasında) akü voltajının 12.0V altına düşmesi durumunda anlık kesinti algılama mekanizması bulunmamaktadır.
Neden Problem?: ECU yazımı esnasında araç kontağı açık kaldığı için araç elektrik çekebilir. Yazma ortasında voltaj 11V altına düşerse mikrodenetleyici reset atar.
Olası Sonuç: İşlem ortasında voltaj çökmesi sonucu ECU korumaya geçer veya yazılım imajı bozulur.
Nasıl Düzeltilmeli?: Yazma süreci başladığında arka planda AT RV veya PID 0x42 (Control Module Voltage) üzerinden her 500ms'de bir voltaj dinleyen kesme (interrupt) thread'i çalışmalıdır. 11.8V altında işlem hemen güvenli noktada iptal edilmelidir.
Öncelik: P1
Bulgu #9
Başlık: Cihaz UUID Fallback Üretiminde Kriptografik Olmayan Math.Random Kullanımı (crypto.ts)
Risk Seviyesi: Medium
Kategori: Security / Code Quality
Problem: src/utils/crypto.ts içindeki generateUuid metodunda Crypto.randomUUID başarısız olursa fallback olarak Math.random() kullanılarak UUID üretilmektedir.
Neden Problem?: Math.random() pseudorandom bir algoritmadır, tahmin edilebilirdir (PRNG güvenlik açığı). Güvenlik / Oturum doğrulamasında kullanılamaz.
Olası Sonuç: Oturum anahtarları (calculateSessionHash) tahmin edilebilir hale gelebilir ve replay attack riski oluşur.
Nasıl Düzeltilmeli?: Fallback durumunda expo-crypto'nun getRandomBytesAsync fonksiyonu kullanılmalı veya hata fırlatılarak güvenli olmayan random kullanımı tamamen engellenmelidir.
Öncelik: P2
Bulgu #10
Başlık: Arapça (RTL) ve Asya Dilleri (Japonca, Korece, Çince) UI Düzeni Kırılmaları (rtlManager.ts & i18n.ts)
Risk Seviyesi: Medium
Kategori: UI / UX / Global Compatibility
Problem: i18n.ts içerisinde 26 dil tanımlanmış olsa da (Arapça ar dahil), rtlManager.ts kullanımı bileşen düzeyinde (Flex Direction, Text Align) tam olarak uygulanmamıştır.
Neden Problem?: Sağdan sola yazılan dillerde (Arapça) ve geniş font kaplayan Çince/Japonca karakter setlerinde ikonlar, butonlar ve modal başlıkları üst üste binmektedir.
Olası Sonuç: Orta Doğu, Çin ve Japonya pazarlarında kötü kullanıcı deneyimi ve okunaksız kadranlar/modallar.
Nasıl Düzeltilmeli?: I18nManager.isRTL kullanılarak tüm ana ekran layouts flex-direction: row-reverse desteğiyle test edilmeli, metin taşmaları için numberOfLines ve adjustsFontSizeToFit eklenmelidir.
Öncelik: P2
Bulgu #11
Başlık: Tablet ve Farklı Ekran Boyutlarında Dynamic Type / Font Scaling Taşması (BentoGrid.tsx & LiveEngineHero.tsx)
Risk Seviyesi: Medium
Kategori: UI / Accessibility
Problem: BentoGrid.tsx ve LiveEngineHero.tsx bileşenlerinde sabit yükseklikler (height: 180) ve react-native-size-matters ölçekleri kullanılmaktadır. Kullanıcı cihaz ayarlarından font boyutunu büyüttüğünde (Accessibility Large Text) metinler kutulardan dışarı taşmaktadır.
Neden Problem?: iOS Dynamic Type ve Android Font Scaling standartlarına uyumsuzluk mağaza incelemelerinde (App Store / Play Store A11y denetimleri) reddedilme sebebidir.
Olası Sonuç: Görme engelli veya büyük font kullanan kullanıcılar devir (RPM), hız veya hata kodlarını okuyamaz.
Nasıl Düzeltilmeli?: Bileşenlerde sabit height yerine minHeight kullanılmalı, kaplayıcı ScrollView ile sarmalanmalı ve metinlere allowFontScaling={true} kontrolüyle maxFontSizeMultiplier={1.3} sınırı getirilmelidir.
Öncelik: P2
Bulgu #12
Başlık: OBD Komut Kuyruğunda (Queue) Yarış Durumu (Race Condition) ve Bellek Şişmesi (OBDCommandQueue.ts)
Risk Seviyesi: High
Kategori: OBD / Memory
Problem: Canlı veri akışı sırasında saniyede 15-20 PID sorgusu kuyruğa eklenmekte; Bluetooth bağlantı hızı düştüğünde kuyruk birikerek bellekte işlenmeyi bekleyen yüzlerce komut biriktirmektedir.
Neden Problem?: OBDCommandQueue.ts dolduğunda eski/zamanı geçmiş PID isteklerini (stale PID requests) otomatik düşürmezse (drop policy), uygulamadaki göstergeler 3-5 saniye gecikmeli veri gösterir (Queue Latency).
Olası Sonuç: Sürücü gaza bastığında devir saati veya hız göstergesi ekrana 4 saniye sonra yansır. Bu durum sürüş güvenliği açısından kabul edilemez.
Nasıl Düzeltilmeli?: Kuyruğa son giren ilk çıkar (LIFO) veya priority tabanlı düşürme stratejisi (Ring Buffer / Drop Oldest High Frequency PID) uygulanmalıdır.
Öncelik: P1
Bulgu #13
Başlık: Kontak Kapanması (Ignition OFF) Durumunda ECU Kodlama Takılması ve Recovery Lock Hali (RecoveryStateMachine.ts)
Risk Seviyesi: High
Kategori: ECU / Crash
Problem: ECU yazma aşamasında araç kontağının kapatılması durumunda RecoveryStateMachine durumu INCONCLUSIVE_LOCKED moduna almaktadır. Uygulama yeniden başlatıldığında otomatik olarak ECU'ya 0x22 Read-Back atarak durumu doğrulamaya çalışmakta ancak kontak kapalı olduğu için bağlantı kurulamayıp kilitlenme döngüsüne girmektedir.
Neden Problem?: Kontak kapalıyken ECU uyku moduna (Sleep State) geçer. Uygulamanın kontak kapalı iken devamlı Read-Back denemesi kullanıcıya anlaşılır yönlendirme sunmaz.
Olası Sonuç: Ekranda "ECU Kilitlendi" uyarısı kalır ve kullanıcı aracın kontağını açması gerektiğini anlamadığı için panikler.
Nasıl Düzeltilmeli?: INCONCLUSIVE_LOCKED ekranında kullanıcıya net bir kurtarma rehberi sunulmalı: "Lütfen aracın kontağını ON konumuna getirin, motoru çalıştırmayın ve 'Yeniden Doğrula' butonuna basın."
Öncelik: P1
Bulgu #14
Başlık: Android Bluetooth İzinleri ve Arka Plan Konum İzin Eksikliği (PermissionGateway.tsx)
Risk Seviyesi: High
Kategori: Global Compatibility / Mobile UX
Problem: Android 12+ (API level 31+) cihazlarda BLUETOOTH_SCAN ve BLUETOOTH_CONNECT izinleri runtime olarak istenirken, Android 11 ve altında Bluetooth Classic taraması için gerekli olan ACCESS_FINE_LOCATION izni bazı durumlarda atlanmaktadır.
Neden Problem?: Android 11 ve altı cihazlarda konum izni verilmediğinde Bluetooth ELM327 adaptörleri listede hiç görünmez.
Olası Sonuç: Eski Android sürümü kullanan milyonlarca araç sahibinde Bluetooth taraması boş liste döndürür.
Nasıl Düzeltilmeli?: PermissionGateway.tsx içinde OS sürüm kontrolü (Platform.Version < 31) yapılarak Android 11 ve altı için ACCESS_FINE_LOCATION izni zorunlu tutulmalıdır.
Öncelik: P1
Bulgu #15
Başlık: Multi-ECU Taramasında CAN Bus ID Çakışması ve Yanıt Ayıştırma Eksikliği (multiEcuService.ts)
Risk Seviyesi: Medium
Kategori: OBD / Architecture
Problem: multiEcuService.ts araçtaki tüm modülleri (Engine, Transmission, ABS, Airbag vb.) tararken fonksiyonel adres olan 0x7DF CAN ID'sini kullanmaktadır. Farklı ECU'lardan gelen yanıtlar tek bir frame içinde birleştiğinde (Header filtering) parser kararsız kalmaktadır.
Neden Problem?: Standart OBD-II yanıtlarında 7E8 (Engine), 7E9 (Transmission), 7EA (ABS) gibi farklı header'lar döner. ELM327 üzerinde AT H1 (Headers ON) yapılmadan gelen yanıtlar hangi ECU'ya ait tespit edilemez.
Olası Sonuç: ABS hata kodu Motor hatası olarak veya Şanzıman hatası Motor hatası olarak yanlış raporlanır.
Nasıl Düzeltilmeli?: Multi-ECU taramasına geçilmeden önce ELM327 komut dizisine AT H1 ve AT CRA (CAN Receive Address) ayarları eklenmeli, yanıtlar CAN ID bazında gruba ayrılmalıdır.
Öncelik: P2
Bulgu #16
Başlık: Ekran Değişimlerinde (Unmount) Asenkron Polling ve Timer Leak Sorunu (ObdHealthScreen.tsx)
Risk Seviyesi: Medium
Kategori: Memory / Performance
Problem: ObdHealthScreen.tsx ve bazı modal bileşenlerinde setInterval ile çalışan canlı veri polling mekanizmaları bileşen unmount olduğunda clearInterval ile temizlenmemektedir.
Neden Problem?: React Native köprüsünde (Bridge/JSI) unmount edilmiş bileşenlerin state güncellemeleri ("Can't perform a React state update on an unmounted component") bellek sızıntısına (memory leak) ve CPU yüküne yol açar.
Olası Sonuç: Ekranlar arası geçiş yapıldıkça uygulamanın RAM kullanımı artar, 10-15 dakika sürüş sonrasında uygulama yavaşlar veya OS tarafından kill edilir (OOM Exception).
Nasıl Düzeltilmeli?: Tüm useEffect hook'larına mutlaka return cleanup fonksiyonu eklenmeli (return () => clearInterval(timerId)).
Öncelik: P2
Bulgu #17
Başlık: Yüksek Sıcaklık ve Ekran Parlaklığı Durumunda Rendet Performansı / FPS Düşüşü (LiveEngineHero.tsx)
Risk Seviyesi: Medium
Kategori: Performance
Problem: LiveEngineHero.tsx içerisindeki kadran ve grafikler her gelen OBD verisinde (saniyede 20 kez) tüm bileşeni re-render etmektedir.
Neden Problem?: useMemo, React.memo ve useNativeDriver (Reanimated / Worklets) kullanılmayan ham JS thread re-render işlemleri telefonun ısınmasına ve şarjının hızlı tükenmesine yol açar.
Olası Sonuç: Araç içi telefon tutucuda takılı duran telefon aşırı ısınır, ekran parlaklığını düşürür ve uygulama 15 FPS altına geriler.
Nasıl Düzeltilmeli?: Kadran animasyonları react-native-reanimated Worklet thread'ine taşınmalı, JS thread re-render sıklığı 60Hz'den max 20Hz'e throttle edilmelidir.
Öncelik: P2
Bulgu #18
Başlık: Çin (GB/T) ve Japonya (JDM) Araç Protokol Farklılıkları Uyumsuzluğu
Risk Seviyesi: Medium
Kategori: Global Compatibility
Problem: Çin pazarındaki yerli araçlar (BYD, Geely, Chery) ve Japonya içi (JDM Toyota/Nissan/Honda) araçlar ISO 15765 standart OBD-II PID'leri yerine K-Line KWP2000 (Fast Init / 5 Baud Init) veya OEM özel CAN baudrate (125kbps / 250kbps / Single Wire CAN) kullanabilmektedir.
Neden Problem?: ProtocolNegotiator.ts otomatik protokol aramada yalnızca varsayılan ELM327 auto-search (AT SP 0) kullanmaktadır. K-Line kullanan eski JDM veya Çin araçlarında bağlantı timeout vermektedir.
Olası Sonuç: Çin, Japonya ve Doğu Avrupa pazarlarındaki belirli araç modellerinde "ECU Bağlanamadı" hatası alınır.
Nasıl Düzeltilmeli?: Manuel protokol seçim menüsü eklenmeli; ISO 9141-2, ISO 14230-4 (KWP2000), USER1 CAN (11Bit 125kbps) seçenekleri kullanıcıya sunulmalıdır.
Öncelik: P2
Bulgu #19
Başlık: Kullanıcı Onboarding ve Risk Sorumluluk Reddi (Disclaimer) Eksikliği (ConnectionFlowScreen.tsx)
Risk Seviyesi: High
Kategori: UX / Legal / ECU
Problem: İlk kez ECU kodlama veya DTC silme yapan kullanıcıya yapılan işlemin aracın garantisini etkileyebileceğine veya hatalı yazımda sorumluluğun kullanıcıda olduğuna dair hukuki onay metni sunulmamaktadır.
Neden Problem?: ABD (FTC / Magnuson-Moss Act) ve AB (UNECE) mevzuatlarına göre araç ECU'suna müdahale eden yazılımlar açık bilgilendirme ve kullanıcı rızası (Explicit Terms & EULA Approval) almak zorundadır.
Olası Sonuç: Olası bir araç arızasında uygulama geliştiricisi ve dağıtıcısı yasal yükümlülük altında kalabilir.
Nasıl Düzeltilmeli?: ECU kodlama fonksiyonu ilk kez açıldığında onay kutulu (Checkbox) bir "Sorumluluk Reddi Beyanı ve Risk Bilgilendirme Modal'ı" gösterilmeden işleme izin verilmemelidir.
Öncelik: P1
Bulgu #20
Başlık: İnternet Kesintisinde Çevrimdışı Hata Kodu (DTC) Sözlük Veritabanı Yetersizliği (DtcDictionary.ts)
Risk Seviyesi: Low
Kategori: UX / OBD
Problem: DtcDictionary.ts temel OBD-II arıza kodlarını içermekte fakat markaya özel (VAG P1xx, BMW 2xx vb.) detaylı hata tanımları Supabase / Online API üzerinden çekilmektedir.
Neden Problem?: Araç arızaları genelde yolda, tünelde veya internet çekmeyen garaj/tamirhanelerde meydana gelir.
Olası Sonuç: İnternet olmadığında kullanıcı arıza kodunun başlığını görür fakat detaylı açıklamasını ve çözüm önerisini göremez ("Bilinmeyen Hata Kodu").
Nasıl Düzeltilmeli?: Yerel SQLite veritabanına 15,000+ OEM özel DTC tanımı sıkıştırılmış JSON/SQLite formatında gömülmelidir (Offline-First Architecture).
Öncelik: P3
2. NİHAİ DEĞERLENDİRME VE SKORLAR
QA Değerlendirme Skor Tablosu
mermaid
gantt
    title MotoCortex Kalite Kalibrasyon Çizelgesi
    dateFormat  YYYY-MM-DD
    section Güvenlik & ECU
    ECU Güvenlik Audit      :crit, active, 2026-07-23, 7d
    Security Access Fixes   :crit, 2026-07-30, 5d
    section Protokol & OBD
    ISO-TP & NRC 0x78 Fix   :active, 2026-07-23, 6d
    Queue Latency Fix       :2026-07-29, 4d
    section UI/UX & Pazar
    RTL & Dynamic Type Fix  :2026-08-01, 5d
    Production Release      :milestone, 2026-08-10, 0d
Kategori	Skor (100 Üzerinden)	Durum
Architecture (Mimari)	74	Kabul Edilebilir (İyileştirme Gerekli)
Security (Güvenlik)	42	KRİTİK RİSK (Başarısız)
Performance (Performans)	68	Orta Seviye
UI / UX (Kullanıcı Deneyimi)	79	İyi
OBD Katmanı & Protokol	71	Kabul Edilebilir
ECU Coding Güvenlik Katmanı	48	KRİTİK RİSK (Başarısız)
GENEL QA SKORU	63.6 / 100	Şartlı Red
Metrik Oranları
Production Readiness (%): %55
Global Market Readiness (%): %48
3. TEKNİK BORÇ VE KRİTİK EYLEM PLANI
Teknik Borç Analizi (Technical Debt Analysis)
Güvenlik Mimarisi Kırılganlığı: Hash algoritmalarında standart olamayan bitwise yöntemler kullanılmış. Production'da backdoor kalıntıları mevcut.
Asenkron UI Thread Yükü: OBD veri akışının UI thread'i üzerinde doğrudan re-render tetiklemesi uzun süreli kullanımlarda kare düşüşüne neden olmaktadır.
Protokol Standart Uyumsuzluğu: ISO 14229 UDS standartlarındaki NRC 0x78 ve Security Access 0x27 süreçleri tam anlamıyla OEM gereksinimlerine göre izole edilmemiştir.
En Kritik 20 Problem (Öncelik Sırasıyla)
PendingWriteStore.ts içindeki sahte SHA-256 algoritmasının gerçek kriptografik hash ile değiştirilmesi.
AdminSecretModal ve useAppStore içerisindeki gizli Backdoor PRO lisans bypass mekanizmasının kaldırılması.
SecurityAccessEngine içindeki sabit XOR 0x55 hesabının kaldırılıp OEM dinamik key mekanizmasının kurulması.
Logger.ts loglarındaki VIN ve hassas verilerin anonimleştirilmesi.
Insecure Bluetooth RFCOMM bağlantılarına güvenlik uyarısı eklenmesi.
UDS NRC 0x78 (Response Pending) zaman aşımı uzatma kontrolünün eklenmesi.
Dinamik voltaj düşüşü dinleyici kesmesinin (Battery drop interrupt) eklenmesi.
crypto.ts UUID üretimindeki Math.random kullanımının engellenmesi.
OBD Komut Kuyruğunda (Queue) LIFO / Drop Oldest mekanizmasının kurulması.
Kontak kapanması (Ignition OFF) durumunda kullanıcı dostu kurtarma ekranı tasarımı.
Android 11 ve altı cihazlar için ACCESS_FINE_LOCATION izin akışının düzeltilmesi.
Multi-ECU taramasında AT H1 CAN Header ayrıştırmasının yapılması.
ObdHealthScreen ve modallardaki timer memory leak'lerin temizlenmesi.
LiveEngineHero animasyonlarının Worklet thread'ine taşınması.
JDM ve Çin araçları için manuel K-Line / Baudrate ayarlarının eklenmesi.
Arapça (RTL) ve Asya dilleri için layout esnekliğinin sağlanması.
Dynamic Type / Font Scaling taşma sorunlarının çözülmesi.
ECU kodlama öncesi Sorumluluk Reddi (Disclaimer) modalının zorunlu kılınması.
Çevrimdışı kullanım için yerel SQLite DTC veritabanının genişletilmesi.
package.json bağımlılıklarında patch-package güvenlik denetiminin otomatize edilmesi.
En Önemli 20 İyileştirme
WOT (Wide Open Throttle) Otomatik Güncelleme Freni: Araç hareket halindeyken ECU yazma modunun tamamen kilitlenmesi.
Akü Voltaj Grafiği: ECU kodlama öncesi son 60 saniyelik voltaj kararlılık grafiği gösterimi.
Bluetooth Sinyal Gücü (RSSI) Göstergesi: Düşük sinyalde ECU yazımını engelleme uyarısı.
Tek Tıkla Orijinal Yedeğe Dönüş (One-Click Rollback): Kullanıcının tüm değiştirdiği DID parametrelerini fabrikasyon haline çeviren tek butonlu recovery.
Akıllı DTC Teşhis Asistanı: Hata kodunun sürüş güvenliğine etkisini belirten renkli risk indeks tablosu.
Otomatik Adaptör Benchmark Testi: Bağlanan ELM327'nin komut gecikmesini ölçüp "Güvenli / Riskli" etiketi basması.
Offline-First Telemetri: Senkronize edilemeyen canlı verilerin SQLite'da sıkıştırılarak tutulması.
HUD (Heads-Up Display) Modu: Gece sürüşü için ön cama yansıtılabilir ters gösterge ekranı.
Karanlık / Aydınlık Tema Otomasyonu: Araç far veya saat durumuna göre otomatik tema değişimi.
SESLI İkaz ve Uarılar: Sürüş esnasında kritik su sıcaklığı veya yağ basıncı durumunda sesli yönlendirme.
Gelişmiş Datalogger Export: CSV, JSON ve KML (Harita konumlu) datalog çıktısı alma.
Özel PID Tanımlama Arayüzü: Kullanıcıların kendi tanımladığı HEX PID ve formüllerini ekleyebilmesi.
ECU Modül Haritası: Aracın CAN bus üzerindeki tüm elektronik kontrol ünitelerinin görsel ağ şeması.
Garaj Araç Profil Geçişi: Birden fazla araç sahibi olan kullanıcılar için hızlı araç profil seçici.
Periyodik Bakım Sıfırlama: Yağ, fren balatası ve servis sıfırlama (Service Reset) kısayolları.
OBD Adaptör Yazılım Güncelleme Kontrolü: Vgate/vLinker adaptörler için firmware güncelleme tavsiyesi.
CAN Bus Yük Yüzdesi Göstergesi: Araç veri hattındaki doluluk oranını gösteren canlı izleyici.
Performans Ölçüm Modu: 0-100 km/h, 100-0 km/h ve çeyrek mil (1/4 mile) hassas GPS+OBD ölçümü.
Bileşen Bazlı Test Simülatörü: ECU simülatörü olmadan UI testleri yapmayı sağlayan Mock OBD Server.
Crashlytics ECU Log Entegrasyonu: Olası uygulama çökmelerinde araç bağlantı durumunun anonim crash raporuna eklenmesi.
4. YAYIN KARARI VE ZORUNLU EYLEMLER
Yayınlanabilir mi?
❌ HAYIR (YAYINLANAMAZ)

Uygulamada P0 seviyesinde kriptografik zayıflık, geliştirici backdoor'u ve ECU kilitlenme riskleri tespit edilmiştir. Bu haliyle mağazalarda yayınlanması veya araç sahipleri tarafından kullanılması ciddi güvenlik ve işlevsellik riskleri taşımaktadır.

Yayınlanmadan Önce Yapılması Gerekenler (Öncelik Sırasıyla)
Faz 1: Güvenlik ve ECU Kritik Düzeltmeleri (1. Hafta - Mutlak Zorunlu)
 PendingWriteStore.ts içinde gerçek SHA-256 algoritmasına geçilmesi.
 Production build'lerinden isBackdoorPro kodu ve jest trigger'larının tamamen silinmesi.
 SecurityAccessEngine içindeki sabit XOR anahtarının kaldırılması.
 Logger.ts için VIN anonimleştirme filtresinin devreye alınması.
 UDS NRC 0x78 durumunda zaman aşımı süresinin dinamik uzatılması.
Faz 2: Protokol ve Kararlılık İyileştirmeleri (2. Hafta)
 OBD Komut Kuyruğundaki (Queue) LIFO / Drop Stale PID mantığının kurulması.
 Akü voltajının yazma esnasında canlı dinlenmesi.
 Unmount edilen ekranlardaki setInterval leak'lerinin temizlenmesi.
 Dynamic Type ve Arapça (RTL) düzen krizlerinin giderilmesi.
Faz 3: Doğrulama ve Mağaza Onayı (3. Hafta)
 Gerçek araç ECU'ları üzerinde (VAG / BMW / Toyota vb.) 100+ kez ECU yazma/kurtarma (Rollback) stres testi yapılması.
 Sorumluluk Reddi (Legal Disclaimer) modalının yayınlanması.
 Penetrasyon ve Güvenlik Denetiminin (Re-Audit) tekrarlanması.
15:56
