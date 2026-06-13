import { Platform } from 'react-native';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardStore, ALL_SENSORS } from '../../store/useDashboardStore';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { ADAPTER_COMMANDS } from '../../api/commands';
import { OtaService } from '../../services/OtaService';
import BluetoothService from '../../api/BluetoothService';
import OBDCommandQueue from '../../api/OBDCommandQueue';
import { AdaptivePollingController } from '../queue/AdaptivePollingController';

export class PollingOrchestrator {
    private static pollingActive = false;
    private static tick = 0;
    private static runtimeFailedPids = new Map<string, number>();
    private static lastVoltageQueryTime = 0;
    private static usePid49ForThrottle = false;
    private static mtuRequestCompleted = true;

    public static setMtuRequestCompleted(completed: boolean): void {
        this.mtuRequestCompleted = completed;
    }

    public static getIsPollingActive(): boolean {
        return this.pollingActive;
    }

    public static start(sendCommand: (cmd: string) => Promise<string | undefined>): void {
        if (this.pollingActive) return;

        const store = useBluetoothStore.getState();
        store.addLog('POLLING_START: Initiating polling loop.');
        this.pollingActive = true;
        store.setPollingActive(true);
        this.tick = 0;
        this.usePid49ForThrottle = false;

        store.setSensorData({ lastSuccessfulResponseAt: Date.now() });

        this.performPollSync(sendCommand);
    }

    public static stop(): void {
        const store = useBluetoothStore.getState();
        if (!this.pollingActive) return;
        store.addLog('POLLING_STOP: Stopping polling loop.');
        this.pollingActive = false;
        store.setPollingActive(false);
    }

    public static clearFailedPids(): void {
        this.runtimeFailedPids.clear();
        this.usePid49ForThrottle = false;
    }

    private static getPid(sensor: typeof ALL_SENSORS[number]): string {
        if (sensor.key === 'throttle') {
            const activeVeh = useTelemetryStore.getState().activeSessionVehicle;
            const isDiesel = activeVeh && (
                activeVeh.model.toLowerCase().includes('dci') ||
                activeVeh.model.toLowerCase().includes('tdi') ||
                activeVeh.model.toLowerCase().includes('hdi') ||
                activeVeh.model.toLowerCase().includes('tdci') ||
                activeVeh.model.toLowerCase().includes('cdti') ||
                activeVeh.model.toLowerCase().includes('crdi') ||
                activeVeh.model.toLowerCase().includes('multijet') ||
                activeVeh.model.toLowerCase().includes('diesel') ||
                activeVeh.model.toLowerCase().includes('d')
            );
            if (isDiesel || this.usePid49ForThrottle) {
                return ADAPTER_COMMANDS.ACCELERATOR_PEDAL_D;
            }
        }
        return sensor.pid;
    }

    private static async performPollSync(sendCommand: (cmd: string) => Promise<string | undefined>): Promise<void> {
        const store = useBluetoothStore.getState();
        const isConnected = store.connectionState === 'TELEMETRY_ACTIVE' || store.connectionState === 'DEGRADED';
        
        if (!this.pollingActive || !isConnected || store.isDiagnosticMode) {
            this.pollingActive = false;
            store.setPollingActive(false);
            return;
        }

        if (OtaService.isOtaWriting()) {
            store.addLog('OTA_LOCK: Delaying performPollSync, OTA writing in progress.');
            setTimeout(() => this.performPollSync(sendCommand), 100);
            return;
        }

        if (Platform.OS === 'android' && BluetoothService.bleConnectedDevice && !this.mtuRequestCompleted) {
            store.addLog('BLE: Delaying performPollSync, MTU request not yet complete.');
            setTimeout(() => this.performPollSync(sendCommand), 100);
            return;
        }

        if (useAppStore.getState().isSimulationMode) {
            const activeKeys = useDashboardStore.getState().activeSensors;
            const mockData: any = {};
            activeKeys.forEach(key => {
                if (key === 'rpm') mockData.rpm = 2800 + Math.floor(Math.random() * 100);
                else if (key === 'speed') mockData.speed = 45 + Math.floor(Math.random() * 3);
                else if (key === 'coolant') mockData.coolant = 85 + Math.floor(Math.random() * 2);
                else if (key === 'throttle') mockData.throttle = 18 + Math.floor(Math.random() * 2);
                else if (key === 'voltage') mockData.voltage = (13.7 + Math.random() * 0.2).toFixed(1) + 'V';
                else if (key === 'engineLoad') mockData.engineLoad = 32 + Math.floor(Math.random() * 2);
                else if (key === 'intakeAirTemp') mockData.intakeAirTemp = 30;
                else if (key === 'manifoldPressure') mockData.manifoldPressure = 102;
                else if (key === 'ambientTemp') mockData.ambientTemp = 22 + Math.floor(Math.random() * 2);
                else if (key === 'oilTemp') mockData.oilTemp = 92 + Math.floor(Math.random() * 2);
                else if (key === 'mafFlow') mockData.mafFlow = Number((14.5 + Math.random() * 0.5).toFixed(2));
                else if (key === 'timingAdvance') mockData.timingAdvance = Number((15.0 + Math.random() * 0.5).toFixed(1));
                else if (key === 'fuelLevel') mockData.fuelLevel = 65;
                else if (key === 'catalystTemp') mockData.catalystTemp = Number((340 + Math.random() * 5).toFixed(1));
            });
            store.setSensorData(mockData);
            store.setSensorData({ lastSuccessfulResponseAt: Date.now() });
            
            const interval = AdaptivePollingController.calculateInterval();
            if (this.pollingActive) {
                setTimeout(() => this.performPollSync(sendCommand), interval);
            }
            return;
        }

        try {
            this.tick++;
            const activeKeys = useDashboardStore.getState().activeSensors;
            const activeSensors = ALL_SENSORS.filter(s => activeKeys.includes(s.key));

            const guardTime = store.guardTime;
            const calculatedTimeout = Math.max(5000, activeSensors.length * guardTime * 3);
            store.setSensorData({ watchdogTimeoutLimit: calculatedTimeout });

            const sensorsToPoll = activeSensors.filter(sensor => {
                if (sensor.key === 'voltage') {
                    const now = Date.now();
                    return now - this.lastVoltageQueryTime >= 5000;
                }

                if (sensor.key !== 'voltage') {
                    const pidHex = this.getPid(sensor).replace(/\s+/g, '').substring(2).toUpperCase();
                    const failCount = this.runtimeFailedPids.get(pidHex) || 0;
                    if (failCount >= 3) {
                        return false;
                    }
                }

                if (sensor.key === 'rpm' || sensor.key === 'speed' || sensor.key === 'throttle') {
                    return true;
                }
                if (sensor.key === 'coolant' || sensor.key === 'engineLoad' || sensor.key === 'mafFlow') {
                    return this.tick % 5 === 0;
                }
                return this.tick % 20 === 0;
            });

            for (const sensor of sensorsToPoll) {
                if (!this.pollingActive || store.status !== 'connected' || store.isDiagnosticMode) return;
                const pid = sensor.key === 'voltage' ? 'ATRV' : this.getPid(sensor);
                try {
                    if (sensor.key === 'voltage') {
                        this.lastVoltageQueryTime = Date.now();
                    }
                    await sendCommand(pid);

                    if (sensor.key !== 'voltage') {
                        const pidHex = pid.replace(/\s+/g, '').substring(2).toUpperCase();
                        this.runtimeFailedPids.set(pidHex, 0);
                        const currentSupported = store.supportedPids;
                        if (!currentSupported.includes(pidHex)) {
                            store.setSensorData({
                                supportedPids: [...currentSupported, pidHex]
                            });
                            store.addDiagnosticLog(`LEARNED: PID ${pidHex} responded, added to supportedPids`);
                        }
                    }
                } catch (e) {
                    store.addLog(`DIAG: Sequential query [${pid}] failed: ${e}`);

                    if (sensor.key !== 'voltage') {
                        const pidHex = pid.replace(/\s+/g, '').substring(2).toUpperCase();
                        const fails = (this.runtimeFailedPids.get(pidHex) || 0) + 1;
                        this.runtimeFailedPids.set(pidHex, fails);
                        if (fails >= 3) {
                            store.addDiagnosticLog(`BLACKLISTED: PID ${pidHex} failed 3 times sequentially, disabled`);
                        }
                    }

                    if (sensor.key === 'throttle' && pid === ADAPTER_COMMANDS.THROTTLE) {
                        this.usePid49ForThrottle = true;
                        try {
                            await sendCommand(ADAPTER_COMMANDS.ACCELERATOR_PEDAL_D);
                        } catch (err) {
                            // ignore
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Polling error:", e);
            const errMsg = e instanceof Error ? e.message : String(e);
            if (errMsg.includes('CONNECTION_LOST') || errMsg.includes('MANUAL_DISCONNECT') || store.status !== 'connected') {
                this.pollingActive = false;
                store.setPollingActive(false);
            }
        } finally {
            const interval = AdaptivePollingController.calculateInterval();
            if (this.pollingActive && store.status === 'connected') {
                setTimeout(() => this.performPollSync(sendCommand), interval);
            } else {
                this.pollingActive = false;
                store.setPollingActive(false);
            }
        }
    }
}
