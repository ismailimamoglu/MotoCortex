/**
 * FeatureCatalog.test.ts
 * MotoCortex v1.2.0 - OEM Feature Catalog Verification Test Suite
 */

import { OEM_FEATURE_CATALOG } from '../FeatureCatalog';

describe('OEM Feature Catalog Verification Test Suite', () => {
  test('1. Verify catalog contains items across all major brand categories', () => {
    expect(OEM_FEATURE_CATALOG.length).toBeGreaterThan(5);

    const categories = OEM_FEATURE_CATALOG.map((item) => item.category);
    expect(categories).toContain('VAG');
    expect(categories).toContain('BMW');
    expect(categories).toContain('RENAULT_DACIA');
    expect(categories).toContain('FORD');
    expect(categories).toContain('MERCEDES');
  });

  test('2. Verify VAG Needle Sweep payload structure and minimum battery requirement', () => {
    const needleSweep = OEM_FEATURE_CATALOG.find((item) => item.id === 'vag_needle_sweep');
    expect(needleSweep).toBeDefined();
    expect(needleSweep?.did).toBe('0x0501');
    expect(needleSweep?.minBatteryVoltage).toBeGreaterThanOrEqual(12.0);
    expect(needleSweep?.enablePayload).toBe('2E 05 01 01');
  });

  test('3. Verify Renault / Dacia Trip Computer KWP payload', () => {
    const tripComp = OEM_FEATURE_CATALOG.find((item) => item.id === 'renault_trip_computer');
    expect(tripComp).toBeDefined();
    expect(tripComp?.targetModule).toBe('INSTRUMENT');
    expect(tripComp?.enablePayload).toBe('3B 80 01');
  });

  test('4. Verify BMW Sport Display UDS payload', () => {
    const sportDisplay = OEM_FEATURE_CATALOG.find((item) => item.id === 'bmw_sport_display');
    expect(sportDisplay).toBeDefined();
    expect(sportDisplay?.did).toBe('0x3000');
    expect(sportDisplay?.minBatteryVoltage).toBe(12.4);
  });
});
