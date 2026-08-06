// src/core/queue/CommandScheduler.ts
// MotoCortex v7.9.9 - Enterprise Weighted Fair Queuing & Circuit-Breaker Scheduler

import { useBluetoothStore } from '../../store/useBluetoothStore';
import CommandRateLimiter from './CommandRateLimiter';
import { Mutex } from '../transport/Mutex';

export enum SchedulerMode {
    NORMAL,
    DEGRADED,
    RECOVERY,
    COOLDOWN
}

export interface QueueItem {
    command: string;
    resolve: (value: string) => void;
    reject: (reason: any) => void;
    priority: 'HIGH' | 'LOW' | 'HIGH_PRIORITY_AD_HOC';
    deadline: number;
    estimatedCostMs: number;
    timeoutMs?: number;
}

export class CommandSchedulerClass {
    private queue: QueueItem[];
    private mode: SchedulerMode;
    private isProcessing: boolean;
    private timeoutCount: number;
    private timeoutWindowStart: number;
    private consecutiveSuccessCount: number;
    private executionFn: ((command: string, timeoutMs?: number) => Promise<string>) | null;
    private activeItem: QueueItem | null;
    private checkLockFn: (() => boolean) | null = null;
    private writeMutex: Mutex = new Mutex();
    private onAdHocInterruptFn: (() => void) | null = null;

    // Weighted Fair Queuing (WFQ): Telemetri akışının arıza kodu/VIN işlemlerini boğmasını engeller
    private highRunCount = 0;
    private readonly MAX_HIGH_CONSECUTIVE = 4; 

    constructor() {
        this.queue = [];
        this.mode = SchedulerMode.NORMAL;
        this.isProcessing = false;
        this.timeoutCount = 0;
        this.timeoutWindowStart = 0;
        this.consecutiveSuccessCount = 0;
        this.executionFn = null;
        this.activeItem = null;
    }

    public setAdHocInterruptHandler(fn: () => void) {
        this.onAdHocInterruptFn = fn;
    }

    setExecutionFunction(fn: (command: string, timeoutMs?: number) => Promise<string>) {
        this.executionFn = fn;
    }

    // OBDCommandQueue'nun jilet gibi görebilmesi için metodu buraya ekliyoruz
    public setLockGuard(fn: () => boolean) {
        this.checkLockFn = fn;
    }

    add(command: string, priority: 'HIGH' | 'LOW' | 'HIGH_PRIORITY_AD_HOC' = 'LOW', estimatedCostMs = 50, timeoutMs = 2000): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const store = useBluetoothStore.getState();
            const safePollIntervalMs = store.guardTime || 100;
            
            const connectionType = store.connectionType;
            let actualTimeoutMs = timeoutMs;
            if (connectionType === 'WIFI' || connectionType === 'WIFI_CUSTOM') {
                if (actualTimeoutMs > 200) {
                    actualTimeoutMs = 200;
                }
            }

            const deadline = priority === 'HIGH_PRIORITY_AD_HOC'
                ? Date.now() - 1000 // Force earliest deadline for ad-hoc
                : priority === 'HIGH'
                    ? Date.now() + (safePollIntervalMs * 2)
                    : Date.now() + 2000;

            const item: QueueItem = { command, resolve, reject, priority, deadline, estimatedCostMs, timeoutMs: actualTimeoutMs };
            
            if (this.mode === SchedulerMode.DEGRADED && priority === 'LOW') {
                reject(new Error('CIRCUIT_BREAKER_ACTIVE: DEGRADED_MODE_BLOCK'));
                return;
            }

            // Drop oldest stale HIGH telemetry item if queue exceeds 50 items to eliminate latency
            if (this.queue.length >= 50 && priority === 'HIGH') {
                const staleIdx = this.queue.findIndex(q => q.priority === 'HIGH');
                if (staleIdx !== -1) {
                    const dropped = this.queue.splice(staleIdx, 1)[0];
                    dropped.reject(new Error('QUEUE_OVERFLOW_STALE_PID_DROPPED'));
                }
            }

            this.queue.push(item);
            this.trigger();
        });
    }

    private trigger() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.processLoop();
    }

    private async processLoop() {
        let lockWaitStartTime = 0;
        while (this.queue.length > 0) {
            // Atomic Lock Guard: K-Line uyanma sinyali veya protokol taraması aktifse kuyruğu beklet
            if (this.checkLockFn && this.checkLockFn()) {
                if (!lockWaitStartTime) lockWaitStartTime = Date.now();
                if (Date.now() - lockWaitStartTime < 3000) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    continue;
                }
                // Timeout guard: 3000ms max lock wait to prevent JS thread spin-lock deadlock
                console.warn('[CommandScheduler] Lock wait timeout (3000ms) exceeded. Bypassing atomic lock guard.');
                lockWaitStartTime = 0;
            } else {
                lockWaitStartTime = 0;
            }

            let selectedIndex = -1;

            // 1. HIGH_PRIORITY_AD_HOC takes absolute precedence (first empty slot)
            const adHocIndex = this.queue.findIndex(q => q.priority === 'HIGH_PRIORITY_AD_HOC');
            if (adHocIndex !== -1) {
                selectedIndex = adHocIndex;
            } else {
                const hasHigh = this.queue.some(q => q.priority === 'HIGH');
                const hasLow = this.queue.some(q => q.priority === 'LOW');

                if (hasHigh && hasLow) {
                    if (this.highRunCount >= this.MAX_HIGH_CONSECUTIVE) {
                        selectedIndex = this.queue.findIndex(q => q.priority === 'LOW');
                        this.highRunCount = 0;
                    } else {
                        selectedIndex = this.queue.findIndex(q => q.priority === 'HIGH');
                        this.highRunCount++;
                    }
                } else if (hasHigh) {
                    selectedIndex = this.queue.findIndex(q => q.priority === 'HIGH');
                    this.highRunCount++;
                } else {
                    selectedIndex = this.queue.findIndex(q => q.priority === 'LOW');
                    this.highRunCount = 0;
                }
            }

            if (selectedIndex === -1) {
                this.queue.sort((a, b) => {
                    if (a.deadline !== b.deadline) return a.deadline - b.deadline;
                    return a.estimatedCostMs - b.estimatedCostMs;
                });
                selectedIndex = 0;
            }

            const item = this.queue.splice(selectedIndex, 1)[0];
            if (!item) break;
            this.activeItem = item;

            if (this.executionFn) {
                const releaseLock = await this.writeMutex.acquire();
                try {
                    if (item.priority === 'HIGH_PRIORITY_AD_HOC' && this.onAdHocInterruptFn) {
                        try {
                            this.onAdHocInterruptFn();
                        } catch (e) {
                            console.warn('[CommandScheduler] Ad-hoc interrupt handler error:', e);
                        }
                    }
                    await CommandRateLimiter.pace();
                    if (!this.activeItem) throw new Error('SESSION_CANCELLED');
                    
                    const result = await this.executionFn(item.command, item.timeoutMs);
                    this.handleSuccess();
                    if (this.activeItem) item.resolve(result);
                } catch (err: any) {
                    this.handleFailure(err);
                    if (this.activeItem) item.reject(err);
                } finally {
                    releaseLock();
                    this.activeItem = null;
                }
            } else {
                item.reject(new Error('Scheduler has no execution function'));
                this.activeItem = null;
            }
        }
        this.isProcessing = false;
    }

    private handleSuccess() {
        this.consecutiveSuccessCount++;
        if (this.mode === SchedulerMode.DEGRADED && this.consecutiveSuccessCount >= 10) {
            this.mode = SchedulerMode.NORMAL;
            this.timeoutCount = 0;
            useBluetoothStore.getState().addLog('CIRCUIT_BREAKER: Restored to NORMAL mode after 10 clean responses.');
        }
    }

    private handleFailure(error: any) {
        const isTimeout = error?.message && error.message.includes('Timeout');
        if (isTimeout) {
            const now = Date.now();
            if (now - this.timeoutWindowStart > 5000) {
                this.timeoutWindowStart = now;
                this.timeoutCount = 1;
            } else {
                this.timeoutCount++;
            }

            if (this.timeoutCount >= 3 && this.mode === SchedulerMode.NORMAL) {
                this.mode = SchedulerMode.DEGRADED;
                this.consecutiveSuccessCount = 0;
                useBluetoothStore.getState().addLog('CIRCUIT_BREAKER: Degraded mode activated due to 3 timeouts.');
            }
        }
    }

    public getMode(): SchedulerMode { return this.mode; }
    public getQueueLength(): number { return this.queue.length; }

    public reset() {
        this.mode = SchedulerMode.NORMAL;
        this.timeoutCount = 0;
        this.consecutiveSuccessCount = 0;
        this.queue = [];
        this.highRunCount = 0;
        if (this.activeItem) {
            try { this.activeItem.reject(new Error('SCHEDULER_RESET')); } catch {}
            this.activeItem = null;
        }
        useBluetoothStore.getState().addLog('CIRCUIT_BREAKER: Scheduler reset to NORMAL mode.');
    }

    public clear(activeError: Error, queueError: Error) {
        const remaining = [...this.queue];
        this.queue = [];
        this.highRunCount = 0;
        remaining.forEach(item => item.reject(queueError));
        
        if (this.activeItem) {
            try { this.activeItem.reject(activeError); } catch {}
            this.activeItem = null;
        }
        this.mode = SchedulerMode.NORMAL;
        this.timeoutCount = 0;
        this.consecutiveSuccessCount = 0;
    }
}

const CommandScheduler = new CommandSchedulerClass();
export default CommandScheduler;