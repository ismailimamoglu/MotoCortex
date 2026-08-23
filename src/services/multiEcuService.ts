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

import { decodeDtcCodesFromResponse, sanitizeObdStream } from '../core/parser/DtcStreamParser';

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

export type EcuModuleStatus = 'CLEAN' | 'FAULT_DETECTED' | 'NO_RESPONSE' | 'NOT_SUPPORTED';

export interface ModuleDiagnosticResult {
  module: EcuModuleTarget;
  isResponding: boolean;
  dtcCount: number;
  dtcCodes: string[];
  status: EcuModuleStatus;
  latencyMs: number;
  rawResponse?: string;
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
   * Parses raw Mode 03 / Mode 07 / UDS hex response into standard DTC codes
   */
  public static parseDtcPayload(response: string): string[] {
    return decodeDtcCodesFromResponse(response);
  }

  /**
   * Checks if the active protocol supports multi-ECU CAN header addressing
   */
  public static isMultiEcuSupportedForProtocol(protocol: string | null | undefined): boolean {
    if (!protocol) return true;
    const p = protocol.toUpperCase();
    // K-Line / Legacy protocols do not support AT SH CAN broadcast targeting
    if (
      p.includes('ISO 9141') ||
      p.includes('ISO 14230') ||
      p.includes('KWP') ||
      p.includes('J1850') ||
      p === '3' ||
      p === '4' ||
      p === '5' ||
      p === '1' ||
      p === '2'
    ) {
      return false;
    }
    return true;
  }

  /**
   * Scans a specific hardware ECU module for active/stored DTCs via CAN header redirection
   */
  public static async scanHardwareModule(
    module: EcuModuleTarget,
    currentProtocol?: string | null,
    timeoutMs: number = 2500
  ): Promise<ModuleDiagnosticResult> {
    const OBDCommandQueue = require('../api/OBDCommandQueue').default;
    const { preciseSleep } = require('../api/OBDCommandQueue');
    const startTime = Date.now();

    // 1. Protocol Compatibility Check
    if (!MultiEcuService.isMultiEcuSupportedForProtocol(currentProtocol)) {
      return {
        module,
        isResponding: false,
        dtcCount: 0,
        dtcCodes: [],
        status: 'NOT_SUPPORTED',
        latencyMs: 0,
        rawResponse: 'K-Line / Legacy Protocol (CAN Header unsupported)',
      };
    }

    try {
      // 2. Switch to target ECU header
      await OBDCommandQueue.add(`AT SH ${module.txHeader}`, 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(60);

      // 3. Query Mode 03 (Stored DTCs)
      const res03 = await OBDCommandQueue.add('03', timeoutMs, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      const latencyMs = Date.now() - startTime;
      const clean = sanitizeObdStream(res03 || '');

      // 4. Restore default ECM header (7E0)
      await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      await preciseSleep(40);

      // Check if response is empty, NO DATA, or error
      if (!clean || res03?.toUpperCase().includes('NO DATA') || res03?.includes('?') || res03?.toUpperCase().includes('UNABLE')) {
        return {
          module,
          isResponding: false,
          dtcCount: 0,
          dtcCodes: [],
          status: 'NO_RESPONSE',
          latencyMs,
          rawResponse: res03 || '',
        };
      }

      const dtcs = MultiEcuService.parseDtcPayload(res03);

      return {
        module,
        isResponding: true,
        dtcCount: dtcs.length,
        dtcCodes: dtcs,
        status: dtcs.length > 0 ? 'FAULT_DETECTED' : 'CLEAN',
        latencyMs,
        rawResponse: res03,
      };
    } catch (e: any) {
      try {
        await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      } catch {}
      return {
        module,
        isResponding: false,
        dtcCount: 0,
        dtcCodes: [],
        status: 'NO_RESPONSE',
        latencyMs: Date.now() - startTime,
        rawResponse: e?.message || 'TIMEOUT',
      };
    }
  }

  /**
   * Scans a specific hardware ECU module for active/stored DTCs via CAN header redirection
   * (Legacy wrapper)
   */
  public static async scanHardwareModuleDtc(txHeader: string, timeoutMs: number = 2500): Promise<string[]> {
    const targetModule = KNOWN_ECU_MODULES.find((m) => m.txHeader === txHeader) || {
      id: 'custom',
      nameKey: 'multiEcu.custom',
      txHeader,
      rxHeader: txHeader.replace(/^7/, '78'),
      category: 'powertrain' as const,
      icon: 'cog',
    };
    const res = await MultiEcuService.scanHardwareModule(targetModule, undefined, timeoutMs);
    return res.dtcCodes;
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
      try {
        await OBDCommandQueue.add('AT SH 7E0', 800, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      } catch {}
      return false;
    }
  }
}

export default MultiEcuService;
