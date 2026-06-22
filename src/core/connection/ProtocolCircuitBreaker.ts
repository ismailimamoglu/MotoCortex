import {
  ConnectionState,
  ConnectionStateSource,
  StateChangeEvent,
  Unsubscribe,
} from '../../api/BluetoothManager.types';

/**
 * Fail-fast guard around the OBD command path.
 *
 * Lifecycle binding (driven by the BluetoothManager state machine):
 *   - RECONNECTING / ERROR  -> trip() : instantly OPEN, every command short-circuits.
 *   - READY                 -> reset(): counters and history flushed to 0.
 *
 * Independently of the link state it also opens on consecutive command failures and
 * probes recovery through a HALF_OPEN trial window after a cooldown.
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenTrialLimit: number;
  historyLimit: number;
}

export interface CircuitSnapshot {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  openedAt: number | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 4,
  cooldownMs: 3000,
  halfOpenTrialLimit: 1,
  historyLimit: 50,
};

export class ProtocolCircuitBreaker {
  private state = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private failureCount = 0;
  private successCount = 0;
  private openedAt: number | null = null;
  private halfOpenTrials = 0;
  private history: boolean[] = [];
  private readonly config: CircuitBreakerConfig;
  private detachListener: Unsubscribe | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  attach(source: ConnectionStateSource): Unsubscribe {
    this.detachInternal();
    this.detachListener = source.on('stateChange', (event: StateChangeEvent) => {
      if (event.current === ConnectionState.RECONNECTING || event.current === ConnectionState.ERROR) {
        this.trip();
      } else if (event.current === ConnectionState.READY) {
        this.reset();
      }
    });
    return () => this.detachInternal();
  }

  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      if (this.openedAt !== null && Date.now() - this.openedAt >= this.config.cooldownMs) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenTrials = 1;
        return true;
      }
      return false;
    }

    if (this.halfOpenTrials < this.config.halfOpenTrialLimit) {
      this.halfOpenTrials += 1;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.successCount += 1;
    this.consecutiveFailures = 0;
    this.pushHistory(true);
    if (this.state !== CircuitState.CLOSED) {
      this.reset();
    }
  }

  recordFailure(): void {
    this.failureCount += 1;
    this.consecutiveFailures += 1;
    this.pushHistory(false);

    if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
      return;
    }
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.trip();
    }
  }

  trip(): void {
    if (this.state === CircuitState.OPEN) {
      return;
    }
    this.state = CircuitState.OPEN;
    this.openedAt = Date.now();
    this.halfOpenTrials = 0;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = null;
    this.halfOpenTrials = 0;
    this.history = [];
  }

  getState(): CircuitState {
    return this.state;
  }

  snapshot(): CircuitSnapshot {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveFailures: this.consecutiveFailures,
      openedAt: this.openedAt,
    };
  }

  detach(): void {
    this.detachInternal();
  }

  private pushHistory(success: boolean): void {
    this.history.push(success);
    if (this.history.length > this.config.historyLimit) {
      this.history.shift();
    }
  }

  private detachInternal(): void {
    if (this.detachListener) {
      this.detachListener();
      this.detachListener = null;
    }
  }
}

const protocolCircuitBreaker = new ProtocolCircuitBreaker();
export default protocolCircuitBreaker;
