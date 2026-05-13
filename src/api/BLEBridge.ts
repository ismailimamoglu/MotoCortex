import { BleManager, State } from 'react-native-ble-plx';

/**
 * Native Bridge Singleton for iOS CoreBluetooth / Android BLE.
 * This ensures the BleManager is initialized exactly once at the root.
 */
class BLEBridge {
  private static instance: BleManager | null = null;

  static getInstance(): BleManager {
    if (!this.instance) {
      console.log('[BLEBridge] Initializing Native BLE Manager...');
      this.instance = new BleManager();
    }
    return this.instance;
  }

  /**
   * Directly queries the current hardware state from the bridge.
   */
  static async getHardwareState(): Promise<State> {
    const manager = this.getInstance();
    return await manager.state();
  }
}

export default BLEBridge;
