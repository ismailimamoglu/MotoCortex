import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { TransportAdapter } from './TransportAdapter';
import * as Logger from '../../services/Logger';

export class ClassicBluetoothTransport implements TransportAdapter {
    private connectedDevice: BluetoothDevice | null;
    private dataSubscription: any | null;
    private dataCallback: ((data: string) => void) | null;

    constructor() {
        this.connectedDevice = null;
        this.dataSubscription = null;
        this.dataCallback = null;
    }

    async connect(deviceId: string): Promise<boolean> {
        try {
            let device: BluetoothDevice | undefined;
            try { device = await RNBluetoothClassic.getConnectedDevice(deviceId); } catch (e) {}
            if (!device) {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                device = bonded.find(d => d.address === deviceId);
            }
            if (!device) {
                throw new Error('Device not found or not bonded yet');
            }
            if (!await device.isConnected()) {
                const connected = await device.connect({ connectorType: 'rfcomm', DELIMITER: '', charset: 'utf-8' });
                if (!connected) throw new Error('RFCOMM connection failed');
            }
            this.connectedDevice = device;
            this.startListening();
            return true;
        } catch (err) {
            console.error('[ClassicBluetoothTransport] Connection failed:', err);
            return false;
        }
    }

    async disconnect(): Promise<void> {
        this.stopListening();
        if (this.connectedDevice) {
            try { await this.connectedDevice.disconnect(); } catch (e) {}
            this.connectedDevice = null;
        }
    }

    async write(data: string): Promise<void> {
        if (!this.connectedDevice) {
            throw new Error('ClassicBluetoothTransport: Not connected');
        }
        const command = data.endsWith('\r') ? data : data + '\r';
        Logger.log('BT_WRITE', command);
        await this.connectedDevice.write(command);
    }

    onDataReceived(callback: (data: string) => void): void {
        this.dataCallback = callback;
        if (this.connectedDevice) {
            this.startListening();
        }
    }

    private startListening() {
        if (!this.connectedDevice || this.dataSubscription) return;
        this.dataSubscription = this.connectedDevice.onDataReceived((event) => {
            Logger.log('BT_READ_CHUNK', event.data);
            if (this.dataCallback) {
                this.dataCallback(event.data);
            }
        });
    }

    private stopListening() {
        if (this.dataSubscription) {
            this.dataSubscription.remove();
            this.dataSubscription = null;
        }
    }
}
