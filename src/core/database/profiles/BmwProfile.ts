import { OEMFeatureDefinition } from '../types';

export const BMW_OEM_FEATURES: OEMFeatureDefinition[] = [
    {
        id: 'bmw_oil_service_reset',
        nameKey: 'features.items.bmw_oil_service_reset.name',
        descKey: 'features.items.bmw_oil_service_reset.desc',
        defaultName: 'CBS Engine Oil Reset (BMW)',
        defaultDesc: 'Resets Condition Based Service (CBS) oil life percentage back to 100%.',
        make: 'BMW',
        category: 'SERVICE_MAINTENANCE',
        targetEcuHeader: '60',
        didHex: '1000',
        byteIndex: 0,
        bitIndex: 0,
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    },
    {
        id: 'bmw_comfort_turn_signal_cycles',
        nameKey: 'features.items.bmw_comfort_turn_signal_cycles.name',
        descKey: 'features.items.bmw_comfort_turn_signal_cycles.desc',
        defaultName: 'One-Touch Comfort Turn Signal Pulse Count',
        defaultDesc: 'Select how many blinks occur on quick tap of turn indicator lever.',
        make: 'BMW',
        category: 'LIGHTING',
        targetEcuHeader: '60',
        didHex: '3040',
        byteIndex: 0,
        bitIndex: 0,
        bitWidth: 8,
        options: [
            { labelKey: 'features.options.blink1', defaultLabel: '1 Pulse', valueHex: '01' },
            { labelKey: 'features.options.blink3', defaultLabel: '3 Pulses (Standard)', valueHex: '03' },
            { labelKey: 'features.options.blink5', defaultLabel: '5 Pulses (Extended)', valueHex: '05' }
        ],
        requiresSecurityAccess: false,
        requiresExtendedSession: true,
        safetyLevel: 'LEVEL_2_ADAPTATION',
        riskLevel: 'LOW'
    }
];
