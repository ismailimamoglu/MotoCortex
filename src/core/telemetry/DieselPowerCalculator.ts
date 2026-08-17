/**
 * DieselPowerCalculator.ts — Real-time Diesel Horsepower & Torque Physics Engine
 * 
 * Implements dual-method calculation for diesel internal combustion engines:
 * Method A: Actual Engine Percent Torque (PID 0x62) * Reference Torque (PID 0x63 / 0x5C)
 * Method B: Fuel Injection Energy Rate (PID 0x5E L/h) * Lower Heating Value * Thermal Efficiency
 */

export type DieselPowerInput = {
    rpm?: number;
    percentTorqueActual?: number | null;
    percentTorqueDriverDemand?: number | null;
    referenceTorqueNm?: number | null;
    fuelRate_L_per_h?: number | null;
    fuelRate_mg_per_stroke?: number | null;
    cylinders?: number | null;
    engineDisplacement_L?: number | null;
    vehicleDensity_kg_per_L?: number | null;
    estimatedThermalEfficiency?: number | null;
    timestamp?: number | string;
};

export type DieselPowerResult = {
    torqueNm: number | null;
    powerKW: number | null;
    powerHP: number | null;
    method: 'PERCENT_TORQUE' | 'FUEL_ENERGY' | 'BLENDED' | 'UNKNOWN';
    confidence: number;
    diagnostics?: {
        notes?: string[];
        methodA?: {
            torqueNm?: number | null;
            used?: boolean;
            valid?: boolean;
        };
        methodB?: {
            torqueNm?: number | null;
            used?: boolean;
            valid?: boolean;
        };
    };
};

const KW_FROM_T_RPM_FACTOR = (2 * Math.PI) / 60 / 1000;
const HP_FROM_KW = 1.359621617; // Metric Horsepower (PS)
const DEFAULT_DIESEL_DENSITY = 0.84; // kg/L
const DEFAULT_THERMAL_EFFICIENCY = 0.40; // 40% typical modern common-rail diesel
const DIESEL_LHV_J_PER_KG = 43.2e6; // 43.2 MJ/kg

function isValidRpm(rpm?: number | null): boolean {
    return typeof rpm === 'number' && Number.isFinite(rpm) && rpm > 0;
}

export function computeFromPercentTorque(
    percentTorque: number,
    referenceTorqueNm: number,
    rpm: number
): { torqueNm: number; powerKW: number; powerHP: number } {
    const torqueNm = (percentTorque / 100) * referenceTorqueNm;
    const powerKW = torqueNm * rpm * KW_FROM_T_RPM_FACTOR;
    const powerHP = powerKW * HP_FROM_KW;
    return {
        torqueNm: Math.max(0, Math.round(torqueNm * 10) / 10),
        powerKW: Math.max(0, Math.round(powerKW * 10) / 10),
        powerHP: Math.max(0, Math.round(powerHP * 10) / 10)
    };
}

export function computeFromFuelEnergy(
    fuelRateLph: number,
    rpm: number,
    densityKgPerL = DEFAULT_DIESEL_DENSITY,
    thermalEfficiency = DEFAULT_THERMAL_EFFICIENCY
): { torqueNm: number; powerKW: number; powerHP: number } {
    const massFlowKgPerS = (fuelRateLph * densityKgPerL) / 3600.0;
    const energyFlowW = massFlowKgPerS * DIESEL_LHV_J_PER_KG;
    const mechPowerW = energyFlowW * thermalEfficiency;
    const powerKW = mechPowerW / 1000.0;
    const torqueNm = mechPowerW / (2 * Math.PI * (rpm / 60.0));
    const powerHP = powerKW * HP_FROM_KW;
    return {
        torqueNm: Math.max(0, Math.round(torqueNm * 10) / 10),
        powerKW: Math.max(0, Math.round(powerKW * 10) / 10),
        powerHP: Math.max(0, Math.round(powerHP * 10) / 10)
    };
}

export function calculateDieselPower(input: DieselPowerInput): DieselPowerResult {
    const notes: string[] = [];
    let aResult: { torqueNm: number; powerKW: number; powerHP: number } | null = null;
    let bResult: { torqueNm: number; powerKW: number; powerHP: number } | null = null;
    const rpm = input.rpm ?? 0;

    // Method A: percent torque * reference torque
    if (
        typeof input.percentTorqueActual === 'number' &&
        typeof input.referenceTorqueNm === 'number' &&
        input.referenceTorqueNm > 0 &&
        isValidRpm(rpm)
    ) {
        try {
            aResult = computeFromPercentTorque(input.percentTorqueActual, input.referenceTorqueNm, rpm);
            notes.push('Method A (percent torque) computed.');
        } catch (err) {
            notes.push('Method A exception: ' + String(err));
            aResult = null;
        }
    }

    // Method B: fuel energy flow * thermal efficiency
    if (typeof input.fuelRate_L_per_h === 'number' && input.fuelRate_L_per_h > 0 && isValidRpm(rpm)) {
        const density = input.vehicleDensity_kg_per_L ?? DEFAULT_DIESEL_DENSITY;
        const eff = input.estimatedThermalEfficiency ?? DEFAULT_THERMAL_EFFICIENCY;
        try {
            bResult = computeFromFuelEnergy(input.fuelRate_L_per_h, rpm, density, eff);
            notes.push('Method B (fuel energy) computed.');
        } catch (err) {
            notes.push('Method B exception: ' + String(err));
            bResult = null;
        }
    }

    const aValid = aResult !== null && aResult.torqueNm >= 0 && aResult.torqueNm <= 5000;
    const bValid = bResult !== null && bResult.torqueNm >= 0 && bResult.torqueNm <= 5000;

    let finalMethod: DieselPowerResult['method'] = 'UNKNOWN';
    let finalTorque: number | null = null;
    let finalKW: number | null = null;
    let finalHP: number | null = null;
    let confidence = 0;

    if (aValid && !bValid) {
        finalMethod = 'PERCENT_TORQUE';
        finalTorque = aResult!.torqueNm;
        finalKW = aResult!.powerKW;
        finalHP = aResult!.powerHP;
        confidence = 0.90;
    } else if (!aValid && bValid) {
        finalMethod = 'FUEL_ENERGY';
        finalTorque = bResult!.torqueNm;
        finalKW = bResult!.powerKW;
        finalHP = bResult!.powerHP;
        confidence = 0.75;
    } else if (aValid && bValid) {
        finalTorque = Math.round((aResult!.torqueNm * 0.7 + bResult!.torqueNm * 0.3) * 10) / 10;
        finalKW = Math.round((aResult!.powerKW * 0.7 + bResult!.powerKW * 0.3) * 10) / 10;
        finalHP = Math.round((finalKW * HP_FROM_KW) * 10) / 10;
        finalMethod = 'BLENDED';
        confidence = 0.95;
    }

    return {
        torqueNm: finalTorque,
        powerKW: finalKW,
        powerHP: finalHP,
        method: finalMethod,
        confidence,
        diagnostics: {
            notes,
            methodA: { torqueNm: aResult?.torqueNm ?? null, used: aValid, valid: aValid },
            methodB: { torqueNm: bResult?.torqueNm ?? null, used: bValid, valid: bValid }
        }
    };
}
