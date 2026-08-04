// src/core/connection/CapabilityDiscoveryManager.ts
// MotoCortex v7.9.9 - Hardened Multi-ECU Routing Engine (Type-Fixed)

import OBDCommandQueue from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class CapabilityDiscoveryManager {
    private static DEFAULT_EMERGENCY_PIDS = ['0C@7E8', '0D@7E8', '05@7E8', '11@7E8'];

    /**
     * Discovers supported PIDs and constructs a deterministic PID-to-ECU Routing Table.
     * Uses Explicit Node Multiplexing (PID@HEADER) to avoid transmission data masking.
     */
    public static async discoverSupportedPids(): Promise<void> {
        const store = useBluetoothStore.getState();
        store.addLog('CAPABILITY_DISCOVERY: Starting multi-node routing table discovery.');

        const blockPids = ['00', '20', '40', '60', '80', 'A0', 'C0'];
        const blockStatus: Record<string, 'supported' | 'unsupported' | 'unknown'> = {};

        const pidRoutingTable: Record<string, string[]> = {};
        const masterSupportedPids: string[] = []; // Biçim: "PID@HEADER" (Örn: "0C@7E8")

        for (const block of blockPids) {
            const cmd = `01 ${block}`;
            let success = false;
            let attempts = 0;

            while (attempts < 2 && !success) {
                attempts++;
                try {
                    store.addLog(`CAPABILITY_DISCOVERY: Probing block 01${block} (Attempt ${attempts}/2)`);
                    const res = await OBDCommandQueue.add(cmd, 1500);

                    const clean = res ? res.replace(/\s+/g, '').toUpperCase() : '';
                    const hasData = clean.includes('41' + block) &&
                        !clean.includes('NODATA') &&
                        !clean.includes('ERROR') &&
                        !clean.includes('CANERROR') &&
                        !clean.includes('?');

                    if (hasData) {
                        this.parseAndRoutePids(res, block, pidRoutingTable, masterSupportedPids);
                        blockStatus[cmd] = 'supported';
                        success = true;
                        store.addLog(`CAPABILITY_DISCOVERY: Block 01${block} mapped. Total unique nodes in registry: ${masterSupportedPids.length}`);

                        const nextBlockHex = (parseInt(block, 16) + 0x20).toString(16).toUpperCase();
                        const blockCheckFound = masterSupportedPids.some(p => p.startsWith(nextBlockHex));
                        if (!blockCheckFound && block !== '00') {
                            store.addLog(`CAPABILITY_DISCOVERY: Perimeter complete. Next block ${nextBlockHex} absent.`);
                            break;
                        }
                    } else {
                        store.addLog(`CAPABILITY_DISCOVERY: Block 01${block} response invalid.`);
                    }
                } catch (err) {
                    store.addLog(`CAPABILITY_DISCOVERY: Block 01${block} exception: ${err}`);
                }
            }

            if (!success) {
                blockStatus[cmd] = 'unknown';
                break;
            }
        }

        if (masterSupportedPids.length === 0) {
            this.DEFAULT_EMERGENCY_PIDS.forEach(pKey => {
                const [pid, node] = pKey.split('@');
                pidRoutingTable[pid] = [node];
            });

            // TypeScript Tür Katı Kuralını Esnet (as any)
            store.setSensorData({
                supportedPids: this.DEFAULT_EMERGENCY_PIDS,
                pidRoutingTable: pidRoutingTable,
                pidBlocksStatus: blockStatus
            } as any);
        } else {
            ['0C', '0D', '05', '11'].forEach(pid => {
                if (!pidRoutingTable[pid]) pidRoutingTable[pid] = ['7E8'];
                if (!masterSupportedPids.includes(`${pid}@7E8`)) masterSupportedPids.push(`${pid}@7E8`);
            });

            // TypeScript Tür Katı Kuralını Esnet (as any)
            store.setSensorData({
                supportedPids: masterSupportedPids,
                pidRoutingTable: pidRoutingTable,
                pidBlocksStatus: blockStatus
            } as any);
        }
    }

    /**
     * Multiplexing Aware Parser Engine
     */
    private static parseAndRoutePids(response: string, offsetHex: string, table: Record<string, string[]>, masterList: string[]): void {
        const lines = response.toUpperCase().split(/[\r\n]+/).map(l => l.trim().replace(/\s+/g, ''));
        const marker = '41' + offsetHex.toUpperCase();
        const offset = parseInt(offsetHex, 16);

        for (const line of lines) {
            const idx = line.indexOf(marker);
            if (idx === -1) continue;

            let nodeHeader = "7E8";
            if (line.startsWith('7E8') || line.startsWith('7E9') || line.startsWith('7EA') || line.startsWith('7EB')) {
                nodeHeader = line.substring(0, 3);
            } else if (line.startsWith('18DAF1')) {
                nodeHeader = line.substring(0, 8);
            }

            const bitmaskHex = line.substring(idx + marker.length, idx + marker.length + 8);
            if (bitmaskHex.length < 8) continue;

            for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
                const byteVal = parseInt(bitmaskHex.substring(byteIdx * 2, byteIdx * 2 + 2), 16);
                if (isNaN(byteVal)) continue;

                for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
                    const isSupported = (byteVal & (1 << (7 - bitIdx))) !== 0;
                    if (isSupported) {
                        const pidNum = offset + (byteIdx * 8) + bitIdx + 1;
                        const pidHex = pidNum.toString(16).toUpperCase().padStart(2, '0');

                        if (!table[pidHex]) table[pidHex] = [];
                        if (!table[pidHex].includes(nodeHeader)) table[pidHex].push(nodeHeader);

                        const multiplexKey = `${pidHex}@${nodeHeader}`;
                        if (!masterList.includes(multiplexKey)) masterList.push(multiplexKey);
                    }
                }
            }
        }
    }

    /**
     * Probes supported UDS diagnostic services (0x10, 0x22, 0x19, 0x27, 0x31) on Engine ECU.
     */
    public static async probeUdsServices(): Promise<Record<string, boolean>> {
        const store = useBluetoothStore.getState();
        store.addLog('CAPABILITY_DISCOVERY: Probing UDS Diagnostic Services (0x10, 0x22, 0x19, 0x27)...');

        const udsServicesMap: Record<string, boolean> = {
            '0x10_DiagnosticSession': false,
            '0x22_ReadDataByIdentifier': false,
            '0x19_ReadDTCInformation': false,
            '0x27_SecurityAccess': false,
        };

        try {
            await OBDCommandQueue.add('AT SH 7E0', 800).catch(() => {});

            // Probe 0x10 Diagnostic Session
            const res10 = await OBDCommandQueue.add('10 01', 2000).catch(() => '');
            if (res10 && (res10.includes('50') || res10.includes('7F 10 78'))) {
                udsServicesMap['0x10_DiagnosticSession'] = true;
            }

            // Probe 0x22 ReadDataByIdentifier (VIN DID F190)
            const res22 = await OBDCommandQueue.add('22 F1 90', 2500).catch(() => '');
            if (res22 && (res22.includes('62 F1 90') || res22.includes('62F190'))) {
                udsServicesMap['0x22_ReadDataByIdentifier'] = true;
            }

            // Probe 0x19 ReadDTCInformation
            const res19 = await OBDCommandQueue.add('19 02 08', 2500).catch(() => '');
            if (res19 && (res19.includes('59') || res19.includes('7F 19 78'))) {
                udsServicesMap['0x19_ReadDTCInformation'] = true;
            }

            // Probe 0x27 Security Access (Seed Request)
            const res27 = await OBDCommandQueue.add('27 01', 2500).catch(() => '');
            if (res27 && (res27.includes('67 01') || res27.includes('6701') || res27.includes('7F 27 33') || res27.includes('7F 27 7E'))) {
                udsServicesMap['0x27_SecurityAccess'] = true;
            }
        } catch (err: any) {
            store.addLog(`CAPABILITY_DISCOVERY_WARN: UDS probe exception: ${err?.message || err}`);
        }

        store.addLog(`CAPABILITY_DISCOVERY: UDS Services map: ${JSON.stringify(udsServicesMap)}`);
        return udsServicesMap;
    }

    /**
     * [Gap-fix] Probes manufacturer-specific (Mode 22) PIDs for the vehicle's
     * detected make via OemPidRegistry. This is what actually turns the OEM
     * PID data added for VAG/BMW/Mercedes/Ford/Toyota into a live capability,
     * instead of a static table nothing ever queries.
     *
     * Safe by construction: only runs for makes present in OemPidRegistry,
     * switches ECU header per-PID via "AT SH", and any single PID failure
     * (unsupported DID, NO DATA, negative response) is swallowed so it can
     * never block or fail the main connection/telemetry flow.
     */
    public static async discoverOemPids(make: string): Promise<Record<string, boolean>> {
        const store = useBluetoothStore.getState();
        const { OemPidRegistry } = require('../pids/OemPidRegistry');
        const oemPids = OemPidRegistry.getPidsForMake(make);
        const result: Record<string, boolean> = {};

        if (oemPids.length === 0) {
            return result;
        }

        store.addLog(`CAPABILITY_DISCOVERY: Probing ${oemPids.length} OEM-specific PID(s) for make="${make}"...`);
        let lastHeader: string | null = null;

        for (const def of oemPids) {
            try {
                if (def.ecuHeader && def.ecuHeader !== lastHeader) {
                    await OBDCommandQueue.add(`AT SH ${def.ecuHeader}`, 800).catch(() => {});
                    lastHeader = def.ecuHeader;
                }
                const cmd = `22 ${def.pid.substring(0, 2)} ${def.pid.substring(2, 4)}`;
                const res = await OBDCommandQueue.add(cmd, 2000).catch(() => '');
                const clean = res ? res.replace(/\s+/g, '').toUpperCase() : '';
                const expectedEcho = `62${def.pid.toUpperCase()}`;
                const supported = clean.includes(expectedEcho) && !clean.includes('NODATA') && !clean.includes('7F22');
                result[def.name] = supported;
            } catch (err: any) {
                result[def.name] = false;
                store.addLog(`CAPABILITY_DISCOVERY_WARN: OEM PID ${def.name} probe failed: ${err?.message || err}`);
            }
        }

        store.addLog(`CAPABILITY_DISCOVERY: OEM PID map (${make}): ${JSON.stringify(result)}`);
        return result;
    }
}
export default CapabilityDiscoveryManager;