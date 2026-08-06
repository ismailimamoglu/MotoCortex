// src/core/security/SecurityAccessProvider.ts
// MotoCortex v8.0.0 - Modular UDS Security Access (Seed/Key) Provider Architecture

export interface SecurityAccessRequest {
    seedHex: string;
    securityLevel: number;
    targetEcuAddress?: string;
    vehicleMake?: string;
    vin?: string;
}

export interface SecurityAccessResponse {
    isSuccess: boolean;
    keyHex?: string;
    errorMessage?: string;
    providerName: string;
}

export interface ISecurityAccessProvider {
    name: string;
    calculateKey(request: SecurityAccessRequest): Promise<SecurityAccessResponse>;
}

/**
 * Local Fallback Security Provider for offline testing and demo environments.
 */
export class LocalTestSecurityProvider implements ISecurityAccessProvider {
    public readonly name = 'LocalTestSecurityProvider';

    public async calculateKey(request: SecurityAccessRequest): Promise<SecurityAccessResponse> {
        const { seedHex, securityLevel } = request;
        if (!seedHex || seedHex.length < 4) {
            return {
                isSuccess: false,
                errorMessage: 'INVALID_SEED_LENGTH',
                providerName: this.name,
            };
        }

        // Basic XOR / Additive Seed-Key algorithm for test & development simulation
        const seedVal = parseInt(seedHex.substring(0, 4), 16) || 0x1234;
        const computedVal = (seedVal ^ 0x4D43 + securityLevel) & 0xFFFF;
        const keyHex = computedVal.toString(16).toUpperCase().padStart(4, '0');

        return {
            isSuccess: true,
            keyHex,
            providerName: this.name,
        };
    }
}

/**
 * Remote Cloud Security Provider for secure Production API delegation.
 */
export class RemoteCloudSecurityProvider implements ISecurityAccessProvider {
    public readonly name = 'RemoteCloudSecurityProvider';
    private apiEndpoint: string;

    constructor(apiEndpoint: string = 'https://api.motocortex.app/v1/security/seed-key') {
        this.apiEndpoint = apiEndpoint;
    }

    public async calculateKey(request: SecurityAccessRequest): Promise<SecurityAccessResponse> {
        try {
            const payload = {
                ...request,
                brand: request.vehicleMake || 'GENERIC',
            };
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                return {
                    isSuccess: false,
                    errorMessage: `CLOUD_API_ERROR_${response.status}`,
                    providerName: this.name,
                };
            }

            const data = await response.json();
            return {
                isSuccess: true,
                keyHex: data.keyHex,
                providerName: this.name,
            };
        } catch (err: any) {
            return {
                isSuccess: false,
                errorMessage: `NETWORK_ERROR: ${err?.message || err}`,
                providerName: this.name,
            };
        }
    }
}

/**
 * Global Delegate Manager for Security Access Provider selection.
 */
export class SecurityAccessManager {
    private static activeProvider: ISecurityAccessProvider = new LocalTestSecurityProvider();

    public static setProvider(provider: ISecurityAccessProvider): void {
        this.activeProvider = provider;
    }

    public static getProvider(): ISecurityAccessProvider {
        return this.activeProvider;
    }

    public static async calculateKey(request: SecurityAccessRequest): Promise<SecurityAccessResponse> {
        return this.activeProvider.calculateKey(request);
    }
}
