import { VehicleIdentityEngine } from '../VehicleIdentityEngine';

describe('VehicleIdentityEngine Unit Tests', () => {
    let engine: VehicleIdentityEngine;

    beforeEach(() => {
        engine = new VehicleIdentityEngine();
    });

    test('1. Parses Peugeot Rifter ELM327 CAN Multi-Frame (VR3EFYHZ3PJ650172)', () => {
        const rawResponse = `
09 02
014
0: 49 02 01 56 52 33
1: 45 46 59 48 5A 33 50
2: 4A 36 35 30 31 37 32
`;
        const vin = engine.parseVinResponse(rawResponse);
        expect(vin).toBe('VR3EFYHZ3PJ650172');
    });

    test('2. Parses Dacia Logan KWP2000 Response (UU1KSD8KJ45143202)', () => {
        // UU1KSD8KJ45143202 in ASCII hex: 55 55 31 4B 53 44 38 4B 4A 34 35 31 34 33 32 30 32
        const rawResponse = '49 02 01 55 55 31 4B 53 44 38 4B 4A 34 35 31 34 33 32 30 32';
        const vin = engine.parseVinResponse(rawResponse);
        expect(vin).toBe('UU1KSD8KJ45143202');
    });

    test('3. Parses UDS 22 F1 90 VIN format', () => {
        // 62 F1 90 followed by VR3EFYHZ3PJ650172 in hex
        const rawResponse = '62 F1 90 56 52 33 45 46 59 48 5A 33 50 4A 36 35 30 31 37 32';
        const vin = engine.parseVinResponse(rawResponse);
        expect(vin).toBe('VR3EFYHZ3PJ650172');
    });

    test('4. Parses standard 5-frame J1979 stream', () => {
        const rawResponse = `
49 02 01 01 56 52 33
49 02 02 45 46 59 48
49 02 03 5A 33 50 4A
49 02 04 36 35 30 31
49 02 05 37 32 00 00
`;
        const vin = engine.parseVinResponse(rawResponse);
        expect(vin).toBe('VR3EFYHZ3PJ650172');
    });
});
