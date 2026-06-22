// Initialize global trace variables only if not present
if (!(global as any).mockWriteTrace) {
    (global as any).mockWriteTrace = [];
}
(global as any).mockSessionId = 0;

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

import OBDCommandQueue from '../OBDCommandQueue';

// Mock all possible platform resolutions to ensure the mock is applied
jest.mock('../BluetoothService', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: jest.fn((cb) => {
                (global as any).mockDataListener = cb;
            }),
            write: jest.fn(async (cmd: string) => {
                const sessionAtWrite = (global as any).mockSessionId;
                (global as any).mockWriteTrace.push(`write_start:${cmd}`);
                
                await new Promise((resolve) => setTimeout(resolve, 20));
                (global as any).mockWriteTrace.push(`write_end:${cmd}`);
                
                // Only trigger response if the session has not changed (simulating dropped packets on disconnect)
                if ((global as any).mockSessionId === sessionAtWrite && (global as any).mockDataListener) {
                    if (cmd.trim() !== '') {
                        (global as any).mockDataListener(`41 ${cmd.substring(3)} RESP_${cmd}\r>`);
                    }
                }
            }),
            clearBuffer: jest.fn()
        }
    };
});

jest.mock('../BluetoothService.ios', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: jest.fn((cb) => {
                (global as any).mockDataListener = cb;
            }),
            write: jest.fn(async (cmd: string) => {
                const sessionAtWrite = (global as any).mockSessionId;
                (global as any).mockWriteTrace.push(`write_start:${cmd}`);
                
                await new Promise((resolve) => setTimeout(resolve, 20));
                (global as any).mockWriteTrace.push(`write_end:${cmd}`);
                
                // Only trigger response if the session has not changed (simulating dropped packets on disconnect)
                if ((global as any).mockSessionId === sessionAtWrite && (global as any).mockDataListener) {
                    if (cmd.trim() !== '') {
                        (global as any).mockDataListener(`41 ${cmd.substring(3)} RESP_${cmd}\r>`);
                    }
                }
            }),
            clearBuffer: jest.fn()
        }
    };
});

jest.mock('../BluetoothService.android', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: jest.fn((cb) => {
                (global as any).mockDataListener = cb;
            }),
            write: jest.fn(async (cmd: string) => {
                const sessionAtWrite = (global as any).mockSessionId;
                (global as any).mockWriteTrace.push(`write_start:${cmd}`);
                
                await new Promise((resolve) => setTimeout(resolve, 20));
                (global as any).mockWriteTrace.push(`write_end:${cmd}`);
                
                // Only trigger response if the session has not changed (simulating dropped packets on disconnect)
                if ((global as any).mockSessionId === sessionAtWrite && (global as any).mockDataListener) {
                    if (cmd.trim() !== '') {
                        (global as any).mockDataListener(`41 ${cmd.substring(3)} RESP_${cmd}\r>`);
                    }
                }
            }),
            clearBuffer: jest.fn()
        }
    };
});

jest.mock('../../store/useBluetoothStore', () => {
    const mockStoreState = {
        addDiagnosticLog: jest.fn(),
        updateTelemetryStats: jest.fn(),
        addLog: jest.fn(),
        resetRecoveryAttempts: jest.fn(),
        setSensorData: jest.fn(),
        telemetryStats: {
            requestsSent: 0,
            responsesReceived: 0,
            timeoutCount: 0,
            recoveryCount: 0,
            avgResponseTime: 0,
            lastError: null,
        },
        guardTime: 10,
    };
    return {
        useBluetoothStore: {
            getState: () => mockStoreState,
        }
    };
});

jest.mock('../../services/Logger', () => ({
    log: jest.fn(),
}));

describe('OBDCommandQueue Mutex and Session Management Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).mockWriteTrace = [];
        (global as any).mockSessionId++;
        OBDCommandQueue.clear();
    });

    test('Proves sequential execution of 5 concurrent commands (Race Condition Simulation)', async () => {
        const trace: string[] = [];

        // Add 5 commands concurrently without awaiting them immediately
        const p1 = OBDCommandQueue.add('01 0C').then(res => trace.push(`resolved:01 0C:${res}`));
        const p2 = OBDCommandQueue.add('01 0D').then(res => trace.push(`resolved:01 0D:${res}`));
        const p3 = OBDCommandQueue.add('01 05').then(res => trace.push(`resolved:01 05:${res}`));
        const p4 = OBDCommandQueue.add('01 11').then(res => trace.push(`resolved:01 11:${res}`));
        const p5 = OBDCommandQueue.add('01 2F').then(res => trace.push(`resolved:01 2F:${res}`));

        await Promise.all([p1, p2, p3, p4, p5]);

        const mockWriteTrace = (global as any).mockWriteTrace.filter((x: string) => !x.includes('\r'));

        // Verify that the write calls and resolution events happened in exact sequential order
        expect(mockWriteTrace[0]).toBe('write_start:01 0C');
        expect(mockWriteTrace[1]).toBe('write_end:01 0C');
        expect(trace[0]).toBe('resolved:01 0C:41 0C RESP_01 0C');
        
        expect(mockWriteTrace[2]).toBe('write_start:01 0D');
        expect(mockWriteTrace[3]).toBe('write_end:01 0D');
        expect(trace[1]).toBe('resolved:01 0D:41 0D RESP_01 0D');

        expect(mockWriteTrace[4]).toBe('write_start:01 05');
        expect(mockWriteTrace[5]).toBe('write_end:01 05');
        expect(trace[2]).toBe('resolved:01 05:41 05 RESP_01 05');

        expect(mockWriteTrace[6]).toBe('write_start:01 11');
        expect(mockWriteTrace[7]).toBe('write_end:01 11');
        expect(trace[3]).toBe('resolved:01 11:41 11 RESP_01 11');

        expect(mockWriteTrace[8]).toBe('write_start:01 2F');
        expect(mockWriteTrace[9]).toBe('write_end:01 2F');
        expect(trace[4]).toBe('resolved:01 2F:41 2F RESP_01 2F');
    });

    test('Proves session cancellation and clean recovery after clear()', async () => {
        const errors: string[] = [];
        const trace: string[] = [];

        const p1 = OBDCommandQueue.add('01 0C')
            .then(res => trace.push(`resolved:01 0C:${res}`))
            .catch(err => errors.push(`failed:01 0C:${err.message}`));
            
        const p2 = OBDCommandQueue.add('01 0D')
            .then(res => trace.push(`resolved:01 0D:${res}`))
            .catch(err => errors.push(`failed:01 0D:${err.message}`));

        await new Promise(resolve => setTimeout(resolve, 5));
        
        const clearError = new Error('TEST_CONNECTION_LOST');
        (global as any).mockSessionId++; // Reset mock session in sync with clear()
        OBDCommandQueue.clear(clearError);

        await Promise.all([p1, p2]);

        expect(errors).toContain('failed:01 0C:TEST_CONNECTION_LOST');
        expect(errors).toContain('failed:01 0D:SESSION_CANCELLED');

        const pNew = await OBDCommandQueue.add('01 0F');
        expect(pNew).toBe('41 0F RESP_01 0F');
    });
});
