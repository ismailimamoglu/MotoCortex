// src/core/coding/__tests__/VinMarketRouter.test.ts
import { VinMarketRouter } from '../VinMarketRouter';

describe('VinMarketRouter Regional Payload Router', () => {
  it('correctly maps North American WMI (e.g. 1FA...)', () => {
    const profile = VinMarketRouter.resolveMarketProfile('1FA6P8CF0H5123456');
    expect(profile.region).toBe('NORTH_AMERICA');
    expect(profile.isRhd).toBe(false);
    expect(profile.didPayloadOverrides['2001']).toBe('01');
  });

  it('correctly maps European WMI (e.g. WVW...)', () => {
    const profile = VinMarketRouter.resolveMarketProfile('WVWZZZ3CZWE123456');
    expect(profile.region).toBe('EUROPE');
    expect(profile.isRhd).toBe(false);
    expect(profile.didPayloadOverrides['2001']).toBe('02');
  });

  it('correctly maps Japanese WMI (e.g. JTE...)', () => {
    const profile = VinMarketRouter.resolveMarketProfile('JTEEP21A900123456');
    expect(profile.region).toBe('JAPAN');
    expect(profile.isRhd).toBe(true);
  });

  it('correctly maps Chinese EV WMI (e.g. LC0...)', () => {
    const profile = VinMarketRouter.resolveMarketProfile('LC0BYD88800123456');
    expect(profile.region).toBe('CHINA');
    expect(profile.didPayloadOverrides['3001']).toBe('FF');
  });
});
