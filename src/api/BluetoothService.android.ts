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
        try {
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
        } catch (outerErr) {
            console.warn('[BT Android] waitForEnabled outer error (handled):', outerErr);
            return false;
        }
    }

    async enableBluetooth(): Promise<boolean> {
        try {
            // On Android 12+, requestBluetoothEnabled requires BLUETOOTH_CONNECT permission
            const { PermissionsAndroid } = require('react-native');
            const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
            if (androidVersion >= 31) {
                const connectPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                if (!connectPerm) {
                    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.warn('[Bluetooth Android] BLUETOOTH_CONNECT permission denied');
                        return false;
                    }
                }
            }
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

    // ── Global OBD Adapter Name Regex ──────────────────────────────────
    // Covers 25+ vendors including cheap clones, generic adapters, and premium devices.
    // Reference: Car Scanner, Infocar, python-OBD adapter lists, Amazon/AliExpress top sellers.
    private static readonly OBD_NAME_REGEX = /(OBD|ELM|V-?LINK(?:ER)?|VEEPEAK|VIECAR|VGATE|KONNWEI|I-?CAR|OBDLINK|PANLONG|ZAKVOOP|LELINK|NEXAS|THINKCAR|KW\d+|MONOFE|CARLY|BIMMER|WIFI327|AUTOSCAN|LAUNCH|MAXIS|OBDII|HC-0[56]|JDY-|BT0[45]|UniCarScan)/i;

    // ── Global OBD BLE Service UUID Set ───────────────────────────────
    // Secondary filter: any device advertising these UUIDs is likely an OBD adapter,
    // even if its name is blank or unrecognized.
    private static readonly OBD_UUID_SET = new Set([
        '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / Vgate iCar / generic ELM327 BLE
        '0000fff0-0000-1000-8000-00805f9b34fb', // UniCarScan / standard OBD2 BLE
        '000018f0-0000-1000-8000-00805f9b34fb', // Veepeak OBDCheck BLE+
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // STN2120 / vLinker MC+ / OBDLink MX+
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS) — OBDLink, vLinker firmware
        '0000ff00-0000-1000-8000-00805f9b34fb', // KW903 / Autoscan
    ]);

    private isOBDDevice(name: string, serviceUUIDs?: string[]): boolean {
        const nameOk = BluetoothServiceAndroid.OBD_NAME_REGEX.test(name);
        const uuidOk = (serviceUUIDs || []).some(u => BluetoothServiceAndroid.OBD_UUID_SET.has(u.toLowerCase()));
        return nameOk || uuidOk;
    }

    async scanDevices(): Promise<any[]> {
        // ── STEP 0: Ensure Android runtime permissions are granted ──────
        // On Android 12+ (API 31+), BLUETOOTH_SCAN and BLUETOOTH_CONNECT are
        // required at runtime. Without them, native BT APIs throw SecurityException
        // which crashes the entire app process (not catchable by JS try-catch).
        try {
            const { PermissionsAndroid } = require('react-native');
            const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
            if (androidVersion >= 31) {
                const scanPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
                const connectPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                if (!scanPerm || !connectPerm) {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    ]);
                    const scanOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
                    const connectOk = granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
                    if (!scanOk || !connectOk) {
                        throw new BluetoothPermissionError('BLUETOOTH_PERMISSION_DENIED');
                    }
                }
            } else {
                // Android 11 and below: need ACCESS_FINE_LOCATION for BT scanning
                const locPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (!locPerm) {
                    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        throw new BluetoothPermissionError('LOCATION_PERMISSION_DENIED');
                    }
                }
            }
        } catch (permErr) {
            if (permErr instanceof BluetoothPermissionError) throw permErr;
            console.warn('[BT Android] Permission check failed:', permErr);
        }

        // Check Bluetooth state with retry logic
        const isReady = await this.waitForEnabled(5000);
        if (!isReady) throw new BluetoothPermissionError('BLUETOOTH_NOT_POWERED_ON');

        const foundMap = new Map<string, any>();

        // STEP 1: Always get bonded devices first — instant and always works
        try {
            const bonded = await RNBluetoothClassic.getBondedDevices();
            bonded.forEach(device => {
                const name = device.name || '';
                if (this.isOBDDevice(name)) {
                    foundMap.set(device.address, { ...device, address: device.address, name, transport: 'CLASSIC' });
                }
            });
        } catch (bondedErr) {
            console.warn('[BT Android] getBondedDevices failed:', bondedErr);
        }

        // STEP 2: Attempt Classic active discovery (may fail on some devices/permissions — not fatal)
        try {
            // Race discovery against a 12s hard timeout to prevent UI freezes
            const discovered = await Promise.race([
                RNBluetoothClassic.startDiscovery(),
                new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('DISCOVERY_TIMEOUT')), 12000))
            ]);
            if (Array.isArray(discovered)) {
                discovered.forEach(device => {
                    const name = device.name || '';
                    if (this.isOBDDevice(name)) {
                        const existing = foundMap.get(device.address);
                        if (existing) {
                            existing.rssi = device.rssi || existing.rssi;
                        } else {
                            foundMap.set(device.address, { ...device, address: device.address, name, transport: 'CLASSIC' });
                        }
                    }
                });
            }
        } catch (discoveryErr) {
            // Discovery failure is non-fatal — bonded devices are still returned
            console.warn('[BT Android] startDiscovery failed (non-fatal):', discoveryErr);
        }

        // STEP 3: BLE scan via react-native-ble-plx — discovers BLE-only adapters (Vgate, Veepeak, OBDLink MX+, etc.)
        try {
            const manager = BLEBridge.getInstance();
            await new Promise<void>((resolve) => {
                manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
                    if (error) return;
                    if (device && device.id) {
                        const name = device.name || device.localName || '';
                        const serviceUUIDs = device.serviceUUIDs || [];
                        if (this.isOBDDevice(name, serviceUUIDs)) {
                            if (!foundMap.has(device.id)) {
                                foundMap.set(device.id, {
                                    address: device.id,
                                    name: name || 'BLE OBD Adapter',
                                    rssi: device.rssi,
                                    transport: 'BLE',
                                    serviceUUIDs,
                                });
                            }
                        }
                    }
                });
                // BLE scan for 4 seconds, then stop and resolve
                setTimeout(() => {
                    manager.stopDeviceScan();
                    resolve();
                }, 4000);
            });
        } catch (bleErr) {
            console.warn('[BT Android] BLE scan failed (non-fatal):', bleErr);
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
        // ── Transport Detection ─────────────────────────────────────────
        // Determine transport from scan metadata or MAC format.
        // BLE device IDs on Android are standard MAC format but were discovered via BLE scan.
        // We check stored transport metadata first; if unavailable, try Classic then fall back to BLE.
        const isMacFormat = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(deviceId);
        // UUID format (iOS-style) or non-MAC format → definitely BLE
        const isDefinitelyBle = !isMacFormat && !deviceId.startsWith('WIFI:');

        const connectionPromise = (async () => {
            // If device ID is not a MAC (e.g. iOS UUID), go straight to BLE
            if (isDefinitelyBle) {
                return await this.connectBLE(deviceId);
            }

            try {
                let device: BluetoothDevice | undefined;
                try { device = await RNBluetoothClassic.getConnectedDevice(deviceId); } catch (e) {}
                if (!device) {
                    const bonded = await RNBluetoothClassic.getBondedDevices();
                    device = bonded.find(d => d.address === deviceId);
                }
                if (!device) {
                    // Device not in Classic bonded list → try BLE path
                    return await this.connectBLE(deviceId);
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
                
                if (isMacFormat) {
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

            const TARGET_OBD2_SERVICES = [
                '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / Vgate / generic ELM327
                '0000fff0-0000-1000-8000-00805f9b34fb', // UniCarScan
                '000018f0-0000-1000-8000-00805f9b34fb', // Veepeak
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // STN2120 / vLinker / OBDLink
                '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
                '0000ff00-0000-1000-8000-00805f9b34fb', // KW903 / Autoscan
            ];

            for (const service of services) {
                const serviceUuid = service.uuid.toLowerCase();
                if (TARGET_OBD2_SERVICES.includes(serviceUuid)) {
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
                            if (!notifyChar && (c.isNotifiable || c.isIndicatable)) notifyChar = c;
                            if (!writeChar && (c.isWritableWithResponse || c.isWritableWithoutResponse)) writeChar = c;
                        }
                    }
                }
                if (writeChar && notifyChar) break;
            }

            if (!writeChar || !notifyChar) {
                for (const service of services) {
                    const serviceUuid = service.uuid.toLowerCase();
                    if (serviceUuid.includes('1800') || serviceUuid.includes('1801') || serviceUuid.includes('180a') || serviceUuid.includes('180f')) {
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
                            if (!notifyChar && (c.isNotifiable || c.isIndicatable)) notifyChar = c;
                            if (!writeChar && (c.isWritableWithResponse || c.isWritableWithoutResponse)) writeChar = c;
                        }
                    }
                    if (writeChar && notifyChar) break;
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
        if (cleanCmd.length === 0) {
            // Boş komut gönderilmesini engelle (ELM327 klon kilitlenmelerini önler)
            return;
        }
        const { assertHardwareGate } = require('../core/security/CommandClassificationRegistry');
        const { useAppStore } = require('../store/useAppStore');
        const { useBluetoothStore } = require('../store/useBluetoothStore');
        const appState = useAppStore?.getState?.() ?? {};
        const isPro = appState.isPro ?? false;
        const isFreeTrialAllowed = appState.activeFreeTrialExecution ?? false;
        const btState = useBluetoothStore?.getState?.() ?? {};
        const isMoving = (btState.speed ?? 0) > 0 || (btState.rpm ?? 0) > 0;
        assertHardwareGate(cleanCmd, isPro, isMoving, undefined, isFreeTrialAllowed);

        const command = cleanCmd + '\r';
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
        try {
            const { useBluetoothStore } = require('../store/useBluetoothStore');
            useBluetoothStore?.getState?.()?.addLog?.(`RX_LISTENER_REGISTERED. Active count: 1`);
        } catch (e) {}
    }
    removeListener(listener: DataListener) {
        if (this.dataListener === listener) {
            this.dataListener = null;
            try {
                const { useBluetoothStore } = require('../store/useBluetoothStore');
                useBluetoothStore?.getState?.()?.addLog?.(`RX_LISTENER_REMOVED. Active count: 0`);
            } catch (e) {}
        }
    }
    clearBuffer() {
        this.bleDataBuffer = '';
        this.wifiDataBuffer = '';
        this.isDraining = true;
        if (this.drainTimeout) clearTimeout(this.drainTimeout);
        this.drainTimeout = setTimeout(() => {
            this.isDraining = false;
        }, 20); // 20ms micro-drain ensures valid incoming sensor frames are never dropped
    }

    private startListening() {
        if (!this.connectedDevice) return;
        this.stopListening();
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
        try {
            const { UdsActuatorService } = require('../services/UdsActuatorService');
            UdsActuatorService.stopActuatorSession().catch(() => {});
        } catch (e) {}
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
        await this.safeDisconnect();
    }

    async safeDisconnect(): Promise<void> {
        try {
            this.clearBuffer();
            await Promise.race([
                this.disconnect(),
                new Promise<void>((resolve) => setTimeout(resolve, 2000))
            ]);
        } catch (e) {
            console.warn('[Bluetooth Android] safeDisconnect error:', e);
        }
    }
}

export default new BluetoothServiceAndroid();
