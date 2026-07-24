/**
 * Fuel Trim & Air-Fuel Mixture Analysis Engine for MotoCortex
 * 
 * Analyzes Short Term Fuel Trim (STFT) and Long Term Fuel Trim (LTFT)
 * to determine Air-Fuel Ratio (AFR) health, Stoichiometric Lambda balance,
 * and provide actionable diagnostic tips.
 */

export interface FuelTrimInput {
  stftBank1Pct: number;
  ltftBank1Pct: number;
  stftBank2Pct?: number;
  ltftBank2Pct?: number;
  o2VoltageV?: number; // 0.1V - 0.9V Narrowband
  widebandLambda?: number; // ~1.00 Lambda
}

export type MixtureState = 'IDEAL' | 'MILD_LEAN' | 'CRITICAL_LEAN' | 'MILD_RICH' | 'CRITICAL_RICH';

export interface FuelTrimAnalysis {
  state: MixtureState;
  totalTrimBank1: number;
  totalTrimBank2?: number;
  estimatedAfr: number; // e.g. 14.7
  lambdaValue: number; // e.g. 1.00
  titleKey: string; // i18n key or title
  statusColor: string;
  causesKeys: string[]; // List of potential causes i18n keys
  recommendedActionKey: string;
}

export class FuelTrimService {
  /**
   * Evaluates STFT + LTFT values and returns structured mixture diagnostic analysis.
   */
  public static analyze(input: FuelTrimInput): FuelTrimAnalysis {
    const totalBank1 = Math.round((input.stftBank1Pct || 0) + (input.ltftBank1Pct || 0));
    const totalBank2 = input.stftBank2Pct !== undefined && input.ltftBank2Pct !== undefined
      ? Math.round(input.stftBank2Pct + input.ltftBank2Pct)
      : undefined;

    const evalTrim = totalBank1;

    // Estimate Air-Fuel Ratio (AFR) & Lambda
    // Stoichiometric Petrol AFR = 14.7:1
    let lambda = 1.00;
    if (input.widebandLambda && input.widebandLambda > 0.5) {
      lambda = input.widebandLambda;
    } else if (input.o2VoltageV !== undefined) {
      // Narrowband O2 approximation: 0.45V = 1.0 Lambda
      const voltDiff = input.o2VoltageV - 0.45;
      lambda = 1.00 - voltDiff * 0.2;
    } else {
      // Estimate from total fuel trim
      lambda = 1.00 + evalTrim / 100;
    }

    lambda = Math.max(0.7, Math.min(1.4, lambda));
    const estimatedAfr = Number((14.7 * lambda).toFixed(1));

    let state: MixtureState = 'IDEAL';
    let titleKey = 'fuelTrim.stateIdeal';
    let statusColor = '#00ff88'; // Green
    let causesKeys: string[] = ['fuelTrim.causeNormal'];
    let recommendedActionKey = 'fuelTrim.actionNormal';

    if (evalTrim >= 18) {
      state = 'CRITICAL_LEAN';
      titleKey = 'fuelTrim.stateCriticalLean';
      statusColor = '#ff3b3b'; // Red
      causesKeys = [
        'fuelTrim.causeVacuumLeak',
        'fuelTrim.causeDirtyMaf',
        'fuelTrim.causeLowFuelPressure',
        'fuelTrim.causeCloggedInjectors',
      ];
      recommendedActionKey = 'fuelTrim.actionCriticalLean';
    } else if (evalTrim >= 10) {
      state = 'MILD_LEAN';
      titleKey = 'fuelTrim.stateMildLean';
      statusColor = '#ffb800'; // Amber
      causesKeys = [
        'fuelTrim.causeMinorVacuumLeak',
        'fuelTrim.causeAgedO2Sensor',
        'fuelTrim.causeFuelFilter',
      ];
      recommendedActionKey = 'fuelTrim.actionMildLean';
    } else if (evalTrim <= -18) {
      state = 'CRITICAL_RICH';
      titleKey = 'fuelTrim.stateCriticalRich';
      statusColor = '#ff3b3b'; // Red
      causesKeys = [
        'fuelTrim.causeLeakingInjector',
        'fuelTrim.causeStuckEvapPurgeVal',
        'fuelTrim.causeDirtyAirFilter',
        'fuelTrim.causeHighFuelPressure',
      ];
      recommendedActionKey = 'fuelTrim.actionCriticalRich';
    } else if (evalTrim <= -10) {
      state = 'MILD_RICH';
      titleKey = 'fuelTrim.stateMildRich';
      statusColor = '#ffb800'; // Amber
      causesKeys = [
        'fuelTrim.causeRestrictedAirIntake',
        'fuelTrim.causeEvapVapor',
      ];
      recommendedActionKey = 'fuelTrim.actionMildRich';
    }

    return {
      state,
      totalTrimBank1: totalBank1,
      totalTrimBank2: totalBank2,
      estimatedAfr,
      lambdaValue: Number(lambda.toFixed(2)),
      titleKey,
      statusColor,
      causesKeys,
      recommendedActionKey,
    };
  }
}

export default FuelTrimService;
