import { oemDatabaseProvider } from '../OemDatabaseProvider';

describe('OEM Feature Catalog & UDS Integrity Audit (513 Features)', () => {
  const allFeatures = oemDatabaseProvider.getFeaturesForMake();

  it('contains exactly 513 total OEM feature definitions across all brands', () => {
    expect(allFeatures.length).toBe(513);
  });

  it('ensures all 453 features have unique IDs and valid metadata', () => {
    const ids = new Set<string>();
    for (const f of allFeatures) {
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);

      expect(f.make).toBeTruthy();
      expect(f.category).toBeTruthy();
      expect(f.defaultName).toBeTruthy();
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(f.riskLevel);
    }
  });

  it('validates that all 453 features possess strict hexadecimal DIDs and Target ECU Headers', () => {
    const hexPattern = /^[0-9A-Fa-f]+$/;
    for (const f of allFeatures) {
      expect(f.didHex).toMatch(hexPattern);
      expect(f.targetEcuHeader).toMatch(hexPattern);
    }
  });

  it('covers major passenger car, motorcycle, EV and commercial groups', () => {
    const makes = new Set(allFeatures.map(f => f.make));
    // Passenger
    expect(makes.has('Volkswagen')).toBe(true);
    expect(makes.has('BMW')).toBe(true);
    expect(makes.has('Mercedes-Benz')).toBe(true);
    expect(makes.has('Toyota')).toBe(true);
    expect(makes.has('Renault')).toBe(true);
    expect(makes.has('Ford')).toBe(true);
    expect(makes.has('Hyundai')).toBe(true);
    // Motorcycles
    expect(makes.has('BMW Motorrad')).toBe(true);
    expect(makes.has('Ducati')).toBe(true);
    expect(makes.has('Yamaha')).toBe(true);
    expect(makes.has('Honda')).toBe(true);
    expect(makes.has('KTM')).toBe(true);
    // EV
    expect(makes.has('BYD')).toBe(true);
    expect(makes.has('Tesla')).toBe(true);
  });
});
