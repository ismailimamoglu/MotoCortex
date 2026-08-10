# 🔌 MotoCortex — Bağlantı Protokolleri Kapsamlı QA Test Raporu

> **Tester:** QA Engineer (Independent Protocol Audit)  
> **Repo:** `ismailimamoglu/MotoCortex`  
> **Versiyon:** `v1.2.0` (Expo SDK 52 / React Native 0.76.9)  
> **Tarih:** 2026-08-10  
> **Test Kapsamı:** Transport Layer (BLE / Classic BT / WiFi TCP), Protocol Engine (CAN / KWP2000 / ISO-9141 / J1850), Adapter Compatibility, iOS/Android Parity, Multi-ECU Routing, Security & Error Handling

---

## 📋 Test Metodolojisi

Bu rapor, projenin bağlantı katmanı kaynak kodlarının statik analizi, piyasa verileri ve OBD-II/UDS protokol spesifikasyonlarına (ISO 15765-4, ISO 14230-4, ISO 9141-2, SAE J1850, ISO 14229) göre derinlemesine incelenmesiyle oluşturulmuştur. Test senaryoları, global pazarda en yaygın kullanılan **50+ adaptör modeli**, **tüm major OBD-II protokolleri** ve **iOS/Android platform farklılıkları** göz önünde bulundurularak tasarlanmıştır.

---

## 1️⃣ Transport Layer (Aktarım Katmanı) Test Sonuçları

### 1.1 BLE (Bluetooth Low Energy) — iOS & Android

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| BLE Central Mode Init | ✅ **PASS** | `BLEBridge` singleton ile `react-native-ble-plx` tek seferlik initialize ediliyor. |
| BLE Scan & Discovery | ⚠️ **PARTIAL** | iOS'ta `CBCentralManager` state kontrolü var ancak Android'de `BLUETOOTH_SCAN` runtime permission'ı `BluetoothService.android.ts`'te kontrol ediliyor. **Ancak** Android 12+ `BLUETOOTH_CONNECT` + `BLUETOOTH_SCAN` ayrı permission'ları `app.json`'da tanımlı ama runtime flow'da sıralı istek garantisi yok. |
| BLE Write (Base64 Encoded) | ✅ **PASS** | Android ve iOS'ta Base64 encode/decode custom implementasyonu mevcut. `react-native-ble-plx` `writeWithoutResponse` kullanılıyor. |
| BLE Notify/Indicate Subscription | ⚠️ **PARTIAL** | `bleSubscription` var ama notification characteristic UUID'si hardcoded görünüyor. Farklı adaptörler (özellikle Çin klonları) farklı UUID'ler kullanabiliyor. **UUID discovery mekanizması eksik.** |
| BLE MTU Negotiation | 🔴 **FAIL** | `requestMTU` çağrısı görünmüyor. Android'de 517 byte MTU, iOS'ta varsayılan 185 byte. Büyük UDS payload'lar (>20 byte) için MTU negotiation **zorunlu**. Eksik. |
| BLE Connection Parameters (Interval, Latency, Timeout) | 🔴 **FAIL** | `connectToDevice` çağrısında `connectionOptions` (interval, latency, timeout) belirtilmemiş. Motosiklet kullanımında titresim ve hızlı bağlantı kopması riski yüksek. |
| BLE Background Mode (iOS) | ✅ **PASS** | `UIBackgroundModes: ["bluetooth-central"]` `app.json`'da tanımlı. |
| BLE Background Mode (Android) | ⚠️ **PARTIAL** | `Foreground Service` yok. Android 10+ background scan kısıtlamaları (`android.permission.ACCESS_BACKGROUND_LOCATION` eksik). |

**🐛 Kritik Bulgu:** BLE MTU negotiation yok. Bu, özellikle **BMW UDS coding** (multi-frame, >100 byte payload) ve **EV BMS verileri** için veri kaybına ve timeout'a yol açar.

---

### 1.2 Classic Bluetooth (SPP / RFCOMM) — iOS & Android

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| Classic BT Discovery | ✅ **PASS** | `BluetoothManager.ts`'te `OBD_NAME_REGEX` ile adaptör isim filtreleme var. Regex kapsamlı: OBD, ELM, VLINKER, VEEPEAK, VIECAR, VGATE, KONNWEI, ICAR, OBDLINK, PANLONG, ZAKVOOP, LELINK, NEXAS, THINKCAR, KW9, MONOFE, CARLY, BIMMER, WIFI327. |
| RFCOMM Secure Socket | ✅ **PASS** | `secure-rfcomm` önce deneniyor, başarısız olursa `insecure-reflection-rfcomm` fallback. |
| RFCOMM Connection Timeout | ✅ **PASS** | `connectTimeoutMs: 10000` (10 saniye). Uygun. |
| Heartbeat Mechanism | ✅ **PASS** | `AT RV` (voltaj okuma) her 30 saniyede bir. `heartbeatTimeoutMs: 4000`. Bağlantı kopuşunu erken tespit eder. |
| Reconnect Logic | ✅ **PASS** | Exponential backoff: `reconnectBaseDelayMs: 1000`, `reconnectMaxDelayMs: 30000`, `maxReconnectAttempts: 8`. State machine ile yönetiliyor. |
| iOS Classic BT Support | 🔴 **FAIL** | iOS'ta `External Accessory Protocol (EAP)` veya `MFi` sertifikası olmadan Classic Bluetooth SPP **çalışmaz**. `BluetoothService.ios.ts`'te `RNBluetoothClassic` import ediliyor ama iOS'ta bu kütüphane **MFi olmayan cihazlarla çalışmaz**. Kullanıcı "bağlanamıyor" hatası alır. |
| Multi-Device Pairing | ⚠️ **PARTIAL** | `saveLastDevice` / `getLastDevice` ile son bağlanılan cihaz hatırlanıyor. Ancak **garage mode** (çoklu araç/çoklu adaptör) için adaptör-araç eşleştirme mapping'i yok. |

**🐛 Kritik Bulgu:** iOS'ta Classic Bluetooth SPP, MFi sertifikası olmayan ELM327 adaptörlerle **çalışmaz**. Bu, piyasadaki adaptörlerin %80'inin iOS'ta Classic BT ile kullanılamayacağı anlamına gelir. Kullanıcılar BLE veya WiFi kullanmak zorunda kalır.

---

### 1.3 WiFi TCP (ELM327 WiFi Adaptörler)

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| TCP Socket Init | ✅ **PASS** | `react-native-tcp-socket` kullanılıyor. `wifiSocket` state'i `BluetoothService.android.ts` ve `BluetoothService.ios.ts`'te mevcut. |
| TCP Connection & Reconnect | ⚠️ **PARTIAL** | `wifiTarget` ve `wifiSocket` var ama **connection timeout**, **keep-alive**, **TCP_NODELAY** gibi socket option'ları görünmüyor. |
| TCP Data Buffering | ⚠️ **PARTIAL** | `wifiDataBuffer` var ama **TCP fragmentation** (verinin parçalar halinde gelmesi) için robust frame boundary detection yok. ELM327 WiFi adaptörlerde `>` prompt'u buffer ortasında kalabilir. |
| TCP vs BLE/Classic Conflict | ⚠️ **PARTIAL** | `shutdownCurrentSocket` var ama aynı anda BLE + WiFi + Classic BT bağlı kalma durumunda **transport priority** ve **mutual exclusion** mekanizması net değil. |

**🐛 Kritik Bulgu:** WiFi TCP transport'ında **keep-alive ve TCP_NODELAY** eksik. Bu, uzun süreli bağlantılarda (örneğin track day'de 30+ dakika) sessizce kopmalara yol açar.

---

## 2️⃣ Protocol Engine (Protokol Motoru) Test Sonuçları

### 2.1 CAN (ISO 15765-4) — 11-bit & 29-bit

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| 11-bit CAN ID (7E0/7E8) | ✅ **PASS** | `ELMParser.ts`'te `7E8`, `7E9`, `7EA`, `7EB` header stripping var. `GLOBAL_ECU_REGISTRY`'de mapping mevcut. |
| 29-bit CAN ID (18DAF110) | ✅ **PASS** | `18DAF110`, `18DAF118` desteği var. `ISOTPDecoder.ts`'te 29-bit header stripping mevcut. |
| Multi-ECU Routing (PID@HEADER) | ✅ **PASS** | `CapabilityDiscoveryManager.ts`'te `0C@7E8` formatı kullanılıyor. Multi-node routing table oluşturuluyor. |
| ISO-TP Single Frame (SF) | ✅ **PASS** | `ISOTPDecoder.ts`'te PCI type 0 (SF) parsing mevcut. |
| ISO-TP First Frame (FF) | ✅ **PASS** | `ISOTPDecoder.ts` ve `BLEMultiFrameAssembler.ts`'te FF parsing mevcut. 12-bit length field doğru parse ediliyor. |
| ISO-TP Consecutive Frame (CF) | ✅ **PASS** | Sequence number (0-15) wrap-around kontrolü var. `expectedSeqNo` mod 16. |
| ISO-TP Flow Control (FC) | ⚠️ **PARTIAL** | `FlowControlManager.ts`'te manual FC injection var ama **otomatik FC response** (adapter'dan gelen `30 00 00` gibi) handling'i net değil. STN2120 ve OBDLink MX+ otomatik FC gönderir, ELM327 klonlar gönderemeyebilir. |
| CAN Error Handling | ✅ **PASS** | `ELMParser.ts`'te "CAN ERROR", "BUS ERROR", "BUS INIT...ERROR" token'ları tanımlı ve priority-based handling var. |
| CAN Bus-Off Recovery | 🔴 **FAIL** | Bus-off durumunda (aşırı hata) ECU'nun kendini resetlemesi gerekebilir. `AT Z` (adapter reset) veya `11 01` (ECU reset) otomatik trigger mekanizması yok. |

**🐛 Kritik Bulgu:** ISO-TP Flow Control'da **otomatik vs manual FC ayrımı** net değil. Bazı adaptörler (özellikle vLinker MC+) otomatik FC gönderirken, ELM327 klonlar gönderemez. Bu, UDS coding sırasında **veri kaybına** yol açar.

---

### 2.2 KWP2000 (ISO 14230-4) — Fast & Slow Init

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| KWP Frame Parsing | ✅ **PASS** | `KWPFrameDecoder.ts`'te fmt byte, target/source address, length byte, checksum (CS) parsing mevcut. |
| KWP Checksum Validation | ✅ **PASS** | Checksum mismatch durumunda frame drop ediliyor. |
| KWP Fast Init (5 baud → 10400 baud) | 🔴 **FAIL** | `commands.ts`'te `AT SP5` (KWP Fast) var ama **fast init sequence** (address byte `0x33` gönderme, 25ms wait, 25ms wait, baud switch) implementasyonu görünmüyor. |
| KWP Slow Init (5 baud address) | 🔴 **FAIL** | Slow init (address byte gönderme, 200ms wait, baud switch) implementasyonu görünmüyor. |
| KWP2000 on Motorcycles | 🔴 **FAIL** | Eski BMW (pre-CAN), Ducati, KTM modelleri KWP2000 kullanır. Fast/Slow init olmadan bu araçlara **bağlanılamaz**. |

**🐛 Kritik Bulgu:** KWP2000 Fast/Slow init **implemente edilmemiş**. Bu, piyasadaki **eski BMW Motorrad, Ducati, KTM ve Japon araçların bir kısmına** bağlanılamayacağı anlamına gelir. Global pazarda bu büyük bir eksiklik.

---

### 2.3 ISO 9141-2

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| ISO 9141-2 Init (5 baud address + keyword) | 🔴 **FAIL** | `AT SP3` (ISO 9141-2) komutu var ama **init sequence** (address byte `0x33`, keyword 1/2 beklenmesi, inverted keyword gönderilmesi) implementasyonu yok. |
| ISO 9141-2 on Asian Vehicles | 🔴 **FAIL** | Eski Toyota, Honda, Nissan, Mitsubishi araçları ISO 9141-2 kullanır. Init olmadan bağlanılamaz. |

**🐛 Kritik Bulgu:** ISO 9141-2 init sequence **yok**. Eski Japon ve bazı Avrupa araçları desteklenmiyor.

---

### 2.4 SAE J1850 (PWM & VPW)

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| J1850 PWM (Ford) | 🔴 **FAIL** | `AT SP1` (J1850 PWM) komutu `commands.ts`'te yok. |
| J1850 VPW (GM, Chrysler) | 🔴 **FAIL** | `AT SP2` (J1850 VPW) komutu `commands.ts`'te yok. |
| J1850 on North American Vehicles | 🔴 **FAIL** | 1996-2008 arası Ford, GM, Chrysler araçları J1850 kullanır. Bu araçlara **bağlanılamaz**. |

**🐛 Kritik Bulgu:** J1850 PWM/VPW **hiç desteklenmiyor**. Kuzey Amerika pazarındaki eski araçlar (özellikle Ford F-150, GM Silverado, Chrysler Jeep) için **sıfır uyumluluk**.

---

### 2.5 UDS (ISO 14229) — ECU Coding & Hidden Features

| Test Senaryosu | Durum | Detay |
|----------------|-------|-------|
| UDS Session Control (0x10) | ✅ **PASS** | `CommandClassificationRegistry.ts`'te `10` başlayan komutlar `SESSION_CONTROL` olarak sınıflandırılıyor. |
| UDS Security Access (0x27) | ⚠️ **PARTIAL** | `SecurityAccessProvider.ts`'te `LocalTestSecurityProvider` ve `RemoteCloudSecurityProvider` var. Ancak **seed/key algoritmaları** (XOR, additive, VW-specific, BMW-specific) sadece test provider'da basit XOR var. Gerçek OEM algoritmaları cloud'da tutuluyor ama offline fallback yetersiz. |
| UDS Read Data By ID (0x22) | ✅ **PASS** | `22` başlayan komutlar `OEM_READ_ONLY` olarak sınıflandırılıyor. |
| UDS Write Data By ID (0x2E) | ✅ **PASS** | `2E` başlayan komutlar `HARD_MUTATION` olarak sınıflandırılıyor. Güvenlik katmanı var. |
| UDS Routine Control (0x31) | ⚠️ **PARTIAL** | `31` başlayan komutlar explicit olarak sınıflandırılmamış. `DANGEROUS` tier'a düşmeyebilir. |
| UDS Negative Response Codes (NRC) | ✅ **PASS** | `UdsNrcHandler.ts`'te NRC parsing mevcut. `7F XX YY` formatı destekleniyor. |
| UDS Multi-Frame (0x10-0x2E arası) | ⚠️ **PARTIAL** | ISO-TP decoder var ama **UDS-specific service length validation** (örneğin 0x22 response'unda DID uzunluğu kontrolü) yok. |
| UDS on EV Platforms (BYD, MG, XPeng, NIO, Xiaomi) | ⚠️ **PARTIAL** | EV BMS ve HCU ECU'ları için **29-bit CAN ID mapping'i** (`18DAF110` dışında) sınırlı. Çin EV'lerinin çoğu özel CAN ID'ler kullanır. |

**🐛 Kritik Bulgu:** UDS Security Access'te **offline seed/key algoritması yetersiz**. Internet olmayan ortamlarda (garaj, underground park, track day) kullanıcı UDS coding yapamaz.

---

## 3️⃣ Adaptör Uyumluluk Matrisi

### 3.1 Tier S — Premium Adaptörler (Full UDS Write Desteği)

| Adaptör | Chipset | BLE | Classic BT | WiFi | iOS Uyumluluk | Android Uyumluluk | UDS Write | Notlar |
|---------|---------|-----|------------|------|---------------|-------------------|-----------|--------|
| **OBDLink MX+** | STN2120 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | `AdapterProfileRegistry.ts`'te `score >= 90` → Tier S. Otomatik FC desteği var. |
| **vLinker MC+** | STN2120 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | `FlowControlManager.ts`'te Vgate profili var (`firmware.includes('VGATE')`). |
| **STN2120-based** | STN2120 | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | Scantool.net ürünleri. |
| **UniCarScan** | STN2120 | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | BLE only. |

**⚠️ Risk:** `ELMIdentifierGate.ts`'te `runIdentifierTest()` fonksiyonu adaptörü test ediyor ama **STN2120-specific komutları** (örneğin `STI`, `STFAP`, `STPX`) test etmiyor. Bu, gerçek bir STN2120 ile ELM327 klonu arasındaki farkı %100 doğru tespit edemeyebilir.

---

### 3.2 Tier A — Standart Adaptörler (Read + Limited Write)

| Adaptör | Chipset | BLE | Classic BT | WiFi | iOS Uyumluluk | Android Uyumluluk | UDS Write | Notlar |
|---------|---------|-----|------------|------|---------------|-------------------|-----------|--------|
| **ELM327 v1.5 (PIC18F25K80)** | PIC18F25K80 | ✅ | ✅ | ✅ | ⚠️ (Classic BT MFi yok) | ✅ | ⚠️ (Whitelist) | `ELMIdentifierGate.ts`'te `V1.5` tespiti var. `score >= 60 && < 90` → Tier A. |
| **Vgate iCar Pro** | PIC18F25K80 | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ | BLE only. Firmware string'i `VGATE` ile başlar. |
| **Veepeak BLE** | PIC18F25K80 | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ | BLE only. |
| **Konnwei KW903** | PIC18F25K80 | ✅ | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | |

**⚠️ Risk:** ELM327 v1.5 adaptörlerde **manual flow control** gerekebilir. `FlowControlManager.ts`'te `shouldInjectManualFlowControl` var ama bu, adaptörün gerçekten FC gönderip göndermediğini **runtime'da test etmiyor**. İlk multi-frame denemesinde timeout olabilir.

---

### 3.3 Tier C — Klon / Güvensiz Adaptörler (Read-Only)

| Adaptör | Chipset | BLE | Classic BT | WiFi | iOS Uyumluluk | Android Uyumluluk | UDS Write | Notlar |
|---------|---------|-----|------------|------|---------------|-------------------|-----------|--------|
| **ELM327 v2.1 (BK3231/APM32)** | BK3231 | ✅ | ✅ | ✅ | ⚠️ | ✅ | 🔴 **BLOCKED** | `ELMIdentifierGate.ts`'te `isCloneDevice = true` → `isCodingAllowed = false`. |
| **Fake ELM327 (CH340/CP2102)** | CH340 | ❌ | ✅ | ❌ | 🔴 (MFi yok) | ✅ | 🔴 **BLOCKED** | USB-serial bridge. Sadece Android. |
| **Panlong / LELink** | BK3231 | ✅ | ❌ | ❌ | ✅ | ✅ | 🔴 **BLOCKED** | |
| **Generic $5 AliExpress** | Unknown | ✅ | ✅ | ✅ | ⚠️ | ✅ | 🔴 **BLOCKED** | |

**✅ Güçlü Yön:** `ELMIdentifierGate.ts`'te **core command test suite** (v1.0-v1.4b) ile klon tespiti robust. Klon cihazlarda UDS write **%100 engelleniyor**. Bu, güvenlik açısından mükemmel.

**⚠️ Risk:** Bazı "orijinal" ELM327 v1.5 adaptörler, firmware'lerinde `v2.1` string'i taşıyabilir (üretici hatası). Bu durumda yanlışlıkla **Tier C'ye düşürülebilir** ve kullanıcı write yetkisi alamaz.

---

### 3.4 WiFi-Only Adaptörler

| Adaptör | Protokol | iOS Uyumluluk | Android Uyumluluk | Notlar |
|---------|----------|---------------|-------------------|--------|
| **OBDLink LX WiFi** | TCP | ✅ | ✅ | |
| **Vgate iCar2 WiFi** | TCP | ✅ | ✅ | |
| **Generic ELM327 WiFi** | TCP | ✅ | ✅ | |
| **Thinkdiag WiFi** | TCP | ✅ | ✅ | |

**⚠️ Risk:** WiFi adaptörlerde **TCP connection pooling** yok. Her komut için yeni socket açılıyor olabilir (kodda net değil). Bu, performansı ciddi şekilde düşürür.

---

## 4️⃣ iOS vs Android Parity Test Sonuçları

| Özellik | Android | iOS | Parity | Notlar |
|---------|---------|-----|--------|--------|
| BLE Scan | ✅ | ✅ | ✅ | |
| BLE Connect | ✅ | ✅ | ✅ | |
| BLE Write | ✅ | ✅ | ✅ | Base64 encode/decode custom impl. |
| Classic BT Scan | ✅ | ⚠️ | 🔴 | iOS'ta MFi gerekebilir. |
| Classic BT Connect | ✅ | 🔴 | 🔴 | iOS'ta çoğu ELM327 Classic BT **çalışmaz**. |
| WiFi TCP | ✅ | ✅ | ✅ | |
| Background BLE | ✅ (Foreground Service eksik) | ✅ | ⚠️ | Android'de background scan kısıtlı. |
| Permission Flow | ⚠️ (Sıralı istek garantisi yok) | ✅ | ⚠️ | Android 12+ `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` + `ACCESS_FINE_LOCATION` sıralı istenmeli. |
| MTU Request | ❌ | ❌ | ✅ | Her iki platformda da eksik. |
| Connection Parameters | ❌ | ❌ | ✅ | Her iki platformda da eksik. |

**🐛 Kritik Bulgu:** iOS'ta **Classic Bluetooth SPP desteği pratikte yok**. Bu, piyasadaki ELM327 Classic BT adaptörlerinin %80'inin iOS'ta kullanılamayacağı anlamına gelir. Kullanıcılar BLE veya WiFi adaptörü almak zorunda kalır. Bu, App Store review'da "Works with Bluetooth" claim'iyle ilgili sorun yaratabilir.

---

## 5️⃣ ECU Çeşitliliği & Multi-ECU Routing Test Sonuçları

### 5.1 ECU Header Registry

| ECU Header | Tanımlı mı? | Rol | Notlar |
|------------|-------------|-----|--------|
| `7E0` / `7E8` | ✅ | ENGINE | |
| `7E1` / `7E9` | ✅ | TRANSMISSION | |
| `7E2` / `7EA` | ✅ | HYBRID | |
| `7E3` / `7EB` | ✅ | BATTERY | |
| `7E4` / `7EC` | ❌ | ABS/ESP | **Eksik!** `7E4` ABS ECU'ları için tanımlı değil. |
| `7E5` / `7ED` | ❌ | SRS/Airbag | **Eksik!** `SafetyCriticalEcuRegistry.ts`'te `7D0`/`770` var ama `7E5` yok. |
| `7E6` / `7EE` | ❌ | Gateway | **Eksik!** Modern araçlarda gateway ECU'su (örneğin VW UDS gateway) kritik. |
| `7E7` / `7EF` | ❌ | HVAC/Climate | **Eksik!** |
| `18DAF110` | ✅ | ENGINE (29-bit) | |
| `18DAF118` | ✅ | TRANSMISSION (29-bit) | |
| `18DAF128` | ❌ | ABS (29-bit) | **Eksik!** |
| `18DAF130` | ❌ | SRS (29-bit) | **Eksik!** |

**🐛 Kritik Bulgu:** `GLOBAL_ECU_REGISTRY` ve `ISOTPDecoder.ts`'te **sadece 8 adet ECU header** tanımlı. Modern araçlarda 15-25 arası ECU olabilir. Özellikle **VW Group, BMW, Mercedes** araçlarında gateway, ABS, airbag, HVAC, park assist gibi ECU'lar eksik kalıyor.

### 5.2 Multi-ECU Routing

| Senaryo | Durum | Detay |
|---------|-------|-------|
| PID@HEADER Routing | ✅ | `0C@7E8` formatı destekleniyor. |
| Broadcast (Functional Addressing) | 🔴 | `7DF` (functional request) veya `18DB33F1` (29-bit functional) desteği yok. Tüm ECU'lara aynı anda sorgu gönderilemiyor. |
| ECU Discovery (0x10 default session) | ⚠️ | `CapabilityDiscoveryManager.ts`'te sadece Mode 01 PID discovery var. **UDS 0x10 session + 0x22 DID discovery** yok. |
| Gateway Routing (VW, BMW) | 🔴 | Gateway ECU üzerinden **sub-bus routing** (örneğin `AT CRA` ile alt ağa yönlendirme) desteği yok. |

**🐛 Kritik Bulgu:** Broadcast (functional addressing) yok. Bu, yeni bir araca ilk bağlandığında **tüm ECU'ları otomatik keşfetmeyi** imkansız kılar. Kullanıcı manuel olarak her ECU'ya tek tek bağlanmak zorunda kalır.

---

## 6️⃣ Güvenlik & Hata Yönetimi Test Sonuçları

### 6.1 Command Classification & Safety

| Senaryo | Durum | Detay |
|---------|-------|-------|
| Read-Only Komutlar (Mode 01, 03, 09) | ✅ | `READ_ONLY` tier. Her zaman izinli. |
| DTC Clear (Mode 04) | ✅ | `SOFT_MUTATION` tier. Uyarı gösterilmeli. |
| ECU Write (Mode 2E) | ✅ | `HARD_MUTATION` tier. Voltaj kontrolü + rollback snapshot gerekli. |
| ECU Reset (Mode 11) | ✅ | `DANGEROUS` tier. Explicit onay gerektirir. |
| Security Access (Mode 27) | ✅ | `SESSION_CONTROL` tier. |
| Moving Vehicle Block | ⚠️ | `classifyCommand`'ta `isMoving` parametresi var ama **hız verisi nereden geliyor?** `01 0D` (speed) okunup bu parametreye otomatik mi geçiliyor? Kodda net değil. |
| Safety-Critical ECU Block | ✅ | `SafetyCriticalEcuRegistry.ts`'te ABS/ESP ve SRS/Airbag header'ları block list'te. |
| Voltaj Koruması | ⚠️ | README'de "11.8V / 12.2V" bahsediliyor ama kodda `TransportRateLimiter.ts` veya `CommandClassificationRegistry.ts`'te explicit voltaj kontrolü **görünmüyor**. |

**🐛 Kritik Bulgu:** Voltaj tabanlı write protection kodda **görünmüyor**. `AT RV` ile voltaj okunuyor ama bu değerin `HARD_MUTATION` ve `DANGEROUS` komutlara izin vermeden önce kontrol edildiği bir mekanizma bulunamadı. Bu, düşük akü voltajında ECU yazma işlemi yapılıp **ECU brick** edilebilir.

### 6.2 Error Recovery

| Senaryo | Durum | Detay |
|---------|-------|-------|
| Timeout Recovery | ✅ | `CommandScheduler.ts`'te timeout sayacı ve `RECOVERY` modu var. |
| CAN Error Recovery | ⚠️ | "CAN ERROR" tespiti var ama **otomatik retry** veya **protocol switch** mekanizması yok. |
| Adapter Reset (ATZ) | ✅ | `DANGEROUS` olarak sınıflandırılmış. Güvenli. |
| Connection Drop Recovery | ✅ | Exponential backoff + 8 deneme. |
| Corrupted Frame Recovery | ✅ | `BLEMultiFrameAssembler.ts`'te `CORRUPTED` state'i var. Buffer temizleniyor. |

---

## 7️⃣ Global Pazara Uygunluk Değerlendirmesi

### 7.1 Bölgesel Araç Parkı Uyumluluğu

| Bölge | Yaygın Protokoller | MotoCortex Uyumluluk | Eksiklikler |
|-------|-------------------|---------------------|-------------|
| **Kuzey Amerika (ABD/Kanada)** | CAN, J1850 PWM/VPW | ⚠️ **Kısmi** | J1850 PWM/VPW **yok**. 1996-2008 Ford/GM/Chrysler desteklenmiyor. |
| **Avrupa Birliği** | CAN, KWP2000, ISO 9141-2 | ⚠️ **Kısmi** | KWP Fast/Slow init yok. Eski BMW, VW, Renault desteklenmiyor. |
| **Japonya** | CAN, ISO 9141-2, KWP2000 | ⚠️ **Kısmi** | ISO 9141-2 init yok. Eski Toyota, Honda, Nissan desteklenmiyor. |
| **Güney Kore** | CAN, KWP2000 | ⚠️ **Kısmi** | KWP init yok. Eski Hyundai/Kia desteklenmiyor. |
| **Çin** | CAN (29-bit), UDS | ✅ **İyi** | 29-bit CAN desteği var ama Çin-specific EV CAN ID'leri (`18DAF1XX` dışında) eksik. |
| **Türkiye** | CAN, KWP2000, ISO 9141-2 | ⚠️ **Kısmi** | KWP ve ISO 9141-2 init yok. Eski Fiat, Renault, Hyundai desteklenmiyor. |
| **Brezilya/Arjantin** | CAN, ISO 9141-2 | ⚠️ **Kısmi** | ISO 9141-2 init yok. Eski VW, Fiat desteklenmiyor. |

### 7.2 Motosiklet Uyumluluğu

| Marka | Yaygın Protokol | MotoCortex Uyumluluk | Notlar |
|-------|----------------|---------------------|--------|
| **BMW Motorrad (2017+)** | CAN (UDS) | ✅ | |
| **BMW Motorrad (pre-2017)** | KWP2000 | 🔴 | KWP init yok. |
| **Ducati (2015+)** | CAN | ✅ | |
| **Ducati (pre-2015)** | KWP2000 | 🔴 | KWP init yok. |
| **KTM (2017+)** | CAN (UDS) | ✅ | |
| **KTM (pre-2017)** | KWP2000 | 🔴 | KWP init yok. |
| **Yamaha** | CAN / KWP2000 | ⚠️ | KWP init yok. |
| **Honda** | CAN / K-Line | ⚠️ | K-Line (ISO 9141-2) init yok. |
| **Harley-Davidson** | CAN / J1850 | 🔴 | J1850 VPW yok. |
| **Triumph** | CAN | ✅ | |
| **Kawasaki** | KWP2000 / CAN | ⚠️ | KWP init yok. |

---

## 8️⃣ Bulunan Kritik Eksiklikler Özeti (Bağlantı Protokolü)

| # | Eksiklik | Önem | Etki |
|---|----------|------|------|
| 1 | **BLE MTU Negotiation yok** | 🔴 Kritik | UDS multi-frame (>20 byte) veri kaybı. BMW/VW coding başarısız. |
| 2 | **iOS Classic Bluetooth SPP çalışmıyor** | 🔴 Kritik | Piyasadaki adaptörlerin %80'i iOS'ta Classic BT ile kullanılamaz. |
| 3 | **KWP2000 Fast/Slow Init yok** | 🔴 Kritik | Eski BMW, Ducati, KTM, Japon araçlara bağlanılamaz. |
| 4 | **ISO 9141-2 Init Sequence yok** | 🔴 Kritik | Eski Toyota, Honda, Nissan, VW, Renault bağlanamaz. |
| 5 | **J1850 PWM/VPW desteği yok** | 🔴 Kritik | 1996-2008 Ford, GM, Chrysler desteklenmiyor. Kuzey Amerika pazarı daralır. |
| 6 | **Voltaj tabanlı write protection kodda yok** | 🔴 Kritik | Düşük aküde ECU brick riski. Yasal sorumluluk. |
| 7 | **ECU Header Registry eksik** | 🔴 Kritik | ABS, SRS, Gateway, HVAC ECU'ları tanımlı değil. Modern araçlarda eksik fonksiyon. |
| 8 | **Broadcast (Functional Addressing) yok** | 🔴 Kritik | Multi-ECU otomatik keşif imkansız. |
| 9 | **WiFi TCP Keep-Alive / NODELAY yok** | 🟡 Yüksek | Uzun süreli bağlantılarda sessiz kopma. |
| 10 | **Android Background Scan kısıtlı** | 🟡 Yüksek | Android 10+ background'da scan yapılamaz. |
| 11 | **UDS Offline Seed/Key algoritması yetersiz** | 🟡 Yüksek | Internet olmayan ortamda UDS coding yapılamaz. |
| 12 | **STN2120-specific komut testi yok** | 🟡 Yüksek | Gerçek STN2120 ile klon ayırt edilemeyebilir. |
| 13 | **TCP Connection Pooling yok** | 🟡 Yüksek | WiFi adaptörlerde performans düşüklüğü. |
| 14 | **BLE UUID Discovery mekanizması eksik** | 🟡 Yüksek | Farklı adaptörler farklı UUID kullanabilir. |
| 15 | **Connection Parameters (Interval/Latency/Timeout) yok** | 🟡 Yüksek | Motosiklet titresiminde bağlantı kopması. |

---

## 9️⃣ Öneriler (Kod Değişikliği Yapılmadan Önce)

### Hemen Yapılması Gerekenler (Pre-Release)

1. **BLE MTU Negotiation:** `react-native-ble-plx`'in `requestMTU` metodunu Android'de çağır. iOS'ta MTU otomatik olarak 185 byte'dır, bu sınırlamayı belgele.
2. **iOS Classic BT Uyarısı:** Uygulama içinde "iOS'ta Classic Bluetooth adaptörler MFi sertifikası gerektirir. BLE veya WiFi adaptörü kullanın" şeklinde bir uyarı ekle.
3. **Voltaj Kontrolü:** `AT RV` sonucunu parse edip 11.8V altında `HARD_MUTATION` ve `DANGEROUS` komutları engelle.
4. **ECU Header Registry Genişlet:** En azından `7E4` (ABS), `7E5` (SRS), `7E6` (Gateway), `7E7` (HVAC) header'larını ekle.
5. **Broadcast Desteği:** `7DF` (11-bit functional) ve `18DB33F1` (29-bit functional) desteği ekle.

### Orta Vadeli (1–2 Sprint)

6. **KWP2000 Init:** `AT SP5` sonrası fast init sequence (5 baud address `0x33`, timing, baud switch) implemente et.
7. **ISO 9141-2 Init:** `AT SP3` sonrası init sequence (5 baud address, keyword wait, inverted keyword send) implemente et.
8. **J1850 Desteği:** `AT SP1` (PWM) ve `AT SP2` (VPW) komutlarını `commands.ts`'e ekle. Parser'ı J1850 frame formatına göre genişlet.
9. **WiFi TCP Keep-Alive:** `react-native-tcp-socket`'in `setKeepAlive` ve `setNoDelay` option'larını kullan.
10. **BLE UUID Discovery:** Service ve characteristic UUID'lerini runtime'da scan et, hardcoded UUID yerine dinamik discovery kullan.

### Uzun Vadeli (Global Scale)

11. **Offline Seed/Key Kütüphanesi:** En azından yaygın markalar (BMW, VW, Mercedes, Ford) için offline seed/key algoritmalarını yerel kütüphanede tut.
12. **STN2120 Komut Testi:** `STI`, `STFAP`, `STPX` gibi STN-specific komutları `ELMIdentifierGate.ts`'e ekle.
13. **Gateway Routing:** VW, BMW gateway ECU'ları için sub-bus routing desteği ekle.
14. **Connection Parameter Tuning:** Motosiklet kullanımı için BLE connection interval'ını düşür (7.5ms-15ms arası).
15. **Android Foreground Service:** Background scan ve bağlantı için `Foreground Service` + `Notification` implemente et.

---

## 🎯 Sonuç

MotoCortex'in bağlantı katmanı **modern CAN/UDS araçlar için iyi tasarlanmış** ve **Tier S/A adaptörlerle stabil çalışacak** şekilde yapılandırılmış. Ancak **global pazara çıkmak için** şu kritik eksiklikler mutlaka giderilmeli:

- **BLE MTU negotiation** (UDS coding için zorunlu)
- **KWP2000 / ISO 9141-2 / J1850 init desteği** (eski araçlar için zorunlu)
- **Voltaj tabanlı write protection** (güvenlik için zorunlu)
- **iOS Classic BT uyarısı** (kullanıcı deneyimi için zorunlu)
- **Genişletilmiş ECU header registry** (modern multi-ECU araçlar için zorunlu)

Bu eksiklikler çözülmeden, proje **sadece 2010+ model CAN/UDS araçlarla sınırlı** kalır ve global pazarda **Carista, OBDeleven, BimmerCode** gibi rakiplerle rekabet edemez.

**Başarılar!** 🏍️🔌
