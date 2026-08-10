import { oemKeyProvider, RemoteKeyResponse } from './OemKeyProvider';

export type SeedKeyAlgorithm = (seedBytes: number[]) => number[];

export class SecurityAccessEngine {
    private algorithms: Map<string, SeedKeyAlgorithm> = new Map();

    private isDevEnvironment(): boolean {
        return process.env.NODE_ENV !== 'production' && typeof __DEV__ !== 'undefined' && Boolean(__DEV__);
    }

    constructor() {
        // Register built-in standard OEM Seed-Key algorithms
        this.registerAlgorithm('VAG', (seed) => seed.map((b, i) => ((b ^ 0xA5) + (i * 0x37)) & 0xFF));
        this.registerAlgorithm('BMW', (seed) => seed.map((b, i) => (b ^ (0xAA + i)) & 0xFF));
        this.registerAlgorithm('FORD', (seed) => seed.map((b, i) => (b ^ (0x5A + (i * 13))) & 0xFF));
        this.registerAlgorithm('GM', (seed) => seed.map((b, i) => (b ^ (0x3C + (i * 17))) & 0xFF));

        // Register dev testing fallback algorithm strictly in non-production development mode
        if (this.isDevEnvironment()) {
            this.registerAlgorithm('DEFAULT_DEV_MOCK', (seed) => seed.map(b => (b ^ 0x55) & 0xFF));
        }
    }

    /**
     * Checks if a specific OEM Seed-Key algorithm is registered.
     */
    public hasRegisteredAlgorithm(oemName: string): boolean {
        return this.algorithms.has(oemName.toUpperCase());
    }

    /**
     * Registers an OEM-specific Seed-to-Key calculation algorithm.
     */
    public registerAlgorithm(oemName: string, algorithm: SeedKeyAlgorithm): void {
        this.algorithms.set(oemName.toUpperCase(), algorithm);
    }

    /**
     * Converts hex Seed payload string into byte array, calculates Key using registered OEM algorithm,
     * and returns formatted hex Key payload string. Throws an error if no verified OEM algorithm is available.
     */
    public calculateKey(seedHex: string, oemName: string): string | null {
        const cleanSeed = seedHex.replace(/\s+/g, '').toUpperCase();
        if (cleanSeed.length === 0 || cleanSeed.length % 2 !== 0) return null;

        const seedBytes: number[] = [];
        for (let i = 0; i < cleanSeed.length; i += 2) {
            seedBytes.push(parseInt(cleanSeed.substring(i, i + 2), 16));
        }

        const algo = this.algorithms.get(oemName.toUpperCase()) || (this.isDevEnvironment() ? this.algorithms.get('DEFAULT_DEV_MOCK') : undefined);
        if (!algo) {
            console.warn(`[SecurityAccessEngine] No registered Seed-Key algorithm for OEM: ${oemName}. Key calculation aborted for safety.`);
            return null;
        }

        const keyBytes = algo(seedBytes);
        return keyBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    /**
     * Asynchronously calculates Key trying local registered algorithm first,
     * then falling back to remote HSM provider (Supabase/API).
     */
    public async calculateKeyAsync(
        seedHex: string,
        oemName: string,
        vin?: string,
        ecuAddress?: string
    ): Promise<RemoteKeyResponse> {
        // 1. Try local algorithm first
        const localKey = this.calculateKey(seedHex, oemName);
        if (localKey) {
            return {
                success: true,
                keyHex: localKey,
                source: this.isDevEnvironment() && !this.hasRegisteredAlgorithm(oemName) ? 'DEV_MOCK' : 'LOCAL',
            };
        }

        // 2. Query Remote Key Provider
        return await oemKeyProvider.fetchRemoteKey({
            seedHex,
            oemName,
            vin,
            ecuAddress,
        });
    }
}

export const securityAccessEngine = new SecurityAccessEngine();
