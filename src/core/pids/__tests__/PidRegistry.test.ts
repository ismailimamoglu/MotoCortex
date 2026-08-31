jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn().mockResolvedValue(true),
    getItem: jest.fn(),
    removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
    Platform: {
        OS: 'android',
    },
    AppState: {
        addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    },
}));

jest.mock('react-native-purchases', () => ({
    __esModule: true,
    default: {
        configure: jest.fn(),
        getOfferings: jest.fn(),
        purchasePackage: jest.fn(),
        getCustomerInfo: jest.fn(),
    },
}));

jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
    CryptoDigestAlgorithm: {
        SHA256: 'SHA-256',
    },
    digestStringAsync: jest.fn().mockResolvedValue('mock-hash'),
}));

jest.mock('expo-constants', () => ({
    __esModule: true,
    default: {
        expoConfig: {
            extra: {
                EXPO_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
                EXPO_PUBLIC_SUPABASE_ANON_KEY: 'mock-key',
            },
        },
    },
}));

import { PidRegistry, PidDefinition } from '../PidRegistry';

describe('PidRegistry validateTemporalSanity Tests', () => {
    const mockPid: PidDefinition = {
        mode: '01',
        pid: '0C',
        name: 'ENGINE_RPM',
        description: 'Engine RPM',
        min: 0,
        max: 16383.75,
        unit: 'rpm',
        decode: (bytes) => 0,
    };

    test('1. Allows live engine RPM values within valid range', () => {
        expect(PidRegistry.validateTemporalSanity(mockPid, 850, 800, 50)).toBe(true);
        expect(PidRegistry.validateTemporalSanity(mockPid, 3500, 800, 50)).toBe(true);
    });

    test('2. Rejects NaN or negative invalid values', () => {
        expect(PidRegistry.validateTemporalSanity(mockPid, NaN, 1000, 50)).toBe(false);
        expect(PidRegistry.validateTemporalSanity(mockPid, -50, 1000, 50)).toBe(false);
    });

    test('3. Rejects RPM values exceeding dynamic engine limit', () => {
        expect(PidRegistry.validateTemporalSanity(mockPid, 25000, 1000, 50)).toBe(false);
    });
});
