/**
 * telemetrySanitizer.ts
 * 
 * MotoCortex Diagnostic & Telemetry Payload Sanitizer.
 * Enforces cryptographic VIN anonymization, Seed/Key security redaction,
 * and 2-Tier telemetry payload structure (Lite Summary vs Redacted Full Trace).
 */

import { sha256 } from './crypto';

export interface VehicleMetadata {
  wmi: string;           // First 3 chars of VIN (World Manufacturer Identifier)
  year_code: string;     // 10th char of VIN (Model Year Code)
  fuel_type: string | null;
  engine_code: string | null;
  vin_hmac: string;      // Cryptographically hashed representation of VIN
}

export interface LiteTelemetryPayload {
  session_id: string;
  anon_user_id: string;
  app_version: string;
  platform: string;
  consent_version: string;
  vehicle: VehicleMetadata;
  ecu_fingerprint: {
    header: string;
    supplier?: string;
    pid00_bitmask?: string;
    sw_id?: string;
    hw_id?: string;
    supported_services?: string[];
  };
  adapter: {
    claimed_name: string;
    real_chip_type?: string;
    capability_score: number;
    multiframe_isotp_supported: boolean;
    latency_ms: number;
  };
  metrics: {
    status: 'SUCCESS' | 'FAILED_PROTOCOL_INIT' | 'TIMEOUT' | 'UNKNOWN_ECU';
    selected_protocol: string;
    nrc_codes: string[];
    retry_count: number;
    session_duration_s: number;
  };
}

export interface FullTracePayload extends LiteTelemetryPayload {
  redacted_trace_log: Array<{
    t_ms: number;
    dir: 'TX' | 'RX';
    cmd: string;
  }>;
}

/**
 * Extracts non-PII vehicle identifiers (WMI and Year Code) from a 17-digit VIN.
 */
export function extractVehicleWmiAndYear(vin?: string): { wmi: string; year_code: string } {
  if (!vin || vin.length < 10) {
    return { wmi: 'UNK', year_code: '0' };
  }
  const cleanVin = vin.trim().toUpperCase();
  return {
    wmi: cleanVin.substring(0, 3),
    year_code: cleanVin.substring(9, 10),
  };
}

/**
 * Generates client-side hashed VIN for deduplication using SHA-256 with pepper fallback.
 */
export async function generateVinHmac(vin?: string, salt: string = 'MOTOCORTEX_PEPPER_V1'): Promise<string> {
  if (!vin || vin.length < 3) {
    return 'ANONYMOUS_UNSPECIFIED_VIN';
  }
  const cleanVin = vin.trim().toUpperCase();
  return sha256(`${cleanVin}_${salt}`);
}

/**
 * Redacts sensitive UDS 0x27 Security Access Seed/Key byte pairs from raw terminal traces.
 * Replaces seed and response keys with [REDACTED_SECURITY_BYTES] to protect IP and reverse-engineering.
 */
export function redactSecurityBytes(rawCommandOrResponse: string): string {
  if (!rawCommandOrResponse) return rawCommandOrResponse;

  const cleanText = rawCommandOrResponse.trim();

  // Redact UDS Security Access request/response (Mode 0x27 / 0x67)
  const securityAccessRegex = /(27|67)\s*(01|02|03|04|05|06)\s*([0-9A-Fa-f\s]{4,})/gi;
  if (securityAccessRegex.test(cleanText)) {
    return cleanText.replace(securityAccessRegex, '$1 $2 [REDACTED_SECURITY_BYTES]');
  }

  // Redact security seed key hex responses
  if (cleanText.startsWith('67') || cleanText.startsWith('7E8 06 67') || cleanText.startsWith('7E8 04 67')) {
    return cleanText.replace(/([0-9A-Fa-f]{2}\s*){3,}$/, '[REDACTED_SECURITY_BYTES]');
  }

  return cleanText;
}

/**
 * Asynchronously sanitizes an array of raw trace events in a background worker tick.
 */
export async function sanitizeTraceLogsAsync(
  traceLogs: Array<{ t_ms: number; dir: 'TX' | 'RX'; cmd: string }>
): Promise<Array<{ t_ms: number; dir: 'TX' | 'RX'; cmd: string }>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sanitized = traceLogs.map((log) => ({
        ...log,
        cmd: redactSecurityBytes(log.cmd),
      }));
      resolve(sanitized);
    }, 0);
  });
}
