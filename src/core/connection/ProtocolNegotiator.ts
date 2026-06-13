import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { AdapterProfileRegistry } from '../profile/AdapterProfileRegistry';

export class ProtocolNegotiator {
    /**
     * Executes the behavioral benchmark to dynamically calculate the adapter Capability Score
     * and classify clone/low-grade devices.
     */
    public static async runBenchmark(): Promise<number> {
        const store = useBluetoothStore.getState();
        const benchmarkCommands = ['ATI', 'AT@1', '0100', '010C', '0902'];
        let successCount = 0;
        let totalRtt = 0;
        let atAt1Failed = false;

        store.addLog('BENCHMARK_START: Commencing behavior-based fingerprinting.');

        for (const cmd of benchmarkCommands) {
            const start = Date.now();
            try {
                const res = await OBDCommandQueue.add(cmd, 2500);
                const elapsed = Date.now() - start;

                if (res.includes('?') || res.toLowerCase().includes('error')) {
                    if (cmd === 'AT@1') {
                        atAt1Failed = true;
                    }
                    store.addLog(`BENCHMARK_CMD_DEGRADED: ${cmd} returned invalid response [${res}] in ${elapsed}ms`);
                } else {
                    successCount++;
                    totalRtt += elapsed;
                    store.addLog(`BENCHMARK_CMD_SUCCESS: ${cmd} RTT: ${elapsed}ms`);
                }
            } catch (err) {
                if (cmd === 'AT@1') {
                    atAt1Failed = true;
                }
                store.addLog(`BENCHMARK_CMD_FAIL: ${cmd} failed: ${err}`);
            }
        }

        const avgRtt = successCount > 0 ? (totalRtt / successCount) : 1000;
        
        // Behavioral capability scoring algorithm
        let score = 100;
        
        // Deduct for failure rate
        score -= (benchmarkCommands.length - successCount) * 20;

        // Deduct for high latency RTT
        if (avgRtt > 150) {
            score -= Math.min(30, (avgRtt - 150) * 0.1);
        }

        // Deduct if AT@1 is unsupported (strong indicator of clone hardware firmware limitations)
        if (atAt1Failed) {
            score -= 15;
        }

        const finalScore = Math.max(10, Math.min(100, Math.round(score)));
        const isClone = finalScore < 60;

        store.setSensorData({ 
            adapterCapabilityScore: finalScore,
            isCloneDevice: isClone
        });

        store.addLog(`BENCHMARK_COMPLETE: Calculated score=${finalScore}, isCloneDevice=${isClone}`);
        store.addStructuredLog({ 
            event: 'ADAPTER_FINGERPRINT_SCORE', 
            score: finalScore, 
            isClone,
            avgRtt
        });

        return finalScore;
    }

    /**
     * Replays the profile-specific configuration commands post AT Z reset.
     */
    public static async applyPostResetConfig(): Promise<void> {
        const store = useBluetoothStore.getState();
        const score = store.adapterCapabilityScore;
        const isClone = store.isCloneDevice;

        const commands = AdapterProfileRegistry.getReinitCommands(score, isClone);
        store.addLog(`PROFILE_INJECTION: Replaying profile commands: ${commands.join(', ')}`);

        for (const cmd of commands) {
            try {
                await OBDCommandQueue.add(cmd, 1500);
            } catch (err) {
                store.addLog(`WARN: Profile command [${cmd}] failed: ${err}`);
            }
        }
    }
}
