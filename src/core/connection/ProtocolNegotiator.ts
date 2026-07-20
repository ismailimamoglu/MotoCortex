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
        const benchmarkCommands = ['ATI', '0100', '010C', '0902'];
        let successCount = 0;
        let totalRtt = 0;
        let isV15Clone = false;

        store.addLog('BENCHMARK_START: Commencing behavior-based fingerprinting.');

        // [v7.5.1 FIX-3] COLD RESET & PRE-FLIGHT DRAIN
        // Diagnostic log evidence: ATI → "?" (dirty buffer from prior session).
        // Dirty UART state contaminates benchmark commands, yielding false low scores.
        // Fix: AT Z → hard RX flush → 1200ms hardware cooldown before first benchmark cmd.
        // 1200ms accounts for: ELM327 boot banner flush (≈600ms) + clone adapter UART drain
        // overhead (≈400ms) + margin for slow BLE notification delivery (≈200ms).
        store.addLog('PRE_FLIGHT_DRAIN: Sending AT Z cold reset before benchmark...');
        try {
            await OBDCommandQueue.add('AT Z', 2000);
        } catch {
            store.addLog('PRE_FLIGHT_DRAIN: AT Z command failed or timed out — proceeding with buffer flush.');
        }
        // Rule mandate: Enforce asynchronous drain/flush of serial buffer
        try {
            await BluetoothService.clearBuffer();
        } catch (e) {
            store.addLog(`PRE_FLIGHT_DRAIN: clearBuffer failed: ${e}`);
        }
        OBDCommandQueue.flushRxBuffer(); // Hard-destroy boot banner bytes + prior session garbage
        store.addLog('PRE_FLIGHT_DRAIN: RX buffer flushed. Applying 2000ms hardware cooldown...');
        await preciseSleep(2000); // Hardware settle: ELM boot + BLE drain + clone adapter margin

        for (const cmd of benchmarkCommands) {
            const start = Date.now();
            try {
                const res = await OBDCommandQueue.add(cmd, 2500);
                const elapsed = Date.now() - start;

                if (res.includes('?') || res.toLowerCase().includes('error')) {
                    store.addLog(`BENCHMARK_CMD_DEGRADED: ${cmd} returned invalid response [${res}] in ${elapsed}ms`);
                } else {
                    successCount++;
                    totalRtt += elapsed;
                    store.addLog(`BENCHMARK_CMD_SUCCESS: ${cmd} RTT: ${elapsed}ms`);
                    
                    if (cmd === 'ATI') {
                        const cleanFirmware = res.replace(/[\r\n>]/g, '').trim();
                        store.setSensorData({ adapterFirmware: cleanFirmware });
                        if (cleanFirmware.includes('1.5')) {
                            isV15Clone = true;
                        }
                    }
                }
            } catch (err) {
                store.addLog(`BENCHMARK_CMD_FAIL: ${cmd} failed: ${err}`);
            }
            // Pacing delay to avoid saturating UART line of low-quality clone adapters
            await preciseSleep(200);
        }

        const avgRtt = successCount > 0 ? (totalRtt / successCount) : 1000;
        
        // Behavioral capability scoring algorithm
        let score = 100;
        
        // Deduct for failure rate (4 commands, 25 points each)
        score -= (benchmarkCommands.length - successCount) * 25;

        // Deduct for high latency RTT
        if (avgRtt > 150) {
            score -= Math.min(30, (avgRtt - 150) * 0.1);
        }

        // Deduct if ATI indicates fake v1.5 firmware
        if (isV15Clone) {
            score -= 30;
        }

        const finalScore = Math.max(10, Math.min(100, Math.round(score)));
        const isClone = finalScore < 60;

        store.setSensorData({ 
            adapterCapabilityScore: finalScore,
            isCloneDevice: isClone,
            avgRtt: Math.round(avgRtt)
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
                if (isClone) {
                    await preciseSleep(250);
                }
            } catch (err) {
                store.addLog(`WARN: Profile command [${cmd}] failed: ${err}`);
            }
        }
    }
}
