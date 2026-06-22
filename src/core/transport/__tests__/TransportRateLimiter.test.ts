import { TransportRateLimiter } from '../TransportRateLimiter';
import { useBluetoothStore } from '../../../store/useBluetoothStore';

jest.mock('../../../store/useBluetoothStore', () => {
    const mockState = {
        adapterCapabilityScore: 100,
        isCloneDevice: false,
        addLog: jest.fn()
    };
    return {
        useBluetoothStore: {
            getState: () => mockState
        }
    };
});

describe('TransportRateLimiter Tests', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        TransportRateLimiter.cleanup();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const advanceTime = (ms: number) => {
        jest.advanceTimersByTime(ms);
    };

    test('1. TIER_S settings (Score 100): 20 QPS initial capability', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 100;
        state.isCloneDevice = false;

        TransportRateLimiter.initialize();

        const promises = [];
        for (let i = 0; i < 20; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }

        await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    test('2. TIER_C settings (Clone): 4 QPS constraint', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        TransportRateLimiter.initialize();

        const promises = [];
        for (let i = 0; i < 4; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }
        await expect(Promise.all(promises)).resolves.toBeDefined();

        let resolved5th = false;
        TransportRateLimiter.acquireToken().then(() => {
            resolved5th = true;
        });

        await Promise.resolve();
        expect(resolved5th).toBe(false);

        // Advance time by 250ms (fill rate = 4 QPS -> 1 token per 250ms)
        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(resolved5th).toBe(true);
    });

    test('3. TIER_A settings (Score 70): 12 QPS constraint', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 70;
        state.isCloneDevice = false;

        TransportRateLimiter.initialize();

        const promises = [];
        for (let i = 0; i < 12; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }
        await expect(Promise.all(promises)).resolves.toBeDefined();

        let resolved13th = false;
        TransportRateLimiter.acquireToken().then(() => {
            resolved13th = true;
        });

        await Promise.resolve();
        expect(resolved13th).toBe(false);

        // Advance time by 100ms (12 QPS -> ~83ms per token, refilled at 50ms intervals, so 100ms is required)
        advanceTime(100);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(resolved13th).toBe(true);
    });

    test('4. Queue processing order is FIFO', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        TransportRateLimiter.initialize();

        for (let i = 0; i < 4; i++) {
            await TransportRateLimiter.acquireToken();
        }

        const order: number[] = [];
        TransportRateLimiter.acquireToken().then(() => order.push(1));
        TransportRateLimiter.acquireToken().then(() => order.push(2));

        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(order).toEqual([1]);

        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(order).toEqual([1, 2]);
    });

    test('5. Cleanup empties the queue and cancels the timer', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        TransportRateLimiter.initialize();

        for (let i = 0; i < 4; i++) {
            await TransportRateLimiter.acquireToken();
        }

        let resolved = false;
        TransportRateLimiter.acquireToken().then(() => {
            resolved = true;
        });

        TransportRateLimiter.cleanup();

        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(resolved).toBe(false);
    });
});
