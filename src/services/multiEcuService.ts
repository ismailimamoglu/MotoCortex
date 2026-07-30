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
    id: 'ecm',
    nameKey: 'multiEcu.ecmName',
    txHeader: '7E0',
    rxHeader: '7E8',
    category: 'powertrain',
    icon: 'engine',
  },
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
}

export default MultiEcuService;
