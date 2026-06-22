import {
  ConnectionState,
  ConnectionStateSource,
  StateChangeEvent,
  Unsubscribe,
} from '../../api/BluetoothManager.types';

/**
 * Enforces a minimum dispatch interval between outbound transport writes and keeps
 * its gate strictly synchronised with the connection state machine.
 *
 * While the link is READY the gate is open and paces commands. The instant the
 * BluetoothManager leaves READY (RECONNECTING / ERROR / IDLE), the limiter disables
 * itself and rejects every queued waiter so no command leaks into a dead socket.
 */
export interface RateLimiterConfig {
  minIntervalMs: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = { minIntervalMs: 60 };

export class TransportRateLimiter {
  private minIntervalMs: number;
  private lastReleaseAt = 0;
  private enabled = true;
  private readonly pending = new Map<ReturnType<typeof setTimeout>, (reason: Error) => void>();
  private detachListener: Unsubscribe | null = null;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.minIntervalMs = Math.max(0, { ...DEFAULT_CONFIG, ...config }.minIntervalMs);
  }

  attach(source: ConnectionStateSource): Unsubscribe {
    this.detachInternal();
    this.detachListener = source.on('stateChange', (event: StateChangeEvent) =>
      this.syncState(event.current)
    );
    return () => this.detachInternal();
  }

  setMinInterval(ms: number): void {
    this.minIntervalMs = Math.max(0, ms);
  }

  getMinInterval(): number {
    return this.minIntervalMs;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  acquire(): Promise<void> {
    if (!this.enabled) {
      return Promise.reject(new Error('RATE_LIMITER_DISABLED'));
    }

    const now = Date.now();
    const wait = Math.max(0, this.lastReleaseAt + this.minIntervalMs - now);
    if (wait === 0) {
      this.lastReleaseAt = Date.now();
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(timer);
        if (!this.enabled) {
          reject(new Error('RATE_LIMITER_DISABLED'));
          return;
        }
        this.lastReleaseAt = Date.now();
        resolve();
      }, wait);
      this.pending.set(timer, reject);
    });
  }

  flush(): void {
    this.pending.forEach((reject, timer) => {
      clearTimeout(timer);
      reject(new Error('RATE_LIMITER_FLUSHED'));
    });
    this.pending.clear();
    this.lastReleaseAt = 0;
  }

  detach(): void {
    this.detachInternal();
  }

  private syncState(state: ConnectionState): void {
    if (state === ConnectionState.READY) {
      this.enabled = true;
      this.lastReleaseAt = 0;
      return;
    }
    this.enabled = false;
    this.flush();
  }

  private detachInternal(): void {
    if (this.detachListener) {
      this.detachListener();
      this.detachListener = null;
    }
  }
}

const transportRateLimiter = new TransportRateLimiter();
export default transportRateLimiter;
