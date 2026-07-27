// src/core/connection/__tests__/EcuIdentificationManager.test.ts
import { EcuIdentificationManager } from '../EcuIdentificationManager';

jest.mock('../../../api/OBDCommandQueue', () => ({
    __esModule: true,
    default: {
        add: jest.fn(),
    },
}));

jest.mock('../../../store/useBluetoothStore', () => ({
    useBluetoothStore: {
        getState: () => ({
            addLog: () => {},
        }),
    },
}));

describe('EcuIdentificationManager', () => {
    test('should parse 17-character VIN from raw hex string correctly', () => {
        // Hex representation for WVWZZZ1KZ8W000001
        const rawHex = '49 02 01 57 56 57 5A 5A 5A 31 4B 5A 38 57 30 30 30 30 30 31';
        const vin = EcuIdentificationManager.parseVinHex(rawHex);
        expect(vin).toBe('WVWZZZ1KZ8W000001');
    });

    test('should return null for malformed or incomplete VIN response', () => {
        const rawHex = '49 02 01 00 00 00';
        const vin = EcuIdentificationManager.parseVinHex(rawHex);
        expect(vin).toBeNull();
    });
});
