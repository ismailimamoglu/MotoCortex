/**
 * MotoCortex Core - K-Line / Legacy Protocol Keep-Alive Manager
 * 
 * Prevents ISO 9141-2 / ISO 14230 (KWP2000) ECUs from entering bus sleep/idle state
 * during active diagnostic sessions by issuing low-priority, benign tester-present / PID 00 pings.
 */

import OBDCommandQueue from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class KlineKeepAliveManager {
  private static instance: KlineKeepAliveManager;
  private intervalMs: number = 8000; // 8 seconds
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public static getInstance(): KlineKeepAliveManager {
    if (!KlineKeepAliveManager.instance) {
      KlineKeepAliveManager.instance = new KlineKeepAliveManager();
    }
    return KlineKeepAliveManager.instance;
  }

  /**
   * Starts periodic keep-alive if active protocol is K-Line / Legacy
   */
  public start(protocol?: string | null): void {
    if (this.isRunning) return;

    const currentProtocol = (protocol || useBluetoothStore.getState().protocol || '').toUpperCase();
    const isKLine =
      currentProtocol.includes('ISO 9141') ||
      currentProtocol.includes('ISO 14230') ||
      currentProtocol.includes('KWP') ||
      currentProtocol === '3' ||
      currentProtocol === '4' ||
      currentProtocol === '5';

    if (!isKLine) {
      return; // CAN bus protocols do not require aggressive K-Line bus keep-alive
    }

    this.isRunning = true;
    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (!this.isRunning) return;
    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(async () => {
      if (!this.isRunning) return;

      const btState = useBluetoothStore.getState();
      // Only ping if connected and polling is paused (e.g. on diagnostic / static screen)
      if (btState.status === 'connected' && !btState.isPollingActive && !btState.isDiagnosticMode) {
        try {
          // Send low-priority benign ping
          await OBDCommandQueue.add('01 00', 800, 'LOW').catch(() => '');
        } catch {
          // Preempted or failed silently
        }
      }

      this.scheduleNextTick();
    }, this.intervalMs);
  }

  /**
   * Stops keep-alive timer
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Executes a high-priority pre-clear wake up ping before Mode 04 DTC Clear
   */
  public async wakeupBusBeforeClear(): Promise<boolean> {
    try {
      OBDCommandQueue.flushRxBuffer();
      // Send quick wake-up poll
      const wakeRes = await OBDCommandQueue.add('01 00', 1000, 'HIGH_PRIORITY_AD_HOC').catch(() => '');
      return Boolean(wakeRes && !wakeRes.includes('ERROR'));
    } catch {
      return false;
    }
  }
}

export const klineKeepAlive = KlineKeepAliveManager.getInstance();
export default klineKeepAlive;
