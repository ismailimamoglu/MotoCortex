// src/core/coding/AutoDiscoveryEngine.ts
// MotoCortex v10.0 - Dynamic CAN Bus UDS DID Auto-Discovery & Capability Enumeration Engine

import { isSafetyCriticalModule } from '../security/SafetyCriticalEcuRegistry';

export interface DiscoveredDidResult {
  ecuAddress: number;
  did: number; // Hex DID e.g. 0x2001
  didHex: string; // e.g. "2001"
  rawPayload: string;
  isProvenSafe: boolean;
  category: 'lighting' | 'convenience' | 'display' | 'chassis_safe' | 'ev_power';
  suggestedFeatureName?: string;
}

export interface AutoScanProgress {
  scannedCount: number;
  totalCandidates: number;
  foundDids: DiscoveredDidResult[];
  status: 'idle' | 'scanning' | 'complete' | 'aborted';
}

export class AutoDiscoveryEngine {
  private static instance: AutoDiscoveryEngine | null = null;
  private isScanning: boolean = false;
  private shouldAbort: boolean = false;

  // Safe Non-Safety-Critical UDS DIDs range for discovery (0x2000 - 0x20FF / 0x0900 - 0x09FF)
  public static readonly CANDIDATE_DIDS: number[] = [
    0x2001, 0x2002, 0x2003, 0x2005, 0x2010, 0x2015, 0x2020, 0x2030,
    0x0902, 0x0904, 0x0906, 0x1000, 0x1001, 0x1002, 0x3001, 0x3002
  ];

  private constructor() {}

  public static getInstance(): AutoDiscoveryEngine {
    if (!AutoDiscoveryEngine.instance) {
      AutoDiscoveryEngine.instance = new AutoDiscoveryEngine();
    }
    return AutoDiscoveryEngine.instance;
  }

  /**
   * Performs UDS 0x22 DID Enumeration on connected non-safety ECU modules.
   */
  public async scanEcuCapabilities(
    ecuAddress: number,
    sendCommandFn: (cmd: string) => Promise<string | undefined>,
    onProgress?: (progress: AutoScanProgress) => void
  ): Promise<DiscoveredDidResult[]> {
    // 1. Safety Check: Verify target ECU is NOT Safety-Critical (ABS, Airbag, EPS)
    const isCritical = isSafetyCriticalModule(ecuAddress.toString(16));
    if (isCritical) {
      console.warn(`[AutoDiscoveryEngine] Aborting scan on Safety-Critical ECU 0x${ecuAddress.toString(16)}!`);
      return [];
    }

    this.isScanning = true;
    this.shouldAbort = false;

    const discovered: DiscoveredDidResult[] = [];
    const candidates = AutoDiscoveryEngine.CANDIDATE_DIDS;

    for (let i = 0; i < candidates.length; i++) {
      if (this.shouldAbort) {
        console.log('[AutoDiscoveryEngine] Scan aborted by user.');
        break;
      }

      const did = candidates[i];
      const didHex = did.toString(16).padStart(4, '0').toUpperCase();

      try {
        // Query UDS ReadDataByIdentifier (0x22 + DID)
        const response = await sendCommandFn(`22${didHex}`);

        // Valid positive response starts with 62 + DID
        if (response && response.toUpperCase().startsWith(`62${didHex}`)) {
          const rawPayload = response.substring(6);

          const result: DiscoveredDidResult = {
            ecuAddress,
            did,
            didHex,
            rawPayload,
            isProvenSafe: true,
            category: this.categorizeDid(did),
            suggestedFeatureName: this.getSuggestedFeatureName(did)
          };

          discovered.push(result);
        }
      } catch (e) {
        console.warn(`[AutoDiscoveryEngine] DID 0x${didHex} query skipped:`, e);
      }

      if (onProgress) {
        onProgress({
          scannedCount: i + 1,
          totalCandidates: candidates.length,
          foundDids: [...discovered],
          status: this.isScanning ? 'scanning' : 'complete'
        });
      }
    }

    this.isScanning = false;
    return discovered;
  }

  public abortScan(): void {
    this.shouldAbort = true;
    this.isScanning = false;
  }

  private categorizeDid(did: number): 'lighting' | 'convenience' | 'display' | 'chassis_safe' | 'ev_power' {
    if (did >= 0x2000 && did <= 0x200F) return 'lighting';
    if (did >= 0x2010 && did <= 0x202F) return 'convenience';
    if (did >= 0x0900 && did <= 0x09FF) return 'display';
    if (did >= 0x3000) return 'ev_power';
    return 'chassis_safe';
  }

  private getSuggestedFeatureName(did: number): string {
    switch (did) {
      case 0x2001: return 'Daytime Running Light (DRL) Brightness Control';
      case 0x2002: return 'Needle Sweep / Gauge Staging';
      case 0x2003: return 'Acoustic Lock/Unlock Chirp Notification';
      case 0x2010: return 'Convenience Window Open/Close via Key Fob';
      case 0x0902: return 'Extended Vehicle Info Display';
      case 0x3001: return 'V2L 3.6kW Power Output Unlock';
      default: return `Custom OEM Feature (DID 0x${did.toString(16).toUpperCase()})`;
    }
  }
}

export default AutoDiscoveryEngine.getInstance();
