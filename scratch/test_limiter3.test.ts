import { TransportRateLimiter } from '../src/core/transport/TransportRateLimiter';
import { useBluetoothStore } from '../src/store/useBluetoothStore';

describe('Scratch Limiter Test 3', () => {
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

    test('4. Queue processing order is FIFO', async () => {
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        TransportRateLimiter.initialize();

        console.log("Tokens start:", (TransportRateLimiter as any).tokens);

        for (let i = 0; i < 4; i++) {
            await TransportRateLimiter.acquireToken();
        }
        console.log("Tokens after 4 calls:", (TransportRateLimiter as any).tokens);

        const order: number[] = [];
        TransportRateLimiter.acquireToken().then(() => order.push(1));
        TransportRateLimiter.acquireToken().then(() => order.push(2));

        console.log("Queue length before advance:", (TransportRateLimiter as any).queue.length);

        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        console.log("Order after 250ms:", order, "tokens:", (TransportRateLimiter as any).tokens, "queue length:", (TransportRateLimiter as any).queue.length);
        expect(order).toEqual([1]);

        advanceTime(250);
        await Promise.resolve();
        await Promise.resolve();
        console.log("Order after another 250ms:", order, "tokens:", (TransportRateLimiter as any).tokens, "queue length:", (TransportRateLimiter as any).queue.length);
        expect(order).toEqual([1, 2]);
    });
});
