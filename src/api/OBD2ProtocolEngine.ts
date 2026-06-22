import bluetoothManager, { BluetoothManager } from './BluetoothManager';
import { ConnectionState, StateChangeEvent, Unsubscribe } from './BluetoothManager.types';
import { CircuitState, ProtocolCircuitBreaker } from '../core/connection/ProtocolCircuitBreaker';
import { TransportRateLimiter } from '../core/transport/TransportRateLimiter';
import { AssembledFrame, BLEMultiFrameAssembler } from '../core/parser/BLEMultiFrameAssembler';

export enum CommandTrack {
  PRIORITY = 'PRIORITY',
  STREAM = 'STREAM',
}

export interface ProtocolEngineConfig {
  rttSampleSize: number;
  rttMultiplier: number;
  timeoutPaddingMs: number;
  timeoutFloorMs: number;
  timeoutCeilingMs: number;
  minCommandSpacingMs: number;
  maxStreamQueueDepth: number;
}

export interface EngineResponse {
  command: string;
  raw: string;
  assembled: string;
  isMultiFrame: boolean;
  rttMs: number;
  timeoutMs: number;
  track: CommandTrack;
}

export interface SendOptions {
  timeoutMs?: number;
  track?: CommandTrack;
}

export interface EngineDiagnostics {
  connectionState: ConnectionState;
  circuitState: CircuitState;
  priorityDepth: number;
  streamDepth: number;
  streamPaused: boolean;
  inFlight: string | null;
  rttSamples: number;
  averageRttMs: number;
  nextAdaptiveTimeoutMs: number;
}

interface PendingCommand {
  command: string;
  track: CommandTrack;
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
  maxStreamQueueDepth: 8,
};

/**
 * System 2 — protocol orchestration layer.
 *
 * Sits on top of the BluetoothManager transport and binds the circuit breaker,
 * rate limiter and multi-frame assembler into a single serialized request/response
 * engine with an adaptive, RTT-driven timeout model and a preemptive two-track queue.
 *
 * Wire atomicity invariant: at most one command is ever on the wire (`active`). A new
 * command is dispatched only after the current one resolves, fails or times out, so a
 * priority preemption can never interrupt an in-flight packet mid-stream.
 */
export class OBD2ProtocolEngine {
  private readonly manager: BluetoothManager;
  private readonly breaker: ProtocolCircuitBreaker;
  private readonly rateLimiter: TransportRateLimiter;
  private readonly assembler: BLEMultiFrameAssembler;
  private readonly config: ProtocolEngineConfig;

  private readonly priorityQueue: PendingCommand[] = [];
  private readonly streamQueue: PendingCommand[] = [];
  private streamPaused = false;

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
    this.rateLimiter =
      rateLimiter ?? new TransportRateLimiter({ minIntervalMs: this.config.minCommandSpacingMs });
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

  stop(): void {
    this.destroy();
  }

  destroy(): void {
    this.started = false;
    this.disposed = true;

    this.manager.off('stateChange', this.handleStateChange);
    this.manager.off('data', this.handleData);
    this.breaker.detach();
    this.rateLimiter.detach();
    this.unsubscribers.splice(0, this.unsubscribers.length).forEach((unsubscribe) => unsubscribe());

    this.abortAll(new Error('ENGINE_DISPOSED'));
    this.assembler.clear();
  }

  send(command: string, options: SendOptions = {}): Promise<EngineResponse> {
    const track = options.track ?? CommandTrack.PRIORITY;
    if (this.disposed) {
      return Promise.reject(new Error('ENGINE_DISPOSED'));
    }
    return new Promise<EngineResponse>((resolve, reject) => {
      const item: PendingCommand = {
        command,
        track,
        resolve,
        reject,
        explicitTimeoutMs: options.timeoutMs,
      };
      if (track === CommandTrack.PRIORITY) {
        this.enqueuePriority(item);
      } else {
        this.enqueueStream(item);
      }
      this.scheduleDispatch();
    });
  }

  stream(command: string, options: Omit<SendOptions, 'track'> = {}): Promise<EngineResponse> {
    return this.send(command, { ...options, track: CommandTrack.STREAM });
  }

  getDiagnostics(): EngineDiagnostics {
    return {
      connectionState: this.connectionState,
      circuitState: this.breaker.getState(),
      priorityDepth: this.priorityQueue.length,
      streamDepth: this.streamQueue.length,
      streamPaused: this.streamPaused,
      inFlight: this.active ? this.active.command : null,
      rttSamples: this.rttHistory.length,
      averageRttMs: this.averageRtt(),
      nextAdaptiveTimeoutMs: this.computeAdaptiveTimeout(),
    };
  }

  private enqueuePriority(item: PendingCommand): void {
    this.priorityQueue.push(item);
    this.streamPaused = true;
  }

  private enqueueStream(item: PendingCommand): void {
    if (this.streamQueue.length >= this.config.maxStreamQueueDepth) {
      const stale = this.streamQueue.shift();
      stale?.reject(new Error('STREAM_COALESCED'));
    }
    this.streamQueue.push(item);
  }

  private handleStateChange = (event: StateChangeEvent): void => {
    this.connectionState = event.current;
    if (event.current !== ConnectionState.READY) {
      this.assembler.clear();
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

  private selectNext(): PendingCommand | null {
    if (this.priorityQueue.length > 0) {
      return this.priorityQueue.shift() as PendingCommand;
    }

    if (this.streamPaused) {
      this.flushStreamBacklog();
      this.streamPaused = false;
      return null;
    }

    if (this.streamQueue.length > 0) {
      return this.streamQueue.shift() as PendingCommand;
    }

    return null;
  }

  private async dispatch(): Promise<void> {
    if (this.disposed || this.active) {
      return;
    }

    const item = this.selectNext();
    if (!item) {
      return;
    }
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
    this.assembler.clear();

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
      track: item.track,
    });

    this.scheduleDispatch();
  }

  private failActive(error: Error): void {
    if (!this.active) return;

    const item = this.active;
    this.clearActiveTimer();
    this.assembler.clear();
    this.breaker.recordFailure();
    this.active = null;
    item.reject(error);
    this.scheduleDispatch();
  }

  private flushStreamBacklog(): void {
    if (this.streamQueue.length === 0) return;
    const stale = this.streamQueue.splice(0, this.streamQueue.length);
    stale.forEach((item) => item.reject(new Error('STREAM_FLUSHED')));
  }

  private abortAll(error: Error): void {
    this.clearActiveTimer();
    if (this.active) {
      const item = this.active;
      this.active = null;
      item.reject(error);
    }
    const drained = [
      ...this.priorityQueue.splice(0, this.priorityQueue.length),
      ...this.streamQueue.splice(0, this.streamQueue.length),
    ];
    drained.forEach((item) => item.reject(error));
    this.streamPaused = false;
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
