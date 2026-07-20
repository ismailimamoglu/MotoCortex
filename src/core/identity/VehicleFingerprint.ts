/**
 * VehicleFingerprint.ts
 * 
 * MotoCortex Universal Vehicle Identity & ECU Fingerprint Data Model.
 * Provides VIN validation, WMI (World Manufacturer Identifier) resolution,
 * and ECU Identification structures.
 */

export interface ECUFingerprint {
    ecuAddress: string;      // e.g., '0x7E0'
    responseAddress: string; // e.g., '0x7E8'
    ecuName: string;         // e.g., 'Engine Control Module (ECM)'
    supplier?: string;       // e.g., 'Bosch', 'Continental', 'Delphi'
    hardwareNumber?: string; // e.g., '0281013328'
    softwareNumber?: string; // e.g., '1037398214'
    softwareVersion?: string;
    protocol: 'OBD' | 'UDS' | 'KWP2000' | 'ISO9141';
}

export interface VehicleFingerprint {
    vin: string;
    make?: string;
    model?: string;
    year?: number;
    engine?: string;
    fuelType?: string;
    transmission?: string;
    protocol?: string;
    ecus: ECUFingerprint[];
    confidence: number; // 0.0 to 1.0 (rating of identity certainty)
    timestamp: number;
}

/**
 * Standard WMI (World Manufacturer Identifier) Map
 * First 3 characters of VIN map to Vehicle Manufacturer and Country.
 */
const WMI_MAP: Record<string, { make: string; country: string }> = {
    // VAG Group
    'WVW': { make: 'Volkswagen', country: 'Germany' },
    'WV1': { make: 'Volkswagen Commercial', country: 'Germany' },
    'WV2': { make: 'Volkswagen Commercial', country: 'Germany' },
    'WAU': { make: 'Audi', country: 'Germany' },
    'TRU': { make: 'Audi', country: 'Hungary' },
    'VSS': { make: 'SEAT', country: 'Spain' },
    'TMB': { make: 'Skoda', country: 'Czech Republic' },
    'WP0': { make: 'Porsche', country: 'Germany' },

    // Renault / Dacia / Nissan
    'VF1': { make: 'Renault', country: 'France' },
    'UU1': { make: 'Dacia', country: 'Romania' },
    'JN1': { make: 'Nissan', country: 'Japan' },
    'SJN': { make: 'Nissan', country: 'UK' },

    // BMW / Mini
    'WBA': { make: 'BMW', country: 'Germany' },
    'WBS': { make: 'BMW M', country: 'Germany' },
    'WMW': { make: 'Mini', country: 'UK' },

    // Ford
    'WF0': { make: 'Ford', country: 'Germany' },
    '1FA': { make: 'Ford', country: 'USA' },
    '1FT': { make: 'Ford', country: 'USA' },
    'NM0': { make: 'Ford Otosan', country: 'Turkey' },

    // Stellantis / Fiat / Peugeot / Citroen
    'ZFA': { make: 'Fiat', country: 'Italy' },
    'NM4': { make: 'Tofaş / Fiat', country: 'Turkey' },
    'VF3': { make: 'Peugeot', country: 'France' },
    'VF7': { make: 'Citroen', country: 'France' },
    '1C3': { make: 'Chrysler / Jeep', country: 'USA' },

    // Toyota / Lexus
    'JTD': { make: 'Toyota', country: 'Japan' },
    'SB1': { make: 'Toyota', country: 'UK' },
    'NMT': { make: 'Toyota', country: 'Turkey' },

    // Hyundai / Kia
    'KMH': { make: 'Hyundai', country: 'South Korea' },
    'NLH': { make: 'Hyundai', country: 'Turkey' },
    'KNA': { make: 'Kia', country: 'South Korea' },

    // Mercedes-Benz
    'WDD': { make: 'Mercedes-Benz', country: 'Germany' },
    'WDB': { make: 'Mercedes-Benz', country: 'Germany' },

    // Togg
    'TK8': { make: 'Togg', country: 'Turkey' }
};

/**
 * Validates whether a VIN conforms to ISO 3779 standard (17 characters, no I, O, Q).
 */
export function isValidVin(vin: string): boolean {
    const cleanVin = vin.trim().toUpperCase();
    if (cleanVin.length !== 17) return false;
    if (/[IOQ]/.test(cleanVin)) return false;
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);
}

/**
 * Decodes WMI prefix to retrieve Make and Country of Origin.
 */
export function decodeWmi(vin: string): { make?: string; country?: string } | undefined {
    if (!vin || vin.length < 3) return undefined;
    const wmi = vin.substring(0, 3).toUpperCase();
    return WMI_MAP[wmi];
}
