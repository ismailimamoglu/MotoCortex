# MotoCortex Global Connectivity — Güncel QA Raporu

**Tarih:** 10 Ağustos 2026  
**Repository:** https://github.com/ismailimamoglu/MotoCortex  
**Kapsam:** Android + iOS bağlantı katmanları, BLE, Bluetooth Classic, Wi‑Fi, ELM327/clone uyumluluğu, CAN/ISO-TP, K-Line/KWP, UDS, recovery, adapter capability ve global connectivity readiness.

> **Not:** Bu rapor repository kaynak kodu ve otomatik test altyapısının statik incelemesine dayanır. Gerçek araç, ECU, adaptör ve telefon kombinasyonlarıyla fiziksel laboratuvar testi yapılmış kabul edilmemelidir.

## 1. Yönetici Özeti

MotoCortex, önceki incelemeye göre belirgin şekilde gelişmiş durumdadır. Özellikle iOS BLE hedef cihaz seçimi, BLE UUID çeşitliliği, generic GATT discovery, adapter profile yaklaşımı, clone capability scoring, ISO-TP multi-ECU handling, KWP checksum validation ve command/session yönetimi güçlendirilmiştir.

GitHub README'si şu anda 56 test suite ve 401 başarılı test bildiriyor; ayrıca BLE, Classic Bluetooth ve Wi‑Fi transportları ile CAN FD ve DoIP desteği iddia ediliyor.

### Güncel genel değerlendirme

**7.4 / 10 — Production Candidate**

MotoCortex artık ciddi bir global OBD ürününün connectivity altyapısına yaklaşmıştır. Ancak henüz **“universal / hardware-agnostic / global certification ready”** seviyesinde doğrulanmış değildir.

### En önemli kalan riskler

1. Native Android BLE ile ana TypeScript BLE transportunun farklı compatibility stratejileri.
2. CAN FD iddiası ile mevcut ISO-TP parser davranışı arasındaki çelişki.
3. DoIP desteğinin gerçek ISO 13400 transport seviyesinde doğrulanmamış olması.
4. K-Line/KWP'nin gerçek hardware ve timing testleriyle doğrulanmamış olması.
5. Native ve JS transport yollarının production'da tek bir canonical connectivity mimarisine tam olarak indirgenmesi gereği.

## 2. Güncel Skor Kartı

| Alan | Skor | Değerlendirme |
|---|---:|---|
| Architecture | 8.0/10 | Güçlü |
| Android Classic Bluetooth | 8.2/10 | Güçlü |
| Android BLE | 7.0/10 | İyi, native/JS ayrışması var |
| iOS BLE | 8.0/10 | Önceki rapora göre büyük iyileşme |
| Wi‑Fi | 7.5/10 | İyi |
| ELM327 | 7.2/10 | İyi, saha doğrulaması eksik |
| Clone handling | 7.5/10 | Güçlü yaklaşım |
| CAN | 8.0/10 | Güçlü |
| ISO-TP | 8.0/10 | Güçlü |
| K-Line | 6.5/10 | Gerçek hardware/timing testi gerekli |
| KWP | 7.0/10 | İyi parser altyapısı |
| UDS | 7.5/10 | Güçlü altyapı |
| Recovery | 7.0/10 | İyi, race testleri gerekli |
| Safety | 8.0/10 | Güçlü |
| Automated QA | 7.0/10 | İyi, fiziksel lab eksik |
| CAN FD | 4.0/10 | Kritik doğrulama problemi |
| DoIP | 3.0/10 | Production transport doğrulaması eksik |
| **Global Readiness** | **7.4/10** | **Production Candidate** |

## 3. Önceki P0 Bulgularının Durumu

### P0-01 — iOS BLE yanlış cihaz seçimi

**Durum: ÇÖZÜLDÜ**

Önceki sürümde iOS BLE scan sırasında bulunan ilk peripheral'a bağlanma riski vardı. Güncel native iOS BLE transport artık `targetIdentifier` kullanıyor ve UUID/name eşleşmesini kontrol ediyor.

**Sonuç: PASS**

### P0-02 — iOS BLE UUID çeşitliliği

**Durum: BÜYÜK ÖLÇÜDE ÇÖZÜLDÜ**

Güncel iOS native BLE katmanında birden fazla servis UUID'si ve generic characteristic discovery yaklaşımı bulunuyor. Özellikle FFE0, FFF0, 18F0, vLinker UUID ailesi ve generic writable/notify characteristic discovery destekleniyor.

**Sonuç: PASS / 8.5**

**Kalan risk:** Generic GATT discovery, birden fazla uygun characteristic bulunan cihazlarda yanlış characteristic seçebilir. Gerçek OBD doğrulaması için bağlantı sonrasında `AT` gibi bir capability probe gerekir.

**Severity: P1**

## 4. Android BLE

Ana TypeScript BLE transportu artık birden fazla UUID, MTU negotiation, MTU fallback, writable characteristic discovery, notify/indicate discovery, write mutex ve response/no-response seçenekleri içeriyor.

### Kritik mimari tutarsızlık

Ana TypeScript transportu geniş BLE uyumluluğuna sahipken native Android BLE transportu hâlâ FFE0/FFE1 ağırlıklı çalışıyor.

```text
JS BLE Transport
    ↓
FFE0 / FFF0 / 18F0 / vLinker / generic

Native Android BLE
    ↓
FFE0 / FFE1
```

**Severity: P0/P1**

Global hedef açısından tek bir canonical BLE discovery/characteristic selection stratejisi kullanılmalı.

## 5. Native Android BLE Write Modeli

Native Android BLE katmanı hâlâ `WRITE_TYPE_NO_RESPONSE` kullanıyor. Ana TypeScript transportunda ise response/no-response capability'sine göre seçim yapılabiliyor.

Bu nedenle aynı adaptör JS transport üzerinden başarılı, native transport üzerinden daha az uyumlu olabilir.

**Severity: P1**

## 6. iOS BLE

iOS native transport artık hedef peripheral filtreleme, birden fazla UUID, generic GATT discovery, write/notify characteristic seçimi ve connection lifecycle konularında önceki sürümden çok daha güçlü.

**Skor: 8.0/10**

Kalan risk: Generic discovery sonrasında seçilen characteristic'in gerçekten OBD UART characteristic'i olduğunun doğrulanması gerekiyor.

## 7. Android Classic Bluetooth

Android Classic tarafı güçlü durumda.

Olumlu noktalar:

- standart SPP UUID
- RFCOMM fallback
- bonded device yaklaşımı
- discovery fallback
- command serialization

**Skor: 8.2/10**

Gerçek test gereksinimleri: genuine ELM327, ELM327 v1.5, PIC18F25K80 clone, ELM327 v2.1 clone, STN2120, OBDLink, vLinker, UniCarScan.

## 8. Wi‑Fi

Wi‑Fi transportta TCP bağlantısı, keepalive ve düşük latency ayarları mevcut. Bu OBD Wi‑Fi adapterları için doğru mimaridir.

**Skor: 7.5/10**

Kalan testler:

- 192.168.x.x ELM adapterları
- farklı TCP portları
- bağlantı kopması
- router/AP değişimi
- phone sleep/wake
- ignition cycle
- stale TCP connection
- reconnect

## 9. Adapter Profile Registry

Yeni `AdapterProfileRegistry` önemli bir gelişmedir.

Örnek profil yaklaşımı:

- OBDLink
- vLinker
- ELM327 v1.5
- cheap clone v2.1

ve bunlara timing, headers, ATAL, adaptive timing, flow control ve burst limit gibi özelliklerin bağlanması doğru bir tasarımdır.

### Global ölçek için sonraki aşama

Adapter'ları yalnızca Tier ile sınıflandırmak yerine capability matrix kullanılmalıdır:

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
supportsATAL
supportsATH
supportsCFC
supportsDoIP
```

## 10. Clone Detection

Güncel engine'de command capability probing ve failure scoring bulunuyor. Clone cihazların başarısız AT komutları üzerinden capability score düşürülmesi doğru bir yaklaşımdır. Adapter stall/recovery mekanizması da bulunuyor.

**Skor: 7.5–8.0/10**

Kalan risk: Clone adı tek başına hardware capability belirlemek için yeterli değildir. Runtime capability probing esas yöntem olmalıdır.

## 11. Command Scheduler / Session Management

Güncel engine'de command scheduler, transport rate limiter, atomic sequence/session control, active command, timeout ve session ID gibi mekanizmalar bulunuyor.

Bu, stale response ve command race risklerini ciddi biçimde azaltmıştır.

**Skor: 7.5–8.0/10**

## 12. Adapter Stall Recovery

Üç ardışık garbage/failure benzeri durum sonrası adapter stall recovery tetiklenebiliyor. `ATWS` ile adapter warm-start denenmesi mantıklı bir recovery yaklaşımıdır.

Ancak adapter stall ile ECU stall birbirinden ayrılmalıdır.

**Severity: P1**

## 13. K-Line / KWP

Güncel KWP parser:

- format byte
- target/source
- length
- payload
- checksum

ayrıştırması yapıyor ve checksum doğruluyor. Protocol engine içinde KWP/ISO 9141 yönünde fallback mantığı bulunuyor.

**K-Line: 6.5/10**  
**KWP parser: 7.0/10**

Gerçek global K-Line uyumluluğu için 5-baud init, fast init, ECU wake-up, P1/P2/P3/P4 timing, inter-byte timing ve gerçek K-Line transceiver testleri gerekir.

## 14. ISO-TP

Güncel ISO-TP decoder'da ECU başına ayrı pending buffer yaklaşımı bulunuyor. Bu multi-ECU, sequence number, first frame ve consecutive frame işlemleri açısından önemli gelişmedir.

**Skor: 8.0/10**

## 15. KRİTİK — CAN FD

Burada ciddi bir tutarsızlık bulunuyor.

README CAN FD için 64-byte payload ve 8 Mbps desteği iddia ediyor. Ancak ISO-TP parser tarafında raw CAN line uzunluğunu 16 hex karakterden daha uzun olduğunda discard eden bir kontrol bulunuyor.

16 hex karakter = 8 byte.

Dolayısıyla 64-byte CAN FD frame'leri mevcut parser davranışıyla tam olarak işlenemez.

**Karar: P0 — CAN FD production support doğrulanmış değil.**

Classic CAN / ISO-TP iyi durumdadır; CAN FD ise doğrulanmamış/kısmi durumdadır.

## 16. CAN FD Transport

Gerçek CAN FD desteği yalnızca parser ile sağlanamaz.

```text
CAN FD capable adapter
        ↓
CAN FD transport
        ↓
CAN FD frame parser
        ↓
ISO-TP / UDS
```

Standart ELM327 adapterların CAN FD desteklediği varsayılamaz.

Bu nedenle CAN FD parser desteği ile CAN FD hardware connectivity ayrılmalıdır.

## 17. KRİTİK — DoIP

README ISO 13400 DoIP desteği iddia ediyor.

Gerçek DoIP için en az:

```text
UDP Vehicle Discovery
        ↓
Vehicle Announcement
        ↓
TCP Connection
        ↓
Routing Activation
        ↓
Diagnostic Message
        ↓
UDS Payload
        ↓
Alive Check
        ↓
Recovery
```

akışı gerekir.

**Karar: P0 — DoIP production support doğrulanmış değil.**

## 18. UDS

UDS engine açısından positive response, negative response, NRC handling, ISO-TP, session management ve command safety altyapısı güçlü.

**Skor: 7.5/10**

Ancak Security Gateway / SFD / SGW gibi sistemlerde NRC tespiti gerçek gateway bypass implementation anlamına gelmez. README'deki SGW/SFD challenge-response ifadeleri gerçek OEM gateway integration ile doğrulanmadan production capability olarak değerlendirilmemeli.

## 19. Safety

Güncel README'de düşük voltaj koruması, write öncesi snapshot, rollback, risk sınıfları ve hareket halinde kritik command engelleme gibi güvenlik mekanizmaları bulunuyor.

**Skor: 8.0/10**

## 20. Heartbeat

Native session manager'da idle durumda `AT RV` benzeri adapter heartbeat yaklaşımı bulunuyor.

`AT RV` adapter voltage query'dir. Adapter alive kontrolü olabilir fakat ECU diagnostic session alive anlamına gelmez.

UDS extended session için tester-present gibi ECU tarafı mekanizmaları ayrı değerlendirilmelidir.

**Severity: P1**

## 21. Reconnect / Cranking Recovery

Engine ve native session katmanlarında crank/reconnect recovery yaklaşımı bulunuyor.

Gerçek araç senaryosu:

```text
ECU connected
↓
engine OFF
↓
crank
↓
voltage sag
↓
ECU reset
↓
ECU returns
↓
reconnect
```

Kalan risk: Automatic recovery ile kullanıcı tarafından başlatılan connect/disconnect/reconnect işlemlerinin aynı anda gerçekleşmesi race condition oluşturabilir.

**Severity: P1**

## 22. Automated Testing

Repository README'sinde 56 test suites / 401 tests passed bildiriliyor.

Parser ve transport testlerinin ayrılaşması olumlu.

Ancak 401 otomatik test, 401 gerçek ECU bağlantı testi değildir.

Özellikle BLE radio stack, Bluetooth Classic, K-Line timing, CAN FD hardware, DoIP hardware/network, ECU gateway ve clone UART davranışı fiziksel test gerektirir.

## 23. En Büyük Mimari Risk: Birden Fazla Transport Yolu

Projede üç connectivity katmanı görülebiliyor:

1. `src/core/transport`
2. `BluetoothService`
3. native `MotoCortexOBD`

Bu katmanların BLE discovery ve capability davranışları birebir aynı değil.

Global uyumluluk açısından aynı adapterin hangi transport path üzerinden işlendiği deterministik olmalıdır.

**Severity: P0/P1**

## 24. Önerilen Nihai Mimari

```text
                 MotoCortex
                     │
           Connectivity Manager
                     │
             Canonical Transport
                     │
        ┌────────────┼────────────┐
        │            │            │
       BLE        Classic        Wi‑Fi
        │            │            │
        └────────────┼────────────┘
                     │
            Adapter Capability
                     │
       ┌─────────────┼─────────────┐
       │             │             │
     ELM327         STN         OEM Adapter
       │
       └─────────────┬─────────────┘
                     │
             Protocol Detection
                     │
        ┌────────────┼─────────────┐
        │            │             │
       OBD          UDS           KWP
        │            │             │
        └────────────┼─────────────┘
                     │
                  ECU
```

Temel prensip: **Tek canonical transport interface.**

## 25. Gerçek Global QA Lab Matrisi

### Adapter

**Tier 1**

- OBDLink MX+
- OBDLink EX
- vLinker MC+
- UniCarScan
- STN2120

**Tier 2**

- genuine ELM327
- PIC18F25K80 v1.5
- kaliteli v1.5 clone

**Tier 3**

- 5–10 farklı ELM327 v2.1 clone
- BK3231
- APM32
- generic BLE ELM
- generic Wi‑Fi ELM

### Telefon

**Android**

- Samsung
- Google Pixel
- Xiaomi
- OnePlus
- Motorola

Android 10–16 aralığı.

**iOS**

- iPhone 11
- iPhone 12
- iPhone 13
- iPhone 14
- iPhone 15
- iPhone 16
- iPhone 17

ve güncel desteklenen iOS sürümleri.

### Araç / Protokol

**CAN**

- ISO 15765-4 11-bit 500k
- ISO 15765-4 29-bit 500k
- 250k
- 125k
- farklı CAN addressing modelleri

**K-Line**

- ISO 9141-2
- ISO 14230-4
- 5-baud init
- fast init

**UDS**

En az:

- 0x10
- 0x11
- 0x22
- 0x27
- 0x28
- 0x2E
- 0x31
- 0x34
- 0x36
- 0x37
- 0x3E

### Araç yaş matrisi

- 1996–2004
- 2005–2010
- 2011–2015
- 2016–2020
- 2021–2024
- 2025+

## 26. Connection Acceptance Criteria

Sadece `Bluetooth Connected` başarı sayılmamalı.

Önerilen zincir:

```text
Adapter Connected
        ↓
Adapter Identified
        ↓
Adapter Capability Detected
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

Bu zincirin tamamı başarılı olduğunda **ECU CONNECTED** durumu verilmelidir.

## 27. Global Başarı KPI'ları

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

## 28. P0 — Öncelikli Kalan Problemler

### P0-1 — Native Android BLE / JS BLE divergence

Tek canonical discovery ve write davranışı oluşturulmalı.

### P0-2 — CAN FD contradiction

README 64-byte CAN FD desteği iddia ederken parser tarafında 8-byte üstü frame kabulü problemi bulunuyor.

### P0-3 — DoIP

Gerçek ISO 13400 transport ve routing activation zinciri fiziksel/entegrasyon seviyesinde doğrulanmalı.

### P0-4 — Production transport path

BLE için hangi transport yolunun production authority olduğu net ve tekil olmalı.

## 29. P1 — Sonraki Öncelikler

1. Generic GATT discovery sonrası `AT` capability probe.
2. Native Android BLE response/no-response adaptive write.
3. K-Line gerçek timing testleri.
4. UDS Tester Present / session lifetime.
5. Automatic reconnect cancellation/race testleri.
6. Adapter capability matrix.
7. CAN 29-bit ve multi-ECU saha testleri.
8. Gateway araçlarıyla gerçek test.
9. Ignition OFF/ON testleri.
10. Cranking / voltage sag testleri.

## 30. Son Değerlendirme

MotoCortex önceki rapora göre:

**6.3/10 → 7.4/10**

seviyesine yükselmiştir.

Özellikle aşağıdaki değişiklikler olumlu:

- iOS target filtering
- iOS UUID diversity
- generic GATT discovery
- BLE write mutex
- MTU fallback
- AdapterProfileRegistry
- clone capability scoring
- multi-ECU ISO-TP contexts
- KWP checksum validation
- session/command generation control
- expanded automated testing

### Global 8/10 Hedefi

```text
CURRENT
   │
   ▼
Transport Unification          ← P0
   │
   ▼
CAN FD Reality                 ← P0
   │
   ▼
DoIP Reality                   ← P0
   │
   ▼
K-Line Hardware Lab            ← P1
   │
   ▼
Clone Adapter Lab              ← P1
   │
   ▼
Real Vehicle QA
   │
   ▼
GLOBAL CONNECTIVITY READY
```

### Nihai karar

**MotoCortex şu anda Production Candidate seviyesindedir.**

Global Connectivity Platform seviyesine geçmeden önce özellikle:

- native/JS transport birleştirme,
- CAN FD gerçek desteği,
- DoIP gerçek transport,
- K-Line fiziksel doğrulaması,
- clone adapter laboratuvarı,
- gerçek araç matrisi

tamamlanmalıdır.

Bu maddeler kapatıldığında bağlantı altyapısının **8.2–8.5/10** seviyesine çıkması gerçekçi görünmektedir.

## Kaynak

Güncel repository: https://github.com/ismailimamoglu/MotoCortex

GitHub README mevcut durumda 56 test suite / 401 test ve BLE, Classic Bluetooth, Wi‑Fi, CAN FD ve DoIP kapsamını bildiriyor.
