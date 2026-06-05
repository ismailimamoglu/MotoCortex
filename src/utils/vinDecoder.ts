/**
 * Utility to decode vehicle manufacturer/make from VIN (Vehicle Identification Number)
 * based on World Manufacturer Identifier (WMI) prefixes.
 */

export type VehicleMake = 'HONDA' | 'TOYOTA' | 'GENERIC';

// WMI Regex patterns for global manufacturers
const HONDA_REGEX = /^(JH[1-9A-Z]|1HF|5FN|93H|9C2|2HK|ME4|MLH|SHS|RLH|LAL|MHR|VT4|YC1|ZDC)/i;
const TOYOTA_REGEX = /^(JT[0-9A-Z]|1NX|4T[0-9A-Z]|5TB|2T[0-9A-Z]|8AJ|9BR|MR[0-9A-Z]|NMT|SB1|AHT|VNK|L56|TW1)/i;

/**
 * Parses the VIN to determine the manufacturer.
 *
 * @param vin The vehicle's 17-character VIN
 * @returns The resolved vehicle make: 'HONDA', 'TOYOTA' or 'GENERIC'
 */
export function getMakeFromVin(vin: string): VehicleMake {
    if (!vin || vin.length < 3) {
        return 'GENERIC';
    }

    const cleanVin = vin.trim().toUpperCase();
    const wmi = cleanVin.substring(0, 3);

    if (HONDA_REGEX.test(wmi)) {
        return 'HONDA';
    }

    if (TOYOTA_REGEX.test(wmi)) {
        return 'TOYOTA';
    }

    // Fallback checking for substring in case of non-standard simulation/test VINs
    if (cleanVin.includes('HONDA')) {
        return 'HONDA';
    }
    if (cleanVin.includes('TOYOTA')) {
        return 'TOYOTA';
    }

    return 'GENERIC';
}
