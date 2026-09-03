/**
 * types.ts — MotoCortex OEM Feature Database Types
 */

export type FeatureCategory = 
    | 'LIGHTING'
    | 'SOUND_ALERTS'
    | 'DISPLAY_INSTRUMENT'
    | 'DRIVING_COMFORT'
    | 'SECURITY_SAFETY'
    | 'MOTORCYCLE_ECU'
    | 'RETROFIT_INTEGRATION'
    | 'EASTER_EGG_FUN'
    | 'EV_BATTERY_CHARGING'
    | 'ADAS_CALIBRATION'
    | 'SERVICE_MAINTENANCE'
    | 'PERFORMANCE';

export type FeatureRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type OEMVerificationStatus = 'BENCH_VERIFIED' | 'OEM_DOCUMENTED' | 'COMMUNITY_TESTED' | 'DRAFT_UNVERIFIED';

export type OEMSignalEndianness = 'LITTLE_ENDIAN' | 'BIG_ENDIAN_MOTOROLA';

export type OEMReadBackTiming = 'IMMEDIATE_PRE_RESET' | 'POST_RESET_REQUIRED';

export interface OEMFeatureOption {
    labelKey: string;
    defaultLabel: string;
    valueHex: string;
}

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
    bitWidth?: number;
    options?: OEMFeatureOption[];
    endianness?: OEMSignalEndianness;
    requiresSecurityAccess: boolean;
    securityLevel?: number;
    requiresExtendedSession: boolean;
    safetyLevel: 'LEVEL_0_READ_ONLY' | 'LEVEL_1_CLEAR_DTC' | 'LEVEL_1_CODING' | 'LEVEL_2_ADAPTATION';
    riskLevel: FeatureRiskLevel;
    sfdProtected?: boolean;
    streetLegalNoteKey?: string;
    compatibleSoftwareVersions?: string[];
    verificationStatus?: OEMVerificationStatus;
    readBackTiming?: OEMReadBackTiming;
    postResetSecurityDelayMs?: number;
    postWriteAction?: 'NONE' | 'CRC_RECALCULATE' | 'ROUTINE_COMMIT' | 'ECU_RESET' | 'VERIFY_ONLY' | 'SIGNATURE_VERIFY';
}
