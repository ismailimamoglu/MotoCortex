# Privacy Policy — MotoCortex

**Last Updated:** August 5, 2026

At **MotoCortex**, we prioritize user privacy, data security, and transparency. This Privacy Policy outlines how your personal data, diagnostic telemetry, and device information are collected, processed, and protected in compliance with the **General Data Protection Regulation (GDPR)**, **California Consumer Privacy Act (CCPA)**, and **KVKK (Kanun No. 6698)**.

---

## 1. Information We Collect

### A. Vehicle Diagnostic & Telemetry Data (Local-First)
- Diagnostic Trouble Codes (DTCs), sensor measurements (Engine RPM, Coolant Temperature, Battery Voltage, Speed), and Vehicle Identification Numbers (VINs).
- **Anonymization:** VINs are strictly anonymized at the application layer (`WMI**************`) to protect vehicle ownership identity.

### B. Device & Connection Information
- Bluetooth device identifiers (MAC address/UUID), adapter chipset tier (`TIER_1_PRO`, `TIER_2_STANDARD`), operating system version, and app version for hardware diagnostic compatibility.

### C. Analytics & Crash Reporting (Privacy-First)
- Anonymized crash logs via **Firebase Crashlytics**.
- IDFA (Identifier for Advertisers) collection is **disabled** by default. We do NOT track users across third-party websites or apps.

---

## 2. How We Use Your Data

- **Diagnostic Performance:** To render live telemetry, read fault codes, and execute requested UDS ECU coding commands.
- **App Reliability:** To diagnose crashes and improve OBD-II/UDS adapter connection stability.
- **Entitlement Verification:** Server-side verification of RevenueCat Pro subscriptions via secure Supabase Edge Functions.

---

## 3. Data Storage & Security

- **Offline-First:** All diagnostic sessions, fault logs, and garage records are stored locally on your device via encrypted SQLite storage (`SQLiteStorage`).
- **Cloud Sync:** Telemetry queue items synced to Supabase are encrypted in transit via TLS 1.3 and hardened API headers (`X-MotoCortex-Signature`).

---

## 4. Your Privacy Rights (GDPR / CCPA / KVKK)

You hold full rights regarding your data:
- **Right to Access & Export:** You may request an export of your stored vehicle diagnostic history at any time.
- **Right to Erasure (Right to be Forgotten):** You may clear local logs directly within app settings or submit a request to purge cloud telemetry backups.
- **Opt-Out of Analytics:** You may disable Firebase crash collection in app settings.

---

## 5. Contact Us

For privacy inquiries or data rights requests:
- **Email:** `privacy@motocortex.app`
- **Website:** `https://motocortex.app/privacy`
