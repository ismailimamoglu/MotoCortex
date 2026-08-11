import { create } from 'zustand';
import { VehicleMake } from '../utils/vinDecoder';

export interface SuggestedVehicleProfile {
    make: string;
    model: string;
    year: number;
    fuelType: string | null;
    transmission: string | null;
    confidence: number;
}

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

export interface ConnectionStep {
    id: string;
    labelKey: string;
    defaultLabel: string;
    status: 'idle' | 'pending' | 'success' | 'failed';
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
    baroPressure: number | null;
    widebandAfr: number | null;
    transTemp: number | null;
    ethanolPercent: number | null;
    driverTorque: number | null;
    actualTorque: number | null;
    engineRefTorque: number | null;
    adblueLevel: number | null;
    egtTemp: number | null;
    noxSensor: number | null;

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
    isCodingAllowed: boolean;
    multiframeIsotpSupported: boolean;
    connectionType: 'BLUETOOTH' | 'WIFI' | 'WIFI_CUSTOM' | null;
    elmVersionTested: string | null;
    isSgwActive: boolean;
    vehicleMake: VehicleMake | null;
    dtcSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
    lastDtcSyncTime: string | null;
    isAtomicOperationRunning: boolean;
    pendingProRevocation: boolean;
    suggestedBrandFromVin: string | null;
    suggestedVehicleProfile: SuggestedVehicleProfile | null;
    protocol: string | null;
    protocolCacheByDevice: Record<string, string>;
 
    supportedPids: string[];
    guardTime: number;
    lastSuccessfulResponseAt: number | null;
    recoveryAttempts: number;
    watchdogTimeoutLimit: number;
    telemetryStats: TelemetryStats;
    diagnosticLogs: string[];
    adapterCapabilityScore: number;
    connectionState: 'DISCONNECTED' | 'ADAPTER_CONNECTING' | 'ADAPTER_CONNECTED' | 'INITIALIZING' | 'PROTOCOL_SCANNING' | 'ECU_HANDSHAKE' | 'TELEMETRY_ACTIVE' | 'DEGRADED' | 'RECOVERY' | 'HARDWARE_FATAL';
    connectionProgress: number;
    connectionSteps: ConnectionStep[];
    failedProtocols: string[];
    pidBlocksStatus: Record<string, 'supported' | 'unsupported' | 'unknown'>;
    pidLastUpdateTimes: Record<string, number>;
    structuredLogs: string[];
    connectingDeviceId: string | null;
    paywallContext: string | null;
    connectionStatusTextKey: string | null;
    connectionStatusTextParams: any | null;
    adapterFirmware: string | null;
    avgRtt: number;
 
    // Actions
    setStatus: (status: ConnectionStatus) => void;
    setConnectingDeviceId: (id: string | null) => void;
    setPaywallContext: (code: string | null) => void;
    clearPaywallContext: () => void;
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
    setIsCodingAllowed: (value: boolean) => void;
    setIsSgwActive: (value: boolean) => void;
    setIsAtomicOperationRunning: (value: boolean) => void;
    setPendingProRevocation: (value: boolean) => void;
    setSuggestedBrandFromVin: (brand: string | null) => void;
    setSuggestedVehicleProfile: (profile: SuggestedVehicleProfile | null) => void;
    setConnectionStatusText: (key: string | null, params?: any) => void;
    flushPendingRevocation: () => void;
    triggerPendingRevocation: () => void;
    addLog: (entry: string) => void;
    clearLogs: () => void;
    setProtocol: (protocol: string | null) => void;
    setProtocolForDevice: (deviceId: string, protocol: string) => void;
    addDiagnosticLog: (log: string) => void;
    clearDiagnosticLogs: () => void;
    addStructuredLog: (log: any) => void;
    clearStructuredLogs: () => void;
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
    baroPressure: null,
    widebandAfr: null,
    transTemp: null,
    ethanolPercent: null,
    driverTorque: null,
    actualTorque: null,
    engineRefTorque: null,
    adblueLevel: null,
    egtTemp: null,
    noxSensor: null,
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
    isCodingAllowed: true,
    multiframeIsotpSupported: false,
    connectionType: null,
    elmVersionTested: null,
    isSgwActive: false,
    vehicleMake: null,
    dtcSyncStatus: 'idle',
    lastDtcSyncTime: null,
    isAtomicOperationRunning: false,
    pendingProRevocation: false,
    suggestedBrandFromVin: null,
    suggestedVehicleProfile: null,
    protocol: null,
    protocolCacheByDevice: {},
    adapterFirmware: null,
    avgRtt: 0,

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
    connectionProgress: 0,
    connectionSteps: [
        { id: 'adapter', labelKey: 'connection.stepAdapter', defaultLabel: 'Adapter Connection & Cap Score', status: 'idle' },
        { id: 'protocol', labelKey: 'connection.stepProtocol', defaultLabel: 'OBD2 Protocol Negotiation', status: 'idle' },
        { id: 'handshake', labelKey: 'connection.stepHandshake', defaultLabel: 'ECU Communication Verification', status: 'idle' },
        { id: 'stabilization', labelKey: 'connection.stepStabilization', defaultLabel: 'Active Telemetry Loop Stabilization', status: 'idle' }
    ],
    failedProtocols: [],
    pidBlocksStatus: {},
    adapterCapabilityScore: 100,
    pidLastUpdateTimes: {},
    structuredLogs: [],
    connectingDeviceId: null,
    paywallContext: null,
    connectionStatusTextKey: null,
    connectionStatusTextParams: null,
 
    setStatus: (status) => set({ status }),
    setConnectingDeviceId: (connectingDeviceId) => set({ connectingDeviceId }),
    setPaywallContext: (paywallContext) => set({ paywallContext }),
    clearPaywallContext: () => set({ paywallContext: null }),
    setAdapterStatus: (status) => set({ adapterStatus: status }),
    setEcuStatus: (status) => set({ ecuStatus: status }),
    setDevice: (deviceName, deviceId) => set({ deviceName, deviceId }),
    setLastDevice: (lastDeviceName, lastDeviceId) => set({ lastDeviceName, lastDeviceId }),
    setLastResponse: (lastResponse) => set({ lastResponse }),
    setError: (error) => set({ error }),
    setConnectionStatusText: (key, params = null) => set({ connectionStatusTextKey: key, connectionStatusTextParams: params }),
    setRpm: (rpm) => set({ rpm }),
    setSensorData: (data) => set((state) => {
        let nextData: any = data;
        let hasModified = false;

        if (data.connectionState) {
            if (!hasModified) { nextData = { ...data }; hasModified = true; }
            if (['TELEMETRY_ACTIVE', 'DEGRADED'].includes(data.connectionState)) {
                nextData.status = 'connected';
                nextData.ecuStatus = 'connected';
                nextData.adapterStatus = 'connected';
            } else if (data.connectionState === 'DISCONNECTED') {
                nextData.status = 'disconnected';
                nextData.ecuStatus = 'disconnected';
                nextData.adapterStatus = 'disconnected';
            } else if (['ADAPTER_CONNECTING', 'ADAPTER_CONNECTED', 'INITIALIZING', 'PROTOCOL_SCANNING'].includes(data.connectionState)) {
                nextData.status = 'connecting';
                nextData.adapterStatus = 'connecting';
                nextData.ecuStatus = 'disconnected';
            } else if (data.connectionState === 'ECU_HANDSHAKE') {
                nextData.status = 'connecting';
                nextData.adapterStatus = 'connected';
                nextData.ecuStatus = 'connecting';
            } else if (data.connectionState === 'RECOVERY') {
                nextData.status = 'connecting';
                nextData.ecuStatus = 'connecting';
                nextData.adapterStatus = 'connected';
            } else if (data.connectionState === 'HARDWARE_FATAL') {
                nextData.status = 'error';
                nextData.ecuStatus = 'error';
                nextData.adapterStatus = 'error';
            }
        }
        if (data.pidLastUpdateTimes && Object.keys(data.pidLastUpdateTimes).length > 0) {
            if (!hasModified) { nextData = { ...data }; hasModified = true; }
            nextData.pidLastUpdateTimes = { ...state.pidLastUpdateTimes, ...data.pidLastUpdateTimes };
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
    setIsCodingAllowed: (isCodingAllowed) => set({ isCodingAllowed }),
    setIsSgwActive: (isSgwActive) => set({ isSgwActive }),
    setIsAtomicOperationRunning: (isAtomicOperationRunning) => set({ isAtomicOperationRunning }),
    setPendingProRevocation: (pendingProRevocation) => set({ pendingProRevocation }),
    setSuggestedBrandFromVin: (suggestedBrandFromVin) => set({ suggestedBrandFromVin }),
    setSuggestedVehicleProfile: (suggestedVehicleProfile) => set({ suggestedVehicleProfile }),
    flushPendingRevocation: () => set({ pendingProRevocation: false }),
    triggerPendingRevocation: () => set({ pendingProRevocation: true }),
    addLog: (entry) => set((state) => ({
        logs: [`[${new Date().toLocaleTimeString()}] ${entry}`, ...state.logs.slice(0, 29)]
    })),
    clearLogs: () => set({ logs: [] }),
    setProtocol: (protocol) => set({ protocol }),
    setProtocolForDevice: (deviceId, protocol) => set((state) => ({
        protocol,
        protocolCacheByDevice: { ...(state.protocolCacheByDevice || {}), [deviceId]: protocol }
    })),

    addDiagnosticLog: (log) => set((state) => {
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
        const entry = `[${timestamp}] ${log}`;
        return {
            diagnosticLogs: [entry, ...state.diagnosticLogs.slice(0, 29)]
        };
    }),
    clearDiagnosticLogs: () => set({ diagnosticLogs: [] }),
    addStructuredLog: (log) => set((state) => {
        const entry = typeof log === 'string' ? log : JSON.stringify(log);
        return {
            structuredLogs: [entry, ...state.structuredLogs.slice(0, 29)]
        };
    }),
    clearStructuredLogs: () => set({ structuredLogs: [] }),
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
        baroPressure: null,
        widebandAfr: null,
        transTemp: null,
        ethanolPercent: null,
        driverTorque: null,
        actualTorque: null,
        engineRefTorque: null,
        adblueLevel: null,
        egtTemp: null,
        noxSensor: null,
        dtcs: createInitialDtcs(),
        vin: null,
        suggestedVehicleProfile: null,
        ecuId: null,
        odometer: null,
        distanceSinceCleared: null,
        distanceMilOn: null,
        isDiagnosticMode: false,
        isAdaptationRunning: false,
        isPollingActive: false,
        isCloneDevice: false,
        isCodingAllowed: true,
        connectionType: null,
        elmVersionTested: null,
        isSgwActive: false,
        vehicleMake: null,
        dtcSyncStatus: 'idle',
        lastDtcSyncTime: null,
        isAtomicOperationRunning: false,
        pendingProRevocation: false,
        suggestedBrandFromVin: null,
        protocol: null,
        protocolCacheByDevice: {},
        adapterFirmware: null,
        avgRtt: 0,

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
        connectionProgress: 0,
        connectionSteps: [
            { id: 'adapter', labelKey: 'connection.stepAdapter', defaultLabel: 'Adapter Connection & Cap Score', status: 'idle' },
            { id: 'protocol', labelKey: 'connection.stepProtocol', defaultLabel: 'OBD2 Protocol Negotiation', status: 'idle' },
            { id: 'handshake', labelKey: 'connection.stepHandshake', defaultLabel: 'ECU Communication Verification', status: 'idle' },
            { id: 'stabilization', labelKey: 'connection.stepStabilization', defaultLabel: 'Active Telemetry Loop Stabilization', status: 'idle' }
        ],
        failedProtocols: [],
        pidBlocksStatus: {},
        adapterCapabilityScore: 100,
        pidLastUpdateTimes: {},
        structuredLogs: [],
        connectingDeviceId: null,
        paywallContext: null,
    }),
}));
