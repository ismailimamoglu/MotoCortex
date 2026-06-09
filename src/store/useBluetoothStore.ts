import { create } from 'zustand';
import { VehicleMake } from '../utils/vinDecoder';

type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

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

    dtcs: string[];
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
    reset: () => void;
}
 
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
    dtcs: [],
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
 
    setStatus: (status) => set({ status }),
    setAdapterStatus: (status) => set({ adapterStatus: status }),
    setEcuStatus: (status) => set({ ecuStatus: status }),
    setDevice: (deviceName, deviceId) => set({ deviceName, deviceId }),
    setLastDevice: (lastDeviceName, lastDeviceId) => set({ lastDeviceName, lastDeviceId }),
    setLastResponse: (lastResponse) => set({ lastResponse }),
    setError: (error) => set({ error }),
    setRpm: (rpm) => set({ rpm }),
    setSensorData: (data) => set(data),
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
        dtcs: [],
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
    }),
}));
