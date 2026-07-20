/**
 * TesterPresentScheduler.ts
 * 
 * MotoCortex UDS Tester Present (0x3E 00) Scheduler.
 * Keeps Extended Diagnostic Sessions (10 03) alive by periodically queueing
 * keep-alive frames without colliding with main diagnostic transactions.
 */

import * as Logger from '../../../services/Logger';

export class TesterPresentScheduler {
    private intervalTimer: any = null;
    private isActive: boolean = false;
    private readonly INTERVAL_MS = 2000; // Send 3E 00 every 2 seconds

    /**
     * Starts the periodic TesterPresent timer for active Extended Diagnostic Sessions.
     */
    public start(sendTesterPresentCallback: () => Promise<void>): void {
        if (this.isActive) return;
        this.isActive = true;
        Logger.log('UDS_SCHEDULER', 'TesterPresentScheduler started (2000ms interval)');

        this.intervalTimer = setInterval(async () => {
            if (!this.isActive) return;
            try {
                await sendTesterPresentCallback();
            } catch (err: any) {
                Logger.log('UDS_SCHEDULER_WARN', `TesterPresent execution skipped: ${err?.message || String(err)}`);
            }
        }, this.INTERVAL_MS);
    }

    /**
     * Stops the TesterPresent scheduler.
     */
    public stop(): void {
        if (!this.isActive) return;
        this.isActive = false;
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
        Logger.log('UDS_SCHEDULER', 'TesterPresentScheduler stopped');
    }

    public isRunning(): boolean {
        return this.isActive;
    }
}

export const testerPresentScheduler = new TesterPresentScheduler();
