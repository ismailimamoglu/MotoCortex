// src/core/connection/PollingOrchestrator.ts
// MotoCortex v7.9.9 - Hardened Multiplexed Node-Batched Telemetry Orchestrator

import OBDCommandQueue from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class PollingOrchestrator {
    private static isPollingActive = false;
    private static currentActiveHeader = '7E8';

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

        // 2. ADIM: Deterministik Güvenli Canlı Döngü
        while (this.isPollingActive) {
            try {
                for (const [ecuHeader, pids] of batchedQueue.entries()) {
                    if (!this.isPollingActive) break;

                    // --- KADEMELİ FİLTRE 1: DONANIM SEVİYESİ ACK-CHECK ---
                    if (this.currentActiveHeader !== ecuHeader) {
                        const ack = await OBDCommandQueue.add(`AT SH ${ecuHeader}`, 500);
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
                        const cmd = `01 ${pid}`;
                        const timeout = ecuHeader === '7E8' ? 400 : 800; // Şanzıman/Batarya için hantal toleransı

                        const rawResponse = await OBDCommandQueue.add(cmd, timeout);
                        const cleanResponse = rawResponse.toUpperCase().replace(/\s+/g, '');

                        // Sinyal yoksa veya donanım kilitlendiyse doğrudan devam et
                        if (cleanResponse.includes("NODATA") || cleanResponse.includes("CANERROR")) {
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
                        // ----------------------------------------------------------------

                        // Veri jilet gibi temiz; parser katmanına güvenle fırlatılabilir
                    }
                }

                // BLE veri hattı ve UART buffer sönümlenme payı
                await new Promise(resolve => setTimeout(resolve, 15));

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