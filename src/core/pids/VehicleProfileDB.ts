import RNFS from 'react-native-fs';

export interface VehicleProfile {
    id: string;
    make: string;
    model: string;
    year: number;
    protocol: string; // e.g., '6' (ISO 15765-4 CAN 11bit 500k), '7' (CAN 29b 500k), '5' (ISO 14230-4 KWP Fast Init), 'A' (SAE J1939)
    initCommands: string[];
    settleDelayMs: number;
    targetHeader?: string;
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
                "AT Z",
                "AT E0",
                "AT ST FF",
                "AT IIA 10",
                "AT SP 5"
            ],
            settleDelayMs: 300,
            initAddresses: [0x10, 0x18, 0x33, 0x81],
            supportsManualFlowControl: false,
            description: "Dacia KWP2000 Engine ECU profile — Fast Init via ELM327 autonomous driver"
        },
        {
            id: "hyundai_h100_2024_can",
            make: "Hyundai",
            model: "H100",
            year: 2024,
            protocol: "6", // ISO 15765-4 CAN (11 bit ID, 500 kbaud)
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "Hyundai / Kia CAN 11bit 500k profile with SGW and targeted Powertrain Header"
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
                "AT SP 4",
                "AT SI"
            ],
            settleDelayMs: 300,
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
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "Toyota / Lexus CAN 11-bit with Hybrid control module queries supported"
        },
        {
            id: "vag_meb_mqb_can",
            make: "Volkswagen",
            model: "MQB/MEB Platform (Audi/SEAT/Skoda/Cupra)",
            year: 2018,
            protocol: "6", // ISO 15765-4 CAN 11bit 500k
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "VAG Group (VW/Audi/SEAT/Skoda/Cupra) CAN profile via central gateway, UDS mode 22/19 aware"
        },
        {
            id: "bmw_fseries_can",
            make: "BMW",
            model: "F/G-Series (incl. MINI)",
            year: 2015,
            protocol: "6",
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "BMW/MINI F/G-Series CAN profile via central gateway (ZGW), UDS mode 22/2E aware"
        },
        {
            id: "mercedes_can",
            make: "Mercedes-Benz",
            model: "W205/W213/C257 Platform",
            year: 2015,
            protocol: "6",
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "Mercedes-Benz CAN 11-bit profile for post-2014 SPC/HU-Nav gateway platforms"
        },
        {
            id: "ford_sync_can",
            make: "Ford",
            model: "Sync 3 / Sync 4 Platform",
            year: 2016,
            protocol: "6",
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "Ford CAN 11-bit profile for Sync 3/4 (MS-CAN + HS-CAN) equipped models"
        },
        {
            id: "stellantis_can",
            make: "Stellantis",
            model: "PSA/Fiat/Jeep EMP2/CMP Platform (Peugeot/Citroen/Opel/Fiat)",
            year: 2024,
            protocol: "6",
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 150,
            supportsManualFlowControl: true,
            description: "Stellantis (Peugeot/Citroen/Fiat/Opel/Jeep) BSI SGW-Aware CAN profile with physical 7E0 header & 3E00 Tester Present"
        },
        {
            id: "motorcycle_euro5_can",
            make: "Motorcycle",
            model: "Euro 4 / Euro 5 CAN",
            year: 2021,
            protocol: "6",
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0"
            ],
            settleDelayMs: 80,
            supportsManualFlowControl: true,
            description: "High-RPM Euro 4/5 Motorcycle ISO 15765-4 CAN 11b/500k profile"
        },
        {
            id: "heavy_duty_j1939",
            make: "Commercial",
            model: "SAE J1939 29b/250k Heavy Duty",
            year: 2018,
            protocol: "A",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP A",
                "AT H1"
            ],
            settleDelayMs: 150,
            supportsManualFlowControl: false,
            description: "24V Commercial Heavy Duty Truck SAE J1939 CAN profile"
        },
        {
            id: "generic_obd2_auto",
            make: "Generic",
            model: "Auto Protocol",
            year: 2018,
            protocol: "6", // Modern default CAN 11b/500k
            targetHeader: "7E0",
            initCommands: [
                "AT Z",
                "AT E0",
                "AT SP 6",
                "AT CAF 1",
                "AT AT 1",
                "AT H1",
                "AT SH 7E0",
                "3E 00"
            ],
            settleDelayMs: 100,
            supportsManualFlowControl: true,
            description: "Generic Modern OBD-II Profile with CAN 11b/500k, ATCAF1 and 7E0 Powertrain Header"
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
     * Matches a vehicle profile based on user's manual selection (Brand, Model, Year, FuelType).
     */
    public static matchProfileByMakeModelYear(brand: string, model: string, year: number, fuelType?: string): VehicleProfile {
        const cleanBrand = (brand || '').toLowerCase().trim();
        const cleanModel = (model || '').toLowerCase().trim();

        // 1. Stellantis Group (Peugeot, Citroen, Opel, Fiat, Alfa Romeo, Jeep, DS)
        if (
            cleanBrand.includes('peugeot') ||
            cleanBrand.includes('citroen') ||
            cleanBrand.includes('opel') ||
            cleanBrand.includes('fiat') ||
            cleanBrand.includes('alfa') ||
            cleanBrand.includes('jeep') ||
            cleanBrand.includes('stellantis') ||
            cleanBrand === 'peugeot_car' ||
            cleanBrand === 'citroen'
        ) {
            return this.getProfileById("stellantis_can") || this.getActiveProfiles()[0];
        }

        // 2. VAG Group (Volkswagen, Audi, SEAT, Skoda, Cupra, Porsche)
        if (
            cleanBrand.includes('volkswagen') ||
            cleanBrand.includes('vw') ||
            cleanBrand.includes('audi') ||
            cleanBrand.includes('seat') ||
            cleanBrand.includes('skoda') ||
            cleanBrand.includes('cupra') ||
            cleanBrand.includes('porsche')
        ) {
            return this.getProfileById("vag_meb_mqb_can") || this.getActiveProfiles()[0];
        }

        // 3. BMW / MINI
        if (cleanBrand.includes('bmw_car') || cleanBrand.includes('bmw') || cleanBrand.includes('mini')) {
            return this.getProfileById("bmw_fseries_can") || this.getActiveProfiles()[0];
        }

        // 4. Mercedes-Benz
        if (cleanBrand.includes('mercedes')) {
            return this.getProfileById("mercedes_can") || this.getActiveProfiles()[0];
        }

        // 5. Toyota / Lexus
        if (cleanBrand.includes('toyota') || cleanBrand.includes('lexus')) {
            return this.getProfileById("toyota_hybrid_can") || this.getActiveProfiles()[0];
        }

        // 6. Hyundai / Kia / Genesis
        if (cleanBrand.includes('hyundai') || cleanBrand.includes('kia') || cleanBrand.includes('genesis')) {
            return this.getProfileById("hyundai_h100_2024_can") || this.getActiveProfiles()[0];
        }

        // 7. Ford / Lincoln
        if (cleanBrand.includes('ford') || cleanBrand.includes('lincoln')) {
            return this.getProfileById("ford_sync_can") || this.getActiveProfiles()[0];
        }

        // 8. Renault / Dacia (Legacy K-Line vs Modern CAN)
        if (cleanBrand.includes('dacia') || cleanBrand.includes('renault')) {
            if (year > 0 && year <= 2013) {
                return this.getProfileById("dacia_logan_2011_kline") || this.getActiveProfiles()[0];
            }
            return this.getProfileById("stellantis_can") || this.getProfileById("generic_obd2_auto") || this.getActiveProfiles()[0];
        }

        // 9. Motorcycles
        if (
            cleanBrand.includes('moto') ||
            cleanBrand.includes('honda_moto') ||
            cleanBrand.includes('yamaha') ||
            cleanBrand.includes('kawasaki') ||
            cleanBrand.includes('ktm') ||
            cleanBrand.includes('ducati') ||
            cleanBrand.includes('aprilia') ||
            cleanBrand.includes('cfmoto') ||
            cleanBrand.includes('bajaj') ||
            cleanBrand.includes('vespa') ||
            cleanBrand.includes('sym')
        ) {
            return this.getProfileById("motorcycle_euro5_can") || this.getActiveProfiles()[0];
        }

        return this.getProfileById("generic_obd2_auto") || this.getActiveProfiles()[0];
    }

    /**
     * SCOPED K-LINE ADDRESS UNION
     */
    public static getKLineAddressUnion(): number[] {
        const baseline = [0x10, 0x33, 0x81];
        const profileAddresses = this.getActiveProfiles()
            .filter(p => p.protocol === '4' || p.protocol === '5')
            .flatMap(p => p.initAddresses ?? []);
        const union = [...new Set([...baseline, ...profileAddresses])];
        return union.sort((a, b) => a - b);
    }

    /**
     * Attempts heuristic match of a vehicle profile based on VIN character signatures.
     */
    public static matchProfileByVin(vin: string): VehicleProfile | undefined {
        const cleanVin = vin.toUpperCase().trim();
        if (cleanVin.startsWith("UU1") || cleanVin.startsWith("VF1")) {
            return this.getProfileById("dacia_logan_2011_kline");
        }
        if (cleanVin.startsWith("KMH") || cleanVin.startsWith("KMX")) {
            return this.getProfileById("hyundai_h100_2024_can");
        }
        if (cleanVin.startsWith("JTD") || cleanVin.startsWith("4T1")) {
            return this.getProfileById("toyota_hybrid_can");
        }
        if (["WVW", "WV1", "WV2", "3VW", "1VW", "WAU", "TRU", "VSS", "TMB"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("vag_meb_mqb_can");
        }
        if (["WBA", "WBS", "WBY", "4US", "5UX", "WMW"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("bmw_fseries_can");
        }
        if (["WDD", "WDB", "WDC", "4JG"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("mercedes_can");
        }
        if (["1FA", "1FT", "1FM", "WF0", "3FA"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("ford_sync_can");
        }
        if (["VF3", "VF7", "ZFA", "1C4", "1C6"].some(p => cleanVin.startsWith(p))) {
            return this.getProfileById("stellantis_can");
        }
        return this.getProfileById("generic_obd2_auto");
    }
}

