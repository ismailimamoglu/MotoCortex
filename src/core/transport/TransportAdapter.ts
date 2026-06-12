export interface TransportAdapter {
    connect(id: string): Promise<boolean>;
    disconnect(): Promise<void>;
    write(data: string): Promise<void>;
    onDataReceived(callback: (data: string) => void): void;
}
