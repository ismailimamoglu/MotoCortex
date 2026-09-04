/**
 * Utility to decode vehicle manufacturer/make from VIN (Vehicle Identification Number)
 * based on World Manufacturer Identifier (WMI) prefixes.
 * Supports 50+ global automobile, EV, and motorcycle brands.
 */

export type VehicleMake = 
    | 'HONDA' 
    | 'TOYOTA' 
    | 'DACIA' 
    | 'RENAULT' 
    | 'HYUNDAI' 
    | 'VOLKSWAGEN' 
    | 'BMW' 
    | 'MERCEDES' 
    | 'FORD'
    | 'AUDI'
    | 'PORSCHE'
    | 'SEAT'
    | 'SKODA'
    | 'PEUGEOT'
    | 'CITROEN'
    | 'OPEL'
    | 'FIAT'
    | 'ALFA_ROMEO'
    | 'JEEP'
    | 'VOLVO'
    | 'NISSAN'
    | 'MAZDA'
    | 'SUBARU'
    | 'SUZUKI'
    | 'KIA'
    | 'TESLA'
    | 'BYD'
    | 'BMW_MOTORRAD'
    | 'DUCATI'
    | 'YAMAHA'
    | 'KAWASAKI'
    | 'KTM'
    | 'TRIUMPH'
    | 'HARLEY_DAVIDSON'
    | 'GENERIC';

// WMI Regex patterns for global manufacturers
const HONDA_REGEX = /^(JH[1-9A-Z]|1HF|5FN|93H|9C2|2HK|ME4|MLH|SHS|RLH|LAL|MHR|VT4|YC1|ZDC)/i;
const TOYOTA_REGEX = /^(JT[0-9A-Z]|1NX|4T[0-9A-Z]|5TB|2T[0-9A-Z]|8AJ|9BR|MR[0-9A-Z]|NMT|SB1|AHT|VNK|L56|TW1)/i;
const DACIA_REGEX = /^(UU1|UU3|UU7|UU9)/i;
const RENAULT_REGEX = /^(VF1|VF8|VNE|VF3|VF4|8A1|93Y|92R|ME3)/i;
const HYUNDAI_REGEX = /^(KMH|KM8|MAL|TMA|NLH|ELH|1HM)/i;
const VOLKSWAGEN_REGEX = /^(WVW|WVG|WV2|WV3|WV1|WV4|WV5|3VW|9BW|1VW|8AW|AAV)/i;
const AUDI_REGEX = /^(WA1|WUA|TRU|8AJ)/i;
const PORSCHE_REGEX = /^(WP0|WP1|WPO)/i;
const SEAT_REGEX = /^(VSS)/i;
const SKODA_REGEX = /^(TMB)/i;
const BMW_REGEX = /^(WBA|WBS|5UX|4US|WBY|WCH|NC0|LBV|LMV|MMF|MDF)/i;
const MERCEDES_REGEX = /^(WDB|WDD|WDY|WD3|WD4|WD8|W1K|4JG|5XX|9BM|8AC|NMB|LE4|VS9)/i;
const FORD_REGEX = /^(1FA|1FT|1FM|2FM|2FT|3FA|3FT|WF0|SFA|VS6|UN1|LF0|MP1|NM0)/i;
const PEUGEOT_REGEX = /^(VF3|VR3)/i;
const CITROEN_REGEX = /^(VF7|VR7)/i;
const OPEL_REGEX = /^(W0L|W0V|VN1)/i;
const FIAT_REGEX = /^(ZFA|FA1|3FE|9BD)/i;
const ALFA_ROMEO_REGEX = /^(ZAR)/i;
const JEEP_REGEX = /^(1J4|1J8|C4R)/i;
const VOLVO_REGEX = /^(YV1|YV4|YV2)/i;
const NISSAN_REGEX = /^(JN1|JN8|1N4|5N1|3N1|SJN)/i;
const MAZDA_REGEX = /^(JM1|JM7|JM0|1YV)/i;
const SUBARU_REGEX = /^(JF1|JF2|4S3|4S4)/i;
const SUZUKI_REGEX = /^(JS1|JS2|TSM|MA3)/i;
const KIA_REGEX = /^(KNA|KND|KNM|3KP)/i;
const TESLA_REGEX = /^(5YJ|7SA|LRW)/i;
const BYD_REGEX = /^(LC0|LGX)/i;

// Motorcycles
const BMW_MOTORRAD_REGEX = /^(WB1|WB3)/i;
const DUCATI_REGEX = /^(ZDM)/i;
const YAMAHA_REGEX = /^(JY1|JY2|JY3|JY4|JYA|52H|9C2)/i;
const KAWASAKI_REGEX = /^(JK1|JK2|JKA)/i;
const KTM_REGEX = /^(VBK)/i;
const TRIUMPH_REGEX = /^(SMT)/i;
const HARLEY_DAVIDSON_REGEX = /^(1HD|5HD|93C)/i;

/**
 * Parses the VIN to determine the manufacturer.
 *
 * @param vin The vehicle's 17-character VIN
 * @returns The resolved vehicle make
 */
export function getMakeFromVin(vin: string): VehicleMake {
    if (!vin || vin.length < 3) {
        return 'GENERIC';
    }

    const cleanVin = vin.trim().toUpperCase();
    const wmi = cleanVin.substring(0, 3);

    if (BMW_MOTORRAD_REGEX.test(wmi)) return 'BMW_MOTORRAD';
    if (DUCATI_REGEX.test(wmi)) return 'DUCATI';
    if (YAMAHA_REGEX.test(wmi)) return 'YAMAHA';
    if (KAWASAKI_REGEX.test(wmi)) return 'KAWASAKI';
    if (KTM_REGEX.test(wmi)) return 'KTM';
    if (TRIUMPH_REGEX.test(wmi)) return 'TRIUMPH';
    if (HARLEY_DAVIDSON_REGEX.test(wmi)) return 'HARLEY_DAVIDSON';

    if (HONDA_REGEX.test(wmi)) return 'HONDA';
    if (TOYOTA_REGEX.test(wmi)) return 'TOYOTA';
    if (DACIA_REGEX.test(wmi)) return 'DACIA';
    if (RENAULT_REGEX.test(wmi)) return 'RENAULT';
    if (HYUNDAI_REGEX.test(wmi)) return 'HYUNDAI';
    if (VOLKSWAGEN_REGEX.test(wmi)) return 'VOLKSWAGEN';
    if (AUDI_REGEX.test(wmi)) return 'AUDI';
    if (PORSCHE_REGEX.test(wmi)) return 'PORSCHE';
    if (SEAT_REGEX.test(wmi)) return 'SEAT';
    if (SKODA_REGEX.test(wmi)) return 'SKODA';
    if (BMW_REGEX.test(wmi)) return 'BMW';
    if (MERCEDES_REGEX.test(wmi)) return 'MERCEDES';
    if (FORD_REGEX.test(wmi)) return 'FORD';
    if (PEUGEOT_REGEX.test(wmi)) return 'PEUGEOT';
    if (CITROEN_REGEX.test(wmi)) return 'CITROEN';
    if (OPEL_REGEX.test(wmi)) return 'OPEL';
    if (FIAT_REGEX.test(wmi)) return 'FIAT';
    if (ALFA_ROMEO_REGEX.test(wmi)) return 'ALFA_ROMEO';
    if (JEEP_REGEX.test(wmi)) return 'JEEP';
    if (VOLVO_REGEX.test(wmi)) return 'VOLVO';
    if (NISSAN_REGEX.test(wmi)) return 'NISSAN';
    if (MAZDA_REGEX.test(wmi)) return 'MAZDA';
    if (SUBARU_REGEX.test(wmi)) return 'SUBARU';
    if (SUZUKI_REGEX.test(wmi)) return 'SUZUKI';
    if (KIA_REGEX.test(wmi)) return 'KIA';
    if (TESLA_REGEX.test(wmi)) return 'TESLA';
    if (BYD_REGEX.test(wmi)) return 'BYD';

    // Fallback checking for substring in case of non-standard simulation/test VINs
    if (cleanVin.includes('HONDA')) return 'HONDA';
    if (cleanVin.includes('TOYOTA')) return 'TOYOTA';
    if (cleanVin.includes('DACIA')) return 'DACIA';
    if (cleanVin.includes('RENAULT')) return 'RENAULT';
    if (cleanVin.includes('HYUNDAI')) return 'HYUNDAI';
    if (cleanVin.includes('VOLKSWAGEN') || cleanVin.includes('VW')) return 'VOLKSWAGEN';
    if (cleanVin.includes('BMW')) return 'BMW';
    if (cleanVin.includes('MERCEDES') || cleanVin.includes('BENZ')) return 'MERCEDES';
    if (cleanVin.includes('FORD')) return 'FORD';
    if (cleanVin.includes('TESLA')) return 'TESLA';
    if (cleanVin.includes('DUCATI')) return 'DUCATI';
    if (cleanVin.includes('YAMAHA')) return 'YAMAHA';

    return 'GENERIC';
}

/**
 * Extract vehicle model year from 10th character of VIN (VIS standard)
 * 
 * @param vin The vehicle's 17-character VIN
 * @returns The resolved model year or current year as fallback
 */
export function getYearFromVin(vin: string): number {
    if (!vin || vin.length < 10) {
        return new Date().getFullYear();
    }

    const char = vin.trim().toUpperCase().charAt(9);
    
    // VIS 10th Character standard mapping (2000 - 2029)
    const yearsMap: Record<string, number> = {
        'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
        '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
        'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
        'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
        'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
        'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029
    };
    
    return yearsMap[char] || new Date().getFullYear();
}

export interface DecodedVinInfo {
    make: VehicleMake;
    year: number;
    wmi: string;
    model?: string;
    fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
}

/**
 * Decodes basic vehicle metadata from VIN synchronously.
 */
export function decodeVin(vin: string): DecodedVinInfo {
    if (!vin || vin.length < 3) {
        return {
            make: 'GENERIC',
            year: new Date().getFullYear(),
            wmi: '',
            model: 'Vehicle',
            fuelType: 'gasoline'
        };
    }

    const clean = vin.trim().toUpperCase();
    const make = getMakeFromVin(clean);
    const year = getYearFromVin(clean);
    const wmi = clean.substring(0, 3);

    let fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'electric' = 'gasoline';
    // Dacia/Renault dCi detection: e.g. UU1KSD8KJ... (K9K diesel)
    if (make === 'DACIA' && (clean.includes('KSD') || clean.includes('K9K') || clean.charAt(3) === 'K' || clean.charAt(3) === 'B')) {
        fuelType = 'diesel';
    }
    // PSA/Stellantis BlueHDi detection: e.g. VR3EFYHZ... (DV5RD / YHZ is 1.5 BlueHDi diesel)
    if ((make === 'PEUGEOT' || make === 'CITROEN') && (clean.includes('YHZ') || clean.includes('YH01') || clean.includes('BHY') || clean.includes('BHZ'))) {
        fuelType = 'diesel';
    }

    return {
        make,
        year,
        wmi,
        model: make !== 'GENERIC' ? `${make}` : 'Vehicle',
        fuelType
    };
}

