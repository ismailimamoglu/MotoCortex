import { PgnDecoder } from '../PgnDecoder';

describe('PgnDecoder', () => {
  it('correctly decodes PGN 61444 (Engine Speed & Torque)', () => {
    // Byte 2 = 0x9B (155 - 125 = 30%), Bytes 3-4 = 0x20 0x1F (0x1F20 = 7968 * 0.125 = 996 RPM)
    const hex = '00 00 9B 20 1F 00 00 00';
    const decoded = PgnDecoder.decodePgn(61444, hex);
    expect(decoded.engineRpm).toBe(996);
    expect(decoded.engineTorquePercent).toBe(30);
  });

  it('correctly decodes PGN 65269 (Air Brake Pressure Bar 1 & 2)', () => {
    // Byte 0 = 0x64 (100 * 0.08 = 8.0 bar), Byte 1 = 0x5A (90 * 0.08 = 7.2 bar)
    const hex = '64 5A 00 00 00 00 00 00';
    const decoded = PgnDecoder.decodePgn(65269, hex);
    expect(decoded.airBrakePressureBar1).toBe(8.0);
    expect(decoded.airBrakePressureBar2).toBe(7.2);
  });

  it('correctly decodes PGN 65110 (DEF / AdBlue Level %)', () => {
    // Byte 0 = 0xC8 (200 * 0.4 = 80%)
    const hex = 'C8 00 00 00 00 00 00 00';
    const decoded = PgnDecoder.decodePgn(65110, hex);
    expect(decoded.defLevelPercent).toBe(80);
  });

  it('correctly decodes PGN 65257 (Total Engine Hours)', () => {
    // Bytes 0-3 = 0x20 0x4E 0x00 0x00 (20000 * 0.05 = 1000.0 hours)
    const hex = '20 4E 00 00 00 00 00 00';
    const decoded = PgnDecoder.decodePgn(65257, hex);
    expect(decoded.engineHoursTotal).toBe(1000.0);
  });
});
