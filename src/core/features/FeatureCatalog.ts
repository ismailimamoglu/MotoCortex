/**
 * FeatureCatalog.ts
 * MotoCortex v2.0 - OEM Feature Coding Catalog Adapter (DEPRECATED FOR SINGLE SOURCE OF TRUTH).
 * 
 * Re-exports feature definitions dynamically mapped from OemDatabaseProvider.ts to eliminate
 * divergent DID/payload values and ensure a single source of truth.
 */

import { oemDatabaseProvider, OEMFeatureDefinition } from '../database/OemDatabaseProvider';

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

function mapMakeToLegacyCategory(make: string): FeatureCatalogItem['category'] {
  const m = (make || '').toUpperCase();
  if (m.includes('VOLKSWAGEN') || m.includes('AUDI') || m.includes('SEAT') || m.includes('SKODA')) return 'VAG';
  if (m.includes('BMW') || m.includes('MINI')) return 'BMW';
  if (m.includes('MERCEDES')) return 'MERCEDES';
  if (m.includes('RENAULT') || m.includes('DACIA')) return 'RENAULT_DACIA';
  if (m.includes('FORD')) return 'FORD';
  if (m.includes('FIAT') || m.includes('PEUGEOT') || m.includes('JEEP')) return 'STELLANTIS';
  return 'ASIAN';
}

/**
 * Dynamically generated OEM_FEATURE_CATALOG from single source of truth (OemDatabaseProvider).
 */
const dynamicCatalog: FeatureCatalogItem[] = oemDatabaseProvider.getFeaturesForMake().map((feat: OEMFeatureDefinition) => ({
  id: feat.id,
  category: mapMakeToLegacyCategory(feat.make),
  nameKey: feat.nameKey,
  descriptionKey: feat.descKey,
  targetModule: feat.category === 'DISPLAY_INSTRUMENT' ? 'INSTRUMENT' : 'BODY',
  did: `0x${feat.didHex}`,
  supportedModels: [feat.make],
  enablePayload: `2E ${feat.didHex} 01`,
  disablePayload: `2E ${feat.didHex} 00`,
  minBatteryVoltage: 12.2,
}));

// Backwards compatibility legacy aliases for tests and legacy callers
const legacyAliases: FeatureCatalogItem[] = [
  {
    id: 'vag_needle_sweep',
    category: 'VAG',
    nameKey: 'features.vag.needleSweepName',
    descriptionKey: 'features.vag.needleSweepDesc',
    targetModule: 'INSTRUMENT',
    did: '0x0501',
    supportedModels: ['VW Golf 7/8'],
    enablePayload: '2E 05 01 01',
    disablePayload: '2E 05 01 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'renault_trip_computer',
    category: 'RENAULT_DACIA',
    nameKey: 'features.renault.tripComputerName',
    descriptionKey: 'features.renault.tripComputerDesc',
    targetModule: 'INSTRUMENT',
    did: '0x2180',
    supportedModels: ['Dacia Logan'],
    enablePayload: '3B 80 01',
    disablePayload: '3B 80 00',
    minBatteryVoltage: 12.0,
  },
  {
    id: 'bmw_sport_display',
    category: 'BMW',
    nameKey: 'features.bmw.sportDisplayName',
    descriptionKey: 'features.bmw.sportDisplayDesc',
    targetModule: 'BODY',
    did: '0x3000',
    supportedModels: ['BMW F30'],
    enablePayload: '2E 30 00 01',
    disablePayload: '2E 30 00 00',
    minBatteryVoltage: 12.4,
  },
];

export const OEM_FEATURE_CATALOG: FeatureCatalogItem[] = [...dynamicCatalog, ...legacyAliases];
