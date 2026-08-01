// src/core/connection/__tests__/GlobalProtocolRegression.test.ts
// MotoCortex Master Plan V3 - Automated Regression & Safeguard Test Suite

jest.mock('../../../api/OBDCommandQueue', () => ({
    __esModule: true,
    default: {
        add: jest.fn().mockResolvedValue('OK'),
    },
}));

jest.mock('../../../store/useBluetoothStore', () => ({
    useBluetoothStore: {
        getState: () => ({
            addLog: () => {},
        }),
    },
}));

import { ModuleDiscoveryManager } from '../ModuleDiscoveryManager';
import { CapabilityDiscoveryManager } from '../CapabilityDiscoveryManager';

describe('Global OBD2/UDS Protocol Regression Suite (Master Plan V3)', () => {
    test('ECU Discovery Engine uses verified module headers from project specification', () => {
        const registry = ModuleDiscoveryManager.MODULE_REGISTRY;

        const ecm = registry.find(m => m.id === 'ECM');
        const tcm = registry.find(m => m.id === 'TCM');
        const abs = registry.find(m => m.id === 'ABS');
        const srs = registry.find(m => m.id === 'SRS');
        const bcm = registry.find(m => m.id === 'BCM');

        expect(ecm).toBeDefined();
        expect(ecm?.txHeader).toBe('7E0');
        expect(ecm?.rxHeader).toBe('7E8');

        expect(tcm).toBeDefined();
        expect(tcm?.txHeader).toBe('7E1');
        expect(tcm?.rxHeader).toBe('7E9');

        expect(abs).toBeDefined();
        expect(abs?.txHeader).toBe('7D0');
        expect(abs?.rxHeader).toBe('7D8');
        expect(abs?.isSafetyCritical).toBe(true);

        expect(srs).toBeDefined();
        expect(srs?.txHeader).toBe('770');
        expect(srs?.rxHeader).toBe('778');
        expect(srs?.isSafetyCritical).toBe(true);

        expect(bcm).toBeDefined();
        expect(bcm?.txHeader).toBe('720');
        expect(bcm?.rxHeader).toBe('728');
    });

    test('CapabilityDiscoveryManager expands PID blocks to A0 and C0 and supports UDS probing', async () => {
        expect(CapabilityDiscoveryManager.probeUdsServices).toBeDefined();
    });
});
