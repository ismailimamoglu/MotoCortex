import { useBluetoothStore } from '../../store/useBluetoothStore';

export class CommandRateLimiter {
    private lastCommandTime: number;

    constructor() {
        this.lastCommandTime = 0;
    }

    async pace(): Promise<void> {
        const store = useBluetoothStore.getState();
        
        let minDelay = 100; // default Tier A (10 cmds/sec)
        
        if (store.isCloneDevice) {
            minDelay = 333; // Tier C (3 cmds/sec)
        } else {
            const score = store.adapterCapabilityScore;
            if (score >= 92) {
                minDelay = 50; // Tier S (20 cmds/sec)
            } else if (score < 40) {
                minDelay = 333; // Tier C (3 cmds/sec)
            }
        }

        const now = Date.now();
        const elapsed = now - this.lastCommandTime;
        if (elapsed < minDelay) {
            const waitTime = minDelay - elapsed;
            await new Promise(r => setTimeout(r, waitTime));
        }
        this.lastCommandTime = Date.now();
    }
}

export default new CommandRateLimiter();
