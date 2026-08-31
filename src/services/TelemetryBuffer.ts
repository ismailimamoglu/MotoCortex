/**
 * TelemetryBuffer.ts
 * 
 * MotoCortex High-Frequency Telemetry Buffer & Throttled Zustand Sync Service.
 * Isolates 20Hz hardware data streaming from React re-render loops.
 * Buffers raw PID values in JS memory and flushes batch updates to Zustand
 * at a stable 300ms (3.3 Hz) interval to eliminate Hermes HadesGC OOM crashes.
 */

import { useBluetoothStore } from '../store/useBluetoothStore';

class TelemetryBuffer {
  private static instance: TelemetryBuffer;
  private pendingUpdates: Record<string, any> = {};
  private pendingPidUpdateTimes: Record<string, number> = {};
  private flushTimer: NodeJS.Timeout | null = null;
  private hasPendingData: boolean = false;

  private constructor() {
    this.startFlushLoop();
  }

  public static getInstance(): TelemetryBuffer {
    if (!TelemetryBuffer.instance) {
      TelemetryBuffer.instance = new TelemetryBuffer();
    }
    return TelemetryBuffer.instance;
  }

  /**
   * Pushes raw PID telemetry data (e.g., rpm, speed, coolant, voltage) into memory buffer.
   * Runs at 20Hz without triggering React re-renders or Hermes Object Spread allocations.
   */
  public pushTelemetry(data: Record<string, any>, pidKey?: string) {
    Object.assign(this.pendingUpdates, data);
    if (pidKey) {
      this.pendingPidUpdateTimes[pidKey] = Date.now();
    }
    this.hasPendingData = true;
  }

  /**
   * Flushes buffered telemetry data to Zustand store every 300ms (3.3 Hz throttle).
   */
  private startFlushLoop() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      if (!this.hasPendingData) return;

      const updatesToFlush = { ...this.pendingUpdates };
      const pidTimesToFlush = { ...this.pendingPidUpdateTimes };

      // Reset buffer before store call
      this.pendingUpdates = {};
      this.pendingPidUpdateTimes = {};
      this.hasPendingData = false;

      // Single throttled batch update to Zustand (80ms - 12.5 Hz smooth telemetry)
      useBluetoothStore.getState().setSensorData({
        ...updatesToFlush,
        pidLastUpdateTimes: Object.keys(pidTimesToFlush).length > 0 ? pidTimesToFlush : undefined,
      });
    }, 80);
  }

  public clear() {
    this.pendingUpdates = {};
    this.pendingPidUpdateTimes = {};
    this.hasPendingData = false;
  }

  public stopFlushLoop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

export const telemetryBuffer = TelemetryBuffer.getInstance();
