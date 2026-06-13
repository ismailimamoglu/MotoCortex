import { useBluetoothStore } from '../../store/useBluetoothStore';
import CommandScheduler from './CommandScheduler';
import SessionHealthMonitor from '../monitor/SessionHealthMonitor';

export const HEALTH_SCORE_WEIGHTS = {
    rtt: 0.5,
    timeout: 0.3,
    queue: 0.2
};

export class AdaptivePollingController {
    private static currentInterval = 250; // default initial interval in ms
    private static smoothedRtt = 100;
    private static smoothedTimeoutRate = 0;
    private static alpha = 0.2; // EMA smoothing coefficient

    /**
     * Resets the adaptive controller internal EMA states.
     */
    public static reset(): void {
        this.currentInterval = 250;
        this.smoothedRtt = 100;
        this.smoothedTimeoutRate = 0;
    }

    /**
     * Calculates the polling tick interval based on system health scoring,
     * EMA smoothing, and Hysteresis.
     */
    public static calculateInterval(minInterval = 25, maxInterval = 500): number {
        const store = useBluetoothStore.getState();
        const connectionState = store.connectionState;

        // 1. Emergency Bypass: If system is in emergency states, immediately fallback to 500ms safety rate
        if (
            connectionState === 'RECOVERY' ||
            connectionState === 'DEGRADED' ||
            connectionState === 'HARDWARE_FATAL'
        ) {
            this.currentInterval = 500;
            return 500;
        }

        const stats = store.telemetryStats;
        const totalReqs = stats.requestsSent;
        const totalTimeouts = stats.timeoutCount;
        const timeoutRate = totalReqs > 0 ? (totalTimeouts / totalReqs) : 0;
        const currentRtt = SessionHealthMonitor.getAverageRtt();
        const queueDepth = CommandScheduler.getQueueLength();

        // 2. EMA Smoothing of inputs (dampens temporary noise/spikes)
        this.smoothedRtt = this.alpha * currentRtt + (1 - this.alpha) * this.smoothedRtt;
        this.smoothedTimeoutRate = this.alpha * timeoutRate + (1 - this.alpha) * this.smoothedTimeoutRate;

        // 3. RTT Score
        let rttScore = 100;
        if (this.smoothedRtt >= 300) {
            rttScore = 10;
        } else if (this.smoothedRtt >= 150) {
            rttScore = 40;
        } else if (this.smoothedRtt >= 80) {
            rttScore = 75;
        }

        // 4. Timeout Score
        let timeoutScore = 100;
        if (this.smoothedTimeoutRate >= 0.30) {
            timeoutScore = 0;
        } else if (this.smoothedTimeoutRate >= 0.15) {
            timeoutScore = 40;
        } else if (this.smoothedTimeoutRate >= 0.05) {
            timeoutScore = 70;
        }

        // 5. Queue Score
        let queueScore = 100;
        if (queueDepth > 5) {
            queueScore = 20;
        } else if (queueDepth >= 3) {
            queueScore = 60;
        }

        // 6. Weight-based Health Score calculation
        const healthScore = 
            rttScore * HEALTH_SCORE_WEIGHTS.rtt + 
            timeoutScore * HEALTH_SCORE_WEIGHTS.timeout + 
            queueScore * HEALTH_SCORE_WEIGHTS.queue;

        // 7. Poll Mapping
        let targetInterval = 500;
        if (healthScore > 85) {
            targetInterval = 25;
        } else if (healthScore > 65) {
            targetInterval = 75;
        } else if (healthScore > 45) {
            targetInterval = 150;
        } else if (healthScore > 20) {
            targetInterval = 300;
        }

        // 8. Hysteresis check: only apply change if the difference is greater than 50ms
        const diff = Math.abs(targetInterval - this.currentInterval);
        if (diff > 50) {
            this.currentInterval = targetInterval;
        }

        return Math.max(minInterval, Math.min(maxInterval, this.currentInterval));
    }
}
