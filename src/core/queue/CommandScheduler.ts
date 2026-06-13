import { useBluetoothStore } from '../../store/useBluetoothStore';
import CommandRateLimiter from './CommandRateLimiter';

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
    priority: 'HIGH' | 'LOW';
    deadline: number;
    estimatedCostMs: number;
    timeoutMs?: number;
}

export class CommandScheduler {
    private queue: QueueItem[];
    private mode: SchedulerMode;
    private isProcessing: boolean;
    private timeoutCount: number;
    private timeoutWindowStart: number;
    private consecutiveSuccessCount: number;
    private executionFn: ((command: string, timeoutMs?: number) => Promise<string>) | null;
    private activeItem: QueueItem | null;

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

    setExecutionFunction(fn: (command: string, timeoutMs?: number) => Promise<string>) {
        this.executionFn = fn;
    }

    add(command: string, priority: 'HIGH' | 'LOW' = 'LOW', estimatedCostMs = 50, timeoutMs = 2000): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const store = useBluetoothStore.getState();
            const safePollIntervalMs = store.guardTime || 100;
            
            // Safe-poll deadline stretching
            const deadline = priority === 'HIGH' 
                ? Date.now() + (safePollIntervalMs * 2) 
                : Date.now() + 2000;

            const item: QueueItem = { command, resolve, reject, priority, deadline, estimatedCostMs, timeoutMs };
            
            // Circuit Breaker: In DEGRADED mode, block non-essential diagnostic commands
            if (this.mode === SchedulerMode.DEGRADED && priority === 'LOW') {
                reject(new Error('CIRCUIT_BREAKER_ACTIVE: DEGRADED_MODE_BLOCK'));
                return;
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
        while (this.queue.length > 0) {
            // Sort by earliest deadline first. If deadlines are identical, sort by shortest job (estimatedCostMs)
            this.queue.sort((a, b) => {
                if (a.deadline !== b.deadline) {
                    return a.deadline - b.deadline;
                }
                return a.estimatedCostMs - b.estimatedCostMs;
            });

            const item = this.queue.shift();
            if (!item) break;
            this.activeItem = item;

            if (this.executionFn) {
                try {
                    // Command rate limiting pacing
                    await CommandRateLimiter.pace();
                    
                    if (!this.activeItem) {
                        throw new Error('SESSION_CANCELLED');
                    }
                    
                    const result = await this.executionFn(item.command, item.timeoutMs);
                    this.handleSuccess();
                    if (this.activeItem) {
                        item.resolve(result);
                    }
                } catch (err: any) {
                    this.handleFailure(err);
                    if (this.activeItem) {
                        item.reject(err);
                    }
                } finally {
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

            // Circuit Breaker: 3 timeouts in 5 seconds -> Degrade
            if (this.timeoutCount >= 3 && this.mode === SchedulerMode.NORMAL) {
                this.mode = SchedulerMode.DEGRADED;
                this.consecutiveSuccessCount = 0;
                useBluetoothStore.getState().addLog('CIRCUIT_BREAKER: Degraded mode activated due to 3 timeouts.');
            }
        }
    }

    getMode(): SchedulerMode {
        return this.mode;
    }

    getQueueLength(): number {
        return this.queue.length;
    }

    clear(activeError: Error, queueError: Error) {
        const remaining = [...this.queue];
        this.queue = [];
        remaining.forEach(item => item.reject(queueError));
        
        if (this.activeItem) {
            try {
                this.activeItem.reject(activeError);
            } catch {}
            this.activeItem = null;
        }
    }
}

export default new CommandScheduler();
