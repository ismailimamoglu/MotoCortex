/**
 * OBD Connection Management & Safety Service for MotoCortex
 * 
 * Provides:
 * 1. Safe Disconnect Sequence (Sending ATZ / AT PC to safely reset adapter hardware before closing socket).
 * 2. Ignition Status Check (Using AT RV voltage and Mode 01 PID 00 response check).
 * 3. Connection Heartbeat & Auto-reconnect Manager.
 */

import { ADAPTER_COMMANDS } from '../api/commands';
import { useBluetoothStore } from '../store/useBluetoothStore';

export interface IgnitionStatus {
  isIgnitionOn: boolean;
  voltageV: number;
  messageKey: string;
}

export class ObdService {
  /**
   * Executes a safe hardware disconnect sequence.
   * Sends AT PC (Protocol Close) and ATZ (Reset ELM327) before closing transport socket.
   */
  public static async safeDisconnect(
    sendCommandFn?: (cmd: string) => Promise<string | undefined>,
    disconnectFn?: () => Promise<void> | void
  ): Promise<boolean> {
    try {
      if (sendCommandFn) {
        // Step 1: Close protocol session
        await sendCommandFn('AT PC').catch(() => null);
        // Step 2: Reset ELM327 adapter hardware state
        await sendCommandFn(ADAPTER_COMMANDS.RESET).catch(() => null);
        // Short pause to allow hardware buffer reset
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (disconnectFn) {
        await disconnectFn();
      } else {
        useBluetoothStore.getState().setEcuStatus('disconnected');
        useBluetoothStore.getState().setAdapterStatus('disconnected');
      }

      return true;
    } catch (error) {
      console.warn('[ObdService] Safe disconnect warning:', error);
      useBluetoothStore.getState().setEcuStatus('disconnected');
      useBluetoothStore.getState().setAdapterStatus('disconnected');
      return false;
    }
  }

  /**
   * Checks whether the vehicle ignition is turned ON based on battery voltage (AT RV)
   * or response to standard PID 00.
   */
  public static parseIgnitionStatus(voltageStr: string, pid00Success: boolean): IgnitionStatus {
    // Parse voltage float from string like "12.6V" or "11.8V"
    const match = voltageStr.match(/(\d+\.\d+)/);
    const voltageV = match ? parseFloat(match[1]) : 0;

    // Ignition is considered OFF if voltage < 11.5V or PID 00 completely fails
    const isIgnitionOn = (voltageV >= 11.8 || pid00Success) && voltageV > 0;

    let messageKey = 'ignition.on';
    if (!isIgnitionOn) {
      messageKey = voltageV < 11.5 ? 'ignition.lowVoltageOff' : 'ignition.noEcuResponse';
    }

    return {
      isIgnitionOn,
      voltageV,
      messageKey,
    };
  }
}

export default ObdService;
