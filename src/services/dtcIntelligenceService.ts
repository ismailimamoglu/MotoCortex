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

// OEM Specific DTC Database
const OEM_DTC_DATABASE: Record<string, Record<string, string>> = {
  VAG: {
    '18010': 'P1602 Power Supply Terminal 30: Voltage Too Low',
    '17978': 'P1570 Engine Control Module Disabled by Immobilizer',
    '18265': 'P1857 Load Signal: Error Message from ECU',
    'P17BF': 'DSG Hydraulic Pressure Loss - Mechatronic Accumulator Leak',
  },
  BMW: {
    '2A87': 'Exhaust VANOS Variable Camshaft Timing Mechanism Tight/Stuck',
    '2AAF': 'Fuel Pump Control Module Plausibility/Pressure Fault',
    '2C57': 'Charge Air Pressure Control: Pressure Too Low',
  },
  MERCEDES: {
    '9007': 'Control Module N73 (EIS/EZS Control Unit) Hardware Fault',
    '9051': 'SRS Airbag Control Unit Internal Power Circuit Fault',
  },
  TOYOTA: {
    'P0A80': 'Replace Hybrid Battery Pack Assembly',
    'C1259': 'HV System Regenerative Braking Malfunction',
  },
  FORD: {
    'B10D7': 'PATS Passive Anti-Theft Key Transponder Fault',
    'U3000': 'Control Module Internal System Malfunction',
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
 * Looks up manufacturer OEM-specific fault code
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

import i18n from '../i18n';

/**
 * Provides guided diagnostic mappings for live data PID charts & probabilities
 */
export function getGuidedDiagnostics(code: string): GuidedDiagnostic {
  const cleanCode = code.toUpperCase().trim();

  switch (cleanCode) {
    case 'P0102':
    case 'P0101':
      return {
        relatedPids: ['MAF', 'RPM', 'ENGINE_LOAD'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0102_cause1', 'Dirty or Faulty MAF Sensor'), probability: 65 },
          { cause: i18n.t('guidedDiag.p0102_cause2', 'Intake Leak / Vacuum Leak'), probability: 25 },
          { cause: i18n.t('guidedDiag.p0102_cause3', 'Wiring Harness Damage'), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0102_action', 'Clean MAF sensor with contact cleaner or inspect air filter housing for leaks.'),
        tsbSummary: i18n.t('guidedDiag.p0102_tsb', 'TSB-2023-09: Inspect air intake hose clamp torque before replacing MAF.'),
      };

    case 'P0171':
      return {
        relatedPids: ['STFT1', 'LTFT1', 'MAF', 'O2_VOLTAGE'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0171_cause1', 'Vacuum Hose Leak / Intake Leak'), probability: 50 },
          { cause: i18n.t('guidedDiag.p0171_cause2', 'Weak Fuel Pump / Low Pressure'), probability: 30 },
          { cause: i18n.t('guidedDiag.p0171_cause3', 'Fouled O2 Sensor 1'), probability: 20 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0171_action', 'Perform smoke test on intake manifold and check long-term fuel trim (LTFT).'),
        tsbSummary: i18n.t('guidedDiag.p0171_tsb', 'TSB-2022-14: Check PCV valve diaphragm for tears.'),
      };

    case 'P0420':
      return {
        relatedPids: ['O2_B1S1', 'O2_B1S2', 'CAT_TEMP'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0420_cause1', 'Catalytic Converter Efficiency Degradation'), probability: 70 },
          { cause: i18n.t('guidedDiag.p0420_cause2', 'Rear Downstream O2 Sensor Fault'), probability: 20 },
          { cause: i18n.t('guidedDiag.p0420_cause3', 'Exhaust Leak Before Converter'), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0420_action', 'Compare upstream vs downstream O2 sensor waveforms or check catalytic converter temperature.'),
      };

    case 'P0300':
    case 'P0301':
    case 'P0302':
      return {
        relatedPids: ['RPM', 'MISFIRE_COUNT', 'COOLANT_TEMP'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p0300_cause1', 'Worn Spark Plug / Ignition Coil'), probability: 60 },
          { cause: i18n.t('guidedDiag.p0300_cause2', 'Clogged Fuel Injector'), probability: 30 },
          { cause: i18n.t('guidedDiag.p0300_cause3', 'Low Engine Cylinder Compression'), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p0300_action', 'Swap ignition coil to adjacent cylinder and monitor if misfire follows.'),
      };

    case 'P17BF':
    case 'P0700':
      return {
        relatedPids: ['TRANSMISSION_SPEED', 'HYDRAULIC_PRESSURE', 'GEAR_RATIO'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.p17bf_cause1', 'Mechatronic Hydraulic Pressure Accumulator Leak'), probability: 75 },
          { cause: i18n.t('guidedDiag.p17bf_cause2', 'Solenoid Valve Circuit Fault'), probability: 15 },
          { cause: i18n.t('guidedDiag.p17bf_cause3', 'Low Fluid Level / Fluid Degradation'), probability: 10 },
        ],
        recommendedAction: i18n.t('guidedDiag.p17bf_action', 'Perform DCT Mechatronic pressure test and inspect accumulator housing.'),
        tsbSummary: i18n.t('guidedDiag.p17bf_tsb', 'TSB-VAG-DSG: Replace mechatronic pressure housing or reinforced accumulator plate.'),
      };

    default:
      return {
        relatedPids: ['RPM', 'SPEED', 'COOLANT_TEMP', 'VOLTAGE'],
        probableCauses: [
          { cause: i18n.t('guidedDiag.default_cause1', 'Component Circuit / Wiring Resistance Fault'), probability: 50 },
          { cause: i18n.t('guidedDiag.default_cause2', 'Mechanical Wear or Sensor Degradation'), probability: 50 },
        ],
        recommendedAction: i18n.t('guidedDiag.default_action', 'Perform voltage drop & continuity check using multimeter.'),
      };
  }
}

/**
 * Generates a full multi-ECU diagnostic report text for PDF / Share export
 */
export function generateDiagnosticReportText(
  vehicleVin: string,
  brand: string,
  dtcs: string[],
  scannedModuleCount: number = 11
): string {
  const dateStr = new Date().toLocaleString();
  let report = `===============================================\n`;
  report += `   MOTOCORTEX GLOBAL DIAGNOSTIC HEALTH REPORT  \n`;
  report += `===============================================\n`;
  report += `Date/Time : ${dateStr}\n`;
  report += `Vehicle VIN: ${vehicleVin || 'N/A'}\n`;
  report += `Make/Brand : ${brand || 'Generic OBD2'}\n`;
  report += `Scanned ECUs: ${scannedModuleCount} Modules (ECM, TCM, ABS, SRS, BCM, Gateway, IPC, EPS, HVAC, TPMS, BMS)\n`;
  report += `-----------------------------------------------\n\n`;

  if (!dtcs || dtcs.length === 0) {
    report += `Status: ✅ ALL SYSTEMS HEALTHY (0 DTCs Detected)\n`;
    report += `No active or pending fault codes found across scanned electronic control units.\n`;
  } else {
    report += `Status: ⚠️ FAULTS DETECTED (${dtcs.length} Active DTCs)\n\n`;
    dtcs.forEach((code, index) => {
      const guided = getGuidedDiagnostics(code);
      report += `[${index + 1}] DTC CODE: ${code}\n`;
      report += `     Guided Action : ${guided.recommendedAction}\n`;
      if (guided.tsbSummary) {
        report += `     Technical TSB : ${guided.tsbSummary}\n`;
      }
      report += `-----------------------------------------------\n`;
    });
  }

  report += `\nReport generated automatically by MotoCortex Intelligent Diagnostics Platform.\n`;
  return report;
}
