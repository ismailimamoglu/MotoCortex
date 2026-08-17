/**
 * RenaultProfile.ts — Renault & Dacia OEM Feature Activation Profile
 * Supports Clio, Megane, Captur, Kadjar, Talisman, Arkana, Dacia Duster, Sandero.
 */

import { OEMFeatureDefinition } from '../types';

export const RENAULT_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'renault_rlink_video_in_motion',
        nameKey: 'features.items.renault_rlink_video_in_motion.name',
        descKey: 'features.items.renault_rlink_video_in_motion.desc',
        defaultName: 'Video in Motion (VIM) Playback Unlock',
        defaultDesc: 'Allows USB/video playback on R-Link 2 / EasyLink touchscreen while vehicle is in motion.',
        make: 'Renault',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '5F',
        didHex: '3010',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'renault_rs_monitor_telemetry_unlock',
        nameKey: 'features.items.renault_rs_monitor_telemetry_unlock.name',
        descKey: 'features.items.renault_rs_monitor_telemetry_unlock.desc',
        defaultName: 'RS Monitor Performance Telemetry App',
        defaultDesc: 'Enables Renault Sport Monitor app displaying live turbo boost, torque, oil temp, and G-force meters.',
        make: 'Renault',
        category: 'PERFORMANCE',
        targetEcuHeader: '5F',
        didHex: '3020',
        byteIndex: 1,
        bitIndex: 0,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'renault_acoustic_lock_chirp',
        nameKey: 'features.items.renault_acoustic_lock_chirp.name',
        descKey: 'features.items.renault_acoustic_lock_chirp.desc',
        defaultName: 'Acoustic Horn Chirp on Hands-Free Walkaway Lock',
        defaultDesc: 'Emits a brief beep when vehicle automatically locks upon walking away with key card.',
        make: 'Renault',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '09',
        didHex: '3030',
        byteIndex: 2,
        bitIndex: 3,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'renault_rear_scandinavian_drl',
        nameKey: 'features.items.renault_rear_scandinavian_drl.name',
        descKey: 'features.items.renault_rear_scandinavian_drl.desc',
        defaultName: 'Scandinavian Daytime Running Tail Lights',
        defaultDesc: 'Keeps rear 3D LED signature tail lamps active simultaneously with front DRL strips.',
        make: 'Renault',
        category: 'LIGHTING',
        targetEcuHeader: '09',
        didHex: '3040',
        byteIndex: 4,
        bitIndex: 2,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'renault_cornering_fog_lamps',
        nameKey: 'features.items.renault_cornering_fog_lamps.name',
        descKey: 'features.items.renault_cornering_fog_lamps.desc',
        defaultName: 'Static Cornering Fog Light Illumination',
        defaultDesc: 'Lights up the relevant front fog light during turning maneuvers below 40 km/h.',
        make: 'Renault',
        category: 'LIGHTING',
        targetEcuHeader: '09',
        didHex: '3050',
        byteIndex: 3,
        bitIndex: 5,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'renault_seatbelt_buzzer_mute',
        nameKey: 'features.items.renault_seatbelt_buzzer_mute.name',
        descKey: 'features.items.renault_seatbelt_buzzer_mute.desc',
        defaultName: 'Seatbelt Warning Buzzer Sound Mute',
        defaultDesc: 'Mutes acoustic beeping for unfastened seatbelts (visual cluster alert remains active).',
        make: 'Renault',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '17',
        didHex: '3060',
        byteIndex: 0,
        bitIndex: 7,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    }
];
