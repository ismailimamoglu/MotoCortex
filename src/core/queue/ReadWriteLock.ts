/**
 * ReadWriteLock: Single-Writer / Multiple-Readers Concurrency Lock.
 * Used by CommandScheduler and Bluetooth transport to ensure that critical
 * ECU write operations (UDS 0x2E, 0x34, Long Coding) acquire an exclusive lock
 * without interleaving background telemetry reads.
 */
export class ReadWriteLock {
    private readers = 0;
    private writerPending = false;
    private activeWriter = false;

    /**
     * Shared lock for telemetry reads (e.g. RPM, Speed, Voltage polling)
     */
    public async readLock(timeoutMs: number = 3000): Promise<() => void> {
        const start = Date.now();
        while (this.writerPending || this.activeWriter) {
            if (Date.now() - start > timeoutMs) {
                throw new Error('READ_LOCK_TIMEOUT: Writer holds exclusive lock');
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.readers++;
        let released = false;

        return () => {
            if (!released) {
                released = true;
                this.readers = Math.max(0, this.readers - 1);
            }
        };
    }

    /**
     * Exclusive lock for UDS / Coding writes
     */
    public async writeLock(timeoutMs: number = 5000): Promise<() => void> {
        this.writerPending = true;
        const start = Date.now();

        try {
            while (this.readers > 0 || this.activeWriter) {
                if (Date.now() - start > timeoutMs) {
                    throw new Error('WRITE_LOCK_TIMEOUT: Failed to acquire exclusive lock');
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            this.activeWriter = true;
            this.writerPending = false;
            let released = false;

            return () => {
                if (!released) {
                    released = true;
                    this.activeWriter = false;
                }
            };
        } catch (error) {
            this.writerPending = false;
            throw error;
        }
    }

    public isLocked(): boolean {
        return this.activeWriter || this.writerPending;
    }

    public getActiveReaders(): number {
        return this.readers;
    }

    public reset(): void {
        this.readers = 0;
        this.writerPending = false;
        this.activeWriter = false;
    }
}

export default ReadWriteLock;
