import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry } from '../transport/AdapterProfileRegistry';

export class FlowControlManager {
    shouldInjectManualFlowControl(responseLines: string[]): boolean {
        const store = useBluetoothStore.getState();
        
        let profile = AdapterProfileRegistry['ELM327_v1.5']; // default fallback
        
        if (store.isCloneDevice) {
            profile = AdapterProfileRegistry['CLONE_v2.1'];
        } else {
            const score = store.adapterCapabilityScore;
            if (score >= 92) {
                profile = AdapterProfileRegistry.OBDLink;
            }
        }

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
