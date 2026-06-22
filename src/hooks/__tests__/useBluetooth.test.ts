import { ConnectionStateMachine, ConnectionState } from '../../core/connection/ConnectionStateMachine';
import { useBluetoothStore } from '../../store/useBluetoothStore';

// We want to test a mock bluetooth state machine scenario, simulating:
// 'UART_STABILIZING', 'PROTOCOL_SCANNING', 'ECU_HANDSHAKE', 'RETRYING', etc.
// Since ConnectionState has a fixed set of enums, we can define custom ones in logs/reasons or test transition flows.
// The user mentions simulating: 'UART_STABILIZING', 'PROTOCOL_SCANNING', 'ECU_HANDSHAKE', and 'RETRYING'
// as 9 asynchronous state transitions or mock events. Let's build a comprehensive test file.

describe('useBluetooth State Machine Tests (v7.4 Coverage Sprint)', () => {
    beforeEach(() => {
        useBluetoothStore.getState().reset();
    });

    test('1. Transition from DISCONNECTED to ADAPTER_CONNECTING', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.ADAPTER_CONNECTING, 'USER_CONNECT');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.ADAPTER_CONNECTING);
    });

    test('2. Transition to PROTOCOL_SCANNING representing UART stabilization and start scanning', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.PROTOCOL_SCANNING, 'UART_STABILIZING');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.PROTOCOL_SCANNING);
        expect(useBluetoothStore.getState().logs[0]).toContain('FSM_TRANSITION');
        expect(useBluetoothStore.getState().logs[0]).toContain('UART_STABILIZING');
    });

    test('3. Transition to ECU_HANDSHAKE during initialization', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.ECU_HANDSHAKE, 'PROTOCOL_NEGOTIATED');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.ECU_HANDSHAKE);
    });

    test('4. Transition to TELEMETRY_ACTIVE upon successful handshake completion', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE, 'HANDSHAKE_SUCCESS');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.TELEMETRY_ACTIVE);
    });

    test('5. Transition to RECOVERY representing RETRYING / connection timeout handler', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.RECOVERY, 'RETRYING');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.RECOVERY);
    });

    test('6. Transition from RECOVERY back to TELEMETRY_ACTIVE on successful recovery', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.RECOVERY, 'HEARTBEAT_LOST');
        ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE, 'RECOVERY_SUCCESS');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.TELEMETRY_ACTIVE);
    });

    test('7. Transition to DEGRADED state under high packet loss / latency conditions', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.DEGRADED, 'HIGH_LATENCY');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.DEGRADED);
    });

    test('8. Transition to HARDWARE_FATAL representing terminal failure', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'CONNECTION_TIMEOUT');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.HARDWARE_FATAL);
    });

    test('9. FSM block check: Direct transition from HARDWARE_FATAL to TELEMETRY_ACTIVE is prevented', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'TERMINAL_ERROR');
        ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE, 'FORCE_BYPASS');
        // State should remain HARDWARE_FATAL
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.HARDWARE_FATAL);
        expect(useBluetoothStore.getState().logs[0]).toContain('FSM_BLOCKED');
    });

    test('10. FSM recovers from HARDWARE_FATAL only by transitioning to DISCONNECTED first', () => {
        ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'TERMINAL_ERROR');
        ConnectionStateMachine.transitionTo(ConnectionState.DISCONNECTED, 'RESET_FLOW');
        expect(useBluetoothStore.getState().connectionState).toBe(ConnectionState.DISCONNECTED);
    });
});
