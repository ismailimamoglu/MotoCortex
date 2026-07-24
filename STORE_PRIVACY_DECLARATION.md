# Store Privacy & Permission Declaration Guide (Google Play & Apple App Store)

This document provides ready-to-use justification texts and privacy compliance statements for submitting **Cortex OBD2 Diagnostic Scanner** to the **Apple App Store** and **Google Play Console**.

---

## 1. Google Play Console - Permission Justification Declarations

### A. Location Permission (`ACCESS_FINE_LOCATION`)
- **Reason**: Android versions 11 and below require `ACCESS_FINE_LOCATION` to perform Bluetooth Classic (SPP) and Bluetooth Low Energy (BLE) device discovery.
- **Data Usage Statement**: Cortex OBD2 Diagnostic Scanner uses location permissions **EXCLUSIVELY** to scan for nearby ELM327 / OBD2 diagnostic adapters plugged into the user's vehicle. Location coordinates are **NEVER** tracked, logged, stored on disk, or transmitted to any external server.
- **Store Declaration Copy**:
  > "Cortex OBD2 Diagnostic Scanner requests location access solely to scan for nearby vehicle OBD2/ELM327 Bluetooth diagnostic adapters on Android 11 and older devices as required by the Android OS. The application does not collect, record, or share user location data."

### B. Bluetooth Permissions (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`)
- **Reason**: Required to discover, pair, and stream real-time CAN bus telemetry data (RPM, coolant temp, speed, DTC error codes) between the app and the vehicle's ECU via Bluetooth Classic / BLE hardware.
- **Store Declaration Copy**:
  > "Bluetooth permissions are required to establish an encrypted diagnostic link with your vehicle's ELM327/OBD2 hardware adapter for real-time engine monitoring and trouble code scanning."

---

## 2. Apple App Store - Privacy & Info.plist Justifications

### A. `NSBluetoothAlwaysUsageDescription`
> "Cortex OBD2 Diagnostic Scanner uses Bluetooth to maintain a constant diagnostic link with your vehicle's ECU via BLE adapters, enabling live performance monitoring and real-time alerts even when the app is in the background or the screen is off."

### B. `NSBluetoothPeripheralUsageDescription`
> "Cortex OBD2 Diagnostic Scanner requires access to discover and connect to your vehicle's ELM327/OBD2 diagnostic adapter for engine data streaming."

### C. `NSLocationWhenInUseUsageDescription`
> "iOS requires Location access to perform Bluetooth Low Energy (BLE) device scanning. Cortex OBD2 Diagnostic Scanner does NOT track, store, or share your movement data."

---

## 3. UNECE R155 & GDPR Compliance Checklist
- **No Unsolicited Tracking**: No background GPS tracking is performed.
- **Data Anonymization**: Vehicle Identification Numbers (VIN) and OBD data logged on device caches are automatically masked (`1FA6P8CF******1289`).
- **User Consent**: ECU Coding and parameter modifications require explicit two-stage checkbox acknowledgment (`DisclaimersModal`).
