// src/core/transport/__tests__/UsbTransport.test.ts
import UsbTransport from '../UsbTransport';

describe('UsbTransport Wired Diagnostic Layer', () => {
  it('scans attached USB Host diagnostic cables', async () => {
    const devices = await UsbTransport.scanUsbDevices();
    expect(Array.isArray(devices)).toBe(true);
    if (devices.length > 0) {
      expect(devices[0]).toHaveProperty('vendorId');
      expect(devices[0]).toHaveProperty('deviceName');
    }
  });

  it('connects and disconnects USB transport successfully', async () => {
    const mockDevice = { vendorId: 0x0403, productId: 0x6001, baudRate: 115200, deviceName: 'FTDI USB-OBD Cable' };
    const connected = await UsbTransport.connect(mockDevice);
    expect(connected).toBe(true);
    expect(UsbTransport.getIsConnected()).toBe(true);

    await UsbTransport.disconnect();
    expect(UsbTransport.getIsConnected()).toBe(false);
  });
});
