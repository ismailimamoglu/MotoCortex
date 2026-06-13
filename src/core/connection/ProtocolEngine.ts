export class ProtocolEngine {
    private static sessionStartTime = Date.now();
    private static sequenceCounter = 0;
    private static lastSystemTime = Date.now();
    private static logicalTime = Date.now();

    public static resetSession(): void {
        this.sessionStartTime = Date.now();
        this.sequenceCounter = 0;
        this.lastSystemTime = Date.now();
        this.logicalTime = Date.now();
    }

    /**
     * Returns a monotonic timestamp that is guaranteed to never go backward,
     * handling negative clock drifts by forcing a minimum 10ms increment.
     */
    public static getMonotonicTimestamp(): number {
        const now = Date.now();
        let delta = now - this.lastSystemTime;
        this.lastSystemTime = now;

        if (delta < 0) {
            // Negative clock drift detected (NTP sync or manual clock rollback)
            delta = 10;
        } else if (delta === 0) {
            // Same millisecond sequential execution
            delta = 10;
        }

        this.logicalTime += delta;
        return this.logicalTime;
    }

    /**
     * Returns a strictly monotonic sequence counter.
     */
    public static getSequenceCounter(): number {
        this.sequenceCounter++;
        return this.sequenceCounter;
    }

    /**
     * Session-based Monotonic Relative Logical Timestamp:
     * Reference session start time + logical increment to guarantee chronological order.
     */
    public static getRelativeLogicalTimestamp(): number {
        this.sequenceCounter++;
        return this.sessionStartTime + (this.sequenceCounter * 100);
    }
}
export default ProtocolEngine;
