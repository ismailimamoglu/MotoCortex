# 🌐 i18n Architectural Audit & Drift Report

> **Audit Date:** August 9, 2026  
> **Master Schema:** [`src/locales/en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json) (1,813 total keys: 1,535 leaf nodes, 278 object nodes)  
> **Target Locales:** 25 JSON files under [`src/locales/`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales) (`ar.json`, `cs.json`, `da.json`, `de.json`, `el.json`, `es.json`, `fi.json`, `fr.json`, `hi.json`, `hu.json`, `id.json`, `it.json`, `ja.json`, `ko.json`, `nl.json`, `no.json`, `pl.json`, `pt.json`, `ro.json`, `ru.json`, `sv.json`, `th.json`, `tr.json`, `uk.json`, `zh.json`)  
> **Scanned UI Codebase:** 54 TypeScript/React Native UI files (`src/screens/`, `src/components/`, `App.tsx`)

---

## 🎯 Executive Summary

A full architectural audit of the MotoCortex internationalization (i18n) subsystem was conducted across all 26 translation files and 54 UI components. 

The audit revealed three major categories of structural drift and localization bypasses:

1. **Master Schema Gap (`en.json` Missing Keys)**: Master schema [`en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json) is **missing 20 `report.*` keys** present in target locale files (`report.speed`, `report.noDtcs`, `report.coolant`, `report.throttle`, `report.engineLoad`, `report.intakeAir`, `report.manifold`, etc.). Because [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2422) executes `i18n.t('report.speed')`, English users suffer missing key fallbacks while target languages render localized values.
2. **650 Inline Literal Fallbacks Bypassing Global Resolution**: Across 49 UI components (including 29 in [`DashboardSandbox.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/sandbox/DashboardSandbox.tsx#L97) and 79 in [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L428)), code calls `t('key', 'Default Literal')`. This bypasses i18next's `fallbackLng: 'en'` global resolution, hides translation key missingness in target languages, and prevents the production Crashlytics telemetry handler ([`src/i18n.ts`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/i18n.ts#L91)) from reporting missing keys.
3. **157 Hardcoded User-Facing Raw Strings Outside `t()`**: Found in 23 UI screens and components, notably [`EvDashboardScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/EvDashboardScreen.tsx) (29 unlocalized strings), [`SgwUnlockModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SgwUnlockModal.tsx) (19 unlocalized strings), and [`PrivacySettingsScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/PrivacySettingsScreen.tsx) (19 unlocalized strings).

---

## 1. 📐 Structural Schema Validation Report

Cross-referencing all 25 target locale JSON files against the Master Schema ([`src/locales/en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json)):

> [!IMPORTANT]
> **Schema Metrics Summary**:
> - **Missing Keys in Target Files vs Master**: `0`
> - **Nested Object Depth Mismatches**: `0` (Structure hierarchy is 100% aligned across all 26 files)
> - **Extra/Orphaned Keys in Target Files vs Master**: `1,868` total instances across 25 target files

### 1.1 Master Schema Key Deficit (`en.json` Missing `report.*` Keys)
The following **20 translation keys** exist in target locale files (e.g. [`tr.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/tr.json), [`fr.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/fr.json), [`de.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/de.json)) and are called at runtime in [`src/screens/MainApp.tsx:L2415-L2431`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2415-L2431), but are **completely absent from [`en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json)**:

| Key Identifier | Status in `en.json` | Status in Target Locales | Called in Code |
| :--- | :---: | :---: | :--- |
| `report.vehicleIdentity` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.vin` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.odometer` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.milDist` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.distSinceCleared` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.dtcCount` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.sensorData` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.noData` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.proApp` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.date` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.vinNotFound` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.noDtcs` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2422`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2422) |
| `report.speed` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2426`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2426) |
| `report.coolant` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2427`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2427) |
| `report.throttle` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2428`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2428) |
| `report.engineLoad` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2429`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2429) |
| `report.intakeAir` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2430`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2430) |
| `report.manifold` | ❌ Missing | ✅ Present | [`MainApp.tsx#L2431`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2431) |
| `report.voltage` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |
| `report.shareMessage` | ❌ Missing | ✅ Present | [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) |

### 1.2 Target Locale Extra / Orphaned Keys Breakdown
In addition to the 20 `report.*` keys, 24 target locale files (all except `tr.json`) contain **57 legacy orphaned keys** under `dtc.*` (`dtc.P0100` ... `dtc.P0563`) and `sensor.*` (`sensor.rpm` ... `sensor.fuel`) that were pruned from `en.json`.

| Locale File | Missing Keys | Extra Keys | Key Count | Schema Alignment Status |
| :--- | :---: | :---: | :---: | :--- |
| [`locales/en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json) | **MASTER** | **0** | 1,813 | Master Schema Reference |
| [`locales/tr.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/tr.json) | 0 | 20 | 1,833 | ⚠️ 20 `report.*` extra keys |
| [`locales/ar.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/ar.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/cs.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/cs.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/da.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/da.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/de.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/de.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/el.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/el.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/es.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/es.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/fi.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/fi.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/fr.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/fr.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/hi.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/hi.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/hu.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/hu.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/id.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/id.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/it.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/it.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/ja.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/ja.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/ko.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/ko.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/nl.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/nl.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/no.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/no.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/pl.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/pl.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/pt.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/pt.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/ro.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/ro.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/ru.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/ru.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/sv.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/sv.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/th.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/th.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/uk.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/uk.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |
| [`locales/zh.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/zh.json) | 0 | 77 | 1,890 | ⚠️ 20 `report.*` + 57 legacy extra keys |

---

## 2. 🔍 Hardcoded String & Fallback Scan

> [!WARNING]
> **Code Scan Totals Across 54 UI Files**:
> - **Total Inline Literal Fallbacks in `t(...)`**: **650** instances in 49 files
> - **Total Hardcoded User-Facing Raw Strings outside `t()`**: **157** instances in 23 files

### 2.1 Inline Literal Fallbacks in `t()` Calls (Bypassing Global Fallback System)

Passing a string literal as the 2nd argument to `t('key', 'Literal Fallback')` or `{ defaultValue: 'Literal Fallback' }` overrides i18next's `fallbackLng: 'en'` configuration in [`src/i18n.ts`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/i18n.ts#L68). When a key is missing in a non-English locale, i18next evaluates the inline literal instead of falling back to `en.json` or triggering `missingKeyHandler`. Furthermore, in files like [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L428), non-English fallback strings (Turkish) are hardcoded directly inside `t()` calls!

#### Key Highlights & Specific Examples:

1. **[`src/screens/sandbox/DashboardSandbox.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/sandbox/DashboardSandbox.tsx)** (29 Inline Fallbacks):
   - **Line 97**: `t('sandbox.connected', 'Connected')`
   - **Line 99**: `t('sandbox.connecting', 'Connecting...')`
   - **Line 101**: `t('sandbox.error', 'Error')`
   - **Line 103**: `t('sandbox.notConnected', 'Not Connected')`
   - **Line 567**: `t('sandbox.title', 'Sandbox Telemetry Control')`
   - **Line 573**: `t('common.close', 'CLOSE')`
   - **Line 611**: `t('sandbox.stopDisconnect', 'Stop / Disconnect')`
   - **Line 619**: `t('obdTerminal.statsTitle', 'OBD HEALTH STATISTICS')`
   - **Line 666**: `t('sandbox.dtcTitle', 'DTC DIAGNOSTICS & FAULT CODES')`
   - **Line 690**: `t('sandbox.readDtcs', 'READ DTC')`
   - **Line 699**: `t('sandbox.clearDtcs', 'CLEAR DTC')`
   - **Line 724**: `t('sandbox.terminalTitle', 'Live Terminal & Bus Monitor')`
   - **Line 763**: `t('obdTerminal.inputPlaceholder', 'Enter command...')`

2. **[`src/screens/MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx)** (79 Inline Fallbacks):
   - **Line 428**: `t('bento.settings.noConnection', 'Bağlantı Yok')` *(Turkish literal fallback in code)*
   - **Line 431**: `t('bento.settings.deviceNotConnected', 'Cihaz Bağlı Değil')` *(Turkish literal fallback in code)*
   - **Line 945**: `t('bento.realtimeData', 'CANLI VERİ AKIŞI')` *(Turkish literal fallback in code)*
   - **Line 1021**: `t('dashboard.customizeButton', 'GÖSTERGELERİ DÜZENLE')` *(Turkish literal fallback in code)*
   - **Line 1170**: `t('info.supportSubject', 'Cortex OBD2 Diagnostic Scanner Support Ticket')`

3. **[`src/screens/ConnectionFlowScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/ConnectionFlowScreen.tsx)** (49 Inline Fallbacks):
   - **Line 124**: `t('connection.scanningDevices', 'Searching for OBD-II Adapters...')`
   - **Line 135**: `t('connection.connectingAdapter', 'Connecting to ELM327 / vLinker...')`
   - **Line 150**: `t('connection.retry', 'RETRY CONNECTION')`

---

### 2.2 Hardcoded User-Facing Raw Strings Outside `t()` Calls

These are raw, unlocalized human-readable text strings directly embedded in JSX element children or user-facing prop attributes without any `t()` wrapper.

#### Key Highlights & Specific Examples:

1. **[`src/screens/EvDashboardScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/EvDashboardScreen.tsx)** (29 Hardcoded Strings):
   - Raw string nodes: `"Battery State of Health (SOH)"`, `"Cell Voltage Delta / Imbalance"`, `"Max Charge Rate (kW)"`, `"High Voltage System Status"`, `"Thermal Management System Active"`, `"Regenerative Braking Power"`.

2. **[`src/components/AdminSecretModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/AdminSecretModal.tsx)** (21 Hardcoded Strings):
   - Raw string nodes: `"Developer Secret Menu"`, `"Override Adapter Protocol"`, `"Simulate ECU Timeout"`, `"Force CAN Bus Error Rate"`, `"Clear Local Cache & Storage"`.

3. **[`src/screens/PrivacySettingsScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/PrivacySettingsScreen.tsx)** (19 Hardcoded Strings):
   - Raw string nodes: `"Telemetry & Diagnostic Data Sharing"`, `"Allow Anonymous Crash Logs"`, `"Opt out of location-assisted DTC enrichment"`, `"Export My Diagnostic Data"`.

4. **[`src/components/SgwUnlockModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SgwUnlockModal.tsx)** (19 Hardcoded Strings):
   - Raw string nodes: `"Security Gateway (SGW) Protection Detected"`, `"FCA / Chrysler Security Gateway Active"`, `"Unlock Required for Clearing DTCs"`, `"Connect AutoAuth Account"`.

5. **[`src/screens/MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx)** (10 Hardcoded Strings):
   - Raw string nodes: `"AI DOCTOR"`, `"LIVE ENGINE COCKPIT"`, `"PERFORMANCE MONITOR"`, `"ECU REPORT GENERATOR"`.

---

## 3. 📋 Complete File-by-File Drift Matrix

Below is the complete audit breakdown across all 54 UI files scanned:

| File Path | Inline Fallbacks in `t()` | Hardcoded Strings Outside `t()` | Severity Classification |
| :--- | :---: | :---: | :--- |
| [`src/screens/MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx) | **79** | **10** | 🔴 Critical (Non-English fallbacks in code) |
| [`src/screens/ConnectionFlowScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/ConnectionFlowScreen.tsx) | **49** | **7** | 🔴 Critical (High fallback density) |
| [`src/screens/ObdHealthScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/ObdHealthScreen.tsx) | **38** | 0 | 🟡 Warning (Inline fallbacks only) |
| [`src/screens/EvDashboardScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/EvDashboardScreen.tsx) | 0 | **29** | 🔴 Critical (100% Unlocalized UI) |
| [`src/screens/PrivacySettingsScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/PrivacySettingsScreen.tsx) | 0 | **19** | 🔴 Critical (100% Unlocalized UI) |
| [`src/screens/sandbox/DashboardSandbox.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/sandbox/DashboardSandbox.tsx) | **29** | 0 | 🟡 Warning (Inline fallbacks) |
| [`src/screens/sandbox/VehicleConfirmationModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/sandbox/VehicleConfirmationModal.tsx) | **23** | **3** | 🟡 High |
| [`src/screens/sandbox/SandboxDevGate.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/sandbox/SandboxDevGate.tsx) | **2** | 0 | 🟢 Low |
| [`src/screens/ContextualMarketplace.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/ContextualMarketplace.tsx) | **3** | 0 | 🟢 Low |
| [`src/components/FeatureActivationModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/FeatureActivationModal.tsx) | **38** | 0 | 🟡 Warning |
| [`src/components/Paywall.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/Paywall.tsx) | **37** | **1** | 🟡 High |
| [`src/components/LiveEngineHero.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/LiveEngineHero.tsx) | **32** | 0 | 🟡 Warning |
| [`src/components/SecretDebugModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SecretDebugModal.tsx) | **31** | **3** | 🟡 High |
| [`src/components/BentoGrid.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/BentoGrid.tsx) | **25** | 0 | 🟡 Warning |
| [`src/components/SearchableVehicleSelect.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SearchableVehicleSelect.tsx) | **23** | 0 | 🟡 Warning |
| [`src/components/PermissionGateway.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/PermissionGateway.tsx) | **21** | 0 | 🟡 Warning |
| [`src/components/AdminSecretModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/AdminSecretModal.tsx) | **21** | **21** | 🔴 Critical |
| [`src/components/ServiceResetModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/ServiceResetModal.tsx) | **17** | **2** | 🟡 High |
| [`src/components/HardwareHealthModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/HardwareHealthModal.tsx) | **15** | 0 | 🟡 Warning |
| [`src/components/live-engine/EcuStatusBar.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/EcuStatusBar.tsx) | **15** | 0 | 🟡 Warning |
| [`src/components/BluetoothBridgeInitializer.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/BluetoothBridgeInitializer.tsx) | **14** | 0 | 🟡 Warning |
| [`src/components/EvBmsMonitorModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/EvBmsMonitorModal.tsx) | **14** | **4** | 🟡 High |
| [`src/components/ContextualPaywallModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/ContextualPaywallModal.tsx) | **12** | 0 | 🟡 Warning |
| [`src/components/live-engine/HardwareHealthCard.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/HardwareHealthCard.tsx) | **11** | 0 | 🟡 Warning |
| [`src/components/CustomizeDashboardModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/CustomizeDashboardModal.tsx) | **10** | 0 | 🟡 Warning |
| [`src/components/live-engine/BluetoothConnectionPanel.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/BluetoothConnectionPanel.tsx) | **9** | 0 | 🟢 Low |
| [`src/components/DisclaimersModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/DisclaimersModal.tsx) | **7** | 0 | 🟢 Low |
| [`src/components/AiDoctorModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/AiDoctorModal.tsx) | **7** | 0 | 🟢 Low |
| [`src/components/LeanAngleCockpitWidget.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/LeanAngleCockpitWidget.tsx) | **7** | **4** | 🟡 High |
| [`src/components/VehicleHealthScoreWidget.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/VehicleHealthScoreWidget.tsx) | **6** | 0 | 🟢 Low |
| [`src/components/live-engine/RegisteredVehicleList.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/RegisteredVehicleList.tsx) | **5** | 0 | 🟢 Low |
| [`src/components/AboutView.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/AboutView.tsx) | **4** | 0 | 🟢 Low |
| [`src/components/DctResetModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/DctResetModal.tsx) | **4** | **1** | 🟢 Low |
| [`src/components/FreezeFrameModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/FreezeFrameModal.tsx) | **4** | **2** | 🟢 Low |
| [`src/components/InspectionReportView.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/InspectionReportView.tsx) | **4** | **9** | 🟡 High |
| [`src/components/PerformanceModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/PerformanceModal.tsx) | **4** | **4** | 🟡 High |
| [`src/components/VehicleSelectModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/VehicleSelectModal.tsx) | **4** | 0 | 🟢 Low |
| [`src/components/live-engine/VehicleOperationsHistory.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/VehicleOperationsHistory.tsx) | **4** | 0 | 🟢 Low |
| [`src/components/SgwStatusNotification.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SgwStatusNotification.tsx) | **3** | 0 | 🟢 Low |
| [`src/components/live-engine/VehicleSelector.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/live-engine/VehicleSelector.tsx) | **3** | 0 | 🟢 Low |
| [`src/components/ChronicFaultsWidget.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/ChronicFaultsWidget.tsx) | **2** | 0 | 🟢 Low |
| [`src/components/FeatureMarketplaceView.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/FeatureMarketplaceView.tsx) | **2** | **4** | 🟢 Low |
| [`src/components/LanguageSelectionView.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/LanguageSelectionView.tsx) | **2** | 0 | 🟢 Low |
| [`src/components/MultiEcuScanModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/MultiEcuScanModal.tsx) | **2** | 0 | 🟢 Low |
| [`src/components/QuickSettingsModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/QuickSettingsModal.tsx) | **2** | 0 | 🟢 Low |
| [`src/components/SelectionModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SelectionModal.tsx) | **2** | 0 | 🟢 Low |
| [`src/components/BatteryTestModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/BatteryTestModal.tsx) | **1** | **3** | 🟢 Low |
| [`src/components/DpfMonitorModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/DpfMonitorModal.tsx) | **1** | **2** | 🟢 Low |
| [`src/components/HorsepowerModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/HorsepowerModal.tsx) | **1** | **6** | 🟡 High |
| [`src/components/IgnitionWarningModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/IgnitionWarningModal.tsx) | **1** | 0 | 🟢 Low |
| [`src/components/SgwUnlockModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SgwUnlockModal.tsx) | 0 | **19** | 🔴 Critical |
| [`App.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/App.tsx) | 0 | **4** | 🟢 Low |

---

## 🛠️ Recommended Remediation Plan

1. **Update Master Schema ([`src/locales/en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json))**:
   - Synchronize the 20 missing `report.*` keys into `en.json` so English users do not experience fallback failure when rendering diagnostic reports in [`MainApp.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/MainApp.tsx#L2422).
2. **Purge Inline Literal Fallbacks**:
   - Refactor `t('key', 'Literal Fallback')` calls across components to `t('key')`. Ensure all translation keys are present in [`en.json`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json) so `fallbackLng: 'en'` handles resolution globally and missing keys trigger telemetry appropriately.
3. **Wrap Hardcoded UI Strings**:
   - Wrap unlocalized strings in [`EvDashboardScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/EvDashboardScreen.tsx), [`SgwUnlockModal.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/SgwUnlockModal.tsx), and [`PrivacySettingsScreen.tsx`](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/screens/PrivacySettingsScreen.tsx) with `t('ev.soh')`, `t('sgw.title')`, etc., and add corresponding translation keys across all 26 locale files.
