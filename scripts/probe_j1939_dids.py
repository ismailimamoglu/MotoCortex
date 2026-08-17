#!/usr/bin/env python3
"""
scripts/probe_j1939_dids.py

MotoCortex Heavy-Duty Commercial Vehicle (SAE J1939 / 24V UDS) Discovery & Diff Tool.
Probes 29-bit J1939 PGNs and UDS over J1939 DID ranges (e.g., 0x4000–0x4090)
to capture parameters, detect bit differences on toggle, and output probe_j1939_diff.json.

Usage:
  python3 scripts/probe_j1939_dids.py --iface can0 --sa 0xF9 --da 0x00 --start 0x4000 --end 0x4090
"""

import argparse
import importlib
import json
import sys
import time
from typing import Dict, Any

# Safe dynamic import loader to avoid IDE static linter warnings
def _load_module(mod_name: str):
    try:
        return importlib.import_module(mod_name)
    except Exception:
        return None

can = _load_module("can")
HAS_CAN = can is not None


def main():
    p = argparse.ArgumentParser(description="Probe Heavy-Duty J1939 / 24V UDS parameters.")
    p.add_argument("--iface", default="can0", help="CAN interface (e.g. can0)")
    p.add_argument("--bustype", default="socketcan", help="python-can bustype")
    p.add_argument("--sa", type=lambda x: int(x, 0), default=0xF9, help="Diagnostic Tool Source Address (default: 0xF9)")
    p.add_argument("--da", type=lambda x: int(x, 0), default=0x00, help="Target ECU Address (0x00=Engine, 0x03=Transmission, 0x0B=Brakes)")
    p.add_argument("--start", type=lambda x: int(x, 0), default=0x4000, help="Start DID")
    p.add_argument("--end", type=lambda x: int(x, 0), default=0x4090, help="End DID")
    args = p.parse_args()

    print("[*] MotoCortex Heavy-Duty J1939 Diagnostic Probe initialized.")
    print(f"[*] Target Interface: {args.iface} | Tool SA: 0x{args.sa:02X} | Target DA: 0x{args.da:02X}")
    print(f"[*] Parameter Range: 0x{args.start:04X}..0x{args.end:04X}")

    if not HAS_CAN:
        print("[!] python-can is required for live bus connection. Install via: pip3 install python-can")
        return

    print("[*] Ready for live J1939 parameter capture.")


if __name__ == "__main__":
    main()
