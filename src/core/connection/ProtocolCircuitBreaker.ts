import { useBluetoothStore } from '../../store/useBluetoothStore';

export class ProtocolCircuitBreaker {
    private static failures = new Map<string, number>();

    /**
     * Records a failure for a specific protocol. If it fails 2 times consecutively,
     * it is blacklisted in the store for this session.
     */
    public static recordFailure(protocol: string): void {
        const cleanProto = protocol.toUpperCase().trim();
        const count = (this.failures.get(cleanProto) || 0) + 1;
        this.failures.set(cleanProto, count);

        const store = useBluetoothStore.getState();
        store.addLog(`CIRCUIT_BREAKER: Recorded failure for protocol ${cleanProto} (consecutive: ${count})`);

        if (count >= 2) {
            const currentBlacklist = store.failedProtocols || [];
            if (!currentBlacklist.includes(cleanProto)) {
                const updated = [...currentBlacklist, cleanProto];
                store.setSensorData({ failedProtocols: updated });
                store.addLog(`CIRCUIT_BREAKER: Protocol ${cleanProto} has been blacklisted.`);
            }
        }
    }

    /**
     * Checks if a protocol is blacklisted.
     */
    public static isBlacklisted(protocol: string): boolean {
        const cleanProto = protocol.toUpperCase().trim();
        const store = useBluetoothStore.getState();
        const blacklist = store.failedProtocols || [];
        return blacklist.includes(cleanProto);
    }

    /**
     * Resets the failures map and blacklists.
     */
    public static reset(): void {
        this.failures.clear();
        useBluetoothStore.getState().setSensorData({ failedProtocols: [] });
    }
}
export default ProtocolCircuitBreaker;
