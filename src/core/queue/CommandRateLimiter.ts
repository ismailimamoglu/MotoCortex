import { useBluetoothStore } from '../../store/useBluetoothStore';

export class CommandRateLimiter {
    private lastCommandTime: number;

    constructor() {
        this.lastCommandTime = 0;
    }

    async pace(): Promise<void> {
        const store = useBluetoothStore.getState();
        
        let minDelay = 25; // default Tier A (40 cmds/sec)
        
        if (store.isCloneDevice) {
            minDelay = 35; // Tier C (Safe UART pacing ~28 cmds/sec)
        } else {
            const score = store.adapterCapabilityScore;
            if (score >= 90) {
                minDelay = 15; // Tier S (Fast OBDLink/vLinker ~66 cmds/sec)
            } else if (score < 40) {
                minDelay = 35; // Tier C (Safe UART pacing)
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
