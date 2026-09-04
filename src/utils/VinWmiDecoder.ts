/**
 * VIN WMI (World Manufacturer Identifier) Auto-Decoder
 * Decodes brand, manufacturer, and origin country from 17-digit VIN numbers.
 */

export interface VinDecodeResult {
  vin: string;
  wmi: string;
  brand: string;
  country: string;
  category: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'UNKNOWN';
}

const WMI_MAP: Record<string, { brand: string; country: string; category: 'CAR' | 'MOTORCYCLE' | 'TRUCK' }> = {
  // Motorcycle Manufacturers
  'WB1': { brand: 'BMW Motorrad', country: 'Germany', category: 'MOTORCYCLE' },
  'ZDF': { brand: 'Ducati', country: 'Italy', category: 'MOTORCYCLE' },
  'JYA': { brand: 'Yamaha', country: 'Japan', category: 'MOTORCYCLE' },
  'JKA': { brand: 'Kawasaki', country: 'Japan', category: 'MOTORCYCLE' },
  'JS1': { brand: 'Suzuki', country: 'Japan', category: 'MOTORCYCLE' },
  'JH2': { brand: 'Honda Powersports', country: 'Japan', category: 'MOTORCYCLE' },
  'VBK': { brand: 'KTM / Husqvarna', country: 'Austria', category: 'MOTORCYCLE' },
  'HD1': { brand: 'Harley-Davidson', country: 'USA', category: 'MOTORCYCLE' },

  // European Cars
  'WBA': { brand: 'BMW', country: 'Germany', category: 'CAR' },
  'WBS': { brand: 'BMW M', country: 'Germany', category: 'CAR' },
  'WBY': { brand: 'BMW i', country: 'Germany', category: 'CAR' },
  'WDB': { brand: 'Mercedes-Benz', country: 'Germany', category: 'CAR' },
  'WDD': { brand: 'Mercedes-Benz', country: 'Germany', category: 'CAR' },
  'WMX': { brand: 'Mercedes-AMG', country: 'Germany', category: 'CAR' },
  'WVW': { brand: 'Volkswagen', country: 'Germany', category: 'CAR' },
  'WVG': { brand: 'Volkswagen SUV', country: 'Germany', category: 'CAR' },
  'WAU': { brand: 'Audi', country: 'Germany', category: 'CAR' },
  'WP0': { brand: 'Porsche', country: 'Germany', category: 'CAR' },
  'VF1': { brand: 'Renault', country: 'France', category: 'CAR' },
  'VF3': { brand: 'Peugeot', country: 'France', category: 'CAR' },
  'VR3': { brand: 'Peugeot', country: 'Spain', category: 'CAR' },
  'VF7': { brand: 'Citroën', country: 'France', category: 'CAR' },
  'VR7': { brand: 'Citroën', country: 'Spain', category: 'CAR' },
  'ZFA': { brand: 'Fiat', country: 'Italy', category: 'CAR' },
  'ZAR': { brand: 'Alfa Romeo', country: 'Italy', category: 'CAR' },
  'ZFF': { brand: 'Ferrari', country: 'Italy', category: 'CAR' },
  'ZHW': { brand: 'Lamborghini', country: 'Italy', category: 'CAR' },
  'VSS': { brand: 'SEAT / CUPRA', country: 'Spain', category: 'CAR' },
  'TMB': { brand: 'Škoda', country: 'Czech Republic', category: 'CAR' },

  // North American Cars
  '1FA': { brand: 'Ford', country: 'USA', category: 'CAR' },
  '1FT': { brand: 'Ford Truck', country: 'USA', category: 'TRUCK' },
  '1FM': { brand: 'Ford SUV', country: 'USA', category: 'CAR' },
  '1G1': { brand: 'Chevrolet', country: 'USA', category: 'CAR' },
  '1GC': { brand: 'GMC / Chevy Truck', country: 'USA', category: 'TRUCK' },
  '1J4': { brand: 'Jeep', country: 'USA', category: 'CAR' },
  '1C3': { brand: 'Chrysler', country: 'USA', category: 'CAR' },
  '5YJ': { brand: 'Tesla', country: 'USA', category: 'CAR' },
  '3VW': { brand: 'Volkswagen Mexico', country: 'Mexico', category: 'CAR' },
  '2HG': { brand: 'Honda Canada', country: 'Canada', category: 'CAR' },

  // Asian Cars
  'JTE': { brand: 'Toyota', country: 'Japan', category: 'CAR' },
  'JT2': { brand: 'Toyota', country: 'Japan', category: 'CAR' },
  'JHM': { brand: 'Honda', country: 'Japan', category: 'CAR' },
  'JN1': { brand: 'Nissan', country: 'Japan', category: 'CAR' },
  'JM1': { brand: 'Mazda', country: 'Japan', category: 'CAR' },
  'JF1': { brand: 'Subaru', country: 'Japan', category: 'CAR' },
  'KMH': { brand: 'Hyundai', country: 'South Korea', category: 'CAR' },
  'KM8': { brand: 'Hyundai SUV', country: 'South Korea', category: 'CAR' },
  'KNA': { brand: 'Kia', country: 'South Korea', category: 'CAR' },
  'KND': { brand: 'Kia SUV', country: 'South Korea', category: 'CAR' },
};

export class VinWmiDecoder {
  /**
   * Decodes 17-digit VIN to extract manufacturer WMI metadata.
   */
  public static decodeVin(rawVin: string): VinDecodeResult {
    const cleanVin = (rawVin || '').replace(/[^A-HJ-NPR-Z0-9]/gi, '').toUpperCase();
    if (cleanVin.length < 3) {
      return { vin: cleanVin, wmi: '', brand: 'Unknown', country: 'Unknown', category: 'UNKNOWN' };
    }

    const wmi = cleanVin.substring(0, 3);
    const known = WMI_MAP[wmi];

    if (known) {
      return {
        vin: cleanVin,
        wmi,
        brand: known.brand,
        country: known.country,
        category: known.category,
      };
    }

    // Fallback region heuristics based on 1st character
    const firstChar = wmi[0];
    let regionCountry = 'Global';
    if (['1', '4', '5'].includes(firstChar)) regionCountry = 'USA';
    else if (firstChar === '2') regionCountry = 'Canada';
    else if (firstChar === '3') regionCountry = 'Mexico';
    else if (['J'].includes(firstChar)) regionCountry = 'Japan';
    else if (['K'].includes(firstChar)) regionCountry = 'South Korea';
    else if (['S', 'W', 'V', 'Z'].includes(firstChar)) regionCountry = 'Europe';

    return {
      vin: cleanVin,
      wmi,
      brand: 'Generic OBD-II',
      country: regionCountry,
      category: 'CAR',
    };
  }

  /**
   * Checks if VIN WMI belongs to Stellantis / FCA group for SGW heuristic logic.
   */
  public static isStellantisFcaGroup(wmi: string): boolean {
    const cleanWmi = (wmi || '').toUpperCase();
    const fcaWmis = ['ZFA', 'ZAR', '1C3', '1J4', '3C6', '1FA'];
    return fcaWmis.includes(cleanWmi);
  }
}

export default VinWmiDecoder;
