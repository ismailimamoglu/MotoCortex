// src/core/connection/PollingOrchestrator.ts
// MotoCortex v7.9.9 - Hardened Multiplexed Node-Batched Telemetry Orchestrator

import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class PollingOrchestrator {
    private static isPollingActive = false;
    private static isPerformanceMode = false;
    private static currentActiveHeader = '7E8';
    private static blacklistedPids = new Set<string>();

    public static setPerformanceModePriority(active: boolean): void {
        this.isPerformanceMode = active;
        const store = useBluetoothStore.getState();
        store.addLog(`POLLING_ORCHESTRATOR: Performance Mode Priority ${active ? 'ENABLED (Speed PID 010D high-frequency 15Hz)' : 'DISABLED'}`);
    }

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

        const keysToProcess = (requestedKeys && requestedKeys.length > 0)
            ? requestedKeys
            : ['0C@7E8', '0D@7E8', '04@7E8'];

        for (const key of keysToProcess) {
            if (!key.includes('@')) {
                // If standard PID without @ header, route to 7E8 by default
                if (!batchedQueue.has('7E8')) batchedQueue.set('7E8', []);
                batchedQueue.get('7E8')!.push(key.trim());
                continue;
            }
            const [pid, ecuHeader] = key.split('@');

            const targetHeader = ecuHeader || '7E8';
            if (!batchedQueue.has(targetHeader)) {
                batchedQueue.set(targetHeader, []);
            }
            batchedQueue.get(targetHeader)!.push(pid.trim());
        }

        // 2. ADIM: Donanım Kalitesine Göre Adaptif Limitlerin Hesaplanması
        const score = store.adapterCapabilityScore || 100;
        const protocol = store.protocol || '';
        const isCanProtocol = protocol.toUpperCase().includes('CAN') || protocol.includes('6') || protocol.includes('7');
        
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

        store.addLog(`POLLING_ORCHESTRATOR: Target pacing parameters computed. Score=${score}, isCAN=${isCanProtocol}, interLoopDelay=${interLoopDelay}ms, cmdTimeoutBase=${cmdTimeoutBase}ms, cmdPacingDelay=${cmdPacingDelay}ms`);

        let lastVoltageReadTime = 0;
        const batchEntries = Array.from(batchedQueue.entries());

        while (this.isPollingActive) {
            try {
                // ============================================================
                // PERFORMANCE MODE: High-frequency 010D (Speed) polling for 0-100 km/h measurement
                // Suspends all other PIDs to achieve 15+ Hz sampling on Speed PID
                // ============================================================
                if (this.isPerformanceMode) {
                    try {
                        await OBDCommandQueue.add('01 0D', cmdTimeoutBase);
                    } catch (e) {
                        // Don't blacklist speed PID in performance mode — keep retrying
                    }
                    await preciseSleep(2);
                    continue; // Skip normal batch processing entirely
                }

                // Periodically query battery voltage via ATRV (every 10 seconds)
                const now = Date.now();
                if (now - lastVoltageReadTime > 10000) {
                    try {
                        await OBDCommandQueue.add('ATRV', cmdTimeoutBase);
                        lastVoltageReadTime = now;
                    } catch (e) {
                        // Ignore voltage query error
                    }
                }

                for (const [ecuHeader, pids] of batchEntries) {
                    if (!this.isPollingActive) break;

                    // --- KADEMELİ FİLTRE 1: DONANIM SEVİYESİ ACK-CHECK ---
                    // AT SH komutu YALNIZCA CAN protokollerinde ve varsayılan 7E8 dışındaki düğümlere geçerken gönderilir
                    if (isCanProtocol && ecuHeader !== '7E8' && this.currentActiveHeader !== ecuHeader) {
                        try {
                            const ack = await OBDCommandQueue.add(`AT SH ${ecuHeader}`, cmdTimeoutBase);
                            const cleanAck = ack.toUpperCase().replace(/\s+/g, '');

                            if (cleanAck.includes('?') || cleanAck.includes('ERROR')) {
                                store.addLog(`WARN: AT SH ${ecuHeader} rejected by hardware [${ack}]. Continuing with default addressing.`);
                                this.currentActiveHeader = '7E8';
                            } else {
                                this.currentActiveHeader = ecuHeader;
                            }
                        } catch {
                            this.currentActiveHeader = '7E8';
                        }
                    }

                    // Bu düğüme ait tüm PID'leri ardışık olarak patlat
                    for (const pid of pids) {
                        if (!this.isPollingActive) break;
                        if (this.blacklistedPids.has(pid)) continue;

                        const cmd = `01 ${pid}`;
                        const timeout = (ecuHeader === '7E8' || !isCanProtocol) ? cmdTimeoutBase : (cmdTimeoutBase * 2);

                        try {
                            const rawResponse = await OBDCommandQueue.add(cmd, timeout);
                            const cleanResponse = rawResponse.toUpperCase().replace(/\s+/g, '');

                            // Sinyal yoksa veya 7F01 (NRC 0x12) döndüyse kara listeye al
                            if (cleanResponse.includes("NODATA") || cleanResponse.includes("CANERROR") || cleanResponse.includes("7F01")) {
                                store.addLog(`POLLING_ORCHESTRATOR: PID ${pid} returned NODATA/NRC. Blacklisting.`);
                                this.blacklistedPids.add(pid);
                                continue;
                            }

                            // --- KADEMELİ FİLTRE 2: ELEKTRİKSEL HEADER DRIFT VERIFICATION ---
                            if (ecuHeader === '7E9' && cleanResponse.includes('7E841')) {
                                this.currentActiveHeader = 'UNKNOWN';
                                break;
                            }
                        } catch (err: any) {
                            if (err?.message?.includes('Timeout')) {
                                store.addLog(`POLLING_ORCHESTRATOR: PID ${pid} timed out.`);
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
                store.addLog(`POLLING_ORCHESTRATOR: Loop exception: ${error}`);
                if (store.connectionState === 'DISCONNECTED') {
                    this.isPollingActive = false;
                }
                await preciseSleep(50);
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