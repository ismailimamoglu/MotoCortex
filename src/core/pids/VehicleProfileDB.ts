import RNFS from 'react-native-fs';

export interface VehicleProfile {
    id: string;
    make: string;
    model: string;
    year: number;
    protocol: string; // e.g., 'ATSP5' (ISO 14230-4 KWP Fast Init), 'ATSP4' (ISO 14230-4 KWP Slow Init), 'ATSP6' (ISO 15765-4 CAN 11bit 500k)
    initCommands: string[];
    settleDelayMs: number;
    kLineAddresses?: number[]; // Candidate target addresses e.g. [0x10, 0x33, 0x81]
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
            protocol: "5", // ISO 14230-4 KWP Fast
            initCommands: [
                "AT Z",        // Reset
                "AT E0",       // Echo Off
                "AT ST FF",    // Max timeout
                "AT IIA 10",   // Set target address to 0x10 (Engine)
                "AT SP 5",     // KWP Fast protocol
                "AT SI"        // Start initialization
            ],
            settleDelayMs: 300,
            kLineAddresses: [0x10, 0x33, 0x81],
            supportsManualFlowControl: false,
            description: "Dacia KWP2000 Engine ECU profile (using address 0x10 fallback heuristics)"
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
            kLineAddresses: [0x10, 0x33],
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
        return this.getProfileById("generic_obd2_auto");
    }
}
