/**
 * Diesel Particulate Filter (DPF) Monitoring Service for MotoCortex
 * 
 * Supports DPF Soot Loading percentage, Ash Mass (g), Exhaust Gas Temp (EGT °C),
 * Differential Pressure (hPa), and Regeneration State monitoring across VAG, BMW,
 * Fiat/JTD, Renault, and standard OBD2 PID 0x8A / 0x8B.
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
  egtStatusKey: string; // Cold, Warm, Regeneration Active
  regenRecommendationKey: string;
}

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
