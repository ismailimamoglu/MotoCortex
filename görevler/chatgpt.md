# MotoCortex Global OBD2 Bağlantı ve Protokol Uyumluluk Raporu

## 1. Mimariyi doğru ayırmak

OBD2 bağlantısı tek bir protokol değildir. Global seviyede stabil bir uygulama için telefon ↔ adaptör kablosuz taşıma katmanı ile adaptör ↔ araç haberleşme protokolü birbirinden ayrılmalıdır.

```text
┌──────────────────────────────┐
│          MotoCortex          │
│ React Native / Native Core   │
└──────────────┬───────────────┘
               │
        Wi-Fi / Bluetooth
               │
┌──────────────▼───────────────┐
│       OBD Adapter             │
│ ELM327 / STN / proprietary    │
└──────────────┬───────────────┘
               │
       Vehicle Protocol
               │
┌──────────────▼───────────────┐
│            ECU/CAN            │
└──────────────────────────────┘
```

- Bluetooth/Wi-Fi = telefon ↔ adaptör
- CAN/K-Line/J1850/J1939 vb. = adaptör ↔ araç

Bu iki katmanın tek bir protokol gibi ele alınması bağlantı sorunlarına yol açabilir.

---

# 2. Binek ve hafif ticari araç protokolleri

MotoCortex'un desteklemesi gereken temel OBD-II protokolleri:

| Protokol | Açılım | Kullanım | Öncelik |
|---|---|---|---|
| ISO 15765-4 CAN 11-bit 500k | CAN | Modern araçlar | 🔴 Kritik |
| ISO 15765-4 CAN 11-bit 250k | CAN | Bazı araçlar | 🔴 Kritik |
| ISO 15765-4 CAN 29-bit 500k | CAN | Modern araçlar | 🔴 Kritik |
| ISO 15765-4 CAN 29-bit 250k | CAN | Bazı araçlar | 🔴 Kritik |
| ISO 14230-4 KWP2000 | K-Line | Eski Avrupa/Asya | 🔴 Kritik |
| ISO 14230-4 KWP 5-baud init | K-Line | Eski araçlar | 🔴 Kritik |
| ISO 9141-2 | K-Line | Eski Avrupa/Asya | 🔴 Kritik |
| SAE J1850 PWM | Ford | Eski Ford | 🟠 Önemli |
| SAE J1850 VPW | GM | Eski GM | 🟠 Önemli |

Klasik OBD-II dünyasında J1850 PWM, J1850 VPW, ISO 9141-2, ISO 14230-4 ve ISO 15765-4 CAN temel protokol aileleridir.

---

# 3. CAN desteğini geniş tutmak

Sadece ISO 15765-4 desteği yeterli değildir.

En azından:

```text
CAN 11-bit / 500 kbps
CAN 11-bit / 250 kbps
CAN 29-bit / 500 kbps
CAN 29-bit / 250 kbps
```

desteklenmelidir.

CAN bağlantısında aşağıdaki faktörler birlikte değerlendirilmelidir:

```text
CAN bitrate
+
CAN ID type
+
request/response addressing
+
ISO-TP
+
ECU addressing
```

---

# 4. ISO-TP / ISO 15765-2

CAN = OBD değildir.

Doğru mimari:

```text
CAN
 ↓
ISO 15765-2 / ISO-TP
 ↓
Diagnostic message
 ↓
UDS / OBD services
```

ISO-TP tarafında:

```text
Single Frame
First Frame
Consecutive Frame
Flow Control
```

mutlaka doğru uygulanmalıdır.

VIN, uzun DTC listeleri, ECU bilgileri ve UDS işlemlerinde multi-frame desteği kritik önem taşır.

---

# 5. UDS desteği

Global seviyeye çıkmak için yalnızca klasik OBD Mode 01/03/04 mantığında kalınmamalıdır.

Mimari:

```text
OBD-II
UDS
J1939
```

şeklinde ayrılmalıdır.

ISO 14229 tabanlı UDS için temel servisler:

```text
0x10 Diagnostic Session Control
0x11 ECU Reset
0x14 Clear Diagnostic Information
0x19 Read DTC Information
0x22 Read Data By Identifier
0x23 Read Memory By Address
0x27 Security Access
0x2E Write Data By Identifier
0x31 Routine Control
0x3E Tester Present
0x85 Control DTC Setting
```

Okuma desteği ile ECU coding/programming aynı güvenlik seviyesinde ele alınmamalıdır.

---

# 6. K-Line desteği

Özellikle eski Avrupa ve Asya araçları için:

```text
ISO 9141-2
ISO 14230-4
```

desteklenmelidir.

Ayrıca:

```text
5-baud initialization
fast initialization
10.4 kbaud
```

durumları yönetilmelidir.

Önerilen keşif yaklaşımı:

```text
ATSP0
 ↓
CAN?
 ↓
KWP?
 ↓
ISO9141?
 ↓
5-baud init
 ↓
Fast init
```

Ancak kör protokol taraması yerine adaptif discovery state machine kullanılmalıdır.

---

# 7. SAE J1850

Eski araçlar için:

```text
SAE J1850 PWM
SAE J1850 VPW
```

desteği korunmalıdır.

Özellikle eski Ford ve GM araçları için önemlidir.

---

# 8. Ağır vasıta tarafı

Kamyon ve ağır ticari araçlarda temel genişleme alanı:

# SAE J1939

J1939, ağır vasıta ve off-highway araçlar için kritik bir protokol ailesidir.

J1939'u OBD-II ile aynı protokol olarak düşünmeyin. Ayrı bir protocol stack oluşturulmalıdır.

---

# 9. J1939 ailesi

MotoCortex için aşağıdaki standartlar dikkate alınmalıdır:

```text
J1939-11
J1939-13
J1939-14
J1939-15
J1939-21
J1939-31
J1939-71
J1939-73
J1939-74
J1939-75
J1939-81
```

Özellikle:

- J1939-21 → Data Link Layer
- J1939-71 → Vehicle Application Layer
- J1939-73 → Diagnostics
- J1939-81 → Network Management
- J1939-13 → Diagnostic connector

J1939-84 ise ağır vasıta ECU'larının diagnostik iletişim uyumluluğu için önemlidir.

---

# 10. J1939 250/500 kbps

Adaptör tarafında:

```text
J1939 250 kbps
J1939 500 kbps
```

desteklenmesi önerilir.

---

# 11. J1939 mesaj yapısı

J1939'da yalnızca PID mantığı kullanılmamalıdır.

Mimari:

```text
29-bit CAN ID
       ↓
Priority
Reserved
Data Page
PDU Format
PDU Specific
Source Address
       ↓
PGN
       ↓
SPN
       ↓
Value
```

MotoCortex için ileride:

```text
PGN database
SPN database
DM1
DM2
DM3
DM11
```

gibi diagnostik yapılar ayrı modül olmalıdır.

---

# 12. Motosikletler

Her motosiklet otomobil gibi generic OBD-II davranmaz.

Bazı motosikletlerde:

```text
ISO 15765 CAN
```

kullanılır.

Bazılarında:

```text
CAN
K-Line
UART
proprietary diagnostic protocol
```

gibi üreticiye özgü yaklaşımlar bulunabilir.

Bu nedenle motosiklet modu:

```text
Motorcycle
 ├── Generic OBD-II
 ├── CAN
 ├── K-Line
 └── Manufacturer-specific
```

şeklinde tasarlanmalıdır.

---

# 13. Bluetooth Classic

Bluetooth Classic desteklenmelidir.

Yaygın yapı:

```text
Bluetooth Classic
 └── RFCOMM
      └── SPP
           └── ELM327
```

Android tarafında özellikle önemlidir.

---

# 14. Bluetooth BLE

Bluetooth Low Energy desteği iOS uyumluluğu için kritik önemdedir.

BLE akışı:

```text
SCAN
 ↓
DEVICE DISCOVERED
 ↓
CONNECT
 ↓
MTU negotiation
 ↓
SERVICE DISCOVERY
 ↓
CHARACTERISTIC DISCOVERY
 ↓
WRITE characteristic
 ↓
NOTIFY/INDICATE characteristic
 ↓
Handshake
 ↓
Adapter ready
 ↓
ECU protocol detection
```

Farklı BLE OBD adaptörlerinin UUID ve characteristic yapıları farklı olabileceğinden profil tabanlı BLE adapter registry oluşturulmalıdır.

---

# 15. Wi-Fi OBD

Wi-Fi adaptörlerde tipik yapı:

```text
Phone
 ↓
Wi-Fi
 ↓
OBD Adapter
 ↓
TCP socket
 ↓
ELM327 protocol
```

Adapter üzerinde IP + TCP port bulunur.

Bunları tamamen hard-code etmek yerine:

```text
AdapterDiscovery
     ↓
Known IP candidates
     ↓
TCP probe
     ↓
ELM327 handshake
```

yaklaşımı uygulanmalıdır.

---

# 16. Wi-Fi bağlantısı ≠ OBD bağlantısı

Aşağıdaki durumlar ayrı tutulmalıdır:

```text
wifiConnected
tcpConnected
adapterResponsive
elmReady
vehicleBusDetected
ecuResponsive
```

Böylece fiziksel bağlantı mevcutken uygulamanın yanlışlıkla "not connected" göstermesi engellenir.

---

# 17. Önerilen bağlantı state machine

```text
                    ┌─────────────┐
                    │ DISCONNECTED│
                    └──────┬──────┘
                           │
                           ▼
                    TRANSPORT_SCAN
                           │
                           ▼
                    TRANSPORT_FOUND
                           │
                           ▼
                    TRANSPORT_CONNECT
                           │
                           ▼
                    TRANSPORT_READY
                           │
                           ▼
                    ADAPTER_HANDSHAKE
                           │
                           ▼
                    ADAPTER_READY
                           │
                           ▼
                    PROTOCOL_DISCOVERY
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
            CAN          K-LINE          J1850
             │             │              │
             └─────────────┼──────────────┘
                           ▼
                    ECU_SESSION_READY
                           │
                           ▼
                    DIAGNOSTIC_READY
```

---

# 18. Wi-Fi + Bluetooth ortak abstraction

Üst katmanın transport tipini bilmemesi gerekir.

Önerilen interface:

```typescript
interface ObdTransport {
  scan(): Promise<Device[]>;
  connect(device: Device): Promise<void>;
  disconnect(): Promise<void>;

  write(data: Uint8Array): Promise<void>;

  onData(callback: DataCallback): Unsubscribe;

  getState(): TransportState;
}
```

Implementasyon:

```text
ObdTransport
│
├── BluetoothClassicTransport
├── BluetoothBleTransport
└── WifiTcpTransport
```

---

# 19. Adapter abstraction

Bir katman daha eklenmelidir:

```text
Transport
     ↓
Adapter Protocol
     ↓
Vehicle Protocol
```

Örneğin:

```text
WiFi
 ↓
ELM327
 ↓
ISO15765
```

ve:

```text
BLE
 ↓
STN
 ↓
J1939
```

aynı diagnostic engine tarafından kullanılabilmelidir.

---

# 20. ELM327 compatibility

ELM327 için initialization komutları:

```text
ATZ
ATE0
ATL0
ATS0
ATH0
ATSP0
```

gibi komutları içerir.

Ancak her bağlantıda körlemesine aynı handshake uygulanmamalıdır.

Özellikle:

```text
ATZ
```

adaptörü resetlediği için bağlantı akışının ortasında tekrar çağrılması sorun çıkarabilir.

MotoCortex'ta daha önce karşılaşılan:

```text
duplicate ATZ
double connect
transport race
```

problemleri bu nedenle önemlidir.

---

# 21. Adapter fingerprint sistemi

Bağlantı sırasında güvenli identification bilgileri alınabilir:

```text
ATZ
ATI
AT@1
ATDP
ATDPN
ATST
```

Sonra:

```text
AdapterFingerprint
```

oluşturulabilir:

```json
{
  "manufacturer": "...",
  "firmware": "...",
  "protocol": "...",
  "transport": "BLE",
  "elmVersion": "...",
  "capabilities": []
}
```

Bu bilgiler cache'lenebilir.

---

# 22. Cheap clone detection

Piyasadaki:

```text
ELM327 v1.5
ELM327 v2.1
```

etiketleri tek başına güvenilir kalite göstergesi değildir.

MotoCortex için:

```text
Adapter Quality Score
```

oluşturulması önerilir.

Ölçülebilecek metrikler:

```text
Protocol response
CAN stability
Latency
Dropped frames
Command timeout
Firmware response
K-Line support
J1939 support
```

Sonuç:

```text
Excellent
Good
Limited
Unreliable
Unsupported
```

şeklinde sınıflandırılabilir.

---

# 23. OBDLink seviyesindeki yaklaşım

Global uygulama mimarisinde transport ile araç protokolü birbirinden ayrılmalıdır.

Örneğin:

```text
ISO 15765
ISO 14230
ISO 9141
J1850 PWM
J1850 VPW
MS-CAN
SW-CAN
```

gibi araç tarafı protokolleri ayrı ele alınırken:

```text
Bluetooth Classic
BLE
Wi-Fi
USB
```

gibi transport seçenekleri ayrı tutulmalıdır.

---

# 24. Ford MS-CAN

İleri seviye destek için:

```text
Ford MS-CAN
```

eklenebilir.

Bu, generic OBD-II CAN ile aynı şey değildir.

Bu nedenle:

```text
CAN
├── HS-CAN
├── MS-CAN
├── SW-CAN
└── J1939
```

şeklinde modellenmesi daha doğrudur.

---

# 25. GM SW-CAN

Benzer şekilde:

```text
GM Single-Wire CAN
```

desteği gelecekte eklenebilir.

Bu da generic OBD-II CAN'dan ayrı bir protokol/physical-layer extension olarak değerlendirilmelidir.

---

# 26. Ağır vasıta için ayrı engine

MotoCortex'u şu yapıya taşımak idealdir:

```text
MotoCortex Diagnostic Core

├── OBD-II Engine
├── CAN Engine
├── ISO-TP Engine
├── K-Line Engine
├── J1850 Engine
├── UDS Engine
├── J1939 Engine
└── Manufacturer Extensions
```

---

# 27. Global bağlantı matrisi

| Araç | Protokol | Hedef |
|---|---|---|
| Modern otomobil | CAN 11/500 | ✅ |
| Modern otomobil | CAN 11/250 | ✅ |
| Modern otomobil | CAN 29/500 | ✅ |
| Modern otomobil | CAN 29/250 | ✅ |
| Eski Avrupa | ISO9141 | ✅ |
| Eski Avrupa | KWP2000 | ✅ |
| Eski Japon | ISO9141 | ✅ |
| Eski Ford | J1850 PWM | ✅ |
| Eski GM | J1850 VPW | ✅ |
| Ford | MS-CAN | 🟠 |
| GM | SW-CAN | 🟠 |
| Kamyon | J1939 250k | 🔴 |
| Kamyon | J1939 500k | 🔴 |
| Ağır vasıta | J1939 diagnostics | 🔴 |
| Motosiklet | CAN | 🔴 |
| Motosiklet | K-Line | 🟠 |
| Proprietary motorcycle | OEM | 🔵 Gelecek |
| UDS | ISO 14229 | 🔴 |
| ISO-TP | ISO15765-2 | 🔴 |

---

# 28. Kablosuz bağlantı matrisi

| Transport | Android | iOS | Öncelik |
|---|---:|---:|---|
| Bluetooth Classic SPP | ✅ | ❌/çok sınırlı | 🔴 |
| Bluetooth BLE | ✅ | ✅ | 🔴 |
| Wi-Fi TCP | ✅ | ✅ | 🔴 |
| USB | ✅ | sınırlı | 🟠 |

Önerilen platform kapsamı:

```text
Android:
Classic + BLE + WiFi

iOS:
BLE + WiFi
```

---

# 29. Queue mimarisi

Bağlantı stabilitesi için aynı anda birden fazla OBD komutu gönderilmemelidir.

Yanlış:

```typescript
Promise.all([
  sendCommand("010C"),
  sendCommand("010D"),
  sendCommand("0111"),
  sendCommand("0105")
])
```

Doğru:

```text
CommandQueue
     │
     ├── 010C
     │
     ├── wait response
     │
     ├── 010D
     │
     ├── wait response
     │
     └── 0111
```

---

# 30. Transport lock

Tek anda:

```text
ONE TX
ONE RX transaction
```

mantığı kullanılmalıdır.

Örneğin:

```typescript
isTransportBusy
```

ile transport yarışları engellenebilir.

Özellikle:

```text
Telemetry
+
DTC
+
VIN
+
Coding
+
ECU scan
```

aynı anda çalıştırılmamalıdır.

---

# 31. Diagnostic priority

Önerilen queue öncelikleri:

```text
Priority 0
EMERGENCY / CONNECTION

Priority 1
USER COMMAND

Priority 2
DTC / VIN / ECU INFO

Priority 3
LIVE DATA

Priority 4
BACKGROUND
```

Kullanıcı DTC taraması başlattığında:

```text
live telemetry
      ↓
PAUSE
      ↓
diagnostic session
      ↓
DTC scan
      ↓
resume telemetry
```

uygulanmalıdır.

---

# 32. Watchdog

Global seviyede aşağıdaki değerler tutulmalıdır:

```text
lastRxTimestamp
lastSuccessfulCommand
consecutiveTimeouts
consecutiveParseErrors
transportErrors
ecuErrors
```

Örneğin:

```text
timeout 1
 ↓
retry

timeout 2
 ↓
retry

timeout 3
 ↓
protocol recovery

timeout 4
 ↓
adapter reconnect

timeout 5
 ↓
full transport reset
```

Ancak her timeout'ta ATZ gönderilmemelidir.

---

# 33. Adaptive timing

Sabit bir:

```text
100ms
```

değeri bütün araçlar için ideal değildir.

Örneğin:

```text
fast CAN ECU
slow K-Line ECU
J1939
multi-frame UDS
```

farklı davranır.

Runtime'da:

```text
RTT
ECU response time
timeout rate
```

ölçülerek:

```text
guardTime
timeout
interCommandDelay
```

adaptif hale getirilmelidir.

---

# 34. Protocol Discovery

Önerilen sistem:

```text
ProtocolDiscoveryEngine
```

Akışı:

```text
Adapter capabilities
        ↓
Vehicle profile
        ↓
Known protocol
        ↓
Fast probe
        ↓
Fallback
```

Araç tipi ve geçmiş bağlantı verisi kullanılarak keşif süresi azaltılabilir.

---

# 35. VIN tabanlı protokol öğrenme

VIN başarılı şekilde okunduğunda:

```text
VIN
 ↓
Make
 ↓
Model
 ↓
Year
 ↓
Market
 ↓
Vehicle type
 ↓
Known protocol
```

sonucu üretilebilir.

Sonraki bağlantıda:

```text
Known vehicle
 ↓
Known protocol
 ↓
Known CAN bitrate
 ↓
Known ECU address
```

ile discovery süresi azaltılabilir.

---

# 36. Adapter capability cache

Adapter ID üzerinden:

```text
supportsCAN
supportsKLine
supportsJ1939
supportsJ1850
supportsBLE
supportsWiFi
```

gibi bilgiler cache'lenebilir.

Böylece her bağlantıda bütün protokollerin taranması önlenir.

---

# 37. Önerilen MotoCortex klasör yapısı

```text
/native
   /transport
      BluetoothClassic
      BluetoothBLE
      WifiTCP

   /adapter
      ELM327
      STN
      J2534
      Generic

   /protocol
      CAN
      ISO15765
      ISO9141
      ISO14230
      J1850
      J1939

   /diagnostics
      OBD
      UDS
      J1939Diagnostics

   /vehicle
      VehicleProfile
      VINDecoder
      ECURegistry

   /recovery
      ConnectionWatchdog
      ProtocolRecovery
      AdapterRecovery
```

---

# 38. Önerilen nihai mimari

```text
                    MotoCortex
                         │
                Diagnostic Core
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    OBD-II              UDS              J1939
       │                 │                 │
       └───────────── Protocol ────────────┘
                         │
                    ISO-TP / CAN
                         │
                Adapter Abstraction
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       ELM327           STN         Proprietary
          │              │              │
          └──────────────┼──────────────┘
                         │
                 Transport Layer
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       BT Classic       BLE           WiFi
          │              │              │
          └──────────────┼──────────────┘
                         │
                    Smartphone
```

---

# 39. Geliştirme önceliği

## Faz 1 — Mutlaka

```text
Bluetooth Classic SPP
Bluetooth BLE
WiFi TCP
```

+

```text
ISO 15765-4
ISO-TP
ISO 9141-2
ISO 14230-4
J1850 PWM
J1850 VPW
```

## Faz 2

```text
UDS
11/29 bit CAN
250/500 kbps
adaptive protocol detection
```

## Faz 3

```text
J1939
250/500 kbps
PGN
SPN
DM1
DM2
```

## Faz 4

```text
Ford MS-CAN
GM SW-CAN
motorcycle manufacturer protocols
```

## Faz 5

```text
OEM-specific diagnostics
ECU coding
security access
advanced UDS
```

---

# 40. Release blocker seviyesinde 10 madde

MotoCortex bağlantı motoru için şu 10 madde release blocker olarak ele alınmalıdır:

1. **Bluetooth Classic SPP**
2. **Bluetooth BLE**
3. **Wi-Fi TCP**
4. **CAN 11/29-bit**
5. **CAN 250/500 kbps**
6. **ISO-TP multi-frame**
7. **ISO 9141 / 5-baud init**
8. **ISO 14230 KWP fast + slow init**
9. **J1939 250/500 kbps**
10. **Transport → Adapter → Protocol → ECU şeklinde dört katmanlı state machine**

Bunların üzerine:

```text
Watchdog
+
Queue
+
Transport Lock
+
Adaptive Timing
+
Protocol Discovery
+
Adapter Fingerprinting
+
Vehicle/VIN Learning
```

eklenmelidir.

---

# 41. Kritik sonuç

"Tüm protokolleri destekliyoruz" ile "tüm araçları destekliyoruz" aynı şey değildir.

Araç üreticilerinin:

- proprietary CAN/UDS adreslemeleri
- gateway'leri
- security access
- farklı ECU topolojileri
- fiziksel konektörleri
- üreticiye özel diagnostik servisleri

ayrıca ele alınmalıdır.

Bu nedenle MotoCortex'un uzun vadeli hedefi:

> **Multi-Protocol Vehicle Diagnostic Platform**

olmalıdır.

UI tarafında da:

```text
Generic OBD
Advanced Diagnostics
Heavy Duty
Motorcycle
```

gibi yetenek seviyelerini birbirinden ayırmak daha doğru olacaktır.

---

# 42. Kısa karar özeti

MotoCortex'un global bağlantı motoru için temel hedef:

```text
Phone
 │
 ├── Bluetooth Classic
 ├── Bluetooth BLE
 └── Wi-Fi TCP
 │
 ▼
Adapter Layer
 │
 ├── ELM327
 ├── STN
 └── Other adapters
 │
 ▼
Protocol Engine
 │
 ├── CAN
 ├── ISO-TP
 ├── ISO9141
 ├── ISO14230
 ├── J1850
 ├── UDS
 └── J1939
 │
 ▼
Vehicle / ECU Layer
 │
 ├── Passenger
 ├── Light Commercial
 ├── Motorcycle
 ├── Truck
 └── Heavy Duty
```

Bu mimariyle MotoCortex basit bir ELM327 uygulamasından çıkıp profesyonel, çok protokollü bir araç diagnostik platformuna dönüşebilir.
