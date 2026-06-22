/**
 * Pure, side-effect-free decoder for ELM327 / OBD-II responses.
 *
 * Every function is deterministic and stateless: it accepts the already
 * frame-assembled string produced by BLEMultiFrameAssembler and returns a typed
 * value. No transport, store, logging or singleton access lives here.
 *
 * Robustness guarantees:
 *  - Tolerates spaces, CR/LF, frame-index prefixes ("0:", "1:") and "SEARCHING..." noise.
 *  - Skips non-standard / multi-ECU CAN headers by anchoring on the mode echo (e.g. "410C")
 *    rather than assuming a fixed offset, so a leading "7E8 06" header is ignored cleanly.
 */

interface PidDefinition {
  bytes: number;
  precision: number;
  decode: (b: number[]) => number;
}

const PID_TABLE: Record<string, PidDefinition> = {
  '04': { bytes: 1, precision: 0, decode: (b) => (b[0] * 100) / 255 },
  '05': { bytes: 1, precision: 0, decode: (b) => b[0] - 40 },
  '0B': { bytes: 1, precision: 0, decode: (b) => b[0] },
  '0C': { bytes: 2, precision: 0, decode: (b) => ((b[0] * 256) + b[1]) / 4 },
  '0D': { bytes: 1, precision: 0, decode: (b) => b[0] },
  '0E': { bytes: 1, precision: 1, decode: (b) => b[0] / 2 - 64 },
  '0F': { bytes: 1, precision: 0, decode: (b) => b[0] - 40 },
  '10': { bytes: 2, precision: 2, decode: (b) => ((b[0] * 256) + b[1]) / 100 },
  '11': { bytes: 1, precision: 0, decode: (b) => (b[0] * 100) / 255 },
  '21': { bytes: 2, precision: 0, decode: (b) => (b[0] * 256) + b[1] },
  '2F': { bytes: 1, precision: 0, decode: (b) => (b[0] * 100) / 255 },
  '31': { bytes: 2, precision: 0, decode: (b) => (b[0] * 256) + b[1] },
  '3C': { bytes: 2, precision: 1, decode: (b) => ((b[0] * 256) + b[1]) / 10 - 40 },
  '42': { bytes: 2, precision: 2, decode: (b) => ((b[0] * 256) + b[1]) / 1000 },
  '46': { bytes: 1, precision: 0, decode: (b) => b[0] - 40 },
  '49': { bytes: 1, precision: 0, decode: (b) => (b[0] * 100) / 255 },
  '5C': { bytes: 1, precision: 0, decode: (b) => b[0] - 40 },
  A6: { bytes: 4, precision: 0, decode: (b) => ((b[0] * 16777216) + (b[1] * 65536) + (b[2] * 256) + b[3]) / 10 },
};

const FRAME_INDEX_GLOBAL = /(^|\s)[0-9A-F]+:\s*/g;
const NOISE_GLOBAL = /(SEARCHING\.*|BUS\s*INIT\.*|BUSINIT\.*)/g;
const ERROR_TOKENS = ['NODATA', 'ERROR', 'UNABLE', 'BUSBUSY', 'BUSERROR', 'CANERROR', 'STOPPED', 'BUFFERFULL', 'FBERROR', 'RXERROR', '7F'];

/** SAE J1979 diagnostic trouble code shape — anything else is adapter echo noise. */
const DTC_PATTERN = /^[PCBU][0-9A-F]{4}$/;
/** Null DTC: a clean "no faults" marker that must never be surfaced as a raw code. */
const DTC_NO_FAULT = 'P0000';

function normaliseHex(raw: string): string {
  return raw
    .toUpperCase()
    .replace(NOISE_GLOBAL, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(FRAME_INDEX_GLOBAL, ' ')
    .replace(/[^0-9A-F]/g, '');
}

function normalisePid(pid: string): string {
  const hexOnly = pid.toUpperCase().replace(/[^0-9A-F]/g, '');
  return hexOnly.slice(-2).padStart(2, '0');
}

function isErrorResponse(normalised: string): boolean {
  return ERROR_TOKENS.some((token) => normalised.includes(token));
}

function extractBytes(payload: string, count: number): number[] | null {
  if (payload.length < count * 2) return null;
  const bytes: number[] = [];
  for (let i = 0; i < count * 2; i += 2) {
    const value = parseInt(payload.substr(i, 2), 16);
    if (Number.isNaN(value)) return null;
    bytes.push(value);
  }
  return bytes;
}

export function parsePIDResponse(pid: string, rawHex: string): number | string {
  const cleanPid = normalisePid(pid);
  const definition = PID_TABLE[cleanPid];
  if (!definition) {
    return NaN;
  }

  const normalised = normaliseHex(rawHex);
  if (!normalised || isErrorResponse(normalised)) {
    return NaN;
  }

  const echo = `41${cleanPid}`;
  const echoIndex = normalised.indexOf(echo);
  if (echoIndex === -1) {
    return NaN;
  }

  const payload = normalised.slice(echoIndex + echo.length);
  const bytes = extractBytes(payload, definition.bytes);
  if (!bytes) {
    return NaN;
  }

  const value = definition.decode(bytes);
  if (!Number.isFinite(value)) {
    return NaN;
  }
  return Number(value.toFixed(definition.precision));
}

export function parseDTCResponse(rawHex: string): string[] {
  const normalised = normaliseHex(rawHex);
  const modeIndex = normalised.indexOf('43');
  if (modeIndex === -1) {
    return [];
  }

  const payload = normalised.slice(modeIndex + 4);
  const codes: string[] = [];

  for (let i = 0; i + 4 <= payload.length; i += 4) {
    const codeHex = payload.substr(i, 4);
    if (codeHex === '0000') {
      continue;
    }
    const highNibble = parseInt(codeHex[0], 16);
    if (Number.isNaN(highNibble)) {
      continue;
    }

    let typeLetter = 'P';
    if (highNibble >= 4 && highNibble <= 7) typeLetter = 'C';
    else if (highNibble >= 8 && highNibble <= 11) typeLetter = 'B';
    else if (highNibble >= 12) typeLetter = 'U';

    const secondDigit = (highNibble & 3).toString();
    const remainder = codeHex.slice(1);
    const code = `${typeLetter}${secondDigit}${remainder}`;

    if (!DTC_PATTERN.test(code) || code === DTC_NO_FAULT) {
      continue;
    }
    if (!codes.includes(code)) {
      codes.push(code);
    }
  }

  return codes;
}

export function parseVINResponse(rawHex: string): string {
  return decodeAsciiPayload(rawHex, '4902').slice(0, 17);
}

export function parseCalibrationIdResponse(rawHex: string): string {
  return decodeAsciiPayload(rawHex, '4904');
}

export function parseVoltageResponse(raw: string): string | null {
  const match = raw.match(/(\d+\.?\d*)\s*V?/i);
  return match ? `${match[1]}V` : null;
}

function decodeAsciiPayload(rawHex: string, marker: string): string {
  const normalised = normaliseHex(rawHex);
  const markerIndex = normalised.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }
  const payload = normalised.slice(markerIndex + marker.length);

  let ascii = '';
  for (let i = 0; i + 2 <= payload.length; i += 2) {
    const charCode = parseInt(payload.substr(i, 2), 16);
    if (Number.isNaN(charCode) || charCode < 32 || charCode > 126) {
      continue;
    }
    const character = String.fromCharCode(charCode);
    if (/[A-Z0-9]/.test(character)) {
      ascii += character;
    }
  }
  return ascii;
}

const OBDResponseParser = {
  parsePIDResponse,
  parseDTCResponse,
  parseVINResponse,
  parseCalibrationIdResponse,
  parseVoltageResponse,
};

export default OBDResponseParser;
