# 🏍️ MotoCortex — Next-Gen Vehicle Diagnostics & UDS ECU Coding Platform

[![React Native](https://img.shields.io/badge/React_Native-Expo_v51-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-40_Suites_|_365_Passed-2EA44F?logo=jest&logoColor=white)](https://jestjs.io/)
[![UDS ISO-14229](https://img.shields.io/badge/Protocol-ISO_14229_UDS_|_KWP2000-FF6F00)](https://www.iso.org/standard/72439.html)
[![Offline-First](https://img.shields.io/badge/Architecture-Offline--First_Engine-4A154B)](https://motocortex.app)
[![Locales](https://img.shields.io/badge/Locales-26_Languages_Matrix-8E44AD)](src/locales/)

**MotoCortex** is an enterprise-grade, offline-first mobile vehicle diagnostics and **UDS ECU Coding / Hidden Feature Activation platform** built for **Motorcycles (BMW Motorrad, Ducati, KTM, Yamaha, Honda, Harley-Davidson)**, **Modern & Next-Gen EV Platforms (BYD, MG, XPeng, NIO, Xiaomi SU7)**, and **Global Car Manufacturers (VW Group, BMW, Mercedes-Benz, Ford, Toyota, Hyundai/Kia, Stellantis, GM, Volvo, Tesla)**.

---

## ✨ Key Features

### 🛠️ 1. 208+ Global OEM Hidden Features & UDS ECU Coding
- **Motorcycle UDS Library (35 Features):** Shift Assistant Pro re-adaptation, Dynamic ESA zero-point calibration, ABS Pro cornering mode, Track lap timers, and EBC engine brake control.
- **China & Global EV Platforms (18 Features):** V2L 3.6kW power expansion, AVAS low-speed pedestrian siren mute, manual battery pre-heating, and Xiaomi SU7 Drift Mode torque vectoring.
- **Retrofit Hardware Integration (12 Features):** Coding for aftermarket parking distance sensors (PDC), 360° surround camera view, LED license plate error cancel, heated windshield/steering wheel modules, and tow bar electrical integration.
- **Easter Eggs & Visual Animations (8 Features):** Urban joke alternating light show, custom cluster boot greeting text, hidden gauge mini-games, and seasonal weather theme overlays.
- **ADAS & Driver Assistance Calibration (13 Features):** Lane Keep Assist (LKA) gentle curve intervention, ACC default follow distance lock, Matrix LED glare-free high beam unlock, and steering angle sensor (SAS) zero-point calibration.
- **Deep Car Brand Coverage (122+ Features):** VAG Gauge Staging, BMW Sport Displays, Mercedes AMG Telemetry, Ford Bambi Mode, Toyota Soft-Close Door Retrofit, Hyundai N Grin Shift, and GM AFM V8 Cylinder Deactivation Override.

---

### 🧠 2. AI Doctor Diagnostic Specialist
- **Dual-Engine Architecture:** Server-side Deno Edge Function (`supabase/functions/ai-doctor`) proxies requests securely to Gemini 1.5 Flash for deep diagnostic reasoning.
- **Deterministic Offline Fallback:** Automatically switches to an embedded offline rule engine and DTC dictionary whenever cellular signal is unavailable.

---

### 🛡️ 3. 13-Phase Durable Safety & Verification Journal
- **Voltaj Block Protection:** ECU write operations are strictly blocked if battery voltage drops below `11.8V` or `12.2V` based on feature risk level.
- **1-Click Rollback Snapshot:** Automatic full UDS DID byte backup prior to any write execution.
- **Track-Only Disclaimers:** Explicit track/private property safety disclaimers for high-risk performance modifications.

---

### 🔌 4. Multi-Protocol Hardware Abstraction Layer
- **Adapter Support:** Seamless connection via BLE (Bluetooth Low Energy), Classic Bluetooth, and Wi-Fi.
- **Tiered Adapter Validation:**
  - `TIER_1_PRO`: STN2120, vLinker MC+, UniCarScan, OBDLink MX+ (Full Write & UDS 0x27 Security Access Allowed).
  - `TIER_2_STANDARD`: PIC18F25K80 ELM327 v1.5 (Whitelisted Read/Write).
  - `TIER_3_UNSAFE`: Fake ELM327 v2.1 (BK3231/APM32) — Write operations 100% blocked for safety.

---

### 🌐 5. 26-Language Matrix Localization
Supported Locales: `EN`, `TR`, `DE`, `FR`, `ES`, `IT`, `JA`, `ZH`, `RU`, `AR`, `PT`, `KO`, `NL`, `SV`, `DA`, `FI`, `NO`, `PL`, `CS`, `HU`, `RO`, `TH`, `UK`, `ID`, `EL`, `HI`.

---

## 🛠 Tech Stack

- **Framework:** React Native / Expo (SDK 51)
- **Language:** TypeScript 5.3 (Strict Mode)
- **State & Storage:** Zustand, SQLite, AsyncStorage
- **Backend / Edge Functions:** Supabase Deno Edge Functions
- **Testing:** Jest, React Native Testing Library (40 Test Suites, 365 Tests Passed)
- **Styling:** Custom Responsive Design System (Light/Dark Glassmorphism UI)

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
Tests:       365 passed, 365 total
Snapshots:   0 total
Time:        1.97 s
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
│   └── functions/             # Deno Edge Functions (ai-doctor)
├── görevler/                  # Technical Audit & Global Feature Reports
└── package.json
```

---

## ⚖️ License & Disclaimer

MotoCortex is designed for professional diagnostic and vehicle customization purposes. ECU coding operations involve reading and writing vehicle memory blocks via ISO 14229 (UDS). Users must adhere to local road traffic laws and safety regulations. High-risk features (such as track mode disablers) are intended exclusively for track or off-road use.
