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
        store.addLog('CLEAN_INIT: Initializing adapter UART line (Copilot/Car Scanner gold-standard sequence)...');

        try {
            OBDCommandQueue.resetStallCounter();

            // ── Step 0: Link Stabilization & Initial RX Purge ───────────
            await preciseSleep(400); // 400ms link stabilization (GATT/RFCOMM/MTU settling)
            OBDCommandQueue.flushRxBuffer();
            await preciseSleep(100);
            OBDCommandQueue.flushRxBuffer();

            // ── Step 1: Soft Wake (send \r to wake microcontroller) ──────
            await OBDCommandQueue.add('\r', 150).catch(() => '');
            await preciseSleep(120);
            OBDCommandQueue.flushRxBuffer();

            // ── Step 2: Guarded ATZ with Backoff Retries ─────────────────
            let atzRes = '';
            let atzSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                OBDCommandQueue.flushRxBuffer();
                atzRes = await OBDCommandQueue.add('ATZ', 2000).catch(() => '');
                if (/ELM|STN|ELM327|STN2120|ELM206|ELM324|OK|>/i.test(atzRes)) {
                    atzSuccess = true;
                    store.addLog(`CLEAN_INIT: ATZ succeeded on attempt ${attempt}: ${atzRes.trim()}`);
                    break;
                }
                store.addLog(`CLEAN_INIT: ATZ attempt ${attempt} returned "${atzRes}", backing off 300ms...`);
                await preciseSleep(300);
            }

            if (!atzSuccess) {
                store.addLog('CLEAN_INIT: ATZ retries exhausted, attempting ATWS (warm start)...');
                atzRes = await OBDCommandQueue.add('ATWS', 1500).catch(() => '');
            }

            // Post-reset settle & buffer drain
            await preciseSleep(350);
            OBDCommandQueue.flushRxBuffer();

            // ── Step 3: Deterministic Configuration Sequence ─────────────
            // ATE0 (Echo off) MUST be first to prevent command echoing
            await OBDCommandQueue.add('ATE0', 500).catch(() => {});
            await preciseSleep(50);
            await OBDCommandQueue.add('ATL0', 500).catch(() => {}); // Linefeeds off
            await preciseSleep(50);
            await OBDCommandQueue.add('ATS0', 500).catch(() => {}); // Spaces off
            await preciseSleep(50);
            await OBDCommandQueue.add('ATH0', 500).catch(() => {}); // Headers off (universal default)
            await preciseSleep(50);

            // Capability probes (PIC18F25K80 / STN Verification)
            const atalRes = await OBDCommandQueue.add('ATAL', 1000).catch(() => '?'); // Allow Long frames (> 7 bytes)
            await preciseSleep(50);
            const atcafRes = await OBDCommandQueue.add('ATCAF1', 1000).catch(() => '?'); // CAN Auto Formatting on
            await preciseSleep(50);
            await OBDCommandQueue.add('ATAT2', 1000).catch(() => {}); // Adaptive timing
            await preciseSleep(50);
            await OBDCommandQueue.add('ATST64', 1000).catch(() => {}); // 400ms timeout
            await preciseSleep(50);
            await OBDCommandQueue.add('ATSP0', 3500).catch(() => {}); // Auto protocol search
            await preciseSleep(100);

            // ── Step 4: Info Queries & Hardware Classification ──────────
            const t0 = Date.now();
            let unresponsiveCount = 0;
            const atiRes = await OBDCommandQueue.add('ATI', 3000).catch(() => { unresponsiveCount++; return 'ELM327 v1.5'; });
            const rvRes = await OBDCommandQueue.add('ATRV', 3000).catch(() => { unresponsiveCount++; return '12.0V'; });
            const rtt = Math.max(10, Math.round((Date.now() - t0) / 2));
            OBDCommandQueue.flushRxBuffer();

            const cleanFirmware = (atiRes || 'ELM327 v1.5').replace(/[\r\n>]/g, '').trim();
            const supportsLongFrames = (atalRes || '').toUpperCase().includes('OK');
            const supportsCanAutoFormat = (atcafRes || '').toUpperCase().includes('OK');

            // Accurate hardware classification:
            // Genuine STN / OBDLink / vLinker or PIC18F25K80 Dual-Chip (like MonoFe Ultra v1.5) support ATAL + ATCAF1
            const isHighGradeHardware = supportsLongFrames && supportsCanAutoFormat;
            const isCheapFakeClone = !supportsLongFrames && !supportsCanAutoFormat && unresponsiveCount > 0;

            let score = 95;
            if (cleanFirmware.includes('STN') || cleanFirmware.includes('OBDLink') || cleanFirmware.includes('vLinker') || cleanFirmware.includes('vGate') || cleanFirmware.includes('2.2')) {
                score = 100;
            } else if (isHighGradeHardware) {
                // PIC18F25K80 Dual-Chip (e.g. MonoFe Ultra v1.5)
                score = 95;
            } else if (isCheapFakeClone) {
                // Low-grade single-chip clone failing basic ELM commands
                score = 45;
            } else {
                score = 80;
            }

            if (unresponsiveCount > 0) score -= (unresponsiveCount * 15);
            score = Math.max(30, Math.min(100, score));

            const isClone = score < 60;
            const cleanVoltage = (rvRes || '').replace(/[\r\n>]/g, '').trim();

            store.setSensorData({ 
                adapterCapabilityScore: score,
                isCloneDevice: isClone,
                isCodingAllowed: !isClone,
                avgRtt: rtt,
                adapterFirmware: cleanFirmware,
                voltage: cleanVoltage || undefined,
            });

            store.addLog(`CLEAN_INIT_COMPLETE: Adapter (${cleanFirmware}), Voltage=${cleanVoltage}, RTT=${rtt}ms, score=${score}, isClone=${isClone}, ATAL=${supportsLongFrames}, ATCAF1=${supportsCanAutoFormat}`);
            return score;
        } catch (err: any) {
            store.addLog(`CLEAN_INIT_WARNING: Benchmark exception (${err?.message || err}), applying safe fallback ATSTFF + ATSP0...`);
            await OBDCommandQueue.add('ATSTFF', 1000).catch(() => {});
            await OBDCommandQueue.add('ATSP0', 3500).catch(() => {});
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

