import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import bluetoothManager from '../api/BluetoothManager';
import obd2ProtocolEngine, {
  CommandTrack,
  EngineResponse,
} from '../api/OBD2ProtocolEngine';
import {
  ConnectionState,
  DiscoveredDevice,
  StateChangeEvent,
} from '../api/BluetoothManager.types';
import {
  parseCalibrationIdResponse,
  parseDTCResponse,
  parsePIDResponse,
  parseVINResponse,
  parseVoltageResponse,
} from '../core/parser/OBDResponseParser';
import { useBluetoothStore, BluetoothState } from '../store/useBluetoothStore';

export type TelemetryListener = (response: EngineResponse) => void;

export interface DiagnosticEngineApi {
  connectionState: ConnectionState;
  ecuReady: boolean;
  devices: DiscoveredDevice[];
  lastError: string | null;
  scan: () => Promise<DiscoveredDevice[]>;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string, timeoutMs?: number) => Promise<EngineResponse>;
  startTelemetry: (pids: string[], intervalMs?: number, listener?: TelemetryListener) => void;
  stopTelemetry: () => void;
}

type StoreStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

const PID_STORE_KEY: Record<string, keyof BluetoothState> = {
  '0C': 'rpm',
  '0D': 'speed',
  '05': 'coolant',
  '11': 'throttle',
  '49': 'throttle',
  '04': 'engineLoad',
  '0F': 'intakeAirTemp',
  '0B': 'manifoldPressure',
  '46': 'ambientTemp',
  '5C': 'oilTemp',
  '10': 'mafFlow',
  '0E': 'timingAdvance',
  '2F': 'fuelLevel',
  '3C': 'catalystTemp',
  A6: 'odometer',
  '31': 'distanceSinceCleared',
  '21': 'distanceMilOn',
};

const DEFAULT_TELEMETRY_INTERVAL_MS = 50;

let pollingActive = false;
let pollPids: string[] = [];
let pollInterval = DEFAULT_TELEMETRY_INTERVAL_MS;
let externalListener: TelemetryListener | null = null;

function mapConnectionStatus(state: ConnectionState): StoreStatus {
  switch (state) {
    case ConnectionState.SCANNING:
      return 'scanning';
    case ConnectionState.CONNECTING:
    case ConnectionState.RECONNECTING:
      return 'connecting';
    case ConnectionState.READY:
      return 'connected';
    case ConnectionState.ERROR:
      return 'error';
    default:
      return 'disconnected';
  }
}

function applyResponseToStore(response: EngineResponse): void {
  const command = response.command.replace(/\s+/g, '').toUpperCase();
  const store = useBluetoothStore.getState();
  const setSensorData = store.setSensorData;

  if (command === 'ATRV') {
    const voltage = parseVoltageResponse(response.assembled);
    if (voltage) {
      setSensorData({ voltage });
    }
    return;
  }

  if (command === '0902') {
    const vin = parseVINResponse(response.assembled);
    if (vin) {
      setSensorData({ vin });
    }
    return;
  }

  if (command === '0904') {
    const ecuId = parseCalibrationIdResponse(response.assembled);
    if (ecuId) {
      setSensorData({ ecuId });
    }
    return;
  }

  if (command === '03') {
    setSensorData({ dtcs: parseDTCResponse(response.assembled) });
    return;
  }

  if (command.startsWith('01') && command.length >= 4) {
    const pid = command.slice(2, 4);
    const key = PID_STORE_KEY[pid];
    if (!key) return;
    const value = parsePIDResponse(pid, response.assembled);
    if (typeof value === 'number' && Number.isFinite(value)) {
      setSensorData({ [key]: value } as Partial<BluetoothState>);
    }
  }
}

async function runPollCycle(): Promise<void> {
  if (!pollingActive) return;

  for (const pid of pollPids) {
    if (!pollingActive) return;
    try {
      const response = await obd2ProtocolEngine.stream(pid);
      applyResponseToStore(response);
      externalListener?.(response);
    } catch {
      /* coalesced / flushed / circuit-open stream rejections are non-fatal by design */
    }
  }

  if (pollingActive) {
    setTimeout(() => {
      void runPollCycle();
    }, pollInterval);
  }
}

export function useDiagnosticEngine(): DiagnosticEngineApi {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    bluetoothManager.getState()
  );
  const [ecuReady, setEcuReady] = useState(obd2ProtocolEngine.isProtocolReady());
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    obd2ProtocolEngine.start();

    const offState = bluetoothManager.on('stateChange', (event: StateChangeEvent) => {
      setConnectionState(event.current);
      const store = useBluetoothStore.getState();
      store.setStatus(mapConnectionStatus(event.current));
      store.setAdapterStatus(mapConnectionStatus(event.current));
      if (event.current !== ConnectionState.READY) {
        store.setEcuStatus('disconnected');
      }
    });

    const offReady = obd2ProtocolEngine.onProtocolReady((ready) => {
      setEcuReady(ready);
      useBluetoothStore.getState().setEcuStatus(ready ? 'connected' : 'connecting');
    });

    const offDevice = bluetoothManager.on('deviceFound', (device: DiscoveredDevice) => {
      setDevices((current) => {
        const exists = current.some((entry) => entry.id === device.id);
        return exists
          ? current.map((entry) => (entry.id === device.id ? device : entry))
          : [...current, device];
      });
    });

    const offError = bluetoothManager.on('error', (error) => {
      const message = `${error.code}: ${error.message}`;
      setLastError(message);
      useBluetoothStore.getState().setError(message);
    });

    return () => {
      offState();
      offReady();
      offDevice();
      offError();
      pollingActive = false;
      // Release the transport (stops heartbeat, flushes buffers, tears down the socket)
      // before detaching the engine so no listener observes a half-dead connection.
      void bluetoothManager.disconnect();
      obd2ProtocolEngine.destroy();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void bluetoothManager.resume();
      } else if (next === 'background' || next === 'inactive') {
        pollingActive = false;
        void bluetoothManager.pause();
      }
    });
    return () => subscription.remove();
  }, []);

  const scan = useCallback(async () => {
    setDevices([]);
    setLastError(null);
    const found = await bluetoothManager.scan();
    setDevices(found);
    return found;
  }, []);

  const connect = useCallback(async (deviceId: string) => {
    setLastError(null);
    return bluetoothManager.connect(deviceId);
  }, []);

  const disconnect = useCallback(async () => {
    pollingActive = false;
    await bluetoothManager.disconnect();
  }, []);

  const sendCommand = useCallback(async (command: string, timeoutMs?: number) => {
    const response = await obd2ProtocolEngine.send(command, {
      timeoutMs,
      track: CommandTrack.PRIORITY,
    });
    applyResponseToStore(response);
    return response;
  }, []);

  const startTelemetry = useCallback(
    (pids: string[], intervalMs: number = DEFAULT_TELEMETRY_INTERVAL_MS, listener?: TelemetryListener) => {
      pollPids = pids;
      pollInterval = Math.max(0, intervalMs);
      externalListener = listener ?? null;
      if (pollingActive) return;
      pollingActive = true;
      void runPollCycle();
    },
    []
  );

  const stopTelemetry = useCallback(() => {
    pollingActive = false;
  }, []);

  return {
    connectionState,
    ecuReady,
    devices,
    lastError,
    scan,
    connect,
    disconnect,
    sendCommand,
    startTelemetry,
    stopTelemetry,
  };
}
