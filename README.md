# 🏍️ MotoCortex — Next-Gen Vehicle Diagnostics & UDS ECU Coding Platform

[![React Native](https://img.shields.io/badge/React_Native-Expo_v52-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-40_Suites_|_368_Passed-2EA44F?logo=jest&logoColor=white)](https://jestjs.io/)
[![UDS ISO-14229](https://img.shields.io/badge/Protocol-ISO_14229_UDS_|_ISO_13400_DoIP_|_CAN_FD-FF6F00)](https://www.iso.org/standard/72439.html)
[![SGW Bypass](https://img.shields.io/badge/Security-SGW_Bypass_Engine_(SFD/FCA/BMW)-00E5FF)](src/core/security/SgwBypassEngine.ts)
[![Offline-First](https://img.shields.io/badge/Architecture-Offline--First_Engine-4A154B)](https://motocortex.app)
[![Locales](https://img.shields.io/badge/Locales-26_Languages_Matrix-8E44AD)](src/locales/)

**MotoCortex** is an enterprise-grade, offline-first mobile vehicle diagnostics, **ISO 13400 DoIP**, **CAN FD 64-byte**, and **UDS ECU Coding / Hidden Feature Activation platform** built for **Motorcycles (BMW Motorrad, Ducati, KTM, Yamaha, Honda, Harley-Davidson)**, **Modern & Next-Gen EV Platforms (BYD, MG, XPeng, NIO, Xiaomi SU7)**, and **Global Car Manufacturers (VW Group, BMW, Mercedes-Benz, Ford, Toyota, Hyundai/Kia, Stellantis, GM, Volvo, Tesla)**.

---

## ✨ Key Features

### 🛠️ 1. 208+ Global OEM Hidden Features & UDS ECU Coding
- **Motorcycle UDS Library (35 Features):** Shift Assistant Pro re-adaptation, Dynamic ESA zero-point calibration, ABS Pro cornering mode, Track lap timers, and EBC engine brake control.
- **China & Global EV Platforms (18 Features):** V2L 3.6kW power expansion, AVAS low-speed pedestrian siren mute, manual battery pre-heating, and Xiaomi SU7 Drift Mode torque vectoring.
- **Retrofit Hardware Integration (12 Features):** Coding for aftermarket parking distance sensors (PDC), 360° surround camera view, LED license plate error cancel, heated windshield/steering wheel modules, and tow bar electrical integration.
- **Security Gateway (SGW) Bypass:** Challenge-response unlocking for VAG SFD 1/2, FCA SGW, and BMW/Mercedes Central Gateways.
- **Deep Car Brand Coverage (122+ Features):** VAG Gauge Staging, BMW Sport Displays, Mercedes AMG Telemetry, Ford Bambi Mode, Toyota Soft-Close Door Retrofit, Hyundai N Grin Shift, and GM AFM V8 Cylinder Deactivation Override.

---

### 🔋 2. Electric & Hybrid Vehicle (EV/PHEV) Suite
- **BMS Battery Cell Balancing:** Real-time cell voltage delta (mV) and state-of-health (%SOH) calculation.
- **High-Voltage Isolation Monitoring:** Isolation resistance (kΩ) leak detection and safety status rating (`OPTIMAL`, `FAIR`, `DEGRADED`, `CRITICAL_ISOLATION_FAULT`).

---

### 🧠 3. AI Doctor Diagnostic Specialist
- **Dual-Engine Architecture:** Server-side Deno Edge Function (`supabase/functions/ai-doctor`) proxies requests securely to Gemini 1.5 Flash for deep diagnostic reasoning.
- **Deterministic Offline Fallback:** Automatically switches to an embedded offline rule engine and DTC dictionary whenever cellular signal is unavailable.

---

### 🛡️ 4. 13-Phase Durable Safety & Verification Journal
- **Voltaj Block Protection:** ECU write operations are strictly blocked if battery voltage drops below `11.8V` or `12.2V` based on feature risk level.
- **1-Click Rollback Snapshot:** Automatic full UDS DID byte backup prior to any write execution.
- **Track-Only Disclaimers:** Explicit track/private property safety disclaimers for high-risk performance modifications.

---

### 🔌 5. Multi-Protocol Hardware Abstraction Layer
- **Adapter Support:** Seamless connection via BLE (Bluetooth Low Energy), Classic Bluetooth, and Wi-Fi.
- **Next-Gen Protocols:** Support for CAN FD (64-byte payload at 8 Mbps) and ISO 13400 DoIP (Diagnostic over IP).
- **Tiered Adapter Validation:**
  - `TIER_1_PRO`: STN2120, vLinker MC+, UniCarScan, OBDLink MX+ (Full Write & UDS 0x27 Security Access Allowed).
  - `TIER_2_STANDARD`: PIC18F25K80 ELM327 v1.5 (Whitelisted Read/Write).
  - `TIER_3_UNSAFE`: Fake ELM327 v2.1 (BK3231/APM32) — Write operations 100% blocked for safety.

---

### 🌐 6. 26-Language Matrix Localization & Fastlane ASO
Supported Locales: `EN`, `TR`, `DE`, `FR`, `ES`, `IT`, `JA`, `ZH`, `RU`, `AR`, `PT`, `KO`, `NL`, `SV`, `DA`, `FI`, `NO`, `PL`, `CS`, `HU`, `RO`, `TH`, `UK`, `ID`, `EL`, `HI`.

---

## 🛠 Tech Stack

- **Framework:** React Native / Expo (SDK 52)
- **Language:** TypeScript 5.3 (Strict Mode)
- **Architecture:** Feature-Based (`src/features/`) & De-monolithized Root Provider (`App.tsx` -> `MainApp.tsx`)
- **State & Storage:** Zustand, SQLite, AsyncStorage
- **Backend / Edge Functions:** Supabase Deno Edge Functions
- **Testing:** Jest, Maestro E2E (40 Test Suites, 368 Tests Passed)
- **CI/CD & Deployment:** GitHub Actions CI, Fastlane (App Store Connect / Google Play)


---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18+` or `v20+`
- npm or yarn
- Expo Go app or iOS Simulator / Android Emulator

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

Run the entire automated unit & integration test suite:

```bash
npm test
```

Current Test Coverage:
```text
Test Suites: 40 passed, 40 total
Tests:       368 passed, 368 total
Snapshots:   0 total
Time:        1.93 s
```

---

## 📁 Repository Structure

```text
MotoCortex/
├── src/
│   ├── api/                   # OBD-II & UDS Protocol Execution Engines
│   ├── components/            # UI Components (BentoGrid, Disclaimers, Diagnostic Cards)
│   ├── core/
│   │   ├── database/          # OemDatabaseProvider (208+ OEM Single Source of Truth)
│   │   ├── features/          # FeatureCatalog, FeatureTypes, OemFeatureMapper
│   │   ├── queue/             # OBD Command Scheduler & Queue Management
│   │   ├── security/          # SafetyCriticalEcuRegistry & Command Classifier
│   │   └── transport/         # BLE, Classic Bluetooth, and Wi-Fi Transports
│   ├── locales/               # 26-Language Matrix JSON Translations
│   ├── services/              # AI Doctor Service (Supabase Edge Function Proxy)
│   └── store/                 # Zustand App & Telemetry Stores
├── supabase/
│   └── functions/             # Deno Edge Functions (ai-doctor, verify-entitlement)
├── görevler/                  # Technical Audit & Global Feature Reports
└── package.json
```

---

## ⚖️ License & Disclaimer

MotoCortex is designed for professional diagnostic and vehicle customization purposes. ECU coding operations involve reading and writing vehicle memory blocks via ISO 14229 (UDS). Users must adhere to local road traffic laws and safety regulations. High-risk features (such as track mode disablers) are intended exclusively for track or off-road use.
