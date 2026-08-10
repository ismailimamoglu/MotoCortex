# MotoCortex — Global Connectivity QA Raporu v3

**Tarih:** 10 Ağustos 2026  
**Repository:** https://github.com/ismailimamoglu/MotoCortex  
**Genel skor:** **8.0 / 10 — Strong Production Candidate**

> Not: Rapor repository kaynak kodu ve test altyapısının statik incelemesine dayanır. Gerçek araç/ECU/adaptör/telefon laboratuvar testleri yapılmış kabul edilmemelidir.

## Yönetici Özeti

MotoCortex önceki incelemeye göre önemli ölçüde gelişmiştir.

Önceki skor: **7.4/10**  
Yeni skor: **8.0/10**

En önemli gelişme CAN FD/ISO-TP parser tarafındadır. Güncel parser 128 hex karaktere / 64 byte'a kadar frame kabul edebilmekte ve CAN FD Single Frame extended-length formatını işleyebilmektedir.

Global release öncesindeki kritik konular:

1. Native Android BLE hâlâ FFE0/FFE1 ağırlıklı.
2. DoIP desteğinin gerçek ISO 13400 transport seviyesinde doğrulanması gerekiyor.
3. Native ve TypeScript transport yollarının tek canonical connectivity mimarisinde birleştirilmesi gerekiyor.

## Güncel Skor Kartı

| Alan | Skor |
|---|---:|
| Architecture | 8.2 |
| Android Classic Bluetooth | 8.3 |
| Android BLE | 7.2 |
| iOS BLE | 8.0 |
| Wi-Fi | 7.7 |
| USB | 7.5 |
| ELM327 | 7.5 |
| Clone handling | 8.0 |
| CAN | 8.3 |
| ISO-TP | 8.5 |
| K-Line | 6.8 |
| KWP | 7.5 |
| UDS | 8.0 |
| Recovery | 7.5 |
| Safety | 8.3 |
| Automated QA | 7.5 |
| CAN FD | 7.5 |
| DoIP | 4.0 |
| **Global Connectivity** | **8.0** |

## Önceki P0 Bulguları

### iOS BLE yanlış cihaz seçimi
**Durum: ÇÖZÜLDÜ.**

Target peripheral artık UUID/name doğrulamasıyla seçiliyor.

### iOS BLE UUID çeşitliliği
**Büyük ölçüde çözüldü.**

Birden fazla servis UUID'si ve generic GATT discovery mevcut. Ancak generic discovery sonrası ilk writable/notify characteristic seçimi yanlış characteristic riski taşıyor.

**Kalan severity: P1**

### CAN FD parser
**Büyük ölçüde çözüldü.**

Önceki 8-byte sınırı kaldırılmış. Parser 64 byte seviyesine kadar frame işleyebilecek uzunlukta ve CAN FD extended Single Frame formatını tanıyor.

**Parser sonucu: PASS**

Gerçek CAN FD hardware doğrulaması hâlâ gerekli.

## ISO-TP

Güncel decoder:

- Single Frame
- First Frame
- Consecutive Frame
- Flow Control
- sequence number
- multi-ECU pending buffer
- CAN FD extended Single Frame

yaklaşımını destekliyor.

**Skor: 8.5/10**

## Native C++ ISO-TP Buffer

Native ring buffer eklenmiş ve mutex protection kullanılıyor. Bu, yüksek trafik sırasında JS event-loop baskısını azaltabilecek doğru bir mimari.

Kalan risk: buffer overflow durumunda dropped frame sayısı telemetry olarak görünür değil.

Önerilen metrikler:

```text
droppedFrames
bufferOverflowCount
peakBufferUsage
```

**Severity: P1**

## Android BLE — Kritik

Native Android BLE hâlâ:

```text
FFE0 service
FFE1 characteristic
```

yaklaşımına bağlı.

Ana TypeScript BLE transportu ise daha geniş UUID ve generic discovery desteğine sahip.

Bu nedenle aynı adapter bir transport yolunda çalışıp diğerinde çalışmayabilir.

**Severity: P0**

### Android BLE write mode

Native tarafta WRITE_TYPE_NO_RESPONSE ağırlıklı kullanım bulunuyor. TypeScript tarafında response/no-response seçimi daha adaptif.

Bazı clone adapterlarda bu fark packet loss veya timeout oluşturabilir.

**Severity: P1**

### Android BLE MTU

Native tarafta yüksek MTU request ediliyor. Yaklaşım olumlu; ancak native ve TypeScript fallback davranışlarının standardize edilmesi gerekiyor.

## iOS BLE

Güçlü taraflar:

- target peripheral filtering
- UUID çeşitliliği
- generic GATT discovery
- writable characteristic discovery
- notify/indicate discovery

Kalan problem: birden fazla servis/characteristic bulunan cihazlarda ilk uygun characteristic seçilebilir.

Önerilen sıra:

```text
Known OBD Service
    ↓
Known OBD Characteristic
    ↓
Generic OBD candidate
    ↓
AT probe
    ↓
Verified OBD transport
```

**Severity: P1**

## iOS Connection Success

GATT characteristic bulunması tek başına ECU/OBD bağlantısı anlamına gelmemeli.

Önerilen state zinciri:

```text
BLE Connected
    ↓
GATT Resolved
    ↓
OBD Characteristic Verified
    ↓
AT → OK
    ↓
Adapter Identified
    ↓
ECU Probe
```

## AdapterProfileRegistry

Adapter profilleri olumlu bir gelişme.

Global ölçekte profile capability alanları eklenmeli:

```text
supportsCAN
supportsCAN29
supportsCANFD
supportsKLine
supports5BaudInit
supportsFastInit
supportsISO15765
supportsUDS
supportsFlowControl
supportsDoIP
supportsCFC
supportsATAL
supportsATH
```

**Severity: P1**

## Clone Compatibility

Tier yaklaşımı ve capability scoring güçlü.

Ancak ELM327 v1.5/v2.1 etiketi gerçek hardware'i garanti etmez. Runtime fingerprint daha güvenilir olmalıdır.

Örnek güvenli probe'lar:

```text
ATZ
ATI
AT@1
ATSP0
ATDP
ATDPN
ATCFC?
ATAL?
ATST?
ATH?
```

**Skor: 8.0/10**

## Classic Bluetooth

SPP/RFCOMM tabanlı yaklaşım güçlü.

**Skor: 8.3/10**

## USB

USB transport katmanının bulunması olumlu. Android USB OTG, permission lifecycle, unplug/reconnect ve farklı USB chipsetleri gerçek cihazlarla test edilmeli.

**Skor: 7.5/10**

## Wi-Fi

Wi-Fi transport mimarisi uygun.

Testler:

- farklı IP/port
- stale TCP
- reconnect
- Wi-Fi roaming
- phone sleep/wake
- ignition cycle

**Skor: 7.7/10**

## CAN

Classic CAN tarafı güçlü.

Test matrisi:

```text
11-bit / 500k
29-bit / 500k
11-bit / 250k
29-bit / 250k
125k
```

**Skor: 8.3/10**

## CAN FD

Parser tarafında önceki P0 büyük ölçüde kapanmıştır.

Test edilmesi gerekenler:

```text
11-bit CAN FD
29-bit CAN FD

500k arbitration
2M data
4M data
8M data

BRS ON
BRS OFF

8 / 12 / 16 / 20 / 32 / 48 / 64 byte
```

Özellikle:

```text
29-bit + 64-byte + ISO-TP
```

kritiktir.

**Skor: 7.5/10**

## K-Line / KWP

KWP checksum ve frame parsing olumlu.

Gerçek global uyumluluk için:

- 5-baud init
- fast init
- ECU wake-up
- P1/P2/P3/P4 timing
- inter-byte timing
- gerçek K-Line transceiver

testleri gerekir.

K-Line: **6.8/10**  
KWP: **7.5/10**

## UDS

Positive/negative response, NRC, ISO-TP, diagnostic session ve safety altyapısı güçlü.

Önerilen gerçek araç testleri:

```text
0x10
0x11
0x22
0x27
0x28
0x2E
0x31
0x34
0x36
0x37
0x3E
```

**Skor: 8.0/10**

## DoIP — Kritik

README'deki ISO 13400 iddiası için şu zincirin tamamı doğrulanmalı:

```text
UDP 13400
    ↓
Vehicle Discovery
    ↓
Vehicle Announcement
    ↓
TCP 13400
    ↓
Routing Activation
    ↓
Diagnostic Message
    ↓
UDS
    ↓
Alive Check
    ↓
Recovery
```

Production seviyesinde gerçek DoIP transport implementation ve integration testleri gösterilmeden tam destek kabul edilmemeli.

**Severity: P0/P1**  
**Skor: 4.0/10**

## Recovery

Reconnect ve recovery mekanizmaları iyileşmiş durumda.

Race testleri:

```text
Automatic reconnect
+
User disconnect
+
New connect
+
Telemetry loop
```

aynı anda çalıştırılmalı.

**Skor: 7.5/10**

## Safety

Düşük voltaj, snapshot, risk classification, hareket halinde kritik işlemlerin engellenmesi ve rollback yaklaşımı olumlu.

**Skor: 8.3/10**

## Automated QA

README 56 test suite / 401 test bildiriyor. E2E/Maestro altyapısının bulunması olumlu.

Ancak 401 otomatik test gerçek ECU/hardware testi değildir.

**Skor: 7.5/10**

## En Büyük Mimari Risk

Connectivity katmanı büyüdükçe:

```text
React Native Transport
    ├── BLE
    ├── Classic
    └── USB
          ↓
Native OBD Module
    ├── Android BLE
    ├── iOS BLE
    └── C++
          ↓
Protocol Engine
```

haline geliyor.

Canonical authority kesinleştirilmezse native ve JS davranışları ayrışabilir.

## Önerilen Nihai Mimari

```text
MotoCortex
    ↓
ConnectivityManager
    ↓
TransportAdapter
    ├── BLE
    ├── Classic
    └── Wi-Fi
    ↓
Adapter Fingerprint
    ↓
Capability Matrix
    ↓
Protocol Negotiator
    ├── OBD
    ├── UDS
    └── KWP
    ↓
ECU
```

Native platform katmanı mümkün olduğunca fiziksel transport ile sınırlı tutulmalı; capability ve protocol logic canonical ortak katmanda yönetilmelidir.

## Global QA Lab Matrisi

### Adapter

**Tier 1**
- OBDLink MX+
- OBDLink EX
- vLinker MC+
- UniCarScan
- STN2120

**Tier 2**
- Genuine ELM327
- PIC18F25K80 v1.5
- kaliteli v1.5 clone

**Tier 3**
- 5–10 farklı ELM327 v2.1
- BK3231
- APM32
- generic BLE ELM
- generic Wi-Fi ELM

### Android

- Samsung
- Google Pixel
- Xiaomi
- OnePlus
- Motorola

### iOS

- iPhone 11+
- güncel iOS sürümleri

### Protokoller

CAN:
- 11-bit
- 29-bit
- 125k
- 250k
- 500k

K-Line:
- ISO 9141-2
- ISO 14230-4
- 5-baud
- fast init

CAN FD:
- 11-bit
- 29-bit
- 8–64 byte
- BRS ON/OFF
- 2–8 Mbps

## Connection Acceptance Criteria

Sadece Bluetooth Connected başarı sayılmamalı.

```text
Adapter Connected
    ↓
Adapter Identified
    ↓
Capability Detected
    ↓
Protocol Detected
    ↓
ECU Responding
    ↓
0100 Successful
    ↓
VIN / ECU ID Successful
    ↓
DTC Query Successful
    ↓
Telemetry Stable
```

Bu zincirin tamamı başarılı olduğunda ECU CONNECTED durumu verilmesi daha doğru olur.

## Global KPI Hedefleri

| KPI | Hedef |
|---|---:|
| Connection success | ≥98% |
| First command success | ≥99% |
| 0100 success | ≥98% |
| VIN success | ≥97% |
| 30 dk telemetry continuity | ≥99% |
| Reconnect success | ≥95% |
| Supported clone success | ≥95% |
| K-Line capable adapter success | ≥95% |

## Yeni P0 Listesi

### P0-1 — Android Native BLE
FFE0/FFE1 hardcode yaklaşımı canonical BLE discovery ile aynı seviyeye getirilmeli.

### P0-2 — DoIP
Gerçek ISO 13400 transport implementation ve integration testleri doğrulanmalı.

### P0-3 — Production Transport Authority
Android/iOS production connectivity için native ve JS transportların hangisinin canonical olduğu kesinleştirilmeli.

## Yeni P1 Listesi

1. iOS generic characteristic selection.
2. Android BLE write-with-response fallback.
3. Adapter capability matrix.
4. Runtime adapter fingerprint.
5. CAN FD hardware validation.
6. Native ring-buffer overflow telemetry.
7. K-Line real hardware timing tests.
8. UDS Tester Present/session lifetime.
9. Reconnect race tests.
10. Multi-ECU CAN FD field tests.

## Nihai Değerlendirme

MotoCortex:

# **8.0 / 10 — Strong Production Candidate**

seviyesindedir.

Önceki rapordaki CAN FD P0 problemi önemli ölçüde giderilmiş, ISO-TP tarafı güçlü hale gelmiştir.

Global release öncesi öncelik:

```text
1. Android Native BLE unification
2. Production Transport Authority
3. DoIP gerçek implementation/validation
4. K-Line hardware lab
5. CAN FD hardware lab
6. Clone adapter lab
7. Real vehicle matrix
8. Long-duration telemetry tests
```

Bu maddeler kapatıldığında 8.2–8.5/10 Global Connectivity Ready seviyesine ulaşmak gerçekçi görünmektedir.

## Kaynak

https://github.com/ismailimamoglu/MotoCortex
