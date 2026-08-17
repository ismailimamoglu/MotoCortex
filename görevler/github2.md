Good — I implemented three ready-to-run artifacts you can use immediately in your lab and CI. I kept them practical, safe, and conservative (reads only for the probe unless you explicitly change to write), and made the TypeScript tooling compatible with your existing repo layout (src/core/database/OemDatabaseProvider.ts). Below are the deliverables, usage notes, and the exact files to drop into your repo.

What I did and what’s next

Delivered a Python UDS/CAN probe + diff tool (scripts/probe_ecu_dids.py) that uses python-can + udsoncan to read DID ranges, prompt the technician to toggle a physical feature, re-read the same range, and report byte offsets, byte diffs, changed bit masks and suggested byteIndex/bitIndex candidates.
Updated the JS ingest tool (scripts/ingest_oem_features.ts) so it outputs TypeScript modules that match your OEMFeatureDefinition consumer; it also computes CRC32 checksums deterministically and emits a verificationStatus field the migration tool will use.
Delivered a migration helper (scripts/migrate_oem_database.ts) that imports your current OemDatabaseProvider (TS) using ts-node at runtime, converts entries into the strict JSON schema, computes CRC32, and tags entries as VERIFIED or DRAFT_UNVERIFIED. It writes catalog_migrated.json and generated TS modules for immediate consumption.
Important environment notes before running anything

For the probe: I recommend SocketCAN (Linux) with a quality wired adapter for production DID discovery (vector/peak, or slcan bridges). ELM327/STN adapters over serial often have limitations for ISO‑TP/UDS; you can still use them for simple reads if the adapter exposes raw CAN frames—however for reliability and reflashes use wired/DoIP.
The Python probe uses udsoncan + python-can + isotp (udsoncan uses isotp underlying). For Windows you may need additional drivers for SocketCAN-like functionality or use PCAN/PEAK APIs supported by python-can.
The TypeScript utilities require Node >= 16 and ts-node for runtime-TS imports (migration). See the per-script instructions.
Deliverable 1 — scripts/probe_ecu_dids.py (Python UDS DID probe & diff)

Path: scripts/probe_ecu_dids.py
Purpose: read DID ranges (e.g., 0x1000–0x1FFF), create baseline dump, prompt technician to toggle feature, re-read and show diffs (byteIndex, changed bytes, changed bitmask(s)).
Technology: python-can, udsoncan
Behavior: non-destructive by default (read-only). Will not write without editing. Use request/response CAN IDs you provide (e.g., 0x7E0 / 0x7E8). Supports switching to other target IDs.
File: scripts/probe_ecu_dids.py

Python
#!/usr/bin/env python3
"""
scripts/probe_ecu_dids.py

Usage examples:
  # SocketCAN example:
  python3 scripts/probe_ecu_dids.py --iface can0 --tx 0x7E0 --rx 0x7E8 --start 0x1000 --end 0x1FFF

  # Narrower range example:
  python3 scripts/probe_ecu_dids.py --iface can0 --tx 0x7E0 --rx 0x7E8 --start 0xF190 --end 0xF1A0

Notes:
- Requires python-can, udsoncan, isotp
  pip3 install python-can udsoncan isotp
- Recommended: use SocketCAN (can0). If you must use serial ELM/STN, ensure the adapter can expose raw CAN frames; otherwise use a SocketCAN bridge or Peak/Vector interface supported by python-can.
- Script is read-only; it will not perform 0x2E writes.
"""

import argparse
import json
import sys
import time
from typing import Dict, Tuple

import can
from udsoncan.client import Client
from udsoncan.connections import PythonIsoTpConnection
from udsoncan import services, configs
from udsoncan.exceptions import NegativeResponseException, TimeoutException

HEX_PAD = lambda v: hex(v)[2:].upper().zfill(4)


def setup_bus(iface: str, bustype: str = "socketcan") -> can.interface.Bus:
    return can.interface.Bus(channel=iface, bustype=bustype)


def did_to_hex(did: int) -> str:
    return f"{did:04X}"


def read_range(client: Client, start: int, end: int, verbose: bool = False) -> Dict[str, str]:
    """
    Read DIDs from start..end inclusive using ReadDataByIdentifier (0x22).
    Returns mapping DID hex -> hex payload string (uppercase, no prefixes).
    """
    results = {}
    for did in range(start, end + 1):
        try:
            # udsoncan's read_data_by_identifier accepts int or list
            resp = client.read_data_by_identifier(did)
            data_bytes = resp.service_data.values[0] if hasattr(resp.service_data, "values") else resp.data
            # Convert to hex string
            hexval = data_bytes.hex().upper()
            results[did_to_hex(did)] = hexval
            if verbose:
                print(f"  DID {did_to_hex(did)} -> {hexval}")
        except NegativeResponseException as nre:
            # DID not supported or negative response - ignore
            if verbose:
                print(f"  DID {did_to_hex(did)} -> NEG_RESP ({nre})")
            continue
        except TimeoutException:
            if verbose:
                print(f"  DID {did_to_hex(did)} -> TIMEOUT")
            continue
        except Exception as e:
            # Other errors (bus issues). Print and continue.
            if verbose:
                print(f"  DID {did_to_hex(did)} -> ERROR {e}")
            continue
    return results


def compute_diff(before: Dict[str, str], after: Dict[str, str]) -> Dict[str, dict]:
    """
    Compute differences between two DID maps. Returns map:
      didHex -> { before: "...", after: "...", changes: [ { byteIndex, beforeByte, afterByte, bitMask } ] }
    """
    diffs = {}
    all_dids = set(before.keys()) | set(after.keys())
    for did in sorted(all_dids):
        b = bytes.fromhex(before.get(did, "")) if before.get(did) else b""
        a = bytes.fromhex(after.get(did, "")) if after.get(did) else b""
        if a == b:
            continue
        maxlen = max(len(a), len(b))
        changes = []
        for i in range(maxlen):
            bv = b[i] if i < len(b) else 0
            av = a[i] if i < len(a) else 0
            if bv != av:
                diff = bv ^ av
                # compute bitmask as hex
                mask = f"{diff:02X}"
                changes.append(
                    {
                        "byteIndex": i,
                        "beforeByte": f"{bv:02X}",
                        "afterByte": f"{av:02X}",
                        "bitMask": mask,
                    }
                )
        diffs[did] = {"before": before.get(did, ""), "after": after.get(did, ""), "changes": changes}
    return diffs


def main():
    p = argparse.ArgumentParser(description="Probe ECU DID ranges and diff when feature toggled.")
    p.add_argument("--iface", required=True, help="CAN interface (e.g., can0)")
    p.add_argument("--bustype", default="socketcan", help="python-can bustype (default socketcan)")
    p.add_argument("--tx", type=lambda x: int(x, 0), required=True, help="ECU request ID (e.g., 0x7E0)")
    p.add_argument("--rx", type=lambda x: int(x, 0), required=True, help="ECU response ID (e.g., 0x7E8)")
    p.add_argument("--start", type=lambda x: int(x, 0), default=int("0x1000", 16), help="Start DID (hex)")
    p.add_argument("--end", type=lambda x: int(x, 0), default=int("0x1FFF", 16), help="End DID (hex)")
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args()

    print("Connecting to CAN bus...")
    try:
        bus = setup_bus(args.iface, args.bustype)
    except Exception as e:
        print(f"Failed to open CAN bus {args.iface} ({args.bustype}): {e}")
        sys.exit(2)

    print(f"Using tx=0x{args.tx:X} rx=0x{args.rx:X} DID range {hex(args.start)}..{hex(args.end)}")

    # Create iso-tp connection through udsoncan
    # PythonIsoTpConnection's constructor signature: (bus, txid, rxid, params?)
    conn = PythonIsoTpConnection(bus, args.tx, args.rx)
    print("Opening UDS client over ISO-TP...")
    # use a client with default config; increase timeouts for slow adapters
    cfg = configs.default_client_config()
    cfg['request_timeout'] = 3.0
    cfg['p2_timeout'] = 5.0

    try:
        with Client(conn, request_timeout=3) as client:
            print("UDS client started. Entering extended diagnostic session (0x10 - subfunc 0x03).")
            try:
                client.change_session(0x03)  # Extended Diagnostic session
                print("Entered extended session (0x03).")
            except Exception as e:
                print(f"Warning: could not change session: {e}. Continuing with reads (some writes may be blocked).")

            print("Reading baseline DID range (this may take some time)...")
            baseline = read_range(client, args.start, args.end, verbose=args.verbose)
            ts1 = time.time()
            out = {
                "timestamp_baseline": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts1)),
                "tx": hex(args.tx),
                "rx": hex(args.rx),
                "range": [f"{args.start:04X}", f"{args.end:04X}"],
                "baseline": baseline,
            }
            with open("probe_baseline.json", "w") as fh:
                fh.write(json.dumps(out, indent=2))
            print("Baseline saved to probe_baseline.json")

            print("\nACTION: Now toggle the physical feature you want to test (e.g., press remote unlock, fold mirrors, toggle DRL).")
            print("When done toggling, press ENTER to continue and capture post-state.")
            input("Press ENTER when ready...")

            print("Reading post-change DID range...")
            after = read_range(client, args.start, args.end, verbose=args.verbose)
            ts2 = time.time()
            out2 = {
                "timestamp_post": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts2)),
                "post": after,
            }
            with open("probe_post.json", "w") as fh:
                fh.write(json.dumps(out2, indent=2))
            print("Post-state saved to probe_post.json")

            print("Computing diffs...")
            diffs = compute_diff(baseline, after)
            if not diffs:
                print("No differences detected in the probed DID range. Try narrower ranges, different ECU request/response IDs, or ensure you toggled the correct physical feature.")
            else:
                summary = {}
                for did, info in diffs.items():
                    print(f"\nDID {did}:")
                    print(f"  before: {info['before']}")
                    print(f"  after : {info['after']}")
                    for c in info['changes']:
                        print(f"   - byteIndex: {c['byteIndex']}, before=0x{c['beforeByte']}, after=0x{c['afterByte']}, bitMask=0x{c['bitMask']}")
                    summary[did] = info
                with open("probe_diff.json", "w") as fh:
                    fh.write(json.dumps(summary, indent=2))
                print("\nDiff report saved to probe_diff.json")
    except Exception as e:
        print(f"UDS client error: {e}")
        sys.exit(3)

    print("Done.")
How to use (quick)

Install dependencies: pip3 install python-can udsoncan isotp
Bring up SocketCAN (Linux) or use an adapter supported by python-can.
Run example: python3 scripts/probe_ecu_dids.py --iface can0 --tx 0x7E0 --rx 0x7E8 --start 0x1000 --end 0x1FFF
Follow prompts. Output files:
probe_baseline.json
probe_post.json
probe_diff.json (contains DID -> changed byteIndex & bitMask list).
Notes & tips

If you get lots of “no responses” limit the DID range, probe known candidate DID ranges (e.g., 0xF190–0xF2FF for identification/FA).
Use correct tx/rx IDs for the target ECU. Standard UDS req/res pairs are 0x7E0/0x7E8 (engine families) but instrument cluster, gateway and others may use different addresses (0x7D0/0x7D8, etc.). If the ECU uses functional addressing, a different approach is needed.
If reads fail because the ECU is locked, you may need to change diagnostic session or complete security access. For discovery, prefer cars where writes are allowed in extended session or consult OEM docs.
Deliverable 2 — Adjusted ingestion script matching OEMFeatureDefinition

Path: scripts/ingest_oem_features.ts (updated)
Function: validates input JSONs against Draft-7 schema, computes CRC32 per record (deterministic stable JSON), and emits:
src/core/database/oem_features.generated.ts which imports your OEMFeatureDefinition and exports the array typed as OEMFeatureDefinition[].
src/core/database/oem_feature_checksums.generated.ts mapping id -> checksum.
ingest_report.json summarizing valid/invalid records.
Important: the generated file imports the interface from your file src/core/database/OemDatabaseProvider.ts. If your actual export path or type name differs, change the import line at the top of the generated file or adjust constant.

File: scripts/ingest_oem_features.ts

TypeScript
// scripts/ingest_oem_features.ts
// Usage: ts-node scripts/ingest_oem_features.ts ./catalog.json
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import stringify from "fast-json-stable-stringify";
import crc32 from "crc-32";

const INPUT_PATH = process.argv[2] || path.join(process.cwd(), "catalog.json");
const OUT_FEATURES_TS = path.join(process.cwd(), "src", "core", "database", "oem_features.generated.ts");
const OUT_CHECKSUMS_TS = path.join(process.cwd(), "src", "core", "database", "oem_feature_checksums.generated.ts");
const REPORT_PATH = path.join(process.cwd(), "ingest_report.json");

// Draft-7 schema fragment (same as earlier), with allowance for verification metadata
const schema = {
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
    "riskLevel": { "type": "string" },
    "verification": { "type": ["object", "null"] }
  },
  "additionalProperties": false
};

function readInput(inputPath: string) {
  if (!fs.existsSync(inputPath)) throw new Error(`Input not found: ${inputPath}`);
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(inputPath).filter(f => f.endsWith(".json"));
    const out: any[] = [];
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(inputPath, f), "utf8"));
      if (Array.isArray(j)) out.push(...j);
      else out.push(j);
    }
    return out;
  } else {
    const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    if (Array.isArray(data)) return data;
    return [data];
  }
}

function canonicalChecksum(obj: any) {
  const canon = stringify(obj);
  const crc = (crc32.str(canon) >>> 0).toString(16).toUpperCase().padStart(8, "0");
  return crc;
}

async function main() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
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
    // ensure verificationStatus
    const verificationStatus = rec.verification && rec.verification.status === "VERIFIED" ? "VERIFIED" : "DRAFT_UNVERIFIED";
    const enriched = { ...rec, verificationStatus };
    const crc = canonicalChecksum(enriched);
    checksums[enriched.id] = crc;
    valid.push(enriched);
  }

  // create output TS module that imports OEMFeatureDefinition
  const header = `/* AUTO-GENERATED by scripts/ingest_oem_features.ts */\n// Do not edit by hand.\n\nimport { OEMFeatureDefinition } from "./OemDatabaseProvider";\n\n`;
  const body = `export const OemFeatures: OEMFeatureDefinition[] = ${JSON.stringify(valid, null, 2)} as const;\n`;
  fs.mkdirSync(path.dirname(OUT_FEATURES_TS), { recursive: true });
  fs.writeFileSync(OUT_FEATURES_TS, header + body, "utf8");

  const checksumTs = `/* AUTO-GENERATED by scripts/ingest_oem_features.ts */\nexport const OemFeatureChecksums: { [id: string]: string } = ${JSON.stringify(checksums, null, 2)};\n`;
  fs.writeFileSync(OUT_CHECKSUMS_TS, checksumTs, "utf8");

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
  console.log(`Generated: ${OUT_FEATURES_TS}`);
  console.log(`Generated: ${OUT_CHECKSUMS_TS}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
How to run

Ensure ts-node is available or transpile to JS. Example:
npm install --save-dev ts-node typescript
npm install ajv ajv-formats fast-json-stable-stringify crc-32
npx ts-node scripts/ingest_oem_features.ts ./catalog.json
Notes

The generated TS imports OEMFeatureDefinition from the same folder (./OemDatabaseProvider). Adjust that import path if your interface lives elsewhere.
The script adds verificationStatus = VERIFIED only if input had verification.status === "VERIFIED". Otherwise DRAFT_UNVERIFIED.
Deliverable 3 — Migration helper (scripts/migrate_oem_database.ts)

Path: scripts/migrate_oem_database.ts
Purpose: import your existing OemDatabaseProvider.ts (the existing provider that exports the old feature list), map/normalize each entry into the new strict format, compute CRC32 checksum, and tag verificationStatus.
Execution considerations: this script expects you to run with ts-node so it can import a TS module. Alternatively compile your code and import the JS version.
File: scripts/migrate_oem_database.ts

TypeScript
// scripts/migrate_oem_database.ts
// Usage: npx ts-node scripts/migrate_oem_database.ts ./src/core/database/OemDatabaseProvider.ts
// The script will import the given module (it should export an array named OemFeatures or FeatureCatalog).
// It will produce catalog_migrated.json and generated TS modules in src/core/database/

import path from "path";
import fs from "fs";
import stringify from "fast-json-stable-stringify";
import crc32 from "crc-32";

const inputModulePath = process.argv[2];
if (!inputModulePath) {
  console.error("Usage: ts-node scripts/migrate_oem_database.ts <path-to-existing-OemDatabaseProvider.ts>");
  process.exit(2);
}

async function importModule(p: string) {
  const full = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  // Allow importing TypeScript via ts-node runtime
  const mod = await import(full);
  return mod;
}

function canonicalChecksum(obj: any) {
  const canon = stringify(obj);
  return (crc32.str(canon) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function mapToNewSchema(oldRecord: any) {
  // Best-effort mapping; preserve fields where possible. Fill missing fields explicitly with null/defaults
  const out: any = {
    id: oldRecord.id || oldRecord.key || oldRecord.nameKey || ("auto_" + Math.random().toString(36).slice(2, 9)),
    nameKey: oldRecord.nameKey || `features.${oldRecord.id || 'unknown'}`,
    descKey: oldRecord.descKey || null,
    defaultName: oldRecord.defaultName || oldRecord.name || oldRecord.title || "",
    defaultDesc: oldRecord.defaultDesc || oldRecord.description || "",
    make: oldRecord.make || oldRecord.brand || "UNKNOWN",
    models: oldRecord.models || [],
    chassis: oldRecord.chassis || [],
    category: oldRecord.category || "COMFORT_CONVENIENCE",
    targetEcuHeader: oldRecord.targetEcuHeader ? ((""+oldRecord.targetEcuHeader).toUpperCase().replace("0X","")) : "00",
    ecuName: oldRecord.ecuName || "",
    didHex: oldRecord.didHex || (oldRecord.did ? oldRecord.did : "TBD"),
    byteIndex: (typeof oldRecord.byteIndex === "number") ? oldRecord.byteIndex : null,
    bitIndex: (typeof oldRecord.bitIndex === "number") ? oldRecord.bitIndex : null,
    bitMask: oldRecord.bitMask || null,
    defaultValueHex: oldRecord.defaultValueHex || null,
    activatedValueHex: oldRecord.activatedValueHex || null,
    multiOptions: oldRecord.multiOptions || null,
    requiresSecurityAccess: !!oldRecord.requiresSecurityAccess,
    requiresExtendedSession: !!oldRecord.requiresExtendedSession,
    safetyLevel: oldRecord.safetyLevel || "LEVEL_1_STANDARD",
    riskLevel: oldRecord.riskLevel || "LOW",
    verification: oldRecord.verification || null
  };

  // derive verificationStatus for ingestion
  out.verificationStatus = out.verification && out.verification.status === "VERIFIED" ? "VERIFIED" : "DRAFT_UNVERIFIED";
  return out;
}

(async function() {
  try {
    const mod = await importModule(inputModulePath);
    // Try various export names
    const exported = mod.OemFeatures || mod.FeatureCatalog || mod.default || mod.oemFeatures || null;
    if (!exported) {
      console.error("Could not find exported features on module. Please ensure it exports OemFeatures or FeatureCatalog or default.");
      process.exit(3);
    }
    const arr = Array.isArray(exported) ? exported : (Array.isArray(exported.default) ? exported.default : null);
    if (!arr) {
      console.error("Exported feature set is not an array.");
      process.exit(4);
    }

    const migrated: any[] = [];
    const checksums: { [id: string]: string } = {};
    for (const rec of arr) {
      const mapped = mapToNewSchema(rec);
      const crc = canonicalChecksum(mapped);
      checksums[mapped.id] = crc;
      migrated.push(mapped);
    }

    const outJsonPath = path.join(process.cwd(), "catalog_migrated.json");
    fs.writeFileSync(outJsonPath, JSON.stringify(migrated, null, 2), "utf8");
    console.log("Wrote migrated JSON:", outJsonPath);

    // Also write generated TS using your OEMFeatureDefinition import
    const genTsPath = path.join(process.cwd(), "src", "core", "database", "oem_features.generated.ts");
    const header = `/* AUTO-GENERATED by scripts/migrate_oem_database.ts */\nimport { OEMFeatureDefinition } from "./OemDatabaseProvider";\n\n`;
    const body = `export const OemFeatures: OEMFeatureDefinition[] = ${JSON.stringify(migrated, null, 2)} as const;\n`;
    fs.mkdirSync(path.dirname(genTsPath), { recursive: true });
    fs.writeFileSync(genTsPath, header + body, "utf8");
    console.log("Wrote generated TS:", genTsPath);

    const checksPath = path.join(process.cwd(), "src", "core", "database", "oem_feature_checksums.generated.ts");
    const checksTs = `/* AUTO-GENERATED */\nexport const OemFeatureChecksums: { [id: string]: string } = ${JSON.stringify(checksums, null, 2)};\n`;
    fs.writeFileSync(checksPath, checksTs, "utf8");
    console.log("Wrote checksum TS:", checksPath);

    console.log("Migration complete. Migrated records:", migrated.length);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
})();
How to run

Ensure you run with ts-node (the script imports your TypeScript provider):
npm install --save-dev ts-node typescript
npx ts-node scripts/migrate_oem_database.ts ./src/core/database/OemDatabaseProvider.ts
Output files:
catalog_migrated.json
src/core/database/oem_features.generated.ts
src/core/database/oem_feature_checksums.generated.ts
Behavior

The script attempts a best-effort field mapping. Manual QA will likely be necessary for edge cases (fields with different names, enums). It tags verificationStatus as VERIFIED only if the original record had verification.status === "VERIFIED"; otherwise DRAFT_UNVERIFIED.
Final recommendations & next steps

Run the probe script in one or two lab vehicles (MQB and F30) using a wired CAN interface and the appropriate req/resp IDs. Save and share probe_diff.json outputs; I can convert them into VERIFIED templates for you.
Run the ingestion script on your existing catalog (point to your catalog JSON directory). It will generate a typed TS module ready for OemDatabaseProvider.
Run the migration helper to convert your current in-repo provider into the new schema and checksums. Inspect catalog_migrated.json and spot-check high-risk items to verify field mapping quality.
If you want, upload a sample of 10 probe_diff.json files (from the script) and/or a sample of 20 existing templates and I will:
Convert them to fully VERIFIED templates (fill didHex/byteIndex/bitIndex/bitMask).
Return a pull request-ready patch that updates src/core/database/oem_features.generated.ts with the verified entries and marks them VERIFIED.
If you want, I can now:

Produce an automated "discovery sweep" extension that attempts multiple request/response ID pairs (common ranges) and narrows candidate modules automatically.
Or I can take the first probe_diff.json you produce and convert the relevant entries into finalized JSON templates per the strict schema. Which would you like me to do next?