export class BluetoothPermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BluetoothPermissionError';
        Object.setPrototypeOf(this, BluetoothPermissionError.prototype);
    }
}

export type DataListener = (data: string) => void;
export type DisconnectCallback = () => void;

export interface IBluetoothService {
    connectedDevice: any | null;
    bleConnectedDevice: any | null;
    checkBluetoothState(): Promise<void>;
    waitForEnabled(timeoutMs?: number): Promise<boolean>;
    enableBluetooth(): Promise<boolean>;
    scanDevices(): Promise<any[]>;
    onDisconnect(callback: DisconnectCallback): void;
    connect(deviceId: string): Promise<boolean>;
    disconnect(): Promise<void>;
    write(data: string): Promise<void>;
    onDataReceived(listener: DataListener): void;
    removeListener(listener: DataListener): void;
    clearBuffer(): void;
    saveLastDevice(deviceId: string, deviceName: string): Promise<void>;
    getLastDevice(): Promise<{ id: string; name: string } | null>;
    shutdownCurrentSocket(): Promise<void>;
}
