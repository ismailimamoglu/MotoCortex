import { CapabilityDiscoveryManager } from '../CapabilityDiscoveryManager';
import OBDCommandQueue from '../../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../../store/useBluetoothStore';

jest.mock('../../../api/OBDCommandQueue', () => {
    return {
        add: jest.fn()
    };
});

describe('CapabilityDiscoveryManager Tests', () => {
    beforeEach(() => {
        useBluetoothStore.getState().reset();
        jest.clearAllMocks();
    });

    test('1. Discovers supported PIDs and stores them correctly', async () => {
        // Mock 01 00 response indicating PID 0C (RPM) and 0D (Speed) and 20 (Next block) are supported
        // Bitmask for PIDs 1 to 32. 
        // 0C is 12 -> bit index 11. 0D is 13 -> bit index 12. 20 is 32 -> bit index 31.
        // Let's return a bitmask hex that supports them.
        // E.g. "41 00 BE 1F A0 11" or similar.
        // The parser expects '4100' + 8 hex chars (32 bits bitmask).
        // Let's return '4100 00180001' -> binary:
        // Byte 0: 00 -> 00000000 (PIDs 1-8)
        // Byte 1: 18 -> 00011000 (PIDs 9-16: supports PID 12 (0C) and 13 (0D))
        // Byte 2: 00 -> 00000000 (PIDs 17-24)
        // Byte 3: 01 -> 00000001 (PIDs 25-32: supports PID 32 (20))
        (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd) => {
            if (cmd === '01 00') return Promise.resolve('41 00 00 18 00 01');
            if (cmd === '01 20') return Promise.resolve('41 20 00 00 00 00'); // Block 20 supports nothing
            return Promise.resolve('NO DATA');
        });

        await CapabilityDiscoveryManager.discoverSupportedPids();

        const store = useBluetoothStore.getState();
        // Discovered PIDs should include 0C, 0D, 20
        expect(store.supportedPids).toContain('0C@7E8');
        expect(store.supportedPids).toContain('0D@7E8');
        expect(store.supportedPids).toContain('20@7E8');
        expect(store.pidBlocksStatus['01 00']).toBe('supported');
        expect(store.pidBlocksStatus['01 20']).toBe('supported');
    });

    test('2. Fails twice consecutively on a block and skips subsequent blocks', async () => {
        let callCount = 0;
        (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd) => {
            callCount++;
            if (cmd === '01 00') return Promise.resolve('41 00 00 18 00 01');
            if (cmd === '01 20') return Promise.reject(new Error('TIMEOUT'));
            return Promise.resolve('NO DATA');
        });

        await CapabilityDiscoveryManager.discoverSupportedPids();

        const store = useBluetoothStore.getState();
        // Since block 01 20 failed 2 times, it should stop querying
        expect(callCount).toBe(3); // 0100 (1) + 0120 (2 attempts)
        expect(store.pidBlocksStatus['01 20']).toBe('unknown');
        expect(store.pidBlocksStatus['01 40']).toBeUndefined();
    });

    test('3. Loads default emergency PIDs when no response is received', async () => {
        (OBDCommandQueue.add as jest.Mock).mockRejectedValue(new Error('NO RESPONSE'));

        await CapabilityDiscoveryManager.discoverSupportedPids();

        const store = useBluetoothStore.getState();
        expect(store.supportedPids).toContain('0C@7E8'); // RPM is in emergency defaults
        expect(store.supportedPids).toContain('0D@7E8'); // Speed is in emergency defaults
        expect(store.pidBlocksStatus['01 00']).toBe('unknown');
    });

    test('4. Correctly decodes bits to PIDs', async () => {
        // Let's test a bitmask supporting PID 01 (0101) and PID 08 (0108)
        // Byte 0: 81 -> 10000001 (PIDs 1 and 8 supported)
        (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd) => {
            if (cmd === '01 00') return Promise.resolve('41 00 81 00 00 00');
            return Promise.resolve('NO DATA');
        });

        await CapabilityDiscoveryManager.discoverSupportedPids();

        const store = useBluetoothStore.getState();
        expect(store.supportedPids).toContain('01@7E8');
        expect(store.supportedPids).toContain('08@7E8');
        expect(store.supportedPids).not.toContain('02@7E8');
    });

    test('5. Handles custom spacing and garbage output in response', async () => {
        // 4100 can be surrounded by carriage return or garbage
        (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd) => {
            if (cmd === '01 00') return Promise.resolve('\r\rSEARCHING...\r41 00 00 18 00 01\r\n>');
            return Promise.resolve('NO DATA');
        });

        await CapabilityDiscoveryManager.discoverSupportedPids();

        const store = useBluetoothStore.getState();
        expect(store.supportedPids).toContain('0C@7E8');
        expect(store.supportedPids).toContain('0D@7E8');
        expect(store.supportedPids).toContain('20@7E8');
    });
});
