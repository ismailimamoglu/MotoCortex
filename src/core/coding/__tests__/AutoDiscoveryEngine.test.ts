// src/core/coding/__tests__/AutoDiscoveryEngine.test.ts
import AutoDiscoveryEngine from '../AutoDiscoveryEngine';

describe('AutoDiscoveryEngine Dynamic UDS DID Scanner', () => {
  it('scans non-safety ECU modules and discovers supported DIDs', async () => {
    const mockSend = jest.fn().mockImplementation((cmd: string) => {
      if (cmd === '222001') return Promise.resolve('62200101');
      if (cmd === '222002') return Promise.resolve('622002FF');
      return Promise.resolve('7F2231'); // NRC Request Out of Range
    });

    const progressLogs: any[] = [];
    const results = await AutoDiscoveryEngine.scanEcuCapabilities(0x09, mockSend, (p) => progressLogs.push(p));

    expect(results).toHaveLength(2);
    expect(results[0].didHex).toBe('2001');
    expect(results[0].suggestedFeatureName).toContain('Daytime Running Light');
    expect(results[1].didHex).toBe('2002');
    expect(progressLogs.length).toBeGreaterThan(0);
  });

  it('aborts scan on Safety-Critical ECUs (e.g. ABS / Airbag 0x7D0)', async () => {
    const mockSend = jest.fn();
    const results = await AutoDiscoveryEngine.scanEcuCapabilities(0x7D0, mockSend);
    expect(results).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
