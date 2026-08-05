// src/core/coding/VinMarketRouter.ts
// MotoCortex v10.0 - VIN-Based Regional Market & OEM Variant Routing Engine

export type TargetMarketRegion = 'EUROPE' | 'NORTH_AMERICA' | 'JAPAN' | 'CHINA' | 'GLOBAL';

export interface MarketRoutingProfile {
  region: TargetMarketRegion;
  countryName: string;
  isRhd: boolean; // Right-Hand Drive (UK, Japan, Australia)
  requiresAvas: boolean; // Acoustic Vehicle Alerting System regulation
  allowsDrlMute: boolean;
  didPayloadOverrides: Record<string, string>;
}

export class VinMarketRouter {
  /**
   * Resolves target market region from VIN 1st character WMI.
   */
  public static resolveMarketProfile(vin: string): MarketRoutingProfile {
    if (!vin || vin.length < 3) {
      return VinMarketRouter.getDefaultProfile('GLOBAL');
    }

    const firstChar = vin.charAt(0).toUpperCase();

    if (['1', '4', '5'].includes(firstChar)) {
      return {
        region: 'NORTH_AMERICA',
        countryName: 'USA / North America',
        isRhd: false,
        requiresAvas: true,
        allowsDrlMute: false,
        didPayloadOverrides: { '2001': '01' } // US Amber Sidemarkers
      };
    }

    if (['W', 'Z', 'S', 'V'].includes(firstChar)) {
      return {
        region: 'EUROPE',
        countryName: 'Europe (ECE)',
        isRhd: firstChar === 'S', // UK WMI S
        requiresAvas: true,
        allowsDrlMute: true,
        didPayloadOverrides: { '2001': '02' } // ECE White DRL
      };
    }

    if (['J'].includes(firstChar)) {
      return {
        region: 'JAPAN',
        countryName: 'Japan (JDM)',
        isRhd: true,
        requiresAvas: true,
        allowsDrlMute: true,
        didPayloadOverrides: { '2001': '03' } // JDM Folding Mirrors
      };
    }

    if (['L'].includes(firstChar)) {
      return {
        region: 'CHINA',
        countryName: 'China EV Market',
        isRhd: false,
        requiresAvas: true,
        allowsDrlMute: true,
        didPayloadOverrides: { '3001': 'FF' } // V2L Output 3.6kW MAX
      };
    }

    return VinMarketRouter.getDefaultProfile('GLOBAL');
  }

  private static getDefaultProfile(region: TargetMarketRegion): MarketRoutingProfile {
    return {
      region,
      countryName: 'Global Standard',
      isRhd: false,
      requiresAvas: false,
      allowsDrlMute: true,
      didPayloadOverrides: {}
    };
  }
}
