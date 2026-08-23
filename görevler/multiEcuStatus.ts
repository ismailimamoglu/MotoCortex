// multiEcuStatus.ts

export type EcuStatus = "CLEAN" | "FAULT_DETECTED" | "NO_RESPONSE" | "NOT_SUPPORTED";

export interface EcuScanResult {
  sourceId?: string;       // e.g., "7E8" if known
  moduleKey: string;       // e.g., "ABS", "TCM"
  rawResponse?: string;    // raw text from adapter
  dtcCodes?: string[];     // decoded codes if any
  timedOut?: boolean;
  noData?: boolean;        // explicit NO DATA
  protocol?: string;       // "CAN", "ISO9141", "KWP"
}

export function evaluateEcuStatus(r: EcuScanResult): EcuStatus {
  // Not supported protocols for headered query:
  if (r.protocol && ["ISO9141", "KWP2000"].includes(r.protocol.toUpperCase())) {
    // If you attempted CAN header addressing on K-Line, mark NOT_SUPPORTED
    return "NOT_SUPPORTED";
  }

  if (r.timedOut || r.noData || (!r.dtcCodes && !r.rawResponse)) {
    return "NO_RESPONSE";
  }

  // If the adapter delivered an empty array of DTCs (explicitly responding)
  if (Array.isArray(r.dtcCodes) && r.dtcCodes.length === 0) {
    return "CLEAN";
  }

  if (Array.isArray(r.dtcCodes) && r.dtcCodes.length > 0) {
    return "FAULT_DETECTED";
  }

  // fallback: rawResponse parsing – attempt to extract DTCs conservatively
  const potential = (r.rawResponse || "")
    .toUpperCase()
    .match(/[0-9A-F]{4}/g); // crude: 2-byte words
  if (potential && potential.length > 0) {
    return "FAULT_DETECTED";
  }

  return "NO_RESPONSE";
}