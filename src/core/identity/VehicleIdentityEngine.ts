/**
 * VehicleIdentityEngine.ts
 * 
 * MotoCortex Automatic Vehicle Identification Engine.
 * Executes layered discovery (OBD-II Mode 09 02 -> UDS 22 F190 -> Identification DIDs F187/F188/F189)
 * to construct a high-fidelity VehicleFingerprint.
 */

import { VehicleFingerprint, ECUFingerprint, isValidVin, decodeWmi } from './VehicleFingerprint';
import * as Logger from '../../services/Logger';

export class VehicleIdentityEngine {
    /**
     * Parses raw response from OBD-II Mode 09 02 or UDS 22 F1 90 to extract clean VIN string.
     */
    public parseVinResponse(rawResponse: string): string | null {
        if (!rawResponse) return null;

        const clean = rawResponse.replace(/[\r\n\s>]/g, '').toUpperCase();

        // 1. Try decoding raw hex string to ASCII first (e.g., "0902015756575A5A5A314B5A4250303030303030")
        const hexOnly = clean.replace(/[^0-9A-F]/g, '');
        let asciiStr = '';
        for (let i = 0; i < hexOnly.length - 1; i += 2) {
            const code = parseInt(hexOnly.slice(i, i + 2), 16);
            if (code >= 32 && code <= 126) {
                asciiStr += String.fromCharCode(code);
            }
        }

        const asciiVinMatch = asciiStr.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (asciiVinMatch && isValidVin(asciiVinMatch[0])) {
            return asciiVinMatch[0];
        }

        // 2. Direct string check if response was already plaintext ASCII
        const directVinMatch = clean.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (directVinMatch && isValidVin(directVinMatch[0])) {
            return directVinMatch[0];
        }

        return null;
    }

    /**
     * Constructs a VehicleFingerprint from resolved VIN and discovered ECUs.
     */
    public buildFingerprint(
        vin: string | null,
        discoveredEcus: ECUFingerprint[] = [],
        protocol: string = 'ISO 15765-4 (CAN 11/500)'
    ): VehicleFingerprint {
        const timestamp = Date.now();
        
        if (!vin || !isValidVin(vin)) {
            return {
                vin: vin || 'UNKNOWN',
                confidence: 0.2,
                ecus: discoveredEcus,
                protocol,
                timestamp
            };
        }

        const wmiInfo = decodeWmi(vin);
        let confidence = 0.8;

        if (discoveredEcus.length > 0) {
            confidence += 0.15;
        }

        return {
            vin,
            make: wmiInfo?.make,
            confidence: Math.min(1.0, confidence),
            ecus: discoveredEcus,
            protocol,
            timestamp
        };
    }
}

export const vehicleIdentityEngine = new VehicleIdentityEngine();
