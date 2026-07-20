import { requireNativeModule, EventEmitter } from 'expo';

const MotoCortexOBDModule = requireNativeModule('MotoCortexOBDModule');
const emitter = new EventEmitter<any>(MotoCortexOBDModule);

export interface TelemetryData {
  rpm: number;
  speed: number;
  coolantTemp: number;
  throttlePos: number;
  voltage: number;
  dtcCodes: string[];
}

export function addConnectionStateListener(listener: (state: string) => void): any {
  return emitter.addListener('onConnectionStateChanged', listener);
}

/**
 * Returns a direct reference to the JSI shared array buffer.
 * Bypasses standard React Native bridge events to prevent memory allocation overhead at 20 Hz.
 */
export function getTelemetrySharedBuffer(): Uint8Array | null {
  if (MotoCortexOBDModule && typeof MotoCortexOBDModule.getTelemetryBuffer === 'function') {
    return MotoCortexOBDModule.getTelemetryBuffer();
  }
  return null;
}

export function connectDevice(type: 'bluetooth' | 'ble' | 'wifi', target: string): Promise<boolean> {
  return MotoCortexOBDModule.connectDeviceAsync(type, target);
}

export function disconnectDevice(): Promise<void> {
  return MotoCortexOBDModule.disconnectDeviceAsync();
}

export function writeCommand(command: string): Promise<string> {
  return MotoCortexOBDModule.writeCommandAsync(command);
}

export function abortPendingCommands(): void {
  if (MotoCortexOBDModule && typeof MotoCortexOBDModule.abortPendingCommands === 'function') {
    MotoCortexOBDModule.abortPendingCommands();
  }
}

export default MotoCortexOBDModule;
