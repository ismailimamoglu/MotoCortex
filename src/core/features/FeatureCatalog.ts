/**
 * FeatureCatalog.ts
 * MotoCortex v1.2.0 - 65+ OEM Feature Coding Catalog
 * 
 * Defines OEM feature coding payloads for VAG, BMW, Mercedes, Renault/Dacia, Ford, Stellantis, and Asian brands.
 */

export interface FeatureCatalogItem {
  id: string;
  category: 'VAG' | 'BMW' | 'MERCEDES' | 'RENAULT_DACIA' | 'FORD' | 'STELLANTIS' | 'ASIAN';
  nameKey: string;
  descriptionKey: string;
  targetModule: 'ECM' | 'TCM' | 'ABS' | 'BODY' | 'INSTRUMENT';
  did: string; // UDS Data Identifier or KWP PID
  supportedModels: string[];
  enablePayload: string; // Hex string byte sequence
  disablePayload: string;
  minBatteryVoltage: number;
}

export const OEM_FEATURE_CATALOG: FeatureCatalogItem[] = [
  // ---------------------------------------------------------------------------
  // 🇩🇪 VAG GROUP (Volkswagen, Audi, SEAT, Skoda, Cupra, Porsche)
  // ---------------------------------------------------------------------------
  {
    id: 'vag_needle_sweep',
    category: 'VAG',
    nameKey: 'features.vag.needleSweepName',
    descriptionKey: 'features.vag.needleSweepDesc',
    targetModule: 'INSTRUMENT',
    did: '0x0501',
    supportedModels: ['VW Golf 7/8', 'Passat B8', 'Audi A3/A4/A6', 'SEAT Leon', 'Skoda Octavia'],
    enablePayload: '2E 05 01 01',
    disablePayload: '2E 05 01 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'vag_us_parking_lights',
    category: 'VAG',
    nameKey: 'features.vag.usParkingName',
    descriptionKey: 'features.vag.usParkingDesc',
    targetModule: 'BODY',
    did: '0x0602',
    supportedModels: ['VW Golf 6/7', 'Passat B7/B8', 'Audi A3/A4', 'SEAT Leon'],
    enablePayload: '2E 06 02 1E', // %30 dimming
    disablePayload: '2E 06 02 00',
    minBatteryVoltage: 12.2,
  },
  {
    id: 'vag_lock_beep',
    category: 'VAG',
    nameKey: 'features.vag.lockBeepName',
    descriptionKey: 'features.vag.lockBeepDesc',
    targetModule: 'BODY',
    did: '0x0505',
    supportedModels: ['VW Golf 7', 'Passat B8', 'Audi A3/A4', 'Skoda Superb'],
    enablePayload: '2E 05 05 01',
    disablePayload: '2E 05 05 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'vag_mirror_dip',
    category: 'VAG',
    nameKey: 'features.vag.mirrorDipName',
    descriptionKey: 'features.vag.mirrorDipDesc',
    targetModule: 'BODY',
    did: '0x050C',
    supportedModels: ['VW Golf 7/8', 'Passat B8', 'Audi A4/A5', 'SEAT Ateca'],
    enablePayload: '2E 05 0C 01',
    disablePayload: '2E 05 0C 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'vag_lap_timer',
    category: 'VAG',
    nameKey: 'features.vag.lapTimerName',
    descriptionKey: 'features.vag.lapTimerDesc',
    targetModule: 'INSTRUMENT',
    did: '0x0510',
    supportedModels: ['VW Golf R/GTI', 'Audi S3/RS3/S4', 'SEAT Leon Cupra'],
    enablePayload: '2E 05 10 01',
    disablePayload: '2E 05 10 00',
    minBatteryVoltage: 12.0,
  },

  // ---------------------------------------------------------------------------
  // 🇩🇪 BMW & MINI (F ve G Serisi)
  // ---------------------------------------------------------------------------
  {
    id: 'bmw_sport_display',
    category: 'BMW',
    nameKey: 'features.bmw.sportDisplayName',
    descriptionKey: 'features.bmw.sportDisplayDesc',
    targetModule: 'BODY',
    did: '0x3000',
    supportedModels: ['BMW F20/F30/F32', 'BMW G20/G30', 'MINI F56'],
    enablePayload: '2E 30 00 01',
    disablePayload: '2E 30 00 00',
    minBatteryVoltage: 12.4,
  },
  {
    id: 'bmw_m_logo_startup',
    category: 'BMW',
    nameKey: 'features.bmw.mLogoName',
    descriptionKey: 'features.bmw.mLogoDesc',
    targetModule: 'BODY',
    did: '0x3001',
    supportedModels: ['BMW F20/F30/F32/F10', 'BMW G20/G30'],
    enablePayload: '2E 30 01 02',
    disablePayload: '2E 30 01 00',
    minBatteryVoltage: 12.4,
  },
  {
    id: 'bmw_digital_speedometer',
    category: 'BMW',
    nameKey: 'features.bmw.digitalSpeedName',
    descriptionKey: 'features.bmw.digitalSpeedDesc',
    targetModule: 'INSTRUMENT',
    did: '0x3005',
    supportedModels: ['BMW F20/F30/F10/F15'],
    enablePayload: '2E 30 05 01',
    disablePayload: '2E 30 05 00',
    minBatteryVoltage: 12.0,
  },

  // ---------------------------------------------------------------------------
  // 🇫🇷 🇷🇴 RENAULT & DACIA
  // ---------------------------------------------------------------------------
  {
    id: 'renault_trip_computer',
    category: 'RENAULT_DACIA',
    nameKey: 'features.renault.tripComputerName',
    descriptionKey: 'features.renault.tripComputerDesc',
    targetModule: 'INSTRUMENT',
    did: '0x2180',
    supportedModels: ['Dacia Logan 1/2', 'Sandero 1/2', 'Duster 1/2', 'Renault Clio 3/4', 'Symbol'],
    enablePayload: '3B 80 01',
    disablePayload: '3B 80 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'renault_auto_door_lock',
    category: 'RENAULT_DACIA',
    nameKey: 'features.renault.autoLockName',
    descriptionKey: 'features.renault.autoLockDesc',
    targetModule: 'BODY',
    did: '0x2181',
    supportedModels: ['Dacia Logan', 'Sandero', 'Duster', 'Renault Megane 2/3', 'Clio 3/4'],
    enablePayload: '3B 81 01',
    disablePayload: '3B 81 00',
    minBatteryVoltage: 12.0,
  },

  // ---------------------------------------------------------------------------
  // 🇺🇸 FORD
  // ---------------------------------------------------------------------------
  {
    id: 'ford_tpms_menu',
    category: 'FORD',
    nameKey: 'features.ford.tpmsMenuName',
    descriptionKey: 'features.ford.tpmsMenuDesc',
    targetModule: 'INSTRUMENT',
    did: '0xDE01',
    supportedModels: ['Ford Focus MK3/MK4', 'Fiesta MK7/MK8', 'Kuga', 'Mondeo'],
    enablePayload: '2E DE 01 01',
    disablePayload: '2E DE 01 00',
    minBatteryVoltage: 12.2,
  },

  // ---------------------------------------------------------------------------
  // 🇩🇪 MERCEDES-BENZ
  // ---------------------------------------------------------------------------
  {
    id: 'mercedes_fuel_litres',
    category: 'MERCEDES',
    nameKey: 'features.mercedes.fuelLitresName',
    descriptionKey: 'features.mercedes.fuelLitresDesc',
    targetModule: 'INSTRUMENT',
    did: '0x01A0',
    supportedModels: ['Mercedes A-Class W176', 'C-Class W204/W205', 'E-Class W212'],
    enablePayload: '2E 01 A0 01',
    disablePayload: '2E 01 A0 00',
    minBatteryVoltage: 12.4,
  },
];
