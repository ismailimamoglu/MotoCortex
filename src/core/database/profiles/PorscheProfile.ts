/**
 * PorscheProfile.ts — Porsche OEM Feature Activation Profile
 * Supports 911 (991/992), Cayenne, Macan, Panamera, Taycan.
 */

import { OEMFeatureDefinition } from '../types';

export const PORSCHE_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'porsche_needle_sweep_staging',
        nameKey: 'features.items.porsche_needle_sweep_staging.name',
        descKey: 'features.items.porsche_needle_sweep_staging.desc',
        defaultName: 'Porsche Tachometer Needle Sweep on Start',
        defaultDesc: 'Sweeps central analog tachometer needle to redline on ignition power up.',
        make: 'Porsche',
        category: 'DISPLAY_INSTRUMENT',
        targetEcuHeader: '17',
        didHex: '6010',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'porsche_sport_exhaust_valve_manual_mode',
        nameKey: 'features.items.porsche_sport_exhaust_valve_manual_mode.name',
        descKey: 'features.items.porsche_sport_exhaust_valve_manual_mode.desc',
        defaultName: 'PSE Sport Exhaust Flaps Permanently Open',
        defaultDesc: 'Keeps dual active exhaust valves 100% open across all RPM ranges when PSE button is active.',
        make: 'Porsche',
        category: 'PERFORMANCE',
        targetEcuHeader: '01',
        didHex: '6020',
        byteIndex: 2,
        bitIndex: 3,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'porsche_rear_spoiler_manual_speed_threshold',
        nameKey: 'features.items.porsche_rear_spoiler_manual_speed_threshold.name',
        descKey: 'features.items.porsche_rear_spoiler_manual_speed_threshold.desc',
        defaultName: 'Active Rear Aerodynamic Wing Deployment Speed',
        defaultDesc: 'Adjusts automatic rear spoiler deployment speed threshold (80 km/h vs 120 km/h).',
        make: 'Porsche',
        category: 'PERFORMANCE',
        targetEcuHeader: '09',
        didHex: '6030',
        byteIndex: 1,
        bitIndex: 5,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'porsche_matrix_highbeam_unlock',
        nameKey: 'features.items.porsche_matrix_highbeam_unlock.name',
        descKey: 'features.items.porsche_matrix_highbeam_unlock.desc',
        defaultName: 'PDLS+ Matrix LED Adaptive Anti-Glare High Beam',
        defaultDesc: 'Enables European-spec variable anti-glare high beam light distribution.',
        make: 'Porsche',
        category: 'LIGHTING',
        targetEcuHeader: '09',
        didHex: '6040',
        byteIndex: 4,
        bitIndex: 2,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'porsche_acoustic_chirp_lock',
        nameKey: 'features.items.porsche_acoustic_chirp_lock.name',
        descKey: 'features.items.porsche_acoustic_chirp_lock.desc',
        defaultName: 'Acoustic Siren Beep on Central Lock',
        defaultDesc: 'Gives a quick chirp confirmation when locking with Porsche smart key.',
        make: 'Porsche',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '09',
        didHex: '6050',
        byteIndex: 0,
        bitIndex: 4,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    }
];
