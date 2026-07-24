import { oemKeyProvider, RemoteKeyResponse } from './OemKeyProvider';

export type SeedKeyAlgorithm = (seedBytes: number[]) => number[];

export class SecurityAccessEngine {
    private algorithms: Map<string, SeedKeyAlgorithm> = new Map();

    constructor() {
        // Register dev testing fallback algorithm only in development mode
        if (__DEV__) {
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

        const algo = this.algorithms.get(oemName.toUpperCase()) || (__DEV__ ? this.algorithms.get('DEFAULT_DEV_MOCK') : undefined);
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
                source: __DEV__ && !this.hasRegisteredAlgorithm(oemName) ? 'DEV_MOCK' : 'LOCAL',
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
