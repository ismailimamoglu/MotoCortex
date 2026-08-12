import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry } from '../profile/AdapterProfileRegistry';
import BluetoothService from '../../api/BluetoothService';

export class ProtocolNegotiator {
    /**
     * Executes the behavioral benchmark to dynamically calculate the adapter Capability Score
     * and classify clone/low-grade devices.
     * 
     * Global-standard handshake init sequence (reference: python-OBD, Car Scanner, Infocar):
     *   ATZ → 500ms → ATE0 → ATL0 → ATH1 → ATS0 → ATSTFF → ATI → ATRV → ATDP
     * 
     * Key insight: ATE0 (echo off) MUST come before any info commands (ATI, ATRV, ATDP)
     * because clone ELM327 v1.5 adapters echo commands back by default, polluting response parsing.
     */
    public static async runBenchmark(): Promise<number> {
        const store = useBluetoothStore.getState();
        store.addLog('CLEAN_INIT: Initializing adapter UART line (global-standard sequence)...');

        try {
            OBDCommandQueue.resetStallCounter();

            // ── Step 1: Adapter Reset ────────────────────────────────────
            // ATZ sends a soft reset. If it returns '?' (common on cheapest clones), fall back to ATWS (warm start).
            const atzRes = await OBDCommandQueue.add('ATZ', 5000).catch(() => '');
            OBDCommandQueue.flushRxBuffer();

            if ((atzRes || '').includes('?')) {
                store.addLog('CLEAN_INIT: ATZ returned "?", falling back to ATWS (warm start)...');
                await OBDCommandQueue.add('ATWS', 3000).catch(() => {});
                OBDCommandQueue.flushRxBuffer();
            }
            await preciseSleep(500);

            // ── Step 2: Clean Config BEFORE any info queries ─────────────
            // ATE0 must be first — disables echo so ATI/ATRV/ATDP responses aren't polluted
            await OBDCommandQueue.add('ATE0', 1500).catch(() => {});
            await OBDCommandQueue.add('ATL0', 1000).catch(() => {}); // Linefeed off
            await OBDCommandQueue.add('ATH0', 1000).catch(() => {}); // Headers off (Universal OBD2 standard for BLE/Classic/K-Line/CAN)
            await OBDCommandQueue.add('ATS0', 1000).catch(() => {}); // Spaces off (faster parsing)
            await OBDCommandQueue.add('ATSTFF', 1000).catch(() => {}); // Max timeout (clone-tolerant)

            // ── Step 3: Info queries (now echo is off, responses are clean) ──
            const t0 = Date.now();
            let unresponsiveCount = 0;
            const atiRes = await OBDCommandQueue.add('ATI', 5000).catch(() => { unresponsiveCount++; return 'ELM327 v1.5'; });
            const rvRes = await OBDCommandQueue.add('ATRV', 5000).catch(() => { unresponsiveCount++; return '12.0V'; });
            const dpRes = await OBDCommandQueue.add('ATDP', 5000).catch(() => { unresponsiveCount++; return 'AUTO'; });
            const rtt = Math.max(10, Math.round((Date.now() - t0) / 3));

            const cleanFirmware = (atiRes || 'ELM327 v1.5').replace(/[\r\n>]/g, '').trim();
            // Refined clone heuristic: high RTT latency or unresponsive probes indicate clone/low-grade hardware
            const isV15Clone = (cleanFirmware.includes('1.5') && rtt > 60) || rtt > 120 || unresponsiveCount > 0;

            // Behavioral scoring based on RTT latency, probe responsiveness, and firmware integrity
            let score = 98;
            if (isV15Clone) score -= 20;
            if (unresponsiveCount > 0) score -= (unresponsiveCount * 15);
            if (rtt > 80) score -= 15;
            if (rtt > 150) score -= 15;
            score = Math.max(30, Math.min(100, score));

            // Store voltage for battery gate check
            const cleanVoltage = (rvRes || '').replace(/[\r\n>]/g, '').trim();

            store.setSensorData({ 
                adapterCapabilityScore: score,
                isCloneDevice: isV15Clone,
                avgRtt: rtt,
                adapterFirmware: cleanFirmware,
                voltage: cleanVoltage || undefined,
            });

            store.addLog(`CLEAN_INIT_COMPLETE: Adapter initialized (${cleanFirmware}), Voltage=${cleanVoltage}, RTT=${rtt}ms, score=${score}, clone=${isV15Clone}`);
            return score;
        } catch {
            store.setSensorData({ adapterCapabilityScore: 65, isCloneDevice: false, avgRtt: 100 });
            return 65;
        }
    }

    /**
     * Post-reset config is now handled inside runBenchmark() as part of the unified
     * global-standard handshake sequence. This method remains for backwards compatibility
     * but is effectively a no-op since config is already applied.
     */
    public static async applyPostResetConfig(): Promise<void> {
        // Config already applied in runBenchmark() — ATE0, ATL0, ATH1, ATS0, ATSTFF
        // This is a no-op for backwards compatibility with callers.
    }
}

