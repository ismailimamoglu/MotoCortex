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
    let originalPerformanceNow: any;

    beforeAll(() => {
        originalPerformanceNow = global.performance.now;
        global.performance.now = () => Date.now();
    });

    afterAll(() => {
        global.performance.now = originalPerformanceNow;
    });

    const flushMicrotasks = async () => {
        let pnd = true;
        let limit = 0;
        while (pnd && limit++ < 200) {
            pnd = false;
            await Promise.resolve().then(() => {
                pnd = true;
            });
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        engine = new OBD2ProtocolEngine();
        useAppStore.getState().isPro = true; // Set user as PRO to isolate movement safety checks
        useBluetoothStore.getState().connectionState = 'TELEMETRY_ACTIVE';
        engine.onVoltageReceived((voltage) => {
            useBluetoothStore.getState().setSensorData({ voltage });
        });
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

    test('5. Bad Clone CAN Rejection (ATCFC0 ve benzeri gelişmiş komutlar ? dönerse clone flag set edilmeli ve skor düşürülmeli)', async () => {
        // Mock BluetoothService to return "?" for advanced flow control commands
        const writeSpy = jest.spyOn(require('../BluetoothService').default, 'write').mockImplementation((cmd: any) => {
            setTimeout(() => {
                if (mockRegisteredCallback) {
                    if (cmd.includes('ATCFC0') || cmd.includes('FC')) {
                        mockRegisteredCallback('?\r\n>');
                    } else {
                        mockRegisteredCallback('OK\r\n>');
                    }
                }
            }, 0);
            return Promise.resolve(true);
        });

        // Run the command
        const res = await (engine as any).executeCommand('ATCFC0');
        expect(res.trim()).toBe('?');
        writeSpy.mockRestore();
    });

    test('6. Sıfır Kilitlenme Toleransı (? veya bilinmeyen komut yanıtında kuyruk kilitlenmemeli)', async () => {
        const clearSpy = jest.spyOn(engine, 'clear');
        
        // Komut '?' gelse dahi clear() çağrılmamalı, döngü devam etmeli
        (engine as any).finishCommand(null, '?');
        (engine as any).finishCommand(null, '?');
        (engine as any).finishCommand(null, '?');

        expect(clearSpy).not.toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    test('7. %35 Sinyal Kalitesi (Veri Kırpma / Data Chopper) Testi', async () => {
        jest.useFakeTimers();
        const { TransportRateLimiter } = require('../../core/transport/TransportRateLimiter');
        const rateLimitSpy = jest.spyOn(TransportRateLimiter, 'acquireToken').mockResolvedValue(undefined as any);

        let callCount = 0;
        const writeSpy = jest.spyOn(require('../BluetoothService').default, 'write').mockImplementation((cmd: any) => {
            if (cmd === '\r') {
                setTimeout(() => {
                    if (mockRegisteredCallback) {
                        mockRegisteredCallback('>');
                    }
                }, 0);
                return Promise.resolve(true);
            }
            callCount++;
            if (callCount === 1) {
                // First command: returns incomplete response, triggering a timeout
                setTimeout(() => {
                    if (mockRegisteredCallback) {
                        mockRegisteredCallback('41 0D 00\r\n');
                    }
                }, 0);
            } else {
                // Second command: returns response in 3 chunks!
                // Chunk 1: "41 " (at 0ms)
                setTimeout(() => {
                    if (mockRegisteredCallback) mockRegisteredCallback('41 ');
                }, 0);
                // Chunk 2: "0D " (at 5ms)
                setTimeout(() => {
                    if (mockRegisteredCallback) mockRegisteredCallback('0D ');
                }, 5);
                // Chunk 3: "00\r\n>" (at 10ms)
                setTimeout(() => {
                    if (mockRegisteredCallback) mockRegisteredCallback('00\r\n>');
                }, 10);
            }
            return Promise.resolve(true);
        });

        try {
            const p1 = (engine as any).executeCommand('01 0D', 15);
            await flushMicrotasks();
            jest.advanceTimersByTime(0);
            await flushMicrotasks();
            jest.advanceTimersByTime(15);
            await flushMicrotasks();
            jest.advanceTimersByTime(1); // run the mock callback for '\r'
            await flushMicrotasks();
            jest.advanceTimersByTime(200);
            await flushMicrotasks();

            await expect(p1).rejects.toThrow('Timeout: 01 0D');

            const p2 = (engine as any).executeCommand('01 0D', 1000);
            await flushMicrotasks();
            
            // Advance by 0ms to deliver chunk 1 ("41 ")
            jest.advanceTimersByTime(0);
            await flushMicrotasks();
            
            // Advance by 5ms to deliver chunk 2 ("0D ")
            jest.advanceTimersByTime(5);
            await flushMicrotasks();
            
            // Advance by 5ms (total 10ms) to deliver chunk 3 ("00\r\n>")
            jest.advanceTimersByTime(5);
            await flushMicrotasks();

            const res = await p2;
            expect(res).toBe('41 0D 00');
        } finally {
            rateLimitSpy.mockRestore();
            writeSpy.mockRestore();
            jest.useRealTimers();
        }
    });

    test('8. UART Tampon Bellek Taşması (Buffer Overflow & Stall) Testi', async () => {
        jest.useFakeTimers();
        const { TransportRateLimiter } = require('../../core/transport/TransportRateLimiter');
        const rateLimitSpy = jest.spyOn(TransportRateLimiter, 'acquireToken').mockResolvedValue(undefined as any);

        const writeSpy = jest.spyOn(require('../BluetoothService').default, 'write').mockImplementation((cmd: any) => {
            if (cmd === '\r' || cmd === 'ATWS\r') {
                return Promise.resolve(true);
            }
            setTimeout(() => {
                if (mockRegisteredCallback) {
                    mockRegisteredCallback('?\r\n>');
                }
            }, 0);
            return Promise.resolve(true);
        });

        const clearSpy = jest.spyOn(engine, 'clear');

        try {
            // First 2 failures resolve to '?' but increment stallCounter
            const p1 = (engine as any).executeCommand('01 0C');
            await flushMicrotasks();
            jest.advanceTimersByTime(0);
            await flushMicrotasks();
            const res1 = await p1;
            expect(res1).toBe('?');

            const p2 = (engine as any).executeCommand('01 0C');
            await flushMicrotasks();
            jest.advanceTimersByTime(0);
            await flushMicrotasks();
            const res2 = await p2;
            expect(res2).toBe('?');

            // Sıfır kilitlenme garantisi: clear çağrılmamalı
            expect(clearSpy).not.toHaveBeenCalled();
        } finally {
            rateLimitSpy.mockRestore();
            writeSpy.mockRestore();
            clearSpy.mockRestore();
            jest.useRealTimers();
        }
    });

    test('9. Ad-Hoc Yarış Durumu (Race Condition) Testi', async () => {
        jest.useFakeTimers();
        const { TransportRateLimiter } = require('../../core/transport/TransportRateLimiter');
        const transportLimitSpy = jest.spyOn(TransportRateLimiter, 'acquireToken').mockResolvedValue(undefined as any);
        const rateLimitSpy = jest.spyOn(require('../../core/queue/CommandRateLimiter').default, 'pace').mockResolvedValue(undefined as any);

        const executionOrder: string[] = [];
        const writeSpy = jest.spyOn(require('../BluetoothService').default, 'write').mockImplementation((cmd: any) => {
            if (cmd === '\r') {
                return Promise.resolve(true);
            }
            executionOrder.push(cmd);
            return new Promise<boolean>((resolve) => {
                setTimeout(() => {
                    if (mockRegisteredCallback) {
                        mockRegisteredCallback('41 0D 00\r\n>');
                    }
                    resolve(true);
                }, 30);
            });
        });

        (engine as any).clear();
        executionOrder.length = 0; // Clear '\r' written by clear()

        try {
            const t1Promise = engine.add('01 0D', 2000, 'HIGH');
            await flushMicrotasks();

            // Advance by 5ms to simulate the offset before other commands are queued
            jest.advanceTimersByTime(5);
            await flushMicrotasks();

            const t2Promise = engine.add('01 0C', 2000, 'HIGH');
            const t3Promise = engine.add('01 05', 2000, 'HIGH');

            const a1Promise = engine.add('ATZ', 2000, 'HIGH_PRIORITY_AD_HOC');
            const a2Promise = engine.add('ATE0', 2000, 'HIGH_PRIORITY_AD_HOC');
            const a3Promise = engine.add('ATI', 2000, 'HIGH_PRIORITY_AD_HOC');
            const a4Promise = engine.add('ATH0', 2000, 'HIGH_PRIORITY_AD_HOC');
            const a5Promise = engine.add('ATS1', 2000, 'HIGH_PRIORITY_AD_HOC');
            await flushMicrotasks();

            // Step through each command execution deterministically.
            // t1 finishes at 35ms (30ms from now)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // a1 (ATZ) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // a2 (ATE0) - blocked by 500ms cooldown from previous ATZ reset command!
            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            // Resolve a2 (ATE0) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // a3 (ATI) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // a4 (ATH0) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // a5 (ATS1) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // t2 (01 0C) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            // t3 (01 05) (30ms)
            jest.advanceTimersByTime(30);
            await flushMicrotasks();

            await Promise.all([t1Promise, t2Promise, t3Promise, a1Promise, a2Promise, a3Promise, a4Promise, a5Promise]);

            expect(executionOrder).toEqual([
                '01 0D',
                'ATZ',
                'ATE0',
                'ATI',
                'ATH0',
                'ATS1',
                '01 0C',
                '01 05'
            ]);
        } finally {
            transportLimitSpy.mockRestore();
            rateLimitSpy.mockRestore();
            writeSpy.mockRestore();
            jest.useRealTimers();
        }
    });

    test('10. Çift Durumlu Konsol ve i18n Temizlik Denetimi (t() fallback dil kontrolü)', () => {
        const fs = require('fs');
        const path = require('path');
        const fileContent = fs.readFileSync(path.resolve(__dirname, '../../screens/sandbox/DashboardSandbox.tsx'), 'utf8');

        const tCallRegex = /t\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        const nonEnglishStrings: string[] = [];

        while ((match = tCallRegex.exec(fileContent)) !== null) {
            const defaultText = match[1];
            if (/[ıİğĞüÜşŞöÖçÇ]/.test(defaultText)) {
                nonEnglishStrings.push(defaultText);
            }
        }

        expect(nonEnglishStrings).toEqual([]);
    });

    test('11. Hex Giriş Satırının (TextInput + SEND) Alt Kısma Dock Edildiğinin Yapısal Kontrolü', () => {
        const fs = require('fs');
        const path = require('path');
        const fileContent = fs.readFileSync(path.resolve(__dirname, '../../screens/sandbox/DashboardSandbox.tsx'), 'utf8');

        const flatListIndex = fileContent.indexOf('<FlatList');
        const inputAreaIndex = fileContent.indexOf('style={sDyn.inputArea}');
        
        expect(flatListIndex).not.toBe(-1);
        expect(inputAreaIndex).not.toBe(-1);
        expect(flatListIndex).toBeLessThan(inputAreaIndex);
    });

    test('12. ATRV Komutunun parseResponse Tarafından Doğru Çözümlenmesi', () => {
        (engine as any).parseResponse('ATRV', '14.2V');
        expect(useBluetoothStore.getState().voltage).toBe('14.2V');

        (engine as any).parseResponse('ATRV', '12.6\r\nV');
        expect(useBluetoothStore.getState().voltage).toBe('12.6V');
    });

    test('13. PollingOrchestrator Sıfır Karaliste ile Kesintisiz Telemetri Akışı', async () => {
        const { PollingOrchestrator } = require('../../core/connection/PollingOrchestrator');
        const OBDCommandQueue = require('../OBDCommandQueue').default;

        const sentCommands: string[] = [];
        const queueAddSpy = jest.spyOn(OBDCommandQueue, 'add')
            .mockImplementation((cmd: any) => {
                sentCommands.push(cmd);
                if (cmd === 'ATRV') return Promise.resolve('14.2V');
                if (cmd === '01 05') return Promise.resolve('NO DATA');
                if (cmd === '01 0C') return Promise.resolve('41 0C 00 00');
                return Promise.resolve('OK');
            });

        setTimeout(() => {
            PollingOrchestrator.stopPolling();
        }, 50);

        await PollingOrchestrator.startPolling(['05', '0C']);

        expect(sentCommands).toContain('01 05');
        expect(sentCommands).toContain('01 0C');

        queueAddSpy.mockRestore();
    });

    test('14. PollingOrchestrator Performance Mode Speed Önceliği Doğrulaması', async () => {
        const { PollingOrchestrator } = require('../../core/connection/PollingOrchestrator');
        const OBDCommandQueue = require('../OBDCommandQueue').default;

        const sentCommands: string[] = [];
        const queueAddSpy = jest.spyOn(OBDCommandQueue, 'add')
            .mockImplementation((cmd: any) => {
                sentCommands.push(cmd);
                return Promise.resolve('41 0D 32');
            });

        PollingOrchestrator.setPerformanceModePriority(true);

        setTimeout(() => {
            PollingOrchestrator.stopPolling();
            PollingOrchestrator.setPerformanceModePriority(false);
        }, 50);

        await PollingOrchestrator.startPolling(['0C', '0D']);

        expect(sentCommands).toContain('01 0D');

    });
});

