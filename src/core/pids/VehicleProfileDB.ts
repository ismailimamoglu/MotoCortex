import RNFS from 'react-native-fs';

export interface VehicleProfile {
    id: string;
    make: string;
    model: string;
    year: number;
    protocol: string; // e.g., 'ATSP5' (ISO 14230-4 KWP Fast Init), 'ATSP4' (ISO 14230-4 KWP Slow Init), 'ATSP6' (ISO 15765-4 CAN 11bit 500k)
    initCommands: string[];
    settleDelayMs: number;
    // [v7.5.1 FIX-1] Renamed from kLineAddresses → initAddresses.
    // Scoped per-profile: only Renault/Dacia profiles carry brand-specific addresses (e.g. 0x18).
    // useBluetooth.ts calls VehicleProfileDB.getKLineAddressUnion() to build the merged scan list
    // dynamically — prevents injecting brand-specific addresses into the global scan loop.
    initAddresses?: number[];
    supportsManualFlowControl: boolean;
    description: string;
}

export class VehicleProfileDB {
    private static loadedProfiles: VehicleProfile[] = [];
    private static profiles: VehicleProfile[] = [
        {
            id: "dacia_logan_2011_kline",
            make: "Dacia",
            model: "Logan",
            year: 2011,
            protocol: "5", // ISO 14230-4 KWP Fast Init
            initCommands: [
                "AT Z",        // Reset — triggers VIRTUAL_PROMPT_GUARD (waitForELMPrompt)
                "AT E0",       // Echo Off
                "AT ST FF",    // Max timeout
                "AT IIA 10",   // Set target address to 0x10 (Engine ECU)
                "AT SP 5",     // ISO 14230-4 KWP Fast Init protocol
                // [v7.5.0 FIX-1] AT SI REMOVED for proto 5 (Fast Init).
                // ELM327 autonomously drives the Fast Init wakeup sequence after AT SP 5.
                // First data frame (01 00 / 01 0C) triggers the bus initialization.
                // Sending AT SI manually creates a timing conflict with ELM's bus sentinel.
            ],
            settleDelayMs: 300,
            // [v7.5.1 FIX-1] initAddresses: Dacia/Renault-specific ECU node addresses.
            // 0x10 = standard ISO 14230 engine node
            // 0x18 = Renault/Dacia functional address (F018h, engine ECU variant)
            // 0x33 = ISO 14230 functional broadcast
            // 0x81 = Renault legacy tester present
            initAddresses: [0x10, 0x18, 0x33, 0x81],
            supportsManualFlowControl: false,
            description: "Dacia KWP2000 Engine ECU profile — Fast Init via ELM327 autonomous driver (AT SI suppressed)"
        },
        {
            id: "hyundai_h100_2024_can",
            make: "Hyundai",
            model: "H100",
            year: 2024,
            protocol: "6", // ISO 15765-4 CAN (11 bit ID, 500 kbaud)
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",     // Force CAN 11bit 500k
                "AT H1",       // Headers On to expose CAN addresses
                "AT CAF 1"     // CAN Auto Flow Control on
            ],
            settleDelayMs: 50,
            supportsManualFlowControl: true,
            description: "Hyundai CAN 11bit 500k profile with manual Flow Control option"
        },
        {
            id: "renault_kwp_generic",
            make: "Renault",
            model: "Generic KWP",
            year: 2012,
            protocol: "4", // ISO 14230-4 KWP Slow
            initCommands: [
                "AT Z",
                "AT E0",
                "AT ST FF",
                "AT IIA 10",
                "AT SP 4",     // KWP Slow protocol
                "AT SI"
            ],
            settleDelayMs: 300,
            // [v7.5.1 FIX-1] 0x18 scoped to Renault profile only — not injected globally
            initAddresses: [0x10, 0x18, 0x33],
            supportsManualFlowControl: false,
            description: "Renault K-Line KWP2000 Slow Initialization profile"
        },
        {
            id: "toyota_hybrid_can",
            make: "Toyota",
            model: "Hybrid Profile",
            year: 2020,
            protocol: "6",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1"
            ],
            settleDelayMs: 50,
            supportsManualFlowControl: true,
            description: "Toyota CAN 11-bit with Hybrid control module queries supported"
        },
        {
            id: "vag_meb_mqb_can",
            make: "Volkswagen",
            model: "MQB/MEB Platform (Audi/SEAT/Skoda/Cupra)",
            year: 2018,
            protocol: "6", // ISO 15765-4 CAN 11bit 500k
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1",       // Headers on — VAG gateway (0x17FE) fans out to sub-ECUs (0x714 engine, 0x713 ABS, etc.)
                "AT CAF 1",    // Auto flow-control — required for VAG's multi-frame UDS (0x22/0x19) responses
                "AT AT 1"      // Adaptive timing — VAG central gateway response latency varies by module
            ],
            settleDelayMs: 80,
            supportsManualFlowControl: true,
            description: "VAG Group (VW/Audi/SEAT/Skoda/Cupra) CAN profile — routes through central gateway, UDS mode 22/19 aware"
        },
        {
            id: "bmw_fseries_can",
            make: "BMW",
            model: "F/G-Series (incl. MINI)",
            year: 2015,
            protocol: "6",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1",
                "AT CAF 1",
                "AT AT 1"      // BMW DS2/D-CAN gateway can be slow on cold boot; adaptive timing avoids false timeouts
            ],
            settleDelayMs: 80,
            supportsManualFlowControl: true,
            description: "BMW/MINI F/G-Series CAN profile via central gateway (ZGW), UDS mode 22/2E aware"
        },
        {
            id: "mercedes_can",
            make: "Mercedes-Benz",
            model: "W205/W213/C257 Platform",
            year: 2015,
            protocol: "6",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1",
                "AT CAF 1"
            ],
            settleDelayMs: 60,
            supportsManualFlowControl: true,
            description: "Mercedes-Benz CAN 11-bit profile for post-2014 SPC/HU-Nav gateway platforms"
        },
        {
            id: "ford_sync_can",
            make: "Ford",
            model: "Sync 3 / Sync 4 Platform",
            year: 2016,
            protocol: "6",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1",
                "AT CAF 1"
            ],
            settleDelayMs: 60,
            supportsManualFlowControl: true,
            description: "Ford CAN 11-bit profile for Sync 3/4 (MS-CAN + HS-CAN) equipped models"
        },
        {
            id: "stellantis_can",
            make: "Stellantis",
            model: "PSA/Fiat/Jeep EMP2/CMP Platform",
            year: 2017,
            protocol: "6",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT H1",
                "AT CAF 1"
            ],
            settleDelayMs: 60,
            supportsManualFlowControl: true,
            description: "Stellantis (Peugeot/Citroen/Fiat/Jeep) BSI-gateway CAN profile"
        },
        {
            id: "generic_obd2_auto",
            make: "Generic",
            model: "Auto Protocol",
            year: 2018,
            protocol: "0", // Automatic search
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 0"      // Auto protocol search
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: false,
            description: "Generic OBD-II Profile utilizing adapter automatic protocol search"
        }
    ];

    public static async reloadProfiles(): Promise<void> {
        const filePath = `${RNFS.DocumentDirectoryPath}/oem_profiles.json`;
        try {
            const exists = await RNFS.exists(filePath);
            if (exists) {
                const content = await RNFS.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    this.loadedProfiles = data;
                    return;
                }
            }
        } catch (e) {
            console.error('[VehicleProfileDB] Failed to load dynamic profiles:', e);
        }
        this.loadedProfiles = [];
    }

    public static getActiveProfiles(): VehicleProfile[] {
        return this.loadedProfiles.length > 0 ? this.loadedProfiles : this.profiles;
    }

    public static getProfileById(id: string): VehicleProfile | undefined {
        return this.getActiveProfiles().find(p => p.id === id);
    }

    public static getProfilesByMake(make: string): VehicleProfile[] {
        return this.getActiveProfiles().filter(p => p.make.toLowerCase() === make.toLowerCase());
    }

    public static getAllProfiles(): VehicleProfile[] {
        return [...this.getActiveProfiles()];
    }

    /**
     * [v7.5.1 FIX-1] SCOPED K-LINE ADDRESS UNION
     * Merges the baseline universal scan addresses with profile-specific initAddresses
     * from K-Line profiles only (proto 4 or 5). This prevents brand-specific addresses
     * (e.g. 0x18 for Renault/Dacia) from leaking into the global scan loop and causing
     * unnecessary scan delay for unrelated manufacturers.
     *
     * Baseline: [0x10, 0x33, 0x81] — ISO 14230-4 standard nodes
     * Profile contributions: only from profiles with protocol '4' or '5'
     * Result: deduplicated, ordered union
     */
    public static getKLineAddressUnion(): number[] {
        const baseline = [0x10, 0x33, 0x81];
        const profileAddresses = this.getActiveProfiles()
            .filter(p => p.protocol === '4' || p.protocol === '5')
            .flatMap(p => p.initAddresses ?? []);
        const union = [...new Set([...baseline, ...profileAddresses])];
        // Sort numerically for deterministic scan order
        return union.sort((a, b) => a - b);
    }

    /**
     * Attempts heuristic match of a vehicle profile based on VIN character signatures.
     */
    public static matchProfileByVin(vin: string): VehicleProfile | undefined {
        const cleanVin = vin.toUpperCase().trim();
        if (cleanVin.startsWith("UU1") || cleanVin.startsWith("VF1")) {
            // Renault / Dacia VIN prefixes
            return this.getProfileById("dacia_logan_2011_kline");
        }
        if (cleanVin.startsWith("KMH") || cleanVin.startsWith("KMX")) {
            // Hyundai VIN prefixes
            return this.getProfileById("hyundai_h100_2024_can");
        }
        if (cleanVin.startsWith("JTD") || cleanVin.startsWith("4T1")) {
            // Toyota VIN prefixes
            return this.getProfileById("toyota_hybrid_can");
        }
        // [Gap-fix] VAG Group: VW (WVW/WV1/WV2/3VW/1VW), Audi (WAU/TRU), SEAT (VSS), Skoda (TMB)
        if (["WVW", "WV1", "WV2", "3VW", "1VW", "WAU", "TRU", "VSS", "TMB"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("vag_meb_mqb_can");
        }
        // [Gap-fix] BMW / MINI: WBA/WBS/WBY (BMW), 4US/5UX (BMW NA), WMW (MINI)
        if (["WBA", "WBS", "WBY", "4US", "5UX", "WMW"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("bmw_fseries_can");
        }
        // [Gap-fix] Mercedes-Benz: WDD/WDB/WDC/4JG
        if (["WDD", "WDB", "WDC", "4JG"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("mercedes_can");
        }
        // [Gap-fix] Ford: 1FA/1FT/1FM/WF0/3FA
        if (["1FA", "1FT", "1FM", "WF0", "3FA"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("ford_sync_can");
        }
        // [Gap-fix] Stellantis: VF3 (Peugeot), VF7 (Citroen), ZFA (Fiat), 1C4/1C6 (Jeep/RAM)
        if (["VF3", "VF7", "ZFA", "1C4", "1C6"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("stellantis_can");
        }
        return this.getProfileById("generic_obd2_auto");
    }
}
