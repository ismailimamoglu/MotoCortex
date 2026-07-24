/**
 * Real-Time Horsepower (HP) & Torque (Nm) Estimation Engine for MotoCortex
 * 
 * Supports multiple calculation methods:
 * 1. MAF-Based (Air Mass Flow):
 *    HP ≈ (MAF in g/s / 0.8) * Volumetric Efficiency Factor
 * 2. Engine Torque PID-Based:
 *    HP = (Torque in Nm * RPM) / 7127
 * 3. Calculated Engine Load-Based:
 *    HP = Rated Max HP * (Calculated Load / 100) * (RPM / Peak RPM)
 */

export interface PowerCalculationInput {
  rpm: number;
  mafGps?: number;
  engineTorqueNm?: number;
  calculatedLoadPct?: number;
  vehicleWeightKg?: number;
  engineDisplacementLiters?: number;
  calculationMethod: 'maf' | 'torque' | 'load';
  ratedMaxHp?: number;
  ratedPeakRpm?: number;
}

export interface PowerCalculationResult {
  hp: number;
  kw: number;
  torqueNm: number;
  torqueLbFt: number;
  efficiencyPct: number;
  methodUsed: 'maf' | 'torque' | 'load';
}

export class HorsepowerService {
  /**
   * Calculates real-time Horsepower and Torque based on vehicle telematics.
   */
  public static calculatePower(input: PowerCalculationInput): PowerCalculationResult {
    const rpm = Math.max(0, input.rpm || 0);

    if (rpm === 0) {
      return {
        hp: 0,
        kw: 0,
        torqueNm: 0,
        torqueLbFt: 0,
        efficiencyPct: 0,
        methodUsed: input.calculationMethod,
      };
    }

    let calculatedHp = 0;
    let calculatedTorqueNm = 0;

    switch (input.calculationMethod) {
      case 'torque':
        if (input.engineTorqueNm && input.engineTorqueNm > 0) {
          calculatedTorqueNm = input.engineTorqueNm;
          // HP = (Torque_Nm * RPM) / 7127
          calculatedHp = (calculatedTorqueNm * rpm) / 7127;
        } else {
          // Fallback to MAF
          return this.calculatePower({ ...input, calculationMethod: 'maf' });
        }
        break;

      case 'load':
        if (input.calculatedLoadPct !== undefined && input.ratedMaxHp && input.ratedPeakRpm) {
          const loadFraction = Math.min(1.0, Math.max(0, input.calculatedLoadPct / 100));
          const rpmRatio = Math.min(1.2, rpm / input.ratedPeakRpm);
          calculatedHp = input.ratedMaxHp * loadFraction * (rpmRatio > 1 ? 1 : Math.sin((rpmRatio * Math.PI) / 2));
          // Torque_Nm = (HP * 7127) / RPM
          calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
        } else {
          // Fallback to MAF
          return this.calculatePower({ ...input, calculationMethod: 'maf' });
        }
        break;

      case 'maf':
      default:
        if (input.mafGps && input.mafGps > 0) {
          // 1 g/s MAF ≈ 1.25 HP for petrol (MAF / 0.8)
          const baseHp = input.mafGps / 0.8;
          const boostCorrection = input.engineDisplacementLiters && input.engineDisplacementLiters > 0
            ? Math.min(1.25, Math.max(0.85, baseHp / (input.engineDisplacementLiters * 100)))
            : 1.0;
          calculatedHp = Math.min(1200, Math.max(0, baseHp * boostCorrection));
          calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
        } else if (input.calculatedLoadPct !== undefined) {
          // Fallback to load estimate assuming typical 150 HP engine
          const defaultMaxHp = input.ratedMaxHp || 150;
          const defaultPeakRpm = input.ratedPeakRpm || 5500;
          const loadFraction = Math.min(1.0, Math.max(0, input.calculatedLoadPct / 100));
          const rpmRatio = Math.min(1.2, rpm / defaultPeakRpm);
          calculatedHp = defaultMaxHp * loadFraction * Math.min(1.0, rpmRatio);
          calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
        }
        break;
    }

    // Ensure valid bounds
    calculatedHp = Math.round(Math.max(0, calculatedHp));
    calculatedTorqueNm = Math.round(Math.max(0, calculatedTorqueNm));
    const calculatedKw = Math.round(calculatedHp * 0.7457);
    const calculatedLbFt = Math.round(calculatedTorqueNm * 0.73756);

    // Estimate volumetric/thermal efficiency percentage
    const maxReferenceHp = input.ratedMaxHp || 200;
    const efficiencyPct = Math.min(100, Math.round((calculatedHp / maxReferenceHp) * 100));

    return {
      hp: calculatedHp,
      kw: calculatedKw,
      torqueNm: calculatedTorqueNm,
      torqueLbFt: calculatedLbFt,
      efficiencyPct,
      methodUsed: input.calculationMethod,
    };
  }
}

export default HorsepowerService;
