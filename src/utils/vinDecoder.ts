/**
 * Utility to decode vehicle manufacturer/make from VIN (Vehicle Identification Number)
 * based on World Manufacturer Identifier (WMI) prefixes.
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
    | 'GENERIC';

// WMI Regex patterns for global manufacturers
const HONDA_REGEX = /^(JH[1-9A-Z]|1HF|5FN|93H|9C2|2HK|ME4|MLH|SHS|RLH|LAL|MHR|VT4|YC1|ZDC)/i;
const TOYOTA_REGEX = /^(JT[0-9A-Z]|1NX|4T[0-9A-Z]|5TB|2T[0-9A-Z]|8AJ|9BR|MR[0-9A-Z]|NMT|SB1|AHT|VNK|L56|TW1)/i;
const DACIA_REGEX = /^(UU1|UU3|UU7|UU9)/i;
const RENAULT_REGEX = /^(VF1|VF8|VNE|VF3|VF4|8A1|93Y|92R|ME3)/i;
const HYUNDAI_REGEX = /^(KMH|KM8|MAL|TMA|NLH|ELH|1HM)/i;
const VOLKSWAGEN_REGEX = /^(WVW|WVG|WV2|WV3|WV1|WV4|WV5|3VW|9BW|1VW|8AW|AAV|WA1|WUA)/i;
const BMW_REGEX = /^(WBA|WBS|5UX|4US|WBY|WCH|NC0|LBV|LMV|MMF|MDF)/i;
const MERCEDES_REGEX = /^(WDB|WDD|WDY|WD3|WD4|WD8|W1K|4JG|5XX|9BM|8AC|NMB|LE4|VS9)/i;
const FORD_REGEX = /^(1FA|1FT|1FM|2FM|2FT|3FA|3FT|WF0|SFA|VS6|UN1|LF0|MP1|NM0)/i;

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

    if (HONDA_REGEX.test(wmi)) return 'HONDA';
    if (TOYOTA_REGEX.test(wmi)) return 'TOYOTA';
    if (DACIA_REGEX.test(wmi)) return 'DACIA';
    if (RENAULT_REGEX.test(wmi)) return 'RENAULT';
    if (HYUNDAI_REGEX.test(wmi)) return 'HYUNDAI';
    if (VOLKSWAGEN_REGEX.test(wmi)) return 'VOLKSWAGEN';
    if (BMW_REGEX.test(wmi)) return 'BMW';
    if (MERCEDES_REGEX.test(wmi)) return 'MERCEDES';
    if (FORD_REGEX.test(wmi)) return 'FORD';

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
