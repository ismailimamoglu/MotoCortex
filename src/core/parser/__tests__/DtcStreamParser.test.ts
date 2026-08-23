import { decodeDtcCodesFromResponse, decodeDtcPair } from '../DtcStreamParser';

describe('DtcStreamParser - Deterministic DTC & Multi-Frame Parser', () => {
  it('should correctly parse the real-world Honda Accord concatenated stream without ghost DTCs', () => {
    // Exact raw response from the 2004 Honda Accord field test log (Lines 90-91)
    const rawHondaLog = `43115703020304\r43030003010000\r>`;

    const dtcs = decodeDtcCodesFromResponse(rawHondaLog);

    // Expected real DTCs:
    // P1157 (A/F Sensor High Voltage)
    // P0302 (Cylinder 2 Misfire)
    // P0304 (Cylinder 4 Misfire)
    // P0300 (Random Misfire)
    // P0301 (Cylinder 1 Misfire)
    expect(dtcs).toEqual(expect.arrayContaining(['P1157', 'P0302', 'P0304', 'P0300', 'P0301']));
    expect(dtcs.length).toBe(5);

    // Ensure phantom DTCs are NEVER produced:
    expect(dtcs).not.toContain('C0303');
    expect(dtcs).not.toContain('P0003');
    expect(dtcs).not.toContain('P0100');
  });

  it('should handle CAN ISO 15765-4 headered single and multi-frame responses', () => {
    const rawCanHeadered = `
      7E8 06 43 01 03 01 02 00 00
      7E9 04 43 01 07 00 00 00 00
    `;

    const dtcs = decodeDtcCodesFromResponse(rawCanHeadered);
    expect(dtcs).toContain('P0301');
    expect(dtcs).toContain('P0200');
    expect(dtcs).toContain('P0700');
  });

  it('should decode ISO-TP First Frame and consecutive frame payload correctly', () => {
    // First frame (0x10, total len 0x0E = 14 bytes), Service 0x43 followed by DTCs
    const rawIsoTp = `7E8 10 0E 43 03 01 03 02 03 03 03 04`;
    const dtcs = decodeDtcCodesFromResponse(rawIsoTp);
    expect(dtcs).toContain('P0301');
    expect(dtcs).toContain('P0302');
    expect(dtcs).toContain('P0303');
    expect(dtcs).toContain('P0304');
  });

  it('should handle NO DATA, SEARCHING, and empty responses safely returning empty array', () => {
    expect(decodeDtcCodesFromResponse('NO DATA >')).toEqual([]);
    expect(decodeDtcCodesFromResponse('SEARCHING... UNABLE TO CONNECT >')).toEqual([]);
    expect(decodeDtcCodesFromResponse('12.1V >')).toEqual([]);
    expect(decodeDtcCodesFromResponse('')).toEqual([]);
  });

  it('should correctly decode P, C, B, U DTC types based on SAE J2012 / ISO 15031-6 standard', () => {
    // 0x01, 0x00 -> P0100
    expect(decodeDtcPair(0x01, 0x00)).toBe('P0100');
    // 0x40, 0x35 -> C0035
    expect(decodeDtcPair(0x40, 0x35)).toBe('C0035');
    // 0x80, 0x12 -> B0012
    expect(decodeDtcPair(0x80, 0x12)).toBe('B0012');
    // 0xC1, 0x00 -> U0100
    expect(decodeDtcPair(0xC1, 0x00)).toBe('U0100');
    // Padding 00 00
    expect(decodeDtcPair(0x00, 0x00)).toBeNull();
  });
});
