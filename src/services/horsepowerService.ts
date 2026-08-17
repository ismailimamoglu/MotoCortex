/**
 * Real-Time Horsepower (HP) & Torque (Nm) Estimation Engine for MotoCortex
 * 
 * Supports calculation methods:
 * 1. MAF-Based (Air Mass Flow for gasoline)
 * 2. Engine Torque PID-Based
 * 3. Calculated Engine Load-Based
 * 4. Diesel Power & Torque Physical Engine (Method A Torque % + Method B Fuel Energy)
 */

import { calculateDieselPower } from '../core/telemetry/DieselPowerCalculator';

export interface PowerCalculationInput {
  rpm: number;
  mafGps?: number;
  engineTorqueNm?: number;
  calculatedLoadPct?: number;
  vehicleWeightKg?: number;
  engineDisplacementLiters?: number;
  calculationMethod: 'maf' | 'torque' | 'load' | 'diesel';
  ratedMaxHp?: number;
  ratedPeakRpm?: number;
  fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  fuelRateLph?: number;
  percentTorqueActual?: number;
  referenceTorqueNm?: number;
}

export interface PowerCalculationResult {
  hp: number;
  kw: number;
  torqueNm: number;
  torqueLbFt: number;
  efficiencyPct: number;
  methodUsed: 'maf' | 'torque' | 'load' | 'diesel';
}

export class HorsepowerService {
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

    // If diesel method is requested or vehicle is diesel
    if (input.calculationMethod === 'diesel' || input.fuelType === 'diesel') {
      const dieselRes = calculateDieselPower({
        rpm,
        percentTorqueActual: input.percentTorqueActual ?? (input.calculatedLoadPct ? input.calculatedLoadPct * 0.85 : 50),
        referenceTorqueNm: input.referenceTorqueNm ?? (input.engineTorqueNm || 350),
        fuelRate_L_per_h: input.fuelRateLph ?? (input.mafGps ? (input.mafGps * 3.6) / 14.5 : 8.0),
      });

      if (dieselRes.powerHP !== null && dieselRes.torqueNm !== null && dieselRes.powerHP > 0) {
        calculatedHp = dieselRes.powerHP;
        calculatedTorqueNm = dieselRes.torqueNm;
      }
    }

    if (calculatedHp === 0 && calculatedTorqueNm === 0) {
      switch (input.calculationMethod) {
        case 'torque':
          if (input.engineTorqueNm && input.engineTorqueNm > 0) {
            calculatedTorqueNm = input.engineTorqueNm;
            calculatedHp = (calculatedTorqueNm * rpm) / 7127;
          } else {
            return this.calculatePower({ ...input, calculationMethod: 'maf' });
          }
          break;

        case 'load':
          if (input.calculatedLoadPct !== undefined && input.ratedMaxHp && input.ratedPeakRpm) {
            const loadFraction = Math.min(1.0, Math.max(0, input.calculatedLoadPct / 100));
            const rpmRatio = Math.min(1.2, rpm / input.ratedPeakRpm);
            calculatedHp = input.ratedMaxHp * loadFraction * (rpmRatio > 1 ? 1 : Math.sin((rpmRatio * Math.PI) / 2));
            calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
          } else {
            return this.calculatePower({ ...input, calculationMethod: 'maf' });
          }
          break;

        case 'maf':
        default:
          if (input.mafGps && input.mafGps > 0) {
            const baseHp = input.mafGps / 0.8;
            const boostCorrection = input.engineDisplacementLiters && input.engineDisplacementLiters > 0
              ? Math.min(1.25, Math.max(0.85, baseHp / (input.engineDisplacementLiters * 100)))
              : 1.0;
            calculatedHp = Math.min(1200, Math.max(0, baseHp * boostCorrection));
            calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
          } else if (input.calculatedLoadPct !== undefined) {
            const defaultMaxHp = input.ratedMaxHp || 150;
            const defaultPeakRpm = input.ratedPeakRpm || 5500;
            const loadFraction = Math.min(1.0, Math.max(0, input.calculatedLoadPct / 100));
            const rpmRatio = Math.min(1.2, rpm / defaultPeakRpm);
            calculatedHp = defaultMaxHp * loadFraction * Math.min(1.0, rpmRatio);
            calculatedTorqueNm = rpm > 0 ? (calculatedHp * 7127) / rpm : 0;
          }
          break;
      }
    }

    calculatedHp = Math.round(Math.max(0, calculatedHp));
    calculatedTorqueNm = Math.round(Math.max(0, calculatedTorqueNm));
    const calculatedKw = Math.round(calculatedHp * 0.7457);
    const calculatedLbFt = Math.round(calculatedTorqueNm * 0.73756);

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
