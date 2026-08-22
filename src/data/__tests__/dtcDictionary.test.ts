import { lookupDTC, prefetchDtcChunksForCodes } from '../dtcDictionary';
import { preloadDynamicDtc, lookupDtcSync } from '../dtcStorage';

describe('DTC Dictionary & Database Storage Integration', () => {
  test('should lookup description for known Powertrain DTC (P0113)', () => {
    const desc = lookupDTC('P0113');
    expect(desc).toBeDefined();
    expect(desc).not.toBeNull();
    expect(typeof desc).toBe('string');
    expect(desc?.length).toBeGreaterThan(0);
  });

  test('should lookup description for P0300 Random Misfire', () => {
    const desc = lookupDTC('P0300');
    expect(desc).toBeDefined();
    expect(desc).not.toBeNull();
    expect(desc).toMatch(/Ateşleme|Misfire/i);
  });

  test('should lookup description for Network DTC (U0100)', () => {
    const desc = lookupDTC('U0100');
    expect(desc).toBeDefined();
    expect(desc).not.toBeNull();
  });

  test('should handle case insensitivity and whitespace', () => {
    const descLower = lookupDTC('  p0113  ');
    const descUpper = lookupDTC('P0113');
    expect(descLower).toEqual(descUpper);
  });

  test('should prefetch DTC chunks without throwing errors', () => {
    expect(() => {
      prefetchDtcChunksForCodes(['P0113', 'P0300', 'C0035', 'B0001', 'U0100']);
    }).not.toThrow();
  });

  test('should safely handle preloadDynamicDtc for valid make', async () => {
    await expect(preloadDynamicDtc('BMW')).resolves.not.toThrow();
  });

  test('should return description from lookupDtcSync for bundled chunk', () => {
    const desc = lookupDtcSync('P0102');
    expect(desc).toBeDefined();
  });

  test('should correctly parse multi-ECU Mode 03 hex response payloads into P/C/B/U codes', () => {
    const { MultiEcuService } = require('../../services/multiEcuService');
    const rawResponse = '43 01 0C 43 40 35 43 80 01 43 C1 00';
    const parsed = MultiEcuService.parseDtcPayload(rawResponse);
    expect(parsed).toContain('P010C');
    expect(parsed).toContain('C0035');
    expect(parsed).toContain('B0001');
    expect(parsed).toContain('U0100');
  });
});
