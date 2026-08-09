// src/core/connection/PollingOrchestrator.ts
// MotoCortex v7.9.9 - Hardened Multiplexed Node-Batched Telemetry Orchestrator

import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class PollingOrchestrator {
    private static isPollingActive = false;
    private static currentActiveHeader = '7E8';
    private static blacklistedPids = new Set<string>();

    /**
     * Start high-frequency multiplexed node-batched telemetry loop with Routing-Drift Guards.
     * @param requestedKeys Array of requested sensors in "PID@HEADER" format (e.g., "0C@7E8")
     */
    public static async startPolling(requestedKeys: string[]): Promise<void> {
        const store = useBluetoothStore.getState();

        if (this.isPollingActive) {
            store.addLog('POLLING_ORCHESTRATOR: Loop already active. Command bypassed.');
            return;
        }

        this.isPollingActive = true;
        this.blacklistedPids.clear();
        OBDCommandQueue.setPollingActive(true);
        store.addLog('POLLING_ORCHESTRATOR: Commencing Hardened Multiplexed Telemetry Pipeline.');

        // 1. ADIM: Sensör isteklerini hedef donanım düğümlerine göre kümele (Batching)
        const batchedQueue = new Map<string, string[]>(); // ECU_HEADER -> PID[]

        for (const key of requestedKeys) {
            if (!key.includes('@')) continue;
            const [pid, ecuHeader] = key.split('@');

            if (!batchedQueue.has(ecuHeader)) {
                batchedQueue.set(ecuHeader, []);
            }
            batchedQueue.get(ecuHeader)!.push(pid);
        }

        // 2. ADIM: Donanım Kalitesine Göre Adaptif Limitlerin Hesaplanması
        const score = store.adapterCapabilityScore || 100;
        
        let interLoopDelay = 15;
        let cmdTimeoutBase = 400;
        let cmdPacingDelay = 5;

        if (score >= 75) {
            // Yüksek kaliteli / orijinal adaptörler: Yüksek hız, JS Event Loop ve Hermes HadesGC için 16ms güvenli ara
            interLoopDelay = 16; 
            cmdTimeoutBase = 150;
            cmdPacingDelay = 2;
        } else if (score < 60) {
            // Düşük kaliteli / klon adaptörler: Güvenli yavaş akış, tampon taşmasını engeller
            interLoopDelay = 50;
            cmdTimeoutBase = 500;
            cmdPacingDelay = 15;
        }

        store.addLog(`POLLING_ORCHESTRATOR: Target pacing parameters computed. Score=${score}, interLoopDelay=${interLoopDelay}ms, cmdTimeoutBase=${cmdTimeoutBase}ms, cmdPacingDelay=${cmdPacingDelay}ms`);

        let lastVoltageReadTime = 0;

        while (this.isPollingActive) {
            try {
                // Periodically query battery voltage via ATRV (every 5 seconds)
                const now = Date.now();
                if (now - lastVoltageReadTime > 5000) {
                    try {
                        await OBDCommandQueue.add('ATRV', cmdTimeoutBase);
                        lastVoltageReadTime = now;
                    } catch (e) {
                        store.addLog(`POLLING_ORCHESTRATOR: ATRV query failed: ${e}`);
                    }
                }

                for (const [ecuHeader, pids] of batchedQueue.entries()) {
                    if (!this.isPollingActive) break;

                    // --- KADEMELİ FİLTRE 1: DONANIM SEVİYESİ ACK-CHECK ---
                    if (this.currentActiveHeader !== ecuHeader) {
                        const ack = await OBDCommandQueue.add(`AT SH ${ecuHeader}`, cmdTimeoutBase);
                        const cleanAck = ack.toUpperCase().replace(/\s+/g, '');

                        // Eğer klon cihaz komutu yuttuysa veya '?' fırlattıysa acil kurtarma tetikle
                        if (cleanAck.includes('?') || cleanAck.includes('ERROR')) {
                            store.addLog(`WARN: AT SH ${ecuHeader} rejected by hardware with: [${ack}]. Re-enforcing reset.`);
                            this.currentActiveHeader = 'UNKNOWN'; // State kirliliğini temizle
                            await OBDCommandQueue.add("AT Z", 2000); // Donanımı dürt
                            break; // Bu düğüm grubunu pas geç, sonraki döngü sıfırdan kurulsun
                        }

                        this.currentActiveHeader = ecuHeader; // Donanım mühürlendi kabullenmesi
                    }

                    // Bu düğüme ait tüm PID'leri ardışık olarak patlat
                    for (const pid of pids) {
                        if (this.blacklistedPids.has(pid)) continue;

                        const cmd = `01 ${pid}`;
                        const timeout = ecuHeader === '7E8' ? cmdTimeoutBase : (cmdTimeoutBase * 2); // Şanzıman/Batarya için hantal toleransı

                        try {
                            const rawResponse = await OBDCommandQueue.add(cmd, timeout);
                            const cleanResponse = rawResponse.toUpperCase().replace(/\s+/g, '');

                            // Sinyal yoksa veya donanım kilitlendiyse doğrudan devam et
                            if (cleanResponse.includes("NODATA") || cleanResponse.includes("CANERROR") || cleanResponse === '?') {
                                store.addLog(`POLLING_ORCHESTRATOR: PID ${pid} returned NODATA/Error. Blacklisting.`);
                                this.blacklistedPids.add(pid);
                                continue;
                            }

                            // --- KADEMELİ FİLTRE 2: ELEKTRİKSEL HEADER DRIFT VERIFICATION ---
                            // Şanzıman (7E9) beklerken satır başından Motor (7E8) verisi sızdıysa anomalidir!
                            if (ecuHeader === '7E9' && cleanResponse.includes('7E841')) {
                                store.addLog(`CRITICAL ANOMALY: Routing Drift caught! Expected Node 7E9, but Node 7E8 hijacked the line. Payload: [${rawResponse}]`);
                                this.currentActiveHeader = 'UNKNOWN'; // Klon cihazın sahte state'ini düşür
                                break; // Döngüyü kır, bir sonraki turda AT SH'ı yeniden göndermeye zorla
                            }

                            if (ecuHeader === '7E8' && cleanResponse.includes('7E941')) {
                                store.addLog(`CRITICAL ANOMALY: Reverse Routing Drift caught! Expected Node 7E8, but Node 7E9 hijacked the line.`);
                                this.currentActiveHeader = 'UNKNOWN';
                                break;
                            }
                        } catch (err: any) {
                            if (err?.message?.includes('Timeout')) {
                                store.addLog(`POLLING_ORCHESTRATOR: PID ${pid} timed out. Blacklisting.`);
                                this.blacklistedPids.add(pid);
                            }
                            continue;
                        }

                        // Komutlar arası dinlenme payı (Adaptive Pacing)
                        if (cmdPacingDelay > 0) {
                            await preciseSleep(cmdPacingDelay);
                        }
                    }
                }

                // BLE veri hattı ve UART buffer sönümlenme payı (Adaptive Loop Delay)
                await preciseSleep(interLoopDelay);

            } catch (error) {
                store.addLog(`POLLING_ORCHESTRATOR: Fatal Exception inside loop: ${error}`);
                if (store.connectionState === 'DISCONNECTED') {
                    this.isPollingActive = false;
                }
            }
        }
    }

    public static stopPolling(): void {
        this.isPollingActive = false;
        OBDCommandQueue.setPollingActive(false);
        this.currentActiveHeader = '7E8';
    }
}
export default PollingOrchestrator;