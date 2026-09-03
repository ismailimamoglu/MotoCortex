# 🏎️ Cortex OBD2 Diagnostic Scanner (MotoCortex) — Next-Gen Vehicle Diagnostics & UDS ECU Platform

[![React Native](https://img.shields.io/badge/React_Native-Expo_v52-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-73_Suites_|_504_Passed-2EA44F?logo=jest&logoColor=white)](https://jestjs.io/)
[![UDS ISO-14229](https://img.shields.io/badge/Protocol-ISO_14229_UDS_|_ISO_13400_DoIP_|_CAN_FD-FF6F00)](https://www.iso.org/standard/72439.html)
[![SGW Bypass](https://img.shields.io/badge/Security-SGW_Bypass_Engine_(SFD/FCA/BMW)-00E5FF)](src/core/security/SgwBypassEngine.ts)
[![Offline-First](https://img.shields.io/badge/Architecture-Offline--First_Engine-4A154B)](https://motocortex.app)
[![Locales](https://img.shields.io/badge/Locales-26_Languages_100%25_Synchronized-8E44AD)](src/locales/)

**Cortex OBD2 Diagnostic Scanner (MotoCortex)** is an enterprise-grade, offline-first mobile vehicle diagnostics, **ISO 13400 DoIP**, **CAN FD 64-byte**, and **UDS ECU Coding / Hidden Feature Activation platform** built for **Motorcycles (BMW Motorrad, Ducati, KTM, Yamaha, Honda, Harley-Davidson)**, **Modern & Next-Gen EV Platforms (BYD, MG, XPeng, NIO, Xiaomi SU7)**, and **Global Car Manufacturers (VW Group, BMW, Mercedes-Benz, Ford, Toyota, Hyundai/Kia, Stellantis, GM, Volvo, Tesla)**.

---

## ✨ Key Features & Diagnostic Architecture

### 🧠 1. AI Doctor™ Deep Diagnostic Dossiers & Multi-ECU Intelligence
- **Multi-ECU Architecture:** Scans and analyzes across ECM (Engine), TCM (Transmission), ABS/ESP (Braking & Chassis), SRS (Airbag & Restraints), BCM (Body Control), Gateway, and EPS (Electronic Power Steering).
- **Dynamic System Impact Scoring:** Automatically computes module-specific health scores (e.g., *ŞANZIMAN SAĞLIK SKORU*, *FREN & ŞASİ GÜVENLİK SKORU*, *KORUYUCU GÜVENLİK SKORU*).
- **Cross-DTC Correlation Matrix:** Uncovers root-cause compound failures (e.g., `P0102` + `P0171` unmetered vacuum leaks, `C0035` + `C1201` wheel speed sensor cascade).
- **Concrete Multimeter & Pinout Testing:** Step-by-step physical electrical diagnostics (volts, resistance, sensor bench tests) for technician-grade troubleshooting.
- **Dual-Engine Operation:** Edge AI (Gemini 1.5 Flash via Supabase Deno Edge) with deterministic, 100% offline rule engine fallback.

---

### ⚡ 2. Real Hardware Testing & Action Modules ("EKSTRA İŞLEMLER")
- **Freeze Frame Inspector (`Mode 02`):** Reads exact snapshot data (`020200` DTC, `020C00` RPM, `020D00` Speed, `020500` Coolant Temp, `021100` Throttle, `020B00` MAP, `020600` STFT) at the exact moment the Check Engine light triggered.
- **Battery & Cranking Test (`ATRV`):** Directly queries the ELM327 pin-16 ADC voltage divider circuit in 3 real phases: Resting Voltage (12.6V), Cranking Voltage dip test (monitoring drop below 9.6V), and Alternator Charging Voltage (14.2V).
- **Performance Timer (0-100 km/h):** High-precision millisecond chronometer triggered directly by live ECU speed transitions (`PID 010D` > 0 km/h), recording 0-60 km/h and 0-100 km/h milestones.
- **Dual-Layer DTC Clear & Safety Interlocks:**
  - **Engine Running Interlock:** Automatically blocks diagnostic clearing if `RPM > 0` or `Speed > 0` to safeguard vehicle operation.
  - **Bus Wake-up:** Awakens older K-Line (ISO 9141-2 / KWP2000) transceivers before dispatching `04` (SAE J1979 Mode 04).
  - **UDS 0x14 Fallback:** Seamlessly fires ISO 14229 Service `14FFFFFF` if CAN bus controllers reject standard Mode 04.
- **OBD2 Compatibility & Capability Matrix:** Real-time hardware adapter capability scoring (0-100), clone PIC detection (v1.5 vs fake v2.1), RTT latency benchmark, and 32-bit supported PID bitmask matrix (`0100`, `0120`, `0140`, `0160`, `0180`).
- **One-Tap Diagnostic Report Sharing:** Formats real VIN, odometer, MIL distance, active DTCs, and AI Doctor findings for instant sharing via native OS dialogs.

---

### 🛠️ 3. 208+ Global OEM Hidden Features & UDS ECU Coding
- **Motorcycle UDS Library (35 Features):** Shift Assistant Pro re-adaptation, Dynamic ESA zero-point calibration, ABS Pro cornering mode, Track lap timers, and EBC engine brake control.
- **China & Global EV Platforms (18 Features):** V2L 3.6kW power expansion, AVAS low-speed pedestrian siren mute, manual battery pre-heating, and Xiaomi SU7 Drift Mode torque vectoring.
- **Retrofit Hardware Integration (12 Features):** Coding for aftermarket parking distance sensors (PDC), 360° surround camera view, LED license plate error cancel, heated windshield/steering wheel modules, and tow bar electrical integration.
- **Security Gateway (SGW) Bypass:** Challenge-response unlocking for VAG SFD 1/2, FCA SGW, and BMW/Mercedes Central Gateways.
- **Deep Car Brand Coverage (122+ Features):** VAG Gauge Staging, BMW Sport Displays, Mercedes AMG Telemetry, Ford Bambi Mode, Toyota Soft-Close Door Retrofit, Hyundai N Grin Shift, and GM AFM V8 Cylinder Deactivation Override.

---

### 🔋 4. Electric & Hybrid Vehicle (EV/PHEV) Suite
- **BMS Battery Cell Balancing:** Real-time cell voltage delta (mV) and state-of-health (%SOH) calculation.
- **High-Voltage Isolation Monitoring:** Isolation resistance (kΩ) leak detection and safety status rating (`OPTIMAL`, `FAIR`, `DEGRADED`, `CRITICAL_ISOLATION_FAULT`).

---

### 🛡️ 5. 13-Phase Durable Safety & Verification Journal
- **Voltage Block Protection:** ECU write operations are strictly blocked if battery voltage drops below `11.8V` or `12.2V` based on feature risk level.
- **1-Click Rollback Snapshot:** Automatic full UDS DID byte backup prior to any write execution.
- **Track-Only Disclaimers:** Explicit track/private property safety disclaimers for high-risk performance modifications.

---

### 🌐 6. 26-Language Complete Matrix Localization
- **100% Schema Synchronization:** All 26 locale files (`src/locales/*.json`) are synchronized with zero missing or orphaned keys across 1,850+ translation keys.
- **Dynamic RTL & Language Switching:** Full native support for right-to-left (Arabic) and Asian CJK scripts.
- **Supported Locales:** `EN`, `TR`, `DE`, `FR`, `ES`, `IT`, `JA`, `ZH`, `RU`, `AR`, `PT`, `KO`, `NL`, `SV`, `DA`, `FI`, `NO`, `PL`, `CS`, `HU`, `RO`, `TH`, `UK`, `ID`, `EL`, `HI`.

---

## 🛠 Tech Stack

- **Framework:** React Native / Expo (SDK 52)
- **Language:** TypeScript 5.3 (Strict Mode — 0 errors)
- **State & Storage:** Zustand, SQLite, AsyncStorage, SecureStore
- **Hardware Protocols:** BLE, Classic Bluetooth, Wi-Fi, ISO 15765-4 CAN, ISO 14230-4 KWP2000, ISO 9141-2, SAE J1939, ISO 14229 UDS, ISO 13400 DoIP
- **Backend / Edge Functions:** Supabase Deno Edge Functions
- **Testing:** Jest (73 Test Suites, 504 Tests Passed)
- **Branding:** Modern Oval Automotive Emblem (`#007EFF` / `#0C2B48`) with full Android Adaptive and iOS App Store assets

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+`
- npm or yarn
- Expo Go app, iOS Simulator, or Android Studio Emulator / Physical Device

### Installation

```bash
# Clone the repository
git clone https://github.com/ismailimamoglu/MotoCortex.git
cd MotoCortex

# Install dependencies
npm install

# Start local development server
npx expo start -c
```

---

## 🧪 Testing & Verification

Run the complete automated unit and hardware protocol test suite:

```bash
npm test
```

Current Test Results:
```text
Test Suites: 73 passed, 73 total
Tests:       504 passed, 504 total
Snapshots:   0 total
Time:        2.029 s
```

Run TypeScript strict verification:
```bash
npx tsc --noEmit
```

---

## 📁 Repository Structure

```text
MotoCortex/
├── src/
│   ├── api/                   # OBD-II, BLE Bridge & UDS Protocol Execution Engines
│   ├── components/            # UI Modals (AiDoctorModal, FreezeFrameModal, BatteryTestModal, MultiEcuScanModal)
│   ├── core/
│   │   ├── database/          # OemDatabaseProvider (208+ OEM Single Source of Truth)
│   │   ├── features/          # FeatureCatalog, FeatureTypes, OemFeatureMapper
│   │   ├── queue/             # OBD Command Scheduler & Multi-ECU Polling Scheduler
│   │   ├── security/          # SafetyCriticalEcuRegistry & Command Classifier
│   │   └── transport/         # BLE, Classic Bluetooth, DoIP, and USB Transports
│   ├── locales/               # 26-Language Matrix JSON Translations (100% Synchronized)
│   ├── screens/               # MainApp, ObdHealthScreen
│   ├── services/              # DtcIntelligenceService, AiDoctorService, VehicleIdentityService
│   └── store/                 # Zustand App, Telemetry, and Bluetooth Stores
├── android/                   # Native Android Project & Adaptive Mipmap WebP Assets
├── assets/                    # App Store, Adaptive & Splash Icon Assets
├── scripts/                   # Localization, translation, and ASO tooling
└── package.json
```

---

## ⚖️ License & Disclaimer

MotoCortex is designed for professional diagnostic and vehicle customization purposes. ECU coding operations involve reading and writing vehicle memory blocks via ISO 14229 (UDS). Users must adhere to local road traffic laws and safety regulations. High-risk features (such as track mode disablers) are intended exclusively for track or off-road use.
