jest.mock('react-native-ble-plx', () => ({
    BleManager: jest.fn().mockImplementation(() => ({
        onStateChange: jest.fn(),
        startDeviceScan: jest.fn(),
        stopDeviceScan: jest.fn(),
        connectToDevice: jest.fn(),
        destroy: jest.fn(),
    })),
    State: {
        PoweredOn: 'PoweredOn',
        PoweredOff: 'PoweredOff',
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

import { OBD2ProtocolEngine } from '../OBD2ProtocolEngine';
import OBDCommandQueue from '../OBDCommandQueue';
import BluetoothService from '../BluetoothService';
import { useBluetoothStore } from '../../store/useBluetoothStore';

describe('DelayInjectionEngine & Livelock Recovery Tests', () => {
    let engine: OBD2ProtocolEngine;

    beforeEach(() => {
        engine = new OBD2ProtocolEngine();
        OBDCommandQueue.clear();
        OBDCommandQueue.resetStallCounter();
        useBluetoothStore.getState().clearLogs();
        useBluetoothStore.setState({ protocolCacheByDevice: {} });
    });

    it('should break livelocks via stallSkipCount force-clear when queue remains busy during recovery', async () => {
        const writeSpy = jest.spyOn(BluetoothService, 'write').mockImplementation(() => Promise.resolve());
        const clearSpy = jest.spyOn(engine, 'clear');

        // Simulate 3 consecutive command timeouts/errors to trigger ADAPTER_STALL
        (engine as any).finishCommand(new Error('TIMEOUT_1'));
        (engine as any).finishCommand(new Error('TIMEOUT_2'));
        (engine as any).finishCommand(new Error('TIMEOUT_3'));

        // Wait for 150ms macro-task boundary for preciseSleep(100) recovery execution
        await new Promise((r) => setTimeout(r, 150));

        // Verify clear was triggered and ATWS recovery attempted
        expect(clearSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(writeSpy).toHaveBeenCalledWith('ATWS\r');

        writeSpy.mockRestore();
        clearSpy.mockRestore();
    });

    it('should prioritize cached protocol for specific deviceId in fast-path lookup', () => {
        useBluetoothStore.getState().setProtocolForDevice('DEV_A_123', 'ISO 14230-4 (KWP Fast Init) (DPN 5)');
        useBluetoothStore.getState().setProtocolForDevice('DEV_B_456', 'ISO 15765-4 (CAN 11b/500k) (DPN 6)');

        const cache = useBluetoothStore.getState().protocolCacheByDevice;
        expect(cache['DEV_A_123']).toContain('KWP Fast Init');
        expect(cache['DEV_B_456']).toContain('CAN 11b/500k');
    });
});
