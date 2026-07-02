import { useState, useEffect, useCallback, useRef } from 'react';
import { useBluetooth } from '../../hooks/useBluetooth';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import OBDCommandQueue from '../../api/OBDCommandQueue';

export interface DiscoveredDevice {
  id: string;
  name: string;
}

export const useDiagnosticEngine = () => {
  const {
    status: connectionStatus,
    ecuStatus,
    connect,
    disconnect,
    scanDevices,
    startPolling,
    stopPolling,
  } = useBluetooth();

  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isStressActive, setIsStressActive] = useState(false);

  const stressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Read telemetry values from store
  const rpm = useBluetoothStore((s) => s.rpm);
  const speed = useBluetoothStore((s) => s.speed);
  const coolant = useBluetoothStore((s) => s.coolant);
  const throttle = useBluetoothStore((s) => s.throttle);

  const startScanning = useCallback(async () => {
    setIsScanning(true);
    try {
      const devices = await scanDevices();
      setDiscoveredDevices(
        devices.map((d: any) => ({
          id: d.id,
          name: d.name || '',
        }))
      );
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }, [scanDevices]);

  const startTelemetry = useCallback((pids: string[], intervalMs: number) => {
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
    }
    
    // Stop standard polling first to avoid packet collision
    stopPolling();

    setIsStressActive(true);
    let commandInProgress = false;

    // Use a high-frequency polling loop
    stressIntervalRef.current = setInterval(async () => {
      if (commandInProgress) return; // Prevent overlapping queries
      commandInProgress = true;

      for (const pid of pids) {
        try {
          await OBDCommandQueue.add(`01 ${pid}`, 200);
        } catch (err) {
          // Silent catch to keep the high-frequency loop going
        }
      }
      commandInProgress = false;
    }, intervalMs);
  }, [stopPolling]);

  const stopTelemetry = useCallback(() => {
    if (stressIntervalRef.current) {
      clearInterval(stressIntervalRef.current);
      stressIntervalRef.current = null;
    }
    setIsStressActive(false);
    // Restart standard polling if connected
    if (useBluetoothStore.getState().status === 'connected') {
      startPolling();
    }
  }, [startPolling]);

  const performTeardown = useCallback(async () => {
    stopTelemetry();
    await disconnect();
  }, [stopTelemetry, disconnect]);

  useEffect(() => {
    return () => {
      if (stressIntervalRef.current) {
        clearInterval(stressIntervalRef.current);
      }
    };
  }, []);

  return {
    connectionStatus,
    ecuStatus,
    discoveredDevices,
    isScanning,
    isStressActive,
    startScanning,
    connectDevice: connect,
    disconnectDevice: performTeardown,
    startTelemetry,
    stopTelemetry,
    rpm,
    speed,
    coolant,
    throttle,
  };
};
export default useDiagnosticEngine;
