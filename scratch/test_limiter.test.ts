import { TransportRateLimiter } from '../src/core/transport/TransportRateLimiter';
import { useBluetoothStore } from '../src/store/useBluetoothStore';

describe('Scratch Limiter Test with Fake Timers', () => {
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

    test('run with fake timers', async () => {
        console.log("1. Setting state");
        const state = useBluetoothStore.getState();
        state.adapterCapabilityScore = 50;
        state.isCloneDevice = true;

        console.log("2. Initializing rate limiter");
        TransportRateLimiter.initialize();

        console.log("3. Acquiring first 4 tokens");
        const promises = [];
        for (let i = 0; i < 4; i++) {
            promises.push(TransportRateLimiter.acquireToken());
        }

        console.log("4. Awaiting Promise.all(promises)");
        await Promise.all(promises);
        console.log("5. First 4 tokens resolved!");

        console.log("6. Acquiring 5th token");
        let resolved5th = false;
        TransportRateLimiter.acquireToken().then(() => {
            console.log("5th token acquired in microtask");
            resolved5th = true;
        });

        console.log("7. Awaiting Promise.resolve()");
        await Promise.resolve();
        console.log("8. resolved5th before advancing time:", resolved5th);
        expect(resolved5th).toBe(false);

        console.log("9. Advancing time by 250ms");
        advanceTime(250);
        console.log("10. Awaiting microtasks");
        await Promise.resolve();
        await Promise.resolve();
        console.log("11. resolved5th after advancing time:", resolved5th);
        expect(resolved5th).toBe(true);

        TransportRateLimiter.cleanup();
    });
});
