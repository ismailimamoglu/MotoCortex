// src/core/protocol/j1939/J1939ProtocolEngine.ts
// MotoCortex v10.0 - SAE J1939 Commercial Heavy-Duty (24V Truck/Bus/Agri) Diagnostic Engine

export interface J1939CanHeader {
  priority: number;
  pgn: number;
  sourceAddress: number;
  destinationAddress: number;
  isBroadcast: boolean;
}

export interface J1939Dtc {
  spn: number; // Suspect Parameter Number
  fmi: number; // Failure Mode Identifier
  occurrenceCount: number;
  conversionMethod: number;
  spnDescription: string;
  fmiDescription: string;
}

export class J1939ProtocolEngine {
  /**
   * Parse 29-bit Extended CAN Identifier into SAE J1939 Header fields.
   * Format: Priority (3 bits) | Reserved/DP (2 bits) | PF (8 bits) | PS (8 bits) | SA (8 bits)
   */
  public static parseHeader(canId29Hex: string): J1939CanHeader {
    const canId = parseInt(canId29Hex, 16) & 0x1FFFFFFF;

    const priority = (canId >> 26) & 0x07;
    const dp = (canId >> 24) & 0x03;
    const pf = (canId >> 16) & 0xFF;
    const ps = (canId >> 8) & 0xFF;
    const sa = canId & 0xFF;

    let pgn: number;
    let da = 0xFF; // Broadcast default
    let isBroadcast = true;

    if (pf < 240) {
      // PDU1 format: Peer-to-peer (PS contains Destination Address)
      pgn = (dp << 16) | (pf << 8);
      da = ps;
      isBroadcast = false;
    } else {
      // PDU2 format: Broadcast (PS contains PGN Extension)
      pgn = (dp << 16) | (pf << 8) | ps;
    }

    return {
      priority,
      pgn,
      sourceAddress: sa,
      destinationAddress: da,
      isBroadcast,
    };
  }

  /**
   * Parse SAE J1939 Diagnostic Message 1 (DM1 - Active DTCs) Payload (8 Bytes)
   * Bytes 0-1: Lamp status
   * Bytes 2-5: SPN (19 bits), FMI (5 bits), Occurrence Count (7 bits)
   */
  public static parseDm1Payload(hexData: string): J1939Dtc[] {
    const bytes = hexData.replace(/\s+/g, '').match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || [];
    if (bytes.length < 6) return [];

    const dtcs: J1939Dtc[] = [];

    // Process 4-byte DTC blocks starting at offset 2
    for (let offset = 2; offset + 3 < bytes.length; offset += 4) {
      const b0 = bytes[offset];
      const b1 = bytes[offset + 1];
      const b2 = bytes[offset + 2];
      const b3 = bytes[offset + 3];

      // If bytes are 0x00 or 0xFF filler, skip
      if ((b0 === 0x00 && b1 === 0x00 && b2 === 0x00) || (b0 === 0xFF && b1 === 0xFF && b2 === 0xFF)) {
        continue;
      }

      // SPN = (b2[7:5] << 16) | (b1 << 8) | b0
      const spnLow = b0;
      const spnMid = b1;
      const spnHigh = (b2 >> 5) & 0x07;
      const spn = (spnHigh << 16) | (spnMid << 8) | spnLow;

      // FMI = b2[4:0]
      const fmi = b2 & 0x1F;

      // CM = (b3 >> 7) & 0x01, OC = b3 & 0x7F
      const oc = b3 & 0x7F;
      const cm = (b3 >> 7) & 0x01;

      dtcs.push({
        spn,
        fmi,
        occurrenceCount: oc,
        conversionMethod: cm,
        spnDescription: J1939ProtocolEngine.getSpnDescription(spn),
        fmiDescription: J1939ProtocolEngine.getFmiDescription(fmi),
      });
    }

    return dtcs;
  }

  public static getSpnDescription(spn: number): string {
    switch (spn) {
      case 100: return 'Engine Oil Pressure';
      case 102: return 'Engine Intake Manifold #1 Pressure';
      case 105: return 'Engine Intake Manifold #1 Temperature';
      case 110: return 'Engine Coolant Temperature';
      case 190: return 'Engine Speed (RPM)';
      case 513: return 'Actual Engine - Percent Torque';
      case 91:  return 'Accelerator Pedal Position 1';
      case 183: return 'Engine Fuel Rate';
      default:  return `Commercial Heavy-Duty SPN-${spn}`;
    }
  }

  public static getFmiDescription(fmi: number): string {
    switch (fmi) {
      case 0: return 'Data Valid But Above Normal Operational Range - Most Severe';
      case 1: return 'Data Valid But Below Normal Operational Range - Most Severe';
      case 2: return 'Data Erratic, Intermittent Or Incorrect';
      case 3: return 'Voltage Above Normal, Or Shorted To High Source';
      case 4: return 'Voltage Below Normal, Or Shorted To Low Source';
      case 5: return 'Current Below Normal Or Open Circuit';
      case 6: return 'Current Above Normal Or Grounded Circuit';
      case 7: return 'Mechanical System Not Responding Or Out Of Adjustment';
      case 8: return 'Abnormal Frequency Or Pulse Width Or Period';
      case 9: return 'Abnormal Update Rate';
      case 10: return 'Abnormal Rate Of Change';
      case 11: return 'Root Cause Not Known';
      case 12: return 'Bad Intelligent Device Or Component';
      case 13: return 'Out Of Calibration';
      case 14: return 'Special Instructions';
      case 31: return 'Condition Exists';
      default: return `FMI-${fmi} Unknown Failure Mode`;
    }
  }
}
