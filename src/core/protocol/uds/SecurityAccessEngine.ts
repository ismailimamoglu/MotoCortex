/**
 * SecurityAccessEngine.ts
 * 
 * MotoCortex UDS Security Access (Mode 0x27) Challenge-Response Engine.
 * Manages Seed-Key calculations for OEM diagnostic security unlock.
 */

export type SeedKeyAlgorithm = (seedBytes: number[]) => number[];

export class SecurityAccessEngine {
    private algorithms: Map<string, SeedKeyAlgorithm> = new Map();

    constructor() {
        // Register default dummy algorithm for standard testing
        this.registerAlgorithm('DEFAULT', (seed) => seed.map(b => (b ^ 0x55) & 0xFF));
    }

    /**
     * Registers an OEM-specific Seed-to-Key calculation algorithm.
     */
    public registerAlgorithm(oemName: string, algorithm: SeedKeyAlgorithm): void {
        this.algorithms.set(oemName.toUpperCase(), algorithm);
    }

    /**
     * Converts hex Seed payload string into byte array, calculates Key using registered OEM algorithm,
     * and returns formatted hex Key payload string.
     */
    public calculateKey(seedHex: string, oemName: string = 'DEFAULT'): string | null {
        const cleanSeed = seedHex.replace(/\s+/g, '').toUpperCase();
        if (cleanSeed.length === 0 || cleanSeed.length % 2 !== 0) return null;

        const seedBytes: number[] = [];
        for (let i = 0; i < cleanSeed.length; i += 2) {
            seedBytes.push(parseInt(cleanSeed.substr(i, 2), 16));
        }

        const algo = this.algorithms.get(oemName.toUpperCase()) || this.algorithms.get('DEFAULT');
        if (!algo) return null;

        const keyBytes = algo(seedBytes);
        return keyBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
}

export const securityAccessEngine = new SecurityAccessEngine();
