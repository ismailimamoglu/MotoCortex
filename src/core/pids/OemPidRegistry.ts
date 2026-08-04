import { PidDefinition } from './PidRegistry';

/**
 * OemPidRegistry
 * ----------------------------------------------------------------------
 * [Gap-fix] Addresses the AI code-review finding: "OEM PID setleri yok –
 * VAG/BMW/Mercedes/Ford/Toyota özel kanalları yok".
 *
 * Generic OBD-II (Mode 01) only exposes the ~100 SAE-standardized PIDs in
 * PidRegistry.ts. Manufacturer-specific live data (DSG/DCT oil temp,
 * individual wheel speeds, per-cylinder trims, hybrid battery cell data,
 * etc.) is exposed via UDS ReadDataByIdentifier (Mode 22) with vendor-owned
 * DID ranges that differ per OEM and are NOT safe to broadcast to other
 * manufacturers' ECUs — hence this is a separate, make-scoped registry
 * rather than being merged into the global standardPidsList.
 *
 * Usage: only query these once VehicleProfileDB has matched a make (by VIN
 * or manual selection), e.g.:
 *   const profile = VehicleProfileDB.matchProfileByVin(vin);
 *   const oemPids = OemPidRegistry.getPidsForMake(profile.make);
 */

export interface OemPidDefinition extends PidDefinition {
    make: string;           // Scoping key — must match VehicleProfile.make
    ecuHeader?: string;     // Recommended "AT SH" target header for this DID (functional address)
}

const oemPidsList: OemPidDefinition[] = [
    // ── Volkswagen Group (VAG: VW/Audi/SEAT/Skoda/Cupra) ──────────────
    // UDS Mode 22, engine ECU functional header 0x714 (varies by gateway/model year)
    {
        make: "Volkswagen", mode: "22", pid: "F40C", ecuHeader: "714",
        name: "VAG_DSG_OIL_TEMP", description: "DSG/DCT gearbox oil temperature", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        make: "Volkswagen", mode: "22", pid: "1158", ecuHeader: "714",
        name: "VAG_TURBO_BOOST_ACTUAL", description: "Actual turbocharger boost pressure", min: 0, max: 3000, unit: "mbar",
        decode: (bytes) => ((bytes[0] || 0) << 8 | (bytes[1] || 0))
    },
    {
        make: "Volkswagen", mode: "22", pid: "F442", ecuHeader: "714",
        name: "VAG_HYBRID_BATTERY_SOC", description: "High-voltage hybrid battery state of charge", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        make: "Volkswagen", mode: "22", pid: "0030", ecuHeader: "17FE",
        name: "VAG_GATEWAY_VIN_ECHO", description: "Central gateway VIN echo (connectivity sanity check)", min: 0, max: 0, unit: "ASCII",
        decode: (bytes) => bytes.map(b => String.fromCharCode(b)).join('')
    },

    // ── BMW / MINI (F/G-Series) ────────────────────────────────────────
    {
        make: "BMW", mode: "22", pid: "1C50", ecuHeader: "12",
        name: "BMW_VALVETRONIC_ACTUAL_LIFT", description: "Valvetronic actual valve lift", min: 0, max: 10, unit: "mm",
        decode: (bytes) => Number((((bytes[0] || 0)) / 25.5).toFixed(2))
    },
    {
        make: "BMW", mode: "22", pid: "0A9F", ecuHeader: "12",
        name: "BMW_HPFP_ACTUAL_PRESSURE", description: "High pressure fuel pump actual rail pressure", min: 0, max: 25000, unit: "kPa",
        decode: (bytes) => ((bytes[0] || 0) << 8 | (bytes[1] || 0)) * 10
    },
    {
        make: "BMW", mode: "22", pid: "4F42", ecuHeader: "F1",
        name: "BMW_AC_ELECTRIC_MOTOR_TEMP", description: "Electric water pump / e-motor temperature (PHEV models)", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },

    // ── Mercedes-Benz ───────────────────────────────────────────────────
    {
        make: "Mercedes-Benz", mode: "22", pid: "2A04", ecuHeader: "7E0",
        name: "MB_DPF_SOOT_LOAD", description: "Diesel particulate filter soot load", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        make: "Mercedes-Benz", mode: "22", pid: "1104", ecuHeader: "7E0",
        name: "MB_ADBLUE_LEVEL", description: "AdBlue (DEF) tank level", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        make: "Mercedes-Benz", mode: "22", pid: "F190", ecuHeader: "7E0",
        name: "MB_TRANSMISSION_TEMP", description: "7G-Tronic/9G-Tronic transmission oil temperature", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },

    // ── Ford (Sync 3 / Sync 4 platforms) ────────────────────────────────
    {
        make: "Ford", mode: "22", pid: "404C", ecuHeader: "7E0",
        name: "FORD_TURBO_BOOST_DESIRED_VS_ACTUAL", description: "Desired vs actual turbo boost delta", min: -500, max: 500, unit: "mbar",
        decode: (bytes) => ((bytes[0] || 0) - 128) * 10
    },
    {
        make: "Ford", mode: "22", pid: "1E12", ecuHeader: "7E0",
        name: "FORD_TRANS_FLUID_TEMP", description: "6F35/10R80 transmission fluid temperature", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },

    // ── Toyota / Lexus (Hybrid platforms) ───────────────────────────────
    {
        make: "Toyota", mode: "22", pid: "0107", ecuHeader: "7E2",
        name: "TOYOTA_HV_BATTERY_TEMP", description: "Hybrid HV battery pack temperature", min: -40, max: 120, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        make: "Toyota", mode: "22", pid: "010A", ecuHeader: "7E2",
        name: "TOYOTA_HV_BATTERY_SOC", description: "Hybrid HV battery state of charge", min: 0, max: 100, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) * 100) / 255).toFixed(1))
    },
];

const oemPidsByMake = new Map<string, OemPidDefinition[]>();
for (const p of oemPidsList) {
    const key = p.make.toLowerCase();
    if (!oemPidsByMake.has(key)) oemPidsByMake.set(key, []);
    oemPidsByMake.get(key)!.push(p);
}

export class OemPidRegistry {
    /**
     * Returns all manufacturer-specific PIDs for a given make.
     * Make matching is case-insensitive and tolerant of group naming
     * (e.g. "Audi"/"SEAT"/"Skoda"/"Cupra" all resolve to the VAG PID set).
     */
    public static getPidsForMake(make: string): OemPidDefinition[] {
        const normalized = this.normalizeMake(make);
        return oemPidsByMake.get(normalized) ?? [];
    }

    public static getPid(make: string, mode: string, pid: string): OemPidDefinition | undefined {
        return this.getPidsForMake(make).find(
            p => p.mode.toUpperCase() === mode.toUpperCase() && p.pid.toUpperCase() === pid.toUpperCase()
        );
    }

    public static getSupportedMakes(): string[] {
        return Array.from(new Set(oemPidsList.map(p => p.make)));
    }

    private static normalizeMake(make: string): string {
        const m = make.toLowerCase().trim();
        if (["audi", "seat", "skoda", "cupra", "porsche", "vw", "volkswagen"].includes(m)) return "volkswagen";
        if (["mini", "bmw"].includes(m)) return "bmw";
        if (["mercedes", "mercedes-benz", "mb", "amg"].includes(m)) return "mercedes-benz";
        if (["lexus", "toyota"].includes(m)) return "toyota";
        return m;
    }
}
