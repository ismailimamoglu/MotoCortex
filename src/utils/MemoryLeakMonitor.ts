import { useBluetoothStore } from '../store/useBluetoothStore';
import { useTelemetryStore } from '../store/useTelemetryStore';

/**
 * Dev-Mode Memory Leak Monitor for MotoCortex.
 * Tracks state array lengths and warns in __DEV__ if memory footprints grow abnormally.
 */
export class MemoryLeakMonitor {
  private static monitorInterval: NodeJS.Timeout | null = null;

  public static start(intervalMs: number = 30000): void {
    if (!__DEV__ || this.monitorInterval) return;

    console.log('[MemoryLeakMonitor] Started dev memory leak monitor (30s interval)');
    this.monitorInterval = setInterval(() => {
      this.auditMemoryFootprint();
    }, intervalMs);
  }

  public static stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('[MemoryLeakMonitor] Stopped memory leak monitor');
    }
  }

  public static auditMemoryFootprint(): void {
    if (!__DEV__) return;

    try {
      const btState = useBluetoothStore.getState();
      const telemetryState = useTelemetryStore.getState();

      const logsCount = btState.logs.length;
      const diagLogsCount = btState.diagnosticLogs.length;
      const structLogsCount = btState.structuredLogs.length;
      const telemetryQueueCount = telemetryState.telemetry_queue.length;

      console.log(
        `[MemoryLeakMonitor] Audit: Logs=${logsCount}, DiagLogs=${diagLogsCount}, StructLogs=${structLogsCount}, TelemetryQueue=${telemetryQueueCount}`
      );

      if (logsCount > 120) {
        console.warn(`[MemoryLeakMonitor] LEAK WARNING: Bluetooth logs count (${logsCount}) exceeded threshold 120!`);
      }
      if (telemetryQueueCount > 400) {
        console.warn(`[MemoryLeakMonitor] LEAK WARNING: Telemetry queue count (${telemetryQueueCount}) approaching limit 500!`);
      }
    } catch (err) {
      console.warn('[MemoryLeakMonitor] Audit error:', err);
    }
  }
}
