// dtcParser.ts
// Robust DTC / multi-frame OBD response parser.
// - Handles headered (e.g., "7E8 10 14 43 ...") and headerless ("4311...") streams.
// - Reassembles ISO-TP multi-frames and splits concatenated service responses.
// - Decodes DTCs for Mode 03 (0x43), Mode 07 (0x47), Mode 59 (0x59).

export type SourceId = string; // e.g., "7E8" or "LOCAL"
export interface RawParseOptions {
  timestamp?: number;
}

export interface ReassembledService {
  source: SourceId;
  service: number;     // e.g., 0x43
  payload: number[];   // bytes following the service byte
  raw: string;         // hex string of the full reassembled payload (service + payload)
  timestamp: number;
}

export interface DecodedDtc {
  code: string;        // e.g., "P0301"
  source: SourceId;
  timestamp: number;
}

// helpers
const HEX_PAIR_RE = /[0-9A-F]{2}/g;
const HEADER_LINE_RE = /([0-9A-F]{3})\s*[:\-]?\s*((?:[0-9A-F]{2}\s*)+)/gi;

// normalize and clean noisy tokens
function sanitize(raw: string): string {
  let s = raw.toUpperCase();
  // remove common noise tokens but keep spacing between hexs
  s = s.replace(/SEARCHING\.\.\.|SEARCHING/g, " ");
  s = s.replace(/\bNO DATA\b/g, " ");
  s = s.replace(/\bNODATA\b/g, " ");
  // remove prompts, but parser clients should still rely on queue prompt detection
  s = s.replace(/>/g, " ");
  // remove non-hex characters except whitespace and colon/dash used in headers
  s = s.replace(/[^0-9A-F:\-\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// parse hex pairs into numbers
function hexPairsToBytes(hexPairs: string[] | null): number[] {
  if (!hexPairs) return [];
  return hexPairs.map(h => parseInt(h, 16));
}

export function parseAndReassembleServices(raw: string, options: RawParseOptions = {}): ReassembledService[] {
  const timestamp = options.timestamp ?? Date.now();
  const clean = sanitize(raw);
  if (!clean) return [];

  const services: ReassembledService[] = [];

  // First attempt: detect headered lines "7E8 10 14 43 ..."
  let anyHeadered = false;
  let m: RegExpExecArray | null;
  while ((m = HEADER_LINE_RE.exec(clean)) !== null) {
    anyHeadered = true;
    const source = m[1];
    const bytes = hexPairsToBytes(m[2].match(HEX_PAIR_RE));
    services.push(...reassembleStreamToServices(bytes, source, timestamp));
  }
  if (anyHeadered) return services;

  // If not headered, collapse to a single token stream and treat as source "LOCAL"
  const allHexPairs = clean.match(HEX_PAIR_RE) || [];
  const bytes = hexPairsToBytes(allHexPairs);
  services.push(...reassembleStreamToServices(bytes, "LOCAL", timestamp));
  return services;
}

// main reassembly function per-source
function reassembleStreamToServices(bytes: number[], source: SourceId, timestamp: number): ReassembledService[] {
  const out: ReassembledService[] = [];
  let i = 0;
  const n = bytes.length;

  while (i < n) {
    const b = bytes[i];

    // ISO-TP Single Frame: 0x00..0x0F where low nibble = length (single-frame)
    if ((b & 0xF0) === 0x00 && (b & 0x0F) > 0) {
      const sfLen = b & 0x0F;
      // payload starts at i+1 and has sfLen bytes
      const payload = bytes.slice(i + 1, i + 1 + sfLen);
      if (payload.length >= 1) {
        const service = payload[0];
        out.push({
          source,
          service,
          payload: payload.slice(1),
          raw: bytesToHex([service, ...payload.slice(1)]),
          timestamp,
        });
      }
      i += 1 + sfLen;
      continue;
    }

    // ISO-TP First Frame: 0x10..0x1F (first nibble == 1)
    if ((b & 0xF0) === 0x10 && i + 1 < n) {
      // total length: ((b & 0x0F) << 8) + bytes[i+1]
      const totalLen = ((b & 0x0F) << 8) + bytes[i + 1];
      const available = bytes.slice(i + 2, i + 2 + Math.min(totalLen, n - (i + 2)));
      // We may not have all consecutive frames present in the stream; attempt best-effort reassembly:
      // If the available payload length < totalLen, we still capture what we have (partial).
      if (available.length >= 1) {
        const service = available[0];
        const payload = available.slice(1, totalLen);
        out.push({
          source,
          service,
          payload,
          raw: bytesToHex([service, ...payload]),
          timestamp,
        });
      }
      // skip what we consumed
      i += 2 + available.length;
      continue;
    }

    // Consecutive Frame (unexpected alone) 0x20..0x2F: we'll ignore as isolated (should only exist after FF)
    if ((b & 0xF0) === 0x20) {
      // we cannot build a proper frame without prior first frame; skip it
      i++;
      continue;
    }

    // Otherwise, look for service start bytes 0x40..0x4F (response codes = 0x40 + request mode)
    if (b >= 0x40 && b <= 0x4F) {
      const service = b;
      // gather bytes until the next service-start candidate or end
      const payloadStart = i + 1;
      let j = payloadStart;
      while (j < n) {
        const candidate = bytes[j];
        // stop when a new service start or ISO-TP first frame indicator appears
        if ((candidate >= 0x40 && candidate <= 0x4F) || ((candidate & 0xF0) === 0x10)) break;
        j++;
      }
      const payload = bytes.slice(payloadStart, j);
      out.push({
        source,
        service,
        payload,
        raw: bytesToHex([service, ...payload]),
        timestamp,
      });
      i = j;
      continue;
    }

    // If none matched, skip current byte (it might be padding)
    i++;
  }

  return out;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// DTC decoding utilities
export function decodeDTCsFromService(svc: ReassembledService): DecodedDtc[] {
  const { service, payload, source, timestamp } = svc;
  // We only decode for DTC services: Mode 0x43 (03), 0x47 (07), 0x59 (09-03)
  if (![0x43, 0x47, 0x59].includes(service)) return [];

  const dtcs: DecodedDtc[] = [];
  // Many responses include only consecutive 2-byte DTC entries; ignore trailing 00 00 padding
  for (let i = 0; i + 1 < payload.length; i += 2) {
    const a = payload[i];
    const b = payload[i + 1];
    if (a === 0x00 && b === 0x00) continue; // padding
    // sanity check: if both are 0xFF or invalid, skip
    if (a === 0xFF && b === 0xFF) continue;
    // decode
    const dtc = decodeDtcPair(a, b);
    if (dtc) dtcs.push({ code: dtc, source, timestamp });
  }
  return dtcs;
}

function decodeDtcPair(a: number, b: number): string | null {
  // Protect against invalid bytes
  if (a == null || b == null) return null;
  // First two bits of A indicate system
  const hi = (a & 0xC0) >> 6; // 0..3
  const type = ["P", "C", "B", "U"][hi];
  const digit1 = (a & 0x30) >> 4; // 0..3
  const digit2 = a & 0x0F;
  const digit3 = (b & 0xF0) >> 4;
  const digit4 = b & 0x0F;
  const code = `${type}${digit1}${digit2}${digit3}${digit4}`;
  return code;
}