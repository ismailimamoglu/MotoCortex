/**
 * ISO 14229 UDS (Unified Diagnostic Services) Protocol Engine
 * Supports OEM Service Interval Maintenance Reset, Actuator Tests, & Deep ECU Subsystem Diagnostics.
 */

export enum UdsServiceId {
  DIAGNOSTIC_SESSION_CONTROL = 0x10,
  ECU_RESET = 0x11,
  CLEAR_DIAGNOSTIC_INFORMATION = 0x14,
  READ_DTC_INFORMATION = 0x19,
  READ_DATA_BY_IDENTIFIER = 0x22,
  SECURITY_ACCESS = 0x27,
  WRITE_DATA_BY_IDENTIFIER = 0x2E,
  ROUTINE_CONTROL = 0x31,
  TESTER_PRESENT = 0x3E,
}

export enum UdsSessionType {
  DEFAULT = 0x01,
  PROGRAMMING = 0x02,
  EXTENDED_DIAGNOSTIC = 0x03,
  SAFETY_SYSTEM = 0x04,
}

export interface UdsResponse {
  success: boolean;
  serviceId: number;
  data: Uint8Array;
  nrc?: number; // Negative Response Code (e.g. 0x22 ConditionsNotCorrect, 0x31 RequestOutOfRange)
  errorMessage?: string;
}

export class UdsProtocolEngine {
  /**
   * Encodes a UDS request into raw byte payload for ISO-TP transmission
   */
  public static encodeRequest(serviceId: UdsServiceId, subFunction?: number, data?: number[]): string {
    const payload: number[] = [serviceId];
    if (subFunction !== undefined) {
      payload.push(subFunction);
    }
    if (data && data.length > 0) {
      payload.push(...data);
    }

    return payload.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Encodes Service Maintenance Light Reset Routine Control Request (Service 0x31)
   */
  public static encodeServiceResetRequest(brand: string): string {
    const cleanBrand = (brand || '').toUpperCase();

    if (cleanBrand.includes('BMW')) {
      // BMW Motorrad Service Reset Routine ID 0x0201
      return this.encodeRequest(UdsServiceId.ROUTINE_CONTROL, 0x01, [0x02, 0x01]);
    } else if (cleanBrand.includes('DUCATI')) {
      // Ducati Service Reset Routine ID 0x0512
      return this.encodeRequest(UdsServiceId.ROUTINE_CONTROL, 0x01, [0x05, 0x12]);
    } else if (cleanBrand.includes('KTM') || cleanBrand.includes('HUSQVARNA')) {
      // KTM Service Reset Routine ID 0x0110
      return this.encodeRequest(UdsServiceId.ROUTINE_CONTROL, 0x01, [0x01, 0x10]);
    } else if (cleanBrand.includes('YAMAHA')) {
      // Yamaha Service Reset Routine ID 0x0302
      return this.encodeRequest(UdsServiceId.ROUTINE_CONTROL, 0x01, [0x03, 0x02]);
    }

    // Generic EOBD Service Reset (Routine 0x0100)
    return this.encodeRequest(UdsServiceId.ROUTINE_CONTROL, 0x01, [0x01, 0x00]);
  }

  /**
   * Decodes UDS raw response bytes
   */
  public static decodeResponse(rawResponseHex: string): UdsResponse {
    const cleanHex = rawResponseHex.replace(/\s+/g, '').toUpperCase();
    if (cleanHex.length < 2) {
      return { success: false, serviceId: 0, data: new Uint8Array(), errorMessage: 'Response too short' };
    }

    const firstByte = parseInt(cleanHex.substring(0, 2), 16);
    if (isNaN(firstByte)) {
      return { success: false, serviceId: 0, data: new Uint8Array(), errorMessage: 'Invalid UDS response hex' };
    }

    // Negative Response Check (0x7F)
    if (firstByte === 0x7F) {
      const originalService = parseInt(cleanHex.substring(2, 4), 16) || 0;
      const nrc = parseInt(cleanHex.substring(4, 6), 16) || 0xFF;
      return {
        success: false,
        serviceId: originalService,
        data: new Uint8Array(),
        nrc,
        errorMessage: `UDS Negative Response (NRC 0x${nrc.toString(16).toUpperCase()})`,
      };
    }

    // Positive Response: ServiceId + 0x40
    const reqBytes = [];
    for (let i = 2; i < cleanHex.length; i += 2) {
      reqBytes.push(parseInt(cleanHex.substring(i, i + 2), 16));
    }

    return {
      success: true,
      serviceId: firstByte - 0x40,
      data: new Uint8Array(reqBytes),
    };
  }
}
