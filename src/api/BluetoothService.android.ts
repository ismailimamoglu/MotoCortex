import { Platform, Linking } from 'react-native';
import RNBluetoothClassic, {
    BluetoothDevice
} from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BLEBridge from './BLEBridge';
import { State, Device as BlePlxDevice, Characteristic } from 'react-native-ble-plx';
import {
    IBluetoothService,
    BluetoothPermissionError,
    DataListener,
    DisconnectCallback
} from './IBluetoothService';
import * as Logger from '../services/Logger';


// Re-export the error for backwards compatibility with existing imports
export { BluetoothPermissionError };

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

class BluetoothServiceAndroid implements IBluetoothService {
    connectedDevice: BluetoothDevice | null = null;
    bleConnectedDevice: BlePlxDevice | null = null;
    private bleWriteCharacteristic: Characteristic | null = null;
    private bleSubscription: any | null = null;
    private bleDataBuffer: string = '';

    private dataSubscription: any | null = null;
    private listeners: DataListener[] = [];
    private disconnectCallback: DisconnectCallback | null = null;
    private connectionMonitorId: ReturnType<typeof setInterval> | null = null;
    private readonly STORAGE_KEY = '@last_connected_device';

    private isManualDisconnect: boolean = false;
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;

    async checkBluetoothState(): Promise<void> {
        try {
            const available = await RNBluetoothClassic.isBluetoothAvailable();
            if (!available) throw new BluetoothPermissionError('BLUETOOTH_UNAVAILABLE');
            const enabled = await RNBluetoothClassic.isBluetoothEnabled();
            if (!enabled) throw new BluetoothPermissionError('BLUETOOTH_DISABLED');
        } catch (err) {
            if (err instanceof BluetoothPermissionError) throw err;
            throw new BluetoothPermissionError('BLUETOOTH_PERMISSION_DENIED');
        }
    }

    async waitForEnabled(timeoutMs: number = 5000): Promise<boolean> {
        const isCurrentlyEnabled = await RNBluetoothClassic.isBluetoothEnabled();
        if (isCurrentlyEnabled) return true;
        return new Promise((resolve) => {
            let timer: NodeJS.Timeout;
            const subscription = RNBluetoothClassic.onStateChanged((event) => {
                if (event.enabled) {
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    resolve(true);
                }
            });
            timer = setTimeout(() => {
                subscription.remove();
                resolve(false);
            }, timeoutMs);
        });
    }

    async enableBluetooth(): Promise<boolean> {
        try {
            return await RNBluetoothClassic.requestBluetoothEnabled();
        } catch (e) {
            console.error('[Bluetooth Android] requestBluetoothEnabled failed:', e);
            try {
                // Fallback to opening Bluetooth system settings
                await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
                return true;
            } catch (intentErr) {
                try {
                    await Linking.openSettings();
                    return true;
                } catch (settingsErr) {
                    console.error('[Bluetooth Android] Failed to open Settings:', settingsErr);
                    return false;
                }
            }
        }
    }

    async scanDevices(): Promise<any[]> {
        // Under Android, we check if Bluetooth classic is enabled, and scan classic.
        // We could also scan BLE if needed, but classic is primary on Android.
        const isReady = await this.waitForEnabled(3000);
        if (!isReady) throw new BluetoothPermissionError('BLUETOOTH_NOT_POWERED_ON');
        try {
            const discovered = await RNBluetoothClassic.startDiscovery();
            const bonded = await RNBluetoothClassic.getBondedDevices();
            const allDevices = [...discovered, ...bonded];
            return Array.from(new Map(allDevices.map(d => [d.address, d])).values());
        } catch (err) {
            try { return await RNBluetoothClassic.getBondedDevices(); }
            catch (fallbackErr) { throw new Error(`SCAN_FAILED: ${err}`); }
        }
    }

    onDisconnect(callback: DisconnectCallback) {
        this.disconnectCallback = callback;
    }

    async connect(deviceId: string): Promise<boolean> {
        this.isManualDisconnect = false;
        
        const isBleOrSim = deviceId.includes('BLE') || deviceId.includes('SIM');
        if (!isBleOrSim) {
            try {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                const isBonded = bonded.some(d => d.address === deviceId);
                if (!isBonded) {
                    console.log(`[Bluetooth Android] Device ${deviceId} is not bonded. Launching Bluetooth settings intent.`);
                    try {
                        await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
                    } catch (intentErr) {
                        try { await Linking.openSettings(); } catch (e) {}
                    }
                    throw new Error('DEVICE_NOT_PAIRED');
                }
            } catch (err: any) {
                if (err?.message === 'DEVICE_NOT_PAIRED') throw err;
                console.warn('[Bluetooth Android] Failed to check bonded status before connecting:', err);
            }
        }

        try {
            let device: BluetoothDevice | undefined;
            try { device = await RNBluetoothClassic.getConnectedDevice(deviceId); } catch (e) {}
            if (!device) {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                device = bonded.find(d => d.address === deviceId);
            }
            if (!device) {
                if (isBleOrSim) {
                    return await this.connectBLE(deviceId);
                }
                throw new Error('Device not found');
            }
            if (!await device.isConnected()) {
                const connected = await device.connect({ connectorType: 'rfcomm', DELIMITER: '', charset: 'utf-8' });
                if (!connected) return false;
            }
            this.connectedDevice = device;
            this.startListening();
            this.reconnectAttempts = 0;
            this.startConnectionMonitor();
            return true;
        } catch (err: any) {
            console.error('Connection Failed:', err);
            if (err?.message === 'DEVICE_NOT_PAIRED') throw err;

            if (!isBleOrSim) {
                try {
                    const bonded = await RNBluetoothClassic.getBondedDevices();
                    const isBonded = bonded.some(d => d.address === deviceId);
                    if (!isBonded) {
                        try {
                            await Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
                        } catch (intentErr) {
                            try { await Linking.openSettings(); } catch (e) {}
                        }
                        throw new Error('DEVICE_NOT_PAIRED');
                    }
                } catch (bondedErr: any) {
                    if (bondedErr?.message === 'DEVICE_NOT_PAIRED') throw bondedErr;
                }
            }

            // Try BLE as fallback
            return await this.connectBLE(deviceId);
        }
    }

    private async connectBLE(deviceId: string): Promise<boolean> {
        const manager = BLEBridge.getInstance();
        try {
            manager.stopDeviceScan();
            if (this.bleConnectedDevice) {
                try { await manager.cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
            }
            const device = await manager.connectToDevice(deviceId);
            await device.discoverAllServicesAndCharacteristics();
            const services = await device.services();
            let notifyChar: Characteristic | null = null;
            let writeChar: Characteristic | null = null;
            for (const service of services) {
                const characteristics = await service.characteristics();
                for (const c of characteristics) {
                    if (c.isNotifiable || c.isIndicatable) notifyChar = c;
                    if (c.isWritableWithResponse || c.isWritableWithoutResponse) writeChar = c;
                }
            }
            if (!writeChar) throw new Error('No writable characteristic found');
            this.bleConnectedDevice = device;
            this.bleWriteCharacteristic = writeChar;
            this.bleDataBuffer = '';
            if (notifyChar) {
                this.bleSubscription = device.monitorCharacteristicForService(
                    notifyChar.serviceUUID,
                    notifyChar.uuid,
                    (error, characteristic) => {
                        if (error) return;
                        if (characteristic && characteristic.value) {
                            const chunk = base64Decode(characteristic.value);
                            this.processBleChunk(chunk);
                        }
                    }
                );
            }
            this.reconnectAttempts = 0;
            this.startConnectionMonitor();
            return true;
        } catch (err) {
            console.error('[BLE Android] Connection Failed:', err);
            return false;
        }
    }

    private processBleChunk(chunk: string) {
        Logger.log('BLE_READ_CHUNK', chunk);
        this.bleDataBuffer += chunk;
        if (this.bleDataBuffer.includes('\r') || this.bleDataBuffer.includes('>')) {
            const lines = this.bleDataBuffer.split(/[\r>]/);
            this.bleDataBuffer = lines.pop() || '';
            lines.forEach(line => {
                if (line.trim()) this.listeners.forEach(l => l(line.trim()));
            });
        }
    }

    async disconnect() {
        this.isManualDisconnect = true;
        this.stopConnectionMonitor();
        if (this.bleSubscription) { this.bleSubscription.remove(); this.bleSubscription = null; }
        if (this.bleConnectedDevice) {
            try { await BLEBridge.getInstance().cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
            this.bleConnectedDevice = null;
            this.bleWriteCharacteristic = null;
        }
        this.stopListening();
        if (this.connectedDevice) {
            try { await this.connectedDevice.disconnect(); } catch (e) {}
            this.connectedDevice = null;
        }
        this.disconnectCallback = null;
    }

    async write(data: string): Promise<void> {
        const command = data.endsWith('\r') ? data : data + '\r';
        if (this.bleConnectedDevice && this.bleWriteCharacteristic) {
            Logger.log('BLE_WRITE', command);
            const b64 = base64Encode(command);
            if (this.bleWriteCharacteristic.isWritableWithoutResponse) await this.bleWriteCharacteristic.writeWithoutResponse(b64);
            else await this.bleWriteCharacteristic.writeWithResponse(b64);
            return;
        }
        if (!this.connectedDevice) throw new Error('Not connected');
        Logger.log('BT_WRITE', command);
        await this.connectedDevice.write(command);
    }

    onDataReceived(listener: DataListener) { this.listeners.push(listener); }
    removeListener(listener: DataListener) { this.listeners = this.listeners.filter(l => l !== listener); }

    private startListening() {
        if (!this.connectedDevice) return;
        this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
            Logger.log('BT_READ_CHUNK', event.data);
            this.listeners.forEach(l => l(event.data));
        });
    }

    private stopListening() {
        if (this.dataSubscription) { this.dataSubscription.remove(); this.dataSubscription = null; }
    }

    private startConnectionMonitor() {
        this.stopConnectionMonitor();
        this.connectionMonitorId = setInterval(async () => {
            let connected = false;
            try {
                if (this.bleConnectedDevice) {
                    connected = await BLEBridge.getInstance().isDeviceConnected(this.bleConnectedDevice.id);
                } else if (this.connectedDevice) {
                    connected = await this.connectedDevice.isConnected();
                }
            } catch (e) {}
            if (!connected && !this.isManualDisconnect) this.handleDroppedConnection();
        }, 3000);
    }

    private stopConnectionMonitor() {
        if (this.connectionMonitorId) { clearInterval(this.connectionMonitorId); this.connectionMonitorId = null; }
    }

    private async handleDroppedConnection() {
        console.warn('[Bluetooth Android] Connection lost!');
        const lastId = this.bleConnectedDevice?.id || this.connectedDevice?.address;
        this.stopConnectionMonitor();
        if (this.bleSubscription) this.bleSubscription.remove();
        this.bleConnectedDevice = null;
        this.stopListening();
        this.connectedDevice = null;

        if (lastId && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`[Bluetooth Android] Attempting auto-reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
            const success = await this.connect(lastId);
            if (success) return;
        }

        if (this.disconnectCallback) {
            this.disconnectCallback();
            this.disconnectCallback = null;
        }
    }

    async saveLastDevice(deviceId: string, deviceName: string) {
        try {
            const data = JSON.stringify({ id: deviceId, name: deviceName });
            await AsyncStorage.setItem(this.STORAGE_KEY, data);
        } catch (e) {}
    }

    async getLastDevice(): Promise<{ id: string, name: string } | null> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }
}

export default new BluetoothServiceAndroid();
