#!/usr/bin/env python3
"""
scripts/probe_ecu_dids.py

MotoCortex UDS Diagnostic DID Discovery & Bit-Diff Tool.
Safe, non-destructive (read-only) probe tool to discover DID ranges and
compute exact Byte Index, Bit Offset, and Bitmask differences when features are toggled.

Usage:
  python3 scripts/probe_ecu_dids.py --iface can0 --tx 0x7E0 --rx 0x7E8 --start 0x1000 --end 0x1FFF
"""

import argparse
import importlib
import json
import sys
import time
from typing import Dict, Any

# Safe dynamic import loader to avoid IDE static linter warnings when optional libs are not pre-installed
def _load_module(mod_name: str):
    try:
        return importlib.import_module(mod_name)
    except Exception:
        return None

can = _load_module("can")
udsoncan = _load_module("udsoncan")
udsoncan_client = _load_module("udsoncan.client")
udsoncan_conn = _load_module("udsoncan.connections")
udsoncan_exc = _load_module("udsoncan.exceptions")

HAS_LIBS = all([can, udsoncan, udsoncan_client, udsoncan_conn, udsoncan_exc])


def did_to_hex(did: int) -> str:
    return f"{did:04X}"


def read_range(client: Any, start: int, end: int, verbose: bool = False) -> Dict[str, str]:
    """
    Read DIDs from start..end inclusive using ReadDataByIdentifier (0x22).
    Returns mapping DID hex -> hex payload string (uppercase).
    """
    results = {}
    for did in range(start, end + 1):
        try:
            resp = client.read_data_by_identifier(did)
            data_bytes = resp.service_data.values[0] if hasattr(resp.service_data, "values") else resp.data
            hexval = data_bytes.hex().upper()
            results[did_to_hex(did)] = hexval
            if verbose:
                print(f"  DID {did_to_hex(did)} -> {hexval}")
        except Exception as e:
            if verbose:
                print(f"  DID {did_to_hex(did)} -> ERR ({e})")
            continue
    return results


def compute_diff(before: Dict[str, str], after: Dict[str, str]) -> Dict[str, dict]:
    """
    Compute differences between baseline and post-toggle DID maps.
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
                mask = f"{diff:02X}"
                changes.append({
                    "byteIndex": i,
                    "beforeByte": f"{bv:02X}",
                    "afterByte": f"{av:02X}",
                    "bitMask": mask,
                })
        diffs[did] = {
            "before": before.get(did, ""),
            "after": after.get(did, ""),
            "changes": changes,
        }
    return diffs


def main():
    p = argparse.ArgumentParser(description="Probe ECU DID ranges and diff when feature toggled.")
    p.add_argument("--iface", default="can0", help="CAN interface (e.g., can0)")
    p.add_argument("--bustype", default="socketcan", help="python-can bustype (default socketcan)")
    p.add_argument("--tx", type=lambda x: int(x, 0), default=0x7E0, help="ECU request ID (e.g., 0x7E0)")
    p.add_argument("--rx", type=lambda x: int(x, 0), default=0x7E8, help="ECU response ID (e.g., 0x7E8)")
    p.add_argument("--start", type=lambda x: int(x, 0), default=0x1000, help="Start DID (hex)")
    p.add_argument("--end", type=lambda x: int(x, 0), default=0x1050, help="End DID (hex)")
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args()

    if not HAS_LIBS:
        print("[!] python-can, udsoncan, and isotp are required to run this script directly against hardware.")
        print("[!] Install via: pip3 install python-can udsoncan isotp")
        return

    print(f"[*] Connecting to CAN bus {args.iface} ({args.bustype})...")
    try:
        bus = can.interface.Bus(channel=args.iface, bustype=args.bustype)
    except Exception as e:
        print(f"[!] Failed to open CAN bus {args.iface}: {e}")
        sys.exit(2)

    print(f"[*] Using tx=0x{args.tx:X} rx=0x{args.rx:X} DID range 0x{args.start:04X}..0x{args.end:04X}")
    conn = udsoncan_conn.PythonIsoTpConnection(bus, args.tx, args.rx)

    try:
        with udsoncan_client.Client(conn, request_timeout=3) as client:
            print("[*] Entering extended diagnostic session (0x10 03)...")
            try:
                client.change_session(0x03)
                print("[+] Entered extended session (0x03).")
            except Exception as e:
                print(f"[!] Warning: could not change session: {e}. Continuing with reads.")

            print("[*] Reading baseline DID range...")
            baseline = read_range(client, args.start, args.end, verbose=args.verbose)
            
            with open("probe_baseline.json", "w") as fh:
                json.dump(baseline, fh, indent=2)
            print("[+] Baseline saved to probe_baseline.json")

            print("\n[ACTION REQUIRED]: Manually toggle the physical feature (e.g., enable needle sweep / fold mirrors).")
            input("Press ENTER when done to capture post-state...")

            print("[*] Reading post-change DID range...")
            after = read_range(client, args.start, args.end, verbose=args.verbose)
            with open("probe_post.json", "w") as fh:
                json.dump(after, fh, indent=2)
            print("[+] Post-state saved to probe_post.json")

            print("[*] Computing bit-diffs...")
            diffs = compute_diff(baseline, after)
            if not diffs:
                print("[!] No differences detected in probed range.")
            else:
                for did, info in diffs.items():
                    print(f"\n[+] DID 0x{did}:")
                    print(f"    before: {info['before']}")
                    print(f"    after : {info['after']}")
                    for c in info['changes']:
                        print(f"    -> Byte {c['byteIndex']}: 0x{c['beforeByte']} -> 0x{c['afterByte']} (Mask: 0x{c['bitMask']})")
                with open("probe_diff.json", "w") as fh:
                    json.dump(diffs, fh, indent=2)
                print("\n[+] Diff report saved to probe_diff.json")
    except Exception as e:
        print(f"[!] UDS client error: {e}")
        sys.exit(3)


if __name__ == "__main__":
    main()
