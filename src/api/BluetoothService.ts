import RNBluetoothClassic, {
    BluetoothDevice
} from 'react-native-bluetooth-classic';
import AsyncStorage from '@react-native-async-storage/async-storage';

type DataListener = (data: string) => void;
type DisconnectCallback = () => void;

class BluetoothService {
    connectedDevice: BluetoothDevice | null = null;
    private dataSubscription: any | null = null;
    private listeners: DataListener[] = [];
    private disconnectCallback: DisconnectCallback | null = null;
    private connectionMonitorId: ReturnType<typeof setInterval> | null = null;
    private readonly STORAGE_KEY = '@last_connected_device';

    /**
     * Scans for paired devices (Bluetooth Classic)
     */
    async scanDevices(): Promise<BluetoothDevice[]> {
        try {
            console.log('Scanning for bonded devices...');
            return await RNBluetoothClassic.getBondedDevices();
        } catch (err) {
            console.error('Scan Failed:', err);
            return [];
        }
    }

    /**
     * Registers a callback to be invoked when the connection drops
     */
    onDisconnect(callback: DisconnectCallback) {
        this.disconnectCallback = callback;
    }

    /**
     * Connects to a specific device by ID (Address)
     */
    async connect(deviceId: string): Promise<boolean> {
        try {
            console.log(`Connecting to ${deviceId}...`);

            let device: BluetoothDevice | undefined;

            try {
                device = await RNBluetoothClassic.getConnectedDevice(deviceId);
            } catch (e) {
                // Device not connected yet, continue
            }

            if (!device) {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                device = bonded.find(d => d.address === deviceId);
            }

            if (!device) throw new Error('Device not found');

            if (!await device.isConnected()) {
                const connected = await device.connect({
                    connectorType: 'rfcomm',
                    DELIMITER: '',
                    charset: 'utf-8',
                });
                if (!connected) return false;
            }

            this.connectedDevice = device;
            this.startListening();
            this.startConnectionMonitor();
            return true;

        } catch (err) {
            console.error('Connection Failed:', err);
            return false;
        }
    }

    /**
     * Disconnects the current device and cleans up all resources
     */
    async disconnect() {
        this.stopConnectionMonitor();
        this.stopListening();
        if (this.connectedDevice) {
            try {
                await this.connectedDevice.disconnect();
            } catch (e) {
                console.warn('Disconnect cleanup error (safe to ignore):', e);
            }
            this.connectedDevice = null;
        }
        this.disconnectCallback = null;
    }

    /**
     * Sends raw data to the device
     */
    async write(data: string): Promise<void> {
        if (!this.connectedDevice) throw new Error('No device connected');
        const command = data.endsWith('\r') ? data : data + '\r';
        await this.connectedDevice.write(command);
    }

    /**
     * Subscribes to incoming data events
     */
    onDataReceived(listener: DataListener) {
        this.listeners.push(listener);
    }

    /**
     * Unsubscribes a listener
     */
    removeListener(listener: DataListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private startListening() {
        if (!this.connectedDevice) return;
        this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
            const data = event.data;
            this.listeners.forEach(l => l(data));
        });
    }

    private stopListening() {
        if (this.dataSubscription) {
            this.dataSubscription.remove();
            this.dataSubscription = null;
        }
    }

    /**
     * Polls device.isConnected() every 3 seconds to detect physical drops
     */
    private startConnectionMonitor() {
        this.stopConnectionMonitor(); // Prevent duplicates
        this.connectionMonitorId = setInterval(async () => {
            if (!this.connectedDevice) {
                this.stopConnectionMonitor();
                return;
            }
            try {
                const connected = await this.connectedDevice.isConnected();
                if (!connected) {
                    console.warn('[BT Monitor] Connection lost!');
                    this.handleDroppedConnection();
                }
            } catch (e) {
                console.warn('[BT Monitor] Check failed:', e);
                this.handleDroppedConnection();
            }
        }, 3000);
    }

    private stopConnectionMonitor() {
        if (this.connectionMonitorId) {
            clearInterval(this.connectionMonitorId);
            this.connectionMonitorId = null;
        }
    }

    private handleDroppedConnection() {
        this.stopConnectionMonitor();
        this.stopListening();
        this.connectedDevice = null;
        if (this.disconnectCallback) {
            this.disconnectCallback();
            this.disconnectCallback = null;
        }
    }

    /**
     * Persistently saves the last connected device
     */
    async saveLastDevice(deviceId: string, deviceName: string) {
        try {
            const data = JSON.stringify({ id: deviceId, name: deviceName });
            await AsyncStorage.setItem(this.STORAGE_KEY, data);
        } catch (e) {
            console.error('Failed to save last device:', e);
        }
    }

    /**
     * Retrieves the last connected device from storage
     */
    async getLastDevice(): Promise<{ id: string, name: string } | null> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get last device:', e);
            return null;
        }
    }
}

export default new BluetoothService();