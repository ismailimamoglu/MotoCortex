export interface AdapterProfile {
    tier: 'S' | 'A' | 'C';
    name: string;
    safePollIntervalMs: number;
    supportsHeaders: boolean;
    supportsATAL: boolean;
    supportsAdaptiveTiming: boolean;
    supportsManualFlowControl: boolean;
    maxBurstCommands: number;
}

export const AdapterProfileRegistry: Record<string, AdapterProfile> = {
    'OBDLink': { tier: 'S', name: 'OBDLink LX/MX', safePollIntervalMs: 25, supportsHeaders: true, supportsATAL: true, supportsAdaptiveTiming: true, supportsManualFlowControl: true, maxBurstCommands: 10 },
    'Vgate': { tier: 'S', name: 'Vgate iCar Pro', safePollIntervalMs: 40, supportsHeaders: true, supportsATAL: true, supportsAdaptiveTiming: true, supportsManualFlowControl: true, maxBurstCommands: 8 },
    'ELM327_v1.5': { tier: 'A', name: 'Quality ELM327 v1.5', safePollIntervalMs: 80, supportsHeaders: true, supportsATAL: true, supportsAdaptiveTiming: false, supportsManualFlowControl: false, maxBurstCommands: 4 },
    'CLONE_v2.1': { tier: 'C', name: 'Cheap Clone v2.1', safePollIntervalMs: 200, supportsHeaders: false, supportsATAL: false, supportsAdaptiveTiming: false, supportsManualFlowControl: false, maxBurstCommands: 1 }
};
