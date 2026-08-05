// src/core/ev/__tests__/EvBatteryPassport.test.ts
import { EvBatteryPassport } from '../EvBatteryPassport';

describe('EvBatteryPassport EU Regulation Generator', () => {
  it('generates a valid EU Battery Passport with SOH and capacity metrics', () => {
    const passport = EvBatteryPassport.generatePassport('WVWZZZ3CZWE123456', 92, 82.0, 180, 600);
    expect(passport.passportId).toContain('EU-BATT');
    expect(passport.stateOfHealthSoh).toBe(92);
    expect(passport.thermalRunawayRisk).toBe('LOW');
    expect(passport.remainingCapacityKwh).toBeCloseTo(75.4, 1);
  });

  it('detects CRITICAL thermal runaway risk for low SOH / isolation fault', () => {
    const passport = EvBatteryPassport.generatePassport('WVWZZZ3CZWE123456', 65, 82.0, 800, 150);
    expect(passport.thermalRunawayRisk).toBe('CRITICAL');
  });
});
