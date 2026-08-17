// src/api/BLEBridge.ts
// MotoCortex v10.0 - Native BLE Bridge & GATT Service UUID Auto-Discovery Engine

import { BleManager, State, Device, Service, Characteristic } from 'react-native-ble-plx';

export interface GattServiceMapping {
  serviceUuid: string;
  txCharacteristicUuid: string; // Write
  rxCharacteristicUuid: string; // Notify / Read
  vendorName: string;
}

/**
 * Native Bridge Singleton for iOS CoreBluetooth / Android BLE.
 * Handles single BleManager lifecycle and automatic GATT service UUID discovery.
 */
class BLEBridge {
  private static instance: BleManager | null = null;

  // Known Global OBD2 & Diagnostic BLE GATT UUID Profiles
  public static readonly KNOWN_GATT_PROFILES: GattServiceMapping[] = [
    {
      // vLinker MC+ / STN2120 / OBDLink MX+ High Speed BLE
      serviceUuid: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      txCharacteristicUuid: 'bef8d6c9-9721-445e-b6d6-11c9f91c2f6d',
      rxCharacteristicUuid: 'bef8d6c9-9721-445e-b6d6-11c9f91c2f6e',
      vendorName: 'STN2120 / vLinker / OBDLink Pro'
    },
    {
      // Standard HM-10 / iOBD2 / Vgate iCar BLE
      serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
      txCharacteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
      rxCharacteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
      vendorName: 'ELM327 / Vgate / HM-10'
    },
    {
      // UniCarScan UCSI-2000 / UCSI-2100 BLE
      serviceUuid: '0000fff0-0000-1000-8000-00805f9b34fb',
      txCharacteristicUuid: '0000fff1-0000-1000-8000-00805f9b34fb',
      rxCharacteristicUuid: '0000fff2-0000-1000-8000-00805f9b34fb',
      vendorName: 'UniCarScan BMW/VAG VCI'
    },
    {
      // Veepeak OBDCheck BLE+
      serviceUuid: '18f0',
      txCharacteristicUuid: '2af0',
      rxCharacteristicUuid: '2af1',
      vendorName: 'Veepeak OBDCheck BLE+'
    },
    {
      // Nordic UART Service (NUS) — OBDLink MX+, vLinker BLE
      serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      txCharacteristicUuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
      rxCharacteristicUuid: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
      vendorName: 'Nordic UART / OBDLink MX+ BLE'
    },
    {
      // KW903 / Autoscan BLE
      serviceUuid: '0000ff00-0000-1000-8000-00805f9b34fb',
      txCharacteristicUuid: '0000ff01-0000-1000-8000-00805f9b34fb',
      rxCharacteristicUuid: '0000ff02-0000-1000-8000-00805f9b34fb',
      vendorName: 'Konnwei KW903 / Autoscan BLE'
    }
  ];

  static getInstance(): BleManager {
    if (!this.instance) {
      console.log('[BLEBridge] Initializing Native BLE Manager...');
      try {
        this.instance = new BleManager();
      } catch (e) {
        console.warn('[BLEBridge] BleManager native initialization warning (handled):', e);
        this.instance = {
          state: () => Promise.resolve(State.PoweredOn),
          onStateChange: () => ({ remove: () => {} }),
          isDeviceConnected: () => Promise.resolve(false),
          startDeviceScan: () => {},
          stopDeviceScan: () => {},
          connectToDevice: () => Promise.reject(new Error('BLE_UNAVAILABLE')),
          destroy: () => {},
        } as unknown as BleManager;
      }
    }
    return this.instance;
  }

  /**
   * Safely checks if a BLE peripheral is currently connected.
   */
  static async isDeviceConnected(deviceId: string): Promise<boolean> {
    try {
      const manager = this.getInstance();
      if (!manager) return false;
      return await manager.isDeviceConnected(deviceId);
    } catch {
      return false;
    }
  }

  /**
   * Directly queries the current hardware state from the bridge.
   */
  static async getHardwareState(): Promise<State> {
    try {
      const manager = this.getInstance();
      if (!manager) return State.PoweredOn;
      return await manager.state();
    } catch (e) {
      console.warn('[BLEBridge] Unable to query hardware state:', e);
      return State.PoweredOn;
    }
  }

  /**
   * Discovers and resolves the exact TX/RX GATT characteristic UUIDs for any connected BLE dongle.
   */
  static async autoDiscoverGattProfile(device: Device): Promise<GattServiceMapping | null> {
    try {
      console.log(`[BLEBridge] Discovering GATT services for ${device.name || device.id}...`);
      const connectedDevice = await device.discoverAllServicesAndCharacteristics();
      const services: Service[] = await connectedDevice.services();

      for (const service of services) {
        const lowerServiceUuid = service.uuid.toLowerCase();
        
        // Match against known profiles
        const knownMatch = BLEBridge.KNOWN_GATT_PROFILES.find((p) => lowerServiceUuid.includes(p.serviceUuid.toLowerCase()));
        if (knownMatch) {
          console.log(`[BLEBridge] Matched known GATT profile: ${knownMatch.vendorName}`);
          return knownMatch;
        }

        // Dynamic fallback: find a characteristic with isWritableWithResponse / isWritableWithoutResponse and isNotifiable
        const characteristics: Characteristic[] = await service.characteristics();
        let txChar: Characteristic | null = null;
        let rxChar: Characteristic | null = null;

        for (const char of characteristics) {
          if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
            txChar = char;
          }
          if (char.isNotifiable || char.isIndicatable) {
            rxChar = char;
          }
        }

        if (txChar && rxChar) {
          console.log(`[BLEBridge] Dynamic GATT profile resolved: Service ${service.uuid}`);
          return {
            serviceUuid: service.uuid,
            txCharacteristicUuid: txChar.uuid,
            rxCharacteristicUuid: rxChar.uuid,
            vendorName: 'Generic Auto-Discovered BLE VCI'
          };
        }
      }
    } catch (e) {
      console.warn('[BLEBridge] Failed GATT auto-discovery:', e);
    }
    return null;
  }
}

export default BLEBridge;
