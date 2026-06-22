/**
 * Reconstructs complete ELM327 / ECU responses from the raw, fragmented byte
 * stream delivered by the transport layer.
 *
 * A single logical response is terminated by the ELM327 prompt character ('>').
 * Within that block the adapter may emit:
 *   - a single line (e.g. "410C1AF0")
 *   - ISO-TP multi-frame payloads with frame indices ("0:", "1:", "2:")
 *   - a leading byte-count header line that must be discarded
 *   - transient noise ("SEARCHING...", "BUS INIT")
 *
 * The assembler is transport-agnostic: it consumes raw chunks and emits clean,
 * fully-reconstructed payload strings ready for the higher-level OBD parser.
 */

export interface AssembledFrame {
  raw: string;
  assembled: string;
  isMultiFrame: boolean;
}

const PROMPT = '>';
const NOISE_PATTERN = /(SEARCHING\.*|BUS\s*INIT\.*|BUSINIT\.*)/gi;
const FRAME_INDEX_PATTERN = /^[0-9A-Fa-f]+:\s*/;
const FRAME_INDEX_TEST = /^[0-9A-Fa-f]+:/;

export class BLEMultiFrameAssembler {
  private buffer = '';
  private readonly maxBufferLength: number;

  constructor(maxBufferLength = 8192) {
    this.maxBufferLength = maxBufferLength;
  }

  push(chunk: string): AssembledFrame[] {
    if (!chunk) return [];

    this.buffer += chunk;
    if (this.buffer.length > this.maxBufferLength) {
      this.buffer = this.buffer.slice(-this.maxBufferLength);
    }

    const frames: AssembledFrame[] = [];
    let promptIndex = this.buffer.indexOf(PROMPT);
    while (promptIndex !== -1) {
      const segment = this.buffer.slice(0, promptIndex);
      this.buffer = this.buffer.slice(promptIndex + 1);
      const frame = this.reconstruct(segment);
      if (frame) {
        frames.push(frame);
      }
      promptIndex = this.buffer.indexOf(PROMPT);
    }

    return frames;
  }

  clear(): void {
    this.buffer = '';
  }

  reset(): void {
    this.clear();
  }

  peekBuffer(): string {
    return this.buffer;
  }

  private reconstruct(segment: string): AssembledFrame | null {
    const normalised = segment.replace(/\r/g, '\n').replace(NOISE_PATTERN, '');
    const lines = normalised
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return null;
    }

    const indexedLines = lines.filter((line) => FRAME_INDEX_TEST.test(line));
    const isMultiFrame = indexedLines.length > 0;

    let assembled: string;
    if (isMultiFrame) {
      assembled = lines
        .filter((line) => line.includes(':'))
        .map((line) => line.replace(FRAME_INDEX_PATTERN, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      assembled = lines.join(' ').replace(/\s+/g, ' ').trim();
    }

    if (assembled.length === 0) {
      return null;
    }

    return {
      raw: segment.trim(),
      assembled,
      isMultiFrame: isMultiFrame || lines.length > 1,
    };
  }
}

const bleMultiFrameAssembler = new BLEMultiFrameAssembler();
export default bleMultiFrameAssembler;
