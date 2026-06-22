import { TransportRateLimiter } from '../src/core/transport/TransportRateLimiter';
import { useBluetoothStore } from '../src/store/useBluetoothStore';

describe('Scratch Limiter Test 2', () => {
    let mockTime = 1000000;

    beforeEach(() => {
        mockTime = 1000000;
        jest.spyOn(Date, 'now').mockImplementation(() => mockTime);
        jest.useFakeTimers();
        TransportRateLimiter.cleanup();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    const advanceTime = (ms: number) => {
        mockTime += ms;
        jest.advanceTimersByTime(ms);
    };

    test('TIER_A settings (Score 70): 12 QPS constraint', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 70;
        state.isCloneDevice = false;

        TransportRateLimiter.initialize();

        console.log("Initial state: tokens =", (TransportRateLimiter as any).tokens, "capacity =", (TransportRateLimiter as any).capacity);

        const promises = [];
        for (let i = 0; i < 12; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }
        await Promise.all(promises);
        console.log("First 12 tokens acquired: tokens =", (TransportRateLimiter as any).tokens);

        let resolved13th = false;
        TransportRateLimiter.acquireToken().then(() => {
            resolved13th = true;
        });

        console.log("Before advance: tokens =", (TransportRateLimiter as any).tokens, "queue length =", (TransportRateLimiter as any).queue.length);

        advanceTime(90);
        await Promise.resolve();
        await Promise.resolve();

        console.log("After advance: tokens =", (TransportRateLimiter as any).tokens, "queue length =", (TransportRateLimiter as any).queue.length, "resolved13th =", resolved13th);
        expect(resolved13th).toBe(true);
    });
});
