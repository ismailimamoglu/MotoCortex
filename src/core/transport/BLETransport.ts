import BLEBridge from '../../api/BLEBridge';
import { State, Device as BlePlxDevice, Characteristic } from 'react-native-ble-plx';
import { TransportAdapter } from './TransportAdapter';
import { Mutex } from './Mutex';
import * as Logger from '../../services/Logger';

const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(str: string): string {
    let out = '', i = 0, len = str.length;
    while (i < len) {
        const c1 = str.charCodeAt(i++) & 0xff;
        if (i === len) {
            out += b64chars.charAt(c1 >> 2);
            out += b64chars.charAt((c1 & 3) << 4);
            out += '==';
            break;
        }
        const c2 = str.charCodeAt(i++) & 0xff;
        if (i === len) {
            out += b64chars.charAt(c1 >> 2);
            out += b64chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
            out += b64chars.charAt((c2 & 15) << 2);
            out += '=';
            break;
        }
        const c3 = str.charCodeAt(i++) & 0xff;
        out += b64chars.charAt(c1 >> 2);
        out += b64chars.charAt(((c1 & 3) << 4) | (c2 >> 4));
        out += b64chars.charAt(((c2 & 15) << 2) | (c3 >> 6));
        out += b64chars.charAt(c3 & 63);
    }
    return out;
}

function base64Decode(str: string): string {
    let out = '', i = 0, len = str.length;
    let b1, b2, b3, b4;
    const lookup: { [key: string]: number } = {};
    for (let k = 0; k < b64chars.length; k++) lookup[b64chars.charAt(k)] = k;
    while (i < len) {
        while (i < len && lookup[str.charAt(i)] === undefined) i++;
        if (i >= len) break;
        b1 = lookup[str.charAt(i++)];
        while (i < len && lookup[str.charAt(i)] === undefined) i++;
        if (i >= len) break;
        b2 = lookup[str.charAt(i++)];
        out += String.fromCharCode((b1 << 2) | (b2 >> 4));
        while (i < len && (str.charAt(i) === '=' || lookup[str.charAt(i)] === undefined)) {
            if (str.charAt(i) === '=') return out;
            i++;
        }
        if (i >= len) break;
        b3 = lookup[str.charAt(i++)];
        out += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
        while (i < len && (str.charAt(i) === '=' || lookup[str.charAt(i)] === undefined)) {
            if (str.charAt(i) === '=') return out;
            i++;
        }
        if (i >= len) break;
        b4 = lookup[str.charAt(i++)];
        out += String.fromCharCode(((b3 & 3) << 6) | b4);
    }
    return out;
}

export class BLETransport implements TransportAdapter {
    private bleConnectedDevice: BlePlxDevice | null;
    private bleWriteCharacteristic: Characteristic | null;
    private bleSubscription: any | null;
    private dataCallback: ((data: string) => void) | null;
    private writeLock: Mutex;
    private negotiatedMtu: number;

    constructor() {
        this.bleConnectedDevice = null;
        this.bleWriteCharacteristic = null;
        this.bleSubscription = null;
        this.dataCallback = null;
        this.writeLock = new Mutex();
        this.negotiatedMtu = 185;
    }

    async connect(deviceId: string): Promise<boolean> {
        const manager = BLEBridge.getInstance();
        try {
            manager.stopDeviceScan();
            if (this.bleConnectedDevice) {
                try { await manager.cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
            }
            const device = await manager.connectToDevice(deviceId);
            try {
                Logger.log('BLE_CONNECT', 'Requesting MTU 512...');
                const mtuDevice = await device.requestMTU(512);
                this.negotiatedMtu = mtuDevice?.mtu || 512;
                Logger.log('BLE_CONNECT', `MTU ${this.negotiatedMtu} set successfully.`);
            } catch (mtuErr) {
                this.negotiatedMtu = device?.mtu || 185;
                Logger.log('BLE_CONNECT_ERR', `MTU request fallback to ${this.negotiatedMtu}: ${mtuErr}`);
            }
            await device.discoverAllServicesAndCharacteristics();
            const services = await device.services();
            
            let notifyChar: Characteristic | null = null;
            let writeChar: Characteristic | null = null;

            const TARGET_OBD2_SERVICES = [
                '0000ffe0-0000-1000-8000-00805f9b34fb',
                '0000fff0-0000-1000-8000-00805f9b34fb',
                '000018f0-0000-1000-8000-00805f9b34fb',
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            ];

            for (const service of services) {
                const serviceUuid = service.uuid.toLowerCase();
                const isTargetObd2Service = TARGET_OBD2_SERVICES.includes(serviceUuid);

                if (isTargetObd2Service) {
                    const characteristics = await service.characteristics();
                    for (const c of characteristics) {
                        const hasWrite = c.isWritableWithResponse || c.isWritableWithoutResponse;
                        const hasNotify = c.isNotifiable || c.isIndicatable;
                        if (hasWrite && hasNotify) {
                            writeChar = c;
                            notifyChar = c;
                            break;
                        }
                    }
                    if (!writeChar || !notifyChar) {
                        for (const c of characteristics) {
                            if (!notifyChar && (c.isNotifiable || c.isIndicatable)) {
                                notifyChar = c;
                            }
                            if (!writeChar && (c.isWritableWithResponse || c.isWritableWithoutResponse)) {
                                writeChar = c;
                            }
                        }
                    }
                }
                if (writeChar && notifyChar) break;
            }

            if (!writeChar || !notifyChar) {
                for (const service of services) {
                    const serviceUuid = service.uuid.toLowerCase();
                    if (
                        serviceUuid.includes('1800') ||
                        serviceUuid.includes('1801') ||
                        serviceUuid.includes('180a') ||
                        serviceUuid.includes('180f')
                    ) {
                        continue;
                    }
                    const characteristics = await service.characteristics();
                    for (const c of characteristics) {
                        const hasWrite = c.isWritableWithResponse || c.isWritableWithoutResponse;
                        const hasNotify = c.isNotifiable || c.isIndicatable;
                        if (hasWrite && hasNotify) {
                            writeChar = c;
                            notifyChar = c;
                            break;
                        }
                    }
                    if (!writeChar || !notifyChar) {
                        for (const c of characteristics) {
                            if (!notifyChar && (c.isNotifiable || c.isIndicatable)) {
                                notifyChar = c;
                            }
                            if (!writeChar && (c.isWritableWithResponse || c.isWritableWithoutResponse)) {
                                writeChar = c;
                            }
                        }
                    }
                    if (writeChar && notifyChar) break;
                }
            }

            if (!writeChar) throw new Error('No writable characteristic found');
            this.bleConnectedDevice = device;
            this.bleWriteCharacteristic = writeChar;

            if (notifyChar) {
                this.bleSubscription = device.monitorCharacteristicForService(
                    notifyChar.serviceUUID,
                    notifyChar.uuid,
                    (error, characteristic) => {
                        if (error) return;
                        if (characteristic && characteristic.value) {
                            const chunk = base64Decode(characteristic.value);
                            if (this.dataCallback) {
                                this.dataCallback(chunk);
                            }
                        }
                    }
                );
            }
            return true;
        } catch (err) {
            console.error('[BLETransport] Connection failed:', err);
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.bleSubscription) {
            this.bleSubscription.remove();
            this.bleSubscription = null;
        }
        if (this.bleConnectedDevice) {
            try {
                await BLEBridge.getInstance().cancelDeviceConnection(this.bleConnectedDevice.id);
            } catch (e) {}
            this.bleConnectedDevice = null;
            this.bleWriteCharacteristic = null;
        }
    }

    async write(data: string): Promise<void> {
        const cleanCmd = data.replace(/[\r\n]/g, '').trim();
        if (cleanCmd.length > 0) {
            const { assertHardwareGate } = require('../security/CommandClassificationRegistry');
            const { useAppStore } = require('../../store/useAppStore');
            const { useBluetoothStore } = require('../../store/useBluetoothStore');
            const isPro = useAppStore.getState().isPro;
            const btState = useBluetoothStore.getState();
            const isMoving = (btState.speed ?? 0) > 0 || (btState.rpm ?? 0) > 0;
            assertHardwareGate(cleanCmd, isPro, isMoving);
        }

        const release = await this.writeLock.acquire();
        try {
            if (!this.bleConnectedDevice || !this.bleWriteCharacteristic) {
                throw new Error('BLETransport: Not connected');
            }
            const command = data.endsWith('\r') ? data : data + '\r';
            Logger.log('BLE_WRITE_MUTEX', command);
            const b64 = base64Encode(command);
            if (this.bleWriteCharacteristic.isWritableWithoutResponse) {
                await this.bleWriteCharacteristic.writeWithoutResponse(b64);
            } else {
                await this.bleWriteCharacteristic.writeWithResponse(b64);
            }
        } finally {
            release();
        }
    }

    onDataReceived(callback: (data: string) => void): void {
        this.dataCallback = callback;
    }
}
