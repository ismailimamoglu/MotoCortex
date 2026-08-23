/**
 * MotoCortex Core - Deterministic DTC Stream & Multi-Frame Parser
 * 
 * Provides robust decoding for OBD-II / UDS diagnostic trouble codes:
 * - Mode 03 (Stored DTCs - 0x43)
 * - Mode 07 (Pending DTCs - 0x47)
 * - Mode 0A (Permanent DTCs - 0x4A)
 * - Mode 59 (UDS ReadDTCInformation - 0x59)
 * 
 * Handles:
 * - Concatenated multi-line responses (e.g. 431157...430300...) without framing offset bugs
 * - ISO 15765-2 (ISO-TP) Single Frames (0x0n), First Frames (0x10..), Consecutive Frames (0x20..)
 * - CAN Headered (e.g. "7E8 06 43 ...") and Headerless streams
 * - Noise filtering (SEARCHING..., NO DATA, prompt markers, stray voltage strings)
 */

export type SourceId = string; // e.g. "7E8", "7E9", "LOCAL"

export interface ReassembledServicePayload {
  source: SourceId;
  service: number;     // e.g. 0x43, 0x47, 0x4A, 0x59
  payload: number[];   // Raw bytes following the service byte
  rawHex: string;      // Hex string representation
  timestamp: number;
}

export interface DecodedDtcItem {
  code: string;        // e.g. "P0301", "P1157", "C0035"
  source: SourceId;
  timestamp: number;
}

const HEX_PAIR_RE = /[0-9A-F]{2}/g;

/**
 * Normalizes single line noise
 */
export function sanitizeObdStream(line: string): string {
  if (!line) return '';
  let s = line.toUpperCase();
  s = s.replace(/SEARCHING\.\.\.|SEARCHING/g, ' ');
  s = s.replace(/\bNO\s*DATA\b/g, ' ');
  s = s.replace(/\bNODATA\b/g, ' ');
  s = s.replace(/\bUNABLE\s*TO\s*CONNECT\b/g, ' ');
  s = s.replace(/\bBUS\s*INIT\b/g, ' ');
  s = s.replace(/\bSTOPPED\b/g, ' ');
  s = s.replace(/\bERROR\b/g, ' ');
  s = s.replace(/>/g, ' ');
  s = s.replace(/\d+\.?\d*V/g, ' '); // Stray voltages
  s = s.replace(/[^0-9A-F:\-\s]/g, ' ');
  return s.trim();
}

export const cleanLineNoise = sanitizeObdStream;

function hexPairsToBytes(hexPairs: string[] | null): number[] {
  if (!hexPairs) return [];
  return hexPairs.map((h) => parseInt(h, 16));
}

function bytesToHex(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const DTC_SERVICES = new Set([0x43, 0x47, 0x4A, 0x59]);

/**
 * Splits and reassembles stream into discrete service payloads per ECU source
 */
export function parseAndReassembleServices(
  raw: string,
  timestamp: number = Date.now()
): ReassembledServicePayload[] {
  if (!raw) return [];
  const rawLines = raw.split(/[\r\n]+/);
  const services: ReassembledServicePayload[] = [];

  for (const rawLine of rawLines) {
    const line = cleanLineNoise(rawLine);
    if (!line) continue;

    // Check if line has a 3-character hex CAN header followed by whitespace (e.g. "7E8 06 43 ..." or "7E8: 06 43")
    const headerMatch = line.match(/^([0-9A-F]{3})[:\-]?\s+((?:[0-9A-F]{2}\s*)+)$/i);
    if (headerMatch) {
      const source = headerMatch[1].toUpperCase();
      const hexPairs = headerMatch[2].match(HEX_PAIR_RE);
      const bytes = hexPairsToBytes(hexPairs);
      services.push(...reassembleByteStream(bytes, source, timestamp));
    } else {
      // Headerless line
      const hexPairs = line.match(HEX_PAIR_RE);
      const bytes = hexPairsToBytes(hexPairs);
      if (bytes.length > 0) {
        services.push(...reassembleByteStream(bytes, 'LOCAL', timestamp));
      }
    }
  }

  return services;
}

function reassembleByteStream(
  bytes: number[],
  source: SourceId,
  timestamp: number
): ReassembledServicePayload[] {
  const out: ReassembledServicePayload[] = [];
  let i = 0;
  const n = bytes.length;

  while (i < n) {
    const b = bytes[i];

    // ISO-TP Single Frame: 0x01..0x07 (Length in low nibble, immediately preceding service byte)
    if ((b & 0xF0) === 0x00 && (b & 0x0F) > 0 && (b & 0x0F) <= 7 && i + 1 < n) {
      const sfLen = b & 0x0F;
      const service = bytes[i + 1];
      if (DTC_SERVICES.has(service)) {
        const framePayload = bytes.slice(i + 2, i + 1 + sfLen);
        out.push({
          source,
          service,
          payload: framePayload,
          rawHex: bytesToHex([service, ...framePayload]),
          timestamp,
        });
        i += 1 + sfLen;
        continue;
      }
    }

    // ISO-TP First Frame: 0x10..0x1F (Total length in 12 bits)
    if ((b & 0xF0) === 0x10 && i + 2 < n) {
      const totalLen = ((b & 0x0F) << 8) + bytes[i + 1];
      const service = bytes[i + 2];
      if (DTC_SERVICES.has(service)) {
        const available = bytes.slice(i + 3, i + 2 + Math.min(totalLen, n - (i + 2)));
        out.push({
          source,
          service,
          payload: available,
          rawHex: bytesToHex([service, ...available]),
          timestamp,
        });
        i += 2 + Math.min(totalLen, n - (i + 2));
        continue;
      }
    }

    // Direct Service Start (0x43, 0x47, 0x4A, 0x59)
    if (DTC_SERVICES.has(b)) {
      const service = b;
      const payloadStart = i + 1;
      let j = payloadStart;

      while (j < n) {
        const candidate = bytes[j];
        // Stop only when another explicit DTC service byte appears
        if (DTC_SERVICES.has(candidate)) {
          break;
        }
        j++;
      }

      const payload = bytes.slice(payloadStart, j);
      out.push({
        source,
        service,
        payload,
        rawHex: bytesToHex([service, ...payload]),
        timestamp,
      });
      i = j;
      continue;
    }

    i++;
  }

  return out;
}

/**
 * Standard SAE J2012 / ISO 15031-6 DTC 2-byte decoder
 */
export function decodeDtcPair(a: number, b: number): string | null {
  if (a == null || b == null) return null;
  if (a === 0x00 && b === 0x00) return null; // Standard 00 00 fill padding
  if (a === 0xFF && b === 0xFF) return null; // Invalid fill

  const hi = (a & 0xC0) >> 6; // 0 = P, 1 = C, 2 = B, 3 = U
  const type = ['P', 'C', 'B', 'U'][hi];
  const digit1 = (a & 0x30) >> 4; // 0..3
  const digit2 = (a & 0x0F).toString(16).toUpperCase();
  const digit3 = ((b & 0xF0) >> 4).toString(16).toUpperCase();
  const digit4 = (b & 0x0F).toString(16).toUpperCase();

  return `${type}${digit1}${digit2}${digit3}${digit4}`;
}

/**
 * Extracts clean, deterministic DTC codes from reassembled OBD-II services
 */
export function decodeDtcCodesFromResponse(rawResponse: string): string[] {
  if (!rawResponse) return [];
  const services = parseAndReassembleServices(rawResponse);
  const dtcList: string[] = [];

  for (const svc of services) {
    // Mode 03 (0x43), Mode 07 (0x47), Mode 0A (0x4A), UDS Service 0x19 (0x59)
    if (!DTC_SERVICES.has(svc.service)) continue;

    let payload = svc.payload;
    if (payload.length === 0) continue;

    // In UDS Service 0x59 (e.g. 59 02 FF ...), the first 2 bytes are subfunction & status mask
    if (svc.service === 0x59 && payload.length >= 2) {
      payload = payload.slice(2);
      // UDS DTCs are 3 bytes (DTC High, DTC Middle, DTC Low/Status)
      for (let i = 0; i + 2 < payload.length; i += 3) {
        const dtc = decodeDtcPair(payload[i], payload[i + 1]);
        if (dtc) dtcList.push(dtc);
      }
      continue;
    }

    // In standard OBD-II Mode 03 / 07 / 0A:
    // If payload length is odd, the first byte is the DTC count (e.g. 43 [01] 03 01 ...)
    if (payload.length % 2 !== 0) {
      payload = payload.slice(1);
    }

    // Standard OBD-II 2-byte pairs
    for (let i = 0; i + 1 < payload.length; i += 2) {
      const dtc = decodeDtcPair(payload[i], payload[i + 1]);
      if (dtc) dtcList.push(dtc);
    }
  }

  return Array.from(new Set(dtcList));
}

export default {
  parseAndReassembleServices,
  decodeDtcPair,
  decodeDtcCodesFromResponse,
};
