import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDiagnosticEngine } from '../../hooks/useDiagnosticEngine';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { ConnectionState } from '../../api/BluetoothManager.types';

const STRESS_PIDS = ['0C', '0D', '05', '11'];
const STRESS_INTERVAL_MS = 50;

/**
 * Lightweight requestAnimationFrame FPS probe. If the 20Hz microtask polling loop were
 * starving the Hermes thread, the rAF callbacks would arrive late and the reported FPS
 * would collapse. A steady ~60 FPS under active streaming is the proof of non-starvation.
 */
function useFrameRate(): number {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const windowStart = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const tick = (timestamp: number) => {
      if (windowStart.current === 0) {
        windowStart.current = timestamp;
      }
      frames.current += 1;
      const elapsed = timestamp - windowStart.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        windowStart.current = timestamp;
      }
      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return fps;
}

function SensorTile({ label, value, unit, testID }: { label: string; value: number | null; unit: string; testID: string }) {
  return (
    <View style={styles.tile} testID={testID}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} testID={`${testID}-value`}>
        {value === null ? '--' : value}
        <Text style={styles.tileUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

export default function DashboardSandbox(): React.ReactElement {
  const { connectionState, ecuReady, devices, lastError, scan, connect, disconnect, startTelemetry, stopTelemetry } =
    useDiagnosticEngine();

  const rpm = useBluetoothStore((state) => state.rpm);
  const speed = useBluetoothStore((state) => state.speed);
  const coolant = useBluetoothStore((state) => state.coolant);
  const throttle = useBluetoothStore((state) => state.throttle);

  const [scanning, setScanning] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const fps = useFrameRate();

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      await scan();
    } finally {
      setScanning(false);
    }
  }, [scan]);

  const handleConnect = useCallback(async () => {
    const first = devices[0];
    if (first) {
      await connect(first.id);
    }
  }, [connect, devices]);

  const handleStartStress = useCallback(() => {
    startTelemetry(STRESS_PIDS, STRESS_INTERVAL_MS);
    setStreaming(true);
  }, [startTelemetry]);

  const handleStopStress = useCallback(() => {
    stopTelemetry();
    setStreaming(false);
  }, [stopTelemetry]);

  const handleDisconnect = useCallback(async () => {
    handleStopStress();
    await disconnect();
  }, [disconnect, handleStopStress]);

  const fpsHealthy = fps === 0 || fps >= 55;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="dashboard-sandbox">
      <Text style={styles.title}>Diagnostic Engine Sandbox</Text>

      <View style={styles.statusRow}>
        <View style={styles.statusChip} testID="sandbox-connection-state">
          <Text style={styles.statusLabel}>LINK</Text>
          <Text style={styles.statusValue}>{connectionState}</Text>
        </View>
        <View style={styles.statusChip} testID="sandbox-ecu-state">
          <Text style={styles.statusLabel}>ECU</Text>
          <Text style={styles.statusValue}>{ecuReady ? 'READY' : 'INIT'}</Text>
        </View>
        <View style={[styles.statusChip, fpsHealthy ? styles.fpsOk : styles.fpsBad]} testID="sandbox-fps">
          <Text style={styles.statusLabel}>UI FPS</Text>
          <Text style={styles.statusValue}>{fps || '--'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <SensorTile label="RPM" value={rpm} unit="rpm" testID="tile-rpm" />
        <SensorTile label="Speed" value={speed} unit="km/h" testID="tile-speed" />
        <SensorTile label="Coolant" value={coolant} unit="°C" testID="tile-coolant" />
        <SensorTile label="Throttle" value={throttle} unit="%" testID="tile-throttle" />
      </View>

      {lastError ? (
        <Text style={styles.error} testID="sandbox-error">
          {lastError}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.button} onPress={handleScan} disabled={scanning} testID="sandbox-scan-button">
          {scanning ? <ActivityIndicator color="#0B0E11" /> : <Text style={styles.buttonText}>Scan</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, devices.length === 0 && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={devices.length === 0}
          testID="sandbox-connect-button"
        >
          <Text style={styles.buttonText}>Connect ({devices.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!ecuReady || streaming) && styles.buttonDisabled]}
          onPress={handleStartStress}
          disabled={!ecuReady || streaming}
          testID="sandbox-start-stress-button"
        >
          <Text style={styles.buttonText}>Start 20Hz Stress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary, !streaming && styles.buttonDisabled]}
          onPress={handleStopStress}
          disabled={!streaming}
          testID="sandbox-stop-stress-button"
        >
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleDisconnect}
          testID="sandbox-disconnect-button"
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deviceList} testID="sandbox-device-list">
        {devices.map((device) => (
          <View key={device.id} style={styles.deviceRow} testID={`sandbox-device-${device.id}`}>
            <Text style={styles.deviceName}>{device.name || device.id}</Text>
            <Text style={styles.deviceRssi}>{device.rssi !== null ? `${device.rssi} dBm` : '—'}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E11' },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: '#E6F1FF', fontSize: 22, fontWeight: '700', marginBottom: 18 },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statusChip: { flex: 1, backgroundColor: '#141A21', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statusLabel: { color: '#5C6B7A', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  statusValue: { color: '#E6F1FF', fontSize: 16, fontWeight: '600' },
  fpsOk: { borderWidth: 1, borderColor: '#1F9D55' },
  fpsBad: { borderWidth: 1, borderColor: '#D64545' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  tile: { width: '47%', backgroundColor: '#141A21', borderRadius: 14, padding: 16 },
  tileLabel: { color: '#5C6B7A', fontSize: 13, marginBottom: 8 },
  tileValue: { color: '#4FD1C5', fontSize: 30, fontWeight: '700' },
  tileUnit: { color: '#5C6B7A', fontSize: 13, fontWeight: '400' },
  error: { color: '#FF8A80', marginBottom: 14 },
  actions: { gap: 10, marginBottom: 20 },
  button: { backgroundColor: '#4FD1C5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#3A8DDE' },
  buttonDanger: { backgroundColor: '#D64545' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#0B0E11', fontSize: 15, fontWeight: '700' },
  deviceList: { gap: 8 },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#141A21',
    borderRadius: 10,
    padding: 14,
  },
  deviceName: { color: '#E6F1FF', fontSize: 14 },
  deviceRssi: { color: '#5C6B7A', fontSize: 13 },
});
