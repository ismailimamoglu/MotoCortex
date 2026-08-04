import { Platform, Linking } from 'react-native';
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

class BluetoothServiceIOS implements IBluetoothService {
    connectedDevice: any | null = null; // iOS BLE uses bleConnectedDevice, but we keep this property for compatibility
    bleConnectedDevice: BlePlxDevice | null = null;
    private bleWriteCharacteristic: Characteristic | null = null;
    private bleSubscription: any | null = null;
    private bleDataBuffer: string = '';
    private iosBleBuffer: string = '';
    private isDraining: boolean = false;
    private drainTimeout: any = null;

    private dataListener: DataListener | null = null;
    private disconnectCallback: DisconnectCallback | null = null;
    private connectionMonitorId: ReturnType<typeof setInterval> | null = null;
    private readonly STORAGE_KEY = '@last_connected_device';

    private isManualDisconnect: boolean = false;
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;

    async checkBluetoothState(): Promise<void> {
        const manager = BLEBridge.getInstance();
        const state = await manager.state();
        if (state === State.PoweredOff) throw new BluetoothPermissionError('BLUETOOTH_DISABLED');
        if (state === State.Unauthorized) throw new BluetoothPermissionError('BLUETOOTH_PERMISSION_DENIED');
        if (state === State.Unsupported) throw new BluetoothPermissionError('BLUETOOTH_UNAVAILABLE');
    }

    async waitForEnabled(timeoutMs: number = 3000): Promise<boolean> {
        const manager = BLEBridge.getInstance();
        const currentState = await manager.state();
        if (currentState === State.PoweredOn) return true;
        if (currentState === State.Unsupported) throw new BluetoothPermissionError('BLUETOOTH_UNAVAILABLE');
        if (currentState === State.Unauthorized) throw new BluetoothPermissionError('BLUETOOTH_PERMISSION_DENIED');
        if (currentState === State.PoweredOff) throw new BluetoothPermissionError('BLUETOOTH_DISABLED');

        return new Promise((resolve, reject) => {
            let timer: NodeJS.Timeout | null = null;
            const subscription = manager.onStateChange((state) => {
                if (state === State.PoweredOn) {
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    resolve(true);
                } else if (state === State.Unsupported) {
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    reject(new BluetoothPermissionError('BLUETOOTH_UNAVAILABLE'));
                } else if (state === State.Unauthorized) {
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    reject(new BluetoothPermissionError('BLUETOOTH_PERMISSION_DENIED'));
                } else if (state === State.PoweredOff) {
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    reject(new BluetoothPermissionError('BLUETOOTH_DISABLED'));
                }
            }, true);

            timer = setTimeout(() => {
                subscription.remove();
                reject(new BluetoothPermissionError('BLUETOOTH_TIMEOUT'));
            }, timeoutMs);
        });
    }

    async enableBluetooth(): Promise<boolean> {
        try {
            // iOS does not support programmatic Bluetooth toggle.
            // Try opening system Bluetooth settings directly. We do not use canOpenURL as it always returns
            // false for App-Prefs schemes on iOS 9+ unless explicitly declared in Info.plist.
            await Linking.openURL('App-Prefs:root=Bluetooth');
            return true;
        } catch (e) {
            try {
                await Linking.openURL('App-Prefs:root=General&path=Bluetooth');
                return true;
            } catch (e2) {
                try {
                    await Linking.openSettings();
                    return true;
                } catch (err) {
                    console.error('[Bluetooth iOS] Failed to open Bluetooth Settings:', err);
                    return false;
                }
            }
        }
    }

    async scanDevices(): Promise<any[]> {
        // Event-driven state subscription wait
        await this.waitForEnabled(3000);

        const manager = BLEBridge.getInstance();
        return new Promise((resolve) => {
            const foundMap = new Map<string, any>();
            
            // UI Throttling (Boğma) Zırhı: Saniyede 50 paketi engellemek için geçici bellek
            const lastUpdateMap = new Map<string, number>();

            manager.startDeviceScan(null, null, (error, device) => {
                if (error) return;
                if (device && device.id) {
                    const now = Date.now();
                    const lastUpdate = lastUpdateMap.get(device.id) || 0;
                    
                    // Throttle: Aynı cihaz için saniyede (1000ms) en fazla 1 kez işlem yap
                    if (now - lastUpdate < 1000) return;
                    lastUpdateMap.set(device.id, now);

                    const name = device.name || device.localName || '';
                    // Keskin Nişancı Filtresi (Regex Daraltması)
                    const hasValidName = /(OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER)/i.test(name);
                    const hasValidUUID = device.serviceUUIDs?.some(uuid => 
                        uuid.toLowerCase().includes('ffe0') || uuid.toLowerCase().includes('fff0')
                    );

                    if (hasValidName || hasValidUUID) {
                        // UI Tekilleştirme (Deduplication) ve RSSI güncelleme
                        const existing = foundMap.get(device.id);
                        if (existing) {
                            existing.rssi = device.rssi;
                        } else {
                            foundMap.set(device.id, { 
                                address: device.id, 
                                name: name || 'Bilinmeyen BLE Cihaz',
                                rssi: device.rssi 
                            });
                        }
                    }
                }
            });
            setTimeout(() => {
                manager.stopDeviceScan();
                resolve(Array.from(foundMap.values()));
            }, 3000);
        });
    }

    onDisconnect(callback: DisconnectCallback) {
        this.disconnectCallback = callback;
    }

    async connect(deviceId: string): Promise<boolean> {
        this.isManualDisconnect = false;
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

            // Target custom OBD2 service UUID patterns
            const TARGET_OBD2_SERVICES = [
                '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0 (Carista, Vgate, generic ELM327)
                '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 (standard OBD2 BLE)
                '000018f0-0000-1000-8000-00805f9b34fb', // LELink
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // vLinker
            ];

            // 1. First pass: strict targeting of custom OBD2 service UUIDs
            for (const service of services) {
                const serviceUuid = service.uuid.toLowerCase();
                const isTargetObd2Service = TARGET_OBD2_SERVICES.includes(serviceUuid);

                if (isTargetObd2Service) {
                    const characteristics = await service.characteristics();
                    
                    // Look for unified characteristic first (supports both write and notify/indicate)
                    for (const c of characteristics) {
                        const hasWrite = c.isWritableWithResponse || c.isWritableWithoutResponse;
                        const hasNotify = c.isNotifiable || c.isIndicatable;
                        if (hasWrite && hasNotify) {
                            writeChar = c;
                            notifyChar = c;
                            console.log(`[BLE iOS] Strict Service Binding: Locked to unified characteristic ${c.uuid} in service ${service.uuid}`);
                            break;
                        }
                    }

                    // If no unified characteristic, search for separate write and notify channels in this target service
                    if (!writeChar || !notifyChar) {
                        for (const c of characteristics) {
                            if (!notifyChar && (c.isNotifiable || c.isIndicatable)) {
                                notifyChar = c;
                                console.log(`[BLE iOS] Strict Service Binding: Found notify characteristic ${c.uuid}`);
                            }
                            if (!writeChar && (c.isWritableWithResponse || c.isWritableWithoutResponse)) {
                                writeChar = c;
                                console.log(`[BLE iOS] Strict Service Binding: Found write characteristic ${c.uuid}`);
                            }
                        }
                    }
                }

                // If we successfully locked to both write and notify in a target OBD2 service, stop searching
                if (writeChar && notifyChar) {
                    break;
                }
            }

            // 2. Fallback: If we couldn't find the characteristics inside the target OBD2 service,
            // scan other custom/non-standard services (non-Bluetooth SIG services) to support other clone adapters.
            if (!writeChar || !notifyChar) {
                console.log('[BLE iOS] Target OBD2 service not found, scanning custom services...');
                for (const service of services) {
                    const serviceUuid = service.uuid.toLowerCase();
                    // Skip standard Bluetooth SIG services to avoid hijacking
                    if (
                        serviceUuid.includes('1800') || // Generic Access
                        serviceUuid.includes('1801') || // Generic Attribute
                        serviceUuid.includes('180a') || // Device Information
                        serviceUuid.includes('180f')    // Battery Service
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
                            console.log(`[BLE iOS] Fallback: Locked to unified characteristic ${c.uuid} in service ${service.uuid}`);
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

                    if (writeChar && notifyChar) {
                        break;
                    }
                }
            }

            if (!writeChar) throw new Error('No writable characteristic found');
            this.bleConnectedDevice = device;
            this.bleWriteCharacteristic = writeChar;
            this.bleDataBuffer = '';
            this.iosBleBuffer = '';
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
            console.error('[BLE iOS] Connection Failed:', err);
            return false;
        }
    }

    private processBleChunk(chunk: string) {
        if (this.isDraining) return;
        Logger.log('BLE_READ_CHUNK_RAW', chunk);
        this.iosBleBuffer += chunk;
        while (this.iosBleBuffer.includes('>')) {
            const index = this.iosBleBuffer.indexOf('>');
            const fullResponse = this.iosBleBuffer.substring(0, index + 1);
            this.iosBleBuffer = this.iosBleBuffer.substring(index + 1);
            
            Logger.log('BLE_READ_FULL_RESPONSE', fullResponse);
            if (this.dataListener) {
                this.dataListener(fullResponse);
            }
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
        this.iosBleBuffer = '';
        this.disconnectCallback = null;
    }

    async shutdownCurrentSocket(): Promise<void> {
        await this.disconnect();
    }

    async write(data: string): Promise<void> {
        const cleanCmd = data.replace(/[\r\n]/g, '').trim();
        if (cleanCmd.length > 0) {
            const { assertHardwareGate } = require('../core/security/CommandClassificationRegistry');
            const { useAppStore } = require('../store/useAppStore');
            const { useBluetoothStore } = require('../store/useBluetoothStore');
            const isPro = useAppStore.getState().isPro;
            const btState = useBluetoothStore.getState();
            const isMoving = (btState.speed ?? 0) > 0 || (btState.rpm ?? 0) > 0;
            assertHardwareGate(cleanCmd, isPro, isMoving);
        }

        const command = data.endsWith('\r') ? data : data + '\r';
        if (!this.bleConnectedDevice || !this.bleWriteCharacteristic) throw new Error('Not connected');
        Logger.log('BLE_WRITE', command);
        const b64 = base64Encode(command);
        if (this.bleWriteCharacteristic.isWritableWithoutResponse) await this.bleWriteCharacteristic.writeWithoutResponse(b64);
        else await this.bleWriteCharacteristic.writeWithResponse(b64);
    }

    onDataReceived(listener: DataListener) {
        this.dataListener = listener;
        const { useBluetoothStore } = require('../store/useBluetoothStore');
        useBluetoothStore.getState().addLog(`RX_LISTENER_REGISTERED. Active count: 1`);
    }
    removeListener(listener: DataListener) {
        if (this.dataListener === listener) {
            this.dataListener = null;
            const { useBluetoothStore } = require('../store/useBluetoothStore');
            useBluetoothStore.getState().addLog(`RX_LISTENER_REMOVED. Active count: 0`);
        }
    }
    clearBuffer() {
        this.bleDataBuffer = '';
        this.iosBleBuffer = '';
        this.isDraining = true;
        if (this.drainTimeout) clearTimeout(this.drainTimeout);
        this.drainTimeout = setTimeout(() => {
            this.isDraining = false;
        }, 2000);
    }

    private startConnectionMonitor() {
        this.stopConnectionMonitor();
        this.connectionMonitorId = setInterval(async () => {
            let connected = false;
            try {
                if (this.bleConnectedDevice) {
                    connected = await BLEBridge.getInstance().isDeviceConnected(this.bleConnectedDevice.id);
                }
            } catch (e) {}
            if (!connected && !this.isManualDisconnect) this.handleDroppedConnection();
        }, 3000);
    }

    private stopConnectionMonitor() {
        if (this.connectionMonitorId) { clearInterval(this.connectionMonitorId); this.connectionMonitorId = null; }
    }

    private async handleDroppedConnection() {
        console.warn('[Bluetooth iOS] Connection lost!');
        const lastId = this.bleConnectedDevice?.id;
        this.stopConnectionMonitor();
        if (this.bleSubscription) this.bleSubscription.remove();
        this.bleConnectedDevice = null;
        this.bleWriteCharacteristic = null;

        if (lastId && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            console.log(`[Bluetooth iOS] Attempting auto-reconnect (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
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

export default new BluetoothServiceIOS();
