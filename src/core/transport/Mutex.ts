export class Mutex {
    private mutex = Promise.resolve();

    async acquire(): Promise<() => void> {
        let release: () => void;
        const box = new Promise<void>((resolve) => {
            release = resolve;
        });
        const current = this.mutex;
        this.mutex = current.then(() => box);
        await current;
        return release!;
    }
}
