import { create } from 'zustand';
import { VehicleMake } from '../utils/vinDecoder';

type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface TelemetryStats {
    requestsSent: number;
    responsesReceived: number;
    timeoutCount: number;
    recoveryCount: number;
    avgResponseTime: number;
    lastError: string | null;
}

export interface DiagnosticDtcArray extends Array<string> {
    isNotScanned?: boolean;
    errorState?: 'TIMEOUT' | 'CONNECTION_LOST' | 'ERROR_UNABLE_TO_READ' | 'HARDWARE_FATAL_RECOVERY_FAILED' | null;
}

interface BluetoothState {
    status: ConnectionStatus;
    adapterStatus: ConnectionStatus;
    ecuStatus: ConnectionStatus;
    deviceName: string | null;
    deviceId: string | null;
    lastResponse: string | null;
    error: string | null;
    logs: string[];
    rpm: number | null;
    coolant: number | null;
    speed: number | null;
    throttle: number | null;
    voltage: string | null;
    engineLoad: number | null;
    intakeAirTemp: number | null;
    manifoldPressure: number | null;
    ambientTemp: number | null;
    oilTemp: number | null;
    mafFlow: number | null;
    timingAdvance: number | null;
    fuelLevel: number | null;
    catalystTemp: number | null;

    dtcs: DiagnosticDtcArray;
    vin: string | null;
    ecuId: string | null;
    odometer: number | 'UNSUPPORTED' | null;
    distanceSinceCleared: number | null;
    distanceMilOn: number | null;
    isDiagnosticMode: boolean;
    isAdaptationRunning: boolean;
    isPollingActive: boolean;
    lastDeviceId: string | null;
    lastDeviceName: string | null;
    isCloneDevice: boolean;
    isSgwActive: boolean;
    vehicleMake: VehicleMake | null;
    dtcSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
    lastDtcSyncTime: string | null;
    isAtomicOperationRunning: boolean;
    pendingProRevocation: boolean;
    suggestedBrandFromVin: string | null;
    protocol: string | null;
 
    supportedPids: string[];
    guardTime: number;
    lastSuccessfulResponseAt: number | null;
    recoveryAttempts: number;
    watchdogTimeoutLimit: number;
    telemetryStats: TelemetryStats;
    diagnosticLogs: string[];
    adapterCapabilityScore: number;
    connectionState: 'DISCONNECTED' | 'CONNECTING' | 'ADAPTER_CONNECTED' | 'PROTOCOL_NEGOTIATING' | 'ECU_DETECTED' | 'ECU_RESPONDING' | 'TELEMETRY_ACTIVE' | 'ECU_NOT_FOUND' | 'PROTOCOL_FAILED' | 'DIAGNOSTICS_ACTIVE' | 'HARDWARE_FATAL';

    // Actions
    setStatus: (status: ConnectionStatus) => void;
    setAdapterStatus: (status: ConnectionStatus) => void;
    setEcuStatus: (status: ConnectionStatus) => void;
    setDevice: (name: string, id: string) => void;
    setLastDevice: (name: string, id: string) => void;
    setLastResponse: (response: string) => void;
    setError: (error: string | null) => void;
    setRpm: (rpm: number | null) => void;
    setSensorData: (data: Partial<BluetoothState>) => void;
    setDiagnosticMode: (active: boolean) => void;
    setAdaptationRunning: (active: boolean) => void;
    setPollingActive: (active: boolean) => void;
    setIsCloneDevice: (value: boolean) => void;
    setIsSgwActive: (value: boolean) => void;
    setIsAtomicOperationRunning: (value: boolean) => void;
    setPendingProRevocation: (value: boolean) => void;
    setSuggestedBrandFromVin: (brand: string | null) => void;
    flushPendingRevocation: () => void;
    triggerPendingRevocation: () => void;
    addLog: (entry: string) => void;
    clearLogs: () => void;
    setProtocol: (protocol: string | null) => void;
    addDiagnosticLog: (log: string) => void;
    clearDiagnosticLogs: () => void;
    resetRecoveryAttempts: () => void;
    incrementRecoveryAttempts: () => void;
    updateTelemetryStats: (stats: Partial<TelemetryStats>) => void;
    reset: () => void;
}

const createInitialDtcs = (): DiagnosticDtcArray => {
    const arr: DiagnosticDtcArray = [];
    arr.isNotScanned = true;
    arr.errorState = null;
    return arr;
};
 
export const useBluetoothStore = create<BluetoothState>((set) => ({
    status: 'disconnected',
    adapterStatus: 'disconnected',
    ecuStatus: 'disconnected',
    deviceName: null,
    deviceId: null,
    lastResponse: null,
    error: null,
    logs: [],
    rpm: null,
    coolant: null,
    speed: null,
    throttle: null,
    voltage: null,
    engineLoad: null,
    intakeAirTemp: null,
    manifoldPressure: null,
    ambientTemp: null,
    oilTemp: null,
    mafFlow: null,
    timingAdvance: null,
    fuelLevel: null,
    catalystTemp: null,
    dtcs: createInitialDtcs(),
    vin: null,
    ecuId: null,
    odometer: null,
    distanceSinceCleared: null,
    distanceMilOn: null,
    isDiagnosticMode: false,
    isAdaptationRunning: false,
    isPollingActive: false,
    lastDeviceId: null,
    lastDeviceName: null,
    isCloneDevice: false,
    isSgwActive: false,
    vehicleMake: null,
    dtcSyncStatus: 'idle',
    lastDtcSyncTime: null,
    isAtomicOperationRunning: false,
    pendingProRevocation: false,
    suggestedBrandFromVin: null,
    protocol: null,

    supportedPids: [],
    guardTime: 100,
    lastSuccessfulResponseAt: null,
    recoveryAttempts: 0,
    watchdogTimeoutLimit: 5000,
    telemetryStats: {
        requestsSent: 0,
        responsesReceived: 0,
        timeoutCount: 0,
        recoveryCount: 0,
        avgResponseTime: 0,
        lastError: null,
    },
    diagnosticLogs: [],
    connectionState: 'DISCONNECTED',
    adapterCapabilityScore: 100,
 
    setStatus: (status) => set({ status }),
    setAdapterStatus: (status) => set({ adapterStatus: status }),
    setEcuStatus: (status) => set({ ecuStatus: status }),
    setDevice: (deviceName, deviceId) => set({ deviceName, deviceId }),
    setLastDevice: (lastDeviceName, lastDeviceId) => set({ lastDeviceName, lastDeviceId }),
    setLastResponse: (lastResponse) => set({ lastResponse }),
    setError: (error) => set({ error }),
    setRpm: (rpm) => set({ rpm }),
    setSensorData: (data) => set((state) => {
        const nextData = { ...data };
        if (nextData.connectionState) {
            if (['TELEMETRY_ACTIVE', 'DIAGNOSTICS_ACTIVE'].includes(nextData.connectionState)) {
                nextData.status = 'connected';
                nextData.ecuStatus = 'connected';
                nextData.adapterStatus = 'connected';
            } else if (nextData.connectionState === 'DISCONNECTED') {
                nextData.status = 'disconnected';
                nextData.ecuStatus = 'disconnected';
                nextData.adapterStatus = 'disconnected';
            } else if (['CONNECTING', 'ADAPTER_CONNECTED', 'PROTOCOL_NEGOTIATING'].includes(nextData.connectionState)) {
                nextData.status = 'connecting';
                nextData.adapterStatus = 'connecting';
                nextData.ecuStatus = 'disconnected';
            } else if (['ECU_DETECTED', 'ECU_RESPONDING'].includes(nextData.connectionState)) {
                nextData.status = 'connecting';
                nextData.adapterStatus = 'connected';
                nextData.ecuStatus = 'connecting';
            } else if (nextData.connectionState === 'ECU_NOT_FOUND') {
                nextData.status = 'error';
                nextData.ecuStatus = 'error';
                nextData.adapterStatus = 'connected';
            } else if (nextData.connectionState === 'PROTOCOL_FAILED') {
                nextData.status = 'error';
                nextData.ecuStatus = 'error';
                nextData.adapterStatus = 'connected';
            } else if (nextData.connectionState === 'HARDWARE_FATAL') {
                nextData.status = 'error';
                nextData.ecuStatus = 'error';
                nextData.adapterStatus = 'error';
            }
        }
        return nextData;
    }),
    setDiagnosticMode: (active) => set((state) => {
        const nextDiag = active;
        return { 
            isDiagnosticMode: nextDiag, 
            isAtomicOperationRunning: nextDiag || state.isAdaptationRunning || state.isPollingActive 
        };
    }),
    setAdaptationRunning: (active) => set((state) => {
        const nextAdapt = active;
        return { 
            isAdaptationRunning: nextAdapt, 
            isAtomicOperationRunning: state.isDiagnosticMode || nextAdapt || state.isPollingActive 
        };
    }),
    setPollingActive: (active) => set((state) => {
        const nextPoll = active;
        return { 
            isPollingActive: nextPoll, 
            isAtomicOperationRunning: state.isDiagnosticMode || state.isAdaptationRunning || nextPoll 
        };
    }),
    setIsCloneDevice: (isCloneDevice) => set({ isCloneDevice }),
    setIsSgwActive: (isSgwActive) => set({ isSgwActive }),
    setIsAtomicOperationRunning: (isAtomicOperationRunning) => set({ isAtomicOperationRunning }),
    setPendingProRevocation: (pendingProRevocation) => set({ pendingProRevocation }),
    setSuggestedBrandFromVin: (suggestedBrandFromVin) => set({ suggestedBrandFromVin }),
    flushPendingRevocation: () => set({ pendingProRevocation: false }),
    triggerPendingRevocation: () => set({ pendingProRevocation: true }),
    addLog: (entry) => set((state) => ({ logs: [`[${new Date().toLocaleTimeString()}] ${entry}`, ...state.logs] })),
    clearLogs: () => set({ logs: [] }),
    setProtocol: (protocol) => set({ protocol }),

    addDiagnosticLog: (log) => set((state) => {
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
        const entry = `[${timestamp}] ${log}`;
        const newLogs = [...state.diagnosticLogs, entry];
        if (newLogs.length > 500) {
            newLogs.shift();
        }
        return { diagnosticLogs: newLogs };
    }),
    clearDiagnosticLogs: () => set({ diagnosticLogs: [] }),
    resetRecoveryAttempts: () => set({ recoveryAttempts: 0 }),
    incrementRecoveryAttempts: () => set((state) => ({ recoveryAttempts: state.recoveryAttempts + 1 })),
    updateTelemetryStats: (newStats) => set((state) => ({
        telemetryStats: { ...state.telemetryStats, ...newStats }
    })),

    reset: () => set({
        status: 'disconnected',
        adapterStatus: 'disconnected',
        ecuStatus: 'disconnected',
        deviceName: null,
        deviceId: null,
        lastResponse: null,
        error: null,
        rpm: null,
        coolant: null,
        speed: null,
        throttle: null,
        voltage: null,
        engineLoad: null,
        intakeAirTemp: null,
        manifoldPressure: null,
        ambientTemp: null,
        oilTemp: null,
        mafFlow: null,
        timingAdvance: null,
        fuelLevel: null,
        catalystTemp: null,
        dtcs: createInitialDtcs(),
        vin: null,
        ecuId: null,
        odometer: null,
        distanceSinceCleared: null,
        distanceMilOn: null,
        isDiagnosticMode: false,
        isAdaptationRunning: false,
        isPollingActive: false,
        isCloneDevice: false,
        isSgwActive: false,
        vehicleMake: null,
        dtcSyncStatus: 'idle',
        lastDtcSyncTime: null,
        isAtomicOperationRunning: false,
        pendingProRevocation: false,
        suggestedBrandFromVin: null,
        protocol: null,

        supportedPids: [],
        guardTime: 100,
        lastSuccessfulResponseAt: null,
        recoveryAttempts: 0,
        watchdogTimeoutLimit: 5000,
        telemetryStats: {
            requestsSent: 0,
            responsesReceived: 0,
            timeoutCount: 0,
            recoveryCount: 0,
            avgResponseTime: 0,
            lastError: null,
        },
        diagnosticLogs: [],
        connectionState: 'DISCONNECTED',
        adapterCapabilityScore: 100,
    }),
}));
