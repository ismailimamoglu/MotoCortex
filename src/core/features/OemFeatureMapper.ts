/**
 * OemFeatureMapper.ts
 * 
 * Maps catalog OEMFeatureDefinition to full FeatureDefinition required by FeatureActivationEngine.
 * Enforces safety preconditions (stationary, engine OFF, 12.2V min voltage) and labels
 * safety-critical modules (ABS/Airbag) via SafetyCriticalEcuRegistry.
 */

import { OEMFeatureDefinition, FeatureCategory } from '../database/OemDatabaseProvider';
import { FeatureDefinition, AdapterTier, VoltageState } from './FeatureTypes';
import { classifySafetyModule } from '../security/SafetyCriticalEcuRegistry';

/**
 * Maps catalog category to engine FeatureDefinition category.
 */
function mapCategory(cat: FeatureCategory): FeatureDefinition['category'] {
    switch (cat) {
        case 'LIGHTING':
            return 'LIGHTING';
        case 'DISPLAY_INSTRUMENT':
            return 'INSTRUMENT';
        case 'SOUND_ALERTS':
        case 'DRIVING_COMFORT':
            return 'COMFORT';
        case 'SECURITY_SAFETY':
            return 'SAFETY';
        case 'MOTORCYCLE_ECU':
            return 'MOTORCYCLE';
        case 'RETROFIT_INTEGRATION':
            return 'RETROFIT';
        case 'EASTER_EGG_FUN':
            return 'ENTERTAINMENT';
        case 'EV_BATTERY_CHARGING':
            return 'EV';
        case 'ADAS_CALIBRATION':
            return 'ADAS';
        default:
            return 'COMFORT';
    }
}

/**
 * Maps catalog brand string to FeatureDefinition.oem union value.
 */
function mapOemBrand(make: string): FeatureDefinition['oem'] {
    const clean = (make || '').toUpperCase().trim();
    if (clean.includes('VOLKSWAGEN') || clean.includes('VW')) return 'VOLKSWAGEN';
    if (clean.includes('AUDI')) return 'AUDI';
    if (clean.includes('SEAT') || clean.includes('CUPRA')) return 'SEAT';
    if (clean.includes('SKODA')) return 'SKODA';
    if (clean.includes('MOTORRAD')) return 'MOTORRAD';
    if (clean.includes('BMW') || clean.includes('MINI')) return 'BMW';
    if (clean.includes('DUCATI')) return 'DUCATI';
    if (clean.includes('KTM') || clean.includes('HUSQVARNA')) return 'KTM';
    if (clean.includes('YAMAHA')) return 'YAMAHA';
    if (clean.includes('HONDA')) return 'HONDA';
    if (clean.includes('HARLEY') || clean.includes('INDIAN')) return 'HARLEY';
    if (clean.includes('MERCEDES')) return 'MERCEDES';
    if (clean.includes('FORD')) return 'FORD';
    if (clean.includes('TOYOTA') || clean.includes('LEXUS')) return 'TOYOTA';
    if (clean.includes('RENAULT')) return 'RENAULT';
    if (clean.includes('DACIA')) return 'DACIA';
    if (clean.includes('HYUNDAI')) return 'HYUNDAI';
    if (clean.includes('KIA')) return 'KIA';
    if (clean.includes('FIAT') || clean.includes('STELLANTIS')) return 'FIAT';
    if (clean.includes('BYD')) return 'BYD';
    if (clean.includes('MG')) return 'MG';
    if (clean.includes('XPENG')) return 'XPENG';
    if (clean.includes('NIO')) return 'NIO';
    if (clean.includes('XIAOMI')) return 'XIAOMI';
    if (clean.includes('CHERY') || clean.includes('GEELY')) return 'CHERY';
    if (clean.includes('VOLVO') || clean.includes('POLESTAR')) return 'VOLVO';
    if (clean.includes('TESLA')) return 'TESLA';
    if (clean.includes('DODGE') || clean.includes('RAM') || clean.includes('CHRYSLER') || clean.includes('JEEP')) return 'DODGE';
    if (clean.includes('CHEVROLET') || clean.includes('GM') || clean.includes('CADILLAC')) return 'CHEVROLET';
    return 'GENERIC';
}

/**
 * Maps OEMFeatureDefinition from database into complete FeatureDefinition for safety engine validation.
 */
export function mapOemToFeatureDefinition(oem: OEMFeatureDefinition): FeatureDefinition {
    const safetyClass = classifySafetyModule(oem.targetEcuHeader, oem.id, oem.defaultName);
    
    const definition: FeatureDefinition = {
        id: oem.id,
        name: oem.defaultName,
        description: oem.defaultDesc,
        category: mapCategory(oem.category),
        oem: mapOemBrand(oem.make),
        platform: 'GENERIC',
        targetEcuAddress: oem.targetEcuHeader,
        identificationDids: [],
        compatibleSoftwareVersions: oem.compatibleSoftwareVersions,
        verificationStatus: oem.verificationStatus || 'DRAFT_UNVERIFIED',
        operationType: 'READ_MODIFY_WRITE',
        payloadSpec: {
            readDid: oem.didHex,
            writeDid: oem.didHex,
            byteIndex: oem.byteIndex,
            bitIndex: oem.bitIndex,
            bitWidth: oem.bitWidth || 1,
            endianness: oem.endianness || 'LITTLE_ENDIAN',
            readBackTiming: oem.readBackTiming || 'IMMEDIATE_PRE_RESET',
            postResetSecurityDelayMs: oem.postResetSecurityDelayMs,
            postWriteAction: oem.postWriteAction || 'NONE',
        },
        safetySpec: {
            supportsBackup: true,
            supportsRollback: true,
            maxRollbackAttempts: 1,
            provenSafe: true,
            requireSfdUnlock: !!oem.sfdProtected || (oem.requiresSecurityAccess && (oem.securityLevel ?? 0) > 0),
            minVoltageState: VoltageState.WARNING,
            requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
        },
        preconditions: {
            requiresVehicleStationary: true,
            maxAllowedSpeedKmh: 0,
            ignitionState: 'ON',
            engineState: 'OFF',
            minimumVoltage: 12.2,
        },
        maxTotalOperationTimeMs: 15000,
    };

    if (safetyClass !== 'NONE') {
        (definition as any).targetModule = safetyClass;
    }

    return definition;
}
