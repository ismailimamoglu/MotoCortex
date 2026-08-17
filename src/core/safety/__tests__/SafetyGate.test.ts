import { SafetyGate } from '../SafetyGate';

describe('SafetyGate Automotive Interlock Tests', () => {
    let gate: SafetyGate;

    beforeEach(() => {
        gate = SafetyGate.instance();
        gate.reset({
            engineRunning: false,
            batteryVoltage: 12.6,
            speedKph: 0
        });
    });

    test('1. Default safe state permits write operations', () => {
        expect(gate.isWriteAllowed()).toBe(true);
        expect(gate.getLockoutReason()).toBeNull();
    });

    test('2. Engine running (RPM > 0) locks write operations', () => {
        gate.update({ engineRunning: true });
        expect(gate.isWriteAllowed()).toBe(false);
        expect(gate.getLockoutReason()).toBe('ENGINE_RUNNING');
    });

    test('3. Vehicle moving (Speed > 0) locks write operations', () => {
        gate.update({ speedKph: 15 });
        expect(gate.isWriteAllowed()).toBe(false);
        expect(gate.getLockoutReason()).toBe('VEHICLE_MOVING');
    });

    test('4. Low battery voltage (< 12.0V) locks write operations', () => {
        gate.update({ batteryVoltage: 11.7 });
        expect(gate.isWriteAllowed()).toBe(false);
        expect(gate.getLockoutReason()).toBe('LOW_VOLTAGE');
    });

    test('5. Voltage recovery to >= 12.0V unlocks write operations', () => {
        gate.update({ batteryVoltage: 11.5 });
        expect(gate.isWriteAllowed()).toBe(false);

        gate.update({ batteryVoltage: 12.4 });
        expect(gate.isWriteAllowed()).toBe(true);
        expect(gate.getLockoutReason()).toBeNull();
    });

    test('6. waitForAllow resolves immediately when conditions are safe', async () => {
        const allowed = await gate.waitForAllow(1000);
        expect(allowed).toBe(true);
    });

    test('7. waitForAllow resolves true when condition becomes safe before timeout', async () => {
        gate.update({ batteryVoltage: 11.2 });
        expect(gate.isWriteAllowed()).toBe(false);

        const waitPromise = gate.waitForAllow(2000);

        // Simulate charger connected after 100ms
        setTimeout(() => {
            gate.update({ batteryVoltage: 12.8 });
        }, 100);

        const allowed = await waitPromise;
        expect(allowed).toBe(true);
    });

    test('8. waitForAllow resolves false on timeout if condition remains unsafe', async () => {
        gate.update({ engineRunning: true });
        const allowed = await gate.waitForAllow(200);
        expect(allowed).toBe(false);
    });
});
