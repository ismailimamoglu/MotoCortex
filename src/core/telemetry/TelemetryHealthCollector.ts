/**
 * TelemetryHealthCollector
 * 
 * Runtime singleton that collects BLE transport health metrics using
 * a rolling average (sliding window) algorithm over the last N samples.
 * 
 * Metrics tracked:
 *   - bleFragmentationRate: ratio of fragmented BLE packets to total
 *   - commandTimeoutRate:   ratio of timed-out commands to total
 *   - parserRecoveryCount:  decoder recovery event counter
 * 
 * All metrics are exposed as a structured JSON snapshot for diagnostics logging.
 */

export interface TelemetryHealthSnapshot {
    packetLoss: number;
    averageRtt: number;
    decoderErrors: number;
    queueDepth: number;
    bleFragmentationRate: number;
    commandTimeoutRate: number;
    parserRecoveryCount: number;
}

const ROLLING_WINDOW_SIZE = 100;

class TelemetryHealthCollector {
    // Pre-allocated circular buffers
    private fragmentEvents = new Uint8Array(ROLLING_WINDOW_SIZE); // 0 or 1
    private commandTimeouts = new Uint8Array(ROLLING_WINDOW_SIZE); // 0 or 1
    private rttSamples = new Float64Array(ROLLING_WINDOW_SIZE);

    // Write pointers and active sizes
    private fragmentHead = 0;
    private fragmentCount = 0;

    private commandHead = 0;
    private commandCount = 0;

    private rttHead = 0;
    private rttCount = 0;

    // Running sums for O(1) calculations
    private fragmentSum = 0;
    private timeoutSum = 0;
    private rttSum = 0;

    // Cumulative counters
    private _parserRecoveryCount: number = 0;
    private _decoderErrors: number = 0;
    private _queueDepth: number = 0;

    /**
     * [v7.4.7] Floating-point drift calibration.
     * Every CALIBRATION_INTERVAL samples, running sums are recomputed
     * from scratch to eliminate IEEE 754 accumulation errors.
     */
    private totalSampleCount: number = 0;
    private static readonly CALIBRATION_INTERVAL = 1000;

    /**
     * Record a BLE fragment event. Pass true if the packet was fragmented.
     */
    recordFragment(isFragmented: boolean = true): void {
        const newValue = isFragmented ? 1 : 0;
        const oldValue = this.fragmentCount === ROLLING_WINDOW_SIZE ? this.fragmentEvents[this.fragmentHead] : 0;
        
        this.fragmentEvents[this.fragmentHead] = newValue;
        this.fragmentHead = (this.fragmentHead + 1) % ROLLING_WINDOW_SIZE;
        
        this.fragmentSum = this.fragmentSum - oldValue + newValue;
        if (this.fragmentCount < ROLLING_WINDOW_SIZE) {
            this.fragmentCount++;
        }
    }

    /**
     * Record a successful command completion with its RTT in milliseconds.
     */
    recordSuccess(rttMs: number): void {
        // Record command result as success (timeout = 0)
        const newTimeoutVal = 0;
        const oldTimeoutVal = this.commandCount === ROLLING_WINDOW_SIZE ? this.commandTimeouts[this.commandHead] : 0;
        
        this.commandTimeouts[this.commandHead] = newTimeoutVal;
        this.commandHead = (this.commandHead + 1) % ROLLING_WINDOW_SIZE;
        
        this.timeoutSum = this.timeoutSum - oldTimeoutVal + newTimeoutVal;
        if (this.commandCount < ROLLING_WINDOW_SIZE) {
            this.commandCount++;
        }

        // Record RTT sample
        const newRttVal = rttMs;
        const oldRttVal = this.rttCount === ROLLING_WINDOW_SIZE ? this.rttSamples[this.rttHead] : 0;
        
        this.rttSamples[this.rttHead] = newRttVal;
        this.rttHead = (this.rttHead + 1) % ROLLING_WINDOW_SIZE;
        
        this.rttSum = this.rttSum - oldRttVal + newRttVal;
        if (this.rttCount < ROLLING_WINDOW_SIZE) {
            this.rttCount++;
        }

        this.totalSampleCount++;
        this.calibrateRunningSums();
    }

    /**
     * Record a command timeout event.
     */
    recordTimeout(): void {
        // Record command result as timeout (timeout = 1)
        const newTimeoutVal = 1;
        const oldTimeoutVal = this.commandCount === ROLLING_WINDOW_SIZE ? this.commandTimeouts[this.commandHead] : 0;
        
        this.commandTimeouts[this.commandHead] = newTimeoutVal;
        this.commandHead = (this.commandHead + 1) % ROLLING_WINDOW_SIZE;
        
        this.timeoutSum = this.timeoutSum - oldTimeoutVal + newTimeoutVal;
        if (this.commandCount < ROLLING_WINDOW_SIZE) {
            this.commandCount++;
        }

        this.totalSampleCount++;
        this.calibrateRunningSums();
    }

    /**
     * Record a parser/decoder recovery event.
     */
    recordParserRecovery(): void {
        this._parserRecoveryCount++;
    }

    /**
     * Record a decoder error.
     */
    recordDecoderError(): void {
        this._decoderErrors++;
    }

    /**
     * Update current queue depth.
     */
    setQueueDepth(depth: number): void {
        this._queueDepth = depth;
    }

    /**
     * Calculate BLE fragmentation rate from rolling window.
     * Returns ratio 0.0 - 1.0.
     */
    get bleFragmentationRate(): number {
        if (this.fragmentCount === 0) return 0;
        return this.fragmentSum / this.fragmentCount;
    }

    /**
     * Calculate command timeout rate from rolling window.
     * Returns ratio 0.0 - 1.0.
     */
    get commandTimeoutRate(): number {
        if (this.commandCount === 0) return 0;
        return this.timeoutSum / this.commandCount;
    }

    /**
     * Calculate average RTT from rolling window.
     */
    get averageRtt(): number {
        if (this.rttCount === 0) return 0;
        return Math.round(this.rttSum / this.rttCount);
    }

    /**
     * Calculate packet loss rate (timeouts / total commands).
     */
    get packetLoss(): number {
        return this.commandTimeoutRate;
    }

    get parserRecoveryCount(): number {
        return this._parserRecoveryCount;
    }

    get decoderErrors(): number {
        return this._decoderErrors;
    }

    get queueDepth(): number {
        return this._queueDepth;
    }

    /**
     * Returns a structured JSON snapshot of all health metrics.
     */
    getHealthSnapshot(): TelemetryHealthSnapshot {
        return {
            packetLoss: Number(this.packetLoss.toFixed(4)),
            averageRtt: this.averageRtt,
            decoderErrors: this._decoderErrors,
            queueDepth: this._queueDepth,
            bleFragmentationRate: Number(this.bleFragmentationRate.toFixed(4)),
            commandTimeoutRate: Number(this.commandTimeoutRate.toFixed(4)),
            parserRecoveryCount: this._parserRecoveryCount,
        };
    }

    /**
     * Reset all counters and rolling windows.
     */
    resetCollector(): void {
        this.fragmentEvents.fill(0);
        this.commandTimeouts.fill(0);
        this.rttSamples.fill(0);

        this.fragmentHead = 0;
        this.fragmentCount = 0;

        this.commandHead = 0;
        this.commandCount = 0;

        this.rttHead = 0;
        this.rttCount = 0;

        this.fragmentSum = 0;
        this.timeoutSum = 0;
        this.rttSum = 0;

        this._parserRecoveryCount = 0;
        this._decoderErrors = 0;
        this._queueDepth = 0;
        this.totalSampleCount = 0;
    }

    /**
     * [v7.4.7] IEEE 754 floating-point drift calibration.
     *
     * Every 1000 samples, recomputes fragmentSum, timeoutSum, and rttSum
     * from scratch by iterating over the circular buffer's active elements.
     * This eliminates microscopic accumulation errors (e.g., 0.1 + 0.2 !== 0.3)
     * that compound over multi-hour driving sessions.
     */
    private calibrateRunningSums(): void {
        if (this.totalSampleCount % TelemetryHealthCollector.CALIBRATION_INTERVAL !== 0) return;

        // Recompute fragmentSum
        let freshFragmentSum = 0;
        for (let i = 0; i < this.fragmentCount; i++) {
            freshFragmentSum += this.fragmentEvents[i];
        }
        this.fragmentSum = freshFragmentSum;

        // Recompute timeoutSum
        let freshTimeoutSum = 0;
        for (let i = 0; i < this.commandCount; i++) {
            freshTimeoutSum += this.commandTimeouts[i];
        }
        this.timeoutSum = freshTimeoutSum;

        // Recompute rttSum
        let freshRttSum = 0;
        for (let i = 0; i < this.rttCount; i++) {
            freshRttSum += this.rttSamples[i];
        }
        this.rttSum = freshRttSum;
    }
}

export default new TelemetryHealthCollector();
