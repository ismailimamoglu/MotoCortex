/**
 * MotoCortex Core - Deterministic DTC Stream & Multi-Frame Parser (v2.0 - PATCHED)
 * 
 * ✓ FIXED: Proper ISO-TP First Frame (0x10) + Consecutive Frame (0x20) reassembly
 * ✓ FIXED: No more ghost DTC loss on 5+ fault responses
 * ✓ FIXED: Frame sequence validation to detect corruption
 * 
 * Provides robust decoding for OBD-II / UDS diagnostic trouble codes:
 * - Mode 03 (Stored DTCs - 0x43)
 * - Mode 07 (Pending DTCs - 0x47)
 * - Mode 0A (Permanent DTCs - 0x4A)
 * - Mode 59 (UDS ReadDTCInformation - 0x59)
 * 
 * Handles:
 * - Complete multi-frame reassembly with sequence validation
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

/**
 * Tracks partial ISO-TP multi-frame reassembly state across consecutive calls
 * Handles case where frames arrive on separate lines/chunks
 */
interface IsoTpReassemblyContext {
  source: SourceId;
  totalPayloadBytes: number;
  collectedBytes: number[];
  expectedSequence: number;
  service: number;
  timestamp: number;
}

const HEX_PAIR_RE = /[0-9A-F]{2}/g;
const DTC_SERVICES = new Set([0x43, 0x47, 0x4A, 0x59]);

/**
 * Global reassembly context for handling split multi-frame responses
 * Key: source ID, Value: partial reassembly state
 */
const globalReassemblyContexts = new Map<SourceId, IsoTpReassemblyContext>();

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

/**
 * Processes a byte stream and attempts ISO-TP frame assembly
 * Returns completed service payloads and tracks partial reassembly across calls
 */
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

    // ========================================
    // ISO-TP Single Frame: 0x01..0x07
    // ========================================
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

    // ========================================
    // ISO-TP First Frame: 0x10..0x1F
    // ========================================
    if ((b & 0xF0) === 0x10 && i + 2 < n) {
      const totalLen = ((b & 0x0F) << 8) + bytes[i + 1];
      const service = bytes[i + 2];

      if (DTC_SERVICES.has(service)) {
        // Extract payload from First Frame (always 5 bytes after PCI + Service)
        const ffPayloadBytes = bytes.slice(i + 3, Math.min(i + 8, n));
        
        // Initialize or update reassembly context
        let context = globalReassemblyContexts.get(source);
        if (!context) {
          context = {
            source,
            totalPayloadBytes: totalLen - 1, // -1 for service byte already consumed
            collectedBytes: [service, ...ffPayloadBytes],
            expectedSequence: 1,
            service,
            timestamp,
          };
          globalReassemblyContexts.set(source, context);
        } else {
          // Sanity check: if existing context is for different service, discard it
          if (context.service !== service) {
            context = {
              source,
              totalPayloadBytes: totalLen - 1,
              collectedBytes: [service, ...ffPayloadBytes],
              expectedSequence: 1,
              service,
              timestamp,
            };
            globalReassemblyContexts.set(source, context);
          } else {
            // Continue existing reassembly
            context.collectedBytes.push(...ffPayloadBytes);
            context.expectedSequence = 1;
          }
        }

        // Move pointer past First Frame
        i += 3 + ffPayloadBytes.length;
        continue;
      }
    }

    // ========================================
    // ISO-TP Consecutive Frame: 0x20..0x2F
    // ========================================
    if ((b & 0xF0) === 0x20 && i + 1 < n) {
      const sequenceNum = b & 0x0F;
      const context = globalReassemblyContexts.get(source);

      if (context && context.service && DTC_SERVICES.has(context.service)) {
        // Validate sequence number (expect 1, 2, 3, ...)
        if (sequenceNum !== context.expectedSequence) {
          // Sequence mismatch: could indicate corruption or out-of-order frame
          // Log but continue with best-effort reassembly
          // In production, you might blacklist and discard
          console.warn(
            `[DtcStreamParser] Sequence mismatch on source ${source}: ` +
            `expected ${context.expectedSequence}, got ${sequenceNum}`
          );
        }

        // Extract payload bytes from Consecutive Frame (up to 7 bytes after PCI)
        const cfPayloadBytes = bytes.slice(i + 1, Math.min(i + 8, n));
        context.collectedBytes.push(...cfPayloadBytes);
        context.expectedSequence = (context.expectedSequence % 16) + 1; // Wrap 15->0, then +1 = 1

        // Check if reassembly is complete
        const payloadWithoutService = context.collectedBytes.slice(1); // Skip service byte
        if (payloadWithoutService.length >= context.totalPayloadBytes) {
          // Complete!
          out.push({
            source,
            service: context.service,
            payload: payloadWithoutService.slice(0, context.totalPayloadBytes),
            rawHex: bytesToHex(context.collectedBytes),
            timestamp,
          });
          globalReassemblyContexts.delete(source);
        }

        i += 1 + cfPayloadBytes.length;
        continue;
      }
    }

    // ========================================
    // Direct Service Start (0x43, 0x47, 0x4A, 0x59)
    // If we encounter a service byte directly, emit any pending context first
    // ========================================
    if (DTC_SERVICES.has(b)) {
      const context = globalReassemblyContexts.get(source);
      if (context && context.collectedBytes.length > 1) {
        // Emit incomplete reassembly before starting new service
        out.push({
          source,
          service: context.service,
          payload: context.collectedBytes.slice(1),
          rawHex: bytesToHex(context.collectedBytes),
          timestamp,
        });
        globalReassemblyContexts.delete(source);
      }

      // Start new single-service response
      const service = b;
      const payloadStart = i + 1;
      let j = payloadStart;

      while (j < n) {
        const candidate = bytes[j];
        // Stop only when another explicit DTC service byte or ISO-TP PCI appears
        if (DTC_SERVICES.has(candidate) || (candidate & 0xF0) === 0x10 || (candidate & 0xF0) === 0x20) {
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
 * Parse raw response into service payloads with ISO-TP frame assembly
 * Handles both headered (7E8 XX XX...) and headerless responses
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

    // Check if line has a 3-character hex CAN header followed by whitespace
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
 * Now handles complete multi-frame payloads
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

/**
 * Resets reassembly contexts (call on new diagnostic session)
 */
export function resetReassemblyContexts(): void {
  globalReassemblyContexts.clear();
}

export default {
  parseAndReassembleServices,
  decodeDtcPair,
  decodeDtcCodesFromResponse,
  resetReassemblyContexts,
};
