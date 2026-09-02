import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry } from '../profile/AdapterProfileRegistry';

export class TransportRateLimiter {
    private static capacity: number = 20;
    private static tokens: number = 20;
    private static fillRate: number = 20; // tokens per second
    private static lastRefill: number = Date.now();
    private static queue: (() => void)[] = [];
    private static timer: any = null;

    /**
     * Initializes the rate limiter based on the adapter capability score and clone status.
     */
    public static initialize(): void {
        const store = useBluetoothStore.getState();
        const score = store.adapterCapabilityScore;
        const isClone = store.isCloneDevice;
        const tier = AdapterProfileRegistry.getTier(score, isClone);

        if (tier === 'TIER_S') {
            this.capacity = 20;
            this.fillRate = 20;
        } else if (tier === 'TIER_A') {
            this.capacity = 12;
            this.fillRate = 12;
        } else {
            this.capacity = 4;
            this.fillRate = 4;
        }

        this.tokens = this.capacity;
        this.lastRefill = Date.now();
        this.queue = [];

        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => {
            this.refill();
            this.processQueue();
        }, 50); // Refill every 50ms for precise timing
    }

    private static refill(): void {
        const now = Date.now();
        const deltaSec = (now - this.lastRefill) / 1000;
        this.lastRefill = now;
        this.tokens = Math.min(this.capacity, this.tokens + this.fillRate * deltaSec);
    }

    /**
     * Acquires a token to send a command. Resolves immediately if a token is available,
     * or queues the request until one becomes available.
     */
    public static async acquireToken(): Promise<void> {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
        }
        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
        });
    }

    private static processQueue(): void {
        while (this.queue.length > 0 && this.tokens >= 1) {
            this.tokens -= 1;
            const resolve = this.queue.shift();
            if (resolve) {
                resolve();
            }
        }
    }

    /**
     * Cleans up timer and empties queues.
     */
    public static cleanup(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.queue = [];
        this.tokens = 20;
    }
}
export default TransportRateLimiter;
