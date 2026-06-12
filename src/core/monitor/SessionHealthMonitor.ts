import { useBluetoothStore } from '../../store/useBluetoothStore';

let healthMonitorInstance: SessionHealthMonitor | null = null;

export class SessionHealthMonitor {
    private totalRequests: number;
    private totalResponses: number;
    private totalTimeouts: number;
    private totalParseErrors: number;
    private rttHistory: number[];
    private readonly MAX_RTT_HISTORY: number;

    constructor() {
        this.totalRequests = 0;
        this.totalResponses = 0;
        this.totalTimeouts = 0;
        this.totalParseErrors = 0;
        this.rttHistory = [];
        this.MAX_RTT_HISTORY = 50;
    }

    public static getInstance(): SessionHealthMonitor {
        if (!healthMonitorInstance) {
            healthMonitorInstance = new SessionHealthMonitor();
        }
        return healthMonitorInstance;
    }

    public recordRequest(): void {
        this.totalRequests++;
        this.syncWithGlobalStore();
    }

    public recordResponse(rtt: number): void {
        this.totalResponses++;
        this.rttHistory.push(rtt);
        if (this.rttHistory.length > this.MAX_RTT_HISTORY) {
            this.rttHistory.shift();
        }
        this.syncWithGlobalStore();
    }

    public recordTimeout(): void {
        this.totalTimeouts++;
        this.syncWithGlobalStore();
    }

    public recordParseError(): void {
        this.totalParseErrors++;
        this.syncWithGlobalStore();
    }

    public getAverageRtt(): number {
        if (this.rttHistory.length === 0) return 0;
        const sum = this.rttHistory.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.rttHistory.length);
    }

    public getHealthScore(): number {
        if (this.totalRequests === 0) return 100;

        let score = 100;

        // Deduct points for timeouts (severe)
        const timeoutRate = this.totalTimeouts / this.totalRequests;
        score -= timeoutRate * 200; // 10% timeout rate = -20 points

        // Deduct points for parse errors
        const parseErrorRate = this.totalParseErrors / this.totalRequests;
        score -= parseErrorRate * 100; // 10% parse error rate = -10 points

        // Deduct points for high latency (above 150ms average)
        const avgRtt = this.getAverageRtt();
        if (avgRtt > 150) {
            const excess = avgRtt - 150;
            score -= Math.min(20, excess * 0.1); // Max -20 points for high RTT
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    public shouldTriggerRecovery(): boolean {
        // Trigger recovery if last 5 requests all timeout or if health score falls below 40
        if (this.totalRequests >= 5 && this.totalTimeouts > 0) {
            const timeoutRate = this.totalTimeouts / this.totalRequests;
            if (timeoutRate > 0.6) return true;
        }
        return this.getHealthScore() < 40;
    }

    public reset(): void {
        this.totalRequests = 0;
        this.totalResponses = 0;
        this.totalTimeouts = 0;
        this.totalParseErrors = 0;
        this.rttHistory = [];
        this.syncWithGlobalStore();
    }

    private syncWithGlobalStore(): void {
        const store = useBluetoothStore.getState();
        store.updateTelemetryStats({
            requestsSent: this.totalRequests,
            responsesReceived: this.totalResponses,
            timeoutCount: this.totalTimeouts,
            avgResponseTime: this.getAverageRtt()
        });
    }
}

export default SessionHealthMonitor.getInstance();
