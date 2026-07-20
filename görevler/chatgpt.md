# **MotoCortex Universal Automotive Diagnostic Engine**

## **ECU Discovery, OBD-II, UDS, KWP2000 ve OEM Diagnostic Database**

### **Master Implementation Plan v1.0**

---

# **1\. Projenin Ana Hedefi**

MotoCortex yalnızca ELM327 üzerinden OBD-II PID okuyan bir uygulama olmamalıdır.

Hedef mimari:

                   ┌────────────────────┐  
                    │    MotoCortex App   │  
                    └──────────┬─────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ Diagnostic API      │  
                    └──────────┬─────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ Diagnostic Engine   │  
                    └──────────┬─────────┘  
                               │  
        ┌──────────────────────┼──────────────────────┐  
        │                      │                      │  
┌───────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐  
│ Vehicle Identity│    │ ECU Discovery   │    │ Diagnostic DB    │  
│ VIN / Fingerprint│   │ Address Scanner │    │ OEM Definitions  │  
└───────┬────────┘    └────────┬────────┘    └────────┬────────┘  
        │                      │                      │  
        └──────────────────────┼──────────────────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ Protocol Engine     │  
                    │ OBD / UDS / KWP     │  
                    └──────────┬─────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ ISO-TP / K-Line     │  
                    └──────────┬─────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ Native OBD Core     │  
                    └──────────┬─────────┘  
                               │  
                    ┌──────────▼─────────┐  
                    │ ELM327 / STN / VCI  │  
                    └────────────────────┘

MotoCortex'un temel çalışma mantığı:

Connect  
   ↓  
Adapter Detection  
   ↓  
Physical Protocol Detection  
   ↓  
Vehicle Identity Discovery  
   ↓  
ECU Discovery  
   ↓  
ECU Identification  
   ↓  
Diagnostic Protocol Selection  
   ↓  
Read Capabilities  
   ↓  
Execute Supported Operations

---

# **2\. Kritik Mimari Karar**

## **Tek bir komut listesi kullanılmayacak**

Yanlış mimari:

if vehicle \== Renault:  
    send command X

Doğru mimari:

VIN  
 ↓  
Vehicle Platform  
 ↓  
ECU  
 ↓  
ECU Software / Hardware Identity  
 ↓  
Protocol  
 ↓  
Diagnostic Definition  
 ↓  
Service  
 ↓  
Command

Örnek:

VIN: VF1XXXXXXXXXXXXXX  
        ↓  
Renault Clio IV  
        ↓  
2015  
        ↓  
1.5 dCi  
        ↓  
Engine ECU  
        ↓  
Continental SID305  
        ↓  
UDS / KWP  
        ↓  
ECU Definition  
        ↓  
Supported Services  
        ↓  
Read DTC / Read Data / Routine

---

# **3\. Faz 0 — Mevcut MotoCortex Mimarisi Korunacak**

Aşağıdaki mevcut mimari korunmalıdır:

Native OBD Core  
├── Bluetooth Transport  
├── Connection Manager  
├── OBDCommandQueue  
├── Transport Decoder  
├── ISO-TP Decoder  
├── Strict Sequential State Machine  
├── Transport Lock  
├── Guard Time  
├── Watchdog  
├── Recovery Loop  
└── Diagnostic Logs

Özellikle şu prensipler bozulmayacak:

### **3.1 Aynı anda iki komut gönderilmeyecek**

if (isTransportBusy) {  
    await waitForTransport();  
}

Her diagnostic transaction:

Acquire Lock  
   ↓  
Send  
   ↓  
Wait  
   ↓  
Parse  
   ↓  
Release Lock

---

### **3.2 Telemetry ile Diagnostic Mode birbirinden ayrılacak**

NORMAL  
  ↓  
TELEMETRY\_ACTIVE  
  ↓  
EXPERTISE\_MODE  
  ↓  
DIAGNOSTIC\_SESSION

Diagnostic command başlamadan önce:

Stop Telemetry  
   ↓  
Increment Session ID  
   ↓  
Wait 300 ms Silent Cooldown  
   ↓  
Start Diagnostic Session

Diagnostic işlem bitince:

Diagnostic Session  
   ↓  
Return to Default Session  
   ↓  
Wait  
   ↓  
Restart Telemetry

---

# **4\. Faz 1 — Adapter Layer**

MotoCortex ilk olarak kullanılan cihazın yeteneklerini anlamalıdır.

## **Adapter Capability Model**

interface AdapterCapabilities {  
  manufacturer?: string;  
  model?: string;  
  firmwareVersion?: string;

  supportsCan: boolean;  
  supportsCan29Bit: boolean;  
  supportsIsoTp: boolean;  
  supportsKLine: boolean;  
  supportsIso9141: boolean;  
  supportsKwp2000: boolean;  
  supportsJ1850: boolean;

  supportsFlowControl: boolean;  
  supportsExtendedAddressing: boolean;  
}

## **ELM327 başlangıç akışı**

ATZ  
  ↓  
ATE0  
  ↓  
ATL0  
  ↓  
ATS0  
  ↓  
ATH1  
  ↓  
ATSP0  
  ↓  
ATDP  
  ↓  
ATI

Fakat:

ATZ

çift tetiklenmemelidir.

Connect işlemi idempotent olmalıdır:

CONNECT\_REQUESTED  
    ↓  
if already connecting:  
    return existing session

---

# **5\. Faz 2 — Fiziksel Protokol Discovery**

İlk aşamada:

ATSP0

kullanılabilir.

Ancak otomatik protokol tespiti başarısız olursa kontrollü fallback uygulanmalıdır.

Protocol Discovery  
       │  
       ├── CAN 11-bit 500k  
       ├── CAN 29-bit 500k  
       ├── CAN 11-bit 250k  
       ├── CAN 29-bit 250k  
       ├── ISO 9141-2  
       ├── ISO 14230 KWP  
       └── J1850

## **K-Line için özel akış**

Özellikle eski Renault/Dacia gibi araçlarda:

5-Baud Init

veya:

Fast Init

gereklidir.

Bu nedenle adapter capability testi yapılmalıdır:

AT H1  
AT AL

Ancak bu komutların cevapları tek başına K-Line desteğini kesin olarak kanıtlamaz.

Gerçek test:

ISO 9141 / KWP Init Attempt  
        ↓  
Success  
        ↓  
K-Line Supported

---

# **6\. Faz 3 — Vehicle Identity Engine**

Bu, MotoCortex'un yeni VIN fikrinin merkezidir.

## **Discovery sırası**

1\. OBD VIN  
      ↓  
2\. UDS VIN  
      ↓  
3\. ECU Identification  
      ↓  
4\. Calibration ID  
      ↓  
5\. Software Number  
      ↓  
6\. Hardware Number

## **OBD VIN**

09 02

## **UDS VIN**

22 F1 90

Ancak:

F190

her ECU'da garanti edilmemelidir.

Bu yüzden:

Try Known DID  
   ↓  
Positive Response  
   ↓  
Validate VIN

## **VIN doğrulama**

VIN:

17 characters

olmalıdır.

Kontrol:

function isValidVin(vin: string): boolean {  
  return (  
    vin.length \=== 17 &&  
    \!/\[IOQ\]/.test(vin) &&  
    /^\[A-HJ-NPR-Z0-9\]+$/.test(vin)  
  );  
}

---

# **7\. Vehicle Fingerprint**

VIN tek başına yeterli değildir.

MotoCortex şu kimliği oluşturmalıdır:

interface VehicleFingerprint {  
  vin: string;

  make?: string;  
  model?: string;  
  year?: number;  
  engine?: string;  
  fuelType?: string;  
  transmission?: string;

  protocol?: string;

  ecus: ECUFingerprint\[\];

  confidence: number;  
}

ECU fingerprint:

interface ECUFingerprint {  
  ecuAddress: number;  
  responseAddress?: number;

  ecuName?: string;  
  supplier?: string;

  hardwareNumber?: string;  
  softwareNumber?: string;  
  softwareVersion?: string;

  protocol: "OBD" | "UDS" | "KWP2000";  
}

Örnek:

{  
  "vin": "VF1...",  
  "make": "Renault",  
  "model": "Clio",  
  "year": 2015,  
  "engine": "1.5 dCi",  
  "confidence": 0.97,  
  "ecus": \[  
    {  
      "ecuName": "Engine ECU",  
      "requestId": "0x7E0",  
      "responseId": "0x7E8",  
      "softwareNumber": "XXXX"  
    }  
  \]  
}

---

# **8\. Faz 4 — ECU Discovery Engine**

Modern araçlarda tüm ECU'lar yalnızca `0x7DF` üzerinden bulunamaz.

ECU discovery iki seviyeli olmalıdır.

## **Seviye 1 — Functional Addressing**

0x7DF

veya protokole uygun functional request.

Amaç:

Engine  
Transmission  
ABS  
Airbag  
BCM  
HVAC

gibi ECU'lardan cevap almak.

---

## **Seviye 2 — Physical Address Discovery**

CAN üzerinde:

0x700 \- 0x7FF

veya araç platformuna göre tanımlı ID aralıkları taranabilir.

Ancak kör tarama:

for id in 0x000..0x7FF:  
    send diagnostic command

şeklinde yapılmamalıdır.

Bu:

* araç ağını gereksiz yükleyebilir  
* gateway tarafından engellenebilir  
* ECU'ları rahatsız edebilir

Bunun yerine:

Known Vehicle Map  
        ↓  
Known ECU IDs  
        ↓  
Safe Probe  
        ↓  
Positive Response

kullanılmalıdır.

Bilinmeyen araçlarda:

Conservative Discovery Mode

uygulanmalıdır.

---

# **9\. ECU Identification**

Her bulunan ECU için:

Diagnostic Session  
       ↓  
Read Identification  
       ↓  
Hardware ID  
       ↓  
Software ID  
       ↓  
VIN  
       ↓  
Supplier

UDS servisleri:

0x10  
0x22  
0x3E

Öncelikli olarak kullanılmalıdır.

Standart DID'ler için:

F190 → VIN  
F187 → Software Number  
F188 → Software Version  
F189 → Hardware Number

gibi tanımlar bulunabilir.

Ancak:

DID'ler ECU/üretici/versiyon bazında doğrulanmadan kesin kabul edilmemelidir.

---

# **10\. Diagnostic Protocol Abstraction**

MotoCortex'ta üst katman protokolden bağımsız olmalıdır.

interface DiagnosticProtocol {  
  connect(): Promise\<void\>;

  readDtc(): Promise\<DTC\[\]\>;  
  clearDtc(): Promise\<void\>;

  readData(identifier: string): Promise\<DiagnosticValue\>;

  startSession(  
    session: DiagnosticSession  
  ): Promise\<void\>;

  testerPresent(): Promise\<void\>;  
}

Implementasyonlar:

Obd2Protocol  
UdsProtocol  
Kwp2000Protocol  
OemDiagnosticProtocol

Böylece UI şu komutu gönderir:

diagnosticEngine.readDtc(ecu)

Aşağıdaki ayrıntıları UI bilmez:

OBD Mode 03  
UDS 0x19  
KWP 0x18  
OEM-specific command

---

# **11\. OBD-II Engine**

İlk production kapsamı:

Mode 01 → Live Data  
Mode 02 → Freeze Frame  
Mode 03 → Stored DTC  
Mode 04 → Clear DTC  
Mode 06 → On-board Monitor  
Mode 07 → Pending DTC  
Mode 09 → Vehicle Information  
Mode 0A → Permanent DTC

## **PID Discovery**

01 00  
01 20  
01 40  
01 60  
01 80  
01 A0

Sadece desteklenen PID'ler seçilmelidir.

Örnek:

supportedPids \= decodePidBitmask(response)

Sonra:

User Selected PIDs  
        ↓  
Intersection  
        ↓  
Supported PIDs  
        ↓  
Query Queue

Bu, mevcut dynamic PID mimarinle doğrudan uyumludur.

---

# **12\. UDS Engine**

UDS servisleri ayrı bir service registry olarak tasarlanmalıdır.

enum UdsService {  
  DiagnosticSessionControl \= 0x10,  
  EcuReset \= 0x11,  
  ClearDiagnosticInformation \= 0x14,  
  ReadDtcInformation \= 0x19,  
  ReadDataByIdentifier \= 0x22,  
  ReadMemoryByAddress \= 0x23,  
  SecurityAccess \= 0x27,  
  CommunicationControl \= 0x28,  
  WriteDataByIdentifier \= 0x2E,  
  InputOutputControl \= 0x2F,  
  RoutineControl \= 0x31,  
  TesterPresent \= 0x3E,  
  ControlDtcSetting \= 0x85  
}

İlk implementasyon sırası:

Phase 1:  
0x10  
0x19  
0x22  
0x3E

Phase 2:  
0x11  
0x14  
0x85

Phase 3:  
0x2F  
0x31

Phase 4:  
Controlled Write Operations

---

# **13\. ISO-TP Layer**

UDS üzerinde en kritik katmanlardan biri ISO-TP'dir.

Frame türleri:

Single Frame  
First Frame  
Consecutive Frame  
Flow Control

Akış:

ECU → First Frame  
        ↓  
MotoCortex → Flow Control  
        ↓  
ECU → Consecutive Frames  
        ↓  
Reassemble

ISO-TP decoder:

interface IsoTpFrame {  
  type:  
    | "SINGLE"  
    | "FIRST"  
    | "CONSECUTIVE"  
    | "FLOW\_CONTROL";

  payload: Uint8Array;  
  sequenceNumber?: number;  
  totalLength?: number;  
}

Kurallar:

Wrong Sequence Number  
    ↓  
Abort Transaction

Timeout  
    ↓  
Abort Transaction

Unexpected Flow Control  
    ↓  
Abort Transaction

ISO-TP, UDS'nin üzerinde çalışan bağımsız bir transport katmanı olarak tasarlanmalıdır. `can-isotp` bu katmanın açık kaynak referanslarından biridir; UDS servis modelinde ise `udsoncan` referans alınabilir.

---

# **14\. UDS Negative Response Handling**

Her UDS cevabı:

Positive

olmayabilir.

Örnek:

7F 22 78

Anlamı:

Response Pending

Bu durumda:

Wait  
   ↓  
Continue

Örnek:

7F 22 31

Anlamı:

Request Out Of Range

MotoCortex bunu kullanıcıya:

This ECU does not support this data identifier.

şeklinde göstermelidir.

Önemli NRC'ler:

0x10 General Reject  
0x11 Service Not Supported  
0x12 Sub-function Not Supported  
0x13 Incorrect Message Length  
0x22 Conditions Not Correct  
0x24 Request Sequence Error  
0x31 Request Out Of Range  
0x33 Security Access Denied  
0x35 Invalid Key  
0x36 Exceeded Number Of Attempts  
0x37 Required Time Delay Not Expired  
0x78 Response Pending

---

# **15\. Tester Present**

Extended diagnostic session açıkken ECU session timeout yaşayabilir.

Bu nedenle:

3E 00

periyodik gönderilebilir.

Mimari:

DiagnosticSession  
        ↓  
TesterPresentScheduler  
        ↓  
Periodic 3E 00

Ancak bu scheduler:

Main Command Queue

ile çakışmamalıdır.

Doğru:

Diagnostic Transport Scheduler  
├── Main Request  
└── Tester Present

İki işlem aynı anda fiziksel transport'a erişmemelidir.

---

# **16\. DTC Engine**

DTC sistemi üç seviyeli olmalıdır.

## **OBD DTC**

P0133  
C1234  
B0001  
U0100

## **UDS DTC**

DTC Number  
Status Byte  
Snapshot Data  
Extended Data

## **OEM DTC**

Manufacturer-specific

Model:

interface DiagnosticTroubleCode {  
  code: string;  
  rawCode?: number;

  ecu: string;  
  protocol: string;

  status: {  
    testFailed: boolean;  
    pending: boolean;  
    confirmed: boolean;  
    warningIndicatorRequested: boolean;  
  };

  description?: string;  
  severity?: "info" | "low" | "medium" | "high" | "critical";

  freezeFrame?: Record\<string, unknown\>;  
  extendedData?: Record\<string, unknown\>;  
}

---

# **17\. Diagnostic Database**

Bu sistemin kalbi veritabanıdır.

Önerilen yapı:

diagnostic-database/  
│  
├── manufacturers/  
│   ├── renault/  
│   ├── vag/  
│   ├── bmw/  
│   ├── toyota/  
│   ├── ford/  
│   ├── hyundai/  
│   └── ...  
│  
├── vehicles/  
│   ├── renault-clio/  
│   ├── dacia-logan/  
│   └── ...  
│  
├── ecus/  
│   ├── bosch/  
│   ├── continental/  
│   ├── delphi/  
│   └── ...  
│  
├── protocols/  
│   ├── obd2/  
│   ├── uds/  
│   ├── kwp2000/  
│   └── iso9141/  
│  
└── dtc/

---

# **18\. Database Entity Model**

interface VehicleDefinition {  
  make: string;  
  model: string;  
  generation?: string;

  yearStart?: number;  
  yearEnd?: number;

  engineCodes?: string\[\];  
  fuelTypes?: string\[\];

  protocolCandidates: ProtocolDefinition\[\];

  ecus: ECUDefinition\[\];  
}

interface ECUDefinition {  
  id: string;  
  name: string;

  requestIds: number\[\];  
  responseIds: number\[\];

  protocol: DiagnosticProtocolType;

  identification: IdentificationDefinition;

  supportedServices: DiagnosticServiceDefinition\[\];

  dids: DIDDefinition\[\];  
  routines: RoutineDefinition\[\];  
  dtcs: DTCDefinition\[\];  
}

---

# **19\. ECU Definition Örneği**

{  
  "id": "renault.sid305",  
  "name": "Continental SID305",  
  "protocol": "UDS",  
  "requestIds": \[  
    "0x7E0"  
  \],  
  "responseIds": \[  
    "0x7E8"  
  \],  
  "services": {  
    "readDtc": {  
      "service": "0x19"  
    },  
    "clearDtc": {  
      "service": "0x14"  
    }  
  },  
  "dids": \[  
    {  
      "id": "F190",  
      "name": "VIN",  
      "type": "ascii"  
    }  
  \]  
}

---

# **20\. Feature Activation Engine**

Özellik açma işlemleri ayrı bir modül olmalıdır.

Feature Activation  
        ↓  
Compatibility Check  
        ↓  
ECU Identification  
        ↓  
Read Current Configuration  
        ↓  
Create Backup  
        ↓  
User Confirmation  
        ↓  
Required Diagnostic Session  
        ↓  
Authorized Write  
        ↓  
Read Back  
        ↓  
Verify

Örnek:

interface VehicleFeature {  
  id: string;  
  name: string;

  supportedVehicles: VehicleMatcher\[\];  
  requiredEcu: string;

  readConfiguration(): Promise\<ConfigurationState\>;  
  writeConfiguration(  
    state: ConfigurationState  
  ): Promise\<void\>;

  verifyConfiguration(): Promise\<boolean\>;  
}

---

# **21\. Feature Activation Safety Policy**

MotoCortex'un default davranışı:

READ \= Allowed  
WRITE \= Restricted  
PROGRAMMING \= Disabled

## **Risk seviyeleri**

Level 0:  
Read-only

Level 1:  
Diagnostic clear

Level 2:  
Adaptation / configuration

Level 3:  
Actuator control

Level 4:  
Security-protected write

Level 5:  
Programming / flashing

Production uygulamasında:

Level 0 → İlk sürüm  
Level 1 → Kontrollü  
Level 2 → Vehicle-specific  
Level 3 → Expert Mode  
Level 4 → Yetkilendirme ve özel güvenlik politikası  
Level 5 → İlk sürümlerde yok

Yanlış ECU'ya yanlış yazma işlemi ECU'yu çalışamaz duruma getirebilir. Bu nedenle her write işlemi için araç/ECU eşleşmesi, güvenilir veri tanımı, transaction doğrulaması ve geri okuma zorunlu olmalıdır.

---

# **22\. OEM Plugin Mimarisi**

Her marka için ayrı uygulama kodu yazılmamalıdır.

OEM Plugin  
    ↓  
Definition Provider  
    ↓  
Diagnostic Database

Örnek:

RenaultPlugin  
├── VehicleMatcher  
├── ECUDefinitions  
├── DTCDefinitions  
├── DIDDefinitions  
└── FeatureDefinitions

VAGPlugin  
├── VehicleMatcher  
├── ECUDefinitions  
├── DTCDefinitions  
├── DIDDefinitions  
└── FeatureDefinitions

---

# **23\. İlk Marka Önceliği**

Ben şu sırayı öneriyorum:

## **Faz A**

Universal OBD-II

## **Faz B**

Renault / Dacia

Çünkü:

* K-Line  
* KWP2000  
* UDS  
* ECU discovery  
* PyRen gibi açık kaynak referanslar

MotoCortex'un mevcut test geçmişiyle de doğrudan örtüşüyor.

## **Faz C**

VAG

## **Faz D**

Ford / Mazda / Volvo / JLR

## **Faz E**

Hyundai / Kia  
Toyota  
BMW  
Mercedes  
Stellantis

Generic Diagnostic Tool özellikle Ford, Mazda, JLR, Volvo ve OBD-II uyumlu araçlar üzerinde UDS/KWP2000/J2534 yaklaşımı için faydalı bir referanstır.

---

# **24\. Repo Araştırmasından Alınacak Mimari Fikirler**

## **Renault CANanalyze**

Özellikle:

CAN  
ISO-TP  
UDS  
ECU discovery  
Service scanning

mimarisi incelenmelidir.

Repo, bilinmeyen UDS CAN ID'lerini keşfetme ve servisleri tarama yaklaşımı göstermektedir. Ancak MotoCortex'ta bu özellik daha güvenli ve araç profili odaklı uygulanmalıdır.

---

## **udsoncan**

Şunlar için referans:

UDS Service abstraction  
Request/Response parsing  
Negative response handling  
DID handling  
Session handling

MotoCortex'a doğrudan Python kodu taşınmayacak; mimari referans alınacaktır.

---

## **can-isotp**

Şunlar için referans:

First Frame  
Consecutive Frame  
Flow Control  
Sequence Number  
Timeout  
Reassembly

Native Android tarafında Kotlin implementasyonu yazılmalıdır. Python kütüphanesi doğrudan mobil uygulamaya taşınmamalıdır.

---

## **OpenDBC**

Şunlar için referans:

Vehicle-specific CAN definitions  
DBC parsing  
Signal definitions  
Vehicle fingerprints

Ancak:

DBC  
≠  
UDS Diagnostic Database

Bu iki veri modeli ayrı tutulmalıdır.

---

# **25\. Önerilen Native Kotlin Klasör Yapısı**

native-obd-core/  
│  
├── transport/  
│   ├── BluetoothTransport.kt  
│   ├── BleTransport.kt  
│   ├── WifiTransport.kt  
│   └── TransportLock.kt  
│  
├── adapter/  
│   ├── Elm327Adapter.kt  
│   ├── StnAdapter.kt  
│   └── AdapterCapabilities.kt  
│  
├── protocol/  
│   ├── obd/  
│   │   ├── ObdProtocol.kt  
│   │   ├── ObdPidDecoder.kt  
│   │   └── ObdDtcDecoder.kt  
│   │  
│   ├── uds/  
│   │   ├── UdsClient.kt  
│   │   ├── UdsService.kt  
│   │   ├── UdsResponseParser.kt  
│   │   └── UdsNrcDecoder.kt  
│   │  
│   ├── kwp/  
│   │   └── Kwp2000Client.kt  
│   │  
│   └── iso9141/  
│       └── Iso9141Client.kt  
│  
├── transport\_protocol/  
│   ├── IsoTpEncoder.kt  
│   ├── IsoTpDecoder.kt  
│   ├── IsoTpSession.kt  
│   └── FlowControlManager.kt  
│  
├── discovery/  
│   ├── ProtocolDiscovery.kt  
│   ├── EcuDiscovery.kt  
│   ├── VehicleIdentityDiscovery.kt  
│   └── VehicleFingerprint.kt  
│  
├── diagnostic/  
│   ├── DiagnosticEngine.kt  
│   ├── DiagnosticSessionManager.kt  
│   ├── TesterPresentScheduler.kt  
│   ├── DtcManager.kt  
│   └── FeatureActivationEngine.kt  
│  
├── database/  
│   ├── VehicleDefinition.kt  
│   ├── EcuDefinition.kt  
│   ├── DidDefinition.kt  
│   ├── RoutineDefinition.kt  
│   └── DtcDefinition.kt  
│  
├── safety/  
│   ├── WriteOperationGuard.kt  
│   ├── CompatibilityValidator.kt  
│   └── TransactionVerifier.kt  
│  
└── diagnostics/  
    ├── DiagnosticLogger.kt  
    ├── TraceRecorder.kt  
    └── SessionRecorder.kt

---

# **26\. Uygulama Sırası**

## **Sprint 1 — Core Stability**

* Mevcut Native OBD Core stabilizasyonu  
* Transport Lock  
* Session ID  
* Queue cancellation  
* Watchdog  
* K-Line capability detection

---

## **Sprint 2 — Universal OBD**

* Mode 01  
* Mode 02  
* Mode 03  
* Mode 04  
* Mode 06  
* Mode 07  
* Mode 09  
* Mode 0A

---

## **Sprint 3 — VIN Identity**

* VIN read  
* VIN validation  
* WMI decoding  
* Vehicle metadata resolver  
* User confirmation UI

Akış:

ECU VIN  
   ↓  
Decode  
   ↓  
Brand / Model / Year Prediction  
   ↓  
User Confirmation  
   ↓  
Save Vehicle Profile

---

## **Sprint 4 — ISO-TP**

* Single Frame  
* First Frame  
* Consecutive Frame  
* Flow Control  
* Timeout  
* Sequence validation  
* Reassembly

---

## **Sprint 5 — UDS Read-Only**

* 0x10  
* 0x19  
* 0x22  
* 0x3E

İlk hedef:

UDS ECU Discovery  
        ↓  
ECU Identification  
        ↓  
DTC Read  
        ↓  
DID Read

---

## **Sprint 6 — KWP2000**

* K-Line initialization  
* Slow init  
* Fast init  
* KWP framing  
* KWP DTC  
* KWP data read

Bu sprint özellikle 2011 Dacia Logan benzeri araçlar için kritik olacaktır.

---

## **Sprint 7 — Diagnostic Database**

İlk database:

Universal  
Renault  
Dacia  
VAG

---

## **Sprint 8 — OEM Diagnostic**

* ECU definitions  
* DID definitions  
* DTC definitions  
* Routine definitions  
* Compatibility matcher

---

## **Sprint 9 — Controlled Features**

İlk olarak:

Read configuration

Sonra:

User confirmation

Sonra:

Controlled write

---

# **27\. Test Stratejisi**

Her protokol için üç test seviyesi olmalıdır.

## **Unit Test**

Raw Bytes  
    ↓  
Decoder  
    ↓  
Expected Object

Örnek:

41 0C 1A F8

beklenen:

RPM \= 1726

---

## **Replay Test**

Gerçek araçtan kaydedilmiş:

TX  
RX  
Timestamp

verisi yeniden oynatılır.

CAN Trace  
    ↓  
Replay Engine  
    ↓  
Diagnostic Engine

---

## **Hardware Test**

Gerçek araç:

Vehicle  
    ↓  
Adapter  
    ↓  
MotoCortex

Test matrisi:

Vehicle  
Protocol  
Adapter  
Connection  
VIN  
DTC  
Live Data  
UDS  
KWP

---

# **28\. Log Sistemi**

Her diagnostic transaction kaydedilmelidir:

{  
  "timestamp": 1750000000,  
  "protocol": "UDS",  
  "requestId": "0x7E0",  
  "responseId": "0x7E8",  
  "request": "22F190",  
  "response": "62F190...",  
  "latencyMs": 423,  
  "session": "extended",  
  "result": "success"  
}

Bu sistem:

Bug Report  
    ↓  
Diagnostic Trace  
    ↓  
Replay  
    ↓  
Issue Reproduction

için kritik olacaktır.

---

# **29\. Agent'a Verilecek Ana Kurallar**

Kodlama ajanına şu kurallar kesinlikle verilmelidir:

1\. Mevcut Native OBD Core mimarisini bozma.

2\. Yeni protokol eklerken Transport Layer ile Diagnostic Layer'ı ayır.

3\. UDS, KWP2000 ve OBD-II aynı sınıf içinde karıştırılmayacak.

4\. ISO-TP bağımsız transport protocol olarak uygulanacak.

5\. Her command strict sequential queue üzerinden gönderilecek.

6\. Aynı anda birden fazla fiziksel transport transaction çalışmayacak.

7\. Telemetry ve diagnostic işlemleri birbirinden izole edilecek.

8\. Her UDS negative response özel olarak parse edilecek.

9\. Bilinmeyen DID'ler körlemesine taranmayacak.

10\. ECU write işlemleri default olarak disabled olacak.

11\. Her write işlemi öncesi vehicle/ECU compatibility doğrulanacak.

12\. Her write işleminden sonra read-back verification yapılacak.

13\. VIN sonucu kullanıcıya otomatik öneri olarak sunulacak; kesin bilgi olarak kaydedilmeden önce kullanıcı doğrulaması alınacak.

14\. Marka/model/ECU bilgileri hardcoded if/else zinciri ile değil, versioned diagnostic database ile yönetilecek.

15\. Her yeni araç desteği database definition olarak eklenebilecek.

16\. Gerçek araç testleri replay log ile tekrarlanabilir olacak.

17\. Her protocol için unit test \+ replay test \+ hardware test oluşturulacak.

18\. K-Line desteklemeyen adapter'lar erken aşamada tespit edilecek.

19\. Timeout, retry ve recovery davranışları protocol-specific olacak.

20\. Yeni bir command eklemeden önce hangi ECU/protocol/session için geçerli olduğu tanımlanacak.

---

# **30\. Son Hedef Mimari**

MotoCortex'un nihai mimarisi:

                ┌────────────────────┐  
                 │       VIN           │  
                 └─────────┬──────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ Vehicle Identity    │  
                 └─────────┬──────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ Vehicle Fingerprint │  
                 └─────────┬──────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ ECU Discovery       │  
                 └─────────┬──────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ ECU Identification  │  
                 └─────────┬──────────┘  
                           │  
             ┌─────────────┼─────────────┐  
             │             │             │  
        ┌────▼────┐   ┌────▼────┐   ┌────▼────┐  
        │ OBD-II  │   │   UDS   │   │   KWP   │  
        └────┬────┘   └────┬────┘   └────┬────┘  
             │             │             │  
             └─────────────┼─────────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ Diagnostic Database │  
                 └─────────┬──────────┘  
                           │  
       ┌───────────────────┼───────────────────┐  
       │                   │                   │  
  Read Live Data      Read DTC          Feature Activation  
       │                   │                   │  
       └───────────────────┼───────────────────┘  
                           │  
                 ┌─────────▼──────────┐  
                 │ Safety & Validation │  
                 └────────────────────┘

## **En önemli stratejik karar**

MotoCortex'un geleceği:

OBD Scanner

olmaktan çıkıp:

Vehicle Identity Platform  
        \+  
Universal Diagnostic Engine  
        \+  
OEM Diagnostic Knowledge Base

haline gelmesidir.

Bu planın ilk uygulanacak bölümü **Faz 0 → Faz 5** olmalıdır. Özellikle senin mevcut uygulamanın yaşadığı bağlantı ve telemetry stabilite problemleri tamamen çözülmeden UDS/özellik açma katmanına geçilmemeli. Önce sağlam bir **transport \+ session \+ ISO-TP temeli**, sonra protokol ve OEM bilgisi eklenmelidir.

