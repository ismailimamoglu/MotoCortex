/**
 * ChineseEvProfile.ts — BYD, Chery, MG & Chinese EV OEM Feature Profile
 * Supports BYD (Seal, Dolphin, Atto 3, Han, Tang), Chery (Omoda, Tiggo), MG (MG4, ZS EV).
 */

import { OEMFeatureDefinition } from '../types';

export const CHINESE_EV_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'byd_battery_preconditioning_manual_toggle',
        nameKey: 'features.items.byd_battery_preconditioning_manual_toggle.name',
        descKey: 'features.items.byd_battery_preconditioning_manual_toggle.desc',
        defaultName: 'Blade Battery Manual Pre-Heating / Pre-Conditioning',
        defaultDesc: 'Enables manual battery thermal pre-heating before DC fast charging in cold weather.',
        make: 'BYD',
        category: 'EV_BATTERY_CHARGING',
        targetEcuHeader: '7E4',
        didHex: '5010',
        byteIndex: 0,
        bitIndex: 1,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'byd_vess_pedestrian_sound_customization',
        nameKey: 'features.items.byd_vess_pedestrian_sound_customization.name',
        descKey: 'features.items.byd_vess_pedestrian_sound_customization.desc',
        defaultName: 'VESS Low-Speed Pedestrian Acoustic Warning Themes',
        defaultDesc: 'Unlocks alternative synthesized engine / futuristic tone profiles for low-speed pedestrian alert.',
        make: 'BYD',
        category: 'SOUND_ALERTS',
        targetEcuHeader: '7E5',
        didHex: '5020',
        byteIndex: 1,
        bitIndex: 3,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'byd_ambient_sound_rhythm_sync',
        nameKey: 'features.items.byd_ambient_sound_rhythm_sync.name',
        descKey: 'features.items.byd_ambient_sound_rhythm_sync.desc',
        defaultName: 'Music Rhythm Pulse Ambient Lighting Sync',
        defaultDesc: 'Synchronizes cabin ambient LED brightness and color shifting with music bass rhythm.',
        make: 'BYD',
        category: 'LIGHTING',
        targetEcuHeader: '5F',
        didHex: '5030',
        byteIndex: 2,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'chery_auto_window_rain_close',
        nameKey: 'features.items.chery_auto_window_rain_close.name',
        descKey: 'features.items.chery_auto_window_rain_close.desc',
        defaultName: 'Automatic Window & Sunroof Rain Closing',
        defaultDesc: 'Closes all open windows and panoramic sunroof when rain sensor detects rainfall while parked.',
        make: 'Chery',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '09',
        didHex: '5040',
        byteIndex: 3,
        bitIndex: 4,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'mg_ev_one_pedal_drive_memory',
        nameKey: 'features.items.mg_ev_one_pedal_drive_memory.name',
        descKey: 'features.items.mg_ev_one_pedal_drive_memory.desc',
        defaultName: 'One-Pedal Driving Mode Retention',
        defaultDesc: 'Remembers the last selected regenerative braking intensity (High/One-Pedal) across starts.',
        make: 'Chery',
        category: 'EV_BATTERY_CHARGING',
        targetEcuHeader: '7E0',
        didHex: '5050',
        byteIndex: 0,
        bitIndex: 6,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    }
];
