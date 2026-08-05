// src/core/protocol/j1939/__tests__/J1939ProtocolEngine.test.ts
import { J1939ProtocolEngine } from '../J1939ProtocolEngine';
import { J1939DiagnosticHandler } from '../J1939DiagnosticHandler';

describe('SAE J1939 Heavy-Duty Protocol Engine & Diagnostic Handler', () => {
  it('correctly parses 29-bit CAN ID into PGN and Source Address', () => {
    // 0x18FECA00 = Priority 6, PGN 65226 (0xFECA - DM1), SA 0x00 (Engine)
    const header = J1939ProtocolEngine.parseHeader('18FECA00');
    expect(header.priority).toBe(6);
    expect(header.pgn).toBe(65226);
    expect(header.sourceAddress).toBe(0);
    expect(header.isBroadcast).toBe(true);
  });

  it('correctly parses DM1 active fault payload into J1939Dtc objects', () => {
    // DM1 payload: [0x00, 0xFF, 0x64, 0x00, 0x03, 0x01] -> SPN 100 (Oil Press), FMI 3, OC 1
    const rawPayload = '00FF64000301';
    const dtcs = J1939ProtocolEngine.parseDm1Payload(rawPayload);
    expect(dtcs).toHaveLength(1);
    expect(dtcs[0].spn).toBe(100);
    expect(dtcs[0].fmi).toBe(3);
    expect(dtcs[0].occurrenceCount).toBe(1);
    expect(dtcs[0].spnDescription).toBe('Engine Oil Pressure');
    expect(dtcs[0].fmiDescription).toContain('Voltage Above Normal');
  });

  it('generates valid DM1 request command strings', () => {
    const cmd = J1939DiagnosticHandler.buildDm1RequestCommand(0x00);
    expect(cmd).toContain('ATSH 18EA0000');
    expect(cmd).toContain('00FECA');
  });
});
