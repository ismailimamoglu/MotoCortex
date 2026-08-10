# MotoCortex — Privacy Policy & Data Handling

**Effective Date:** August 10, 2026  
**Last Updated:** August 10, 2026  

At **MotoCortex**, we take your privacy and data security seriously. MotoCortex is an advanced vehicular diagnostic and telemetry platform designed for automotive and motorcycle enthusiasts, mechanics, and engineers. This Privacy Policy outlines how our application collects, uses, stores, and protects your information.

---

## 1. Information We Collect

### A. Local Device & Diagnostic Data
- **OBD-II & ECU Diagnostic Data:** Live telemetry parameters (e.g., Engine RPM, Vehicle Speed, Coolant Temperature, Battery Voltage), Diagnostic Trouble Codes (DTCs), ECU Header Identifiers, and Calibration IDs.
- **Vehicle Profile Information:** User-configured vehicle specs (Make, Model, Year, Fuel/EV Battery status).

### B. Hardware Connection & Device Permissions
- **Bluetooth & BLE Permissions:** Required solely to discover, pair, and exchange serial OBD-II packets with compatible wireless adapters (e.g., OBDLink, vLinker, ELM327 clones).
- **Coarse/Fine Location Permissions:** Required by Android OS (Android 11 and lower) solely for Bluetooth Low Energy (BLE) peripheral scanning. MotoCortex **does not** track, log, or export your GPS position or location history.
- **Local Storage Permissions:** Required to store telemetry snapshots, offline DTC definitions, and user settings locally on your device.

---

## 2. How We Use Your Information

- **Real-Time Telemetry & Diagnostics:** To render live dashboards, gauge clusters, and diagnostic error reports within the app.
- **ECU Protection Shield:** To perform local safety checks (e.g., verifying battery voltage exceeds 11.8V prior to executing dangerous UDS commands).
- **AI Vehicle Doctor:** To analyze local DTCs and sensor data against offline AI models and generate contextual maintenance insights.

---

## 3. Data Storage & Sharing

- **Offline-First Architecture:** All diagnostic sessions, logs, and ECU data remain **100% stored locally** on your mobile device unless you explicitly choose to export or sync a diagnostic report.
- **No Third-Party Tracking:** MotoCortex does **not** sell, rent, or monetize your vehicle diagnostic data or personal information.
- **Cloud Synchronization (Optional):** If logged in via Supabase/Firebase, account profile preferences are synchronized securely over HTTPS/TLS encryption.

---

## 4. Security Measures

- **Voltaj Kalkanı & Command Classification:** Advanced safety engines restrict write/mutation commands during unsafe vehicle states.
- **End-to-End Encryption:** Any optional telemetry exports or cloud synchronization use industry-standard TLS 1.3 encryption.

---

## 5. Compliance & User Rights (GDPR / KVKK / CCPA)

Under applicable data protection laws (GDPR, KVKK, CCPA), you have the right to:
- Access, view, or export your locally stored diagnostic logs.
- Erase all app cache and stored vehicle telemetry via app settings or by clearing application storage.

---

## 6. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy, please contact our support team at:
- **Email:** support@motocortex.app  
- **Repository:** [GitHub Issue Tracker](https://github.com/ismailimamoglu/MotoCortex)
