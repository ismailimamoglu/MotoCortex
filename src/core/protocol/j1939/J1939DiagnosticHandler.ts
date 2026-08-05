// src/core/protocol/j1939/J1939DiagnosticHandler.ts
// MotoCortex v10.0 - SAE J1939 Heavy-Duty Active (DM1) & Stored (DM2) Diagnostic Manager

import { J1939ProtocolEngine, J1939Dtc } from './J1939ProtocolEngine';

export class J1939DiagnosticHandler {
  // PGN 65226 (0xFECA) = DM1 (Active Diagnostic Trouble Codes)
  public static readonly PGN_DM1 = 65226;
  // PGN 65227 (0xFECB) = DM2 (Previously Active Fault Codes)
  public static readonly PGN_DM2 = 65227;
  // PGN 65228 (0xFECC) = DM3 (Diagnostic Data Clear/Reset Previously Active)
  public static readonly PGN_DM3 = 65228;

  /**
   * Request DM1 Active Fault Codes from heavy-duty ECU.
   * Command frame: Request PGN 0xEA00 + Target PGN (0xFECA)
   */
  public static buildDm1RequestCommand(targetSa: number = 0x00): string {
    // 0xEA00 = PGN Request command
    return `ATSH 18EA00${targetSa.toString(16).padStart(2, '0').toUpperCase()}\r00FECA\r`;
  }

  /**
   * Request DM2 Stored Fault Codes.
   */
  public static buildDm2RequestCommand(targetSa: number = 0x00): string {
    return `ATSH 18EA00${targetSa.toString(16).padStart(2, '0').toUpperCase()}\r00FECB\r`;
  }

  /**
   * Build DM3 Clear Stored Fault Codes command.
   */
  public static buildDm3ClearCommand(targetSa: number = 0x00): string {
    return `ATSH 18EA00${targetSa.toString(16).padStart(2, '0').toUpperCase()}\r00FECC\r`;
  }

  /**
   * Parse heavy-duty raw response into structured J1939Dtc array.
   */
  public static processDiagnosticResponse(rawHexPayload: string): J1939Dtc[] {
    if (!rawHexPayload || rawHexPayload.includes('NO DATA')) {
      return [];
    }
    return J1939ProtocolEngine.parseDm1Payload(rawHexPayload);
  }
}
