import { create } from 'zustand';

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
    fuelConsumptionLh: number | null; // Liters per hour (Idle/Slow)
    fuelConsumptionL100km: number | null; // Liters per 100km (Moving)

    dtcs: string[];
    vin: string | null;
    odometer: number | 'UNSUPPORTED' | null;
    distanceSinceCleared: number | null;
    distanceMilOn: number | null;
    isDiagnosticMode: boolean;
    isAdaptationRunning: boolean;
    lastDeviceId: string | null;
    lastDeviceName: string | null;
    isCloneDevice: boolean;

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
    setIsCloneDevice: (value: boolean) => void;
    addLog: (entry: string) => void;
    clearLogs: () => void;
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
    fuelConsumptionLh: null,
    fuelConsumptionL100km: null,
    dtcs: [],
    vin: null,
    odometer: null,
    distanceSinceCleared: null,
    distanceMilOn: null,
    isDiagnosticMode: false,
    isAdaptationRunning: false,
    lastDeviceId: null,
    lastDeviceName: null,
    isCloneDevice: false,

    setStatus: (status) => set({ status }),
    setAdapterStatus: (status) => set({ adapterStatus: status }),
    setEcuStatus: (status) => set({ ecuStatus: status }),
    setDevice: (deviceName, deviceId) => set({ deviceName, deviceId }),
    setLastDevice: (lastDeviceName, lastDeviceId) => set({ lastDeviceName, lastDeviceId }),
    setLastResponse: (lastResponse) => set({ lastResponse }),
    setError: (error) => set({ error }),
    setRpm: (rpm) => set({ rpm }),
    setSensorData: (data) => set(data),
    setDiagnosticMode: (active) => set({ isDiagnosticMode: active }),
    setAdaptationRunning: (active) => set({ isAdaptationRunning: active }),
    setIsCloneDevice: (isCloneDevice) => set({ isCloneDevice }),
    addLog: (entry) => set((state) => ({ logs: [`[${new Date().toLocaleTimeString()}] ${entry}`, ...state.logs] })),
    clearLogs: () => set({ logs: [] }),
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
        fuelConsumptionLh: null,
        fuelConsumptionL100km: null,
        dtcs: [],
        vin: null,
        odometer: null,
        distanceSinceCleared: null,
        distanceMilOn: null,
        isDiagnosticMode: false,
        isAdaptationRunning: false,
        isCloneDevice: false,
    }),
}));
