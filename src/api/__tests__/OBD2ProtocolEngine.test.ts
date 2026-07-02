// src/api/__tests__/OBD2ProtocolEngine.test.ts
import { OBD2ProtocolEngine } from '../OBD2ProtocolEngine';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { useAppStore } from '../../store/useAppStore';

let mockRegisteredCallback: ((data: string) => void) | null = null;

jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(() => ({
            remove: jest.fn(),
        })),
    },
    Platform: {
        OS: 'android',
    },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn().mockResolvedValue(true),
    getItem: jest.fn(),
    removeItem: jest.fn(),
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

jest.mock('../BluetoothService', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: jest.fn((cb) => {
                mockRegisteredCallback = cb;
            }),
            write: jest.fn().mockImplementation((cmd) => {
                setTimeout(() => {
                    if (mockRegisteredCallback) {
                        mockRegisteredCallback('ELM327 v1.5\r\n>');
                    }
                }, 0);
                return Promise.resolve(true);
            }),
            clearBuffer: jest.fn()
        }
    };
});

describe('OBD2ProtocolEngine Sandbox Security Gate Tests', () => {
    let engine: OBD2ProtocolEngine;

    beforeEach(() => {
        jest.clearAllMocks();
        engine = new OBD2ProtocolEngine();
        useAppStore.getState().isPro = true; // Set user as PRO to isolate movement safety checks
        useBluetoothStore.getState().connectionState = 'TELEMETRY_ACTIVE';
    });

    test('1. Sürüş Durumunda Bloklama Kontrolü (isPollingActive = true ve Hız > 0 iken DANGEROUS engellenmeli)', async () => {
        engine.setPollingActive(true);

        // Feed Speed: 60 km/h (hex for mode 01 PID 0D: 41 0D 3C)
        (engine as any).parseResponse('01 0D', '41 0D 3C');
        expect((engine as any).currentSpeed).toBe(60);

        // ATZ (DANGEROUS) and 11 01 (DANGEROUS) should be rejected
        await expect((engine as any).executeCommand('ATZ')).rejects.toThrow('BLOCK_COMMAND_VEHICLE_IN_MOTION');
        await expect((engine as any).executeCommand('11 01')).rejects.toThrow('BLOCK_COMMAND_VEHICLE_IN_MOTION');
        await expect((engine as any).executeCommand('33')).rejects.toThrow('BLOCK_COMMAND_VEHICLE_IN_MOTION');
    });

    test('2. Statik Durumda İzin Verme Kontrolü (Hız = 0, RPM = 0 iken ATZ serbest olmalı)', async () => {
        engine.setPollingActive(true);

        // Feed Speed: 0, RPM: 0
        (engine as any).parseResponse('01 0D', '41 0D 00');
        (engine as any).parseResponse('01 0C', '41 0C 00 00');
        expect((engine as any).currentSpeed).toBe(0);
        expect((engine as any).currentRpm).toBe(0);

        // Should resolve because speed and RPM are 0
        const promise = (engine as any).executeCommand('ATZ');
        await expect(promise).resolves.toBeDefined();
    });

    test('3. Non-Polling Durumda İzin Verme (isPollingActive = false iken el sıkışma serbest olmalı)', async () => {
        engine.setPollingActive(false);

        // Even if speed or RPM were somehow non-zero (or reset)
        (engine as any).currentSpeed = 30;
        
        // When not polling, safety gate shouldn't block ATZ since we might be in handshake/recovery state
        const promise = (engine as any).executeCommand('ATZ');
        await expect(promise).resolves.toBeDefined();
    });

    test('4. Zustand Store Bağımsızlığı (Zustand state manipülasyonuna rağmen motor yerel durumuna güvenmeli)', async () => {
        engine.setPollingActive(true);

        // Motor yerel hızı: 50 km/h (41 0D 32 -> 32 hex = 50 dec)
        (engine as any).parseResponse('01 0D', '41 0D 32');
        expect((engine as any).currentSpeed).toBe(50);

        // Zustand store hızı manipüle edilip 0 yapılsın
        useBluetoothStore.getState().setSensorData({ speed: 0 });
        expect(useBluetoothStore.getState().speed).toBe(0);

        // Motor yerel durumundaki currentSpeed=50'ye güvenerek komutu yine de bloklamalıdır!
        await expect((engine as any).executeCommand('ATZ')).rejects.toThrow('BLOCK_COMMAND_VEHICLE_IN_MOTION');
    });
});
