/**
 * MotoCortex DTC Intelligence, OEM Lookup, UDS Status & Guided Diagnostics Engine
 */

export interface UdsDtcStatusInfo {
 testFailed: boolean;
 testFailedThisCycle: boolean;
 pendingDtc: boolean;
 confirmedDtc: boolean;
 testNotCompletedSinceClear: boolean;
 testFailedSinceClear: boolean;
 milLampRequested: boolean;
 statusLabel: string;
}

export interface GuidedDiagnostic {
 relatedPids: string[];
 probableCauses: Array<{ cause: string; probability: number }>;
 recommendedAction: string;
 tsbSummary?: string;
}

export type DiagnosticRiskLevel = 'CRITICAL' | 'WARNING' | 'SAFE';
export type DiagnosticDifficulty = 'DIY_EASY' | 'MODERATE' | 'PROFESSIONAL';

export interface DeepDiagnosticDossier {
  systemTitle: string;
  healthScore: number;
  riskLevel: DiagnosticRiskLevel;
  driveGuidance: string;
  symptoms: string[];
  probableCauses: Array<{ cause: string; probability: number }>;
  difficultyLevel: DiagnosticDifficulty;
  difficultyRating: string; // e.g. "1/5 - Kolay (DIY)", "3/5 - Orta", "5/5 - Servis"
  componentTestingSteps: string[];
  crossDtcAnalysis?: string;
  tsbSummary?: string;
  recommendedAction: string;
  relatedPids?: string[];
}

export interface DiagnosticDossierContext {
  targetModuleId?: string; // e.g. 'ecm', 'tcm', 'abs', 'srs', 'bcm', 'gateway', 'eps', 'ipc'
  targetModuleCategory?: string; // 'powertrain' | 'chassis' | 'body' | 'safety'
  targetModuleName?: string;
  allDtcs?: string[];
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vin?: string;
  engineVoltage?: number;
  coolantTemp?: number;
  rpm?: number;
  speed?: number;
}

// Multi-ECU OEM Specific DTC Database (VAG, BMW, Mercedes, Renault, Ford, Toyota, Fiat)
const OEM_DTC_DATABASE: Record<string, Record<string, string>> = {
  VAG: {
    // Engine (ECM)
    '18010': 'P1602 Power Supply Terminal 30: Voltage Too Low',
    '17978': 'P1570 Engine Control Module Disabled by Immobilizer',
    '18265': 'P1857 Load Signal: Error Message from ECU',
    '16486': 'P0102 Mass Air Flow Sensor (G70): Signal Too Low',
    '16684': 'P0300 Random/Multiple Cylinder Misfire Detected',
    '17536': 'P1128 Long Term Fuel Trim Bank 1: System Too Lean',
    // Transmission (TCM / DSG)
    'P17BF': '06079 DSG Hydraulic Pump: Play Protection (Mechatronic Accumulator Leak)',
    'P175D': '05981 Transmission Clutch 1: Open Accidentally (Clutch 1 Tolerance Exceeded)',
    'P175E': '05982 Transmission Clutch 2: Open Accidentally (Clutch 2 Tolerance Exceeded)',
    'P189C': '06300 Function Restriction due to Insufficient Pressure Build-Up',
    'P176A': '06000 Gear Actuator 1 Not Regulated',
    'P176B': '06001 Gear Actuator 2 Not Regulated',
    // Brakes & Chassis (ABS/ESP)
    '00283': 'ABS Wheel Speed Sensor Front Left (G47) Signal Fault',
    '00285': 'ABS Wheel Speed Sensor Front Right (G45) Signal Fault',
    '00287': 'ABS Wheel Speed Sensor Rear Left (G46) Signal Fault',
    '00290': 'ABS Wheel Speed Sensor Rear Right (G44) Signal Fault',
    '00778': 'Steering Angle Sensor (G85) Mechanical or Electrical Fault',
    '01435': 'Brake Pressure Sensor 1 (G201) Implausible Signal',
    '01276': 'ABS Hydraulic Pump (V64) Circuit Failure',
    // Airbag & Restraint (SRS)
    '00588': 'Airbag Igniter Driver Side (N95) Resistance Too High',
    '00589': 'Airbag Igniter 1 Passenger Side (N131) Resistance Too High',
    '01217': 'Side Airbag Igniter Driver Side (N199) Upper Limit Exceeded',
    '01218': 'Side Airbag Igniter Passenger Side (N200) Upper Limit Exceeded',
    '65535': 'Control Module Defective / Crash Data Stored (Airbag ECU)',
    '00003': 'Control Module Defective (EEPROM Checksum Fault)',
    // Gateway & Body (BCM/CAN)
    '01314': 'Engine Control Module (ECM): No Communication / Signal Fault',
    '01315': 'Transmission Control Module (TCM): No Communication',
    '01316': 'ABS Brake Control Module: No Communication',
    '00953': 'Central Locking Interior Switch (E150) Circuit Fault',
    '01330': 'Central Control Module for Convenience System (J393) No Comm',
  },
  BMW: {
    // Engine
    '2A82': 'Intake VANOS Solenoid Camshaft Mechanism Stiff/Jam',
    '2A87': 'Exhaust VANOS Variable Camshaft Timing Mechanism Tight/Stuck',
    '2AAF': 'Fuel Pump Control Module Plausibility / Pressure Deviation',
    '2FBF': 'Fuel High Pressure System Injection Release Timeout',
    '2C57': 'Charge Air Pressure Control: Pressure Too Low',
    '2E81': 'Electric Coolant Pump: Speed Deviation / Emergency Operation',
    '2E82': 'Electric Coolant Pump: Communication Cutoff / Jam',
    '30FF': 'Exhaust Turbocharger Boost Pressure Control: Low Pressure Leak',
    '480A': 'DPF Particle Filter System: Particulate Filter Heavily Clogged',
    '481A': 'DPF Particle Filter System: Particulate Filter Clogged (High Backpressure)',
    // Transmission (EGS / ZF 6HP/8HP / DKG)
    '4F81': 'Ratio Monitoring Clutch A (ZF Transmission Slip Detected)',
    '4F85': 'Ratio Monitoring Clutch E (ZF Transmission Slip Detected)',
    '507D': 'Parking Lock Disengaged Implausibly (EGS Mechatronic)',
    'CF17': 'Signal From EGS Invalid (TCM CAN Message Timeout)',
    // ABS / DSC
    '5DF0': 'DSC Hydraulic Unit Pump Motor Fault',
    '5DF1': 'DSC Hydraulic Unit Pump Motor Connector Open',
    '5E20': 'DSC Pressure Sensor 1 Electrical Circuit Malfunction',
    '5E24': 'DSC Pressure Sensor 2 Plausibility Fault',
    '5E40': 'Steering Angle Sensor Offset Implausible',
    'D354': 'DSC No Message From Engine Management',
    'D355': 'DSC No Message From Transmission Management',
    // Airbag (ACSM)
    '93B2': 'ZK0 Safety Battery Terminal Disconnect (BST) Pyrotechnic Open',
    '93C1': 'Passenger Seat Occupancy Detection Mat Front (OC3) Short',
    '93A9': 'Driver Front Airbag Stage 1 Resistance Too High',
    '93D0': 'ACSM Airbag Control Unit Undervoltage',
    // Body & CAS / FEM
    'A0B4': 'CAS Engine Starter Operation Fault',
    'A10A': 'Electronic Steering Column Lock (ELV) Internal Jam/Fault',
    'A0B5': 'CAS Road Speed Signal Fault',
    // Steering (EPS)
    '482394': 'EPS Electric Power Steering Motor Position Sensor Fault',
  },
  MERCEDES: {
    // Engine & Emission
    '2011': 'Intake Port Shutoff / Swirl Flap Motor Jammed Closed',
    '2012': 'Air Mass Meter (MAF) Solder Joint or Signal Drift',
    '2054': 'Camshaft Adjuster Magnet Circuit Short',
    '2510': 'Charge Pressure Actuator Positioner Fault',
    '2074': 'DPF Differential Pressure Sensor Circuit Plausibility',
    // Transmission (7G-Tronic 722.9)
    '2716': 'Component Y3/8n1 (Turbine rpm sensor) Circuit Open',
    '0717': 'Input/Turbine RPM Sensor Y3/8n1 Signal Not Available (7G-Tronic)',
    '0722': 'Output RPM Sensor Y3/8n2 Signal Not Available (7G-Tronic)',
    '2768': 'Component Y3/8n2 (Output rpm sensor) Defective',
    // ABS / ESP
    'C1100': 'Left Front Axle VSS Wheel Speed Sensor Open Circuit',
    'C1101': 'Right Front Axle VSS Wheel Speed Sensor Open Circuit',
    'C1200': 'Stop Lamp Switch Circuit Plausibility',
    'C1401': 'High Pressure and Return Pump Circuit Fault',
    // Airbag & Body (SAM/EZS)
    '9007': 'Control Module N73 (EIS/EZS Control Unit) Hardware Fault',
    '9051': 'SRS Airbag Control Unit Internal Power Circuit Fault',
    '9030': 'Circuit 15R Relay Contact Defective',
    '9040': 'Overhead Control Panel Rain/Light Sensor Comm Timeout',
  },
  RENAULT: {
    // Engine & Glow
    'DF004': 'Turbocharger Boost Pressure Sensor Circuit Plausibility',
    'DF025': 'Preheating Glow Plug Diagnostic Connection Open',
    'DF053': 'Fuel Rail Pressure Regulation Function High/Low',
    'DF1012': 'Maximum Fuel Rail Pressure Exceeded',
    // Transmission (EDC)
    'DF023': 'Clutch Actuator 1 Positioner Malfunction (EDC Gearbox)',
    'DF024': 'Clutch Actuator 2 Positioner Malfunction (EDC Gearbox)',
    'DF088': 'Gearbox Sump Oil Temperature Sensor Circuit (EDC)',
    // ABS / ESC
    'DF010': 'Combined Sensor (Yaw Rate / Lateral Acceleration) Circuit',
    'DF017': 'ABS Computer Internal Electronic Fault',
    'DF026': 'Left Front Wheel Speed Sensor Signal Implausible',
    'DF027': 'Right Front Wheel Speed Sensor Signal Implausible',
    // Airbag & Body
    'DF001': 'Airbag Control Unit Internal Electronic Fault / Crash Stored',
    'DF060': 'Driver Front Airbag Igniter Circuit',
    'DF002': 'Key Card Reader Circuit Malfunction',
    'DF054': 'Steering Column Lock Control Circuit Fault',
  },
  FORD: {
    'B10D7': 'PATS Passive Anti-Theft Key Transponder Fault',
    'B1318': 'Battery Voltage Below Operational Threshold at BCM',
    'C1095': 'ABS Hydraulic Pump Motor Circuit Failure',
    'C1288': 'Brake Pressure Transducer Primary Input Circuit',
    'C1963': 'Stability Control Inhibit Warning',
    'P1000': 'OBD-II Drive Cycle Monitor Testing Incomplete',
    'P1632': 'Smart Alternator Charging System / LIN Comm Fault',
    'P2832': 'Shift Fork A Position Circuit Plausibility (PowerShift)',
    'P2837': 'Shift Fork B Position Circuit Plausibility (PowerShift)',
    'P2872': 'Clutch A Stuck Engaged (PowerShift 6DCT250)',
    'P287A': 'Clutch B Stuck Engaged (PowerShift 6DCT250)',
    'U3000': 'Control Module Internal System Malfunction',
  },
  TOYOTA: {
    'P0A80': 'Replace Hybrid Battery Pack Assembly (Cell Degradation)',
    'P0A7F': 'Hybrid Battery Pack Deterioration (High Internal Resistance)',
    'P0A0D': 'High Voltage System Inter-Lock Circuit Open',
    'P3000': 'High Voltage Battery Control System ECU Malfunction',
    'P3004': 'Power Cable High Voltage Isolation Resistance Leak',
    'C1259': 'HV System Regenerative Braking Malfunction',
    'C1310': 'Malfunction in HV System / VSC Cancelled',
    'C1241': 'Low Battery Positive Voltage to Skid Control / ABS ECU',
    'C1341': 'Front Right Hydraulic Brake Actuator Pressure Deviation',
  },
  FIAT: {
    'P0638': 'Throttle Actuator Control Range/Performance Bank 1',
    'P0810': 'Clutch Position Control Error (Dualogic / Selespeed)',
    'P1205': 'DPF Cleanliness Degradation / Filter Overloaded',
    'P1206': 'DPF Particle Filter Overloaded (Stage 1 Backpressure)',
    'P1773': 'Dualogic Hydraulic Circuit Pressure Insufficient (< 38 Bar)',
    'P1818': 'Dualogic Gear Change Control Infeasible / Shift Interrupted',
    'C1001': 'Steering Angle / Yaw Rate CAN Bus Line Missing',
    'B1001': 'Body Computer EEPROM Configuration Fault',
  },
};

/**
 * Decodes UDS Status Byte (ISO 14229-1) into human-readable flags
 */
export function decodeUdsStatusByte(statusByteHex: string | number): UdsDtcStatusInfo {
  const status = typeof statusByteHex === 'string' ? parseInt(statusByteHex, 16) || 0 : statusByteHex;

  const testFailed = (status & 0x01) !== 0;
  const testFailedThisCycle = (status & 0x02) !== 0;
  const pendingDtc = (status & 0x04) !== 0;
  const confirmedDtc = (status & 0x08) !== 0;
  const testNotCompletedSinceClear = (status & 0x10) !== 0;
  const testFailedSinceClear = (status & 0x20) !== 0;
  const milLampRequested = (status & 0x80) !== 0;

  let statusLabel = 'Confirmed';
  if (milLampRequested) statusLabel = 'MIL ON (Confirmed)';
  else if (pendingDtc) statusLabel = 'Pending';
  else if (testFailedThisCycle) statusLabel = 'Active Failure';

  return {
    testFailed,
    testFailedThisCycle,
    pendingDtc,
    confirmedDtc,
    testNotCompletedSinceClear,
    testFailedSinceClear,
    milLampRequested,
    statusLabel,
  };
}

/**
 * Looks up manufacturer OEM-specific fault code across all control modules
 */
export function lookupOemDtc(code: string, brand?: string): string | null {
  const cleanCode = code.toUpperCase().trim();
  if (brand) {
    const cleanBrand = brand.toUpperCase().trim();
    for (const bKey of Object.keys(OEM_DTC_DATABASE)) {
      if (cleanBrand.includes(bKey)) {
        if (OEM_DTC_DATABASE[bKey][cleanCode]) {
          return `${bKey} OEM: ${OEM_DTC_DATABASE[bKey][cleanCode]}`;
        }
      }
    }
  }

  // General OEM search
  for (const bKey of Object.keys(OEM_DTC_DATABASE)) {
    if (OEM_DTC_DATABASE[bKey][cleanCode]) {
      return `${bKey} OEM: ${OEM_DTC_DATABASE[bKey][cleanCode]}`;
    }
  }

  return null;
}

export const lookupOemDTC = lookupOemDtc;

import i18n from '../i18n';

/**
 * Provides guided diagnostic mappings for live data PID charts & probabilities
 */
export function getGuidedDiagnostics(code: string): GuidedDiagnostic {
  const cleanCode = code.toUpperCase().trim();
  const prefix = cleanCode.charAt(0);

  switch (cleanCode) {
    case 'P0113':
    case 'P0112':
    case 'P0110':
    case 'P0111':
      return {
        relatedPids: ['INTAKE_AIR_TEMP', 'COOLANT_TEMP', 'MAF', 'VOLTAGE'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0113_cause1', { defaultValue: 'Intake Air Temperature (IAT) Sensor Failure' }), probability: 60 },
          { cause: i18n.t('guidedDiag.p0113_cause2', { defaultValue: 'Wiring Harness / Connector Open or Short Circuit' }), probability: 30 },
          { cause: i18n.t('guidedDiag.p0113_cause3', { defaultValue: 'Engine Control Module (ECU) Input Resistance Deviation' }), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0113_action', { defaultValue: 'Measure IAT sensor resistance (kΩ) with a multimeter and check connector pins for corrosion.' }),
        tsbSummary: i18n.t('guidedDiag.p0113_tsb', { defaultValue: 'TSB-2023-04: Inspect IAT sensor wiring harness for friction wear and 5V reference voltage.' }),
      };

    case 'P0102':
    case 'P0101':
    case 'P0100':
    case 'P0103':
      return {
        relatedPids: ['MAF', 'RPM', 'ENGINE_LOAD'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0102_cause1', { defaultValue: 'Dirty or Faulty MAF Sensor' }), probability: 65 },
          { cause: i18n.t('guidedDiag.p0102_cause2', { defaultValue: 'Intake Leak / Vacuum Leak' }), probability: 25 },
          { cause: i18n.t('guidedDiag.p0102_cause3', { defaultValue: 'Wiring Harness Damage' }), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0102_action', { defaultValue: 'Clean MAF sensor with contact cleaner or inspect air filter housing for leaks.' }),
        tsbSummary: i18n.t('guidedDiag.p0102_tsb', { defaultValue: 'TSB-2023-09: Inspect air intake hose clamp torque before replacing MAF.' }),
      };

    case 'P0171':
    case 'P0170':
    case 'P0174':
      return {
        relatedPids: ['STFT1', 'LTFT1', 'MAF', 'O2_VOLTAGE'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0171_cause1', { defaultValue: 'Vacuum Hose Leak / Intake Leak' }), probability: 50 },
          { cause: i18n.t('guidedDiag.p0171_cause2', { defaultValue: 'Weak Fuel Pump / Low Pressure' }), probability: 30 },
          { cause: i18n.t('guidedDiag.p0171_cause3', { defaultValue: 'Fouled O2 Sensor 1' }), probability: 20 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0171_action', { defaultValue: 'Perform smoke test on intake manifold and check long-term fuel trim.' }),
        tsbSummary: i18n.t('guidedDiag.p0171_tsb', { defaultValue: 'TSB-2022-14: Check PCV valve diaphragm for tears.' }),
      };

    case 'P0420':
    case 'P0430':
      return {
        relatedPids: ['O2_B1S1', 'O2_B1S2', 'CAT_TEMP'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0420_cause1', { defaultValue: 'Catalytic Converter Efficiency Degradation' }), probability: 70 },
          { cause: i18n.t('guidedDiag.p0420_cause2', { defaultValue: 'Rear Downstream O2 Sensor Fault' }), probability: 20 },
          { cause: i18n.t('guidedDiag.p0420_cause3', { defaultValue: 'Exhaust Leak Before Converter' }), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0420_action', { defaultValue: 'Compare upstream vs downstream O2 sensor waveforms or check catalytic converter temperature.' }),
      };

    case 'P0300':
    case 'P0301':
    case 'P0302':
    case 'P0303':
    case 'P0304':
      return {
        relatedPids: ['RPM', 'MISFIRE_COUNT', 'COOLANT_TEMP'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0300_cause1', { defaultValue: 'Worn Spark Plug / Ignition Coil' }), probability: 60 },
          { cause: i18n.t('guidedDiag.p0300_cause2', { defaultValue: 'Clogged Fuel Injector' }), probability: 30 },
          { cause: i18n.t('guidedDiag.p0300_cause3', { defaultValue: 'Low Engine Cylinder Compression' }), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0300_action', { defaultValue: 'Swap ignition coil to adjacent cylinder and monitor if misfire follows.' }),
      };

    case 'P17BF':
    case 'P0700':
    case 'P0750':
      return {
        relatedPids: ['TRANSMISSION_SPEED', 'HYDRAULIC_PRESSURE', 'GEAR_RATIO'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p17bf_cause1', { defaultValue: 'Mechatronic Hydraulic Pressure Accumulator Leak' }), probability: 75 },
          { cause: i18n.t('guidedDiag.p17bf_cause2', { defaultValue: 'Solenoid Valve Circuit Fault' }), probability: 15 },
          { cause: i18n.t('guidedDiag.p17bf_cause3', { defaultValue: 'Low Fluid Level / Fluid Degradation' }), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p17bf_action', { defaultValue: 'Perform DCT Mechatronic pressure test and inspect accumulator housing.' }),
        tsbSummary: i18n.t('guidedDiag.p17bf_tsb', { defaultValue: 'TSB-VAG-DSG: Replace mechatronic pressure housing or reinforced accumulator plate.' }),
      };

    default: {
      if (prefix === 'P') {
        return {
          relatedPids: ['RPM', 'SPEED', 'ENGINE_LOAD', 'COOLANT_TEMP'],
          probableCauses: [
            { cause: i18n.t('guidedDiag.cat_p_cause1', { defaultValue: 'Powertrain Sensor or Actuator Circuit Fault' }), probability: 60 },
            { cause: i18n.t('guidedDiag.cat_p_cause2', { defaultValue: 'Mechanical Wear or Air/Fuel Imbalance' }), probability: 40 },
          ],
          recommendedAction: i18n.t('guidedDiag.cat_p_action', { defaultValue: 'Perform OBD-II live telemetry scan and verify sensor signal voltages.' }),
        };
      }
      if (prefix === 'C') {
        return {
          relatedPids: ['WHEEL_SPEED', 'BRAKE_PRESSURE', 'LATERAL_ACCEL'],
          probableCauses: [
            { cause: i18n.t('guidedDiag.cat_c_cause1', { defaultValue: 'Wheel Speed / ABS / ESP Sensor Fault' }), probability: 65 },
            { cause: i18n.t('guidedDiag.cat_c_cause2', { defaultValue: 'Brake System Hydraulic or Electrical Connection Fault' }), probability: 35 },
          ],
          recommendedAction: i18n.t('guidedDiag.cat_c_action', { defaultValue: 'Inspect ABS wheel speed sensors, tone rings, and brake harness wiring.' }),
        };
      }
      if (prefix === 'B') {
        return {
          relatedPids: ['BATTERY_VOLTAGE', 'DOOR_STATUS', 'AIRBAG_RESISTANCE'],
          probableCauses: [
            { cause: i18n.t('guidedDiag.cat_b_cause1', { defaultValue: 'Body Control Module (BCM) / Lighting / Access Circuit Fault' }), probability: 60 },
            { cause: i18n.t('guidedDiag.cat_b_cause2', { defaultValue: 'Interior Sensor, SRS Airbag or Comfort Module Disconnect' }), probability: 40 },
          ],
          recommendedAction: i18n.t('guidedDiag.cat_b_action', { defaultValue: 'Check body module fuses, chassis ground connections, and harness plugs.' }),
        };
      }
      if (prefix === 'U') {
        return {
          relatedPids: ['CAN_ERROR_COUNT', 'BUS_VOLTAGE', 'NODE_STATUS'],
          probableCauses: [
            { cause: i18n.t('guidedDiag.cat_u_cause1', { defaultValue: 'CAN Bus Communication Line Interruption or Bus Noise' }), probability: 70 },
            { cause: i18n.t('guidedDiag.cat_u_cause2', { defaultValue: 'Module Power Loss or Network Gateway Desynchronization' }), probability: 30 },
          ],
          recommendedAction: i18n.t('guidedDiag.cat_u_action', { defaultValue: 'Check CAN-High and CAN-Low termination resistance (approx. 60Ω) and 12V battery stability.' }),
        };
      }
      return {
        relatedPids: ['RPM', 'SPEED', 'COOLANT_TEMP', 'VOLTAGE'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.default_cause1', { defaultValue: 'Component Circuit / Wiring Resistance Fault' }), probability: 50 },
          { cause: i18n.t('guidedDiag.default_cause2', { defaultValue: 'Mechanical Wear or Sensor Degradation' }), probability: 50 },
        ],
        recommendedAction: i18n.t('guidedDiag.default_action', { defaultValue: 'Perform voltage drop & continuity check using multimeter.' }),
      };
    }
  }
}

/**
 * Deep Diagnostic Dossier Generator
 * Produces multi-dimensional engineering diagnostics tailored to specific modules (Engine, TCM, ABS, SRS, BCM, Gateway, EPS)
 */
export function getDeepDiagnosticDossier(
  code: string,
  context?: DiagnosticDossierContext
): DeepDiagnosticDossier {
  const cleanCode = (code || 'OBD-II').toUpperCase().trim();
  const allCodes = (context?.allDtcs || [cleanCode]).map((c) => c.toUpperCase().trim());

  // 1. Identify target module
  let targetModule = context?.targetModuleId;
  if (!targetModule) {
    if (
      cleanCode.startsWith('P07') ||
      cleanCode.startsWith('P08') ||
      cleanCode.startsWith('P09') ||
      cleanCode.startsWith('P17') ||
      cleanCode.startsWith('P18') ||
      cleanCode.startsWith('P27') ||
      cleanCode.startsWith('P28') ||
      cleanCode.startsWith('DF023') ||
      cleanCode.startsWith('DF024') ||
      cleanCode.startsWith('4F8')
    ) {
      targetModule = 'tcm';
    } else if (
      cleanCode.startsWith('C00') ||
      cleanCode.startsWith('C01') ||
      cleanCode.startsWith('C02') ||
      cleanCode.startsWith('C12') ||
      cleanCode.startsWith('C13') ||
      cleanCode.startsWith('0028') ||
      cleanCode.startsWith('5DF') ||
      cleanCode.startsWith('DF010') ||
      cleanCode.startsWith('DF017')
    ) {
      targetModule = 'abs';
    } else if (
      cleanCode.startsWith('B00') ||
      cleanCode.startsWith('B1000') ||
      cleanCode.startsWith('93B') ||
      cleanCode.startsWith('93C') ||
      cleanCode.startsWith('93A') ||
      cleanCode.startsWith('0058') ||
      cleanCode.startsWith('DF001') ||
      cleanCode.startsWith('DF060')
    ) {
      targetModule = 'srs';
    } else if (
      cleanCode.startsWith('B10') ||
      cleanCode.startsWith('B13') ||
      cleanCode.startsWith('B14') ||
      cleanCode.startsWith('B25') ||
      cleanCode.startsWith('A0B') ||
      cleanCode.startsWith('DF002')
    ) {
      targetModule = 'bcm';
    } else if (
      cleanCode.startsWith('U00') ||
      cleanCode.startsWith('U01') ||
      cleanCode.startsWith('U04') ||
      cleanCode.startsWith('0131')
    ) {
      targetModule = 'gateway';
    } else if (
      cleanCode.startsWith('C04') ||
      cleanCode.startsWith('C05') ||
      cleanCode.startsWith('C15') ||
      cleanCode.startsWith('4823')
    ) {
      targetModule = 'eps';
    } else {
      targetModule = 'ecm';
    }
  }

  // 2. Select appropriate dynamic title
  let systemTitle = i18n.t('aiDoctor.healthImpactTitle', { defaultValue: 'MOTOR SAĞLIK ETKİ SKORU' });
  if (targetModule === 'tcm') {
    systemTitle = i18n.t('aiDoctor.tcmHealthTitle', { defaultValue: 'ŞANZIMAN SAĞLIK SKORU' });
  } else if (targetModule === 'abs') {
    systemTitle = i18n.t('aiDoctor.absHealthTitle', { defaultValue: 'FREN & ŞASİ GÜVENLİK SKORU' });
  } else if (targetModule === 'srs') {
    systemTitle = i18n.t('aiDoctor.srsHealthTitle', { defaultValue: 'KORUYUCU GÜVENLİK & AIRBAG SKORU' });
  } else if (targetModule === 'bcm') {
    systemTitle = i18n.t('aiDoctor.bcmHealthTitle', { defaultValue: 'GÖVDE & ELEKTRONİK SAĞLIK SKORU' });
  } else if (targetModule === 'gateway') {
    systemTitle = i18n.t('aiDoctor.gatewayHealthTitle', { defaultValue: 'AĞ & VERİ YOLU İLETİŞİM SKORU' });
  } else if (targetModule === 'eps') {
    systemTitle = i18n.t('aiDoctor.epsHealthTitle', { defaultValue: 'DİREKSİYON SİSTEMİ SAĞLIK SKORU' });
  }

  // 3. Multi-DTC Cross Correlation check
  let crossDtcAnalysis: string | undefined = undefined;
  if (allCodes.length > 1) {
    if (allCodes.includes('P0102') && allCodes.includes('P0171')) {
      crossDtcAnalysis = i18n.t('aiDoctor.cross_p0102_p0171', {
        defaultValue: 'Çapraz Analiz: P0102 (Hava Akışmetre) ve P0171 (Fakir Karışım) birbiriyle doğrudan bağlantılıdır. Eksik ölçülen hava motor beyninin yetersiz yakıt püskürtmesine yol açmıştır. İki parçayı birden değiştirmeyin; önce emme hattındaki hortum kaçaklarını kontrol edin.',
      });
    } else if (allCodes.includes('P0300') && allCodes.includes('P0171')) {
      crossDtcAnalysis = i18n.t('aiDoctor.cross_p0300_p0171', {
        defaultValue: 'Çapraz Analiz: Rastgele silindir teklemesi (P0300), aşırı fakir yakıt karışımından (P0171) kaynaklanmaktadır. Buji veya bobin değişiminden önce yakıt basıncını ve vakum kaçaklarını giderin.',
      });
    } else if (allCodes.some((c) => c.startsWith('C0035') || c.startsWith('C0040')) && allCodes.includes('C1201')) {
      crossDtcAnalysis = i18n.t('aiDoctor.cross_abs_engine', {
        defaultValue: 'Çapraz Analiz: Tekerlek hız sensörü arızası nedeniyle ESP sistemi devre dışı kalmış ve motor beynine tork azaltma sinyali gönderilememiştir. Hız sensörü onarıldığında diğer arıza otomatik silinecektir.',
      });
    } else if (allCodes.includes('P17BF') && allCodes.includes('P0700')) {
      crossDtcAnalysis = i18n.t('aiDoctor.cross_dsg_tcm', {
        defaultValue: 'Çapraz Analiz: P0700 genel bir şanzıman ikaz bayrağıdır, asıl kök neden mekatronik hidrolik basınç kaçağıdır (P17BF).',
      });
    }
  }

  // 4. Dossier building based on specific fault code & module
  const guided = getGuidedDiagnostics(cleanCode);

  // A. MAF / Air Intake
  if (cleanCode === 'P0102' || cleanCode === 'P0101' || cleanCode === 'P0100' || cleanCode === 'P0103') {
    return {
      systemTitle,
      healthScore: 75,
      riskLevel: 'WARNING',
      driveGuidance: i18n.t('aiDoctor.dossier_p0102_drive', {
        defaultValue: 'Motor koruma haritasına (Limp Home) geçebilir. Düşük ve sabit devirde en yakın servise kadar sürülmesi emniyetlidir.',
      }),
      symptoms: [
        i18n.t('aiDoctor.dossier_p0102_sym1', { defaultValue: 'Hızlanmada gecikme ve çekiş düşüklüğü' }),
        i18n.t('aiDoctor.dossier_p0102_sym2', { defaultValue: 'Rölanti devrinde dalgalanma veya sabah stop etme' }),
        i18n.t('aiDoctor.dossier_p0102_sym3', { defaultValue: 'Yakıt tüketiminde %15-20 artış ve siyah egzoz dumanı' }),
      ],
      probableCauses: guided.probableCauses,
      difficultyLevel: 'DIY_EASY',
      difficultyRating: i18n.t('aiDoctor.diff_easy', { defaultValue: '1/5 - Kolay (Kendin Yap / DIY)' }),
      componentTestingSteps: [
        i18n.t('aiDoctor.dossier_p0102_test1', { defaultValue: 'Hava filtresi kutusu ile gaz kelebeği arasındaki emme körüğünde yırtık ve kelepçe gevşekliğini kontrol edin.' }),
        i18n.t('aiDoctor.dossier_p0102_test2', { defaultValue: 'Kontak açıkken MAF soketinde 1. ve 3. pin arasında 12V akü ve 5V referans voltajını multimetre ile ölçün.' }),
        i18n.t('aiDoctor.dossier_p0102_test3', { defaultValue: 'Rölantide canlı veride hava akış debisinin 2.0 - 4.5 g/s aralığında stabil olduğunu teyit edin.' }),
      ],
      crossDtcAnalysis,
      tsbSummary: guided.tsbSummary,
      recommendedAction: guided.recommendedAction,
      relatedPids: guided.relatedPids,
    };
  }

  // B. ABS Wheel Speed Sensor
  if (
    cleanCode.startsWith('C0035') ||
    cleanCode.startsWith('C0040') ||
    cleanCode.startsWith('C0045') ||
    cleanCode.startsWith('C0050') ||
    cleanCode.startsWith('00283') ||
    cleanCode.startsWith('00285')
  ) {
    return {
      systemTitle,
      healthScore: 55,
      riskLevel: 'WARNING',
      driveGuidance: i18n.t('aiDoctor.dossier_abs_drive', {
        defaultValue: 'Motor ve çekiş gücü etkilenmez, araç yolda kalmaz. Ancak ani frende ABS tekerlekleri kilitler ve ESP savrulma önleyici devre dışıdır. Islak zeminde takip mesafesini 2 katına çıkararak servise sürün.',
      }),
      symptoms: [
        i18n.t('aiDoctor.dossier_abs_sym1', { defaultValue: 'Sarı ABS ve ESP/ESC ikaz lambaları sürekli yanar' }),
        i18n.t('aiDoctor.dossier_abs_sym2', { defaultValue: 'Yokuş kalkış desteği (Hill Holder) ve Lastik Basınç İzleme devre dışı kalır' }),
        i18n.t('aiDoctor.dossier_abs_sym3', { defaultValue: 'Sert frende pedalda titreme olmaz, tekerlek doğrudan kaymaya geçer' }),
      ],
      probableCauses: [
        { cause: i18n.t('aiDoctor.dossier_abs_c1', { defaultValue: 'Porya manyetik halkasında (Tone Ring) metal tozu, pas veya çatlak' }), probability: 60 },
        { cause: i18n.t('aiDoctor.dossier_abs_c2', { defaultValue: 'Tekerlek davlumbazı içi sensör kablo demetinde kırılma/aşınma' }), probability: 25 },
        { cause: i18n.t('aiDoctor.dossier_abs_c3', { defaultValue: 'ABS sensör okuyucu kafa iç devre arızası' }), probability: 15 },
      ],
      difficultyLevel: 'MODERATE',
      difficultyRating: i18n.t('aiDoctor.diff_mod', { defaultValue: '3/5 - Orta (Tekerlek sökümü & multimetre)' }),
      componentTestingSteps: [
        i18n.t('aiDoctor.dossier_abs_test1', { defaultValue: 'Porya bilyası arkasındaki manyetik halkayı balata spreyi ile temizleyin; çatlak veya eksik diş olup olmadığını inceleyin.' }),
        i18n.t('aiDoctor.dossier_abs_test2', { defaultValue: 'Amortisör kulesi üzerindeki soketi ayırıp multimetre ile 12V referans voltajını ölçün.' }),
        i18n.t('aiDoctor.dossier_abs_test3', { defaultValue: 'Tekerleği elle çevirirken canlı telemetri grafiğinde hız sinyalinin (km/s) kesintisiz aktığını doğrulayın.' }),
      ],
      crossDtcAnalysis,
      recommendedAction: i18n.t('aiDoctor.dossier_abs_action', { defaultValue: 'Manyetik halkayı temizleyin, sensör kablosunu inceleyin ve tekerlek hız sinyalini test edin.' }),
      relatedPids: ['WHEEL_SPEED', 'BRAKE_PRESSURE'],
    };
  }

  // C. Transmission (DSG Mechatronic / TCM)
  if (cleanCode === 'P17BF' || cleanCode === 'P189C' || cleanCode === 'P0700' || cleanCode.startsWith('4F8') || cleanCode === 'P1773') {
    return {
      systemTitle,
      healthScore: 25,
      riskLevel: 'CRITICAL',
      driveGuidance: i18n.t('aiDoctor.dossier_tcm_drive', {
        defaultValue: 'Mekatronik hidrolik basınç kaybı riski! Şanzıman kendini korumaya alıp tek sayılı (1-3-5-7) veya çift sayılı vitesleri kilitleyebilir. Dur-kalk trafiğe girmeden doğrudan şanzıman servisine sürün.',
      }),
      symptoms: [
        i18n.t('aiDoctor.dossier_tcm_sym1', { defaultValue: 'Vites geçişlerinde sert sarsıntı, vuruntu veya boşa düşme' }),
        i18n.t('aiDoctor.dossier_tcm_sym2', { defaultValue: 'Göstergede anahtar simgesi veya PRNDS vites harflerinin yanıp sönmesi' }),
        i18n.t('aiDoctor.dossier_tcm_sym3', { defaultValue: 'Geri vitese (R) veya 2. vitese geçişte gecikme' }),
      ],
      probableCauses: [
        { cause: i18n.t('aiDoctor.dossier_tcm_c1', { defaultValue: 'Mekatronik gövdesi hidrolik basınç akümülatör tüpü yuvasında çatlak' }), probability: 70 },
        { cause: i18n.t('aiDoctor.dossier_tcm_c2', { defaultValue: 'Hidrolik yağ pompası elektrik motoru arızası veya sigorta atması' }), probability: 20 },
        { cause: i18n.t('aiDoctor.dossier_tcm_c3', { defaultValue: 'Solenoid valf mekanik sıkışması veya yağ kirliliği' }), probability: 10 },
      ],
      difficultyLevel: 'PROFESSIONAL',
      difficultyRating: i18n.t('aiDoctor.diff_pro', { defaultValue: '5/5 - Yetkili / Özel Servis (Hidrolik basınç boşaltma)' }),
      componentTestingSteps: [
        i18n.t('aiDoctor.dossier_tcm_test1', { defaultValue: 'Mekatronik hidrolik pompa basıncını canlı veriden izleyin (Nominal aralık: 42 - 60 Bar).' }),
        i18n.t('aiDoctor.dossier_tcm_test2', { defaultValue: 'Pompa sürekli çalışıyor ve basınç 15 saniyede 40 Bar altına düşüyorsa akümülatör yuvası çatlaktır; güçlendirilmiş tamir plakası gerekir.' }),
        i18n.t('aiDoctor.dossier_tcm_test3', { defaultValue: 'Mekatronik kartı alt kapağında yeşil hidrolik yağı sızıntısı olup olmadığını kontrol edin.' }),
      ],
      crossDtcAnalysis,
      tsbSummary: i18n.t('aiDoctor.dossier_tcm_tsb', { defaultValue: 'TSB-VAG-DSG: Mekatronik basınç tüpü gövde çatlağı için güçlendirilmiş çelik kovan montajı önerilir.' }),
      recommendedAction: i18n.t('aiDoctor.dossier_tcm_action', { defaultValue: 'Hidrolik basınç testi uygulayın ve mekatronik basınç tüpünü kontrol edin.' }),
      relatedPids: ['TRANSMISSION_SPEED', 'HYDRAULIC_PRESSURE'],
    };
  }

  // D. Airbag / SRS
  if (cleanCode.startsWith('B0001') || cleanCode.startsWith('B0010') || cleanCode.startsWith('B0050') || cleanCode === 'B1000' || cleanCode.startsWith('00588') || cleanCode.startsWith('93B2')) {
    return {
      systemTitle,
      healthScore: 35,
      riskLevel: 'CRITICAL',
      driveGuidance: i18n.t('aiDoctor.dossier_srs_drive', {
        defaultValue: 'Araç yürür durumdadır ve mekanik sürüşü etkilenmez. Ancak olası bir kaza anında hava yastıkları ve emniyet kemeri piroteknik gergileri AÇILMAYACAKTIR!',
      }),
      symptoms: [
        i18n.t('aiDoctor.dossier_srs_sym1', { defaultValue: 'Göstergede kırmızı Hava Yastığı (Airbag) ikaz lambası sürekli yanar' }),
        i18n.t('aiDoctor.dossier_srs_sym2', { defaultValue: 'Direksiyon tuşları veya korna aralıklı çalışabilir (Zemberek kopması)' }),
      ],
      probableCauses: [
        { cause: i18n.t('aiDoctor.dossier_srs_c1', { defaultValue: 'Direksiyon sargısı (Clockspring / Zemberek) spiral şerit kablo kopması' }), probability: 55 },
        { cause: i18n.t('aiDoctor.dossier_srs_c2', { defaultValue: 'Koltuk altındaki sarı SRS soketlerinde temassızlık veya korozyon' }), probability: 35 },
        { cause: i18n.t('aiDoctor.dossier_srs_c3', { defaultValue: 'Hava yastığı beyni dahili kaza verisi (Crash Data) kaydı' }), probability: 10 },
      ],
      difficultyLevel: 'MODERATE',
      difficultyRating: i18n.t('aiDoctor.diff_mod_safe', { defaultValue: '3/5 - Orta (Akü sökümü güvenlik kuralı)' }),
      componentTestingSteps: [
        i18n.t('aiDoctor.dossier_srs_test1', { defaultValue: 'HAYATİ GÜVENLİK: İşleme başlamadan önce akü eksi kutbunu sökün ve en az 15 dakika bekleyin.' }),
        i18n.t('aiDoctor.dossier_srs_test2', { defaultValue: 'Koltuk altındaki sarı soketleri ayırın, kontakt sprey ile oksitlenmeyi temizleyip kelepçeyle sabitleyin.' }),
        i18n.t('aiDoctor.dossier_srs_test3', { defaultValue: 'Hava yastığı fişeğine ASLA standart multimetre direnç modu bağlamayın; ateşleme riski doğurabilir!' }),
      ],
      crossDtcAnalysis,
      recommendedAction: i18n.t('aiDoctor.dossier_srs_action', { defaultValue: 'Koltuk altı soketlerini kontrol edin ve direksiyon zemberek sürekliliğini test edin.' }),
    };
  }

  // E. Engine Misfire
  if (cleanCode.startsWith('P0300') || cleanCode.startsWith('P0301') || cleanCode.startsWith('P0302') || cleanCode.startsWith('P0303') || cleanCode.startsWith('P0304')) {
    return {
      systemTitle,
      healthScore: 30,
      riskLevel: 'CRITICAL',
      driveGuidance: i18n.t('aiDoctor.dossier_p0300_drive', {
        defaultValue: 'Yanmamış yakıt egzoz sistemine giderek katalitik konvertörün aşırı ısınıp erimesine yol açabilir! Ani gazlamalardan kaçının ve aracı en kısa mesafede servise ulaştırın.',
      }),
      symptoms: [
        i18n.t('aiDoctor.dossier_p0300_sym1', { defaultValue: 'Motorda belirgin sarsıntı, tekleme ve güç kaybı' }),
        i18n.t('aiDoctor.dossier_p0300_sym2', { defaultValue: 'Egzozdan çiğ yakıt kokusu ve Check Engine lambasının yanıp sönmesi' }),
        i18n.t('aiDoctor.dossier_p0300_sym3', { defaultValue: 'Yokuş yukarı ivmelenmede gaz yememe ve silkeleme' }),
      ],
      probableCauses: [
        { cause: i18n.t('aiDoctor.dossier_p0300_c1', { defaultValue: 'Aşınmış buji veya çatlamış ateşleme bobini' }), probability: 65 },
        { cause: i18n.t('aiDoctor.dossier_p0300_c2', { defaultValue: 'Tıkanmış veya püskürtmeyen yakıt enjektörü' }), probability: 25 },
        { cause: i18n.t('aiDoctor.dossier_p0300_c3', { defaultValue: 'Silindir kompresyon kaybı veya sübap kaçağı' }), probability: 10 },
      ],
      difficultyLevel: 'DIY_EASY',
      difficultyRating: i18n.t('aiDoctor.diff_easy_spark', { defaultValue: '2/5 - Kendin Yap (Buji/Bobin Yer Değişimi)' }),
      componentTestingSteps: [
        i18n.t('aiDoctor.dossier_p0300_test1', { defaultValue: 'Arızalı silindirin bobinini sağlam bir silindirle (örn: 1. ile 2.) yer değiştirin; arıza kodunun yeni silindire taşınıp taşınmadığını gözlemleyin.' }),
        i18n.t('aiDoctor.dossier_p0300_test2', { defaultValue: 'Buji tırnak aralığını sentil çakısı ile kontrol edin ve buji porseleninde çatlak arayın.' }),
        i18n.t('aiDoctor.dossier_p0300_test3', { defaultValue: 'Enjektör soketindeki darbe sinyalini ve bobin besleme voltajını ölçün.' }),
      ],
      crossDtcAnalysis,
      recommendedAction: i18n.t('aiDoctor.dossier_p0300_action', { defaultValue: 'Bobin yer değiştirme testi uygulayın ve bujileri kontrol edin.' }),
      relatedPids: ['RPM', 'MISFIRE_COUNT', 'COOLANT_TEMP'],
    };
  }

  // F. Generic Fallback per module category
  let defaultSymptoms = [i18n.t('aiDoctor.sym_generic_light', { defaultValue: 'Gösterge panelinde ilgili sistem ikaz lambası yanar' })];
  let defaultDrive = i18n.t('aiDoctor.warningDrive', { defaultValue: 'Düşük hızda servise kadar sürülmesi emniyetlidir.' });
  let defaultTests = [
    i18n.t('aiDoctor.test_generic_1', { defaultValue: 'Kablo demeti soketlerinde oksitlenme ve pim eğilmesini kontrol edin.' }),
    i18n.t('aiDoctor.test_generic_2', { defaultValue: 'Multimetre ile sensör besleme voltajı (5V / 12V) ve şasi sürekliliğini test edin.' }),
  ];

  if (targetModule === 'gateway') {
    defaultSymptoms.push(i18n.t('aiDoctor.sym_gateway_1', { defaultValue: 'Modüller arası veri gecikmesi veya göstergede ibre düşmesi' }));
    defaultDrive = i18n.t('aiDoctor.drive_gateway', { defaultValue: 'CAN hattı iletişiminde aralıklı kesinti var; akü voltaj dalgalanmalarına karşı kontrol ettirin.' });
    defaultTests = [
      i18n.t('aiDoctor.test_gateway_1', { defaultValue: 'OBD portu 6. ve 14. pinler arasındaki CAN sonlandırma direncini akü sökülüyken ölçün (Hedef: ~60Ω).' }),
      i18n.t('aiDoctor.test_gateway_2', { defaultValue: 'Akü kutup başı sıkılığını ve şasi kablosunu kontrol edin.' }),
    ];
  } else if (targetModule === 'bcm') {
    defaultSymptoms.push(i18n.t('aiDoctor.sym_bcm_1', { defaultValue: 'Merkezi kilit, cam açma veya iç aydınlatmada aralıklı tepkisizlik' }));
  } else if (targetModule === 'eps') {
    defaultSymptoms.push(i18n.t('aiDoctor.sym_eps_1', { defaultValue: 'Direksiyon sertleşmesi veya sarı direksiyon ikaz lambası' }));
    defaultDrive = i18n.t('aiDoctor.drive_eps', { defaultValue: 'Direksiyon hidrolik/elektrik desteği azalabilir; dönüşlerde ekstra güç gerekebilir, dikkatli sürün.' });
  }

  return {
    systemTitle,
    healthScore: guided.probableCauses.length > 2 ? 65 : 70,
    riskLevel: 'WARNING',
    driveGuidance: defaultDrive,
    symptoms: defaultSymptoms,
    probableCauses: guided.probableCauses,
    difficultyLevel: 'MODERATE',
    difficultyRating: i18n.t('aiDoctor.diff_mod', { defaultValue: '3/5 - Orta Düzey' }),
    componentTestingSteps: defaultTests,
    crossDtcAnalysis,
    tsbSummary: guided.tsbSummary,
    recommendedAction: guided.recommendedAction,
    relatedPids: guided.relatedPids,
  };
}

/**
 * Generates a full multi-ECU diagnostic report text for PDF / Share export (Fully 26-language localized)
 */
export function generateDiagnosticReportText(
  vehicleVin: string,
  brand: string,
  dtcs: string[],
  scannedModuleCount: number = 11
): string {
  const dateStr = new Date().toLocaleString();
  const title = i18n.t('reportExport.headerTitle', { defaultValue: 'MOTOCORTEX GLOBAL DIAGNOSTIC HEALTH REPORT' });
  const dateLabel = i18n.t('reportExport.dateTime', { defaultValue: 'Date/Time' });
  const vinLabel = i18n.t('reportExport.vin', { defaultValue: 'Vehicle VIN' });
  const makeLabel = i18n.t('reportExport.makeBrand', { defaultValue: 'Make/Brand' });
  const scannedLabel = i18n.t('reportExport.scannedModules', { count: scannedModuleCount, defaultValue: `Scanned ECUs: ${scannedModuleCount} Modules (ECM, TCM, ABS, SRS, BCM, Gateway, IPC, EPS, HVAC, TPMS, BMS)` });
  const dtcCodeLabel = i18n.t('reportExport.dtcCode', { defaultValue: 'DTC CODE' });
  const guidedActionLabel = i18n.t('reportExport.guidedAction', { defaultValue: 'Guided Action' });
  const technicalTsbLabel = i18n.t('reportExport.technicalTsb', { defaultValue: 'Technical TSB' });
  const footerLabel = i18n.t('reportExport.footer', { defaultValue: 'Report generated automatically by MotoCortex Intelligent Diagnostics Platform.' });

  let report = `===============================================\n`;
  report += ` ${title} \n`;
  report += `===============================================\n`;
  report += `${dateLabel} : ${dateStr}\n`;
  report += `${vinLabel}: ${vehicleVin || 'N/A'}\n`;
  report += `${makeLabel} : ${brand || 'Generic OBD2'}\n`;
  report += `${scannedLabel}\n`;
  report += `-----------------------------------------------\n\n`;

  if (!dtcs || dtcs.length === 0) {
    report += `${i18n.t('reportExport.statusHealthy', { defaultValue: 'Status: ALL SYSTEMS HEALTHY (0 DTCs Detected)' })}\n`;
    report += `${i18n.t('reportExport.statusHealthyDesc', { defaultValue: 'No active or pending fault codes found across scanned electronic control units.' })}\n`;
  } else {
    report += `${i18n.t('reportExport.statusFaults', { count: dtcs.length, defaultValue: `Status: FAULTS DETECTED (${dtcs.length} Active DTCs)` })}\n\n`;
    dtcs.forEach((code, index) => {
      const guided = getGuidedDiagnostics(code);
      report += `[${index + 1}] ${dtcCodeLabel}: ${code}\n`;
      report += ` ${guidedActionLabel} : ${guided.recommendedAction}\n`;
      if (guided.tsbSummary) {
        report += ` ${technicalTsbLabel} : ${guided.tsbSummary}\n`;
      }
      report += `-----------------------------------------------\n`;
    });
  }

  report += `\n${footerLabel}\n`;
  return report;
}
