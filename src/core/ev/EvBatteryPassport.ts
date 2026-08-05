// src/core/ev/EvBatteryPassport.ts
// MotoCortex v10.0 - EU Battery Regulation (EU 2023/1542) Digital Battery Passport Generator

export interface EvBatteryPassportData {
  passportId: string;
  vin: string;
  nominalCapacityKwh: number;
  remainingCapacityKwh: number;
  stateOfHealthSoh: number; // %
  totalChargeCycles: number;
  cellImpedanceAvgMilliOhm: number;
  isolationResistanceKiloOhm: number;
  thermalRunawayRisk: 'LOW' | 'ELEVATED' | 'CRITICAL';
  carbonFootprintKgCo2: number;
  issueDate: string;
}

export class EvBatteryPassport {
  /**
   * Generates a compliant EU Battery Passport record for second-life assessment & resale.
   */
  public static generatePassport(
    vin: string,
    stateOfHealthSoh: number,
    nominalCapacityKwh: number = 77.4,
    chargeCycles: number = 240,
    isolationKiloOhm: number = 550
  ): EvBatteryPassportData {
    const remainingKwh = (nominalCapacityKwh * (stateOfHealthSoh / 100));
    const cellImpedance = +(0.8 + (100 - stateOfHealthSoh) * 0.05).toFixed(2);

    let thermalRisk: 'LOW' | 'ELEVATED' | 'CRITICAL' = 'LOW';
    if (stateOfHealthSoh < 70 || isolationKiloOhm < 200) {
      thermalRisk = 'CRITICAL';
    } else if (stateOfHealthSoh < 80 || isolationKiloOhm < 400) {
      thermalRisk = 'ELEVATED';
    }

    return {
      passportId: `EU-BATT-${vin.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
      vin,
      nominalCapacityKwh,
      remainingCapacityKwh: +remainingKwh.toFixed(1),
      stateOfHealthSoh,
      totalChargeCycles: chargeCycles,
      cellImpedanceAvgMilliOhm: cellImpedance,
      isolationResistanceKiloOhm: isolationKiloOhm,
      thermalRunawayRisk: thermalRisk,
      carbonFootprintKgCo2: +(nominalCapacityKwh * 65).toFixed(0), // ~65 kg CO2/kWh battery production factor
      issueDate: new Date().toISOString(),
    };
  }
}
