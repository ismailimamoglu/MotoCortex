/**
 * MockELM327Hardware.ts
 * MotoCortex v1.2.0 - High-Fidelity Mock ELM327 Adapter & ECU Simulator
 * 
 * Enables 100% offline protocol testing in <2 seconds via Jest without vehicle connection.
 */

export type ProtocolMode = 'AUTO_CAN' | 'CAN_500K_11' | 'CAN_500K_29' | 'KWP_2000_FAST' | 'KLINE_SLOW' | 'UNRESPONSIVE_ECU';

export class MockELM327Hardware {
  private currentProtocol: ProtocolMode = 'AUTO_CAN';
  private echoEnabled: boolean = true;
  private currentSp: string = '0';
  private isSearching: boolean = false;

  constructor(mode: ProtocolMode = 'AUTO_CAN') {
    this.currentProtocol = mode;
  }

  public setMode(mode: ProtocolMode): void {
    this.currentProtocol = mode;
  }

  /**
   * Processes raw AT / OBD2 hex command string and returns realistic hardware response.
   */
  public processCommand(rawCmd: string): string {
    const cmd = rawCmd.trim().toUpperCase().replace(/\s+/g, '');

    // 1. ELM327 Cold Reset
    if (cmd === 'ATZ') {
      this.echoEnabled = true;
      this.isSearching = false;
      return 'ELM327 v1.5\r\r>';
    }

    // 2. ELM327 Warm Start / Soft Reset
    if (cmd === 'ATWS') {
      this.isSearching = false;
      return 'ELM327 v1.5\r\r>';
    }

    // 3. Echo Off
    if (cmd === 'ATE0') {
      this.echoEnabled = false;
      return 'OK\r\r>';
    }

    // 4. Linefeed Off
    if (cmd === 'ATL0') {
      return 'OK\r\r>';
    }

    // 5. Read Firmware Version
    if (cmd === 'ATI') {
      return 'ELM327 v1.5\r\r>';
    }

    // 6. Set Protocol (AT SP x)
    if (cmd.startsWith('ATSP')) {
      const sp = cmd.replace('ATSP', '');
      this.currentSp = sp;
      this.isSearching = false;
      return 'OK\r\r>';
    }

    // 7. Describe Current Protocol (AT DP)
    if (cmd === 'ATDP') {
      switch (this.currentProtocol) {
        case 'CAN_500K_11':
          return 'ISO 15765-4 (CAN 11/500)\r\r>';
        case 'CAN_500K_29':
          return 'ISO 15765-4 (CAN 29/500)\r\r>';
        case 'KWP_2000_FAST':
          return 'ISO 14230-4 (KWP FAST)\r\r>';
        case 'KLINE_SLOW':
          return 'ISO 9141-2\r\r>';
        default:
          return 'AUTO, ISO 15765-4 (CAN 11/500)\r\r>';
      }
    }

    // 8. OBD2 Mode 01 PID 00 Handshake Query
    if (cmd === '0100') {
      if (this.currentProtocol === 'UNRESPONSIVE_ECU') {
        return 'CAN ERROR\r\r>';
      }
      return '41 00 BE 3F B8 13\r\r>';
    }

    // 9. OBD2 Mode 01 PID 0C (RPM) Query
    if (cmd === '010C') {
      if (this.currentProtocol === 'UNRESPONSIVE_ECU') {
        return 'NO DATA\r\r>';
      }
      // Returns 1724 RPM (0x1AF0 -> (0x1A * 256 + 0xF0) / 4 = 1724 RPM)
      return '41 0C 1A F0\r\r>';
    }

    // 10. OBD2 Mode 01 PID 0D (Speed) Query
    if (cmd === '010D') {
      if (this.currentProtocol === 'UNRESPONSIVE_ECU') {
        return 'NO DATA\r\r>';
      }
      // Returns 50 km/h (0x32 = 50)
      return '41 0D 32\r\r>';
    }

    // 11. Read Fault Codes (Mode 03 DTC)
    if (cmd === '03') {
      if (this.currentProtocol === 'UNRESPONSIVE_ECU') {
        return 'NO DATA\r\r>';
      }
      // Returns P0300 (Random Misfire) -> 43 01 33 00 00 00 00
      return '43 01 33 00 00 00 00\r\r>';
    }

    // Fallback OK for standard AT commands
    if (cmd.startsWith('AT')) {
      return 'OK\r\r>';
    }

    return 'NO DATA\r\r>';
  }
}
