/**
 * FeatureTypes.ts
 * 
 * MotoCortex Safe Feature Activation & ECU Coding Type Definitions (v1.2 Final Consensus).
 * Includes 13-Phase Durable Hash-Chain Journal, Protocol Capabilities, Vehicle Preconditions,
 * Fingerprint Matching, Verification Outcomes, and Safety Policy Validation.
 */

export enum AdapterTier {
    TIER_1_PRO = 'TIER_1_PRO',           // STN2120, vLinker MC+, UniCarScan, OBDLink MX+ (Full write & UDS 0x27 allowed)
    TIER_2_STANDARD = 'TIER_2_STANDARD', // PIC18F25K80 ELM327 v1.5 (Feature-specific whitelist only)
    TIER_3_UNSAFE = 'TIER_3_UNSAFE',     // Fake ELM327 v2.1 (BK3231/APM32) - WRITE 100% BLOCKED
}

export enum VoltageState {
    CRITICAL = 'CRITICAL', // < 11.8V -> EMERGENCY ABORT
    LOW = 'LOW',           // 11.8V - 12.0V -> HIGH RISK / WARNING
    WARNING = 'WARNING',   // 12.0V - 12.4V -> MINIMAL REQUIREMENT MET WITH WARNING
    STABLE = 'STABLE',     // >= 12.4V -> IDEAL FOR ECU CODING
}

export enum SecurityGatewayStatus {
    UNPROTECTED = 'UNPROTECTED',
    SGW_LOCKED = 'SGW_LOCKED',       // FCA / Mercedes Security Gateway active
    SFD_LOCKED = 'SFD_LOCKED',       // VW MQB-evo Schutz Fahrzeug Diagnose active
    REQUIRE_AUTHENTICATION = 'REQUIRE_AUTHENTICATION',
}

export enum FingerprintMatchResult {
    EXACT_MATCH = 'EXACT_MATCH',
    COMPATIBLE_MATCH = 'COMPATIBLE_MATCH', // Only allowed if explicit compatibleVersions array matches
    PARTIAL_MATCH = 'PARTIAL_MATCH',       // WRITE 100% BLOCKED
    MISMATCH = 'MISMATCH',                 // WRITE 100% BLOCKED
    UNKNOWN = 'UNKNOWN',                   // WRITE 100% BLOCKED
}

export enum VerificationResult {
    VERIFIED = 'VERIFIED',
    NOT_VERIFIED = 'NOT_VERIFIED',
    INCONCLUSIVE = 'INCONCLUSIVE', // Connection loss / timeout -> INCONCLUSIVE_LOCKED state
}

export interface VerificationOutcome {
    result: VerificationResult;
    reason?: 'READ_BACK_MISMATCH' | 'TRANSPORT_LOST' | 'TIMEOUT' | 'ECU_UNAVAILABLE' | 'UNKNOWN';
}

export interface ProtocolCapability {
    can11Bit: boolean;
    can29Bit: boolean;
    canFd: boolean;
    isoTp: boolean;
    multiFrameIsoTp: boolean;
    iso9141: boolean;
    kwp2000: boolean;
    slowInit5Baud?: boolean;
    fastInit?: boolean;
}

export interface VehiclePreconditions {
    requiresVehicleStationary?: boolean;
    maxAllowedSpeedKmh?: number;
    ignitionState?: 'ON' | 'OFF' | 'ANY';
    engineState?: 'RUNNING' | 'OFF' | 'ANY';
    minimumVoltage?: number;
    voltageStableForMs?: number;
}

export interface EcuFingerprint {
    vin: string;
    ecuAddress: string;          // e.g. "0x09" (BCM), "0x17" (Dashboard)
    ecuName: string;             // e.g. "Body Control Module"
    hardwareNumber?: string;     // Read from UDS DID (e.g. F191)
    hardwareVersion?: string;    // Read from UDS DID
    softwareNumber?: string;     // Read from UDS DID (e.g. F1A2)
    softwareVersion?: string;    // Read from UDS DID (e.g. F1A3)
    supplier?: string;
    partNumber?: string;
    serialNumber?: string;
    readDids: Record<string, string>; // Map of DID hex -> value hex read during fingerprinting
    fingerprintHash: string;     // SHA-256 / Hash representation for exact match
}

export interface FeatureBackupRecord {
    id: string;
    vin: string;
    ecuHeader: string;
    didHex: string;
    originalBytesHex: string;
    timestamp: number;
}

export type OperationType = 'READ_MODIFY_WRITE' | 'ROUTINE_CONTROL' | 'DIRECT_WRITE' | 'CUSTOM_CAN';

export interface FeaturePayloadSpec {
    readDid: string;             // e.g. "0201"
    writeDid: string;            // e.g. "0201"
    byteIndex: number;           // Target byte in DID payload
    bitIndex: number;            // Target bit (0-7)
    enableValueHex?: string;     // Optional direct hex value override if not bitwise
    disableValueHex?: string;
}

export interface FeatureSafetySpec {
    supportsBackup: boolean;
    supportsRollback: boolean;   // Opt-in rollback flag
    maxRollbackAttempts: number; // MUST BE <= 1 (Enforced statically)
    provenSafe: boolean;         // Safety policy evidence flag
    requireSfdUnlock: boolean;
    minVoltageState: VoltageState;
    requiredAdapterTier: AdapterTier;
}

export interface FeatureDefinition {
    id: string;                  // e.g. "vag_mqb_needle_sweep"
    name: string;                // Human readable name
    description: string;
    category: 'COMFORT' | 'LIGHTING' | 'INSTRUMENT' | 'SAFETY' | 'PERFORMANCE' | 'SERVICE';
    oem: 'VOLKSWAGEN' | 'AUDI' | 'SEAT' | 'SKODA' | 'BMW' | 'MERCEDES' | 'FORD' | 'TOYOTA' | 'RENAULT' | 'DACIA' | 'HYUNDAI' | 'KIA' | 'FIAT' | 'BYD' | 'CHERY' | 'VOLVO' | 'TESLA' | 'DODGE' | 'CHEVROLET' | 'GENERIC';
    platform: string;            // e.g. "MQB", "F30", "G20", "C2"
    targetEcuAddress: string;    // e.g. "0x17"
    identificationDids: string[];// DIDs required for fingerprint verification
    compatibleSoftwareVersions?: string[]; // QA-verified allowlist for COMPATIBLE_MATCH
    operationType: OperationType;
    payloadSpec: FeaturePayloadSpec;
    safetySpec: FeatureSafetySpec;
    preconditions?: VehiclePreconditions;
    maxTotalOperationTimeMs?: number; // Global watchdog timeout
    expectedTransientDtcs?: string[];
}

export type PendingWriteJournalPhase =
    | 'PRECHECK'
    | 'BACKUP_COMPLETE'
    | 'WRITE_STARTED'
    | 'WRITE_POSITIVE_RESPONSE'
    | 'WRITE_NEGATIVE_RESPONSE'
    | 'VERIFICATION_STARTED'
    | 'VERIFIED'
    | 'NOT_VERIFIED'
    | 'INCONCLUSIVE'
    | 'RECOVERY_REQUIRED'
    | 'ROLLBACK_STARTED'
    | 'CRITICAL_MANUAL_INTERVENTION'
    | 'COMPLETED';

export interface PendingWriteRecord {
    pendingWriteId: string;
    vin: string;
    ecuHeader: string;
    didHex: string;
    originalHex: string;
    targetHex: string;
    timestamp: number;
    featureId: string;
    status: 'WRITE_INITIATED' | 'READ_BACK_PENDING' | 'FAILED_UNVERIFIED';
}

export interface PendingWriteJournalRecord {
    operationId: string;
    sequenceNumber: number;
    phase: PendingWriteJournalPhase;
    previousRecordHash?: string;
    integrityHash: string;
    timestamp: number;
    payload: PendingWriteRecord;
}

export enum RecoveryResult {
    SAFE_ABORT = 'SAFE_ABORT',                     // Original data verified intact
    ROLLBACK_EXECUTED = 'ROLLBACK_EXECUTED',       // Rollback 0x2E executed once and verified
    IMMEDIATE_LOCK = 'IMMEDIATE_LOCK',             // SecurityAccess 0x33 or critical violation
    INCONCLUSIVE_LOCKED = 'INCONCLUSIVE_LOCKED',   // Transport loss -> Locked for write until read-only recovery
    RECOVERY_REQUIRED = 'RECOVERY_REQUIRED',       // Intervention required, state unverified
    CRITICAL_MANUAL_INTERVENTION = 'CRITICAL_MANUAL_INTERVENTION', // Rollback failed or journal integrity failure
}

export interface BenchmarkResult {
    tier: AdapterTier;
    latencyMs: number;
    bufferCapacityBytes: number;
    multiFrameSupported: boolean;
    frameDropRatePercent: number;
    testedAt: number;
    stage: 'QUICK_HEALTH_CHECK' | 'DEEP_PREFLIGHT';
}
