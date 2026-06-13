import { Platform } from 'react-native';
import { useBluetoothStore, DiagnosticDtcArray } from '../../store/useBluetoothStore';
import BluetoothService from '../../api/BluetoothService';
import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { ConnectionStateMachine, ConnectionState } from './ConnectionStateMachine';

export class RecoveryCoordinator {
    private static isRecoveryActive = false;

    public static getIsRecoveryActive(): boolean {
        return this.isRecoveryActive;
    }

    public static async handleRecovery(
        deviceId: string,
        initializeAndCheckEcu: () => Promise<void>,
        startPolling: () => void,
        stopPolling: () => void
    ): Promise<void> {
        if (this.isRecoveryActive) return;
        this.isRecoveryActive = true;

        const store = useBluetoothStore.getState();
        store.addDiagnosticLog(`WATCHDOG: Telemetry stall detected! (Elapsed > ${store.watchdogTimeoutLimit}ms)`);

        stopPolling();
        OBDCommandQueue.clear(new Error('TELEMETRY_STALL'));

        store.incrementRecoveryAttempts();
        const attempts = store.recoveryAttempts;
        store.updateTelemetryStats({
            recoveryCount: store.telemetryStats.recoveryCount + 1
        });

        if (attempts >= 3) {
            store.addDiagnosticLog(`WATCHDOG: Recovery attempts reached limit (3). Terminating connection and setting HARDWARE_FATAL.`);
            const fatalDtcs: DiagnosticDtcArray = ["HARDWARE_FATAL_RECOVERY_FAILED"];
            fatalDtcs.isNotScanned = false;
            fatalDtcs.errorState = 'HARDWARE_FATAL_RECOVERY_FAILED';
            store.setSensorData({
                dtcs: fatalDtcs,
                status: 'error',
                ecuStatus: 'error',
                adapterStatus: 'error'
            });
            ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'RECOVERY_LIMIT_EXCEEDED');
            await BluetoothService.disconnect();
            this.isRecoveryActive = false;
            return;
        }

        ConnectionStateMachine.transitionTo(ConnectionState.RECOVERY, `WATCHDOG_STALL_ATTEMPT_${attempts}`);
        store.addDiagnosticLog(`WATCHDOG: Triggering Auto Recovery Attempt #${attempts}...`);

        try {
            // Disconnect first to reset the GATT server/UART line
            store.addDiagnosticLog('WATCHDOG: Disconnecting BLE/Classic link for hardware recovery...');
            await BluetoothService.disconnect();

            // Android GATT 133 Shield: tam 1000ms delay on Android, 500ms on iOS/other
            const waitTime = Platform.OS === 'android' ? 1000 : 500;
            store.addDiagnosticLog(`WATCHDOG: Waiting ${waitTime}ms (GATT Shield) before reconnecting...`);
            await preciseSleep(waitTime);

            // Reconnect
            store.addDiagnosticLog(`WATCHDOG: Reconnecting to device ${deviceId}...`);
            const reconnected = await BluetoothService.connect(deviceId);
            if (!reconnected) {
                throw new Error('RECONNECT_FAILED');
            }

            // Re-run full ECU handshake
            store.addDiagnosticLog('WATCHDOG: Reconnected successfully. Initiating ECU handshake...');
            await initializeAndCheckEcu();

            store.addDiagnosticLog(`WATCHDOG: Recovery Succeeded! Resuming polling.`);
            this.isRecoveryActive = false;
            startPolling();
        } catch (recoveryErr) {
            store.addDiagnosticLog(`WATCHDOG: Recovery Attempt #${attempts} Failed: ${recoveryErr}`);
            this.isRecoveryActive = false;
            
            // Wait 2 seconds before scheduling the next recovery cycle
            setTimeout(() => {
                this.handleRecovery(deviceId, initializeAndCheckEcu, startPolling, stopPolling);
            }, 2000);
        }
    }
}
