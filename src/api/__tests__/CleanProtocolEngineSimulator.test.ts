/**
 * CleanProtocolEngineSimulator.test.ts
 * MotoCortex v1.2.0 - 100% Offline Protocol Test Suite
 */

import { MockELM327Hardware } from '../mock/MockELM327Hardware';

describe('CleanProtocolEngine Mock Hardware Test Suite', () => {
  let mockHw: MockELM327Hardware;

  beforeEach(() => {
    mockHw = new MockELM327Hardware('AUTO_CAN');
  });

  test('1. Ultra-fast Auto Handshake Sequence (AT Z -> AT E0 -> AT SP 0 -> 01 00)', () => {
    const atzRes = mockHw.processCommand('AT Z');
    expect(atzRes).toContain('ELM327 v1.5');

    const ate0Res = mockHw.processCommand('AT E0');
    expect(ate0Res).toBe('OK\r\r>');

    const atsp0Res = mockHw.processCommand('AT SP 0');
    expect(atsp0Res).toBe('OK\r\r>');

    const initRes = mockHw.processCommand('01 00');
    expect(initRes).toContain('41 00');
  });

  test('2. Protocol Mode Switching (CAN 500k 11bit / 29bit / KWP2000)', () => {
    mockHw.setMode('CAN_500K_11');
    expect(mockHw.processCommand('AT DP')).toContain('CAN 11/500');

    mockHw.setMode('CAN_500K_29');
    expect(mockHw.processCommand('AT DP')).toContain('CAN 29/500');

    mockHw.setMode('KWP_2000_FAST');
    expect(mockHw.processCommand('AT DP')).toContain('KWP FAST');
  });

  test('3. Live Data Sensor Stream Decoding (RPM & Speed)', () => {
    const rpmRes = mockHw.processCommand('01 0C');
    expect(rpmRes).toContain('41 0C 1A F0'); // 1724 RPM

    const speedRes = mockHw.processCommand('01 0D');
    expect(speedRes).toContain('41 0D 32'); // 50 km/h
  });

  test('4. Diagnostic Fault Code (DTC Mode 03) Read Simulation', () => {
    const dtcRes = mockHw.processCommand('03');
    expect(dtcRes).toContain('43 01 33'); // P0300 Misfire
  });

  test('5. Unresponsive ECU Fallback Guard Simulation', () => {
    mockHw.setMode('UNRESPONSIVE_ECU');
    const initRes = mockHw.processCommand('01 00');
    expect(initRes).toContain('CAN ERROR');
  });
});
