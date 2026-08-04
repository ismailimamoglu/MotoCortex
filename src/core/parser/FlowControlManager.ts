import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry, AdapterProfile } from '../transport/AdapterProfileRegistry';

export class FlowControlManager {
    /**
     * [Gap-fix] Resolves the brand-specific AdapterProfile.
     *
     * Previously this only ever matched 'OBDLink' (score >= 92) or fell back
     * to 'ELM327_v1.5'/'CLONE_v2.1' — meaning every other named entry in
     * AdapterProfileRegistry (e.g. 'Vgate') could never actually be selected,
     * regardless of what adapter the user owned. adapterFirmware already
     * captures the raw "ATI"/"AT@1" identity string during ProtocolNegotiator's
     * post-reset benchmark, but nothing consulted it for profile selection.
     */
    private resolveAdapterProfile(): AdapterProfile {
        const store = useBluetoothStore.getState();
        const firmware = (store.adapterFirmware || '').toUpperCase();

        if (firmware) {
            if (firmware.includes('OBDLINK')) return AdapterProfileRegistry.OBDLink;
            if (firmware.includes('VGATE') || firmware.includes('ICAR')) return AdapterProfileRegistry.Vgate;
            if (firmware.includes('V1.5') || firmware.includes('V 1.5')) return AdapterProfileRegistry['ELM327_v1.5'];
        }

        if (store.isCloneDevice) {
            return AdapterProfileRegistry['CLONE_v2.1'];
        }

        const score = store.adapterCapabilityScore;
        if (score >= 92) {
            return AdapterProfileRegistry.OBDLink;
        }

        return AdapterProfileRegistry['ELM327_v1.5']; // default fallback
    }

    shouldInjectManualFlowControl(responseLines: string[]): boolean {
        const profile = this.resolveAdapterProfile();

        // Only inject if manual flow control is supported by the profile (Condition 5)
        if (!profile.supportsManualFlowControl) {
            return false;
        }

        for (const line of responseLines) {
            const clean = line.toUpperCase().replace(/\s+/g, '');
            // Multi-frame starts with 7E8 10 xx or 18DAF110 10 xx
            if (/(7E810|18DAF11010)/.test(clean)) {
                return true;
            }
        }

        return false;
    }
}

export default new FlowControlManager();
