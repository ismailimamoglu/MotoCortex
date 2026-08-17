/**
 * Diesel Particulate Filter (DPF) Monitoring Service for MotoCortex
 * 
 * Supports DPF Soot Loading percentage, Ash Mass (g), Exhaust Gas Temp (EGT °C),
 * Differential Pressure (hPa), and Regeneration State monitoring across VAG, BMW,
 * Mercedes, Renault, Ford, Stellantis, and standard OBD2 PID 0x78 / 0x79 / 0x7A / 0x7B.
 */

export interface DpfDataInput {
  sootMassGrams?: number;
  maxSootCapacityGrams?: number; // Default 45g - 60g
  ashMassGrams?: number;
  maxAshCapacityGrams?: number; // Default 80g - 100g
  differentialPressureHpa?: number;
  egtTempC?: number; // Exhaust gas temperature
  lastRegenKmAgo?: number;
  isRegenActive?: boolean;
}

export type DpfHealthState = 'OPTIMAL' | 'MODERATE' | 'HIGH_SOOT' | 'CRITICAL_CLOGGED';

export interface DpfAnalysisResult {
  sootPercentage: number;
  ashPercentage: number;
  healthState: DpfHealthState;
  stateTitleKey: string;
  statusColor: string;
  egtStatusKey: string;
  regenRecommendationKey: string;
}

export interface OemDpfDidProfile {
  make: string;
  sootDidHex: string;
  tempDidHex?: string;
  diffPressureDidHex?: string;
  sootScale: number;
}

export const OEM_DPF_DID_PROFILES: Record<string, OemDpfDidProfile> = {
  volkswagen: { make: 'Volkswagen / VAG', sootDidHex: '114E', tempDidHex: '1153', diffPressureDidHex: '1156', sootScale: 0.1 },
  bmw: { make: 'BMW / MINI', sootDidHex: '010A', tempDidHex: '010B', sootScale: 0.1 },
  mercedes: { make: 'Mercedes-Benz', sootDidHex: '0023', diffPressureDidHex: '0024', sootScale: 0.1 },
  renault: { make: 'Renault / Dacia', sootDidHex: '2002', sootScale: 0.1 },
  ford: { make: 'Ford', sootDidHex: '0556', sootScale: 0.1 },
  stellantis: { make: 'Stellantis / Fiat / Peugeot', sootDidHex: '180E', sootScale: 0.1 }
};

export class DpfService {
  public static analyze(input: DpfDataInput): DpfAnalysisResult {
    const maxSoot = input.maxSootCapacityGrams || 50;
    const maxAsh = input.maxAshCapacityGrams || 80;

    const sootGrams = Math.max(0, input.sootMassGrams || 0);
    const ashGrams = Math.max(0, input.ashMassGrams || 0);

    const sootPercentage = Math.min(100, Math.round((sootGrams / maxSoot) * 100));
    const ashPercentage = Math.min(100, Math.round((ashGrams / maxAsh) * 100));

    let healthState: DpfHealthState = 'OPTIMAL';
    let stateTitleKey = 'dpf.stateOptimal';
    let statusColor = '#00ff88'; // Green
    let regenRecommendationKey = 'dpf.recommendNormal';

    if (sootPercentage >= 85 || (input.differentialPressureHpa && input.differentialPressureHpa > 150)) {
      healthState = 'CRITICAL_CLOGGED';
      stateTitleKey = 'dpf.stateCriticalClogged';
      statusColor = '#ff3b3b'; // Red
      regenRecommendationKey = 'dpf.recommendServiceRegen';
    } else if (sootPercentage >= 65 || (input.differentialPressureHpa && input.differentialPressureHpa > 80)) {
      healthState = 'HIGH_SOOT';
      stateTitleKey = 'dpf.stateHighSoot';
      statusColor = '#ffb800'; // Amber
      regenRecommendationKey = 'dpf.recommendHighwayDrive';
    } else if (sootPercentage >= 40) {
      healthState = 'MODERATE';
      stateTitleKey = 'dpf.stateModerate';
      statusColor = '#007eff'; // Blue
      regenRecommendationKey = 'dpf.recommendMonitor';
    }

    let egtStatusKey = 'dpf.egtCold';
    const egt = input.egtTempC || 0;
    if (input.isRegenActive || egt >= 550) {
      egtStatusKey = 'dpf.egtRegenActive';
    } else if (egt >= 300) {
      egtStatusKey = 'dpf.egtWarm';
    }

    return {
      sootPercentage,
      ashPercentage,
      healthState,
      stateTitleKey,
      statusColor,
      egtStatusKey,
      regenRecommendationKey,
    };
  }
}

export default DpfService;
