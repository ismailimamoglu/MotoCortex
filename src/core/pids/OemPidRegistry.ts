import { PidDefinition } from './PidRegistry';

/**
 * OemPidRegistry
 * ----------------------------------------------------------------------
 * Manufacturer-specific live data PIDs (Mode 22 / UDS ReadDataByIdentifier)
 * for VAG, BMW, Mercedes, Ford, Toyota, Honda, Hyundai/Kia, Renault, Volvo, Tesla.
 */

export interface OemPidDefinition extends PidDefinition {
    make: string;           // Scoping key — must match VehicleProfile.make
    ecuHeader?: string;     // Recommended "AT SH" target header for this DID (functional address)
}

const oemPidsList: OemPidDefinition[] = [
    // ── Volkswagen Group (VAG: VW/Audi/SEAT/Skoda/Porsche) ──────────────
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
        name: "VAG_GATEWAY_VIN_ECHO", description: "Central gateway VIN echo", min: 0, max: 0, unit: "ASCII",
        decode: (bytes) => bytes.map(b => String.fromCharCode(b)).join('')
    },
    {
        make: "Volkswagen", mode: "22", pid: "11A4", ecuHeader: "714",
        name: "VAG_DPF_SOOT_MASS_CALCULATED", description: "DPF calculated soot mass", min: 0, max: 100, unit: "g",
        decode: (bytes) => Math.round((((bytes[0] || 0) << 8 | (bytes[1] || 0)) / 100))
    },
    {
        make: "Volkswagen", mode: "22", pid: "11A5", ecuHeader: "714",
        name: "VAG_DPF_ASH_MASS", description: "DPF measured oil ash mass", min: 0, max: 100, unit: "g",
        decode: (bytes) => Math.round((((bytes[0] || 0) << 8 | (bytes[1] || 0)) / 100))
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
        name: "BMW_AC_ELECTRIC_MOTOR_TEMP", description: "Electric water pump / e-motor temperature", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        make: "BMW", mode: "22", pid: "D12C", ecuHeader: "12",
        name: "BMW_OIL_DEGRADATION_LEVEL", description: "Engine oil degradation index", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
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

    // ── Ford ─────────────────────────────────────────────────────────────
    {
        make: "Ford", mode: "22", pid: "404C", ecuHeader: "7E0",
        name: "FORD_TURBO_BOOST_DESIRED_VS_ACTUAL", description: "Desired vs actual turbo boost delta", min: -500, max: 500, unit: "mbar",
        decode: (bytes) => ((bytes[0] || 0) - 128) * 10
    },
    {
        make: "Ford", mode: "22", pid: "1E12", ecuHeader: "7E0",
        name: "FORD_TRANS_FLUID_TEMP", description: "Transmission fluid temperature", min: -40, max: 200, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },

    // ── Toyota / Lexus ───────────────────────────────────────────────────
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

    // ── Hyundai / Kia ────────────────────────────────────────────────────
    {
        make: "Hyundai", mode: "22", pid: "0101", ecuHeader: "7E4",
        name: "HYUNDAI_EV_BATTERY_SOH", description: "EV High Voltage Battery State of Health", min: 0, max: 100, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) * 256 + (bytes[1] || 0)) / 10).toFixed(1))
    },
    {
        make: "Hyundai", mode: "22", pid: "0105", ecuHeader: "7E4",
        name: "HYUNDAI_EV_BATTERY_TEMP_MAX", description: "EV High Voltage Battery Max Module Temp", min: -40, max: 100, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },

    // ── Renault / Dacia ──────────────────────────────────────────────────
    {
        make: "Renault", mode: "22", pid: "2001", ecuHeader: "7E0",
        name: "RENAULT_INJECTOR_OFFSET_CYL1", description: "Cylinder 1 Injector Fuel Correction Offset", min: -5, max: 5, unit: "mg/stk",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) / 10).toFixed(1))
    },

    // ── Tesla ────────────────────────────────────────────────────────────
    {
        make: "Tesla", mode: "22", pid: "0202", ecuHeader: "7E4",
        name: "TESLA_HV_PACK_VOLTAGE", description: "High Voltage Battery Pack Total Voltage", min: 200, max: 500, unit: "V",
        decode: (bytes) => Number((((bytes[0] || 0) << 8 | (bytes[1] || 0)) / 10).toFixed(1))
    }
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
        if (["kia", "hyundai"].includes(m)) return "hyundai";
        if (["dacia", "renault"].includes(m)) return "renault";
        return m;
    }
}
