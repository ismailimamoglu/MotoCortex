import { useEffect, useRef } from 'react';
import { getTelemetrySharedBuffer } from 'motocortex-obd';
import { useBluetoothStore } from '../store/useBluetoothStore';

export interface TelemetryValues {
  rpm: number;
  speed: number;
  coolant: number;
  throttle: number;
  voltage: number;
}

export const useJsiTelemetry = () => {
  const telemetryRef = useRef<TelemetryValues>({
    rpm: 0,
    speed: 0,
    coolant: 0,
    throttle: 0,
    voltage: 0.0
  });

  const connectionStatus = useBluetoothStore(s => s.status);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;

    const sharedBuffer = getTelemetrySharedBuffer();
    if (!sharedBuffer) {
      console.warn('[JSI Telemetry] Shared buffer is not available.');
      return;
    }

    // Direct JSI DataView mapping to prevent allocations inside loop
    const dataView = new DataView(sharedBuffer.buffer, sharedBuffer.byteOffset, sharedBuffer.byteLength);
    let isActive = true;

    const poll = () => {
      if (!isActive) return;

      try {
        // Read in-place mutated byte frames from native Ring Buffer
        const rpm = dataView.getInt32(0, true);
        const speed = dataView.getInt32(4, true);
        const coolant = dataView.getInt32(8, true);
        const throttle = dataView.getInt32(12, true);
        const voltage = dataView.getFloat64(16, true);

        telemetryRef.current = { rpm, speed, coolant, throttle, voltage };
      } catch (err) {
        // Suppress bounds check issues during module warm-up or hot reloading
      }

      requestAnimationFrame(poll);
    };

    poll();

    return () => {
      isActive = false;
    };
  }, [connectionStatus]);

  return telemetryRef;
};
