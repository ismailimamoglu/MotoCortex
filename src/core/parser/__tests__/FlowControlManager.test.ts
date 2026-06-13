import { FlowControlManager } from '../FlowControlManager';
import { useBluetoothStore } from '../../../store/useBluetoothStore';

jest.mock('../../../store/useBluetoothStore', () => {
    const mockStoreState = {
        isCloneDevice: false,
        adapterCapabilityScore: 95
    };
    return {
        useBluetoothStore: {
            getState: () => mockStoreState
        }
    };
});

describe('FlowControlManager Unit Tests', () => {
    let manager: FlowControlManager;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new FlowControlManager();
    });

    test('1. Inject manual flow control when OBDLink (supports manual flow control) and multi-frame starting with 7E810 is found', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95; // OBDLink profile chosen

        const response = ['7E810 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(true);
    });

    test('2. Inject manual flow control when OBDLink and multi-frame starting with 18DAF11010 is found', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95; // OBDLink profile chosen

        const response = ['18DAF11010 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(true);
    });

    test('3. Do NOT inject manual flow control on single-frame / non-multiline responses', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95;

        const response = ['7E804 41 0C 11 22'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(false);
    });

    test('4. Do NOT inject manual flow control on clone devices (CLONE_v2.1 has supportsManualFlowControl=false)', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = true;
        store.adapterCapabilityScore = 40;

        const response = ['7E810 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(false);
    });

    test('5. Do NOT inject manual flow control on standard ELM327 v1.5 (supportsManualFlowControl=false)', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 75; // Between clone and OBDLink, falls to ELM327_v1.5 fallback

        const response = ['7E810 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(false);
    });

    test('6. Handles mixed lines where multi-frame is buried', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95;

        const response = [
            '7E8 03 41 00 BF',
            '7E8 10 14 41 0C 00 11 22 33',
            '7E8 21 44 55 66 77'
        ];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(true);
    });

    test('7. Ignores spaces and formats input before checking multi-frame header', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95;

        const response = ['  7E8   10   14  41 '];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(true);
    });

    test('8. Handles missing/empty input lines gracefully', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 95;

        expect(manager.shouldInjectManualFlowControl([])).toBe(false);
        expect(manager.shouldInjectManualFlowControl(['', ' '])).toBe(false);
    });

    test('9. Does not inject if the profile does not match OBDLink score', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 91; // Under 92 (OBDLink limit) -> ELM327_v1.5

        const response = ['7E810 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(false);
    });

    test('10. Works correctly when adapterCapabilityScore is exactly 92', () => {
        const store = useBluetoothStore.getState();
        store.isCloneDevice = false;
        store.adapterCapabilityScore = 92; // Edge of OBDLink profile

        const response = ['7E810 14 41 0C 00 11 22 33'];
        expect(manager.shouldInjectManualFlowControl(response)).toBe(true);
    });
});
