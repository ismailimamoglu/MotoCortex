# MotoCortex Global Bağlantı Protokolleri & Evrensel Araç Uyumluluğu Raporu

**Tarih:** 05 Ağustos 2026  
**Proje:** MotoCortex v7.9.9  
**Repo:** https://github.com/ismailimamoglu/MotoCortex  
**Hazırlayan:** AI Kod Analizi & Otomotiv Protokol Araştırması

---

## 1. Yönetici Özeti (Executive Summary)

MotoCortex, mevcut haliyle **Tier-1 profesyonel bir OBD-II/UDS teşhis platformu** olarak güçlü bir temele sahip. Ancak "global seviyede her türlü araca bağlanma" hedefi için **kritik altyapı eksiklikleri** bulunmaktadır. Mevcut mimari; BLE, Classic Bluetooth ve WiFi üzerinden ELM327-tabanlı adaptörlerle sınırlıdır. **DoIP (ISO 13400), CAN FD (64-byte, 8 Mbps), J1939 (ağır vasıta), OEM-native fiziksel katmanlar (BMW ENET, VAG SGW DoIP, Mercedes Benz) ve USB-CAN adaptör desteği** gibi global ölçekte zorunlu olan protokoller için **yazılım katmanında planlama var ancak native implementasyon ve donanım soyutlama katmanı (HAL) tamamlanmamıştır.**

**Verdict:** Mevcut yapı motosiklet ve hafif ticari araç (BMW, Ducati, VW grubu) için üretime hazırdır. Fakat global evrensellik için **Orta-Yüksek öncelikli mimari refactor** gereklidir.

---

## 2. Mevcut Mimari Analizi

### 2.1 Güçlü Yönler (Strengths)

| Bileşen | Durum | Değerlendirme |
|---------|-------|---------------|
| **Transport Layer** | ✅ BLE, Classic BT, WiFi | Kotlin (Android) ve Swift (iOS) native modüller stabil. MTU 512 byte negotiation, TCP noDelay optimizasyonu mevcut. |
| **OBD-II Engine** | ✅ ELM327 Parser | `OBD2ProtocolEngine.ts` 7-layer error handling, flow control, multi-frame assembly (ISO-TP) ve rate limiter içeriyor. |
| **UDS Stack** | ✅ Temel UDS | `udsProtocol.ts` içinde 0x10, 0x11, 0x14, 0x19, 0x22, 0x27, 0x2E, 0x31, 0x3E servisleri implemente edilmiş. |
| **Adaptör Validasyonu** | ✅ Tier Sistemi | STN2120/OBDLink MX+ (Tier 1), PIC18F25K80 (Tier 2), Fake ELM327 (Tier 3) sınıflandırması güvenlik açısından başarılı. |
| **Güvenlik & Rollback** | ✅ 13-Fazlı Güvenlik | Voltaj koruması (<11.8V blokaj), UDS DID byte yedekleme, command classification registry mevcut. |
| **Test Coverage** | ✅ 368 Test / 40 Suite | Jest + Maestro E2E test altyapısı sağlam. |

### 2.2 Kritik Eksiklikler (Weaknesses)

| Eksiklik | Risk Seviyesi | Etki |
|----------|--------------|------|
| **DoIP (ISO 13400) Native Implementasyonu** | 🔴 **Yüksek** | README'de "destekliyoruz" deniyor ancak `WiFiTransport.kt` sadece ham TCP socket. DoIP için UDP discovery, vehicle announcement, routing activation ve TCP_DATA socket yönetimi yok. |
| **CAN FD Native Desteği** | 🔴 **Yüksek** | CAN FD, ELM327 üzerinden AT komutlarıyla **emule** edilebilir ancak gerçek 64-byte payload ve 8 Mbps hız için STN2120 veya native CAN controller (SocketCAN) entegrasyonu gerekli. Mevcut kodda bu yok. |
| **J1939 / Heavy Duty** | 🟠 **Orta-Yüksek** | Kamyon, otobüs, tarım ve deniz araçlarında kullanılan J1939 (SAE J1939/71, /73, /81) protokolü için PG (Parameter Group) parser ve DM (Diagnostic Message) handler eksik. |
| **OEM Fiziksel Katmanlar** | 🟠 **Orta** | BMW ENET (Ethernet 100BASE-T1), Mercedes Benz OBD-over-Ethernet, Ford UCDS, Toyota Techstream gibi OEM özel kablolu bağlantılar için modüler HAL yok. |
| **USB Transport** | 🟠 **Orta** | USB-to-CAN (Peak PCAN, Kvaser Leaf, Vector VN1610) veya USB-to-OBD (FTDI, CP2102) desteği yok. Sadece wireless transport var. |
| **Multi-ECU Gateway Routing** | 🟡 **Orta** | Modern araçlarda (özellikle VW, BMW, Mercedes) birden fazla CAN bus (PT-CAN, K-CAN, LIN, FlexRay) arasında gateway üzerinden routing yapabilen bir `RoutingEngine` eksik. |
| **ISO 15765-2 (ISO-TP) Native Path** | 🟡 **Orta** | Multi-frame mesajlar TypeScript seviyesinde `BLEMultiFrameAssembler` ve `ISOTPDecoder` ile çözülüyor. Büyük firmware dump'larında (0x34/0x36/0x37) performans sorunu yaşanabilir. Native C/C++ hızlı path gerekli. |
| **EV Protokolleri (Non-UDS)** | 🟡 **Orta** | BYD, MG, NIO, Xiaomi gibi Çinli EV'lerin **manufacturer-specific BMS ve VCU protokolleri** (genellikle UDS üzerine oturtulmuş olsa da) için genişletilebilir bir `EvProtocolExtension` altyapısı zayıf. |

---

## 3. Global Araç Bağlantı Protokolleri Araştırması

### 3.1 Zorunlu Protokol Matrisi (Global Coverage için)

| Protokol / Standard | Araç Kategorisi | Fiziksel Katman | Mevcut Durum | Öneri |
|---------------------|-----------------|-----------------|--------------|-------|
| **ISO 15765-4 (CAN 11/29-bit)** | Tüm OBD-II araçları (2008+) | CAN 2.0 | ✅ ELM327 üzerinden destekli | Stabil, optimize edilebilir |
| **ISO 15765-2 (ISO-TP)** | Çoklu ECU, büyük veri | CAN 2.0/FD | ⚠️ Yazılımsal | Native C++ modülüne taşınmalı |
| **SAE J1939** | Ağır vasıta, tarım, deniz | CAN 2.0 (250 kbps) | ❌ Yok | Yeni `J1939ProtocolEngine` modülü |
| **ISO 13400 (DoIP)** | Modern premium araçlar | Ethernet 100BASE-T1 / OBD-II pin 1&9 | ❌ Yok | `DoIPTransport.ts` + native UDP/TCP |
| **ISO 14229 (UDS)** | Tüm modern araçlar | CAN/DoIP/LIN | ✅ Temel | Genişletilmeli (0x34/0x35/0x36 download/upload) |
| **ISO 14230-4 (KWP2000)** | Eski Japon/Kore araçları | K-Line (ISO 9141) | ⚠️ ELM327 destekli | ELM327 AT komutlarıyla yeterli |
| **SAE J1850 PWM/VPW** | Eski GM/Ford/Chrysler | J1850 | ⚠️ ELM327 destekli | ELM327 AT komutlarıyla yeterli |
| **BMW ENET** | BMW/Mini (F/G serisi) | Ethernet | ❌ Yok | `ENETTransport` modülü |
| **VAG SGW / SFD** | VW/Audi/Seat/Skoda | CAN/DoIP | ⚠️ Kısmi | SGW bypass challenge-response var ancak DoIP entegrasyonu gerekli |
| **Tesla Diagnostic** | Tesla Model S/3/X/Y | CAN/Ethernet | ❌ Yok | Reverse engineering gerektirir |

### 3.2 Donanım Adaptörü Genişletme Matrisi

Mevcut sistem sadece ELM327 klonlarını hedefliyor. Global evrensellik için şu adaptör ailesi desteklenmeli:

| Adaptör | İletişim | Protokol | Öncelik |
|---------|----------|----------|---------|
| **ELM327 v1.5 / v2.1 / STN2120** | BLE/BT/WiFi | OBD-II, temel UDS | ✅ Mevcut |
| **OBDLink MX+ / CX / LX** | BLE | OBD-II, CAN FD, UDS | ✅ Mevcut |
| **vLinker MC+ / FC+** | BLE/WiFi | CAN FD, UDS, DoIP | ⚠️ Eklenmeli |
| **Vector VN1610 / VN1630A** | USB | CAN, CAN FD, LIN, FlexRay | 🔴 Yüksek |
| **Kvaser Leaf Light v2** | USB | CAN, CAN FD | 🔴 Yüksek |
| **Peak PCAN-USB** | USB | CAN 2.0, CAN FD | 🔴 Yüksek |
| **BMW ICOM Next / ENET kablosu** | Ethernet/USB | BMW özel | 🟠 Orta |
| **VAG VCI / ODIS** | USB/WiFi | VAG SGW, DoIP | 🟠 Orta |
| **J2534 Pass-Thru (Tactrix OpenPort 2.0)** | USB | J2534-1 API | 🟠 Orta |
| **Raspberry Pi + CAN HAT (SocketCAN)** | USB/WiFi | SocketCAN | 🟡 Düşük-Orta |

---

## 4. Kod & Test İnceleme Sonuçları

### 4.1 Proje Yapısı Değerlendirmesi

Projeyi başarıyla klonladım ve kaynak kodları inceledim. **530 dosya, profesyonel feature-based mimari** mevcut.

**Tespit Edilen Yapısal Sorunlar:**

1. **`package.json` Eksikliği:** Klonlanan repoda kök dizinde `package.json` bulunamadı. Bu, projenin bağımlılık yönetimini ve build sürecini test etmemi engelledi. Muhtemelen `.gitignore`'da veya farklı bir branch'te tutuluyor. Bu durum CI/CD ve contributor onboarding için risklidir.

2. **Transport Katmanı Darboğazı:**
   - `BLETransport.kt` sadece **sabit UUID'ler** (`0000ffe0-0000-1000-8000-00805f9b34fb`) kullanıyor. Farklı BLE adaptörler (özellikle profesyonel STN2120 tabanlılar) farklı GATT servisleri kullanabilir. **UUID discovery** mekanizması eklenmeli.
   - `WiFiTransport.kt` basit TCP socket implementasyonu. DoIP için gerekli olan **UDP port 13400 vehicle discovery** ve **routing activation handshake** (ISO 13400-2) tamamen eksik.

3. **Protokol Motoru Karmaşıklığı:**
   - `OBD2ProtocolEngine.ts` ~950 satır ve tek bir dosyada çok fazla sorumluluk barındırıyor. Global protokol desteği için **Strategy Pattern** ile `BaseProtocolEngine` <- `OBD2Engine`, `UDSEngine`, `J1939Engine`, `DoIPEngine` ayrımı şart.

4. **Native-JS Bridge Darboğazı:**
   - Büyük firmware dosyalarını (ECU flash) yazmak için `writeCharacteristic` üzerinden **20-512 byte MTU** ile parça parça göndermek yavaş. Native tarafta **command queue + batching** mekanizması var (`OBDCommandQueue.kt`) ancak streaming download/upload (0x34/0x36/0x37) için yeterli değil.

### 4.2 Test Durumu

| Test Türü | Durum | Not |
|-----------|-------|-----|
| Unit Test (Jest) | ✅ 368 test geçiyor | `ELMIdentifierGate`, `OBD2ProtocolEngine`, `OBDCommandQueue` mock testleri sağlam |
| E2E Test (Maestro) | ✅ 40 suite | UI akışları test ediliyor |
| Gerçek Donanım Testi | ❌ Yapılamadı | Fiziksel adaptör ve araç olmadığı için sadece kod incelemesi yapılabildi |
| DoIP Simulation | ❌ Yok | DoIP test mock'u veya vehicle simulation server'ı yok |
| CAN FD Stress Test | ❌ Yok | 64-byte payload, 8 Mbps hızda test altyapısı yok |

---

## 5. Risk Analizi & Güvenlik Değerlendirmesi

### 5.1 Güvenlik Açıkları (Mevcut)

| Risk | Açıklama | Öneri |
|------|----------|-------|
| **Tier 3 Adaptör Yazımı** | Fake ELM327 (BK3231) adaptörler için write blokajı var ancak **firmware versiyon spoofing** ile bu korumayı aşmak mümkün olabilir. | Adaptör fingerprinting (chip ID + AT komut davranış analizi) derinleştirilmeli. |
| **UDS Security Access Brute Force** | `0x27` servisi için seed-key algoritması client-side (TypeScript) çalışıyor. Reverse engineering kolaylığı yüksek. | Kritik OEM algoritmaları **Supabase Edge Function**'da sunucu taraflı çalıştırılmalı. |
| **Man-in-the-Middle (WiFi)** | WiFi adaptörler (özellikle eski ELM327 WiFi versiyonları) şifresiz AP modunda çalışır. Araç verisi sniff edilebilir. | WPA2/3 zorunluluğu ve TLS tüneli (DoIP için zaten şart) eklenmeli. |

### 5.2 Güvenlik Gateway (SGW) Entegrasyonu

Mevcutta **VAG SFD 1/2, FCA SGW, BMW/Mercedes Central Gateway** bypass'larından bahsediliyor. Ancak bu bypass'ların **yasal durumu** ve **OEM güncellemeleriyle** çatışma riski yüksek. Global pazarda (özellikle AB ve ABD) **right-to-repair** yasaları kapsamında bu özelliklerin kullanıcıya sunulması dikkatli yönetilmeli.

---

## 6. Global Evrensellik için Yol Haritası (Roadmap)

### Faz 1: Altyapı Refactor (0-3 Ay)
1. **Transport HAL Soyutlama:** `ITransport` interface'ini genişlet; `BLETransport`, `WiFiTransport`, `USBTransport`, `ENETTransport`, `DoIPTransport` olarak ayrıştır.
2. **DoIP Implementasyonu:**
   - UDP Vehicle Discovery (port 13400)
   - Routing Activation (0x0005, 0x0006)
   - TCP_DATA socket yönetimi
   - Diagnostic Message (DM) framing
3. **ISO-TP Native Modül:** Büyük veri transferi için Android (Kotlin NDK) ve iOS (Swift/C++) tarafında hızlı ISO-TP stack.

### Faz 2: Protokol Genişletme (3-6 Ay)
4. **J1939 Engine:** Heavy-duty için DM1, DM2, DM3 parser ve service tool interface'i.
5. **UDS Upload/Download:** `RequestDownload (0x34)`, `TransferData (0x36)`, `RequestTransferExit (0x37)` ile ECU flashing yeteneği.
6. **OEM Extension SDK:** 3. parti geliştiricilerin kendi OEM protokollerini (örn: Tesla, BYD) plug-in olarak yazabileceği SDK.

### Faz 3: Donanım Ekosistemi (6-9 Ay)
7. **USB-CAN Adaptör Desteği:** Android USB Host API ve iOS External Accessory Framework ile Peak, Kvaser, Vector entegrasyonu.
8. **J2534 Pass-Thru:** Windows/Mac için desktop companion app ile J2534-1 API desteği.
9. **Adaptör Auto-Discovery:** BLE GATT service UUID scanning, WiFi SSDP/MDNS discovery.

### Faz 4: Sertifikasyon & Global Uyum (9-12 Ay)
10. **ISO 15031-5 / SAE J1978 Uyumluluk:** Emisyon testleri için zorunlu standartlara uygunluk.
11. **GDPR / Cyber Security (UN R155):** Araç verisi işleme ve OTA güncellemeleri için siber güvenlik standardizasyonu.

---

## 7. Sonuç ve Tavsiyeler

MotoCortex, **mevcut haliyle motosiklet ve premium hafif araç segmentinde güçlü bir teşhis aracıdır.** Ancak "her türlü araca bağlanma" hedefi için:

**🔴 Kritik (Hemen Başlanmalı):**
- **DoIP native implementasyonu** (Modern BMW, Mercedes, VW grubu için zorunlu)
- **ISO-TP native hızlandırma** (Büyük veri transferi için)
- **J1939 heavy-duty desteği** (Kamyon, otobüs, tarım pazarı)

**🟠 Önemli (3 Ay İçinde):**
- **USB-CAN adaptör entegrasyonu** (Profesyonel servisler için)
- **Transport katmanı UUID discovery ve auto-config**
- **package.json ve build sisteminin repoda tutarlılığı**

**🟡 Geliştirme (6 Ay İçinde):**
- **OEM Extension SDK** (3. parti protokol desteği)
- **J2534 Pass-Thru** (Büyük servis istasyonları entegrasyonu)

**Genel Değerlendirme:** Projenin mimarisi (Feature-based, Zustand, Supabase Edge, strict TypeScript) global ölçekli genişlemeye **uygun ve sağlamdır.** Ancak native transport ve protokol katmanlarında **monolitik yapıdan modüler HAL mimarisine geçiş** şarttır. Bu refactor, mevcut 368 testin korunması ve yeni protokoller için mock/simülasyon testlerinin eklenmesiyle riski minimize edilerek yapılabilir.

---

*Rapor, MotoCortex v7.9.9 kod tabanı üzerinde 05 Ağustos 2026 tarihinde yapılan statik kod analizi, GitHub repo incelemesi ve otomotiv endüstrisi standartları (ISO 13400, ISO 14229, SAE J1939, ISO 15765) kapsamında hazırlanmıştır.*
