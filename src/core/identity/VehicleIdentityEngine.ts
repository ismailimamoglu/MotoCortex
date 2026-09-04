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
     * Fully supports ISO 15765-4 / SAE J1979 5-frame responses, ISO-TP decoded payloads, and UDS DID F190.
     */
    public parseVinResponse(rawResponse: string): string | null {
        if (!rawResponse) return null;

        const lines = rawResponse.split(/[\r\n]+/).map(l => l.replace(/>/g, '').trim()).filter(Boolean);
        const clean = lines.join(' ').toUpperCase();

        // 1. Check for UDS 22 F1 90 Positive Response (62 F1 90 ...)
        const udsIdx = clean.replace(/\s+/g, '').indexOf('62F190');
        if (udsIdx !== -1) {
            const hexPayload = clean.replace(/\s+/g, '').substring(udsIdx + 6);
            let asciiStr = '';
            for (let i = 0; i < hexPayload.length - 1; i += 2) {
                const code = parseInt(hexPayload.slice(i, i + 2), 16);
                if (code >= 32 && code <= 126) asciiStr += String.fromCharCode(code);
            }
            const vinMatch = asciiStr.match(/[A-HJ-NPR-Z0-9]{17}/);
            if (vinMatch && isValidVin(vinMatch[0])) {
                return vinMatch[0];
            }
        }

        // 2. Line-by-line ELM327 CAN Multi-Frame format: "0: 49 02 01 ... \n 1: ... \n 2: ..."
        const canFrames: Record<number, string> = {};
        for (const line of lines) {
            const m = line.match(/^([0-9]):\s*([0-9A-F\s]+)$/i);
            if (m) {
                const idx = parseInt(m[1], 10);
                canFrames[idx] = m[2].replace(/[^0-9A-F]/gi, '').toUpperCase();
            }
        }
        if (canFrames[0] !== undefined && canFrames[1] !== undefined) {
            let canAssembledHex = '';
            const f0 = canFrames[0];
            const headerIdx = f0.indexOf('490201') !== -1 ? f0.indexOf('490201') : f0.indexOf('090201');
            if (headerIdx !== -1) {
                canAssembledHex += f0.substring(headerIdx + 6);
            } else {
                canAssembledHex += f0.slice(-6);
            }
            if (canFrames[1]) canAssembledHex += canFrames[1];
            if (canFrames[2]) canAssembledHex += canFrames[2];
            if (canFrames[3]) canAssembledHex += canFrames[3];

            if (canAssembledHex.length >= 34) {
                let asciiVin = '';
                for (let i = 0; i < 34; i += 2) {
                    const code = parseInt(canAssembledHex.slice(i, i + 2), 16);
                    if (code >= 32 && code <= 126) asciiVin += String.fromCharCode(code);
                }
                if (asciiVin.length === 17 && isValidVin(asciiVin)) {
                    return asciiVin;
                }
            }
        }

        // 3. Line-by-line J1979 Multi-Frame segments (49 02 01 ..., 49 02 02 ..., etc.)
        const j1979Frames: Record<number, string> = {};
        for (const line of lines) {
            const m = line.match(/(?:49|09)\s*02\s*0([1-5])\s*([0-9A-F\s]+)/i);
            if (m) {
                const idx = parseInt(m[1], 10);
                j1979Frames[idx] = m[2].replace(/[^0-9A-F]/gi, '').toUpperCase();
            }
        }
        if (j1979Frames[1] && j1979Frames[2]) {
            let assembledHex = '';
            if (j1979Frames[1].length >= 6) {
                assembledHex += j1979Frames[1].slice(-6);
            } else {
                assembledHex += j1979Frames[1].slice(-2);
            }
            for (let i = 2; i <= 5; i++) {
                if (j1979Frames[i]) {
                    assembledHex += j1979Frames[i].substring(0, 8);
                }
            }
            let asciiVin = '';
            for (let i = 0; i < assembledHex.length - 1; i += 2) {
                const code = parseInt(assembledHex.slice(i, i + 2), 16);
                if (code >= 32 && code <= 126) asciiVin += String.fromCharCode(code);
            }
            const vinMatch = asciiVin.match(/[A-HJ-NPR-Z0-9]{17}/);
            if (vinMatch && isValidVin(vinMatch[0])) {
                return vinMatch[0];
            }
        }

        // 3. Try parsing continuous hex string (e.g. continuous chunks or single-frame OBD)
        const hexOnly = clean.replace(/[^0-9A-F]/g, '');
        
        // Scan continuous hex for "490201" or "090201" pattern
        const mode9Idx = hexOnly.indexOf('490201') !== -1 ? hexOnly.indexOf('490201') : hexOnly.indexOf('090201');
        if (mode9Idx !== -1) {
            // Check if it's a concatenated 5-frame stream: 490201...490202...490203...
            const frame1Match = hexOnly.match(/(?:49|09)0201(?:[0-9A-F]{6})([0-9A-F]{2})(?:49|09)0202([0-9A-F]{8})(?:49|09)0203([0-9A-F]{8})(?:49|09)0204([0-9A-F]{8})(?:49|09)0205([0-9A-F]{8})/i);
            if (frame1Match) {
                const combinedHex = frame1Match[1] + frame1Match[2] + frame1Match[3] + frame1Match[4] + frame1Match[5];
                let asciiVin = '';
                for (let i = 0; i < combinedHex.length; i += 2) {
                    asciiVin += String.fromCharCode(parseInt(combinedHex.slice(i, i + 2), 16));
                }
                if (isValidVin(asciiVin)) return asciiVin;
            }
        }

        // 4. Fallback: Generic Hex-to-ASCII string sweep
        let fallbackAscii = '';
        for (let i = 0; i < hexOnly.length - 1; i += 2) {
            const code = parseInt(hexOnly.slice(i, i + 2), 16);
            if (code >= 32 && code <= 126) {
                fallbackAscii += String.fromCharCode(code);
            }
        }

        const asciiVinMatch = fallbackAscii.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (asciiVinMatch && isValidVin(asciiVinMatch[0])) {
            return asciiVinMatch[0];
        }

        // 5. Direct string check if response was already plaintext ASCII
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
