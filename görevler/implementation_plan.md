# MotoCortex — Nihai Global ECU ve Çift Platform (iOS/Android) Bağlantı İyileştirme Planı

> **Analiz & Sentez Kapsamı:** `chatgpt.md`, `emergent.md`, `MotoCortex_Baglanti_Protokolleri_QA_Raporu.md`, `MotoCortex_Baglanti_Protokolleri_ve_Test_Raporu.md`, `PROTOCOL_TEST_REPORT.md`  
> **Geliştirme Amacı:** MotoCortex'i iOS ve Android platformlarında tüm araç ve motosiklet ECU'larında (ECM, TCM, ABS, BCM, SRS, EV BMS) ve tüm orijinal/klon OBD-II adaptörlerinde global pazarda tak-çalıştır seviyesinde sorunsuz hale getirmek.

---

## 🎯 Soruların Yanıtları ve Stratejik Mimari Kararlar

Aşağıdaki kararlar, her iki plandaki açık soruların ve mimari seçeneklerin detaylı değerlendirilmesiyle netleştirilmiştir:

### 1. iOS Classic Bluetooth (SPP) UX Stratejisi
* **Karar:** iOS işletim sisteminin Apple MFi sertifikasız Classic Bluetooth (SPP RFCOMM) cihazlara izin vermemesi bir donanım kısıtıdır. iOS tarafında Bluetooth tarama ekranına ve bağlantı seçimine şu net bilgilendirme uyarısı eklenecektir:
  > *"iOS üzerinde MFi sertifikası olmayan Classic Bluetooth (SPP) adaptörleri çalışmaz. Lütfen BLE (Bluetooth Low Energy) veya Wi-Fi adaptör kullanın."*
* **Avantaj:** App Store inceleme ve kullanıcı şikayetlerinin önüne geçilir, kullanıcı yanlış adaptör satın almaktan korunur.

### 2. Klon Adaptör Tespiti ve Donanım Profili Önbellekleme (Cache + Tiered Probing)
* **Karar:** `ELMIdentifierGate.ts` içindeki 21 komutluk ağır test sekansı her bağlantıda çalıştığı için 8–12 saniyelik gecikmeye ve `ATZ` hard reset'in 500ms aşımı nedeniyle orijinal adaptörlerin "clone" sanılmasına yol açıyordu.
* **Yeni Yaklaşım:**
  1. `ATZ` komutunun zaman aşımı **2000ms**'ye çıkarılacak.
  2. Donanım doğrulama sonuçları cihazın MAC / Peripheral UUID adresine göre `MMKV` / local storage üzerinde **cache'lenecektir**.
  3. Bağlantı esnasında öncelikle önbelleğe bakılacak; yoksa 3-4 komutluk hızlı prob atılacak, şüpheli durumda tam test tetiklenecektir.

### 3. Transport Katmanı Yönetimi (JS vs Native Eşitleme)
* **Karar:** JS (`BluetoothService.ios.ts`) ve Native (`BLETransport.swift`) katmanları arasındaki UUID ve hedef tarama uyumsuzluğu giderilecektir. Transport katmanı Native tarafında kalacak, ancak Native BLE katmanı JS'ten gelen geniş UUID listesini (`FFF0`, `18F0`, `E781` vLinker/STN, `Veepeak`, `UniCarScan`) dinamik olarak keşfedecek (Greedy Discovery) ve verilen `target` UUID'ye kesin kilitlenecektir.

### 4. Voltaj Güvenlik Eşiği (11.8V Hard Lockout)
* **Karar:** Akü voltajı `AT RV` sorgusuyla sürekli izlenecek ve **11.8V** altında olduğunda `HARD_MUTATION` (UDS Write / Coding / Adaptasyon) ve `DANGEROUS` (ECU Reset) komutları `BATTERY_VOLTAGE_LOW` hatası vererek kesin olarak kilitlenecektir.

### 5. Offline UDS Seed/Key Algoritma Kütüphanesi
* **Karar:** Garaj ve track-day gibi internetsiz ortamlarda UDS Security Access (0x27) işlemlerinin aksamaması için yaygın OEM markalarına (VAG, BMW, Ford, Toyota) ait standart Seed-Key hesaplama algoritmaları yerel kütüphaneye (`OfflineSecurityAccessProvider.ts`) eklenecektir. Karmaşık/özel OEM anahtarları için cloud HSM provider fallback olarak kalmaya devam edecektir.

### 6. CAN FD / DoIP / J1939 İletişimi
* **Karar:** Yazılım prototip katmanları (Android DoIP UDP discovery, J1939 `AT SP A` matrisi) tamamlanacaktır. Ancak kullanıcı arayüzünde adaptör yeteneklerine göre dinamik "CAN FD Supported / DoIP Required" rozetleri verilerek gerçek donanım gereksinimi kullanıcıya açıkça iletilecektir.

### 7. USB Host (Kablolu Adaptör) Yol Haritası
* **Karar:** Mobil OBD kullanımının %95+'i kablosuz (BLE/Classic/Wi-Fi) olduğu için öncelik Faz 1 (P0) ve Faz 2 (P1) kablosuz katmanlarının olgunlaştırılmasına verilecektir. Native Android USB Serial UART (FTDI, CH340, CP2102, PL2303) modülü Faz 3 kapsamında tamamlanacaktır.

---

## 🛠️ Birleştirilmiş Teknik Değişiklik Adımları

---

### 🔴 Faz 1: P0 Seviyesi Kritik Blokerlar (Release Öncesi Mutlaka Düzeltilecek Hatalar)

#### 1. Multi-ECU ISO-TP Yanıt Düşürme Bug'ının Düzeltilmesi
* **Dosya:** [ISOTPDecoder.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/decoders/ISOTPDecoder.ts)
* **Değişiklik:** Satır 28'deki sert `7E8` ve `18DAF110` kabul filtresi kaldırılacak. Aktif ECU header registry'sinden dinamik filter yapısına geçilecek. `7E8` (ECM), `7E9` (TCM), `7EA` (Hybrid/Battery), `7EB` (ABS), `7EC` (Cluster), `7ED` (SRS/Airbag), `7C8` (BCM) ve 29-bit CAN `18DAF1xx` yanıtlarının tümünün kabul edilmesi sağlanacak.

#### 2. iOS Native BLE Bağlantı Hedefi ve UUID Kısıtı Bug'ı
* **Dosya:** [BLETransport.swift](file:///Users/ismailimamoglu/Desktop/MotoCortex/ios/MotoCortex/BLETransport.swift)
* **Dosya:** [BLEBridge.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/transport/ble/BLEBridge.ts)
* **Değişiklik:** `BLETransport.swift` içinde tarama esnasında keşfedilen ilk cihaza değil, `connect(target:)` parametresi ile gelen cihaz UUID/Mac/Name hedefi eşleşmesine bağlanılacaktır. Servis keşfinde sadece `FFE0`/`FFE1` değil, geniş UUID listesi (`FFF0`, `18F0`, `E781`, `Veepeak`, `UniCarScan`) dinamik olarak desteklenecektir.

#### 3. Agresif Klon Tespiti ve ATZ Timeout Hatalı Damgalama Bug'ı
* **Dosya:** [ELMIdentifierGate.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/adapters/ELMIdentifierGate.ts)
* **Değişiklik:** `ATZ` reset komutunun zaman aşımı 500ms'den **2000ms**'ye çıkarılacaktır. Tanımlama sonuçları cihaz ID'si bazında bir kez çalıştırılıp cache'lenecektir.

#### 4. SecurityAccess dev-only Mock Sızma Riski
* **Dosya:** [SecurityAccessEngine.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/security/SecurityAccessEngine.ts)
* **Değişiklik:** Dev mock algoritması sadece `__DEV__` ile değil, `if (process.env.NODE_ENV !== 'production' && __DEV__)` çift kontrolü ile korunacaktır.

---

### 🟠 Faz 2: P1 Seviyesi Protokol & Donanım Eksiklikleri (Global Pazar Uyum Şartları)

#### 5. Eksik Fiziksel Bağlantı Başlatma Komutları (KWP2000, ISO-9141-2, Motosiklet, J1850)
* **Dosya:** [OBD2ProtocolEngine.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/OBD2ProtocolEngine.ts)
* **Dosya:** [commands.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/commands.ts)
* **Değişiklik:** `AT SP 5` (KWP Fast Init) ve `AT SP 4` (KWP 5-Baud) sekanlarına `AT IB 10` (Init Byte) ve `AT IIA 11/12` (Init Address) parametreleri dinamik eklenerek eski Honda, Yamaha, Suzuki, Kawasaki, BMW Motorrad ve VAG/Renault K-Line araçlar desteklenecektir. `AT SP 1` (J1850 PWM) ve `AT SP 2` (J1850 VPW) `commands.ts` matrisine eklenecektir.

#### 6. BLE MTU Negotiation & Paket Parçalanması Koruması
* **Dosya:** [BLETransport.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/transport/ble/BLETransport.ts)
* **Değişiklik:** Android'de `requestMTU(512)` çağrılacak; negotiated MTU değerine göre paket yazma boyutu dinamik ayarlanacak. 20-byte üstü UDS multi-frame okumalarda paket kaybını önlemek için `BLEMultiFrameAssembler` optimize edilecektir.

#### 7. Voltaj Tabanlı Yazma Koruması (ECU Brick Shield)
* **Dosya:** [CommandClassificationRegistry.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/security/CommandClassificationRegistry.ts)
* **Değişiklik:** `AT RV` okuma sonucu state'e yazılacak; voltaj **11.8V** altındaysa `HARD_MUTATION` (UDS Write/Coding) ve `DANGEROUS` (ECU Reset) komutları otomatik olarak reddedilecektir.

#### 8. Broadcast (Functional Addressing `7DF` / `18DB33F1`) ile Çoklu ECU Keşfi
* **Dosya:** [CapabilityDiscoveryManager.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/managers/CapabilityDiscoveryManager.ts)
* **Değişiklik:** `7DF` (11-bit functional) ve `18DB33F1` (29-bit functional) adresleri üzerinden araçtaki tüm aktif ECU'ların (ECM, TCM, ABS, BCM vb.) otomatik keşfedilmesi sağlanacaktır.

#### 9. Android 14+ Arka Plan İzinleri & Foreground Service
* **Dosya:** [AndroidManifest.xml](file:///Users/ismailimamoglu/Desktop/MotoCortex/android/app/src/main/AndroidManifest.xml)
* **Değişiklik:** `FOREGROUND_SERVICE_CONNECTED_DEVICE` ve `ACCESS_BACKGROUND_LOCATION` izinleri eklenecektir.

#### 10. Multi-ECU Concurrent Lockout Takibi
* **Dosya:** [UdsNrcHandler.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/uds/UdsNrcHandler.ts)
* **Değişiklik:** `lockoutEndTime` static singleton değişkeni `Map<ecuHeader, lockoutEndTime>` yapısına dönüştürülerek bir ECU'daki 0x36/0x37 kilitlenmesinin diğer ECU'ları engellemesi önlenecektir.

---

### 🟡 Faz 3: P2 Seviyesi İleri Düzey Protokol ve Aktarım Modülleri

#### 11. DoIP ve J1939 Entegrasyonunun Tamamlanması
* **Dosya:** [DoIpClient.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/doip/DoIpClient.ts)
* **Dosya:** [J1939ProtocolEngine.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/protocols/j1939/J1939ProtocolEngine.ts)
* **Dosya:** [useBluetooth.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/hooks/useBluetooth.ts)
* **Değişiklik:** DoIP UDP discovery için Android tarafına Kotlin/JS UDP Socket katmanı eklenecektir. `useBluetooth.ts` fallback matrisine `AT SP A` (J1939 29-bit CAN) eklenecektir.

#### 12. USB Host Native Modül İmplementasyonu
* **Dosya:** [UsbTransport.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/transport/usb/UsbTransport.ts)
* **Değişiklik:** Native Android USB Serial (FTDI, CH340, CP2102, PL2303) modülü mock halden gerçek UART soketine dönüştürülecektir.

---

## 🧪 Verification Plan

### Otomatik Testler (Automated Testing)
- **Jest Test Suite:** `npm test` komutu ile mevcut 401+ birim testin çalıştığı ve yeni eklenen testlerin geçtiği doğrulanacaktır.
- **TypeScript Derleme:** `npx tsc --noEmit --skipLibCheck` ile 0 hata doğrulaması yapılacaktır.
- **Yeni Birim Testleri:**
  - `ISOTPDecoder.test.ts`: `7E9`, `7EA`, `7EB` vb. multi-ECU frame'lerinin başarıyla parse edildiği.
  - `ELMIdentifierGate.test.ts`: `ATZ` 2000ms yanıtlarının doğru işlendiği ve cache mekanizması.
  - `CommandClassificationRegistry.test.ts`: Voltaj < 11.8V olduğunda yazma komutlarının engellendiği.

### Manuel Doğrulama & Saha Simülasyonu
- **iOS BLE Cihaz Hedefleme Testi:** Yakında birden fazla BLE cihazı varken seçilen spesifik adaptöre kilitlenme teyidi.
- **Multi-ECU Simülasyonu:** ECM (`7E8`) ve TCM (`7E9`) yanıtlarının eş zamanlı işlendiğinin teyidi.
- **Klon ve Orijinal Adaptör Sınıflandırması:** Orijinal PIC18F25K80 adaptörün Tier A/S, sahte v2.1 ELM327'nin Tier C Read-Only olarak etiketlendiğinin doğrulanması.
- **Voltaj Kalkanı Teyidi:** 11.5V simüle voltaj altında UDS Coding komutunun engellenmesi.
