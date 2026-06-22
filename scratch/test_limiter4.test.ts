import { TransportRateLimiter } from '../src/core/transport/TransportRateLimiter';
import { useBluetoothStore } from '../src/store/useBluetoothStore';

describe('Scratch Limiter Test 4', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        TransportRateLimiter.cleanup();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('run without Date.now spy', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        TransportRateLimiter.initialize();

        const promises = [];
        for (let i = 0; i < 4; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }

        await Promise.all(promises);
        console.log("First 4 resolved");

        const order: number[] = [];
        TransportRateLimiter.acquireToken().then(() => order.push(1));
        TransportRateLimiter.acquireToken().then(() => order.push(2));

        console.log("Queue length before advance:", (TransportRateLimiter as any).queue.length);

        // Advance by 250ms (fill rate = 4 -> 1 token per 250ms)
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        console.log("After 250ms: order =", order, "queue =", (TransportRateLimiter as any).queue.length);
        expect(order).toEqual([1]);

        // Advance by another 250ms
        jest.advanceTimersByTime(250);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        console.log("After 500ms: order =", order, "queue =", (TransportRateLimiter as any).queue.length);
        expect(order).toEqual([1, 2]);
    });
});
