// src/core/profile/EcuEndpointResolver.ts
// MotoCortex v8.0.0 - Dynamic Vehicle-Aware ECU Endpoint Resolver

export interface EcuProfile {
    moduleName: string;
    headerHex: string;
    responseHeaderHex: string;
    protocol: string;
    requiresSecurityAccess: boolean;
    defaultSecurityLevel: number;
}

export class EcuEndpointResolver {
    private static VAG_HEADER_MAP: Record<string, string> = {
        'ENGINE': '7E0',
        'TRANSMISSION': '7E1',
        'BCM': '709',
        'CLUSTER': '772',
        'INFOTAINMENT': '7C0',
        'GATEWAY': '710',
    };

    private static BMW_HEADER_MAP: Record<string, string> = {
        'ENGINE': '7E0',
        'TRANSMISSION': '7E1',
        'FEM_BODY': '760',
        'KOMBI': '760',
        'HU_NBT': '763',
    };

    private static FORD_HEADER_MAP: Record<string, string> = {
        'ENGINE': '7E0',
        'BCM': '726',
        'IPC': '720',
        'APIM': '7D0',
    };

    /**
     * Resolves target ECU header dynamically based on vehicle make and target module name.
     */
    public static resolveHeader(vehicleMake: string = 'GENERIC', moduleName: string = 'ENGINE'): string {
        const makeUpper = vehicleMake.toUpperCase();
        const moduleUpper = moduleName.toUpperCase();

        if (makeUpper.includes('VOLKSWAGEN') || makeUpper.includes('AUDI') || makeUpper.includes('SEAT') || makeUpper.includes('SKODA') || makeUpper.includes('VAG')) {
            return this.VAG_HEADER_MAP[moduleUpper] || '709';
        }

        if (makeUpper.includes('BMW') || makeUpper.includes('MINI')) {
            return this.BMW_HEADER_MAP[moduleUpper] || '760';
        }

        if (makeUpper.includes('FORD')) {
            return this.FORD_HEADER_MAP[moduleUpper] || '726';
        }

        return '7E0'; // Default Broadcast / Engine ECU
    }

    /**
     * Constructs full EcuProfile record for diagnostic session execution.
     */
    public static resolveProfile(vehicleMake?: string, moduleName?: string): EcuProfile {
        const headerHex = this.resolveHeader(vehicleMake, moduleName);
        const responseHeaderHex = (parseInt(headerHex, 16) + 8).toString(16).toUpperCase().padStart(3, '0');

        return {
            moduleName: moduleName || 'BCM',
            headerHex,
            responseHeaderHex,
            protocol: 'ISO 15765-4 (CAN)',
            requiresSecurityAccess: true,
            defaultSecurityLevel: 1,
        };
    }
}
