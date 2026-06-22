import bluetoothManager, { BluetoothManager } from './BluetoothManager';
import { ConnectionState, StateChangeEvent, Unsubscribe } from './BluetoothManager.types';
import { CircuitState, ProtocolCircuitBreaker } from '../core/connection/ProtocolCircuitBreaker';
import { TransportRateLimiter } from '../core/transport/TransportRateLimiter';
import { AssembledFrame, BLEMultiFrameAssembler } from '../core/parser/BLEMultiFrameAssembler';

export interface ProtocolEngineConfig {
  rttSampleSize: number;
  rttMultiplier: number;
  timeoutPaddingMs: number;
  timeoutFloorMs: number;
  timeoutCeilingMs: number;
  minCommandSpacingMs: number;
}

export interface EngineResponse {
  command: string;
  raw: string;
  assembled: string;
  isMultiFrame: boolean;
  rttMs: number;
  timeoutMs: number;
}

export interface SendOptions {
  timeoutMs?: number;
}

export interface EngineDiagnostics {
  connectionState: ConnectionState;
  circuitState: CircuitState;
  queueDepth: number;
  rttSamples: number;
  averageRttMs: number;
  nextAdaptiveTimeoutMs: number;
}

interface PendingCommand {
  command: string;
  resolve: (response: EngineResponse) => void;
  reject: (error: Error) => void;
  explicitTimeoutMs?: number;
}

const DEFAULT_CONFIG: ProtocolEngineConfig = {
  rttSampleSize: 20,
  rttMultiplier: 1.5,
  timeoutPaddingMs: 500,
  timeoutFloorMs: 500,
  timeoutCeilingMs: 5000,
  minCommandSpacingMs: 60,
};

/**
 * System 2 — the protocol orchestration layer.
 *
 * Sits on top of the BluetoothManager transport and binds the circuit breaker,
 * rate limiter and multi-frame assembler into a single serialized request/response
 * engine with an adaptive, RTT-driven timeout model.
 */
export class OBD2ProtocolEngine {
  private readonly manager: BluetoothManager;
  private readonly breaker: ProtocolCircuitBreaker;
  private readonly rateLimiter: TransportRateLimiter;
  private readonly assembler: BLEMultiFrameAssembler;
  private readonly config: ProtocolEngineConfig;

  private readonly queue: PendingCommand[] = [];
  private active: PendingCommand | null = null;
  private activeTimer: ReturnType<typeof setTimeout> | null = null;
  private activeDispatchedAt = 0;
  private activeTimeoutMs = 0;

  private readonly rttHistory: number[] = [];
  private connectionState: ConnectionState = ConnectionState.IDLE;

  private started = false;
  private disposed = false;
  private dispatchScheduled = false;
  private readonly unsubscribers: Unsubscribe[] = [];

  constructor(
    manager: BluetoothManager = bluetoothManager,
    breaker: ProtocolCircuitBreaker = new ProtocolCircuitBreaker(),
    rateLimiter?: TransportRateLimiter,
    assembler: BLEMultiFrameAssembler = new BLEMultiFrameAssembler(),
    config: Partial<ProtocolEngineConfig> = {}
  ) {
    this.manager = manager;
    this.breaker = breaker;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rateLimiter = rateLimiter ?? new TransportRateLimiter({ minIntervalMs: this.config.minCommandSpacingMs });
    this.assembler = assembler;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.disposed = false;

    this.unsubscribers.push(this.breaker.attach(this.manager));
    this.unsubscribers.push(this.rateLimiter.attach(this.manager));
    this.unsubscribers.push(this.manager.on('stateChange', this.handleStateChange));
    this.unsubscribers.push(this.manager.on('data', this.handleData));

    this.connectionState = this.manager.getState();
  }

  dispose(): void {
    this.started = false;
    this.disposed = true;
    this.unsubscribers.splice(0, this.unsubscribers.length).forEach((unsubscribe) => unsubscribe());
    this.abortAll(new Error('ENGINE_DISPOSED'));
    this.assembler.reset();
  }

  send(command: string, options: SendOptions = {}): Promise<EngineResponse> {
    if (this.disposed) {
      return Promise.reject(new Error('ENGINE_DISPOSED'));
    }
    return new Promise<EngineResponse>((resolve, reject) => {
      this.queue.push({ command, resolve, reject, explicitTimeoutMs: options.timeoutMs });
      this.scheduleDispatch();
    });
  }

  getDiagnostics(): EngineDiagnostics {
    return {
      connectionState: this.connectionState,
      circuitState: this.breaker.getState(),
      queueDepth: this.queue.length + (this.active ? 1 : 0),
      rttSamples: this.rttHistory.length,
      averageRttMs: this.averageRtt(),
      nextAdaptiveTimeoutMs: this.computeAdaptiveTimeout(),
    };
  }

  private handleStateChange = (event: StateChangeEvent): void => {
    this.connectionState = event.current;
    if (event.current !== ConnectionState.READY) {
      this.assembler.reset();
      this.abortAll(new Error('CONNECTION_NOT_READY'));
    }
  };

  private handleData = (chunk: string): void => {
    const frames = this.assembler.push(chunk);
    if (frames.length === 0 || !this.active) {
      return;
    }
    this.completeActive(frames[0]);
  };

  private scheduleDispatch(): void {
    if (this.dispatchScheduled) return;
    this.dispatchScheduled = true;
    setTimeout(() => {
      this.dispatchScheduled = false;
      void this.dispatch();
    }, 0);
  }

  private async dispatch(): Promise<void> {
    if (this.disposed || this.active || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift() as PendingCommand;
    this.active = item;

    if (!this.breaker.canExecute()) {
      this.active = null;
      item.reject(new Error('CIRCUIT_OPEN'));
      this.scheduleDispatch();
      return;
    }

    try {
      await this.rateLimiter.acquire();
    } catch (error) {
      this.active = null;
      item.reject(this.toError(error, 'RATE_LIMITED'));
      this.scheduleDispatch();
      return;
    }

    if (this.connectionState !== ConnectionState.READY) {
      this.active = null;
      this.breaker.recordFailure();
      item.reject(new Error('CONNECTION_NOT_READY'));
      this.scheduleDispatch();
      return;
    }

    const timeoutMs = item.explicitTimeoutMs ?? this.computeAdaptiveTimeout();
    this.activeTimeoutMs = timeoutMs;
    this.activeDispatchedAt = Date.now();
    this.assembler.reset();

    this.activeTimer = setTimeout(() => this.failActive(new Error('TIMEOUT')), timeoutMs);

    try {
      await this.manager.write(item.command);
    } catch (error) {
      this.failActive(this.toError(error, 'WRITE_FAILED'));
    }
  }

  private completeActive(frame: AssembledFrame): void {
    if (!this.active) return;

    const item = this.active;
    this.clearActiveTimer();
    const rttMs = Date.now() - this.activeDispatchedAt;
    this.recordRtt(rttMs);
    this.breaker.recordSuccess();
    this.active = null;

    item.resolve({
      command: item.command,
      raw: frame.raw,
      assembled: frame.assembled,
      isMultiFrame: frame.isMultiFrame,
      rttMs,
      timeoutMs: this.activeTimeoutMs,
    });

    this.scheduleDispatch();
  }

  private failActive(error: Error): void {
    if (!this.active) return;

    const item = this.active;
    this.clearActiveTimer();
    this.breaker.recordFailure();
    this.active = null;
    item.reject(error);
    this.scheduleDispatch();
  }

  private abortAll(error: Error): void {
    this.clearActiveTimer();
    if (this.active) {
      const item = this.active;
      this.active = null;
      item.reject(error);
    }
    const pending = this.queue.splice(0, this.queue.length);
    pending.forEach((item) => item.reject(error));
    this.rateLimiter.flush();
  }

  private computeAdaptiveTimeout(): number {
    if (this.rttHistory.length === 0) {
      return this.config.timeoutCeilingMs;
    }
    const raw = this.averageRtt() * this.config.rttMultiplier + this.config.timeoutPaddingMs;
    return Math.min(this.config.timeoutCeilingMs, Math.max(this.config.timeoutFloorMs, Math.round(raw)));
  }

  private averageRtt(): number {
    if (this.rttHistory.length === 0) return 0;
    const total = this.rttHistory.reduce((sum, value) => sum + value, 0);
    return total / this.rttHistory.length;
  }

  private recordRtt(rttMs: number): void {
    this.rttHistory.push(rttMs);
    if (this.rttHistory.length > this.config.rttSampleSize) {
      this.rttHistory.shift();
    }
  }

  private clearActiveTimer(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  private toError(error: unknown, fallback: string): Error {
    if (error instanceof Error) return error;
    return new Error(fallback);
  }
}

const obd2ProtocolEngine = new OBD2ProtocolEngine();
export default obd2ProtocolEngine;
