# MotoCortex Diesel Engine, Manual Transmission & Live Diagnostic Optimization Technical Specification & Questions (github4.md)

Technical deep-dive questions for GitHub Copilot regarding live OBD-II diagnostic inaccuracies observed during physical road testing on **Manual Transmission Diesel Vehicles**.

---

## 1. Diesel Engine Horsepower (HP) & Torque (Nm) Dynamic Calculation Physics
* **Current Issue:** The current formula relies on standard gasoline MAF (Mass Air Flow) stoichiometry ($14.7:1$ AFR). In diesel engines operating with extreme excess air (Lean Burn, AFR $18:1$ to $70:1+$), this formula produces absurdly small output (e.g., $8\text{ HP} / 55\text{ Nm}$ under actual load).
* **Questions for Copilot:**
  1. How should we dynamically detect the vehicle's fuel type via Mode 01 PID `0x51` (`0x04` = Diesel, `0x01` = Gasoline, `0x08` = EV, `0x12` = Hybrid) with graceful fallback to VIN decoding?
  2. For diesel engines, what is the exact physical mathematical formula to calculate instantaneous Brake Torque ($T_{engine}$) and Horsepower ($HP$) using:
     * **Method A (Actual Engine Torque % & Reference Torque):** Mode 01 PID `0x61` (Driver's Demand Engine Torque %), PID `0x62` (Actual Engine - Percent Torque %), Mode 01 PID `0x63` / Mode 09 PID `0x5C` (Engine Reference Torque in Nm).
     * **Method B (Fuel Injection Rate & Thermal Efficiency):** Mode 01 PID `0x5E` (Engine Fuel Rate in $L/h$ or $mg/\text{stroke}$), Lower Heating Value of Diesel ($43.2\text{ MJ/kg}$), and speed (RPM).
  3. Please provide TypeScript code snippet for `DieselPowerCalculator.ts` incorporating both methods with automatic priority fallback.

---

## 2. Fuel Trim & Mixture Health: Gasoline (STFT / LTFT) vs Diesel (Wideband Lambda & Injector Balance)
* **Current Issue:** In diesel engines, standard Short-Term / Long-Term Fuel Trims (STFT/LTFT) and $14.7:1$ AFR do not exist. As a result, the live "Fuel Trim" screen remains stuck at $0\%$ and $14.7:1$ AFR.
* **Questions for Copilot:**
  1. When a diesel vehicle is detected, how should the "Fuel Trim" screen dynamically mutate into a **"Diesel Injection & Combustion Health"** monitor?
  2. What standardized OBD-II PIDs and OEM parameters should be displayed instead:
     * Wideband Oxygen / Lambda Sensor (Mode 01 PID `0x24`–`0x2B`, PID `0x34` Equivalence Ratio $\lambda$),
     * Common Rail Fuel Pressure & Target vs Actual Rail Pressure (Mode 01 PID `0x23`, PID `0x59`),
     * MAF Actual vs Target Intake Air Mass deviation for EGR diagnosis?

---

## 3. Manual vs Automatic Transmission Dynamic Detection & Transmission Adaptation Wizard
* **Current Issue:** In a manual transmission vehicle without a Transmission Control Unit (TCU), opening the "DCT Adaptation / Transmission Reset" wizard still expects automatic preconditions (`P` Park Position, Transmission Fluid Temp, etc.).
* **Questions for Copilot:**
  1. How should MotoCortex reliably identify whether the connected vehicle has a Manual vs Automatic/Dual-Clutch (DCT/DSG) transmission (e.g., querying TCU address `0x7E1` for `0x7E9` response vs timeout, Mode 01 PID `0x1C`, or CAN message sniffing)?
  2. How should the UI adapt dynamically when a manual transmission is detected:
     * Displaying a clear notification: *"Manual Transmission Detected — TCU Adaptation Not Applicable"*,
     * Offering Manual-specific diagnostics (Clutch Pedal Switch status, Neutral Gear Position Sensor, Reverse Switch test)?

---

## 4. DPF (Diesel Particulate Filter) Diagnostics: Standard PIDs + OEM UDS DID Matrix
* **Current Issue:** Standard generic Mode 01 PIDs for DPF are often unsupported by older Euro 4 / Euro 5 ECUs, requiring brand-specific UDS DIDs.
* **Questions for Copilot:**
  1. What is the standard decoding logic for SAE J1979 Mode 01 DPF PIDs:
     * PID `0x78` (Exhaust Gas Differential Pressure),
     * PID `0x79` (DPF Temperature Sensors - In/Out),
     * PID `0x7A` (DPF Soot Mass),
     * PID `0x7B` (DPF Ash Mass)?
  2. Please provide the OEM UDS ReadDataByIdentifier (`0x22`) DID table for top diesel brands:
     * **VAG (VW/Audi/Seat/Skoda):** DID `0x22114E` (Soot Mass Calculated/Measured), `0x221156` (DPF Differential Pressure), `0x221153` (DPF Temp).
     * **BMW (DDE):** DID `0x22010A`, `0x22010B`.
     * **Mercedes-Benz (CDI):** DID `0x220023`, `0x220024`.
     * **Renault / Dacia (SID/EDC):** DID `0x222002`.
     * **Ford (Duratorq / EcoBlue):** DID `0x220556`.
     * **Stellantis / Fiat / Peugeot / Opel (Multijet / BlueHDi):** DID `0x22180E`.

---

## 5. Multi-ECU Topology Fast Scanner (< 2 Seconds Execution)
* **Current Issue:** "Scan All ECUs" needs to rapidly detect and map all online ECUs (Engine `0x7E0`, Transmission `0x7E1`, ABS `0x7E2`, BCM `0x7E4`, Instrument Cluster `0x7E6`, Airbag `0x7E7`, etc.) without hanging or causing bus congestion.
* **Questions for Copilot:**
  1. What is the most efficient ISO 15765-4 + UDS CAN probing sequence using Functional Broadcast ID `0x7DF` (Tester Present `0x3E 0x80` or Read DTCs `0x19 0x02 0xFF`) and collecting multi-response arbitration IDs within a 500ms timeout window?
  2. How to handle 29-bit CAN commercial vehicles and DoIP/Ethernet topologies with the same unified scanning engine?
