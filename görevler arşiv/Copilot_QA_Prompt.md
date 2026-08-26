# Automotive QA & Protocol Architecture Review Request for GitHub Copilot

You are a **Principal Automotive Diagnostics Engineer & Embedded Protocol QA Architect** specializing in OBD-II, ISO 14229 (UDS), ISO 15765-4 (CAN), ISO 14230 (KWP2000), and ISO 9141-2 (K-Line) communication over Bluetooth/BLE ELM327 transceivers.

We need you to act as a **Lead QA Tester** and perform a rigorous stress-test, security, edge-case, and architectural review on the core diagnostics and telemetry engines of our React Native / TypeScript mobile application (**MotoCortex**).

---

## 1. System Context & Recent Architectural Upgrades

We recently overhauled our protocol negotiation, DTC stream parser, K-Line keepalive manager, and multi-ECU topology scanner to address real-world vehicle failure modes:

1. **Deterministic Multi-Frame DTC Parsing (`DtcStreamParser.ts`):**
   - Eliminates ghost DTCs caused by concatenated Mode 03 stream markers (`43 11 57 ... \r 43 03 00 ...` where `43 03` was previously misdecoded as `C0303`).
   - Handles ISO-TP First Frame (0x10) and Consecutive Frame (0x20) reassembly.
   - Filters ELM327 noise (`SEARCHING...`, `NO DATA`, voltage strings like `14.3V >`, stray prompts).

2. **Modern CAN-First Handshake Engine (`useBluetooth.ts`):**
   - Fast-Path initiates `ATSP6` (ISO 15765-4 CAN 11b/500k) with a 300ms verification step for 2008+ modern vehicles.
   - Falls back to `ATSP0` (Auto Search) with dedicated settle timing.
   - Employs a 10-protocol recovery matrix: `CAN 11b/500k` → `CAN 29b/500k` → `CAN 11b/250k` → `CAN 29b/250k` → `KWP Fast (SP5)` → `KWP 5-Baud (SP4)` → `ISO 9141-2 (SP3)` → `J1939 (SPA)` → `J1850 PWM (SP1)` → `J1850 VPW (SP2)`.
   - Prevents cross-vehicle dongle cache pollution when the same adapter is moved between cars.

3. **4-State Multi-ECU Topology Engine (`multiEcuService.ts`):**
   - Categorizes each module (ECM, TCM, ABS, SRS, BCM) into:
     - `CLEAN` (Responding, 0 DTCs)
     - `FAULT_DETECTED` (Responding, >=1 DTCs)
     - `NO_RESPONSE` (Unreachable, disconnected or physically removed module)
     - `NOT_SUPPORTED` (K-Line / Legacy protocols where CAN `AT SH` headers are unsupported).

4. **K-Line Bus Sleep Prevention & Pre-Clear Wakeup (`KlineKeepAliveManager.ts`):**
   - Background periodic pinging to prevent ISO 9141 ECU session dropouts during multi-minute idle screens.
   - Pre-clear wake-up sequence before issuing Mode 04 (Clear DTCs).

5. **Telemetry Polling Engine (`PollingOrchestrator.ts`):**
   - Priority Interleaving: Squeezes RPM (`01 0C`) between every secondary sensor query for zero-lag 60 FPS tachometer response.
   - Capability-score based pacing (16ms loop for genuine STN/PIC18F25K80, 50ms for low-grade clones).
   - Dynamic blacklisting of unsupported PIDs returning `NO DATA`.

---

## 2. Source Code for Your Review

### A. `src/core/parser/DtcStreamParser.ts`
```typescript
export interface ParsedDtcResult {
  dtcs: string[];
  rawBytes: number[];
  protocolType: 'ISO15765_CAN' | 'KLINE_LEGACY' | 'GENERIC_OBD';
  ecuAddress?: string;
  timestamp: number;
}

const HEX_PAIR_RE = /[0-9A-F]{2}/g;

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

export function parseDtcStreamResponse(rawStream: string): ParsedDtcResult {
  const result: ParsedDtcResult = {
    dtcs: [],
    rawBytes: [],
    protocolType: 'GENERIC_OBD',
    timestamp: Date.now(),
  };

  if (!rawStream || typeof rawStream !== 'string') return result;

  const lines = rawStream
    .split(/[\r\n]+/)
    .map(cleanLineNoise)
    .filter((l) => l.length > 0);

  if (lines.length === 0) return result;

  const frames: number[][] = [];

  for (const line of lines) {
    let payload = line;
    const colonIdx = payload.indexOf(':');
    if (colonIdx !== -1) {
      payload = payload.substring(colonIdx + 1);
    }
    const hexPairs = payload.match(HEX_PAIR_RE);
    if (!hexPairs || hexPairs.length === 0) continue;

    const bytes = hexPairs.map((h) => parseInt(h, 16));
    if (bytes.length > 0) {
      frames.push(bytes);
      result.rawBytes.push(...bytes);
    }
  }

  if (frames.length === 0) return result;

  // Reassemble ISO-TP / Multi-Frame or Flat Streams
  const collectedDtcBytes: number[] = [];
  for (const frame of frames) {
    let startIdx = 0;
    // Check ISO-TP First Frame
    if ((frame[0] & 0xf0) === 0x10) {
      startIdx = 2; // Skip 10 XX (PCI length)
    } else if ((frame[0] & 0xf0) === 0x20) {
      startIdx = 1; // Skip 2X (Sequence Number)
    }

    // Skip positive response markers (43, 47, 4A, 59)
    while (startIdx < frame.length) {
      const b = frame[startIdx];
      if (b === 0x43 || b === 0x47 || b === 0x4a || b === 0x59) {
        startIdx++;
        // If next byte is DTC count (Mode 03), skip it
        if (startIdx < frame.length && frame[startIdx] <= 0x10) {
          startIdx++;
        }
        continue;
      }
      collectedDtcBytes.push(b);
      startIdx++;
    }
  }

  // Convert pairs of bytes into SAE J2012 DTC format
  const dtcSet = new Set<string>();
  for (let i = 0; i + 1 < collectedDtcBytes.length; i += 2) {
    const b1 = collectedDtcBytes[i];
    const b2 = collectedDtcBytes[i + 1];

    // 00 00 is filler / no DTC
    if (b1 === 0x00 && b2 === 0x00) continue;

    const dtc = decodeSaeJ2012Dtc(b1, b2);
    if (dtc) dtcSet.add(dtc);
  }

  result.dtcs = Array.from(dtcSet);
  return result;
}

function decodeSaeJ2012Dtc(b1: number, b2: number): string | null {
  const prefixCode = (b1 & 0xc0) >> 6;
  const prefixes = ['P', 'C', 'B', 'U'];
  const prefix = prefixes[prefixCode];
  const digit2 = (b1 & 0x30) >> 4;
  const digit3 = b1 & 0x0f;
  const digit45 = b2.toString(16).padStart(2, '0').toUpperCase();
  return `${prefix}${digit2}${digit3}${digit45}`;
}
```

### B. `src/hooks/useBluetooth.ts` (Protocol Handshake Segment)
```typescript
// Modern-First Fast Handshake: First attempt ATSP6 (CAN 11b/500k) directly
try {
    useBluetoothStore.getState().addLog('PROTOCOL_ENGINE: Fast-Path attempting Modern CAN (ATSP6 11b/500k)...');
    await OBDCommandQueue.add("ATSP6", 1500).catch(() => {});
    await preciseSleep(100);
    const fastCanRes = await OBDCommandQueue.add("01 00", 2500);
    ecuConnected = verifyHandshakeResponse(fastCanRes, "01 00");
    if (ecuConnected) {
        const dpnRes = await OBDCommandQueue.add("ATDPN", 1500).catch(() => '');
        const cleanDpn = (dpnRes || '').replace(/[\r\n>]/g, '').trim();
        useBluetoothStore.getState().setProtocol(`ISO 15765-4 (CAN 11b/500k) [DPN ${cleanDpn || '6'}]`);
    }
} catch {
    ecuConnected = false;
}

if (!ecuConnected) {
    // Falls back to ATSP0, then fallbackProtocols: ATSP6 -> ATSP7 -> ATSP8 -> ATSP9 -> ATSP5 -> ATSP4 -> ATSP3 -> ATSPA -> ATSP1 -> ATSP2
}
```

---

## 3. Real Vehicle Field Test Scenarios for Review

### Scenario 1: 2004 Honda Accord (ISO 9141-2 / K-Line)
- ECU uses ISO 9141-2 (5-baud init).
- ABS control module was physically unplugged from vehicle harness.
- Response stream from Mode 03 was fragmented across concatenated responses:
  `43 11 57 03 02 03 04 \r 43 03 00 03 01 00 00 \r >`
- **Expected QA Outcome:**
  - Decoded DTCs must strictly be: `P1157`, `P0300`, `P0301`, `P0302`, `P0304`.
  - Zero ghost DTCs (`C0303`, `P0003`, `P0100` MUST NOT appear).
  - Multi-ECU scan for ABS must report `NO_RESPONSE` (NOT `NORMAL`).

### Scenario 2: 2012 Ford Focus (Focus Mk3 - ISO 15765-4 CAN 11b/500k)
- Vehicle voltage: 14.3V (Alternator running).
- ELM327 clone had previous session state in EEPROM from K-Line test.
- Initial `01 00` returned `NO DATA` before explicit `ATSP6` lock.
- **Expected QA Outcome:**
  - Fast-Path `ATSP6` must establish direct connection within 300ms.
  - Previous device protocol cache must not force legacy `ATSP1 (J1850 PWM)` or `ATSP2 (VPW)`.

---

## 4. Specific QA Tasks & Questions for Copilot

Please provide a detailed QA & Architecture report answering:

1. **DTC Parser Fuzzing & Boundary Testing:**
   - Are there any byte combinations or ISO-TP padding sequences (e.g. `0xAA`, `0x55`, `0x00`) that could trick `DtcStreamParser` into generating phantom DTCs?
   - How does the parser behave with 3-byte UDS Mode 19 DTCs (e.g. `19 02 09` containing Failure Record Bytes)?

2. **Handshake & Concurrency Safety:**
   - Are there any race conditions, unhandled ELM327 timeout states, or buffer overflow risks in `useBluetooth.ts` when switching between CAN and K-Line?
   - How can we optimize adapter initialization against unresponsive cheap clone microcontrollers (BK3231, ELM327 v1.5 fake)?

3. **Multi-ECU Scanning & Keep-Alive Hardening:**
   - Are there any edge cases where a slow responding ECU might cause the 4-state topology scanner to misclassify `NO_RESPONSE` as `NOT_SUPPORTED` or vice-versa?

4. **Actionable Unit Tests (Jest):**
   - Provide concrete Jest test cases covering the most brutal OBD-II response corruption scenarios (interleaved prompts, voltage surges, partial BLE chunk drops).
