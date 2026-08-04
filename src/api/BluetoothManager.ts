import { Platform } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import {
  BluetoothError,
  BluetoothErrorCode,
  BluetoothEventListener,
  BluetoothEventMap,
  BluetoothEventName,
  BluetoothManagerConfig,
  ClassicTransport,
  ConnectionState,
  DiscoveredDevice,
  RfcommProfile,
  StateChangeEvent,
  Unsubscribe,
} from './BluetoothManager.types';

const DEFAULT_CONFIG: BluetoothManagerConfig = {
  heartbeatIntervalMs: 30000,
  heartbeatTimeoutMs: 4000,
  reconnectBaseDelayMs: 1000,
  reconnectMaxDelayMs: 30000,
  maxReconnectAttempts: 8,
  scanDurationMs: 12000,
  connectTimeoutMs: 10000,
  inboundBufferLimit: 8192,
};

const HEARTBEAT_COMMAND = 'AT RV';

const OBD_NAME_REGEX =
  /(OBD|ELM|VLINKER|V-?LINK|VEEPEAK|VIECAR|VGATE|KONNWEI|ICAR|OBDLINK|PANLONG|ZAKVOOP|LELINK|NEXAS|THINKCAR|KW9|MONOFE|CARLY|BIMMER|WIFI327)/i;

const RFCOMM_PROFILES: RfcommProfile[] = [
  { label: 'secure-rfcomm', secureSocket: true },
  { label: 'insecure-reflection-rfcomm', secureSocket: false },
];

const ALLOWED_TRANSITIONS: Record<ConnectionState, ConnectionState[]> = {
  [ConnectionState.IDLE]: [ConnectionState.SCANNING, ConnectionState.CONNECTING],
  [ConnectionState.SCANNING]: [ConnectionState.IDLE, ConnectionState.CONNECTING, ConnectionState.ERROR],
  [ConnectionState.CONNECTING]: [ConnectionState.READY, ConnectionState.ERROR, ConnectionState.RECONNECTING],
  [ConnectionState.READY]: [ConnectionState.RECONNECTING, ConnectionState.IDLE, ConnectionState.ERROR],
  [ConnectionState.RECONNECTING]: [ConnectionState.READY, ConnectionState.ERROR, ConnectionState.IDLE],
  [ConnectionState.ERROR]: [ConnectionState.RECONNECTING, ConnectionState.CONNECTING, ConnectionState.IDLE, ConnectionState.SCANNING],
};

class TypedEventEmitter<M extends object> {
  private registry: { [K in keyof M]?: Array<(payload: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, listener: (payload: M[K]) => void): Unsubscribe {
    const bucket = this.registry[event] ?? [];
    bucket.push(listener);
    this.registry[event] = bucket;
    return () => this.off(event, listener);
  }

  off<K extends keyof M>(event: K, listener: (payload: M[K]) => void): void {
    const bucket = this.registry[event];
    if (!bucket) return;
    this.registry[event] = bucket.filter((entry) => entry !== listener);
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    const bucket = this.registry[event];
    if (!bucket) return;
    bucket.slice().forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        this.emitSafeLog(`Listener for "${String(event)}" threw: ${this.describe(error)}`);
      }
    });
  }

  removeAll(): void {
    this.registry = {};
  }

  private emitSafeLog(message: string): void {
    const logBucket = this.registry['log' as keyof M];
    if (logBucket) {
      logBucket.slice().forEach((listener) => {
        try {
          (listener as (payload: unknown) => void)(message);
        } catch {
          /* swallow secondary failures to keep the emitter loop alive */
        }
      });
    }
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Decoupled, deterministic Bluetooth Classic (SPP) engine for ELM327 adapters.
 *
 * Responsibilities:
 *  - Own a single, well-defined connection state machine.
 *  - Survive cheap Chinese clone adapters by walking secure then insecure RFCOMM.
 *  - Keep the link alive with an active 30s heartbeat and recover via exponential backoff.
 *  - Stream raw transport chunks outward; framing/parsing belongs to the consumer.
 *
 * The engine never re-initialises the ELM327 itself. When the state machine reaches
 * READY (including after a RECONNECTING recovery), the consumer is expected to run its
 * own adapter handshake, which keeps protocol negotiation logic out of the transport.
 */
export class BluetoothManager {
  private readonly emitter = new TypedEventEmitter<BluetoothEventMap>();
  private config: BluetoothManagerConfig;

  private state: ConnectionState = ConnectionState.IDLE;
  private transport: ClassicTransport | null = null;
  private dataSubscription: { remove: () => void } | null = null;
  private globalDisconnectSubscription: { remove: () => void } | null = null;

  private targetDeviceId: string | null = null;
  private isManualDisconnect = false;
  private isTearingDown = false;

  private inboundBuffer = '';
  private lastInboundAt = 0;

  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatWatchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<BluetoothManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bindGlobalDisconnect();
  }

  getState(): ConnectionState {
    return this.state;
  }

  getDeviceId(): string | null {
    return this.targetDeviceId;
  }

  getConfig(): BluetoothManagerConfig {
    return { ...this.config };
  }

  updateConfig(patch: Partial<BluetoothManagerConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  on<E extends BluetoothEventName>(event: E, listener: BluetoothEventListener<E>): Unsubscribe {
    return this.emitter.on(event, listener);
  }

  off<E extends BluetoothEventName>(event: E, listener: BluetoothEventListener<E>): void {
    this.emitter.off(event, listener);
  }

  async scan(): Promise<DiscoveredDevice[]> {
    this.assertAndroid();
    await this.assertAdapterEnabled();

    this.transition(ConnectionState.SCANNING);
    const found = new Map<string, DiscoveredDevice>();

    try {
      const bonded = (await RNBluetoothClassic.getBondedDevices()) as Array<{
        address: string;
        name: string | null;
      }>;
      bonded.forEach((device) => {
        const name = device.name ?? '';
        if (OBD_NAME_REGEX.test(name)) {
          found.set(device.address, { id: device.address, name, rssi: null, bonded: true });
          this.emitter.emit('deviceFound', found.get(device.address)!);
        }
      });
    } catch (error) {
      this.log(`Bonded device lookup failed: ${this.describe(error)}`);
    }

    try {
      const discovered = await this.withTimeout(
        RNBluetoothClassic.startDiscovery() as unknown as Promise<
          Array<{ address: string; name: string | null; rssi?: number }>
        >,
        this.config.scanDurationMs,
        'DISCOVERY_TIMEOUT'
      );
      discovered.forEach((device) => {
        const name = device.name ?? '';
        if (!OBD_NAME_REGEX.test(name)) return;
        const existing = found.get(device.address);
        if (existing) {
          existing.rssi = device.rssi ?? existing.rssi;
        } else {
          const entry: DiscoveredDevice = {
            id: device.address,
            name,
            rssi: device.rssi ?? null,
            bonded: false,
          };
          found.set(device.address, entry);
          this.emitter.emit('deviceFound', entry);
        }
      });
    } catch (error) {
      this.log(`Active discovery skipped: ${this.describe(error)}`);
    } finally {
      try {
        await RNBluetoothClassic.cancelDiscovery();
      } catch {
        /* discovery may already be idle */
      }
    }

    if (this.state === ConnectionState.SCANNING) {
      this.transition(ConnectionState.IDLE);
    }

    return Array.from(found.values());
  }

  async connect(deviceId: string): Promise<boolean> {
    this.assertAndroid();
    this.isManualDisconnect = false;
    this.targetDeviceId = deviceId;
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();

    this.transition(ConnectionState.CONNECTING);
    const opened = await this.openTransport(deviceId);

    if (opened) {
      this.transition(ConnectionState.READY);
      this.startHeartbeat();
      return true;
    }

    this.fail(BluetoothErrorCode.CONNECTION_FAILED, `Unable to open RFCOMM socket to ${deviceId}`);
    this.scheduleReconnect();
    return false;
  }

  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    await this.teardownTransport();
    this.targetDeviceId = null;
    this.reconnectAttempts = 0;
    this.transition(ConnectionState.IDLE);
  }

  async write(command: string): Promise<void> {
    if (!this.transport) {
      this.fail(BluetoothErrorCode.WRITE_FAILED, 'Write attempted with no active transport');
      throw new Error(BluetoothErrorCode.WRITE_FAILED);
    }
    const cleanCmd = command.replace(/[\r\n]/g, '').trim();
    if (cleanCmd.length > 0) {
      const { assertHardwareGate } = require('../core/security/CommandClassificationRegistry');
      const { useAppStore } = require('../store/useAppStore');
      const { useBluetoothStore } = require('../store/useBluetoothStore');
      const isPro = useAppStore.getState().isPro;
      const btState = useBluetoothStore.getState();
      const isMoving = (btState.speed ?? 0) > 0 || (btState.rpm ?? 0) > 0;
      assertHardwareGate(cleanCmd, isPro, isMoving);
    }
    const payload = command.endsWith('\r') ? command : `${command}\r`;
    try {
      await this.transport.write(payload, 'utf-8');
    } catch (error) {
      this.fail(BluetoothErrorCode.WRITE_FAILED, `Write failed for "${command}"`, error);
      throw error instanceof Error ? error : new Error(BluetoothErrorCode.WRITE_FAILED);
    }
  }

  async pause(): Promise<void> {
    this.stopHeartbeat();
    await this.flushTransportBuffers();
  }

  async resume(): Promise<void> {
    if (this.state !== ConnectionState.READY || !this.transport) return;
    await this.flushTransportBuffers();
    let stillConnected = false;
    try {
      stillConnected = await this.transport.isConnected();
    } catch {
      stillConnected = false;
    }
    if (stillConnected) {
      this.startHeartbeat();
    } else {
      this.handleUnexpectedDisconnect(BluetoothErrorCode.SOCKET_CLOSED, 'Transport dead after resume');
    }
  }

  destroy(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    if (this.dataSubscription) {
      this.dataSubscription.remove();
      this.dataSubscription = null;
    }
    if (this.globalDisconnectSubscription) {
      this.globalDisconnectSubscription.remove();
      this.globalDisconnectSubscription = null;
    }
    this.transport = null;
    this.inboundBuffer = '';
    this.emitter.removeAll();
  }

  private async openTransport(deviceId: string): Promise<boolean> {
    await this.teardownTransport();

    for (const profile of RFCOMM_PROFILES) {
      try {
        this.log(`Connecting via ${profile.label} ...`);
        const device = await this.withTimeout(
          RNBluetoothClassic.connectToDevice(deviceId, {
            connectorType: 'rfcomm',
            delimiter: '',
            charset: 'utf-8',
            secureSocket: profile.secureSocket,
          } as unknown as Record<string, unknown>) as unknown as Promise<ClassicTransport>,
          this.config.connectTimeoutMs,
          'CONNECT_TIMEOUT'
        );
        if (device) {
          this.attachTransport(device);
          this.log(`Socket established via ${profile.label}`);
          return true;
        }
      } catch (error) {
        this.log(`${profile.label} attempt failed: ${this.describe(error)}`);
      }
    }

    try {
      this.log('All RFCOMM profiles failed, forcing pairing fallback ...');
      await RNBluetoothClassic.pairDevice(deviceId);
      const device = await this.withTimeout(
        RNBluetoothClassic.connectToDevice(deviceId, {
          connectorType: 'rfcomm',
          delimiter: '',
          charset: 'utf-8',
          secureSocket: false,
        } as unknown as Record<string, unknown>) as unknown as Promise<ClassicTransport>,
        this.config.connectTimeoutMs,
        'CONNECT_TIMEOUT'
      );
      if (device) {
        this.attachTransport(device);
        this.log('Socket established after pairing fallback');
        return true;
      }
    } catch (error) {
      this.log(`Pairing fallback failed: ${this.describe(error)}`);
    }

    return false;
  }

  private attachTransport(device: ClassicTransport): void {
    this.transport = device;
    this.inboundBuffer = '';
    this.lastInboundAt = Date.now();
    this.dataSubscription = device.onDataReceived((event) => this.handleInbound(event.data));
  }

  private handleInbound(chunk: string): void {
    if (!chunk) return;
    this.lastInboundAt = Date.now();
    this.inboundBuffer += chunk;
    if (this.inboundBuffer.length > this.config.inboundBufferLimit) {
      this.inboundBuffer = this.inboundBuffer.slice(-this.config.inboundBufferLimit);
    }
    this.emitter.emit('data', chunk);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.runHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatWatchdog) {
      clearTimeout(this.heartbeatWatchdog);
      this.heartbeatWatchdog = null;
    }
  }

  private async runHeartbeat(): Promise<void> {
    if (this.state !== ConnectionState.READY || !this.transport) return;

    const inboundBeforePing = this.lastInboundAt;
    try {
      await this.write(HEARTBEAT_COMMAND);
    } catch {
      this.handleUnexpectedDisconnect(BluetoothErrorCode.HEARTBEAT_TIMEOUT, 'Heartbeat write failed');
      return;
    }

    if (this.heartbeatWatchdog) {
      clearTimeout(this.heartbeatWatchdog);
    }
    this.heartbeatWatchdog = setTimeout(() => {
      if (this.lastInboundAt <= inboundBeforePing) {
        this.handleUnexpectedDisconnect(
          BluetoothErrorCode.HEARTBEAT_TIMEOUT,
          'No transport response within heartbeat window'
        );
      }
    }, this.config.heartbeatTimeoutMs);
  }

  private handleUnexpectedDisconnect(code: BluetoothErrorCode, message: string): void {
    if (this.isManualDisconnect || this.isTearingDown) return;
    this.emitError(code, message);
    this.stopHeartbeat();
    void this.teardownTransport().then(() => this.scheduleReconnect());
  }

  private scheduleReconnect(): void {
    if (this.isManualDisconnect || !this.targetDeviceId) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.fail(
        BluetoothErrorCode.RECONNECT_EXHAUSTED,
        `Reconnect abandoned after ${this.reconnectAttempts} attempts`
      );
      this.reconnectAttempts = 0;
      return;
    }

    this.transition(ConnectionState.RECONNECTING);
    const delay = Math.min(
      this.config.reconnectBaseDelayMs * 2 ** this.reconnectAttempts,
      this.config.reconnectMaxDelayMs
    );
    this.reconnectAttempts += 1;
    this.log(`Reconnect attempt ${this.reconnectAttempts} scheduled in ${delay}ms`);

    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      void this.attemptReconnect();
    }, delay);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isManualDisconnect || !this.targetDeviceId) return;

    const opened = await this.openTransport(this.targetDeviceId);
    if (opened) {
      this.reconnectAttempts = 0;
      this.transition(ConnectionState.READY);
      this.startHeartbeat();
      return;
    }
    this.scheduleReconnect();
  }

  private async teardownTransport(): Promise<void> {
    this.isTearingDown = true;
    try {
      if (this.heartbeatWatchdog) {
        clearTimeout(this.heartbeatWatchdog);
        this.heartbeatWatchdog = null;
      }
      await this.flushTransportBuffers();
      if (this.dataSubscription) {
        this.dataSubscription.remove();
        this.dataSubscription = null;
      }
      if (this.transport) {
        try {
          await this.transport.disconnect();
        } catch {
          /* socket may already be closed by the OS */
        }
        this.transport = null;
      }
    } finally {
      this.isTearingDown = false;
    }
  }

  private async flushTransportBuffers(): Promise<void> {
    this.inboundBuffer = '';
    if (!this.transport) return;
    try {
      await this.transport.clear();
    } catch {
      /* clearing is best-effort; absence must never block teardown */
    }
  }

  private bindGlobalDisconnect(): void {
    if (Platform.OS !== 'android') return;
    try {
      const subscription = RNBluetoothClassic.onDeviceDisconnected(() => {
        this.handleUnexpectedDisconnect(BluetoothErrorCode.SOCKET_CLOSED, 'OS reported device disconnect');
      });
      this.globalDisconnectSubscription = subscription as unknown as { remove: () => void };
    } catch (error) {
      this.log(`Global disconnect listener registration failed: ${this.describe(error)}`);
    }
  }

  private transition(next: ConnectionState): void {
    if (this.state === next) return;
    const allowed = ALLOWED_TRANSITIONS[this.state] ?? [];
    if (!allowed.includes(next)) {
      this.log(`Illegal transition blocked: ${this.state} -> ${next}`);
      return;
    }
    const event: StateChangeEvent = {
      previous: this.state,
      current: next,
      deviceId: this.targetDeviceId,
      attempt: this.reconnectAttempts,
      timestamp: Date.now(),
    };
    this.state = next;
    this.emitter.emit('stateChange', event);
  }

  private fail(code: BluetoothErrorCode, message: string, cause?: unknown): void {
    this.emitError(code, message, cause);
    this.transition(ConnectionState.ERROR);
  }

  private emitError(code: BluetoothErrorCode, message: string, cause?: unknown): void {
    const error: BluetoothError = { code, message, cause };
    this.emitter.emit('error', error);
    this.log(`ERROR[${code}] ${message}`);
  }

  private assertAndroid(): void {
    if (Platform.OS !== 'android') {
      const error: BluetoothError = {
        code: BluetoothErrorCode.UNSUPPORTED_PLATFORM,
        message: 'BluetoothManager classic core executes on Android only',
      };
      this.emitter.emit('error', error);
      throw new Error(BluetoothErrorCode.UNSUPPORTED_PLATFORM);
    }
  }

  private async assertAdapterEnabled(): Promise<void> {
    try {
      const available = await RNBluetoothClassic.isBluetoothAvailable();
      if (!available) {
        this.fail(BluetoothErrorCode.ADAPTER_DISABLED, 'Bluetooth hardware unavailable');
        throw new Error(BluetoothErrorCode.ADAPTER_DISABLED);
      }
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        this.fail(BluetoothErrorCode.ADAPTER_DISABLED, 'Bluetooth adapter is switched off');
        throw new Error(BluetoothErrorCode.ADAPTER_DISABLED);
      }
    } catch (error) {
      if (error instanceof Error && error.message === BluetoothErrorCode.ADAPTER_DISABLED) {
        throw error;
      }
      this.fail(BluetoothErrorCode.PERMISSION_DENIED, 'Adapter state query rejected', error);
      throw new Error(BluetoothErrorCode.PERMISSION_DENIED);
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error(label)), ms);
      }),
    ]);
  }

  private log(message: string): void {
    this.emitter.emit('log', message);
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

const bluetoothManager = new BluetoothManager();
export default bluetoothManager;
