Short answer up front

I explain how to detect fuel type, give robust physical formulas to compute instantaneous engine torque and power for diesels (two methods), and provide a production-ready TypeScript implementation (DieselPowerCalculator.ts) that uses both methods with automatic priority/fallback.
I give a practical plan to replace gasoline STFT/LTFT screens with a Diesel Injection & Combustion Health screen and list the PIDs / OEM parameters to show, plus how to display them.
I explain reliable Manual vs Automatic transmission detection and how the UI should adapt.
I provide decoding guidance for DPF-related PIDs/UDS DIDs and a cautioned OEM DID table (include the DIDs you listed, flagged where OEM verification is required).
I describe a high-performance multi-ECU fast scanner (<2s target) with exact probe sequences for 11-bit and 29-bit CAN, and DoIP/UDS integration.
I do not invent or claim OEM‑verified DID/PGN addresses beyond what you supplied; where values vary by vendor/SW I mark them as OEM / LAB verify and show how to verify them safely.

Contents

Diesel fuel-type detection

Diesel torque & power formulas + fallback logic

DieselPowerCalculator.ts — TypeScript implementation

Diesel Fuel/Injection & Combustion Health screen: PIDs & fields to show

Manual vs Automatic transmission detection & UI adaptation

DPF decoding logic + OEM UDS DID table (with verification notes)

High-speed multi-ECU scanner algorithm and sample sequences

Practical integration notes, safety, and test checklist

Fuel-type detection (PID 0x51 + VIN fallback)

Primary source: OBD Mode 1 PID 0x51 (Fuel Type) — defined in SAE J1979. Typical values: 0x01 gasoline, 0x04 diesel, 0x08 electric, 0x12 hybrid, others vendor-defined.
Read Mode 01 PID 0x51 via functional or physical addressing depending on the ECU. If response present, use it.
If no response or PID unsupported: fallback to VIN decoding (Mode 09 PID 0x02 for VIN, or read FA/VO for BMW/VAG). Use your vehicle-metadata database (make/model/engine code) to infer fuel type.
Additional heuristics: presence of rail pressure SPNs/PGNs, presence of DPF-related PIDs, injector timing PIDs — if these are present, favor Diesel.
Graceful fallback algorithm:
Try Mode 01 PID 0x51 (physical to engine ECU). If value returned and recognized → set fuelType.
If PID not supported/timeout → read VIN (Mode 09 PID 0x02 or UDS DID for FA). Look up make/model/engine.
If still unknown → probe for diesel-specific signals (rail pressure SPN/PGN, DPF soot mass DID) — if present, mark diesel probable.
Present the fuel type on UI with confidence level (High/Medium/Low) and allow user override in settings.
Diesel instantaneous torque & power — physics & formulas Overview
Two robust ways:
Method A: Percent Torque + Reference Torque (best when ECM exposes reference torque and percent torque PIDs).
Method B: Combustion energy approach using measured fuel flow and thermal efficiency (fallback when Method A not available or suspect).
Units & conversions:
RPM (rev/min) = N.
Torque T in N·m.
Mechanical Power P (W) = T * ω, where angular speed ω (rad/s) = 2π * RPM / 60.
kW = P / 1000.
Metric horsepower (PS) ≈ kW * 1.359621617; Imperial HP ≈ kW * 1.34102209. Use desired convention but be explicit.
Useful constants:
kW_from_T_RPM_factor = 2π / 60 / 1000 = 0.00010471975512
kW = T * RPM * (2π / 60) / 1000 = T * RPM * 0.00010471975512
metricHP = kW * 1.359621617
quickly: metricHP ≈ T * RPM / 7127 (approx) — exact factor: 7126.996871 (use constant if you want HP directly).
Method A — Percent torque × reference torque (preferred)

Inputs:
ActualEnginePercentTorque = PID 0x62 (percent; range -200%..+200% maybe OEM-specific; check scaling).
EngineReferenceTorqueNm = PID 0x63 or Mode9 0x5C (reference torque, Nm).
RPM: Mode 01 PID 0x0C or relevant speed PID.
Formula:
T_engine (Nm) = (ActualEnginePercentTorque / 100) * ReferenceTorqueNm
Example: Actual% = 50, Reference = 400 Nm → T = 0.5 * 400 = 200 Nm
P_kW = T_engine * RPM * (2π / 60) / 1000
HP_metric = P_kW * 1.359621617 (or HP_imperial = P_kW * 1.34102209)
Notes:
Percent torque PIDs sometimes encode signed percent with offset or different scaling; always read PID scaling & range. Example some OEMs use 0..65535 mapping — convert per spec.
If ECM provides PercentDriverDemand (0x61) vs ActualEnginePercentTorque (0x62), prefer 0x62 for instantaneous torque.
Method B — Fuel energy & thermal efficiency (fallback/validation)

Inputs:
FuelRateVol_L_per_h = PID 0x5E (engine fuel rate) or mass flow (some PIDs give mg/stroke; convert).
FuelDensity (kg/L): typical diesel ≈ 0.832–0.86 kg/L; allow override by vehicle type.
Lower Heating Value (LHV) of diesel ≈ 43.2 MJ/kg (use 43.2e6 J/kg).
Estimated thermal efficiency η (0.30–0.45 typical for diesels; user-adjustable or derived from baseline).
RPM (rev/min).
Formula:
mass_flow_kg_s = (FuelRate_L_per_h * density_kg_per_L) / 3600
energy_flow_W = mass_flow_kg_s * LHV (J/s = W)
mechanical_power_W = η * energy_flow_W
T_engine = mechanical_power_W / ω = mechanical_power_W / (2π * RPM / 60)
Convert to kW/HP as above.
Example: FuelRate = 10 L/h, density 0.84 ⇒ mass_flow = 0.84 * 10 / 3600 = 0.002333 kg/s. energy_flow = 0.002333 * 43.2e6 ≈ 100.8 kW input. At η=0.40 mechanical ≈ 40.3 kW. At RPM 1500: T = 40300 / (2π*1500/60) ≈ 257 Nm.
Practical concerns & validation

Method A is more direct and typically correct for instantaneous torque if PIDs are present and trustworthy.
Method B depends on correct fuel-rate measurement and an accurate efficiency estimate; injectors/combustion efficiency vary with load and EGR — use B to cross-check and for vehicles that don't expose reference torque.
Always apply sanity checks:
If computed torque/power is outside reasonable bounds (negative when engine producing positive torque, or horsepower > manufacturer rating × 1.5), mark as suspect and show a confidence indicator.
Blend outputs: weighted average between A & B when both available, with weight based on signal quality and presence of ECU-provided reference torque.
DieselPowerCalculator.ts — TypeScript implementation
Assumptions:
Your telemetry layer provides parsed PIDs with names and numeric values (e.g., fuelRateLph, rpm, percentTorque, referenceTorqueNm).
The code uses a configurable diesel density and efficiency table per vehicle or default.
The code returns an object with torqueNm, powerKw, powerHP, methodUsed, and a confidence score.
Paste this file into src/lib/DieselPowerCalculator.ts

TypeScript
// src/lib/DieselPowerCalculator.ts
// Computes instantaneous engine torque and power for diesel engines using two methods
// Method A: Percent torque * reference torque (preferred if available)
// Method B: Fuel energy flow * thermal efficiency (fallback/validation)

export type DieselPowerInput = {
  rpm?: number; // engine speed rpm
  percentTorqueActual?: number | null; // PID 0x62; percent as 0..100 or signed -100..100 depending on provider
  percentTorqueDriverDemand?: number | null; // PID 0x61
  referenceTorqueNm?: number | null; // PID 0x63 or 0x5C
  fuelRate_L_per_h?: number | null; // PID 0x5E - engine fuel rate in L/h (or null)
  fuelRate_mg_per_stroke?: number | null; // alternative (if provided)
  cylinders?: number | null;
  engineDisplacement_L?: number | null;
  vehicleDensity_kg_per_L?: number | null; // diesel density approx 0.84
  estimatedThermalEfficiency?: number | null; // 0.30 - 0.45 typical
  timestamp?: number | string;
};

export type DieselPowerResult = {
  torqueNm: number | null;
  powerKW: number | null;
  powerHP: number | null;
  method: "PERCENT_TORQUE" | "FUEL_ENERGY" | "BLENDED" | "UNKNOWN";
  confidence: number; // 0..1
  diagnostics?: {
    notes?: string[];
    methodA?: {
      torqueNm?: number | null;
      used?: boolean;
      valid?: boolean;
    };
    methodB?: {
      torqueNm?: number | null;
      used?: boolean;
      valid?: boolean;
    };
  };
};

const KW_FROM_T_RPM_FACTOR = (2 * Math.PI) / 60 / 1000; // = 0.00010471975511965977
const HP_FROM_KW = 1.359621617; // metric HP (PS)
const DEFAULT_DIESEL_DENSITY = 0.84; // kg/L
const DEFAULT_THERMAL_EFFICIENCY = 0.40; // default pragmatic guess for modern diesels

function rpmSafe(rpm?: number | null) {
  return typeof rpm === "number" && isFinite(rpm) && rpm > 0;
}

export function computeFromPercentTorque(
  percentTorque: number,
  referenceTorqueNm: number,
  rpm: number
): { torqueNm: number; powerKW: number; powerHP: number } {
  const torqueNm = (percentTorque / 100) * referenceTorqueNm;
  const powerKW = torqueNm * rpm * KW_FROM_T_RPM_FACTOR;
  const powerHP = powerKW * HP_FROM_KW;
  return { torqueNm, powerKW, powerHP };
}

export function computeFromFuelEnergy(
  fuelRateLph: number,
  rpm: number,
  densityKgPerL = DEFAULT_DIESEL_DENSITY,
  thermalEfficiency = DEFAULT_THERMAL_EFFICIENCY
): { torqueNm: number; powerKW: number; powerHP: number } {
  // convert L/h to kg/s
  const massFlowKgPerS = (fuelRateLph * densityKgPerL) / 3600.0;
  // lower heating value diesel (J/kg)
  const LHV = 43.2e6;
  const energyFlowW = massFlowKgPerS * LHV; // watts in
  const mechPowerW = energyFlowW * thermalEfficiency;
  const powerKW = mechPowerW / 1000.0;
  const torqueNm = mechPowerW / (2 * Math.PI * (rpm / 60.0));
  const powerHP = powerKW * HP_FROM_KW;
  return { torqueNm, powerKW, powerHP };
}

export function DieselPowerCalculator(input: DieselPowerInput): DieselPowerResult {
  const notes: string[] = [];
  let aResult = null;
  let bResult = null;
  const rpm = input.rpm ?? 0;

  // Method A: percent torque
  if (
    typeof input.percentTorqueActual === "number" &&
    typeof input.referenceTorqueNm === "number" &&
    rpmSafe(rpm)
  ) {
    try {
      aResult = computeFromPercentTorque(input.percentTorqueActual, input.referenceTorqueNm, rpm);
      notes.push("Method A (percent torque) computed.");
    } catch (err) {
      notes.push("Method A exception: " + String(err));
      aResult = null;
    }
  } else {
    notes.push("Method A unavailable: missing percentTorqueActual or referenceTorqueNm or rpm.");
  }

  // Method B: fuel energy (fallback)
  if (typeof input.fuelRate_L_per_h === "number" && rpmSafe(rpm)) {
    const density = input.vehicleDensity_kg_per_L ?? DEFAULT_DIESEL_DENSITY;
    const eff = input.estimatedThermalEfficiency ?? DEFAULT_THERMAL_EFFICIENCY;
    try {
      bResult = computeFromFuelEnergy(input.fuelRate_L_per_h, rpm, density, eff);
      notes.push("Method B (fuel energy) computed.");
    } catch (err) {
      notes.push("Method B exception: " + String(err));
      bResult = null;
    }
  } else {
    notes.push("Method B unavailable: missing fuelRate_L_per_h or rpm.");
  }

  // Decide which to use
  const diagnostics: DieselPowerResult["diagnostics"] = { notes: [] };
  diagnostics.notes = notes;

  // sanity-check helpers
  function sanityCheck(result: { torqueNm: number; powerKW: number }) {
    // basic sanity: torque must be within plausible range and power non-negative
    if (!result || !isFinite(result.torqueNm) || !isFinite(result.powerKW)) return false;
    // reject obviously impossible numbers
    if (Math.abs(result.torqueNm) > 20000) return false; // absurd high torque
    if (result.powerKW < -500) return false;
    return true;
  }

  let finalMethod: DieselPowerResult["method"] = "UNKNOWN";
  let finalTorque: number | null = null;
  let finalKW: number | null = null;
  let finalHP: number | null = null;
  let confidence = 0;

  const aValid = aResult ? sanityCheck(aResult) : false;
  const bValid = bResult ? sanityCheck(bResult) : false;

  diagnostics.methodA = { torqueNm: aResult?.torqueNm ?? null, used: false, valid: aValid };
  diagnostics.methodB = { torqueNm: bResult?.torqueNm ?? null, used: false, valid: bValid };

  if (aValid && !bValid) {
    finalMethod = "PERCENT_TORQUE";
    finalTorque = aResult!.torqueNm;
    finalKW = aResult!.powerKW;
    finalHP = aResult!.powerHP;
    confidence = 0.9;
    diagnostics.methodA.used = true;
  } else if (!aValid && bValid) {
    finalMethod = "FUEL_ENERGY";
    finalTorque = bResult!.torqueNm;
    finalKW = bResult!.powerKW;
    finalHP = bResult!.powerHP;
    confidence = 0.7;
    diagnostics.methodB.used = true;
  } else if (aValid && bValid) {
    // blend with weights based on presence and expected reliability.
    // If referenceTorque exists prefer Method A with 0.7 weight.
    const weightA = 0.7;
    const weightB = 0.3;
    finalTorque = aResult!.torqueNm * weightA + bResult!.torqueNm * weightB;
    finalKW = aResult!.powerKW * weightA + bResult!.powerKW * weightB;
    finalHP = finalKW * HP_FROM_KW;
    finalMethod = "BLENDED";
    confidence = 0.95;
    diagnostics.methodA.used = true;
    diagnostics.methodB.used = true;
  } else {
    finalMethod = "UNKNOWN";
    finalTorque = null;
    finalKW = null;
    finalHP = null;
    confidence = 0.0;
  }

  // Additional sanity: compare against rated engine torque if available and clamp confidence
  if (input.referenceTorqueNm && finalTorque !== null) {
    const absRatio = Math.abs(finalTorque / input.referenceTorqueNm);
    if (absRatio > 2.0) {
      // suspicious: computed torque > 2x reference
      confidence *= 0.4;
      diagnostics.notes!.push("Computed torque > 2x referenceTorque: low confidence.");
    } else if (absRatio > 1.2) {
      confidence *= 0.8;
      diagnostics.notes!.push("Computed torque differs from reference by >20%: moderate confidence.");
    }
  }

  return {
    torqueNm: finalTorque,
    powerKW: finalKW,
    powerHP: finalHP,
    method: finalMethod,
    confidence,
    diagnostics,
  };
}
Notes on DieselPowerCalculator implementation

Provide runtime hooks to allow user configuration of density and thermal efficiency per VIN/engine code.
Log diagnostics with raw PIDs used, timestamps, and confidence for UI display.
Add unit tests against known cases (e.g., compare to dyno data) to calibrate thermal efficiency per engine family.
Fuel Trim & Mixture Health: Diesel-specific monitor design When diesel detected, show a Diesel Injection & Combustion Health screen. Replace STFT/LTFT/A/F visualization with diesel-relevant metrics.
Recommended fields to display (prioritize real-time PIDs and OEM DIDs):

Wideband Lambda / Equivalence Ratio:
Mode 01 PID 0x34 (Equivalence Ratio λ) if supported.
Mode 01 PIDs 0x24–0x2B often represent oxygen sensors; consult J1979 mapping for wideband sensors (read sensor voltage or lambda).
Display λ, AFR derived for diesel (AFR_diesel = λ * stoich_diesel). Stoichiometric for diesel is ~14.5–15? But diesel normally runs lean; show lambda directly.
Fuel Rail Pressure:
Mode 01 PID 0x23 (Fuel Rail Pressure) — if present (some standards use 0x22, vendor specifics apply). Also show Target vs Actual rail pressure (OEM DIDs).
Injector balance / individual injector monitoring:
If ECM exposes per-cylinder injector duration or relative balance (OEM PIDs/UDS DIDs), show injector trim (%), injection timing, and per-cylinder fuel mass (mg/stroke if available).
Fuel Rate:
Mode 01 PID 0x5E (Fuel Rate in L/h) — show engine fuel rate + per-cylinder derived mass flow.
MAF / Intake Mass:
MAF actual vs commanded (Mode 01 PID 0x10 or manufacturer-provided mass air flow) — show percent deviation and flag EGR or sensor issues.
EGR rate:
If available (PID / SPN), show commanded vs actual EGR percentage.
NOx Sensor readings:
If vehicle has NOx sensors (SCR systems), show NOx ppm & sensor health.
DPF soot mass:
show soot mass, DPF differential pressure and inlet/outlet temperature (see next section).
Diagnostics UI behavior:
Show numeric and graphical trends (last 60 s) with thresholds for warning.
Provide health scoring: combine rail pressure deviation + lambda variance + injector balance + MAF deviation into a single score and show detail drill-down.
Recommended standardized PIDs (where available):
Mode 01 0x24–0x2B — O2 / Lambda sensors (OEM mappings vary).
Mode 01 0x34 — Equivalence Ratio (λ).
Mode 01 0x23 (or OEM) — Fuel rail pressure; also look for OEM DIDs for target vs actual rail pressure.
Mode 01 0x5E — Engine fuel rate (L/h).
Mode 01 0x0C — Engine RPM for normalization.
If standard PIDs absent: query OEM UDS DIDs for fuel rail P, injector timing, lambda sensors and display.
Manual vs Automatic Transmission detection & UI adaptation Reliable detection algorithm
Primary checks (fast):
Probe for TCU/Transmission ECU on common response addresses (diagnostic addresses): send a physical diagnostic request (e.g., Tester Present or Read Data by PID 0x00) to known TCU addresses (0x7E1, 0x7E2, 0x7E3 depending on vehicle) and await SIDs; also send functional request via 0x7DF (Mode 01 PID 0x00) and gather responders.
Observe Mode 01 PID 0x1C (obd gear status) — supported by many automatics; if present and yields valid data, an automatic exists.
Sniff CAN bus for gearbox-specific messages: automatic transmissions frequently broadcast gear selection, TCU messages (gear target/actual), transmission temp, fluid pressure messages — presence means auto.
Check for ABS/ECU messages that include gear or park status.
Fallback: VIN/vehicle-data lookup — vehicle trim may indicate manual vs automatic.
Decision logic: combine evidence; require at least one positive response from TCU or gear PID or specific CAN messages to classify as Automatic. Otherwise classify as Manual with medium/high confidence.
UI adaptation for Manual Transmission

If Manual detected:
Show a clear top-of-wizard banner: “Manual Transmission Detected — TCU Adaptation Not Applicable.”
Grey out or hide any auto-specific preconditions (Park position, Park pawl tests, AT fluid temperature checks).
Offer manual-specific diagnostics and tools:
Clutch Pedal Switch status (read digital input via ECU / seat sensors),
Neutral gear position sensor readout,
Gear selector position readouts if available,
Clutch switch adjustment procedures (IF available via OEM DIDs).
Provide an alternate flow for “Manual adaptation” that covers:
Clutch switch calibration,
Neutral switch calibration,
Gear learning via driver operations (e.g., instruct user to depress clutch, engage 1st gear, start engine).
If Automatic detected:
Show standard TCU adaptation wizard with preconditions: Park / Neutral, Parking brake engaged, fluid temp in range, battery voltage check, engine off/on as required by procedure.
DPF diagnostics: Mode 01 PIDs + OEM UDS DID table + decoding rules Standard PID decoding guidance (SAE J1979 references)
PID 0x78 — Exhaust Gas Differential Pressure (Dpf differential): often 2-byte signed/unsigned; unit often Pa or kPa depending on OEM; typical scale: raw/10 = kPa or raw * 0.1 kPa. Always check PID definition in ECU response (use PID 0x00 supported PID map to confirm).
PID 0x79 — DPF Temperature Sensors (Inlet/Outlet): these may be multiple PIDs (in/out) or per-sensor values; typically 2 bytes each or 1 byte with offset/scale — unit °C with offset -40.
PID 0x7A — DPF Soot Mass: usually manufacturer-defined and not always present in generic PID set; value often in grams with scale factor (raw * 0.1 g).
PID 0x7B — DPF Ash Mass: similar to soot mass; often stored and updated rarely; may be used by maintenance flags. Decoding logic (safe approach)
Confirm PID support: query Mode 01 PID 0x00..0x20 bitmask to see supported PIDs and confirm 0x78..0x7B support.
For each PID read raw bytes and apply scaling:
Use SAE or OEM scaling when present.
If scaling unknown: analyze units from OEM docs or reverse-engineer with lab tests (apply forced regen and observe changes).
Cross-validate:
DPF soot mass should increase over long idling; DPF differential and inlet/outlet temps correlate with soot mass and regen events.
Use thresholds for UI:
Differential pressure thresholds (e.g., < 5 kPa normal; > 8-10 kPa alarm) — vendor specific.
OEM UDS DID examples & caveats

You asked for an OEM DID table. I list the DIDs you provided and mark them as vendor-provided examples — DO NOT treat these as universally valid; lab verification required:

VAG (VW/Audi/Seat/Skoda):
DID 0x22114E — Soot Mass Calculated / Measured (lab‑verify scaling & units)
DID 0x221156 — DPF Differential Pressure
DID 0x221153 — DPF Temperature (inlet/outlet)
BMW (DDE):
DID 0x22010A — (vendor-specific soot/dpf data)
DID 0x22010B — (vendor-specific DPF temp / diff)
Mercedes-Benz (CDI):
DID 0x220023
DID 0x220024
Renault / Dacia (SID/EDC):
DID 0x222002
Ford (Duratorq / EcoBlue):
DID 0x220556
Stellantis (Multijet / BlueHDi):
DID 0x22180E
For each DID entry you must capture:

Raw bytes length and endianness,
Scale factor and offset (units),
Update frequency and whether it is readable in current diagnostic session or requires security or extended session,
If a routine control (0x31) is used to compute soot mass, record the routine ID and parameters.
Example (how to record after lab verification):

didHex: "22114E"
byteIndex: 2, bitIndex: 0, bitWidth: 16
scale: 0.1 => value in grams
verification: { status: "VERIFIED", verifiedVINs: [...], testLogs: [...] }
Multi‑ECU fast scanner (< 2s) — algorithm & sequences Goal: map online ECUs quickly without bus congestion; provide their response address and UDS/OBD support.
Principles

Use non-blocking parallel probes.
Use functional broadcast requests (0x7DF or functional 0x7DF / 0x7DF for 11-bit; for 29-bit use appropriate functional PGN or broadcast).
Use short timeouts (~50–150 ms) per probe phase, but allow multi-response collection window up to 500 ms total per broadcast phase.
Avoid repeating heavy multi-frame operations during scanning.
Efficient scanning sequence (ISO‑15765 / J1979 for 11‑bit OBD)

Phase 0 — passive listen (50–200 ms): collect spontaneous ECU IDs/messages to seed list.
Phase 1 — functional supported-PIDs probe:
Broadcast to 0x7DF (Mode 01 PID 0x00): [0x02 0x01 0x00] (Request supported PIDs 01-20)
Collect responses from responding ECUs (they reply from their 0x7E8..0x7EF IDs). Collect for up to 250–500 ms. Parse response headers to add responders.
Phase 2 — rapid capability probe (parallel physical reads):
For each likely ECU address set (0x7E0..0x7E7) run a minimal physical read request (Mode 09 VIN or ReadDataByIdentifier if supported) but do in parallel with a short per-address timeout (100–200 ms).
Implementation: send requests over distinct physical CAN IDs and await their responses; do not block per address sequentially.
Phase 3 — collect UDS SIDs:
For each discovered ECUs, send DiagnosticSessionControl 0x10 (0x01 default) but beware some ECUs may enter protected states; prefer a ReadDataByIdentifier for identification DIDs or request VIN mode 09 02 to confirm.
Phase 4 — finalize: return list of responders and their ARBITRATION IDs, protocol (UDS/OBD), and supported modes/pids.
Implementation details & time budgeting

Broadcast functional request 0x7DF — collect responses for T_max = 300–500 ms. Many ECUs will respond within 50–200 ms.
For 11-bit CAN: map 0x7E0..0x7E7 standard request IDs; responses likely 0x7E8..0x7EF.
Use concurrency: issue all physical requests in parallel occupying same bus but staggered micro-timings to reduce collisions. Implement a small random jitter (1–5 ms) when sending many physical requests.
Limit heavy operations: do not request large data (DTC download, full DID lists) during fast scan; reserve for deep-scan.
Handling 29-bit CAN (J1939) & DoIP

J1939 (29-bit):
Use Address Claim (PGN 60928) and listening for NAME/Address Claim responses to build ECU list.
Use Request PGN (59904) to ask a node to transmit a specific PGN; collect responses using 29-bit filters. Time window 300–500 ms.
DoIP / Ethernet:
Perform DoIP discovery per ISO 13400: send DoIP diagnostic activation and DoIP discovery packet (broadcast); wait for DoIP vehicle gateways to reply. Query service discovery (DoIP diagnostic over TCP 13400) and then query UDS over DoIP endpoints for identification.
Unified scanning engine design:
Abstract transports: create a Scanner interface with probeFunctional(), probePhysical(addressList), and passiveListen() methods.
Implement transport adapters for CAN 11-bit (ISOTP), CAN 29-bit (J1939), DoIP (TCP).
The engine runs the same high-level sequence across adapters and merges results within a 2s budget.
Example pseudocode scanning flow

Start timer t0
passiveListen(100 ms)
sendFunctional(Mode01 PID 0x00) collect responses until t0+400ms
concurrently physicalProbe(addressList, timeout = 150ms each)
if DoIP adapter present: do DoIP discovery (parallel)
consolidate responders → return.
Practical integration notes, safety & test checklist
Always show user a confidence indicator for computed power using percent torque vs fuel-rate methods.
For any operation that changes torque-limiting or emission systems (RSL, DPF regen control), require fleet authorization and record signed audit trail.
Validate all DID/PGN mappings in lab with:
Pre-snapshot, apply change on sacrificial test vehicle, observe behavior, rollback and confirm.
Add tests for mid-write interruption, voltage drops and automatic rollback.
Add telemetry: if a template is used in field, record success/failure counts per VIN/SW version and auto-flag templates for revalidation.
Appendix — quick references & constants

kW = Torque(Nm) * RPM * 2π / 60 / 1000
metricHP ≈ kW * 1.359621617
LHV diesel ≈ 43.2e6 J/kg
Default diesel density ≈ 0.84 kg/L
Default diesel efficiency for initial estimation 0.35–0.45 (tune per engine family)
If you want next

I can:
Provide unit tests and sample telemetry feed simulating PIDs to validate DieselPowerCalculator.
Produce a small UI mock for Diesel Injection & Combustion Health with recommended visualization and thresholds.
Produce an adapted fast-scan implementation in TypeScript compatible with your existing CAN stack (socketcan + isotp) that you can run and profile to achieve <2s.
Help parse a small sample of your captured OBD traces and demonstrate how to extract referenceTorque, percentTorque and fuelRate for a particular VIN/engine so we can calibrate constants.
Which of those should I produce next?