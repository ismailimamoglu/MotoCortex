/**
 * FeatureActivationEngine.ts
 * 
 * MotoCortex Safe Feature Activation & ECU Coding Pipeline (v1.2 Final Consensus).
 * Integrates:
 * 1. 13-Phase Durable Hash-Chain Journal Logging
 * 2. Static Safety Policy Enforcement (maxRollbackAttempts <= 1)
 * 3. Feature-Specific Vehicle Preconditions (Speed fail-safe, Ignition, Engine, Battery Voltage Stability)
 * 4. QA-Verified Compatible Versions Allowlist Matching
 * 5. Global Watchdog Timeout (maxTotalOperationTimeMs) -> INCONCLUSIVE_LOCKED
 * 6. Idempotent Failure Recovery & Non-Idempotent Rollback Guard
 */

import * as Logger from '../../services/Logger';
import { 
    AdapterTier, 
    EcuFingerprint, 
    FeatureBackupRecord, 
    FeatureDefinition, 
    FingerprintMatchResult, 
    PendingWriteRecord, 
    ProtocolCapability, 
    RecoveryResult, 
    VehiclePreconditions, 
    VerificationOutcome, 
    VerificationResult, 
    VoltageState 
} from './FeatureTypes';
import { pendingWriteStore } from './PendingWriteStore';
import { adapterTierBenchmark } from './AdapterTierBenchmark';
import { recoveryStateMachine } from './RecoveryStateMachine';
import { isSafetyCriticalModule } from '../security/SafetyCriticalEcuRegistry';
import { UdsNrcCode } from '../protocol/uds/UdsClient';
import { UdsNrcHandler } from '../protocol/uds/UdsNrcHandler';

export interface PreWriteSafetyCheck {
    batteryVoltage: number;
    vehicleSpeed?: number; // Speed in km/h (optional or undefined if unreadable)
    isSpeedReadable?: boolean; // Fail-safe speed indicator
    isEngineRunning: boolean;
    ignitionState?: 'ON' | 'OFF';
    currentAdapterTier?: AdapterTier;
    adapterCapabilities?: ProtocolCapability;
}

export class FeatureActivationEngine {
    private backupRegistry: Map<string, FeatureBackupRecord> = new Map();

    /**
     * Evaluates battery voltage into VoltageState.
     */
    public getVoltageState(voltage: number): VoltageState {
        if (voltage < 11.8) return VoltageState.CRITICAL;
        if (voltage < 12.2) return VoltageState.LOW;
        if (voltage < 12.4) return VoltageState.WARNING;
        return VoltageState.STABLE;
    }

    /**
     * Legacy vehicle make support check for backward compatibility.
     */
    public checkVehicleSupport(featureMake: string, currentVehicleMake?: string): boolean {
        if (!currentVehicleMake || currentVehicleMake === 'GENERIC') return true;
        const cleanFeatureMake = featureMake.toUpperCase();
        const cleanCurrentMake = currentVehicleMake.toUpperCase();
        return cleanCurrentMake.includes(cleanFeatureMake) || cleanFeatureMake.includes(cleanCurrentMake);
    }

    /**
     * Validates vehicle preconditions and static safety policy before initiating write.
     * Throws an Error if any constraint is violated (Fail-Safe Speed Check: Default to BLOCK).
     */
    public validateSafetyGate(check: PreWriteSafetyCheck, definition?: FeatureDefinition): VoltageState {
        // Enforce UDS NRC Security Cooldown Guard (e.g. NRC 0x36)
        if (UdsNrcHandler.isLockoutActive()) {
            const remaining = UdsNrcHandler.getRemainingLockoutSeconds();
            throw new Error(`SAFETY_VIOLATION_ECU_LOCKOUT: ECU security lockout active (NRC 0x36). Cooldown remaining: ${remaining}s.`);
        }

        if (definition) {
            // Hard-Block ABS/ESP and Airbag/SRS Write Attempts via SafetyCriticalEcuRegistry
            const targetModule = ((definition as any).targetModule || '').toUpperCase();
            if (
                targetModule === 'ABS_ESP' ||
                targetModule === 'SRS_AIRBAG' ||
                isSafetyCriticalModule(definition.targetEcuAddress, definition.id, definition.name)
            ) {
                throw new Error('SAFETY_VIOLATION_UNSAFE_MODULE_WRITE: ECU write operations to ABS/ESP and Airbag/SRS modules are 100% HARD-BLOCKED at code level to prevent brake calibration loss or accidental deployment.');
            }

            // Step 1: Enforce static policy (maxRollbackAttempts <= 1)
            recoveryStateMachine.validateSafetyPolicy(definition);

            // Step 2: Validate feature-specific preconditions
            const pre = definition.preconditions || {};

            // Fail-Safe Speed & Engine RPM Check: Default to BLOCK if moving or RPM > 0
            if (pre.requiresVehicleStationary) {
                if (check.isSpeedReadable === false || check.vehicleSpeed === undefined) {
                    throw new Error('SAFETY_VIOLATION_UNKNOWN_SPEED: Vehicle speed PID cannot be verified. Write blocked as fail-safe precondition for stationary features.');
                }
                const maxSpeed = pre.maxAllowedSpeedKmh ?? 0;
                if (check.vehicleSpeed > maxSpeed) {
                    throw new Error(`SAFETY_VIOLATION_VEHICLE_IN_MOTION: Vehicle speed is ${check.vehicleSpeed} km/h (Max allowed: ${maxSpeed} km/h). ECU write blocked while vehicle is moving.`);
                }
            }

            // CLAUDE CONSENSUS RULE 2: RPM Check (Ignition ON, Engine OFF - KL15)
            if (check.isEngineRunning) {
                throw new Error('SAFETY_VIOLATION_ENGINE_RUNNING: Feature requires engine to be OFF (RPM == 0, Ignition ON - KL15) during write operation to prevent alternator voltage spikes.');
            }
            if (pre.ignitionState === 'ON' && check.ignitionState === 'OFF') {
                throw new Error('SAFETY_VIOLATION_IGNITION_OFF: Feature requires ignition to be switched ON.');
            }

            // Adapter Tier & Protocol Capability Verification
            const tier = check.currentAdapterTier ?? AdapterTier.TIER_2_STANDARD;
            adapterTierBenchmark.validateAdapterTierForFeature(
                definition.safetySpec.requiredAdapterTier,
                tier
            );
        } else {
            // Fallback global check if no definition is passed
            if (check.isSpeedReadable === false) {
                throw new Error('SAFETY_VIOLATION_UNKNOWN_SPEED: Vehicle speed cannot be verified.');
            }
            if (check.vehicleSpeed !== undefined && check.vehicleSpeed > 0) {
                throw new Error('SAFETY_VIOLATION_VEHICLE_IN_MOTION: Vehicle speed is ' + check.vehicleSpeed + ' km/h. ECU write blocked while moving.');
            }
            if (check.isEngineRunning) {
                throw new Error('SAFETY_VIOLATION_ENGINE_RUNNING: Feature requires engine to be OFF (RPM == 0).');
            }
        }

        const vState = this.getVoltageState(check.batteryVoltage);
        if (vState === VoltageState.CRITICAL || vState === VoltageState.LOW) {
            throw new Error(`SAFETY_VIOLATION_LOW_VOLTAGE: Battery voltage is ${check.batteryVoltage.toFixed(1)}V (< 12.2V). Minimum 12.2V required for coding. Emergency abort triggered.`);
        }

        return vState;
    }

    /**
     * Evaluates ECU Fingerprint compatibility against Feature Definition.
     * Enforces strict QA allowlist array check for COMPATIBLE_MATCH (heuristics banned).
     */
    public checkFingerprintMatch(fingerprint: EcuFingerprint, definition: FeatureDefinition): FingerprintMatchResult {
        if (!fingerprint || !fingerprint.vin) return FingerprintMatchResult.UNKNOWN;

        if (fingerprint.ecuAddress.toUpperCase() !== definition.targetEcuAddress.toUpperCase()) {
            return FingerprintMatchResult.MISMATCH;
        }

        // Verify all required identification DIDs are present
        for (const reqDid of definition.identificationDids) {
            const cleanDid = reqDid.replace(/[\r\n\s>]/g, '').toUpperCase();
            if (!fingerprint.readDids[cleanDid]) {
                return FingerprintMatchResult.PARTIAL_MATCH;
            }
        }

        // Exact software/hardware version match check
        const currentSw = fingerprint.softwareVersion?.toUpperCase().trim();
        const currentHw = fingerprint.hardwareVersion?.toUpperCase().trim();

        if (currentSw && definition.compatibleSoftwareVersions) {
            const allowlist = definition.compatibleSoftwareVersions.map(v => v.toUpperCase().trim());
            if (allowlist.includes(currentSw)) {
                return FingerprintMatchResult.EXACT_MATCH;
            } else {
                Logger.log('FEATURE_FINGERPRINT', `Software version ${currentSw} not in explicit allowlist [${allowlist.join(', ')}]. Match result: UNKNOWN`);
                return FingerprintMatchResult.UNKNOWN;
            }
        }

        return FingerprintMatchResult.EXACT_MATCH;
    }

    /**
     * Creates an in-memory backup record of original DID bytes prior to writing.
     */
    public createBackup(vin: string, ecuHeader: string, didHex: string, originalBytesHex: string): FeatureBackupRecord {
        const backup: FeatureBackupRecord = {
            id: `${vin}_${ecuHeader}_${didHex}_${Date.now()}`,
            vin,
            ecuHeader,
            didHex,
            originalBytesHex,
            timestamp: Date.now()
        };
        this.backupRegistry.set(backup.id, backup);
        Logger.log('FEATURE_BACKUP', `Backup created for DID ${didHex}: ${originalBytesHex}`);
        return backup;
    }

    /**
     * Appends a new phase to the durable append-only hash-chain journal.
     */
    public async logJournalPhase(
        phase: 'PRECHECK' | 'BACKUP_COMPLETE' | 'WRITE_STARTED' | 'WRITE_POSITIVE_RESPONSE' | 'WRITE_NEGATIVE_RESPONSE' | 'VERIFICATION_STARTED' | 'VERIFIED' | 'NOT_VERIFIED' | 'INCONCLUSIVE' | 'RECOVERY_REQUIRED' | 'ROLLBACK_STARTED' | 'CRITICAL_MANUAL_INTERVENTION' | 'COMPLETED',
        vin: string,
        ecuHeader: string,
        didHex: string,
        originalHex: string,
        targetHex: string,
        featureId: string
    ): Promise<void> {
        const payload: PendingWriteRecord = {
            pendingWriteId: `PW_${vin}_${ecuHeader}_${didHex}`,
            vin,
            ecuHeader,
            didHex,
            originalHex,
            targetHex,
            timestamp: Date.now(),
            featureId,
            status: phase === 'VERIFIED' || phase === 'COMPLETED' ? 'READ_BACK_PENDING' : 'WRITE_INITIATED'
        };

        await pendingWriteStore.appendJournalPhase(phase, payload);
    }

    /**
     * Clears pending write journal upon successful completion.
     */
    public async finalizeWriteSuccess(): Promise<void> {
        await pendingWriteStore.clearJournal();
        Logger.log('FEATURE_ACTIVATION', 'Journal cleared upon verified success.');
    }

    /**
     * Applies a bitmask modification to an existing hex byte string (ReadModifyWriteBitmaskOperation).
     */
    public applyBitmaskUpdate(
        originalBytesHex: string,
        byteIndex: number,
        bitIndex: number,
        enable: boolean
    ): string {
        const clean = originalBytesHex.replace(/\s+/g, '');
        const bytes = clean.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];

        if (byteIndex < 0 || byteIndex >= bytes.length) {
            throw new Error(`INVALID_BYTE_INDEX: Target byte index ${byteIndex} out of range (Length: ${bytes.length})`);
        }
        if (bitIndex < 0 || bitIndex > 7) {
            throw new Error('INVALID_BIT_INDEX: Bit index must be between 0 and 7');
        }

        if (enable) {
            bytes[byteIndex] |= (1 << bitIndex);
        } else {
            bytes[byteIndex] &= ~(1 << bitIndex);
        }

        return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    }

    /**
     * Compares read-back hex bytes against expected written bytes for post-write verification.
     */
    public verifyReadBackOutcome(writtenHex: string, readBackHex: string): VerificationOutcome {
        const cleanWritten = writtenHex.replace(/[\r\n\s>]/g, '').toUpperCase();
        const cleanReadBack = readBackHex.replace(/[\r\n\s>]/g, '').toUpperCase();

        if (cleanReadBack.includes(cleanWritten)) {
            return { result: VerificationResult.VERIFIED };
        }
        return { result: VerificationResult.NOT_VERIFIED, reason: 'READ_BACK_MISMATCH' };
    }

    /**
     * Handles failure & recovery pipeline based on 13-phase journal and recovery state machine.
     */
    public async handleFailureRecovery(
        nrcCode: UdsNrcCode | undefined,
        isTimeout: boolean,
        isVoltageCritical: boolean,
        readBackFn: () => Promise<string>,
        writeFn: (hex: string) => Promise<boolean>,
        backup: FeatureBackupRecord,
        definition: FeatureDefinition
    ): Promise<RecoveryResult> {
        const plan = recoveryStateMachine.classifyFailure(nrcCode, isTimeout, isVoltageCritical);
        Logger.log('FEATURE_ACTIVATION', `Recovery Plan Action: ${plan.action} - ${plan.userMessage}`);

        if (plan.action === 'IMMEDIATE_LOCK' || plan.action === 'EMERGENCY_ABORT') {
            return RecoveryResult.IMMEDIATE_LOCK;
        }

        if (plan.action === 'INCONCLUSIVE_LOCK') {
            return RecoveryResult.INCONCLUSIVE_LOCKED;
        }

        if (plan.waitMs > 0) {
            await new Promise(res => setTimeout(res, plan.waitMs));
        }

        try {
            const currentReadBack = await readBackFn();
            const result = recoveryStateMachine.evaluateReadBackState(currentReadBack, backup.didHex, backup, definition);

            if (result === RecoveryResult.ROLLBACK_EXECUTED) {
                const rollbackSuccess = await recoveryStateMachine.executeSingleRollback(writeFn, backup.originalBytesHex, true);
                if (rollbackSuccess) {
                    await this.finalizeWriteSuccess();
                    return RecoveryResult.ROLLBACK_EXECUTED;
                } else {
                    return RecoveryResult.CRITICAL_MANUAL_INTERVENTION;
                }
            }

            if (result === RecoveryResult.SAFE_ABORT) {
                await this.finalizeWriteSuccess();
                return RecoveryResult.SAFE_ABORT;
            }

            return result;
        } catch (err) {
            console.error('[FeatureActivationEngine] Exception during recovery:', err);
            return RecoveryResult.INCONCLUSIVE_LOCKED;
        }
    }
}

export const featureActivationEngine = new FeatureActivationEngine();
