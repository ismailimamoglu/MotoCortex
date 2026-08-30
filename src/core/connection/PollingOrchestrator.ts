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
        // Statik capability ve meta PID'leri (00, 20, 40, 60, 80, A0, C0, 1C) telemetri döngüsünden filtrele
        const STATIC_PIDS_TO_EXCLUDE = new Set(['00', '20', '40', '60', '80', 'A0', 'C0', '1C', '0100', '0120', '0140', '0160', '011C']);
        const batchedQueue = new Map<string, string[]>(); // ECU_HEADER -> PID[]

        const rawKeys = (requestedKeys && requestedKeys.length > 0)
            ? requestedKeys
            : ['0C@7E8', '0D@7E8', '04@7E8'];

        for (const key of rawKeys) {
            const cleanKey = key.trim();
            let pid = cleanKey;
            let targetHeader = '7E8';

            if (cleanKey.includes('@')) {
                const parts = cleanKey.split('@');
                pid = parts[0].trim();
                targetHeader = parts[1]?.trim() || '7E8';
            }

            const cleanPidHex = pid.replace(/^01\s*/i, '').toUpperCase();
            if (STATIC_PIDS_TO_EXCLUDE.has(cleanPidHex) || STATIC_PIDS_TO_EXCLUDE.has(pid.toUpperCase())) {
                continue; // Skip static capability bitmasks during live streaming
            }

            if (!batchedQueue.has(targetHeader)) {
                batchedQueue.set(targetHeader, []);
            }
            batchedQueue.get(targetHeader)!.push(cleanPidHex);
        }

        // 2. ADIM: Donanım Kalitesine Göre Adaptif Limitlerin Hesaplanması
        const score = store.adapterCapabilityScore || 100;
        const rawProtocol = (store.protocol || '').toUpperCase();
        const isExplicitlySlow = rawProtocol.includes('KWP') || rawProtocol.includes('ISO 14230') || rawProtocol.includes('ISO 9141') || rawProtocol.includes('J1850') || rawProtocol.includes('9141') || rawProtocol === '3' || rawProtocol === '4' || rawProtocol === '5' || rawProtocol === '1' || rawProtocol === '2';
        const isCanProtocol = !isExplicitlySlow;
        
        let interLoopDelay = 15;
        let cmdTimeoutBase = 400;
        let cmdPacingDelay = 5;

        if (isExplicitlySlow) {
            // K-Line / J1850 (10.4 kbps): Minimum UART yükü, buffer taşmasını önleyen güvenli aralıklar
            interLoopDelay = 40;
            cmdTimeoutBase = 500;
            cmdPacingDelay = 15;
        } else if (score >= 75) {
            // Yüksek kaliteli CAN adaptörler: Yüksek hız, JS Event Loop ve Hermes HadesGC için 16ms güvenli ara
            interLoopDelay = 16; 
            cmdTimeoutBase = 150;
            cmdPacingDelay = 2;
        } else if (score < 60) {
            // PIC18F25K80 ve muadil klon adaptörler: 20ms akıcı ara
            interLoopDelay = 20;
            cmdTimeoutBase = 250;
            cmdPacingDelay = 5;
        }

        store.addLog(`POLLING_ORCHESTRATOR: Target pacing parameters computed. Score=${score}, isCAN=${isCanProtocol}, interLoopDelay=${interLoopDelay}ms, cmdTimeoutBase=${cmdTimeoutBase}ms, cmdPacingDelay=${cmdPacingDelay}ms`);

        let lastVoltageReadTime = 0;
        let lastSlowCadenceTime = 0;
        const SLOW_CADENCE_PIDS = new Set(['01', '05', '46']); // MIL, Coolant, Ambient Temp

        const batchEntries = Array.from(batchedQueue.entries());

        while (this.isPollingActive) {
            try {
                // ============================================================
                // PERFORMANCE MODE: High-frequency 010D (Speed) polling for 0-100 km/h measurement
                // ============================================================
                if (this.isPerformanceMode) {
                    try {
                        await OBDCommandQueue.add('01 0D', cmdTimeoutBase);
                    } catch (e) {}
                    await preciseSleep(2);
                    continue;
                }

                const now = Date.now();

                // Periodically query battery voltage via ATRV (every 3.5 seconds)
                if (now - lastVoltageReadTime > 3500) {
                    try {
                        await OBDCommandQueue.add('ATRV', isCanProtocol ? cmdTimeoutBase : 600);
                        lastVoltageReadTime = now;
                    } catch (e) {}
                }

                const shouldRunSlowCadence = (now - lastSlowCadenceTime > 4000);
                if (shouldRunSlowCadence) {
                    lastSlowCadenceTime = now;
                }

                for (const [ecuHeader, pids] of batchEntries) {
                    if (!this.isPollingActive) break;

                    // --- KADEMELİ FİLTRE 1: DONANIM SEVİYESİ ACK-CHECK ---
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

                    // Dinamik Priority Interleaving: Yüksek devir tepkisi için CAN hatlarında her ikincil sensörde bir RPM (010C) sıkıştır
                    const highPriorityPids = pids.filter(p => p === '0C' || p === '0D' || p === '11');
                    const secondaryPids = pids.filter(p => p !== '0C' && p !== '0D' && p !== '11');

                    // 1. Önce yüksek öncelikli dinamik sensörleri oku (RPM, Hız)
                    for (const hpPid of highPriorityPids) {
                        if (!this.isPollingActive) break;
                        if (this.blacklistedPids.has(hpPid)) continue;

                        try {
                            const raw = await OBDCommandQueue.add(`01 ${hpPid}`, cmdTimeoutBase);
                            const clean = (raw || '').toUpperCase().replace(/\s+/g, '');
                            if (clean.includes("NODATA") || clean.includes("CANERROR") || clean.includes("7F") || clean.includes("STOPPED")) {
                                this.blacklistedPids.add(hpPid);
                            }
                        } catch (e) {}
                        if (cmdPacingDelay > 0) await preciseSleep(cmdPacingDelay);
                    }

                    // 2. İkincil sensörleri sırayla oku
                    for (const secPid of secondaryPids) {
                        if (!this.isPollingActive) break;
                        if (this.blacklistedPids.has(secPid)) continue;

                        // Yavaş değişen PID'leri sadece periyodik aralıkta çalıştır
                        if (SLOW_CADENCE_PIDS.has(secPid) && !shouldRunSlowCadence) {
                            continue;
                        }

                        try {
                            const raw = await OBDCommandQueue.add(`01 ${secPid}`, cmdTimeoutBase);
                            const clean = (raw || '').toUpperCase().replace(/\s+/g, '');
                            if (clean.includes("NODATA") || clean.includes("CANERROR") || clean.includes("7F") || clean.includes("STOPPED")) {
                                this.blacklistedPids.add(secPid);
                            }
                        } catch (e) {}
                        if (cmdPacingDelay > 0) await preciseSleep(cmdPacingDelay);

                        // PRIORITY INTERLEAVE: Yalnızca CAN-Bus hatlarında anlık devir için araya RPM oku (K-Line'da lag yapmaması için atlanır)
                        if (isCanProtocol && highPriorityPids.includes('0C') && !this.blacklistedPids.has('0C')) {
                            try {
                                await OBDCommandQueue.add('01 0C', cmdTimeoutBase);
                            } catch (e) {}
                            if (cmdPacingDelay > 0) await preciseSleep(cmdPacingDelay);
                        }
                    }
                }

                // BLE veri hattı ve UART buffer dinlenme payı (Adaptive Loop Delay)
                await preciseSleep(interLoopDelay);

            } catch (error) {
                store.addLog(`POLLING_ORCHESTRATOR: Loop exception: ${error}`);
                if (store.connectionState === 'DISCONNECTED') {
                    this.isPollingActive = false;
                }
                await preciseSleep(30);
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