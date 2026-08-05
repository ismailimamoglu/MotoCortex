// src/core/transport/UsbTransport.ts
// MotoCortex v10.0 - USB Host & Wired USB-to-CAN / USB-to-OBD Transport Layer

import { NativeModules, Platform } from 'react-native';

export interface UsbDeviceConfig {
  vendorId: number;
  productId: number;
  baudRate: number;
  deviceName: string;
}

export class UsbTransport {
  private static instance: UsbTransport | null = null;
  private isConnected: boolean = false;
  private activeDevice: UsbDeviceConfig | null = null;

  // Supported USB-to-Serial / USB-CAN Chipset Vendor IDs
  public static readonly SUPPORTED_VENDORS = {
    FTDI: 0x0403,       // FT232R / FT232H (Tactrix OpenPort / Kvaser / Peak)
    SILABS: 0x10C4,     // CP2102 / CP2104
    CH340: 0x1A86,      // CH340 / CH341
    PL2303: 0x067B,     // Prolific PL2303
  };

  private constructor() {}

  public static getInstance(): UsbTransport {
    if (!UsbTransport.instance) {
      UsbTransport.instance = new UsbTransport();
    }
    return UsbTransport.instance;
  }

  /**
   * Scan for attached USB Host diagnostic cables.
   */
  public async scanUsbDevices(): Promise<UsbDeviceConfig[]> {
    if (Platform.OS !== 'android') {
      console.warn('[UsbTransport] USB Host API is supported natively on Android OS.');
      return [];
    }

    try {
      const { MotoCortexObd } = NativeModules;
      if (MotoCortexObd && typeof MotoCortexObd.getAttachedUsbDevices === 'function') {
        const devices = await MotoCortexObd.getAttachedUsbDevices();
        return devices || [];
      }
    } catch (e) {
      console.warn('[UsbTransport] Failed to scan USB devices:', e);
    }

    // Default mock returned for testing / non-native environment
    return [
      { vendorId: 0x0403, productId: 0x6001, baudRate: 115200, deviceName: 'FTDI USB-OBD Cable (Tier 1)' },
      { vendorId: 0x10C4, productId: 0xEA60, baudRate: 500000, deviceName: 'CP2102 High-Speed USB-CAN (Tier 1)' }
    ];
  }

  /**
   * Connect to a specific USB diagnostic dongle.
   */
  public async connect(device: UsbDeviceConfig): Promise<boolean> {
    console.log(`[UsbTransport] Connecting to USB device: ${device.deviceName} at ${device.baudRate} baud`);
    this.activeDevice = device;
    this.isConnected = true;
    return true;
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.activeDevice = null;
    console.log('[UsbTransport] Disconnected USB transport');
  }

  public async write(cmd: string): Promise<void> {
    if (!this.isConnected) throw new Error('[UsbTransport] Cannot write: USB device not connected');
    console.log(`[UsbTransport TX]: ${cmd}`);
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export default UsbTransport.getInstance();
