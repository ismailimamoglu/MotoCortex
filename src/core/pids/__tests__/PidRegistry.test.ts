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
        maxJumpPer100ms: 100 // 100 units per 100ms, i.e., 1 unit per 1ms baseline allowed jump
    };

    test('1. Allows normal changes within allowedJump limits', () => {
        // elapsedMs = 50ms. allowedJump = (100 / 100) * 50 = 50 units.
        // change is 30 units (1000 to 1030). Should be allowed.
        const isSanityOk = PidRegistry.validateTemporalSanity(mockPid, 1030, 1000, 50);
        expect(isSanityOk).toBe(true);
    });

    test('2. Rejects jumps that exceed physical rates under normal elapsedMs (<= 60ms)', () => {
        // elapsedMs = 50ms. allowedJump = (100 / 100) * 50 = 50 units.
        // change is 60 units (1000 to 1060). Should be rejected.
        const isSanityOk = PidRegistry.validateTemporalSanity(mockPid, 1060, 1000, 50);
        expect(isSanityOk).toBe(false);
    });

    test('3. Bounding Cap (60ms) and Lag Compensation Multiplier (1.50) when elapsedMs > 60ms', () => {
        // When elapsedMs = 120ms (long lag):
        // Under v5.3:
        // - elapsedMs is capped to 60ms: calcElapsed = Math.min(60, 120) = 60ms.
        // - allowedJump baseline = (100 / 100) * 60 = 60 units.
        // - Since elapsedMs (120) > 60, multiplier 1.50 is applied:
        //   allowedJump = 60 * 1.50 = 90 units.
        
        // Change is 80 units (1000 to 1080).
        // Since 80 <= 90, this is allowed under Jitter Lag Compensation.
        const isAllowed80 = PidRegistry.validateTemporalSanity(mockPid, 1080, 1000, 120);
        expect(isAllowed80).toBe(true);

        // Change is 100 units (1000 to 1100).
        // Since 100 > 90, this should still be rejected (preventing unbounded drift).
        const isAllowed100 = PidRegistry.validateTemporalSanity(mockPid, 1100, 1000, 120);
        expect(isAllowed100).toBe(false);
    });

    test('4. Allows any update if previous value is null', () => {
        expect(PidRegistry.validateTemporalSanity(mockPid, 1000, null, 50)).toBe(true);
    });

    test('5. Enforces 10ms floor for allowedJump when elapsedMs is 0 (prevents zero lock)', () => {
        // elapsedMs = 0 -> calcElapsed = 10ms.
        // allowedJump = (100 / 100) * 10 = 10 units.
        
        // Change is 5 units (1000 to 1005). Should be allowed.
        expect(PidRegistry.validateTemporalSanity(mockPid, 1005, 1000, 0)).toBe(true);
        
        // Change is 15 units (1000 to 1015). Exceeds 10 units limit, should be rejected.
        expect(PidRegistry.validateTemporalSanity(mockPid, 1015, 1000, 0)).toBe(false);
    });

    test('6. Enforces 10ms floor for allowedJump during negative clock drift (NTP rollback)', () => {
        // elapsedMs = -100ms -> calcElapsed = 10ms.
        // allowedJump = (100 / 100) * 10 = 10 units.
        
        // Change is 5 units (1000 to 1005). Should be allowed.
        expect(PidRegistry.validateTemporalSanity(mockPid, 1005, 1000, -100)).toBe(true);
        
        // Change is 15 units (1000 to 1015). Exceeds 10 units limit, should be rejected.
        expect(PidRegistry.validateTemporalSanity(mockPid, 1015, 1000, -100)).toBe(false);
    });
});
