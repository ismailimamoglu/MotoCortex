/**
 * Mode 06 (On-Board Monitoring Test Results) Protocol Parser Engine
 * Parses quantitative test values, minimum/maximum thresholds, and pass/fail status
 * for Catalyst efficiency, O2 sensors, EVAP leak, and EGR systems.
 */

export interface Mode06TestResult {
  tid: string; // Test ID (e.g. 0x01, 0x02)
  cid: string; // Component ID / MID (Monitor ID)
  name: string;
  value: number;
  minLimit: number;
  maxLimit: number;
  unit: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  healthScorePct: number; // Quantitative margin to fail limit (0-100%)
}

export class Mode06MonitorEngine {
  /**
   * Parses raw Mode 06 hex response payload (e.g. from command '06 00' or specific MIDs).
   */
  public static parseMode06Response(rawResponseHex: string): Mode06TestResult[] {
    const clean = rawResponseHex.replace(/\s+/g, '').replace('SEARCHING...', '').toUpperCase();
    if (clean.includes('NODATA') || clean.includes('ERROR') || clean.length < 12) {
      return [];
    }

    const results: Mode06TestResult[] = [];
    
    // Look for Mode 06 response prefix '46'
    const payloadIndex = clean.indexOf('46');
    if (payloadIndex === -1) return [];

    const payload = clean.substring(payloadIndex + 2);
    
    // Process 9-byte / 18-hex-char CAN OBD Mode 06 records: [MID (2)] [TID (2)] [UNIT/SCALE (2)] [VAL (4)] [MIN (4)] [MAX (4)]
    for (let i = 0; i <= payload.length - 18; i += 18) {
      const chunk = payload.substring(i, i + 18);
      if (chunk.length < 18) break;

      const midHex = chunk.substring(0, 2);
      const tidHex = chunk.substring(2, 4);
      const valHex = chunk.substring(6, 10);
      const minHex = chunk.substring(10, 14);
      const maxHex = chunk.substring(14, 18);

      const val = parseInt(valHex, 16);
      const min = parseInt(minHex, 16);
      const max = parseInt(maxHex, 16);

      if (isNaN(val) || isNaN(min) || isNaN(max)) continue;

      const testName = this.getMonitorName(midHex, tidHex);
      const isPassed = val >= min && val <= max;

      // Quantitative margin calculation
      let marginPct = 100;
      if (max > min && max !== 0xFFFF) {
        const span = max - min;
        const distToLimit = Math.min(val - min, max - val);
        marginPct = Math.max(0, Math.min(100, Math.round((distToLimit / (span / 2)) * 100)));
      }

      let status: 'PASSED' | 'FAILED' | 'WARNING' = isPassed ? 'PASSED' : 'FAILED';
      if (isPassed && marginPct < 15) {
        status = 'WARNING'; // Close to boundary
      }

      results.push({
        tid: tidHex,
        cid: midHex,
        name: testName,
        value: val,
        minLimit: min,
        maxLimit: max,
        unit: 'Counts',
        status,
        healthScorePct: marginPct,
      });
    }

    return results;
  }

  private static getMonitorName(midHex: string, tidHex: string): string {
    const mid = parseInt(midHex, 16);
    switch (mid) {
      case 0x01: return 'O2 Sensor Bank 1 Sensor 1 Response Time';
      case 0x02: return 'O2 Sensor Bank 1 Sensor 2 Voltage Switch';
      case 0x21: return 'Catalyst Monitor Bank 1 Efficiency';
      case 0x22: return 'Catalyst Monitor Bank 2 Efficiency';
      case 0x35: return 'EGR Flow & Position Sensor Test';
      case 0x3A: return 'EVAP System 0.090" Leak Test';
      case 0x3B: return 'EVAP System 0.040" Leak Test';
      case 0x3C: return 'EVAP Purge Flow Monitor';
      case 0x41: return 'Heated Catalyst Bank 1 Test';
      default: return `Monitor MID 0x${midHex} TID 0x${tidHex}`;
    }
  }
}

export default Mode06MonitorEngine;
