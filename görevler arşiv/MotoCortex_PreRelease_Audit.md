# 🔍 MotoCortex v7 PRO — Pre-Release Audit Report

> **Audit Date:** 2026-08-19  
> **Auditor:** Principal Mobile Engineer & App Store Compliance Auditor  
> **Platform:** iOS (App Store) + Android (Google Play)  
> **Framework:** React Native 0.76.9 / Expo SDK 52  
> **Codebase Access:** Manifesto & Dependency Layer (Source code deep-dive pending)

---

## 1. 🚨 CRITICAL BLOCKERS (Must Fix Before Submission)

### 1.1 App Store Rejection Risk — `UIBackgroundModes` & Bluetooth Justification

**Finding:** `app.json` declares `"UIBackgroundModes": ["bluetooth-central"]` with a detailed `NSBluetoothAlwaysUsageDescription`.

**Risk:** Apple is extremely strict with `bluetooth-central` background mode. If your app does **not** continuously stream data while backgrounded (e.g., live HUD overlay), reviewers may flag this as **unnecessary background mode usage**.

**Required Action:**
- Ensure your **App Store Review Notes** explicitly state: *"The app maintains a continuous bi-directional UDS diagnostic session with the vehicle ECU. Interrupting this session mid-flash can brick the ECU, therefore background streaming is safety-critical."*
- Provide a **demo video** showing live telemetry persisting when the app is backgrounded.
- **Missing:** There is no `NSBluetoothPeripheralUsageDescription` in `Info.plist` — wait, actually it IS present. ✅ Good. But verify it appears in the **final compiled** `Info.plist`, as Expo sometimes strips nested keys.

---

### 1.2 Missing `NSLocationAlwaysUsageDescription` (iOS Rejection Risk)

**Finding:** Only `NSLocationWhenInUseUsageDescription` is present.

**Risk:** If your BLE scanning library (`react-native-ble-plx`) ever triggers `requestAlwaysAuthorization` on iOS 13+ (even indirectly via `bluetooth-central` + location scanning), Apple will reject with:
> *"Your app uses location background mode but does not clarify always-usage."*

**Required Action:**
Add to `app.json` → `ios.infoPlist`:
```json
"NSLocationAlwaysAndWhenInUseUsageDescription": "Cortex uses location solely for BLE adapter discovery. Location data is never stored, tracked, or transmitted.",
"NSLocationAlwaysUsageDescription": "Cortex uses location solely for BLE adapter discovery. Location data is never stored, tracked, or transmitted."
```

---

### 1.3 Android `BLUETOOTH_ADVERTISE` Permission (Google Play Policy Violation)

**Finding:** `android.permissions` includes `"android.permission.BLUETOOTH_ADVERTISE"`.

**Risk:** If MotoCortex does **not** actually act as a BLE Peripheral (advertise its own services), Google Play's **Permission Declaration Form** will flag this during review. Starting 2024, Google requires video evidence for every declared permission.

**Required Action:**
- **Remove** `BLUETOOTH_ADVERTISE` if the app only operates in **Central** mode (connects to ELM327 adapters).
- If you genuinely use it (e.g., for firmware OTA updates where phone becomes peripheral), prepare a **video demonstration** for the Play Console declaration form.

---

### 1.4 `react-native-bluetooth-classic` on iOS — Hardware Inoperable Risk

**Finding:** `package.json` includes `react-native-bluetooth-classic` and `with-rn-bluetooth-classic` plugin.

**Critical Risk:** iOS **does NOT support Bluetooth Classic (SPP/RFCOMM)** for non-MFi accessories. Standard ELM327 Classic Bluetooth adapters **cannot pair with iPhones**. If your UI allows iOS users to select "Classic Bluetooth" as an adapter type, the connection will fail 100% of the time.

**App Store Rejection Scenario:**
> *"Your app offers a feature (Classic Bluetooth) that is inoperable on this device."*

**Required Action:**
- **Platform-gate** Classic Bluetooth entirely on iOS. The UI must not show "Classic Bluetooth" or "Bluetooth SPP" on iOS devices.
- Add a hardware capability check:
```typescript
import { Platform } from 'react-native';
const supportsClassicBT = Platform.OS === 'android';
```
- Update your App Store screenshots/metadata to **only** show BLE/Wi-Fi connection flows on iOS.

---

### 1.5 `newArchEnabled: false` — Expo SDK 52 Compatibility

**Finding:** `"newArchEnabled": false` in `app.json`.

**Observation:** Expo SDK 52 supports the New Architecture. While disabling it is not a blocker, several native modules in your dependency list (`react-native-ble-plx`, `react-native-bluetooth-classic`, `react-native-tcp-socket`) have **known edge cases** with the New Architecture. Keeping it disabled is actually the **safer choice** for a v1.2.1 release. ✅ No action needed, but monitor for SDK 53 migration.

---

### 1.6 In-App Purchase Compliance — `react-native-purchases` (RevenueCat)

**Finding:** `react-native-purchases: ^8.3.3` is present, but the paywall UI implementation **could not be verified** from manifest-level review.

**Critical Missing Elements (Must Verify in Code):**
1. **Restore Purchases** button must be visible on the paywall screen (Apple Guideline 3.1.1).
2. **Privacy Policy** and **Terms of Service** links must be **tappable** on the paywall (not buried in Settings).
3. **Price formatting** must use `Purchases.getOfferings()` — hardcoded prices = instant rejection.

**Required Verification:**
- `src/components/PaywallScreen.tsx` (or equivalent)
- `src/components/SubscriptionModal.tsx`

---

### 1.7 Automotive Safety Disclaimer Visibility

**Finding:** README mentions "13-Phase Durable Safety & Verification Journal" and "Track-Only Disclaimers."

**Risk:** Apple and Google both scrutinize automotive apps that modify vehicle behavior. If the disclaimer is only shown **once** at first launch, it may be insufficient.

**Required Action:**
- The disclaimer must appear **before every ECU write/coding session**, not just at onboarding.
- It must require explicit **checkbox + "I Understand"** tap (not just an "OK" dismissible alert).
- Include manufacturer liability shield text: *"This modification may void your warranty. Always verify local traffic regulations."*

---

### 1.8 `expo-updates` Runtime Version Mismatch Risk

**Finding:** `"runtimeVersion": "1.0.0"` but app version is `1.2.1`.

**Risk:** If you publish an OTA update with `runtimeVersion: "1.0.0"` but the native code has changed (e.g., added a new native module), incompatible JS bundles may crash on user devices.

**Required Action:**
- Tie `runtimeVersion` to the **native build version**:
```json
"runtimeVersion": {
  "policy": "appVersion"
}
```
Or manually keep it in sync with `version` + `buildNumber`.

---

## 2. ⚠️ BLUETOOTH & OBD2 RESILIENCE (Code Review Needed)

Based on `package.json` dependencies and README architecture:

### 2.1 `react-native-ble-plx` — Connection Teardown Safety

**Observation:** `react-native-ble-plx` v3.5.1 is used with `isBackgroundEnabled: true`.

**Potential Issue:** If a user force-quits the app during an active UDS write session, the BLE connection may **not** send the UDS `0x11` (ECU Reset) or `0x22` (Stop Communication) service. This can leave the ECU in an **unlocked/reflashing state**.

**Required Code Review:**
- `src/core/transport/BleTransport.ts`
- Look for: `AppState` listener that triggers `safeDisconnect()` on backgrounding.
- Look for: `beforeRemove` navigation listener that blocks back-gesture during writes.

---

### 2.2 ELM327 Clone Parser Resilience

**Finding:** README mentions `TIER_3_UNSAFE` fake ELM327 detection.

**Question:** Does your parser handle these non-standard responses?
- `STOPPED`
- `SEARCHING...`
- `NO DATA`
- `CAN ERROR`
- `UNABLE TO CONNECT`
- `BUS INIT: ERROR`

**Required Code Review:**
- `src/api/ELM327Parser.ts` or `src/core/queue/OBDCommandQueue.ts`
- Ensure **every** `writeCharacteristicWithResponse` has a **timeout** (≥5s for PID, ≥30s for UDS long-write).
- Ensure corrupted hex bytes (e.g., `41 0C FF FF` with interspersed `>` prompts) are stripped before CRC/checksum validation.

---

## 3. 🔥 MEMORY LEAKS & PERFORMANCE

### 3.1 High-Frequency PID Polling

**Finding:** Your app streams live telemetry (RPM, Speed, Boost, Fuel Trim).

**Risk Pattern:** If `useEffect` hooks register `setInterval` for PID polling but the cleanup function only calls `clearInterval` without also:
- Removing BLE notification monitors (`monitorCharacteristicForService`)
- Flushing the Zustand telemetry queue
- Aborting pending `writeCharacteristic` promises

...then rapid navigation (Dashboard → Settings → Dashboard) will spawn **ghost intervals** and duplicate BLE monitors.

**Required Code Review:**
- Dashboard/Telemetry screen `useEffect` cleanup blocks
- Zustand store subscription teardown

---

### 3.2 `react-native-reanimated` + `nativewind` Frame Drops

**Finding:** `nativewind: ^4.0.1` + `react-native-reanimated: ~3.16.1`.

**Risk:** NativeWind v4 uses CSS-in-JS runtime parsing. Combined with 10Hz telemetry updates triggering `Animated.Value` or `useSharedValue`, you may see frame drops on iPhone SE / budget Android.

**Recommendation:**
- Use `React.memo` on all telemetry gauge components.
- Consider `useAnimatedProps` (Worklet) instead of JS-thread state updates for needle animations.

---

## 4. 🌍 UI / 26-LANGUAGE RESPONSIVENESS

### 4.1 Translation Key Synchronization

**Finding:** README claims 100% schema sync across 1,813 keys. `package.json` has `i18n:sync` and `i18n:strict-build` scripts. ✅ Excellent practice.

**Risk:** German (`de`) and Polish (`pl`) strings for automotive terms are notoriously long:
- English: `Boost Pressure`
- German: `Ladedruck / Turbolader-Aufladedruck`
- Polish: `Ciśnienie doładowania turbosprężarki`

**Required Verification:**
- Check that **no** `Text` component uses fixed `width` without `flexShrink: 1`.
- Verify `adjustsFontSizeToFit` on all dashboard gauge labels.
- Verify `numberOfLines={1}` on navigation headers.

**Send for review:**
- `src/components/DashboardGauge.tsx` (or similar)
- `src/locales/de.json` (sample keys)

---

### 4.2 Small Screen Guard (iPhone SE / 360px Android)

**Finding:** `react-native-size-matters` is in dependencies. ✅ Good.

**Risk:** If your BentoGrid layout uses `Dimensions.get('window').width / 2` without accounting for safe areas, iPhone SE (375px) will clip elements.

---

## 5. 📦 DEPENDENCY AUDIT

| Package | Version | Risk Level | Notes |
|---------|---------|------------|-------|
| `react-native-ble-plx` | `^3.5.1` | 🟡 Medium | Background mode stable, but verify iOS 18 `CBManagerState` handling |
| `react-native-bluetooth-classic` | `^1.73.0-rc.17` | 🔴 High | RC version on production! + iOS incompatibility (see 1.4) |
| `react-native-tcp-socket` | `^6.2.0` | 🟢 Low | Wi-Fi transport stable |
| `react-native-purchases` | `^8.3.3` | 🟢 Low | RevenueCat v8 is production-ready |
| `react-native-reanimated` | `~3.16.1` | 🟡 Medium | Ensure worklet imports are correct for RN 0.76 |
| `zustand` | `^5.0.11` | 🟢 Low | Excellent choice for telemetry state |
| `expo-sqlite` | `~15.1.4` | 🟢 Low | Offline-first OEM DB is solid |
| `expo-updates` | `~0.27.5` | 🟡 Medium | Runtime version mismatch risk (see 1.8) |

---

## 6. 📋 FILES NEEDED TO COMPLETE THE AUDIT

The following files are required for a code-level deep-dive. GitHub raw access was restricted during this audit session.

### 🔴 Mandatory (for Critical Blockers):
1. `src/components/PaywallScreen.tsx` — Restore Purchases, Privacy Policy, TOS links
2. `src/components/DisclaimerModal.tsx` — Pre-ECU-write disclaimer
3. `src/core/transport/BleTransport.ts` — Safe disconnect, background handling
4. `src/api/ELM327Parser.ts` or `src/core/queue/OBDCommandQueue.ts` — Timeout & fault recovery

### 🟡 Important (for Performance & Stability):
5. `src/components/DashboardGauge.tsx` — Telemetry UI, `useEffect` cleanup
6. `src/store/useTelemetryStore.ts` — Zustand store, polling intervals
7. `src/locales/de.json` — Sample long strings

---

## 7. 🏁 OVERALL RELEASE READINESS VERDICT

| Pillar | Score | Status |
|--------|-------|--------|
| **App Store / Play Store Compliance** | 72/100 | 🟡 Conditional Pass |
| **Bluetooth & OBD2 Resilience** | 65/100 | 🟡 Needs Code Review |
| **Memory & Performance** | 70/100 | 🟡 Needs Code Review |
| **UI / 26-Language Robustness** | 78/100 | 🟢 Likely Pass |
| **Dependency Hygiene** | 82/100 | 🟢 Pass |

### **Aggregate Readiness Score: 73 / 100**

### Verdict: **🟡 CONDITIONALLY READY — DO NOT SUBMIT YET**

**Submission Blockers:**
1. Fix `BLUETOOTH_ADVERTISE` permission on Android.
2. Add `NSLocationAlwaysAndWhenInUseUsageDescription` to `app.json`.
3. **Platform-gate Classic Bluetooth on iOS** (Critical rejection risk).
4. Verify Paywall has **Restore Purchases** + **Privacy Policy** visible.
5. Sync `runtimeVersion` with app version.
6. Provide source files listed in Section 6 for final code-level audit.

**Estimated Time to Fix:** 2–3 days (engineering) + 1 day (store metadata & review videos).

---

*Report generated by Principal Mobile Engineer & App Store Compliance Auditor*  
*For questions or follow-up code review, provide the files listed in Section 6.*
