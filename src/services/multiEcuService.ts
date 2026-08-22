/**
 * Multi-ECU Diagnostic Topology Scanner for MotoCortex
 * 
 * Enables multi-module diagnostic connection across:
 * - Engine Control Module (ECM) - Header 0x7E0 / Response 0x7E8
 * - Transmission Control Module (TCM / DCT) - Header 0x7E1 / Response 0x7E9
 * - ABS / ESC Brake Module - Header 0x7D0 / Response 0x7D8
 * - Airbag / SRS Safety Module - Header 0x770 / Response 0x778
 * - Body Control Module (BCM) - Header 0x720 / Response 0x728
 */

export interface EcuModuleTarget {
  id: string;
  nameKey: string;
  txHeader: string; // e.g. '7E0'
  rxHeader: string; // e.g. '7E8'
  category: 'powertrain' | 'chassis' | 'body' | 'safety';
  icon: string;
}

export const KNOWN_ECU_MODULES: EcuModuleTarget[] = [
  {
    id: 'tcm',
    nameKey: 'multiEcu.tcmName',
    txHeader: '7E1',
    rxHeader: '7E9',
    category: 'powertrain',
    icon: 'cog',
  },
  {
    id: 'abs',
    nameKey: 'multiEcu.absName',
    txHeader: '7D0',
    rxHeader: '7D8',
    category: 'chassis',
    icon: 'car-brake-abs',
  },
  {
    id: 'srs',
    nameKey: 'multiEcu.srsName',
    txHeader: '770',
    rxHeader: '778',
    category: 'safety',
    icon: 'car-seat-belt',
  },
  {
    id: 'bcm',
    nameKey: 'multiEcu.bcmName',
    txHeader: '720',
    rxHeader: '728',
    category: 'body',
    icon: 'car-door',
  },
  {
    id: 'gateway',
    nameKey: 'multiEcu.gatewayName',
    txHeader: '700',
    rxHeader: '708',
    category: 'body',
    icon: 'router-network',
  },
  {
    id: 'ipc',
    nameKey: 'multiEcu.ipcName',
    txHeader: '760',
    rxHeader: '768',
    category: 'body',
    icon: 'speedometer',
  },
  {
    id: 'eps',
    nameKey: 'multiEcu.epsName',
    txHeader: '730',
    rxHeader: '738',
    category: 'chassis',
    icon: 'steering',
  },
  {
    id: 'hvac',
    nameKey: 'multiEcu.hvacName',
    txHeader: '744',
    rxHeader: '74C',
    category: 'body',
    icon: 'air-conditioner',
  },
  {
    id: 'tpms',
    nameKey: 'multiEcu.tpmsName',
    txHeader: '750',
    rxHeader: '758',
    category: 'chassis',
    icon: 'car-tire-alert',
  },
  {
    id: 'bms',
    nameKey: 'multiEcu.bmsName',
    txHeader: '7E2',
    rxHeader: '7EA',
    category: 'powertrain',
    icon: 'battery-charging-high',
  },
];

export interface ModuleDiagnosticResult {
  module: EcuModuleTarget;
  isResponding: boolean;
  dtcCount: number;
  dtcCodes: string[];
  status: 'CLEAN' | 'FAULT_DETECTED' | 'NO_RESPONSE';
  latencyMs: number;
}

export class MultiEcuService {
  /**
   * Generates ELM327 command sequence to target a specific ECU header
   */
  public static getHeaderSelectCommands(headerHex: string): string[] {
    return [
      `AT SH ${headerHex}`, // Set Header
      `AT CRA ${headerHex.replace(/^7/, '78')}`, // Set CAN Rx Filter
    ];
  }

  /**
   * Restores default OBD2 ECM Header (7E0)
   */
  public static getRestoreDefaultHeaderCommands(): string[] {
    return [
      'AT SH 7E0',
      'AT CRA', // Clear filter
    ];
  }

  /**
   * Parses raw Mode 03 / Mode 07 / UDS hex response into standard DTC codes (P, C, B, U)
   */
  public static parseDtcPayload(response: string): string[] {
    if (!response) return [];
    const lines = response.split(/[\r\n]+/);
    const dtcs: string[] = [];

    for (const line of lines) {
      const clean = line
        .replace(/SEARCHING\.*/gi, '')
        .replace(/[0-9]+:/g, '')
        .replace(/NO\s*DATA/gi, '')
        .replace(/\s+/g, '')
        .toUpperCase();

      if (!clean || clean.includes('UNABLE') || clean.includes('ERROR') || clean.includes('?')) {
        continue;
      }

      // Regex matches 43 or 47 response markers across single or concatenated multi-ECU frames
      const frameRegex = /(?:43|47)([0-9A-F]+?)(?=(?:43|47)|$)/g;
      let match: RegExpExecArray | null;

      while ((match = frameRegex.exec(clean)) !== null) {
        const payload = match[1];
        for (let i = 0; i + 4 <= payload.length; i += 4) {
          const codeHex = payload.substring(i, i + 4);
          if (codeHex === '0000') continue;
          const firstCharHex = parseInt(codeHex[0], 16);
          let dtcType = 'P';
          if (firstCharHex >= 4 && firstCharHex <= 7) dtcType = 'C';
          else if (firstCharHex >= 8 && firstCharHex <= 11) dtcType = 'B';
          else if (firstCharHex >= 12 && firstCharHex <= 15) dtcType = 'U';
          dtcs.push(`${dtcType}${firstCharHex & 3}${codeHex.substring(1)}`);
        }
      }
    }

    return Array.from(new Set(dtcs));
  }

  /**
   * Scans a specific hardware ECU module for active/stored DTCs via CAN header redirection
   */
  public static async scanHardwareModuleDtc(txHeader: string, timeoutMs: number = 2500): Promise<string[]> {
    const OBDCommandQueue = require('../api/OBDCommandQueue').default;
    const { preciseSleep } = require('../api/OBDCommandQueue');

    try {
      // 1. Switch to target ECU header
      await OBDCommandQueue.add(`AT SH ${txHeader}`, 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(60);

      // 2. Query Mode 03 (Stored DTCs)
      const res03 = await OBDCommandQueue.add('03', timeoutMs, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      const dtcs = MultiEcuService.parseDtcPayload(res03);

      // 3. Restore default ECM header (7E0)
      await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(40);

      return dtcs;
    } catch {
      // Safety guarantee: Always restore default ECM header
      try {
        await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      } catch {}
      return [];
    }
  }

  /**
   * Clears DTC memory for a specific hardware ECU module via CAN header redirection
   */
  public static async clearHardwareModuleDtc(txHeader: string, timeoutMs: number = 3000): Promise<boolean> {
    const OBDCommandQueue = require('../api/OBDCommandQueue').default;
    const { preciseSleep } = require('../api/OBDCommandQueue');

    try {
      // 1. Switch to target ECU header
      await OBDCommandQueue.add(`AT SH ${txHeader}`, 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(80);

      // 2. Send Mode 04 (Clear DTCs)
      const res04 = await OBDCommandQueue.add('04', timeoutMs, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      const clean04 = (res04 || '').replace(/\s+/g, '').toUpperCase();
      let success = clean04.includes('44') || clean04.includes('OK');

      // 3. UDS Fallback if Mode 04 was unacknowledged
      if (!success) {
        const resUds = await OBDCommandQueue.add('14FFFFFF', timeoutMs, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
        const cleanUds = (resUds || '').replace(/\s+/g, '').toUpperCase();
        success = cleanUds.includes('54') || cleanUds.includes('OK');
      }

      // 4. Restore default ECM header (7E0)
      await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(50);

      return success;
    } catch {
      // Safety guarantee: Always restore default ECM header
      try {
        await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      } catch {}
      return false;
    }
  }
}

export default MultiEcuService;
