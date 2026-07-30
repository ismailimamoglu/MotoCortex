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

    // 8. OBD2 Mode 01 PID 00/20/40/60/80 Handshake & Capability Queries
    if (cmd === '0100') {
      if (this.currentProtocol === 'UNRESPONSIVE_ECU') {
        return 'CAN ERROR\r\r>';
      }
      return '41 00 BE 3F B8 13\r\r>';
    }
    if (cmd === '0120') return '41 20 FF FF FF FF\r\r>';
    if (cmd === '0140') return '41 40 FF FF FF FF\r\r>';
    if (cmd === '0160') return '41 60 FF FF FF FF\r\r>';
    if (cmd === '0180') return '41 80 FF FF FF FF\r\r>';

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

    // 12. Torque PIDs (Mode 01 PID 61, 62, 63)
    if (cmd === '0161') return '41 61 9B\r\r>'; // 30%
    if (cmd === '0162') return '41 62 A0\r\r>'; // 35%
    if (cmd === '0163') return '41 63 01 C2\r\r>'; // 450 Nm

    // 13. Diesel & Euro-6 Emission PIDs (AdBlue 9B, EGT 78/79, NOx 83)
    if (cmd === '019B') return '41 9B CB\r\r>'; // 80% AdBlue
    if (cmd === '0178') return '41 78 19 00\r\r>'; // 600°C EGT B1S1
    if (cmd === '0179') return '41 79 17 70\r\r>'; // 560°C EGT B1S2
    if (cmd === '0183') return '41 83 00 2D\r\r>'; // 45 ppm NOx

    // 14. Freeze Frame PIDs (Mode 02)
    if (cmd.startsWith('0202')) return '42 02 01 13\r\r>'; // P0113 DTC
    if (cmd.startsWith('020C')) return '42 0C 1A F0\r\r>'; // 1724 RPM
    if (cmd.startsWith('020D')) return '42 0D 32\r\r>'; // 50 KM/H
    if (cmd.startsWith('0205')) return '42 05 7F\r\r>'; // 87 °C
    if (cmd.startsWith('0211')) return '42 11 40\r\r>'; // 25% Throttle
    if (cmd.startsWith('020B')) return '42 0B 64\r\r>'; // 100 kPa MAP
    if (cmd.startsWith('0206')) return '42 06 85\r\r>'; // STFT +2.3%

    // 15. Mode 09 CVN & Mode 06 Monitor Test
    if (cmd === '0906') return '49 06 01 9F A2 8B 1C\r\r>';
    if (cmd === '0600') return '46 01 01 00 00 50 00 10 00 C8\r\r>';

    // 16. Global Telemetry PIDs (Baro, Wideband O2, Oil Temp, Trans Temp, Catalyst Temp, Ethanol, Timing Advance)
    if (cmd === '0133') return '41 33 65\r\r>'; // 101 kPa Baro
    if (cmd === '0134') return '41 34 80 00 80 00\r\r>'; // Lambda 1.0 (14.7 AFR)
    if (cmd === '013C') return '41 3C 19 00\r\r>'; // 600°C Catalyst Temp B1
    if (cmd === '013D') return '41 3D 17 70\r\r>'; // 560°C Catalyst Temp B2
    if (cmd === '0152') return '41 52 1A\r\r>'; // 10% Ethanol
    if (cmd === '015C') return '41 5C 84\r\r>'; // 92°C Engine Oil Temp
    if (cmd === '017C') return '41 7C 7D\r\r>'; // 85°C Transmission Temp
    if (cmd === '010E') return '41 0E 95\r\r>'; // 10.5° Timing Advance

    // 17. Multi-PID Packed Command Mock (e.g. 010C0D0B11)
    if (cmd.startsWith('01') && cmd.length > 4) {
      return '41 0C 1A F0 0D 32 0B 64 11 40\r\r>';
    }

    // Fallback OK for standard AT commands
    if (cmd.startsWith('AT')) {
      return 'OK\r\r>';
    }

    return 'NO DATA\r\r>';
  }
}
