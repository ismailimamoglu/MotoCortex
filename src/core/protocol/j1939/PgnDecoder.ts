// src/core/protocol/j1939/PgnDecoder.ts
// MotoCortex - SAE J1939 Parameter Group Number (PGN) Live Sensor Decoder

export interface DecodedJ1939Sensors {
  engineRpm?: number;
  engineTorquePercent?: number;
  airBrakePressureBar1?: number;
  airBrakePressureBar2?: number;
  defLevelPercent?: number;
  engineHoursTotal?: number;
}

export class PgnDecoder {
  /**
   * Decodes an 8-byte hex payload according to the specified PGN.
   * Hex string format: e.g. "00 FF 12 34 56 78 90 AB"
   */
  public static decodePgn(pgn: number, hexData: string): DecodedJ1939Sensors {
    const bytes = hexData.replace(/\s+/g, '').match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
    if (bytes.length < 8) return {};

    const result: DecodedJ1939Sensors = {};

    switch (pgn) {
      case 61444: // 0xF004 - EEC1 (Electronic Engine Controller 1)
        // Bytes 3-4: Engine Speed (RPM), resolution: 0.125 RPM/bit, 0 offset
        {
          const rpmRaw = (bytes[4] << 8) | bytes[3];
          if (rpmRaw !== 0xFFFF) {
            result.engineRpm = Math.round(rpmRaw * 0.125);
          }
          // Byte 2: Actual Engine - Percent Torque, resolution: 1 %/bit, offset: -125 %
          const torqueRaw = bytes[2];
          if (torqueRaw !== 0xFF) {
            result.engineTorquePercent = torqueRaw - 125;
          }
        }
        break;

      case 65269: // 0xFEF5 - Air Pressure / Ambient Conditions
        // Byte 0: Air Pressure (Bar 1), resolution: 8 kPa/bit (approx 0.08 bar/bit)
        {
          const p1Raw = bytes[0];
          if (p1Raw !== 0xFF) {
            result.airBrakePressureBar1 = Number((p1Raw * 0.08).toFixed(1));
          }
          // Byte 1: Air Pressure (Bar 2)
          const p2Raw = bytes[1];
          if (p2Raw !== 0xFF) {
            result.airBrakePressureBar2 = Number((p2Raw * 0.08).toFixed(1));
          }
        }
        break;

      case 65110: // 0xFE56 - Aftertreatment 1 DEF Tank Info
        // Byte 0: SPN 1761 - Catalyst Tank Level %, resolution: 0.4 %/bit, 0 offset
        {
          const defRaw = bytes[0];
          if (defRaw !== 0xFF) {
            result.defLevelPercent = Math.min(100, Math.round(defRaw * 0.4));
          }
        }
        break;

      case 65257: // 0xFEE9 - Engine Hours & Revolutions
        // Bytes 0-3: Total Engine Hours (SPN 247), resolution: 0.05 hr/bit, 0 offset
        {
          const hoursRaw = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
          if (hoursRaw !== 0xFFFFFFFF) {
            result.engineHoursTotal = Number((hoursRaw * 0.05).toFixed(1));
          }
        }
        break;
    }

    return result;
  }
}
