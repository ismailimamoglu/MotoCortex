import { EventEmitter } from 'events';

export interface SafetyState {
    engineRunning: boolean;
    batteryVoltage: number;
    speedKph: number;
    lockout: boolean;
    lockoutReason: string | null;
}

/**
 * SafetyGate: Centralized authoritative automotive safety interlock.
 * Strictly prevents UDS writing, coding, adaptation routines, and DTC clearing
 * under unsafe vehicle conditions (Engine running, vehicle moving, low battery voltage).
 */
export class SafetyGate extends EventEmitter {
    private static _instance: SafetyGate;

    private state: SafetyState = {
        engineRunning: false,
        batteryVoltage: 12.6,
        speedKph: 0,
        lockout: false,
        lockoutReason: null
    };

    private constructor() {
        super();
        this.setMaxListeners(50);
    }

    public static instance(): SafetyGate {
        if (!SafetyGate._instance) {
            SafetyGate._instance = new SafetyGate();
        }
        return SafetyGate._instance;
    }

    /**
     * Resets the singleton state (useful for tests and fresh connections)
     */
    public reset(initialState?: Partial<SafetyState>): void {
        this.state = {
            engineRunning: false,
            batteryVoltage: 12.6,
            speedKph: 0,
            lockout: false,
            lockoutReason: null,
            ...initialState
        };
        this.recalculateLockout();
    }

    /**
     * Feed real-time telemetry into the safety gate
     */
    public update(partial: Partial<Omit<SafetyState, 'lockout' | 'lockoutReason'>>): void {
        const prev = { ...this.state };
        this.state = {
            ...this.state,
            ...partial
        };

        const hasChanged = this.recalculateLockout();
        this.emit('changed', this.state, prev);

        if (hasChanged) {
            this.emit('lockout', this.state.lockout, this.state.lockoutReason);
        }
    }

    private recalculateLockout(): boolean {
        const prevLockout = this.state.lockout;
        let lockout = false;
        let reason: string | null = null;

        if (this.state.engineRunning) {
            lockout = true;
            reason = 'ENGINE_RUNNING';
        } else if (this.state.speedKph > 0) {
            lockout = true;
            reason = 'VEHICLE_MOVING';
        } else if (this.state.batteryVoltage < 12.0) {
            lockout = true;
            reason = 'LOW_VOLTAGE';
        }

        this.state.lockout = lockout;
        this.state.lockoutReason = reason;

        return prevLockout !== lockout;
    }

    public getState(): Readonly<SafetyState> {
        return { ...this.state };
    }

    /**
     * Instant synchronous check whether ECU writes and service routines are permitted
     */
    public isWriteAllowed(): boolean {
        return !this.state.lockout;
    }

    public getLockoutReason(): string | null {
        return this.state.lockoutReason;
    }

    /**
     * Awaits until safety preconditions are met or times out
     * @param timeoutMs Timeout in milliseconds (default 5000ms)
     */
    public async waitForAllow(timeoutMs: number = 5000): Promise<boolean> {
        if (this.isWriteAllowed()) {
            return true;
        }

        return new Promise<boolean>((resolve) => {
            let timer: NodeJS.Timeout | null = null;

            const onLockoutChange = (lockout: boolean) => {
                if (!lockout) {
                    if (timer) clearTimeout(timer);
                    this.off('lockout', onLockoutChange);
                    resolve(true);
                }
            };

            timer = setTimeout(() => {
                this.off('lockout', onLockoutChange);
                resolve(this.isWriteAllowed());
            }, timeoutMs);

            this.on('lockout', onLockoutChange);
        });
    }
}

export const safetyGate = SafetyGate.instance();
export default safetyGate;
