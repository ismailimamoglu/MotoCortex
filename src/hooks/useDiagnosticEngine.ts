import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface InitStep {
  command: string;
  timeoutMs: number;
}

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
  startTelemetry: (pids: string[], listener: TelemetryListener, intervalMs?: number) => void;
  stopTelemetry: () => void;
}

const ELM_INIT_SEQUENCE: InitStep[] = [
  { command: 'ATZ', timeoutMs: 2000 },
  { command: 'ATE0', timeoutMs: 1000 },
  { command: 'ATL0', timeoutMs: 1000 },
  { command: 'ATH0', timeoutMs: 1000 },
  { command: 'ATS0', timeoutMs: 1000 },
  { command: 'AT AT1', timeoutMs: 1000 },
  { command: 'AT ST 62', timeoutMs: 1000 },
];

const PROTOCOL_WATERFALL = ['AT SP 0', 'AT SP 6', 'AT SP 7', 'AT SP 3', 'AT SP 5', 'AT SP 4'];

const DEFAULT_TELEMETRY_INTERVAL_MS = 50;

async function runElmHandshake(): Promise<boolean> {
  for (const step of ELM_INIT_SEQUENCE) {
    try {
      await obd2ProtocolEngine.send(step.command, { timeoutMs: step.timeoutMs });
    } catch {
      /* a single missed AT line is tolerated; protocol probe below is authoritative */
    }
  }

  for (const protocol of PROTOCOL_WATERFALL) {
    try {
      await obd2ProtocolEngine.send(protocol, { timeoutMs: 2000 });
      const probe = await obd2ProtocolEngine.send('01 00', { timeoutMs: 8000 });
      const hex = probe.assembled.toUpperCase().replace(/\s+/g, '');
      if (hex.includes('4100')) {
        return true;
      }
    } catch {
      /* advance to the next protocol in the waterfall */
    }
  }

  return false;
}

export function useDiagnosticEngine(): DiagnosticEngineApi {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    bluetoothManager.getState()
  );
  const [ecuReady, setEcuReady] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const handshakeRunningRef = useRef(false);
  const pollingRef = useRef(false);
  const pidsRef = useRef<string[]>([]);
  const telemetryListenerRef = useRef<TelemetryListener | null>(null);
  const telemetryIntervalRef = useRef(DEFAULT_TELEMETRY_INTERVAL_MS);

  const stopTelemetry = useCallback(() => {
    pollingRef.current = false;
  }, []);

  const pollCycle = useCallback(async () => {
    if (!pollingRef.current) return;

    const pids = pidsRef.current;
    for (const pid of pids) {
      if (!pollingRef.current) return;
      try {
        const response = await obd2ProtocolEngine.stream(pid);
        telemetryListenerRef.current?.(response);
      } catch {
        /* stream rejections (coalesced/flushed/circuit-open) are non-fatal by design */
      }
    }

    if (pollingRef.current) {
      setTimeout(() => {
        void pollCycle();
      }, telemetryIntervalRef.current);
    }
  }, []);

  const startTelemetry = useCallback(
    (pids: string[], listener: TelemetryListener, intervalMs: number = DEFAULT_TELEMETRY_INTERVAL_MS) => {
      pidsRef.current = pids;
      telemetryListenerRef.current = listener;
      telemetryIntervalRef.current = Math.max(0, intervalMs);
      if (pollingRef.current) return;
      pollingRef.current = true;
      void pollCycle();
    },
    [pollCycle]
  );

  const initialiseEcu = useCallback(async () => {
    if (handshakeRunningRef.current) return;
    handshakeRunningRef.current = true;
    setEcuReady(false);
    try {
      const ok = await runElmHandshake();
      setEcuReady(ok);
      setLastError(ok ? null : 'ECU_HANDSHAKE_FAILED');
    } catch (error) {
      setEcuReady(false);
      setLastError(error instanceof Error ? error.message : String(error));
    } finally {
      handshakeRunningRef.current = false;
    }
  }, []);

  useEffect(() => {
    obd2ProtocolEngine.start();

    const offState = bluetoothManager.on('stateChange', (event: StateChangeEvent) => {
      setConnectionState(event.current);
      if (event.current === ConnectionState.READY) {
        void initialiseEcu();
      } else {
        setEcuReady(false);
      }
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
      setLastError(`${error.code}: ${error.message}`);
    });

    return () => {
      offState();
      offDevice();
      offError();
      pollingRef.current = false;
      obd2ProtocolEngine.destroy();
    };
  }, [initialiseEcu]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void bluetoothManager.resume();
      } else if (next === 'background' || next === 'inactive') {
        pollingRef.current = false;
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
    pollingRef.current = false;
    await bluetoothManager.disconnect();
  }, []);

  const sendCommand = useCallback((command: string, timeoutMs?: number) => {
    return obd2ProtocolEngine.send(command, { timeoutMs, track: CommandTrack.PRIORITY });
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
