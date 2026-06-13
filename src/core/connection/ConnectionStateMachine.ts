import { useBluetoothStore } from '../../store/useBluetoothStore';

export enum ConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    ADAPTER_CONNECTING = 'ADAPTER_CONNECTING',
    ADAPTER_CONNECTED = 'ADAPTER_CONNECTED',
    INITIALIZING = 'INITIALIZING',
    PROTOCOL_SCANNING = 'PROTOCOL_SCANNING',
    ECU_HANDSHAKE = 'ECU_HANDSHAKE',
    TELEMETRY_ACTIVE = 'TELEMETRY_ACTIVE',
    DEGRADED = 'DEGRADED',
    RECOVERY = 'RECOVERY',
    HARDWARE_FATAL = 'HARDWARE_FATAL'
}

export class ConnectionStateMachine {
    /**
     * Transition the global connection state to nextState.
     * Logs the transition structured log and updates Zustand store.
     */
    public static transitionTo(nextState: ConnectionState, reason = 'NORMAL'): void {
        const store = useBluetoothStore.getState();
        const previousState = store.connectionState;

        if (previousState === nextState) {
            return;
        }

        // FSM Guard checks (e.g. cannot transition from HARDWARE_FATAL to TELEMETRY_ACTIVE directly)
        if (previousState === ConnectionState.HARDWARE_FATAL && nextState !== ConnectionState.DISCONNECTED) {
            store.addLog(`FSM_BLOCKED: Blocked invalid transition from HARDWARE_FATAL to ${nextState}`);
            return;
        }

        // Update Zustand store
        store.setSensorData({ connectionState: nextState as any });

        // Structured Diagnostic Logging on FSM State Change
        const stats = store.telemetryStats;
        const logItem = {
            timestamp: Date.now(),
            adapter: store.deviceName || 'Unknown',
            transport: store.deviceId?.includes(':') ? 'CLASSIC' : 'BLE',
            protocol: store.protocol || 'UNKNOWN',
            state: nextState,
            previousState,
            rttAvg: stats.avgResponseTime || 0,
            timeoutRate: parseFloat((stats.requestsSent > 0 ? (stats.timeoutCount / stats.requestsSent) : 0).toFixed(3)),
            queueDepth: 0, // Filled by command queue if active
            lastError: reason
        };

        store.addStructuredLog(logItem);
        store.addLog(`FSM_TRANSITION: ${previousState} ---> ${nextState} (Reason: ${reason})`);
    }
}
