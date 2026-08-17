/**
 * HyundaiProfile.ts — Hyundai, Kia & Genesis OEM Feature Profile
 * Supports Ioniq 5/6, Tucson, Kona, Elantra, EV6, Sportage, Sorento, Genesis GV60/70/80.
 */

import { OEMFeatureDefinition } from '../types';

export const HYUNDAI_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'hyundai_ev_charge_limit_ui_unlock',
        nameKey: 'features.items.hyundai_ev_charge_limit_ui_unlock.name',
        descKey: 'features.items.hyundai_ev_charge_limit_ui_unlock.desc',
        defaultName: 'Manual EV AC/DC Charge Limit Setting UI',
        defaultDesc: 'Unlocks 50% to 100% target SoC slider controls in infotainment for battery longevity.',
        make: 'Hyundai',
        category: 'EV_BATTERY_CHARGING',
        targetEcuHeader: '7E4',
        didHex: '4010',
        byteIndex: 0,
        bitIndex: 2,
        requiresSecurityAccess: true,
        securityLevel: 1,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'hyundai_isg_start_stop_memory',
        nameKey: 'features.items.hyundai_isg_start_stop_memory.name',
        descKey: 'features.items.hyundai_isg_start_stop_memory.desc',
        defaultName: 'ISG (Idle Stop & Go) Last State Memory',
        defaultDesc: 'Retains the last selected state of the Start-Stop button across vehicle restarts.',
        make: 'Hyundai',
        category: 'DRIVING_COMFORT',
        targetEcuHeader: '7E0',
        didHex: '4020',
        byteIndex: 1,
        bitIndex: 4,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'hyundai_approach_auto_unlock_distance',
        nameKey: 'features.items.hyundai_approach_auto_unlock_distance.name',
        descKey: 'features.items.hyundai_approach_auto_unlock_distance.desc',
        defaultName: 'Smart Key Approach Auto-Unlock Sensitivity',
        defaultDesc: 'Adjusts proximity radar detection sensitivity for automatic welcome door unlocking.',
        make: 'Kia',
        category: 'SECURITY_SAFETY',
        targetEcuHeader: '7E0',
        didHex: '4030',
        byteIndex: 2,
        bitIndex: 1,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'hyundai_lead_vehicle_departure_alert',
        nameKey: 'features.items.hyundai_lead_vehicle_departure_alert.name',
        descKey: 'features.items.hyundai_lead_vehicle_departure_alert.desc',
        defaultName: 'Lead Vehicle Departure Notification Sensitivity',
        defaultDesc: 'Enhances front camera sensitivity when alerting that the front vehicle has started moving in traffic.',
        make: 'Hyundai',
        category: 'ADAS_CALIBRATION',
        targetEcuHeader: '7E2',
        didHex: '4040',
        byteIndex: 0,
        bitIndex: 5,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'hyundai_welcome_escort_lighting_timer',
        nameKey: 'features.items.hyundai_welcome_escort_lighting_timer.name',
        descKey: 'features.items.hyundai_welcome_escort_lighting_timer.desc',
        defaultName: 'Headlamp Escort / Follow-Me-Home Delay Timer',
        defaultDesc: 'Extends headlamp illumination duration from 15s to 30s or 60s after locking vehicle.',
        make: 'Genesis',
        category: 'LIGHTING',
        targetEcuHeader: '7A0',
        didHex: '4050',
        byteIndex: 3,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    }
];
