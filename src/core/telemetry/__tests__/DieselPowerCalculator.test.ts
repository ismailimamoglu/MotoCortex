import { calculateDieselPower, computeFromPercentTorque, computeFromFuelEnergy } from '../DieselPowerCalculator';

describe('DieselPowerCalculator Engine', () => {
    it('should correctly calculate torque and power from percent torque (Method A)', () => {
        // Actual 60% of 400 Nm reference at 2500 RPM
        const res = computeFromPercentTorque(60, 400, 2500);
        expect(res.torqueNm).toBe(240);
        expect(res.powerKW).toBeCloseTo(62.8, 0);
        expect(res.powerHP).toBeCloseTo(85.4, 0);
    });

    it('should correctly calculate torque and power from fuel rate (Method B)', () => {
        // 12 L/h at 2000 RPM
        const res = computeFromFuelEnergy(12, 2000);
        expect(res.torqueNm).toBeGreaterThan(200);
        expect(res.powerKW).toBeGreaterThan(45);
        expect(res.powerHP).toBeGreaterThan(60);
    });

    it('should blend outputs with high confidence when both methods are available', () => {
        const res = calculateDieselPower({
            rpm: 2000,
            percentTorqueActual: 50,
            referenceTorqueNm: 350,
            fuelRate_L_per_h: 8.5
        });
        expect(res.method).toBe('BLENDED');
        expect(res.confidence).toBe(0.95);
        expect(res.torqueNm).toBeGreaterThan(150);
        expect(res.powerHP).toBeGreaterThan(40);
    });

    it('should fallback to FUEL_ENERGY when reference torque is missing', () => {
        const res = calculateDieselPower({
            rpm: 2200,
            fuelRate_L_per_h: 10.0
        });
        expect(res.method).toBe('FUEL_ENERGY');
        expect(res.confidence).toBe(0.75);
        expect(res.powerHP).toBeGreaterThan(50);
    });
});
