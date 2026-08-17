import { ReadWriteLock } from '../ReadWriteLock';

describe('ReadWriteLock Concurrency Tests', () => {
    let lock: ReadWriteLock;

    beforeEach(() => {
        lock = new ReadWriteLock();
    });

    test('1. Multiple concurrent readers can acquire shared read locks', async () => {
        const release1 = await lock.readLock();
        const release2 = await lock.readLock();
        const release3 = await lock.readLock();

        expect(lock.getActiveReaders()).toBe(3);
        expect(lock.isLocked()).toBe(false);

        release1();
        release2();
        release3();

        expect(lock.getActiveReaders()).toBe(0);
    });

    test('2. Writer acquires exclusive lock and blocks subsequent readers', async () => {
        const releaseWrite = await lock.writeLock();
        expect(lock.isLocked()).toBe(true);

        let readerAcquired = false;
        const readPromise = lock.readLock(1000).then((releaseRead) => {
            readerAcquired = true;
            releaseRead();
        });

        // Reader should be blocked while writer holds lock
        await new Promise(r => setTimeout(r, 50));
        expect(readerAcquired).toBe(false);

        releaseWrite();
        await readPromise;
        expect(readerAcquired).toBe(true);
    });

    test('3. Writer waits for active readers to finish before acquiring exclusive lock', async () => {
        const releaseRead1 = await lock.readLock();
        const releaseRead2 = await lock.readLock();

        let writerAcquired = false;
        const writePromise = lock.writeLock(1000).then((releaseWrite) => {
            writerAcquired = true;
            releaseWrite();
        });

        await new Promise(r => setTimeout(r, 50));
        expect(writerAcquired).toBe(false);

        releaseRead1();
        await new Promise(r => setTimeout(r, 20));
        expect(writerAcquired).toBe(false);

        releaseRead2();
        await writePromise;
        expect(writerAcquired).toBe(true);
    });

    test('4. writeLock throws timeout error if readers do not release within timeout', async () => {
        const releaseRead = await lock.readLock();
        await expect(lock.writeLock(100)).rejects.toThrow('WRITE_LOCK_TIMEOUT');
        releaseRead();
    });
});
