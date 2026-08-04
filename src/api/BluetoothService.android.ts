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
    private isDraining: boolean = false;
    private drainTimeout: any = null;

    private dataSubscription: any | null = null;
    private dataListener: DataListener | null = null;

    // ── WiFi (ELM327 TCP) transport state ──────────────────────────────
    private wifiSocket: any | null = null;
    private wifiDataBuffer: string = '';
    private wifiTarget: string | null = null;
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
        // First: try the direct check multiple times (state might not yet be propagated)
        for (let i = 0; i < 3; i++) {
            try {
                const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
                if (isEnabled) return true;
            } catch (e) {
                // ignore transient errors and retry
            }
            if (i < 2) await new Promise(r => setTimeout(r, 200));
        }
        // Fallback: wait for a state-change event up to timeoutMs
        return new Promise((resolve) => {
            let timer: NodeJS.Timeout;
            let resolved = false;
            const subscription = RNBluetoothClassic.onStateChanged((event) => {
                if (event.enabled && !resolved) {
                    resolved = true;
                    if (timer) clearTimeout(timer);
                    subscription.remove();
                    resolve(true);
                }
            });
            timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    subscription.remove();
                    resolve(false);
                }
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
        // Check Bluetooth state with retry logic
        const isReady = await this.waitForEnabled(5000);
        if (!isReady) throw new BluetoothPermissionError('BLUETOOTH_NOT_POWERED_ON');

        const foundMap = new Map<string, any>();
        const OBD_REGEX = /(OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER)/i;

        // STEP 1: Always get bonded devices first — instant and always works
        try {
            const bonded = await RNBluetoothClassic.getBondedDevices();
            bonded.forEach(device => {
                const name = device.name || '';
                if (OBD_REGEX.test(name)) {
                    foundMap.set(device.address, device);
                }
            });
        } catch (bondedErr) {
            console.warn('[BT Android] getBondedDevices failed:', bondedErr);
        }

        // STEP 2: Attempt active discovery (may fail on some devices/permissions — not fatal)
        try {
            // Race discovery against a 12s hard timeout to prevent UI freezes
            const discovered = await Promise.race([
                RNBluetoothClassic.startDiscovery(),
                new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('DISCOVERY_TIMEOUT')), 12000))
            ]);
            if (Array.isArray(discovered)) {
                discovered.forEach(device => {
                    const name = device.name || '';
                    if (OBD_REGEX.test(name)) {
                        const existing = foundMap.get(device.address);
                        if (existing) {
                            existing.rssi = device.rssi || existing.rssi;
                        } else {
                            foundMap.set(device.address, device);
                        }
                    }
                });
            }
        } catch (discoveryErr) {
            // Discovery failure is non-fatal — bonded devices are still returned
            console.warn('[BT Android] startDiscovery failed (non-fatal):', discoveryErr);
        }

        return Array.from(foundMap.values());
    }

    onDisconnect(callback: DisconnectCallback) {
        this.disconnectCallback = callback;
    }

    async connect(deviceId: string): Promise<boolean> {
        this.isManualDisconnect = false;

        // ── WiFi ELM327 (e.g. "WIFI:192.168.0.10:35000") ───────────────
        // Must be checked BEFORE any Bluetooth Classic API call, since an
        // IP:PORT string is not a valid BT MAC and previously fell through
        // into the RFCOMM pairing fallback (always failing with PAIRING_FAILED).
        if (deviceId.startsWith('WIFI:')) {
            return this.connectWifi(deviceId.substring('WIFI:'.length));
        }

        try {
            await RNBluetoothClassic.cancelDiscovery();
        } catch (e) {
            console.log('[BluetoothService] cancelDiscovery failed/ignored:', e);
        }
        const isBleOrSim = deviceId.includes('BLE') || deviceId.includes('SIM');

        const connectionPromise = (async () => {
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
                    throw new Error('Device not found or not bonded yet');
                }
                
                // Eğer cihaz daha önce bağlı değilse connect çağır (Bu aynı zamanda eşleşme isteği atabilir)
                if (!await device.isConnected()) {
                    const connected = await device.connect({ connectorType: 'rfcomm', DELIMITER: '', charset: 'utf-8' });
                    if (!connected) throw new Error('CONNECTION_FAILED_OR_NOT_BONDED');
                }
                this.connectedDevice = device;
                this.startListening();
                this.reconnectAttempts = 0;
                this.startConnectionMonitor();
                return true;
            } catch (err: any) {
                console.error('Connection Failed:', err);
                
                if (!isBleOrSim) {
                    console.log(`[Bluetooth Android] Connection/Bonding failed, attempting autonomous pairDevice fallback for ${deviceId}`);
                    try {
                        // Eşleşme Şelalesi: Bağlantı başarısızsa otonom pairDevice tetikle.
                        // RNBluetoothClassic kendi içinde PIN diyalogunu otonom olarak (In-App) tetikler.
                        const pairedDevice = await RNBluetoothClassic.pairDevice(deviceId);
                        
                        // Propagation delay guard for OS bluetooth stack sync
                        await new Promise(resolve => setTimeout(resolve, 150));
                        
                        const bonded = await RNBluetoothClassic.getBondedDevices();
                        let device = bonded.find(d => d.address === deviceId);
                        if (!device) {
                            try { device = await RNBluetoothClassic.getConnectedDevice(deviceId); } catch (e) {}
                        }
                        if (!device && pairedDevice) {
                            // Fallback directly to the reference returned by pairDevice
                            device = pairedDevice;
                        }
                        if (!device) throw new Error('DEVICE_NOT_FOUND_AFTER_PAIRING');
                        
                        // Bonding Provisioning and SDP Channel Rehydration Assurance
                        const isDeviceBonded = device.bonded === true || (await RNBluetoothClassic.getBondedDevices()).some(d => d.address === deviceId);
                        if (!isDeviceBonded) {
                            throw new Error('BONDING_PROVISIONING_FAILED_NOT_BONDED');
                        }
                        const sdpChannelsRehydrated = device.address && device.type ? true : false;
                        if (!sdpChannelsRehydrated) {
                            throw new Error('SDP_CHANNELS_NOT_REHYDRATED');
                        }

                        if (!await device.isConnected()) {
                            const connected = await device.connect({ connectorType: 'rfcomm', DELIMITER: '', charset: 'utf-8' });
                            if (!connected) throw new Error('CONNECTION_FAILED_AFTER_PAIRING');
                        }
                        this.connectedDevice = device;
                        this.startListening();
                        this.reconnectAttempts = 0;
                        this.startConnectionMonitor();
                        return true;
                    } catch (pairErr) {
                        console.error('[Bluetooth Android] Autonomous Pairing fallback failed:', pairErr);
                        throw new Error('PAIRING_FAILED');
                    }
                }

                // Try BLE as fallback
                return await this.connectBLE(deviceId);
            }
        })();

        return Promise.race([
            connectionPromise,
            new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 12000)
            )
        ]);
    }

    private async connectWifi(target: string): Promise<boolean> {
        const parts = target.split(':');
        const ip = parts[0] || '192.168.0.10';
        const port = parts[1] ? parseInt(parts[1], 10) : 35000;

        try {
            let TcpSocket: any;
            try {
                TcpSocket = require('react-native-tcp-socket');
            } catch (e) {
                console.error('[BluetoothService Android] react-native-tcp-socket not installed:', e);
                return false;
            }

            this.disconnectWifiSocket();
            this.wifiTarget = `${ip}:${port}`;
            this.wifiDataBuffer = '';

            return await Promise.race([
                new Promise<boolean>((resolve) => {
                    const socket = TcpSocket.createConnection({ port, host: ip, tls: false }, () => {
                        Logger.log('WIFI_CONNECTED', `TCP socket connected to ${ip}:${port}`);
                        this.wifiSocket = socket;
                        this.reconnectAttempts = 0;
                        this.startConnectionMonitor();
                        resolve(true);
                    });

                    socket.on('data', (data: any) => {
                        const chunk = typeof data === 'string' ? data : data.toString('utf8');
                        this.processWifiChunk(chunk);
                    });

                    socket.on('error', (error: any) => {
                        console.error('[BluetoothService Android] WiFi socket error:', error?.message || error);
                        this.disconnectWifiSocket();
                        resolve(false);
                    });

                    socket.on('close', () => {
                        Logger.log('WIFI_CLOSED', 'TCP socket closed');
                        if (!this.isManualDisconnect) this.handleDroppedConnection();
                    });
                }),
                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
            ]);
        } catch (err) {
            console.error('[BluetoothService Android] WiFi connect failed:', err);
            return false;
        }
    }

    private processWifiChunk(chunk: string) {
        if (this.isDraining) return;
        Logger.log('WIFI_READ_CHUNK_RAW', chunk);
        this.wifiDataBuffer += chunk;
        while (this.wifiDataBuffer.includes('>')) {
            const index = this.wifiDataBuffer.indexOf('>');
            const fullResponse = this.wifiDataBuffer.substring(0, index + 1);
            this.wifiDataBuffer = this.wifiDataBuffer.substring(index + 1);
            Logger.log('WIFI_READ_FULL_RESPONSE', fullResponse);
            if (this.dataListener) {
                this.dataListener(fullResponse);
            }
        }
    }

    private disconnectWifiSocket(keepTarget: boolean = false) {
        if (this.wifiSocket) {
            try { this.wifiSocket.destroy(); } catch (e) {}
            this.wifiSocket = null;
        }
        this.wifiDataBuffer = '';
        if (!keepTarget) this.wifiTarget = null;
    }

    private async connectBLE(deviceId: string): Promise<boolean> {
        const manager = BLEBridge.getInstance();
        try {
            manager.stopDeviceScan();
            if (this.bleConnectedDevice) {
                try { await manager.cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
            }
            const device = await manager.connectToDevice(deviceId);
            try {
                Logger.log('BLE_CONNECT', 'Requesting MTU 512...');
                await device.requestMTU(512);
                Logger.log('BLE_CONNECT', 'MTU 512 set successfully.');
            } catch (mtuErr) {
                Logger.log('BLE_CONNECT_ERR', `MTU 512 failed: ${mtuErr}`);
            }
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
        if (this.isDraining) return;
        Logger.log('BLE_READ_CHUNK_RAW', chunk);
        this.bleDataBuffer += chunk;
        while (this.bleDataBuffer.includes('>')) {
            const index = this.bleDataBuffer.indexOf('>');
            const fullResponse = this.bleDataBuffer.substring(0, index + 1);
            this.bleDataBuffer = this.bleDataBuffer.substring(index + 1);
            
            Logger.log('BLE_READ_FULL_RESPONSE', fullResponse);
            if (this.dataListener) {
                this.dataListener(fullResponse);
            }
        }
    }

    async disconnect() {
        this.isManualDisconnect = true;
        this.stopConnectionMonitor();
        if (this.wifiSocket) {
            this.disconnectWifiSocket();
            this.disconnectCallback = null;
            return;
        }
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
        if (this.wifiSocket) {
            Logger.log('WIFI_WRITE', command);
            this.wifiSocket.write(command);
            return;
        }
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
        this.wifiDataBuffer = '';
        this.isDraining = true;
        if (this.drainTimeout) clearTimeout(this.drainTimeout);
        this.drainTimeout = setTimeout(() => {
            this.isDraining = false;
        }, 2000);
    }

    private startListening() {
        if (!this.connectedDevice) return;
        this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
            if (this.isDraining) return;
            Logger.log('BT_READ_CHUNK', event.data);
            if (this.dataListener) {
                this.dataListener(event.data);
            }
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
                if (this.wifiSocket) {
                    connected = true; // liveness tracked via socket 'close'/'error' events
                } else if (this.bleConnectedDevice) {
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
        const lastId = this.wifiTarget ? `WIFI:${this.wifiTarget}` : (this.bleConnectedDevice?.id || this.connectedDevice?.address);
        this.stopConnectionMonitor();
        if (this.bleSubscription) this.bleSubscription.remove();
        this.bleConnectedDevice = null;
        this.stopListening();
        this.connectedDevice = null;
        this.disconnectWifiSocket();

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

    async shutdownCurrentSocket(): Promise<void> {
        await this.disconnect();
    }
}

export default new BluetoothServiceAndroid();
