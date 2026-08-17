/**
 * HeavyDutyProfile.ts — Heavy-Duty Commercial Vehicles, Trucks & Buses Profile
 * Supports Mercedes Actros/Arocs, Volvo FH/FM, Scania R/S, MAN TGX, Ford F-MAX, DAF XF, Cummins.
 */

import { OEMFeatureDefinition } from '../types';

export const HEAVY_DUTY_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'actros_rsl_fleet_speed_limit',
        nameKey: 'features.items.actros_rsl_fleet_speed_limit.name',
        descKey: 'features.items.actros_rsl_fleet_speed_limit.desc',
        defaultName: 'Road Speed Limiter (Fleet Limit)',
        defaultDesc: 'Configures maximum vehicle road speed limiter (RSL) calibration for fleet operation policy.',
        make: 'Mercedes-Benz Trucks',
        category: 'PERFORMANCE',
        targetEcuHeader: 'CPC',
        didHex: '4010',
        byteIndex: 0,
        bitIndex: 0,
        bitWidth: 16,
        options: [
            { labelKey: 'features.options.speed85', defaultLabel: '85 km/h', valueHex: '0055' },
            { labelKey: 'features.options.speed90', defaultLabel: '90 km/h (Standard)', valueHex: '005A' },
            { labelKey: 'features.options.speed100', defaultLabel: '100 km/h (Highway)', valueHex: '0064' },
            { labelKey: 'features.options.speed110', defaultLabel: '110 km/h (Max)', valueHex: '006E' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'MEDIUM'
    },
    {
        id: 'actros_idle_shutdown_timer',
        nameKey: 'features.items.actros_idle_shutdown_timer.name',
        descKey: 'features.items.actros_idle_shutdown_timer.desc',
        defaultName: 'Automatic Engine Idle Shutdown Timer',
        defaultDesc: 'Automatically shuts down engine after specified idle time while stationary with parking brake set.',
        make: 'Mercedes-Benz Trucks',
        category: 'SERVICE_MAINTENANCE',
        targetEcuHeader: 'CPC',
        didHex: '4020',
        byteIndex: 1,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.idleOff', defaultLabel: 'Disabled (Unlimited Idle)', valueHex: '00' },
            { labelKey: 'features.options.idle3m', defaultLabel: '3 Minutes Auto Shutdown', valueHex: '03' },
            { labelKey: 'features.options.idle5m', defaultLabel: '5 Minutes Auto Shutdown', valueHex: '05' },
            { labelKey: 'features.options.idle10m', defaultLabel: '10 Minutes Auto Shutdown', valueHex: '0A' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'volvo_pto_engine_rpm_preset',
        nameKey: 'features.items.volvo_pto_engine_rpm_preset.name',
        descKey: 'features.items.volvo_pto_engine_rpm_preset.desc',
        defaultName: 'PTO (Power Take-Off) Engine RPM Preset',
        defaultDesc: 'Sets predefined constant engine idle speed when PTO is engaged for hydraulic pump and tipper operation.',
        make: 'Volvo Trucks',
        category: 'PERFORMANCE',
        targetEcuHeader: 'EMS',
        didHex: '4030',
        byteIndex: 2,
        bitIndex: 0,
        bitWidth: 16,
        options: [
            { labelKey: 'features.options.pto900', defaultLabel: '900 RPM (Low Flow)', valueHex: '0384' },
            { labelKey: 'features.options.pto1100', defaultLabel: '1100 RPM (Standard Tipper)', valueHex: '044C' },
            { labelKey: 'features.options.pto1300', defaultLabel: '1300 RPM (High Flow Crane)', valueHex: '0514' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'MEDIUM'
    },
    {
        id: 'volvo_ppc_eco_roll_hysteresis',
        nameKey: 'features.items.volvo_ppc_eco_roll_hysteresis.name',
        descKey: 'features.items.volvo_ppc_eco_roll_hysteresis.desc',
        defaultName: 'I-See / PPC Topographical Speed Tolerance (Eco-Roll)',
        defaultDesc: 'Adjusts GPS predictive cruise control speed hysteresis tolerance window for maximum rolling fuel economy.',
        make: 'Volvo Trucks',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: 'VMCU',
        didHex: '4040',
        byteIndex: 8,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.hyst3', defaultLabel: '+/- 3 km/h (Strict)', valueHex: '03' },
            { labelKey: 'features.options.hyst5', defaultLabel: '+/- 5 km/h (Balanced)', valueHex: '05' },
            { labelKey: 'features.options.hyst10', defaultLabel: '+/- 10 km/h (Max Eco)', valueHex: '0A' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'scania_retarder_jake_brake_aggressiveness',
        nameKey: 'features.items.scania_retarder_jake_brake_aggressiveness.name',
        descKey: 'features.items.scania_retarder_jake_brake_aggressiveness.desc',
        defaultName: 'Retarder & Jake Brake Downshift Aggressiveness',
        defaultDesc: 'Adjusts retarder torque blending curve and automatic transmission downshifting response under braking.',
        make: 'Scania',
        category: 'PERFORMANCE',
        targetEcuHeader: 'PTM',
        didHex: '4050',
        byteIndex: 5,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.retarderLow', defaultLabel: 'Low (Smooth Highway)', valueHex: '00' },
            { labelKey: 'features.options.retarderMed', defaultLabel: 'Medium (Standard)', valueHex: '04' },
            { labelKey: 'features.options.retarderHigh', defaultLabel: 'High (Mountain / Heavy Haul)', valueHex: '08' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'MEDIUM'
    },
    {
        id: 'man_ecas_dock_level_memory',
        nameKey: 'features.items.man_ecas_dock_level_memory.name',
        descKey: 'features.items.man_ecas_dock_level_memory.desc',
        defaultName: 'ECAS Air Suspension Loading Dock Height Memory',
        defaultDesc: 'Stores and recalls customized pneumatic air suspension height level presets for loading docks.',
        make: 'MAN',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: 'BBM',
        didHex: '4060',
        byteIndex: 3,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.levelNormal', defaultLabel: 'Normal Driving Level', valueHex: '00' },
            { labelKey: 'features.options.levelRamp1', defaultLabel: 'Loading Ramp Height 1', valueHex: '01' },
            { labelKey: 'features.options.levelRamp2', defaultLabel: 'Loading Ramp Height 2', valueHex: '02' }
        ],
        requiresSecurityAccess: false,
        requiresExtendedSession: false,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'daf_stationary_dpf_regen_trigger',
        nameKey: 'features.items.daf_stationary_dpf_regen_trigger.name',
        descKey: 'features.items.daf_stationary_dpf_regen_trigger.desc',
        defaultName: 'Stationary DPF Forced Soot Regeneration',
        defaultDesc: 'Initiates stationary diesel particulate filter thermal soot burn routine in parked position.',
        make: 'DAF',
        category: 'SERVICE_MAINTENANCE',
        targetEcuHeader: 'ACM',
        didHex: '4070',
        byteIndex: 0,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.regenStart', defaultLabel: 'Start Stationary Regeneration', valueHex: '01' },
            { labelKey: 'features.options.regenStatus', defaultLabel: 'Query DPF Soot Status', valueHex: '00' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'MEDIUM'
    },
    {
        id: 'ford_trucks_reverse_buzzer_night_mode',
        nameKey: 'features.items.ford_trucks_reverse_buzzer_night_mode.name',
        descKey: 'features.items.ford_trucks_reverse_buzzer_night_mode.desc',
        defaultName: 'Reverse Acoustic Alarm Night Quiet Mode',
        defaultDesc: 'Attenuates reverse backup horn alarm volume for quiet night distribution in residential areas.',
        make: 'Ford Trucks',
        category: 'SOUND_ALERTS',
        targetEcuHeader: 'BBM',
        didHex: '4080',
        byteIndex: 4,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.alarmFull', defaultLabel: 'Standard 100% Volume (Daytime)', valueHex: 'FF' },
            { labelKey: 'features.options.alarmNight', defaultLabel: 'Attenuated 50% Volume (Night Mode)', valueHex: '7F' }
        ],
        requiresSecurityAccess: false,
        requiresExtendedSession: false,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'cummins_ecm_fleet_speed_limiter',
        nameKey: 'features.items.cummins_ecm_fleet_speed_limiter.name',
        descKey: 'features.items.cummins_ecm_fleet_speed_limiter.desc',
        defaultName: 'Cummins Engine Road Speed Limiter (RSL)',
        defaultDesc: 'Programs maximum allowable road vehicle speed in Cummins ECM parameter tables.',
        make: 'Cummins',
        category: 'PERFORMANCE',
        targetEcuHeader: 'ECM',
        didHex: '4090',
        byteIndex: 6,
        bitIndex: 0,
        bitWidth: 16,
        options: [
            { labelKey: 'features.options.speed85', defaultLabel: '85 km/h', valueHex: '0055' },
            { labelKey: 'features.options.speed90', defaultLabel: '90 km/h (Standard)', valueHex: '005A' },
            { labelKey: 'features.options.speed100', defaultLabel: '100 km/h', valueHex: '0064' }
        ],
        requiresSecurityAccess: true,
        securityLevel: 2,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'MEDIUM'
    }
];
