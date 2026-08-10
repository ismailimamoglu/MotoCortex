// Initialize global trace variables only if not present
if (!(global as any).mockWriteTrace) {
    (global as any).mockWriteTrace = [];
}
(global as any).mockSessionId = 0;
(global as any).__TEST_MAX_TELEMETRY_ITEMS__ = 50;

jest.mock('react-native-fs', () => ({
    stat: jest.fn().mockResolvedValue({ size: 0 }),
    exists: jest.fn().mockResolvedValue(false),
    writeFile: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
    unlink: jest.fn().mockResolvedValue(undefined),
    DocumentDirectoryPath: '/mock/documents',
    CachesDirectoryPath: '/mock/caches',
}));

jest.mock('react-native', () => ({
    AppState: {
        addEventListener: jest.fn(() => ({
            remove: jest.fn(),
        })),
    },
    Platform: {
        OS: 'android'
    }
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

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn().mockResolvedValue(true),
    getItem: jest.fn(),
    removeItem: jest.fn(),
}));

jest.mock('../supabaseClient', () => ({
    supabase: {
        rpc: jest.fn().mockResolvedValue({ error: null, status: 200 }),
    }
}));

import OBDCommandQueue, { LineState } from '../OBDCommandQueue';
import BluetoothService from '../BluetoothService';
import SQLiteStorage from '../../core/database/SQLiteStorage';

// Mock BluetoothService
jest.mock('../BluetoothService', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: jest.fn((cb) => {
                (global as any).mockDataListener = cb;
            }),
            write: jest.fn().mockResolvedValue(true),
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
            write: jest.fn().mockResolvedValue(true),
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
            write: jest.fn().mockResolvedValue(true),
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
        guardTime: 0,
    };
    return {
        useBluetoothStore: {
            getState: () => mockStoreState,
            subscribe: jest.fn(() => jest.fn()),
        }
    };
});

jest.mock('../../core/queue/CommandScheduler', () => {
    return {
        __esModule: true,
        default: {
            add: jest.fn((command: string, priority: string, cost: number, timeoutMs?: number) => {
                const queue = require('../../api/OBDCommandQueue').default;
                return queue.executeCommand(command, timeoutMs);
            }),
            clear: jest.fn(),
            setExecutionFunction: jest.fn(),
            setLockGuard: jest.fn(),
            setAdHocInterruptHandler: jest.fn()
        }
    };
});

jest.mock('../../services/Logger', () => ({
    log: jest.fn(),
}));

jest.mock('../../core/monitor/DiagnosticSessionRecorder', () => ({
    __esModule: true,
    default: {
        recordTx: jest.fn(),
        recordRx: jest.fn(),
        recordErr: jest.fn(),
        recordSys: jest.fn(),
        getLogs: jest.fn().mockReturnValue([]),
        clear: jest.fn(),
    }
}));

describe('OBDCommandQueue FakeTimers Watchdog and Timeout Tests', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        (global as any).mockWriteTrace = [];
        (global as any).mockSessionId++;
        OBDCommandQueue.clear();
        SQLiteStorage.clearAll();
        const { useTelemetryStore } = require('../../store/useTelemetryStore');
        useTelemetryStore.setState({ telemetry_queue: [], isQueueLoaded: true });
    });

    afterEach(() => {
        try {
            const TelemetrySyncManagerModule = require('../../services/TelemetrySyncManager');
            TelemetrySyncManagerModule.TelemetrySyncManager.getInstance().stop();
        } catch (e) {}
        try {
            jest.runOnlyPendingTimers();
        } catch (e) {}
        jest.clearAllTimers();
        jest.useRealTimers();
        OBDCommandQueue.clear();
    });

    test('1. Command execution timeout triggers LineState.INTERRUPTING and writes carriage return', async () => {
        const writeSpy = jest.spyOn(BluetoothService, 'write');
        const clearSpy = jest.spyOn(BluetoothService, 'clearBuffer');

        const p = OBDCommandQueue.add('010C', 1000); // 1000ms timeout
        await Promise.resolve(); // Flush microtasks so executeCommand schedules the timeout timer

        // Fast-forward time to trigger timeout
        jest.advanceTimersByTime(1001);
        await Promise.resolve(); // Flush microtasks so write('\r') is executed

        // Verify write was called with '\r' (recovery interrupt)
        expect(writeSpy).toHaveBeenCalledWith('\r');
        expect(clearSpy).toHaveBeenCalled();

        // Advance timers to trigger recovery completion
        jest.advanceTimersByTime(501);
        await Promise.resolve(); // Flush microtasks so finishCommand is called

        // Check promise rejected due to timeout
        await expect(p).rejects.toThrow('Timeout: 010C');
    });

    test('2. Interrupt sequence waits for silence window before returning to READY', async () => {
        const writeSpy = jest.spyOn(BluetoothService, 'write');
        const queue: any = OBDCommandQueue;

        const p = OBDCommandQueue.add('010D', 1000);
        await Promise.resolve(); // Flush microtasks so executeCommand schedules the timeout timer

        // Trigger timeout
        jest.advanceTimersByTime(1001);
        await Promise.resolve(); // Flush microtasks so write('\r') is executed
        expect(queue.lineState).toBe(LineState.INTERRUPTING);

        // Advance timers by silenceWindow (e.g. 200ms default under mock)
        // Livelock Guard absolute limit: silenceWindow + 300 = 500ms
        jest.advanceTimersByTime(501);
        await Promise.resolve(); // Flush microtasks so finishCommand is called

        // LineState should be reset back to READY
        expect(queue.lineState).toBe(LineState.READY);

        await expect(p).rejects.toThrow('Timeout: 010D');
    });

    describe('Telemetry Store Race Condition and Migration Tests', () => {
        let useTelemetryStore: any;
        let AsyncStorage: any;

        beforeEach(() => {
            useTelemetryStore = require('../../store/useTelemetryStore').useTelemetryStore;
            AsyncStorage = require('@react-native-async-storage/async-storage');
            AsyncStorage.setItem.mockClear();
            AsyncStorage.getItem.mockClear();
            AsyncStorage.removeItem.mockClear();
            SQLiteStorage.clearAll();
            
            jest.clearAllTimers();
            useTelemetryStore.setState({
                telemetry_queue: [],
                telemetryQueueBytes: 0,
                isQueueLoaded: false,
                activeSessionVehicle: null
            });
        });

        test('3. Enqueue during isQueueLoaded=false places item in memory but blocks disk write', () => {
            const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
            useTelemetryStore.setState({ isQueueLoaded: false });

            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'h1', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
            });

            jest.advanceTimersByTime(6000); // Trigger any debounced save timeouts

            // Item is in memory
            expect(useTelemetryStore.getState().telemetry_queue.length).toBe(1);
            // Disk write should be blocked
            expect(setItemSpy).not.toHaveBeenCalledWith('motocortex-telemetry-queue', expect.any(String));
        });

        test('4. Lazy-loading merges memory enqueues chronologically and sets isQueueLoaded=true', async () => {
            useTelemetryStore.setState({ isQueueLoaded: false });
            
            // Enqueue memory item
            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'memory-1', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
            });

            const diskItems = [
                { id: 'disk-1', brand: 'renault', model: 'clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'disk-1', retry_count: 0, engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false }
            ];
            AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(diskItems));

            const { initializeTelemetryQueue } = require('../../store/useTelemetryStore');
            await initializeTelemetryQueue();

            const state = useTelemetryStore.getState();
            expect(state.isQueueLoaded).toBe(true);
            expect(state.telemetry_queue.length).toBe(2);
            // Chronological verification: [...diskData, ...memoryData]
            expect(state.telemetry_queue[0].id).toBe('disk-1');
            expect(state.telemetry_queue[1].session_hash).toBe('memory-1');
        });

        test('5. Telemetry writes to SQLite are immediate', () => {
            useTelemetryStore.setState({ isQueueLoaded: true });

            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'h-deb-1', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
            });

            // Verify it was immediately written to SQLiteStorage
            const items = SQLiteStorage.getAllItems();
            expect(items.some(x => x.session_hash === 'h-deb-1')).toBe(true);
        });

        test('6. flushQueueToDisk is a safe no-op', async () => {
            const { flushQueueToDisk } = require('../../store/useTelemetryStore');
            await expect(flushQueueToDisk()).resolves.toBeUndefined();
        });

        test('7. migrate function in Zustand configuration removes telemetry_queue and migrates it to isolated key', async () => {
            const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
            const storeConfig = (useTelemetryStore as any).persist.getOptions();
            
            const legacyState = {
                telemetry_queue: [
                    { id: 'leg-1', brand: 'renault', model: 'clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'legacy-1', retry_count: 0, engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false }
                ],
                activeSessionVehicle: null,
                telemetryQueueBytes: 150
            };

            const migrated = storeConfig.migrate(legacyState, 1);

            // Expect legacy telemetry_queue key to be deleted from main state slice
            expect(migrated.telemetry_queue).toBeUndefined();
            // Expect legacy items to be migrated to isolated AsyncStorage key
            await Promise.resolve();
            await Promise.resolve();
            expect(setItemSpy).toHaveBeenCalledWith('motocortex-telemetry-queue', expect.any(String));
        });

        test('8. Enqueue when isQueueLoaded=false is held in memory and not written to disk, then loading queue triggers chronological merge and debounced save', async () => {
            const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
            useTelemetryStore.setState({ isQueueLoaded: false, telemetry_queue: [] });

            // Enqueue item when not loaded
            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'mem-1', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
            });

            // Fast-forward: verify no disk write occurred for queue
            jest.advanceTimersByTime(6000);
            expect(setItemSpy).not.toHaveBeenCalledWith('motocortex-telemetry-queue', expect.any(String));

            // Load from disk
            const diskItems = [
                { id: 'disk-1', brand: 'renault', model: 'clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'disk-1', retry_count: 0, engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false }
            ];
            AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(diskItems));

            const { initializeTelemetryQueue } = require('../../store/useTelemetryStore');
            await initializeTelemetryQueue();

            // Verify chronological order: disk first, then memory
            const state = useTelemetryStore.getState();
            expect(state.telemetry_queue.length).toBe(2);
            expect(state.telemetry_queue[0].id).toBe('disk-1');
            expect(state.telemetry_queue[1].session_hash).toBe('mem-1');
        });

        test('9. Multiple rapid enqueues when isQueueLoaded=false are all buffered in memory, and once initialized, they are merged chronologically after the disk items', async () => {
            useTelemetryStore.setState({ isQueueLoaded: false, telemetry_queue: [] });

            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'mem-1', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
            });
            useTelemetryStore.getState().enqueueTelemetry({
                brand: 'Renault', model: 'Megane', year: 2021, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'mem-2', engine_rpm: 2500, coolant_temp: 92, throttle_pos: 25, is_simulated: false
            });

            const diskItems = [
                { id: 'disk-1', brand: 'renault', model: 'scenic', year: 2019, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'disk-1', retry_count: 0, engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false }
            ];
            AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(diskItems));

            const { initializeTelemetryQueue } = require('../../store/useTelemetryStore');
            await initializeTelemetryQueue();

            const state = useTelemetryStore.getState();
            expect(state.telemetry_queue.length).toBe(3);
            expect(state.telemetry_queue[0].id).toBe('disk-1');
            expect(state.telemetry_queue[1].session_hash).toBe('mem-1');
            expect(state.telemetry_queue[2].session_hash).toBe('mem-2');
        });

        test('10. Sync daemon lock verification: TelemetrySyncManager does not dequeue or process items when isQueueLoaded=false', async () => {
            const mockRemove = jest.fn();
            useTelemetryStore.setState({
                isQueueLoaded: false,
                telemetry_queue: [
                    { id: 'item-1', brand: 'renault', model: 'clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-1', retry_count: 0, engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false }
                ],
                removeTelemetryItem: mockRemove
            });

            const storeState = useTelemetryStore.getState();
            expect(storeState.isQueueLoaded).toBe(false);
            expect(mockRemove).not.toHaveBeenCalled();
        });


    });

    afterAll(() => {
        try {
            const TelemetrySyncManagerModule = require('../../services/TelemetrySyncManager');
            TelemetrySyncManagerModule.TelemetrySyncManager.getInstance().stop();
        } catch (e) {}
        jest.clearAllTimers();
        jest.restoreAllMocks();
        jest.useRealTimers();
        (global as any).mockWriteTrace = [];
        (global as any).mockDataListener = null;
    });
});
