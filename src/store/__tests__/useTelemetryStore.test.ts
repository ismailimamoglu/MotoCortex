import { useTelemetryStore, estimateItemBytes, estimateQueueBytes, TelemetryItem } from '../useTelemetryStore';
import { useAppStore } from '../useAppStore';
import SQLiteStorage from '../../core/database/SQLiteStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn().mockResolvedValue(true),
    getItem: jest.fn(),
    removeItem: jest.fn(),
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

jest.mock('../useAppStore', () => {
    let simulationMode = false;
    return {
        useAppStore: {
            getState: () => ({
                isSimulationMode: simulationMode,
                appUserId: 'test-user-id',
            }),
            setState: (state: any) => {
                if (state.isSimulationMode !== undefined) {
                    simulationMode = state.isSimulationMode;
                }
            }
        }
    };
});

jest.mock('../../utils/crypto', () => ({
    calculateSessionHash: jest.fn().mockResolvedValue('mock-hash'),
}));

let mockBluetoothState = {
    dtcs: [] as any[],
    connectingDeviceId: null as string | null,
};

const mockSetConnectingDeviceId = (id: string | null) => {
    mockBluetoothState.connectingDeviceId = id;
};

const mockReset = () => {
    mockBluetoothState.connectingDeviceId = null;
};

jest.mock('../useBluetoothStore', () => ({
    useBluetoothStore: {
        getState: () => ({
            ...mockBluetoothState,
            setConnectingDeviceId: mockSetConnectingDeviceId,
            reset: mockReset,
        }),
        subscribe: jest.fn(() => jest.fn()),
    }
}));

jest.mock('../../api/supabaseClient', () => ({
    supabase: {
        rpc: jest.fn(),
    }
}));

describe('useTelemetryStore Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SQLiteStorage.clearAll();
        useTelemetryStore.setState({
            telemetry_queue: [],
            telemetryQueueBytes: 0,
            activeSessionVehicle: null,
            chronicFaults: [],
            isLoadingChronicFaults: false,
            chronicFaultsError: null,
            sessionDynamicKey: null,
        });
        const appStore = useAppStore.getState() as any;
        useAppStore.setState({ isSimulationMode: false });
    });

    test('1. Enqueues a valid telemetry item and estimates bytes', () => {
        const store = useTelemetryStore.getState();
        const item = {
            brand: 'Renault',
            model: 'Clio',
            year: 2020,
            protocol: 'ISO_15765_4_CAN',
            ecu_id: 'ECU-12345',
            dtc_codes: ['P0102'],
            session_hash: 'hash-abc-123',
            engine_rpm: 2500,
            coolant_temp: 90,
            throttle_pos: 20,
            is_simulated: false
        };

        store.enqueueTelemetry(item);

        const updatedState = useTelemetryStore.getState();
        expect(updatedState.telemetry_queue.length).toBe(1);
        expect(updatedState.telemetryQueueBytes).toBeGreaterThan(0);
        expect(updatedState.telemetry_queue[0].brand).toBe('renault'); // standardized to snake_case
    });

    test('2. Rejects single item exceeding 2KB size limit', () => {
        const store = useTelemetryStore.getState();
        // Generate a very large brand string to exceed 2KB (2048 bytes)
        const hugeBrand = 'a'.repeat(2500);
        
        const item = {
            brand: hugeBrand,
            model: 'HugeCar',
            year: 2020,
            protocol: 'ISO_15765_4_CAN',
            ecu_id: 'ECU-LARGE',
            dtc_codes: [],
            session_hash: 'hash-large',
            engine_rpm: 2000,
            coolant_temp: 90,
            throttle_pos: 20,
            is_simulated: false
        };

        store.enqueueTelemetry(item);

        const updatedState = useTelemetryStore.getState();
        expect(updatedState.telemetry_queue.length).toBe(0);
        expect(updatedState.telemetryQueueBytes).toBe(0);
    });

    test('3. Enforces FIFO queue limits when count > 2000', () => {
        const store = useTelemetryStore.getState();
        
        // Populate the queue manually with 2000 mock items
        const initialQueue: TelemetryItem[] = [];
        for (let i = 0; i < 2000; i++) {
            initialQueue.push({
                id: `id-${i}`,
                brand: 'renault',
                model: 'clio',
                year: 2020,
                protocol: 'ISO_15765_4_CAN',
                ecu_id: `ECU-${i}`,
                dtc_codes: [],
                session_hash: `hash-${i}`,
                retry_count: 0,
                engine_rpm: 2000,
                coolant_temp: 90,
                throttle_pos: 20,
                is_simulated: false
            });
        }
        
        for (const item of initialQueue) {
            SQLiteStorage.enqueueTelemetry(item);
        }
        useTelemetryStore.setState({
            telemetry_queue: SQLiteStorage.getAllItems(),
            telemetryQueueBytes: 2000 * 150 // approximate size
        });

        // Enqueue 2001st item
        const newItem = {
            brand: 'Renault',
            model: 'Megane',
            year: 2021,
            protocol: 'ISO_15765_4_CAN',
            ecu_id: 'ECU-2001',
            dtc_codes: [],
            session_hash: 'hash-2001',
            engine_rpm: 2000,
            coolant_temp: 90,
            throttle_pos: 20,
            is_simulated: false
        };
        
        useTelemetryStore.getState().enqueueTelemetry(newItem);

        const updatedState = useTelemetryStore.getState();
        const diskQueue = SQLiteStorage.getAllItems();
        // The disk queue size should remain capped at 2000
        expect(diskQueue.length).toBe(2000);
        // The in-memory state window should be capped at 100
        expect(updatedState.telemetry_queue.length).toBe(100);
        // The first item (id-0) should be removed from SQLite storage (FIFO)
        expect(diskQueue.find(x => x.id === 'id-0')).toBeUndefined();
        // The new item should be at the end of the queue
        expect(diskQueue[1999].session_hash).toBe('hash-2001');
    });

    test('4. Enforces FIFO queue bytes limit (1.5MB)', () => {
        // Prepare a queue with 1600 items of size 1000 bytes each
        // Total size = 1600 * 1000 = 1,600,000 bytes (> 1.5MB)
        const initialQueue: TelemetryItem[] = [];
        for (let i = 0; i < 1600; i++) {
            initialQueue.push({
                id: `id-${i}`,
                brand: 'b'.repeat(800), // ~1000 bytes with metadata
                model: 'model',
                year: 2020,
                protocol: 'ISO_15765_4_CAN',
                ecu_id: 'ECU-1',
                dtc_codes: [],
                session_hash: `hash-${i}`,
                retry_count: 0,
                engine_rpm: 2000,
                coolant_temp: 90,
                throttle_pos: 20,
                is_simulated: false
            });
        }
        
        const initialBytes = estimateQueueBytes(initialQueue);

        useTelemetryStore.setState({
            telemetry_queue: initialQueue,
            telemetryQueueBytes: initialBytes
        });

        // Add one more 1000 bytes item. Total will exceed 1.5MB
        const newItem = {
            brand: 'd'.repeat(800),
            model: 'model3',
            year: 2020,
            protocol: 'ISO_15765_4_CAN',
            ecu_id: 'ECU-3',
            dtc_codes: [],
            session_hash: 'hash-new',
            engine_rpm: 2000,
            coolant_temp: 90,
            throttle_pos: 20,
            is_simulated: false
        };

        useTelemetryStore.getState().enqueueTelemetry(newItem);

        const updatedState = useTelemetryStore.getState();
        // Since total size exceeded 1.5MB (1,500,000 bytes),
        // FIFO pruner must have evicted the first items to fit the new one
        expect(updatedState.telemetry_queue.find(x => x.id === 'id-0')).toBeUndefined();
        expect(updatedState.telemetry_queue.length).toBeLessThan(1600);
        expect(updatedState.telemetryQueueBytes).toBeLessThanOrEqual(1500000);
    });

    test('5. initializeTelemetryQueue correctly merges disk data and memory data chronologically', async () => {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        const diskItems = [
            { id: 'disk-1', brand: 'renault', model: 'clio', year: 2020, protocol: 'ISO', ecu_id: 'ECU-1', dtc_codes: [], session_hash: 'h1', retry_count: 0, engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false }
        ];
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify(diskItems));

        // Enqueue memory item before load
        useTelemetryStore.setState({ isQueueLoaded: false });
        useTelemetryStore.getState().enqueueTelemetry({
            brand: 'Renault', model: 'Megane', year: 2021, protocol: 'ISO', ecu_id: 'ECU-2', dtc_codes: [], session_hash: 'h2', engine_rpm: 0, coolant_temp: 0, throttle_pos: 0, is_simulated: false
        });

        const { initializeTelemetryQueue } = require('../useTelemetryStore');
        await initializeTelemetryQueue();

        const state = useTelemetryStore.getState();
        expect(state.isQueueLoaded).toBe(true);
        expect(state.telemetry_queue.length).toBe(2);
        // Chronological order check: diskItems first, then memory enqueues
        expect(state.telemetry_queue[0].id).toBe('disk-1');
        expect(state.telemetry_queue[1].session_hash).toBe('h2');
    });

    test('6. Prioritizes removing synced items (success: true) first when queue capacity is reached', () => {
        const store = useTelemetryStore.getState();
        
        // Populate store with 2000 items, where item index 5 is synced (success: true)
        const initialQueue: TelemetryItem[] = [];
        for (let i = 0; i < 2000; i++) {
            initialQueue.push({
                id: `id-${i}`,
                brand: 'renault',
                model: 'clio',
                year: 2020,
                protocol: 'CAN',
                ecu_id: 'ECU',
                dtc_codes: [],
                session_hash: `hash-${i}`,
                retry_count: 0,
                engine_rpm: 2000,
                coolant_temp: 90,
                throttle_pos: 20,
                is_simulated: false,
                success: i === 5 // Index 5 is synced
            });
        }
        
        for (const item of initialQueue) {
            SQLiteStorage.enqueueTelemetry(item);
        }
        useTelemetryStore.setState({
            telemetry_queue: SQLiteStorage.getAllItems(),
            telemetryQueueBytes: 2000 * 150,
            isQueueLoaded: true
        });

        // Add 2001st item
        const newItem = {
            brand: 'Renault', model: 'Scenic', year: 2022, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-2001', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
        };
        store.enqueueTelemetry(newItem);

        const state = useTelemetryStore.getState();
        const diskQueue = SQLiteStorage.getAllItems();
        expect(diskQueue.length).toBe(2000);
        expect(state.telemetry_queue.length).toBe(100);
        // The synced item (id-5) should be pruned instead of the oldest unsynced item (id-0)
        expect(diskQueue.find(x => x.id === 'id-5')).toBeUndefined();
        expect(diskQueue.find(x => x.id === 'id-0')).toBeDefined();
    });

    test('7. Block dequeueTelemetry when isQueueLoaded = false', () => {
        useTelemetryStore.setState({
            isQueueLoaded: false,
            telemetry_queue: [{ id: 'item-1', brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-1', retry_count: 0, engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false }]
        });

        useTelemetryStore.getState().dequeueTelemetry(1);
        expect(useTelemetryStore.getState().telemetry_queue.length).toBe(1);
    });

    test('8. Block removeTelemetryItem when isQueueLoaded = false', () => {
        useTelemetryStore.setState({
            isQueueLoaded: false,
            telemetry_queue: [{ id: 'item-1', brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-1', retry_count: 0, engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false }]
        });

        useTelemetryStore.getState().removeTelemetryItem('item-1');
        expect(useTelemetryStore.getState().telemetry_queue.length).toBe(1);
    });

    test('9. Block incrementRetryCount when isQueueLoaded = false', () => {
        useTelemetryStore.setState({
            isQueueLoaded: false,
            telemetry_queue: [{ id: 'item-1', brand: 'Renault', model: 'Clio', year: 2020, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-1', retry_count: 0, engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false }]
        });

        useTelemetryStore.getState().incrementRetryCount('item-1');
        expect(useTelemetryStore.getState().telemetry_queue[0].retry_count).toBe(0);
    });

    test('10. Offline Overflow Fallback - cap limit with 100% success: false items reports QUEUE_OVERFLOW_DATA_DROPPED', () => {
        const DiagnosticSessionRecorder = require('../../core/monitor/DiagnosticSessionRecorder').default;
        const recordErrSpy = jest.spyOn(DiagnosticSessionRecorder, 'recordErr');
        
        const initialQueue: TelemetryItem[] = [];
        for (let i = 0; i < 2000; i++) {
            initialQueue.push({
                id: `id-${i}`,
                brand: 'Renault',
                model: 'Clio',
                year: 2020,
                protocol: 'CAN',
                ecu_id: 'ECU',
                dtc_codes: [],
                session_hash: `hash-${i}`,
                retry_count: 0,
                engine_rpm: 2000,
                coolant_temp: 90,
                throttle_pos: 20,
                is_simulated: false,
                success: false
            });
        }
        
        for (const item of initialQueue) {
            SQLiteStorage.enqueueTelemetry(item);
        }
        useTelemetryStore.setState({
            telemetry_queue: SQLiteStorage.getAllItems().slice(-100),
            telemetryQueueBytes: 2000 * 150,
            isQueueLoaded: true
        });

        const store = useTelemetryStore.getState();
        store.enqueueTelemetry({
            brand: 'Renault', model: 'Scenic', year: 2022, protocol: 'CAN', ecu_id: 'ECU', dtc_codes: [], session_hash: 'hash-2001', engine_rpm: 2000, coolant_temp: 90, throttle_pos: 20, is_simulated: false
        });

        const state = useTelemetryStore.getState();
        const diskQueue = SQLiteStorage.getAllItems();
        expect(diskQueue.length).toBe(2000);
        expect(state.telemetry_queue.length).toBe(100);
        expect(diskQueue.find((x: any) => x.id === 'id-0')).toBeUndefined();
        expect(recordErrSpy).toHaveBeenCalledWith('QUEUE_OVERFLOW_DATA_DROPPED', expect.any(String));
    });

    test('11. Rejects single telemetry item exceeding 2KB size limit', () => {
        const store = useTelemetryStore.getState();
        useTelemetryStore.setState({ isQueueLoaded: true });

        const largeItem = {
            brand: 'b'.repeat(3000), // exceeds 2KB
            model: 'model',
            year: 2020,
            protocol: 'CAN',
            ecu_id: 'ECU',
            dtc_codes: [],
            session_hash: 'hash-large',
            engine_rpm: 2000,
            coolant_temp: 90,
            throttle_pos: 20,
            is_simulated: false
        };

        store.enqueueTelemetry(largeItem);

        const state = useTelemetryStore.getState();
        expect(state.telemetry_queue.find(x => x.session_hash === 'hash-large')).toBeUndefined();
    });

    test('12. Zustand migrate function version 1->2 moves data and calls delete state.telemetry_queue', async () => {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
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
        expect(migrated.telemetry_queue).toBeUndefined();
        await Promise.resolve();
        await Promise.resolve();
        expect(setItemSpy).toHaveBeenCalledWith('motocortex-telemetry-queue', expect.any(String));
    });

    test('13. Zustand migrate function version 2 doesn\'t migrate', () => {
        const storeConfig = (useTelemetryStore as any).persist.getOptions();
        const stateV2 = {
            activeSessionVehicle: null,
            telemetryQueueBytes: 0
        };
        const migrated = storeConfig.migrate(stateV2, 2);
        expect(migrated).toEqual(stateV2);
    });

    test('14. BluetoothStore Integration - connectingDeviceId is safely reset to null on successful connection/cancellation', () => {
        const { useBluetoothStore } = require('../useBluetoothStore');
        
        useBluetoothStore.getState().setConnectingDeviceId('OBD-DEVICE-ID-1');
        expect(useBluetoothStore.getState().connectingDeviceId).toBe('OBD-DEVICE-ID-1');
        
        useBluetoothStore.getState().setConnectingDeviceId(null);
        expect(useBluetoothStore.getState().connectingDeviceId).toBeNull();
    });

    test('15. BluetoothStore Integration - connectingDeviceId is safely reset to null on connection exception/reset', () => {
        const { useBluetoothStore } = require('../useBluetoothStore');
        
        useBluetoothStore.getState().setConnectingDeviceId('OBD-DEVICE-ID-2');
        expect(useBluetoothStore.getState().connectingDeviceId).toBe('OBD-DEVICE-ID-2');
        
        useBluetoothStore.getState().reset();
        expect(useBluetoothStore.getState().connectingDeviceId).toBeNull();
    });

    test('16. setActiveSessionVehicle persists fuelType (diesel, gasoline, etc.) properly', () => {
        useTelemetryStore.getState().setActiveSessionVehicle({
            brand: 'peugeot_car',
            model: 'rifter',
            year: 2025,
            fuelType: 'diesel'
        });

        const active = useTelemetryStore.getState().activeSessionVehicle;
        expect(active).not.toBeNull();
        expect(active?.brand).toBe('peugeot_car');
        expect(active?.model).toBe('rifter');
        expect(active?.year).toBe(2025);
        expect(active?.fuelType).toBe('diesel');
    });
});
