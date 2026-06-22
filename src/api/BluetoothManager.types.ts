/**
 * Type surface for the decoupled BluetoothManager engine.
 * These contracts are transport-agnostic so the consuming layer (hooks, stores,
 * telemetry loops) never needs to import the underlying native modules directly.
 */

export enum ConnectionState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  CONNECTING = 'CONNECTING',
  READY = 'READY',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING',
}

export enum BluetoothErrorCode {
  UNSUPPORTED_PLATFORM = 'UNSUPPORTED_PLATFORM',
  ADAPTER_DISABLED = 'ADAPTER_DISABLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  WRITE_FAILED = 'WRITE_FAILED',
  HEARTBEAT_TIMEOUT = 'HEARTBEAT_TIMEOUT',
  SOCKET_CLOSED = 'SOCKET_CLOSED',
  RECONNECT_EXHAUSTED = 'RECONNECT_EXHAUSTED',
}

export interface BluetoothError {
  code: BluetoothErrorCode;
  message: string;
  cause?: unknown;
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  rssi: number | null;
  bonded: boolean;
}

export interface StateChangeEvent {
  previous: ConnectionState;
  current: ConnectionState;
  deviceId: string | null;
  attempt: number;
  timestamp: number;
}

export interface BluetoothManagerConfig {
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  reconnectBaseDelayMs: number;
  reconnectMaxDelayMs: number;
  maxReconnectAttempts: number;
  scanDurationMs: number;
  connectTimeoutMs: number;
  inboundBufferLimit: number;
}

export interface BluetoothEventMap {
  stateChange: StateChangeEvent;
  data: string;
  deviceFound: DiscoveredDevice;
  error: BluetoothError;
  log: string;
}

export type BluetoothEventName = keyof BluetoothEventMap;

export type BluetoothEventListener<E extends BluetoothEventName> = (
  payload: BluetoothEventMap[E]
) => void;

export type Unsubscribe = () => void;

/**
 * Minimal structural contract describing the parts of a
 * react-native-bluetooth-classic device instance that the manager consumes.
 * Declared locally to keep the engine resilient against minor type-surface
 * drift across library versions.
 */
export interface ClassicTransport {
  address: string;
  name: string | null;
  write(data: string, encoding?: string): Promise<boolean>;
  onDataReceived(listener: (event: { data: string }) => void): { remove: () => void };
  disconnect(): Promise<boolean>;
  isConnected(): Promise<boolean>;
  clear(): Promise<boolean>;
}

/**
 * RFCOMM connection strategy. The manager attempts these in order so cheap
 * ELM327 clones that reject the secure channel can still bind through the
 * insecure reflection socket (createRfcommSocket / insecure RFCOMM).
 */
export interface RfcommProfile {
  label: string;
  secureSocket: boolean;
}
