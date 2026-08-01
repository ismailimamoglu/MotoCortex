// src/core/connection/ModuleDiscoveryManager.ts
// MotoCortex v8.1.0 - Multi-ECU Module Discovery Engine (Veriokuma Aligned)

import OBDCommandQueue from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export interface EcuModuleDescriptor {
    id: string;
    name: string;
    txHeader: string;
    rxHeader: string;
    isSafetyCritical: boolean;
    isDetected: boolean;
    responseSnippet?: string;
}

export class ModuleDiscoveryManager {
    /**
     * Authoritative ECU Module Address Registry
     * Directly aligned with project documentation (veriokuma.md) and safety gates.
     */
    public static readonly MODULE_REGISTRY: EcuModuleDescriptor[] = [
        { id: 'ECM', name: 'Engine Control Module', txHeader: '7E0', rxHeader: '7E8', isSafetyCritical: false, isDetected: false },
        { id: 'TCM', name: 'Transmission Control Module', txHeader: '7E1', rxHeader: '7E9', isSafetyCritical: false, isDetected: false },
        { id: 'ABS', name: 'Brake / ABS / ESC Controller', txHeader: '7D0', rxHeader: '7D8', isSafetyCritical: true, isDetected: false },
        { id: 'SRS', name: 'Airbag / SRS Controller', txHeader: '770', rxHeader: '778', isSafetyCritical: true, isDetected: false },
        { id: 'BCM', name: 'Body Control Module', txHeader: '720', rxHeader: '728', isSafetyCritical: false, isDetected: false },
    ];

    /**
     * Scans the vehicle data bus for active ECU modules using Scoped Header Probing.
     */
    public static async discoverModules(): Promise<EcuModuleDescriptor[]> {
        const store = useBluetoothStore.getState();
        store.addLog('MODULE_DISCOVERY: Starting multi-ECU bus probe with verified headers...');

        const activeModules: EcuModuleDescriptor[] = [];

        for (const moduleDef of this.MODULE_REGISTRY) {
            try {
                store.addLog(`MODULE_DISCOVERY: Probing ${moduleDef.id} [${moduleDef.name}] at Header ${moduleDef.txHeader}...`);
                await OBDCommandQueue.add(`AT SH ${moduleDef.txHeader}`, 800).catch(() => {});

                // Mode 01 PID 00 Probe
                const probeRes = await OBDCommandQueue.add('01 00', 1500);
                const cleanRes = (probeRes || '').replace(/\s+/g, '').toUpperCase();

                const isResponsive = cleanRes.includes('4100') &&
                    !cleanRes.includes('NODATA') &&
                    !cleanRes.includes('ERROR') &&
                    !cleanRes.includes('CANERROR') &&
                    !cleanRes.includes('?');

                if (isResponsive) {
                    const discovered: EcuModuleDescriptor = {
                        ...moduleDef,
                        isDetected: true,
                        responseSnippet: cleanRes.substring(0, 30),
                    };
                    activeModules.push(discovered);
                    store.addLog(`MODULE_DISCOVERY_SUCCESS: Active module found: ${moduleDef.id} (${moduleDef.name}) [Tx: ${moduleDef.txHeader}]`);
                } else {
                    store.addLog(`MODULE_DISCOVERY: Module ${moduleDef.id} not responsive.`);
                }
            } catch (err: any) {
                store.addLog(`MODULE_DISCOVERY_WARN: Probe failed for ${moduleDef.id}: ${err?.message || err}`);
            }
        }

        // Restore default Engine target header (7E0)
        await OBDCommandQueue.add('AT SH 7E0', 1000).catch(() => {});

        store.addLog(`MODULE_DISCOVERY_COMPLETE: Total active modules detected: ${activeModules.length}`);
        return activeModules;
    }
}
