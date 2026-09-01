// src/core/connection/PollingOrchestrator.ts
// MotoCortex - Ultra-Lightweight & Robust Telemetry Orchestrator (Torque/Car Scanner Standard)

import OBDCommandQueue, { preciseSleep } from '../../api/OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export class PollingOrchestrator {
    private static isPollingActive = false;
    private static isPerformanceMode = false;

    public static setPerformanceModePriority(active: boolean): void {
        this.isPerformanceMode = active;
        const store = useBluetoothStore.getState();
        store.addLog(`POLLING_ORCHESTRATOR: Performance Mode Priority ${active ? 'ENABLED (Speed PID 010D)' : 'DISABLED'}`);
    }

    /**
     * Start ultra-reliable continuous telemetry loop.
     * Zero blacklisting, zero premature drop, zero blocking.
     */
    public static async startPolling(requestedKeys?: string[]): Promise<void> {
        const store = useBluetoothStore.getState();

        if (this.isPollingActive) {
            store.addLog('POLLING_ORCHESTRATOR: Loop already active.');
            return;
        }

        this.isPollingActive = true;
        OBDCommandQueue.setPollingActive(true);
        store.addLog('POLLING_ORCHESTRATOR: Commencing Direct & Robust Telemetry Stream.');

        // Varsayılan veya kullanıcının seçtiği aktif gösterge PID'leri
        const activeUserPids = store.activeGaugePids || ['0C', '0D', '05', '11', '04'];
        const STATIC_PIDS_TO_EXCLUDE = new Set(['00', '20', '40', '60', '80', 'A0', 'C0', '1C', '0100', '0120', '0140', '0160', '011C', 'ATRV', 'VOLTAGE']);

        let targetPids: string[] = [];

        if (requestedKeys && requestedKeys.length > 0) {
            targetPids = requestedKeys
                .map(k => k.split('@')[0].trim().replace(/^01\s*/i, '').toUpperCase())
                .filter(p => !STATIC_PIDS_TO_EXCLUDE.has(p) && p.length > 0);
        } else {
            targetPids = activeUserPids
                .map(k => k.trim().replace(/^01\s*/i, '').toUpperCase())
                .filter(p => !STATIC_PIDS_TO_EXCLUDE.has(p) && p.length > 0);
        }

        if (targetPids.length === 0) {
            targetPids = ['0C', '0D', '05', '11', '04'];
        }

        // Protokol hızına göre güvenli pacing (gecikme) hesaplama
        const rawProtocol = (store.protocol || '').toUpperCase();
        const isExplicitlySlow = rawProtocol.includes('KWP') || rawProtocol.includes('ISO 14230') || rawProtocol.includes('ISO 9141') || rawProtocol.includes('J1850') || rawProtocol.includes('9141') || rawProtocol === '3' || rawProtocol === '4' || rawProtocol === '5';
        
        const cmdTimeout = isExplicitlySlow ? 600 : 350;
        const pacingDelay = isExplicitlySlow ? 25 : 8; // Klon UART tamponunun rahatlaması için 8ms
        const interLoopDelay = isExplicitlySlow ? 50 : 20;

        let lastVoltageReadTime = 0;
        let consecutiveFailures = 0;

        while (this.isPollingActive) {
            try {
                // Performance Mode (Sadece Hız 010D)
                if (this.isPerformanceMode) {
                    try {
                        await OBDCommandQueue.add('01 0D', cmdTimeout);
                        consecutiveFailures = 0;
                    } catch {
                        consecutiveFailures++;
                    }
                    await preciseSleep(pacingDelay);
                    continue;
                }

                const now = Date.now();

                // Periyodik Akü Voltajı (Her 4 saniyede bir ATRV)
                if (now - lastVoltageReadTime > 4000) {
                    try {
                        await OBDCommandQueue.add('ATRV', cmdTimeout);
                        lastVoltageReadTime = now;
                    } catch {}
                }

                // Canlı Sensörleri Sırayla Oku (Asla karalisteye alma, sürekli akıt)
                for (const pid of targetPids) {
                    if (!this.isPollingActive) break;

                    try {
                        await OBDCommandQueue.add(`01 ${pid}`, cmdTimeout);
                        consecutiveFailures = 0; // Başarılı komutta sıfırla
                    } catch {
                        consecutiveFailures++;
                    }

                    if (pacingDelay > 0) {
                        await preciseSleep(pacingDelay);
                    }
                }

                // Devre Kesici (Circuit Breaker): 5 ardışık döngü boyunca bağlantı yoksa döngüyü durdur
                if (consecutiveFailures >= 10 && store.connectionState === 'DISCONNECTED') {
                    store.addLog('POLLING_ORCHESTRATOR: Connection lost - stopping polling loop cleanly.');
                    this.isPollingActive = false;
                    break;
                }

                await preciseSleep(interLoopDelay);

            } catch (error) {
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
        OBDCommandQueue.clear(new Error('POLLING_STOPPED'));
    }
}
export default PollingOrchestrator;