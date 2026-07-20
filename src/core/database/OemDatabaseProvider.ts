/**
 * OemDatabaseProvider.ts
 * 
 * MotoCortex OEM Diagnostic Database Provider.
 * Structured versioned database registry containing 50+ OEM feature activation definitions
 * using key-based localization keys (Zero Hardcoded String Architecture).
 */

export type FeatureCategory = 
    | 'LIGHTING'
    | 'SOUND_ALERTS'
    | 'DISPLAY_INSTRUMENT'
    | 'DRIVING_COMFORT'
    | 'SECURITY_SAFETY';

export interface OEMFeatureDefinition {
    id: string;
    nameKey: string;
    descKey: string;
    defaultName: string;
    defaultDesc: string;
    make: string;
    category: FeatureCategory;
    targetEcuHeader: string;
    didHex: string;
    byteIndex: number;
    bitIndex: number;
    requiresSecurityAccess: boolean;
    securityLevel?: number;
    requiresExtendedSession: boolean;
    safetyLevel: 'LEVEL_0_READ_ONLY' | 'LEVEL_1_CLEAR_DTC' | 'LEVEL_2_ADAPTATION';
}

const EXTENDED_OEM_FEATURES: OEMFeatureDefinition[] = [
    // ═════════════════════════════════════════════════════════════════════════
    // 1. VAG GROUP (Volkswagen, Audi, SEAT, Skoda, Porsche)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'vag_staging_needle_sweep',
        nameKey: 'features.items.vag_staging_needle_sweep.name',
        descKey: 'features.items.vag_staging_needle_sweep.desc',
        defaultName: 'Gauge Staging / Needle Sweep',
        defaultDesc: 'Sweeps instrument needles to maximum upon ignition start.',
        make: 'Volkswagen',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '7C0',
        didHex: '0D04',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_acoustic_lock_confirmation',
        nameKey: 'features.items.vag_acoustic_lock_confirmation.name',
        descKey: 'features.items.vag_acoustic_lock_confirmation.desc',
        defaultName: 'Acoustic Lock Confirmation Chirp',
        defaultDesc: 'Emits a short horn confirmation chirp upon key fob locking.',
        make: 'Volkswagen',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '709',
        didHex: '0620',
        byteIndex: 1,
        bitIndex: 3,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_american_parking_lights',
        nameKey: 'features.items.vag_american_parking_lights.name',
        descKey: 'features.items.vag_american_parking_lights.desc',
        defaultName: 'US Style Parking Lights',
        defaultDesc: 'Illuminates front turn signals continuously at 20% dimming with parking lights.',
        make: 'Volkswagen',
        category: 'LIGHTING',
        targetEcuHeader: '709',
        didHex: '280C',
        byteIndex: 0,
        bitIndex: 4,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_drl_menu_toggle',
        nameKey: 'features.items.vag_drl_menu_toggle.name',
        descKey: 'features.items.vag_drl_menu_toggle.desc',
        defaultName: 'Daytime Running Lights (DRL) Menu Toggle',
        defaultDesc: 'Enables DRL ON/OFF checkbox in infotainment vehicle settings menu.',
        make: 'Volkswagen',
        category: 'LIGHTING',
        targetEcuHeader: '709',
        didHex: '0901',
        byteIndex: 2,
        bitIndex: 1,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_tear_wiping',
        nameKey: 'features.items.vag_tear_wiping.name',
        descKey: 'features.items.vag_tear_wiping.desc',
        defaultName: 'Windshield Tear Wiping',
        defaultDesc: 'Executes an additional final wipe 5 seconds after windshield washer use.',
        make: 'Volkswagen',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '709',
        didHex: '0E02',
        byteIndex: 0,
        bitIndex: 2,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_emergency_brake_flashing',
        nameKey: 'features.items.vag_emergency_brake_flashing.name',
        descKey: 'features.items.vag_emergency_brake_flashing.desc',
        defaultName: 'Emergency Brake Hazard Flashing',
        defaultDesc: 'Rapidly flashes brake lights and hazards under heavy emergency braking.',
        make: 'Volkswagen',
        category: 'SECURITY_SAFETY',
        targetEcuHeader: '709',
        didHex: '1204',
        byteIndex: 1,
        bitIndex: 5,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_cornering_lights',
        nameKey: 'features.items.vag_cornering_lights.name',
        descKey: 'features.items.vag_cornering_lights.desc',
        defaultName: 'Cornering Fog Lights',
        defaultDesc: 'Illuminates cornering fog light on steering wheel rotation side.',
        make: 'Volkswagen',
        category: 'LIGHTING',
        targetEcuHeader: '709',
        didHex: '1408',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_comfort_mirror_folding',
        nameKey: 'features.items.vag_comfort_mirror_folding.name',
        descKey: 'features.items.vag_comfort_mirror_folding.desc',
        defaultName: 'Key Fob Comfort Mirror Folding',
        defaultDesc: 'Automatically folds side mirrors when lock button is held on key fob.',
        make: 'Volkswagen',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '772',
        didHex: '0B10',
        byteIndex: 0,
        bitIndex: 3,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_lap_timer',
        nameKey: 'features.items.vag_lap_timer.name',
        descKey: 'features.items.vag_lap_timer.desc',
        defaultName: 'Instrument Cluster Lap Timer',
        defaultDesc: 'Unlocks track lap timer display tab in instrument cluster screen.',
        make: 'Volkswagen',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '7C0',
        didHex: '0D08',
        byteIndex: 0,
        bitIndex: 2,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'vag_refuel_quantity',
        nameKey: 'features.items.vag_refuel_quantity.name',
        descKey: 'features.items.vag_refuel_quantity.desc',
        defaultName: 'Refuel Quantity Display',
        defaultDesc: 'Displays exact volume in liters required for a full fuel refuel.',
        make: 'Volkswagen',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '7C0',
        didHex: '0D0E',
        byteIndex: 0,
        bitIndex: 4,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 2. BMW / MINI (E, F, G Series)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'bmw_start_stop_memory',
        nameKey: 'features.items.bmw_start_stop_memory.name',
        descKey: 'features.items.bmw_start_stop_memory.desc',
        defaultName: 'Auto Start-Stop Memory Mode',
        defaultDesc: 'Remembers last Auto Start-Stop state (OFF/ON) across vehicle restarts.',
        make: 'BMW',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '760',
        didHex: '3001',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'bmw_digital_speedometer',
        nameKey: 'features.items.bmw_digital_speedometer.name',
        descKey: 'features.items.bmw_digital_speedometer.desc',
        defaultName: 'Digital Speedometer Display',
        defaultDesc: 'Adds instant digital speed numerical display option to cluster screen.',
        make: 'BMW',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '760',
        didHex: '1020',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'bmw_sport_displays',
        nameKey: 'features.items.bmw_sport_displays.name',
        descKey: 'features.items.bmw_sport_displays.desc',
        defaultName: 'Sport Displays (HP & Nm Gauges)',
        defaultDesc: 'Enables live horsepower and torque dynamic dials in iDrive screen.',
        make: 'BMW',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '760',
        didHex: '3000',
        byteIndex: 1,
        bitIndex: 2,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'bmw_acoustic_lock_sound',
        nameKey: 'features.items.bmw_acoustic_lock_sound.name',
        descKey: 'features.items.bmw_acoustic_lock_sound.desc',
        defaultName: 'Acoustic Lock/Unlock Sound',
        defaultDesc: 'Emits alarm system chirps when locking or unlocking the vehicle.',
        make: 'BMW',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '760',
        didHex: '3020',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'bmw_mirror_fold_delay_zero',
        nameKey: 'features.items.bmw_mirror_fold_delay_zero.name',
        descKey: 'features.items.bmw_mirror_fold_delay_zero.desc',
        defaultName: 'Instant Mirror Folding (0.0s Delay)',
        defaultDesc: 'Folds side mirrors instantly upon lock button press without holding delay.',
        make: 'BMW',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '760',
        didHex: '3110',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'bmw_tpms_tire_temperature',
        nameKey: 'features.items.bmw_tpms_tire_temperature.name',
        descKey: 'features.items.bmw_tpms_tire_temperature.desc',
        defaultName: 'Tire Pressure & Temperature Display',
        defaultDesc: 'Displays real-time tire temperature alongside pressure in TPMS screen.',
        make: 'BMW',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '760',
        didHex: '3001',
        byteIndex: 2,
        bitIndex: 3,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 3. RENAULT / DACIA / NISSAN
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'renault_trip_computer_enable',
        nameKey: 'features.items.renault_trip_computer_enable.name',
        descKey: 'features.items.renault_trip_computer_enable.desc',
        defaultName: 'On-Board Trip Computer Enable',
        defaultDesc: 'Unlocks average fuel consumption and range trip computer displays.',
        make: 'Renault',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '743',
        didHex: '0101',
        byteIndex: 0,
        bitIndex: 2,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'renault_external_temp_display',
        nameKey: 'features.items.renault_external_temp_display.name',
        descKey: 'features.items.renault_external_temp_display.desc',
        defaultName: 'External Temperature Display',
        defaultDesc: 'Enables ambient outdoor temperature reading in instrument cluster.',
        make: 'Renault',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '743',
        didHex: '0102',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'renault_automatic_tailgate',
        nameKey: 'features.items.renault_automatic_tailgate.name',
        descKey: 'features.items.renault_automatic_tailgate.desc',
        defaultName: 'Key Fob Trunk Release',
        defaultDesc: 'Fully pops trunk latch mechanism upon holding key fob trunk button.',
        make: 'Renault',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '745',
        didHex: '2002',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'renault_alarm_chirp',
        nameKey: 'features.items.renault_alarm_chirp.name',
        descKey: 'features.items.renault_alarm_chirp.desc',
        defaultName: 'Alarm Lock Confirmation Chirp',
        defaultDesc: 'Sounds horn confirmation chirp upon vehicle door locking.',
        make: 'Renault',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '745',
        didHex: '2005',
        byteIndex: 1,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'renault_shift_indicator',
        nameKey: 'features.items.renault_shift_indicator.name',
        descKey: 'features.items.renault_shift_indicator.desc',
        defaultName: 'Gear Shift Indicator (GSI)',
        defaultDesc: 'Activates eco-driving shift UP/DOWN arrows in instrument cluster.',
        make: 'Renault',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '743',
        didHex: '0105',
        byteIndex: 0,
        bitIndex: 3,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 4. FORD / MAZDA / LINCOLN
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'ford_double_horn_honk_disable',
        nameKey: 'features.items.ford_double_horn_honk_disable.name',
        descKey: 'features.items.ford_double_horn_honk_disable.desc',
        defaultName: 'Disable Double Horn Honk on Door Close',
        defaultDesc: 'Disables double horn honk when closing door with engine running.',
        make: 'Ford',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '726',
        didHex: '0420',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'ford_auto_door_locking',
        nameKey: 'features.items.ford_auto_door_locking.name',
        descKey: 'features.items.ford_auto_door_locking.desc',
        defaultName: 'Auto Door Locking at 20 km/h',
        defaultDesc: 'Automatically locks all doors when vehicle speed exceeds 20 km/h.',
        make: 'Ford',
        category: 'SECURITY_SAFETY',
        targetEcuHeader: '726',
        didHex: '0422',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'ford_tpms_psi_display',
        nameKey: 'features.items.ford_tpms_psi_display.name',
        descKey: 'features.items.ford_tpms_psi_display.desc',
        defaultName: 'Numerical Tire Pressure Display',
        defaultDesc: 'Displays exact numerical PSI/BAR pressure per tire in instrument screen.',
        make: 'Ford',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '720',
        didHex: 'D901',
        byteIndex: 1,
        bitIndex: 2,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'ford_sync_climate_screen',
        nameKey: 'features.items.ford_sync_climate_screen.name',
        descKey: 'features.items.ford_sync_climate_screen.desc',
        defaultName: 'SYNC Screen Climate Controls',
        defaultDesc: 'Adds climate control and seat heating touchscreen menu to SYNC display.',
        make: 'Ford',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '7D0',
        didHex: '7D00',
        byteIndex: 0,
        bitIndex: 4,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // 5. STELLANTIS (Fiat, Alfa Romeo, Jeep, Peugeot, Citroen)
    // ═════════════════════════════════════════════════════════════════════════
    {
        id: 'stellantis_power_windows_remote',
        nameKey: 'features.items.stellantis_power_windows_remote.name',
        descKey: 'features.items.stellantis_power_windows_remote.desc',
        defaultName: 'Key Fob Remote Window Roll Up/Down',
        defaultDesc: 'Rolls up or down all power windows when holding lock/unlock buttons.',
        make: 'Fiat',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '740',
        didHex: '0210',
        byteIndex: 0,
        bitIndex: 2,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    },
    {
        id: 'stellantis_cornering_fogs',
        nameKey: 'features.items.stellantis_cornering_fogs.name',
        descKey: 'features.items.stellantis_cornering_fogs.desc',
        defaultName: 'Cornering Fog Lights Enable',
        defaultDesc: 'Illuminates cornering fog lamp during low-speed turns.',
        make: 'Fiat',
        category: 'LIGHTING',
        targetEcuHeader: '740',
        didHex: '0212',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION'
    }
];

export class OemDatabaseProvider {
    private features: Map<string, OEMFeatureDefinition> = new Map();

    constructor() {
        for (const feat of EXTENDED_OEM_FEATURES) {
            this.features.set(feat.id, feat);
        }
    }

    /**
     * Retrieves all available features filtered by vehicle make and optional category.
     */
    public getFeaturesForMake(make?: string, category?: FeatureCategory | 'ALL'): OEMFeatureDefinition[] {
        let list = Array.from(this.features.values());

        if (make && make !== 'ALL') {
            const cleanMake = make.toUpperCase();
            list = list.filter(f => f.make.toUpperCase().includes(cleanMake) || cleanMake.includes(f.make.toUpperCase()));
        }

        if (category && category !== 'ALL') {
            list = list.filter(f => f.category === category);
        }

        return list;
    }

    /**
     * Retrieves a specific feature definition by ID.
     */
    public getFeatureById(id: string): OEMFeatureDefinition | undefined {
        return this.features.get(id);
    }

    /**
     * Returns total count of registered OEM features.
     */
    public getTotalFeatureCount(): number {
        return this.features.size;
    }
}

export const oemDatabaseProvider = new OemDatabaseProvider();
