import { getMakeFromVin, getYearFromVin } from '../utils/vinDecoder';

export interface SuggestedVehicleProfile {
    make: string;
    model: string;
    year: number;
    fuelType: string | null;
    transmission: string | null;
    confidence: number;
}

export class VehicleIdentityService {
    /**
     * Decodes vehicle profile information from 17-digit VIN (online API with offline local fallback)
     * 
     * @param vin Vehicle Identification Number (17 chars)
     * @returns Resolved vehicle profile metadata
     */
    public static async decodeVehicleFromVin(vin: string): Promise<SuggestedVehicleProfile> {
        if (!vin || vin.length < 3) {
            return this.getOfflineProfile(vin);
        }

        const cleanVin = vin.trim().toUpperCase();

        try {
            // Set 3 seconds timeout for API request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(
                `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanVin}?format=json`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`NHTSA API responded with status: ${response.status}`);
            }

            const data = await response.json();
            const results = data?.Results?.[0];

            if (results && results.Make) {
                // Symmetrical translation matching for fuel types
                let rawFuel = (results.FuelTypePrimary || '').toUpperCase();
                let fuelType: string | null = null;
                if (rawFuel.includes('DIESEL')) fuelType = 'DIESEL';
                else if (rawFuel.includes('GASOLINE') || rawFuel.includes('PETROL')) fuelType = 'GASOLINE';
                else if (rawFuel.includes('HYBRID')) fuelType = 'HYBRID';
                else if (rawFuel.includes('ELECTRIC')) fuelType = 'ELECTRIC';

                // Transmission matching
                let rawTrans = (results.TransmissionStyle || '').toUpperCase();
                let transmission: string | null = null;
                if (rawTrans.includes('MANUAL')) transmission = 'MANUAL';
                else if (rawTrans.includes('AUTOMATIC') || rawTrans.includes('DSG') || rawTrans.includes('CVT') || rawTrans.includes('DUAL CLUTCH')) {
                    transmission = 'AUTOMATIC';
                }

                return {
                    make: results.Make.toUpperCase(),
                    model: results.Model ? results.Model.toUpperCase() : 'UNKNOWN',
                    year: parseInt(results.ModelYear) || getYearFromVin(cleanVin),
                    fuelType,
                    transmission,
                    confidence: 0.95
                };
            }

            throw new Error('NHTSA API returned empty Make field');

        } catch (error) {
            // Log warning internally but fallback silently to offline mode
            console.warn('[VehicleIdentityService] Offline or API failure. Executing fallback regex decode.', error);
            return this.getOfflineProfile(cleanVin);
        }
    }

    /**
     * Decode basic manufacturer and model year offline using regex patterns
     */
    private static getOfflineProfile(vin: string): SuggestedVehicleProfile {
        const make = getMakeFromVin(vin);
        const year = getYearFromVin(vin);

        return {
            make,
            model: make !== 'GENERIC' ? `${make}_GENERIC_MODEL` : 'GENERIC_VEHICLE',
            year,
            fuelType: null,
            transmission: null,
            confidence: 0.50
        };
    }
}
export default VehicleIdentityService;
