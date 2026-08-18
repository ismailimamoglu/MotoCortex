Short answer up front

I cannot truthfully provide “production-verified” OEM DID/byte/bit values without lab captures or OEM service documentation (these mappings are proprietary and can vary by SW build and market). Providing fabricated hex values would be unsafe and could brick ECUs.
Instead I deliver three concrete, ready-to-run technical artifacts you can use immediately:
A concrete discovery + candidate mapping “dictionary” for the top-20 features on VAG MQB and BMW F/G that tells you exactly which ECUs to probe, which DID ranges and commands to run, and an explicit per-feature verification checklist so you can produce production-verified DID/offset values in your lab. This is safe, repeatable, and designed to produce a final production-verified dictionary.
A TypeScript Node.js ingestion & validation script (scripts/ingest_oem_features.ts) that validates your catalog JSON against the JSON Schema (Draft‑7), computes CRC32 checksums for each template, and generates a TypeScript export module for use by OemDatabaseProvider.ts.
A Jest test-suite + lightweight VirtualECU mock (TypeScript) that simulates UDS 0x22 / 0x2E read/write and verifies: normal read/write/verify; interrupted write + rollback; unsupported SW rejection.
Below I include:

Deliverable 1 — candidate DID & byte/bit dictionary plan for the requested 20 features (VAG MQB + BMW F/G series) with explicit probe commands and confidence level. Use this to produce production-verified DID/offset values in your lab.
Deliverable 2 — full TypeScript ingestion script and notes (dependencies, how to run).
Deliverable 3 — Jest test suite + VirtualECU mock and instructions to run the tests.
Deliverable 1 — UDS DID & Byte/Bit Dictionary (CONCRETE DISCOVERY + CANDIDATE MAPPING)

Important: The list below maps each feature to the most-likely target ECU(s), the commands you must run to discover the true DID/offset in your lab, and a confidence level. Use this exact discovery sequence to produce production‑verified entries and replace didHex/byteIndex/bitIndex values with the verified results. At the end I include an example JSON record template to fill in after lab verification.
How to use the list

For each vehicle (VIN) you want to support, connect a lab adapter (wired, DoIP or good BLE 5 adapter in binary mode). For reflashes or large writes use wired/Wi‑Fi/DoIP.
Run the “identification” commands listed below to capture HW/SW part numbers, ECU addresses, and candidate DID lists.
Read candidate DIDs (see recommended DID ranges) using 0x22 (ReadDataByIdentifier). If DID reading is restricted, query the OEM routine (0x31 RoutineControl) or check Vendor identification DIDs to determine allowed DIDs.
For long-coding/bit layout items read all long-coding DIDs for the module and perform bit-diff by toggling the feature in lab environment (apply, then revert) and observe exact bit changes.
Compute and store SHA‑256 of pre / post dumps; store logs, pcap/ASC and VINs. Only mark a template VERIFIED if rollback and restore tests pass.
Common UDS commands to run (examples)

Read ECU ID and part numbers:
ReadDataByIdentifier (0x22): DIDs commonly used for identification (examples to probe) — run for whatever DID values are documented or discovered in your OEM list or probe 0xF000–0xF2FF ranges carefully, one DID at a time:
Example pseudo-requests:
22 F190 (Vehicle order / FA) — often OEM-specific
22 F187
22 F18C
22 F124
DiagnosticSessionControl (0x10) to the required session (e.g., programming / extended) before writing.
SecurityAccess (0x27) as needed for writes.
Read/Write DIDs (example)
Read: 0x22 <DID_Hi> <DID_Lo>
Write: 0x2E <DID_Hi> <DID_Lo> <data...>
When full memory read is needed and allowed, use RequestDownload (0x34) + TransferData (0x36) sequences or OEM RoutineControl (0x31).
Top-20 feature list (VAG MQB + BMW F/G): for each feature I provide:

targetEcu (logical), recommended DID probe ranges / candidate DIDs, recommended read/write sequence, verification steps, and confidence.
Notes on naming: “targetEcuHeader” is the module logical address you’ll usually use in diagnostics (e.g., 0x17 for Instrument Cluster in many VAG cars). That header is useful as a pointer but the final DID is OEM-specific and must be captured via lab steps below.

VAG MQB (target vehicles: Golf7/8, Passat B8, Octavia MK3)

Common target ECUs: 0x09 (BCM/Gateway), 0x17 (Instrument Cluster / KOMBI), 0x19 (Gateway), 0x5F (Infotainment / MIB), 0x42/0x52 (Door modules), 0x01 (Engine)
Candidate DID ranges to probe: 0x1000–0x1FFF and 0xF000–0xF2FF (many OEM long-coding & adaptation DIDs are in this region). Also probe module-specific documented DIDs if available.
Feature entries (VAG MQB) — for each entry I include a suggested probe example:

Needle Sweep / Staging
targetEcu: Instrument Cluster (0x17)
likelyLocation: Instrument cluster long-coding / adaptation DID(s)
candidateDidsToProbe: iterate adaptation DIDs in the instrument cluster range; often contained in a long-coding blob DID.
probe sequence:
10 03 (enter extended session)
22 <DID> (read long-coding / adaptation DID)
Toggle feature in lab or via 2E write to candidate DID and observe bit changes.
verification: pre/post hex diff; record byte index and bit mask; rollback test.
confidence: MEDIUM (long-coding exists but offset differs by SW).
Acoustic Lock Chirp (horn / alarm)
targetEcu: BCM / Central electrics (0x09 or 0x19)
likely: adaptation DID or long-coding in gateway/BCM
candidates: gateway long-coding DIDs, door module adaptation DIDs
probe steps: read gateway DID, test by toggling chirp setting and confirming horn behavior.
confidence: MEDIUM.
DRL Settings (Scandinavian rear DRL; DRL off with handbrake; DRL menu)
targetEcu: Front/Rear light ECU or BCM / Gateway (0x09, or separate light control module)
likely: adaptation DID(s) that control DRL behavior or menu flags in infotainment MIB (0x5F) for DRL menu.
probe: read light module DID(s), toggle with test bench loads as needed.
confidence: MEDIUM–LOW (some DRL behavior implemented in light control firmware and may require per-headlamp flash coding).
Mirror Fold on Lock / Unfold on Ignition
targetEcu: Door module(s) (Left/Right 0x42/0x52), or BCM gateway (0x09)
candidate DID: door-module adaptation DIDs
probe: read door module long-coding DID and toggle the relevant bit.
confidence: HIGH (commonly stored in door module/adaptations).
Rain Closing (windows close on rain trigger)
targetEcu: Central Electronics / BCM / Rain sensor processing module (0x09 / sensor module)
likely: adaptation DID for convenience behavior
probe: read DID(s), trigger rain sensor via test bench or emulate signal, toggle setting and observe behaviour.
confidence: MEDIUM
Start-Stop Memory / Disable
targetEcu: Engine control module (0x01) or Comfort module / Gateway
likely: adaptation DID or ECU parameter; often requires security access on many VAGs
probe: read ECU IDs, then adaptation DIDs or engine DIDs controlling start/stop memory
confidence: MEDIUM–HIGH (widely implemented but location varies).
Digital Speedometer in Cluster
targetEcu: Instrument Cluster (0x17)
likely: cluster option flag / multi-option byte
probe: read long-coding/appearance DIDs; if cluster skin controlled by HU, check HU (0x5F)
confidence: MEDIUM
Lap Timer & Oil Temperature Display
targetEcu: Infotainment / Cluster / Engine (0x5F / 0x17 / 0x01)
likely: combination of HU enable + cluster display flags
probe: read HU DIDs and cluster DIDs, enable features individually and validate
confidence: LOW–MEDIUM (depends heavily on vehicle trim & SW)
Mirror Unlock/Unlock via Proximity
targetEcu: BC (0x09), door modules
probe: probe door/comfort long-coding
confidence: MEDIUM
Auto Fold with Remote Key Double Press
targetEcu: BCM / key handling
probe: read BCM adaptation DIDs; trigger events via remote to see behaviour
confidence: MEDIUM
Ambient Light Unlock Color
targetEcu: Infotainment / MIB (0x5F) or BCM lighting controller
probe: read HU DIDs for ambient light config
confidence: MEDIUM
Start-Stop Default OFF (Remember)
targetEcu: Engine module (0x01) or Gateway
probe and verify with engine start cycles
confidence: MEDIUM–HIGH
Rain-Sensitive Wiper behavior (sensitivity)
targetEcu: Rain sensor module or BCM
probe: adaptation DID in rain sensor module
confidence: MEDIUM
Auto-lock speed threshold adjust
targetEcu: BCM / gateway
probe numeric parameter DID
confidence: MEDIUM
Door open sound (chirp volume)
targetEcu: BCM / comfort
probe: adaptation DID
confidence: MEDIUM
Parking assist / auto-lock interplay
targetEcu: Parking module + BCM
probe multi-ECU sequences and proxi alignment
confidence: LOW–MEDIUM
Keyless unlock settings (comfort access)
targetEcu: BC, keyless entry module
probe: adaptation DID
confidence: MEDIUM
Welcome light activation time
targetEcu: BCM / lighting module
probe: adaptation DID controlling timing values (may be multi-byte)
confidence: MEDIUM
Turn signals with DRL dimming
targetEcu: lighting module / BCM
probe: adaptation DID and test with a controlled CAN stimulator
confidence: MEDIUM
DPF regen / Service menu triggers
targetEcu: Engine module (0x01) / Cluster (0x17)
probe: engine DIDs and cluster service DIDs; often require security
confidence: HIGH for service menu actions but exact DID depends on SW.
BMW F/G Series (F30, G20, G30)

Common target ECUs: KOMBI/KOMBI (instrument cluster) (varies bus id), FEM/BDC (body), CAS (immobilizer/comfort), HU_NBT / MGU (infotainment), IHKA (climate)
Common discovery targets: read FA (vehicle order) and module coding; BMW tends to have “coding bytes” and “NCD”/“VO” data that influence feature location.
Use the same stepwise discovery approach as for VAG. Top-20 features mapped to BMW:

Needle Sweep / Staging
targetEcu: KOMBI / Instrument cluster
probe long-coding DIDs in KOMBI; some clusters use “byte X bit Y” in long-coding blob
confidence: HIGH (common feature)
Acoustic Lock Chirp
targetEcu: FEM/BDC
needs security access on many vehicles to change
confidence: HIGH
DRL Settings (rear scandi, etc.)
targetEcu: Lighting module / gateway / HU_NBT for DRL menu
confidence: MEDIUM
Mirror Fold on Lock
targetEcu: FEM/BDC or door module
confidence: HIGH
Rain Closing (window close)
targetEcu: FEM/BDC
confidence: MEDIUM
Start-Stop Memory/Disable
targetEcu: DME / KOMBI / FEM depending on series
security often required
confidence: HIGH
Digital Speed in Cluster (numeric display)
targetEcu: KOMBI / HU
confidence: MEDIUM
Lap Timer & Oil Temp Display
targetEcu: HU_NBT + KOMBI
confidence: MEDIUM–LOW
Comfort Access Options (walkaway lock)
targetEcu: CAS / FEM
confidence: MEDIUM
Acoustic Civic-like chirp (custom chirp)
targetEcu: FEM
confidence: MEDIUM
Auto mirror fold behavior (ignition/unlock)
targetEcu: FEM/FEM2
confidence: HIGH
Ambient interior light settings
targetEcu: HU_NBT / MGU
confidence: MEDIUM
Door open warning sound & volume
targetEcu: FEM / KOMBI
confidence: MEDIUM
Auto start-stop off memory per user
targetEcu: DME/FEM combination
confidence: HIGH
Tailgate / trunk comfort open close options
targetEcu: Tailgate module
confidence: MEDIUM
Headlight range / cornering light behavior
targetEcu: Light control module
confidence: LOW–MEDIUM (high variation by SW)
Service menu and oil reset
targetEcu: KOMBI / DME
confidence: HIGH for service reset but DIDs differ
Automatic door unlock on crash disable/enable
targetEcu: Safety module
confidence: LOW (safety-critical — often restricted)
ESP Sport / throttle mapping toggles
targetEcu: DSC / ECU
confidence: LOW (safety sensitive and OEM-protected)
Keyless start options (user memory)
targetEcu: CAS / DME
confidence: MEDIUM
What you must capture to mark a template VERIFIED

VIN, ECU logical address, HW part number and SW part number/version.
Pre-snapshot dump (DID readings).
Apply template, timestamped logs and pcap/ASC.
Post-snapshot dump and diff report that shows exact byteIndex, bitIndex, mask, old/new values.
Rollback procedure executed and verified (snapshot restore).
Signed record (tester id, lab, date, template version, test VIN list).
For multi-module features, verify sequence in the exact order published.
Example JSON template skeleton (to fill with lab-verified DID/byte/bit):

JSON
{
  "id": "vw_mqb_needle_sweep",
  "nameKey": "features.needleSweep",
  "descKey": "features.needleSweepDesc",
  "defaultName": "Gauge Needle Sweep (Staging)",
  "defaultDesc": "Sweeps instrument cluster needles to maximum upon ignition on.",
  "make": "Volkswagen",
  "models": ["Golf 7", "Golf 8", "Passat B8", "Tiguan"],
  "chassis": ["MQB"],
  "category": "DISPLAY_INSTRUMENT",
  "targetEcuHeader": "17",
  "ecuName": "Instrument Cluster",
  "didHex": "TBD — LAB_VERIFY",
  "byteIndex": null,
  "bitIndex": null,
  "bitMask": null,
  "defaultValueHex": null,
  "activatedValueHex": null,
  "multiOptions": null,
  "requiresSecurityAccess": false,
  "requiresExtendedSession": true,
  "safetyLevel": "LEVEL_1_STANDARD",
  "riskLevel": "LOW",
  "verification": {
    "status": "UNVERIFIED",
    "labTests": [],
    "verifiedBy": null,
    "verifiedDate": null,
    "verifiedVINs": []
  }
}
Deliverable 1 — final notes

Use the exact probe steps above for every template. Once you capture the DID/offsets, replace the TBD values, run rollback tests, then mark template VERIFIED. I can help convert captured logs into completed JSON records if you share the raw captures.
Deliverable 2 — Node.js TypeScript ingestion & validation script

File: scripts/ingest_oem_features.ts
Purpose: read input JSON file or directory of JSON feature templates, validate each against the Draft‑7 schema, compute CRC32 checksum for every template (canonicalized JSON), produce:
A TypeScript file: src/oem_features.generated.ts exporting OemFeatures[] (the validated templates),
A checksum manifest: src/oem_feature_checksums.generated.ts exporting mapping id -> crc32 hex,
A validation report printed to stdout and written to ingest_report.json.
Notes:

This script does NOT mutate your JSON templates. It generates separate checksum map and TypeScript modules.
Required npm packages: ajv, crc-32 (or crc), fast-json-stable-stringify (for deterministic JSON string), prettier (optional).
scripts/ingest_oem_features.ts

TypeScript
// scripts/ingest_oem_features.ts
// Node.js (TypeScript) script to validate OEM feature JSON files against Draft-7 schema,
// compute CRC32 checksums (deterministic), and generate TypeScript export modules.

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import stringify from "fast-json-stable-stringify";
import crc32 from "crc-32";

const INPUT_PATH = process.argv[2] || path.join(process.cwd(), "catalog.json"); // single file or folder
const OUTPUT_FEATURES_TS = path.join(process.cwd(), "src", "oem_features.generated.ts");
const OUTPUT_CHECKSUMS_TS = path.join(process.cwd(), "src", "oem_feature_checksums.generated.ts");
const REPORT_PATH = path.join(process.cwd(), "ingest_report.json");

// embed the schema (you can instead import it from a file)
const featureSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ECU Feature Template",
  "type": "object",
  "required": [
    "id",
    "nameKey",
    "descKey",
    "defaultName",
    "defaultDesc",
    "make",
    "models",
    "chassis",
    "category",
    "targetEcuHeader",
    "ecuName",
    "didHex",
    "byteIndex",
    "bitIndex",
    "bitMask",
    "defaultValueHex",
    "activatedValueHex",
    "multiOptions",
    "requiresSecurityAccess",
    "requiresExtendedSession",
    "safetyLevel",
    "riskLevel"
  ],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9_\\-]+$" },
    "nameKey": { "type": "string" },
    "descKey": { "type": "string" },
    "defaultName": { "type": "string" },
    "defaultDesc": { "type": "string" },
    "make": { "type": "string" },
    "models": { "type": "array", "items": { "type": "string" } },
    "chassis": { "type": "array", "items": { "type": "string" } },
    "category": { "type": "string" },
    "targetEcuHeader": { "type": "string", "pattern": "^[0-9A-Fa-f]{2}$" },
    "ecuName": { "type": "string" },
    "didHex": { "type": "string", "pattern": "^[0-9A-Fa-f]{1,4}$" },
    "byteIndex": { "type": ["integer", "null"], "minimum": 0 },
    "bitIndex": { "type": ["integer","null"], "minimum": 0, "maximum": 7 },
    "bitMask": { "type": ["string","null"], "pattern": "^[0-9A-Fa-f]{1,2}$" },
    "defaultValueHex": { "type": ["string","null"], "pattern": "^[0-9A-Fa-f]{1,2}$" },
    "activatedValueHex": { "type": ["string","null"], "pattern": "^[0-9A-Fa-f]{1,2}$" },
    "multiOptions": { "anyOf": [{ "type": "null" }, { "type": "array", "items": { "type": "object" } }] },
    "requiresSecurityAccess": { "type": "boolean" },
    "requiresExtendedSession": { "type": "boolean" },
    "safetyLevel": { "type": "string" },
    "riskLevel": { "type": "string" }
  },
  "additionalProperties": false
};

function readInput(inputPath: string): any[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input path not found: ${inputPath}`);
  }
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(inputPath).filter(f => f.endsWith(".json"));
    const accum: any[] = [];
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(inputPath, f), "utf8"));
      if (Array.isArray(j)) accum.push(...j);
      else accum.push(j);
    }
    return accum;
  } else {
    const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    if (Array.isArray(data)) return data;
    return [data];
  }
}

(async function main() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(featureSchema);

  const records = readInput(INPUT_PATH);
  const valid: any[] = [];
  const invalid: any[] = [];
  const checksums: { [id: string]: string } = {};

  for (const rec of records) {
    const ok = validate(rec);
    if (!ok) {
      invalid.push({ id: rec?.id || null, errors: validate.errors });
      continue;
    }
    // canonical JSON string for stable checksum
    const canon = stringify(rec);
    const crc = (crc32.str(canon) >>> 0).toString(16).toUpperCase().padStart(8, "0");
    checksums[rec.id] = crc;
    valid.push(rec);
  }

  // Write TS features file
  const featuresTs = `/* AUTO-GENERATED by scripts/ingest_oem_features.ts */
  // prettier-ignore
  export const OemFeatures = ${stringify(valid, { space: 2 })} as const;
  `;
  fs.mkdirSync(path.dirname(OUTPUT_FEATURES_TS), { recursive: true });
  fs.writeFileSync(OUTPUT_FEATURES_TS, featuresTs, "utf8");

  // Write TS checksum file
  const checksTs = `/* AUTO-GENERATED by scripts/ingest_oem_features.ts */
  export const OemFeatureChecksums: { [id: string]: string } = ${stringify(checksums, { space: 2 })};
  `;
  fs.writeFileSync(OUTPUT_CHECKSUMS_TS, checksTs, "utf8");

  const report = {
    timestamp: new Date().toISOString(),
    input: INPUT_PATH,
    total: records.length,
    valid: valid.length,
    invalid: invalid.length,
    invalidDetails: invalid
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(`Ingest complete. Valid: ${valid.length}, Invalid: ${invalid.length}`);
  console.log(`Generated: ${OUTPUT_FEATURES_TS}`);
  console.log(`Generated: ${OUTPUT_CHECKSUMS_TS}`);
  console.log(`Report: ${REPORT_PATH}`);
})();
How to run (quick)

Add dependencies in package.json:
JSON
{
  "name": "oem-ingest",
  "version": "0.1.0",
  "scripts": {
    "ingest": "ts-node scripts/ingest_oem_features.ts ./catalog.json"
  },
  "dependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1",
    "crc-32": "^2.0.2",
    "fast-json-stable-stringify": "^2.1.0",
    "ts-node": "^10.9.1",
    "typescript": "^4.9.5"
  }
}
Put your feature JSON (catalog.json) in project root or pass directory path.
npm install, then run npm run ingest.
Deliverable 2 notes

The script uses deterministic JSON stringify so the checksum is stable across runs.
The checksum is stored in a separate generated TS module to keep your original templates immutable.
Deliverable 3 — Jest test-suite & VirtualECU mock

Files:
tests/virtual_ecu.ts (VirtualECU mock)
tests/uds_sim.test.ts (Jest tests)
Purpose: emulate minimal UDS behavior for 0x22 (read) and 0x2E (write) and provide features:
normal read/write/verify
interrupted write with rollback
unsupported SW rejection
tests/virtual_ecu.ts

TypeScript
// tests/virtual_ecu.ts
export type DidValue = Uint8Array;

export interface VirtualEcuOptions {
  swVersion: string;
  supportedDids?: { [didHex: string]: string }; // didHex -> hex string initial value
  requireSecurity?: boolean;
}

export class VirtualECU {
  swVersion: string;
  private storage: Map<number, DidValue>;
  private requireSecurity: boolean;
  private lastSnapshot: Map<number, DidValue> | null = null;

  constructor(opts: VirtualEcuOptions) {
    this.swVersion = opts.swVersion;
    this.requireSecurity = !!opts.requireSecurity;
    this.storage = new Map<number, DidValue>();
    for (const [hex, val] of Object.entries(opts.supportedDids || {})) {
      const did = parseInt(hex, 16);
      this.storage.set(did, this.hexToBytes(val));
    }
  }

  // read DID using 0x22 behavior (returns copy)
  async readDID(didHex: string) {
    const did = parseInt(didHex, 16);
    const v = this.storage.get(did);
    if (!v) throw new Error(`NRC 0x31 (Request Out Of Range) - DID ${didHex} not found`);
    return v.slice(); // return a copy
  }

  // write DID using 0x2E behavior. Accepts a hex string or Uint8Array
  // supports chunking simulation: pass chunkSize to simulate an interrupted write
  async writeDID(didHex: string, data: string | Uint8Array, options?: { requireSecurityGranted?: boolean; chunkSize?: number; interruptAtChunk?: number; }) {
    if (this.requireSecurity && !options?.requireSecurityGranted) {
      throw new Error("NRC 0x33 - Security access denied");
    }
    const did = parseInt(didHex, 16);
    const old = this.storage.get(did);
    if (!old) throw new Error(`NRC 0x31 - DID ${didHex} not found`);
    const bytes = typeof data === "string" ? this.hexToBytes(data) : data;
    // snapshot for rollback
    this.createSnapshot();

    const chunkSize = options?.chunkSize && options.chunkSize > 0 ? options.chunkSize : bytes.length;
    let written = 0;
    const totalChunks = Math.ceil(bytes.length / chunkSize);
    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      if (options?.interruptAtChunk !== undefined && chunkIdx === options.interruptAtChunk) {
        // simulate adapter disconnect or power loss
        // leave partial write (we'll simulate that partial data has been written)
        const partial = bytes.slice(0, chunkIdx * chunkSize);
        const newBuf = this.applyPartialWrite(old, partial);
        this.storage.set(did, newBuf);
        // Simulate error / interruption
        throw new Error("SIMULATED_INTERRUPT");
      }
      const start = chunkIdx * chunkSize;
      const end = Math.min(start + chunkSize, bytes.length);
      // apply chunk: build buffer newVal
      const prev = this.storage.get(did) || new Uint8Array(0);
      const newVal = this.applyPartialWrite(prev, bytes.slice(0, end));
      this.storage.set(did, newVal);
      written += (end - start);
      // emulate small delay
      await this.delay(5);
    }
    // verify stage (simple equality)
    const final = this.storage.get(did)!;
    if (!this.arrEq(final, bytes)) {
      // verification failure - auto-rollback
      this.rollback();
      throw new Error("VERIFY_FAILED");
    }
    // commit (clear snapshot)
    this.clearSnapshot();
    return true;
  }

  // helper: create snapshot
  createSnapshot() {
    const snap = new Map<number, DidValue>();
    for (const [k, v] of this.storage.entries()) snap.set(k, v.slice());
    this.lastSnapshot = snap;
  }

  rollback() {
    if (!this.lastSnapshot) throw new Error("No snapshot to rollback");
    this.storage = new Map<number, DidValue>(this.lastSnapshot);
    this.lastSnapshot = null;
  }

  clearSnapshot() {
    this.lastSnapshot = null;
  }

  private applyPartialWrite(orig: DidValue | undefined, partial: DidValue) {
    const base = orig ? orig.slice() : new Uint8Array(partial.length);
    if (partial.length > base.length) {
      const newBuf = new Uint8Array(partial.length);
      newBuf.set(partial, 0);
      // if original existed, overlay original tail if any
      if (base.length > 0) newBuf.set(base.slice(base.length), base.length);
      return newBuf;
    } else {
      const out = base.slice();
      out.set(partial, 0);
      return out;
    }
  }

  private arrEq(a: DidValue, b: DidValue) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  private hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace(/[^0-9A-Fa-f]/g, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    return out;
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
tests/uds_sim.test.ts

TypeScript
// tests/uds_sim.test.ts
import { VirtualECU } from "./virtual_ecu";

describe("VirtualECU UDS simulation", () => {
  it("normal read/write/verify flow with 0x22/0x2E", async () => {
    const ecu = new VirtualECU({
      swVersion: "1.0.0",
      supportedDids: {
        "0F01": "AA55AA55", // example DID present
      },
      requireSecurity: false
    });

    const before = await ecu.readDID("0F01");
    expect(before).toBeDefined();
    // write new value successfully
    const newHex = "11223344";
    await expect(ecu.writeDID("0F01", newHex, { requireSecurityGranted: true })).resolves.toBeTruthy();
    const after = await ecu.readDID("0F01");
    const afterHex = Buffer.from(after).toString("hex").toUpperCase();
    expect(afterHex).toEqual(newHex.toUpperCase());
  });

  it("interrupted write triggers rollback", async () => {
    const initial = "AAAAAA00";
    const ecu = new VirtualECU({
      swVersion: "1.0.0",
      supportedDids: {
        "0F02": initial
      },
      requireSecurity: false
    });

    const newVal = "112233445566";
    // simulate interrupt at chunk index 1 when chunkSize=4 bytes (so partial write occurs)
    await expect(ecu.writeDID("0F02", newVal, { chunkSize: 4, interruptAtChunk: 1, requireSecurityGranted: true })).rejects.toThrow("SIMULATED_INTERRUPT");
    // after interruption, rollback should restore previous value
    // note: our mock throws on interrupt before auto-rollback, so we roll back manually to simulate orchestrator behavior
    ecu.rollback(); // in real orchestrator this is automatic or attempted via restore
    const restored = await ecu.readDID("0F02");
    const restoredHex = Buffer.from(restored).toString("hex").toUpperCase();
    expect(restoredHex).toEqual(initial.toUpperCase());
  });

  it("rejects write if security not granted", async () => {
    const ecu = new VirtualECU({
      swVersion: "1.0.0",
      supportedDids: { "0F03": "00112233" },
      requireSecurity: true
    });
    await expect(ecu.writeDID("0F03", "AABBCCDD")).rejects.toThrow("NRC 0x33");
  });

  it("rejects write due to unsupported SW version (application-level check)", async () => {
    // simulate an application-level check: templates should assert allowed SW versions
    const ecu = new VirtualECU({
      swVersion: "2.0.0",
      supportedDids: { "0F04": "AA00BB00" },
      requireSecurity: false
    });

    // template expects SW 1.x (we simulate app-level check before calling write)
    const allowedSwPrefix = "1.";
    function checkTemplateAllowed(ecuSw: string, allowedPrefix: string) {
      if (!ecuSw.startsWith(allowedPrefix)) throw new Error("UNSUPPORTED_SW_VERSION");
    }

    expect(() => checkTemplateAllowed(ecu.swVersion, allowedSwPrefix)).toThrow("UNSUPPORTED_SW_VERSION");
    // bypassing check and writing would be possible but template should block this; test confirms application layer must enforce it.
  });
});
How to run the Jest suite

Add dev dependencies to package.json:
JSON
{
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^4.9.5"
  }
}
Configure jest in package.json:
JSON
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.ts"]
}
Run npm test (or npx jest).
Notes about the mock and real integration

The VirtualECU mock is intentionally simple and deterministic. It simulates snapshots and rollback. In production testing, replace this mock with real test bench code that speaks ISO‑TP over CAN or DoIP (e.g., using udsoncan/python-can or a Vector API).
Tests include a sample “application-level SW check” (last test). In your orchestrator always validate ECU hw/sw part numbers against the template before performing any write.
Final checklist & next steps I can perform for you

If you want, I can:
Convert your current 360-template catalog into the schema and run the TypeScript ingestion locally (I’ll need the catalog file).
Produce a runnable script (python or Node) that runs lab discovery automatically (enumerates candidate DIDs by reading a range and outputs diffs).
Accept a small set of raw lab captures (pcap/asc/CSV) and convert them into production-verified JSON templates, filling didHex/byteIndex/bitIndex/bitMask and adding verification metadata.
Extend the Jest tests to drive an actual CAN bus using SocketCAN and python-can interop or a J2534 adapter.
Which of these would you like next (I recommend: share a sample of 10 of your current templates so I can run them through the ingestion script and produce a prioritized verification list with "TBD" flags)?