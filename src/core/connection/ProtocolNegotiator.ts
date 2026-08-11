import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry } from '../profile/AdapterProfileRegistry';
import BluetoothService from '../../api/BluetoothService';

export class ProtocolNegotiator {
    /**
     * Executes the behavioral benchmark to dynamically calculate the adapter Capability Score
     * and classify clone/low-grade devices.
     */
    public static async runBenchmark(): Promise<number> {
        const store = useBluetoothStore.getState();
        store.addLog('CLEAN_INIT: Initializing adapter UART line...');

        try {
            OBDCommandQueue.resetStallCounter();
            await OBDCommandQueue.add('ATZ', 5000).catch(() => {});
            OBDCommandQueue.flushRxBuffer();
            await preciseSleep(400);

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

            store.setSensorData({ 
                adapterCapabilityScore: score,
                isCloneDevice: isV15Clone,
                avgRtt: rtt,
                adapterFirmware: cleanFirmware,
            });

            store.addLog(`CLEAN_INIT_COMPLETE: Adapter initialized (${cleanFirmware}), RTT=${rtt}ms, score=${score}`);
            return score;
        } catch {
            store.setSensorData({ adapterCapabilityScore: 65, isCloneDevice: false, avgRtt: 100 });
            return 65;
        }
    }

    /**
     * Replays the profile-specific configuration commands post AT Z reset.
     */
    public static async applyPostResetConfig(): Promise<void> {
        const store = useBluetoothStore.getState();
        store.addLog('CLEAN_CONFIG: Applying clean ATE0 setup...');
        try {
            await OBDCommandQueue.add('ATE0', 1000).catch(() => {});
        } catch {}
    }
}
