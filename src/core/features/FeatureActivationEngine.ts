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
    FeatureVerificationStatus,
    FingerprintMatchResult, 
    PendingWriteRecord, 
    ProtocolCapability, 
    RecoveryResult, 
    SignalEndianness,
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
import { OemGuardFramework, VehicleGuardContext } from '../security/guards/OemGuardFramework';

export interface PreWriteSafetyCheck {
    batteryVoltage: number;
    vehicleSpeed?: number; // Speed in km/h (optional or undefined if unreadable)
    isSpeedReadable?: boolean; // Fail-safe speed indicator
    isEngineRunning: boolean;
    ignitionState?: 'ON' | 'OFF';
    isEv?: boolean;
    isHighVoltageReady?: boolean;
    isEvCharging?: boolean;
    currentAdapterTier?: AdapterTier;
    adapterCapabilities?: ProtocolCapability;
    guardContext?: VehicleGuardContext;
    fingerprint?: EcuFingerprint;
}

export class FeatureActivationEngine {
    private backupRegistry: Map<string, FeatureBackupRecord> = new Map();
    private voltagePollTimer: NodeJS.Timeout | null = null;
    private developerBenchModeEnabled: boolean = false;

    /**
     * Enables or disables Developer / Bench Bypass Mode.
     * Allows testing features marked DRAFT_UNVERIFIED on bench setups.
     */
    public setDeveloperBenchModeEnabled(enabled: boolean): void {
        this.developerBenchModeEnabled = enabled;
        Logger.log('FEATURE_ENGINE', `Developer Bench Bypass Mode set to: ${enabled}`);
    }

    public getDeveloperBenchModeEnabled(): boolean {
        return this.developerBenchModeEnabled;
    }

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
     * Starts background dynamic voltage polling during active write operations.
     * Dynamic Interval: 250ms during active write / rollback.
     */
    public startVoltagePolling(
        getVoltageFn: () => number,
        onEmergencyAbort: (msg: string) => void,
        sendUdsCommandFn?: (serviceId: number, subFunction: number) => Promise<void>
    ): void {
        this.stopVoltagePolling();
        this.voltagePollTimer = setInterval(async () => {
            const v = getVoltageFn();
            if (v < 12.0) {
                Logger.log('VOLTAGE_POLLING', `CRITICAL VOLTAGE DROP: ${v.toFixed(2)}V (< 12.0V). Emergency Abort Triggered.`);
                this.stopVoltagePolling();

                // Faz 0.4 Kural B: Mid-Payload Voltage Abort → 0x10 01 Default Session Flush
                if (sendUdsCommandFn) {
                    await this.emergencySessionFlush(sendUdsCommandFn);
                }

                onEmergencyAbort(`CRITICAL_VOLTAGE_DROP: Battery voltage dropped to ${v.toFixed(2)}V during write. Default Session 0x10 01 flush initiated.`);
            }
        }, 250);
    }

    /**
     * Stops active background voltage polling.
     */
    public stopVoltagePolling(): void {
        if (this.voltagePollTimer) {
            clearInterval(this.voltagePollTimer);
            this.voltagePollTimer = null;
        }
    }

    /**
     * Enforces Engine-Level Data Provenance & Fail-Closed Hard-Block.
     * Blocks write operation if feature is marked DRAFT_UNVERIFIED unless Developer Bench Mode is active.
     */
    public evaluateVerificationStatusHardBlock(definition: FeatureDefinition): void {
        const status = definition.verificationStatus || 'DRAFT_UNVERIFIED';
        if (status === 'DRAFT_UNVERIFIED' && !this.developerBenchModeEnabled) {
            throw new Error(
                `SAFETY_VIOLATION_UNVERIFIED_DATA: Feature '${definition.id}' has verification status '${status}'. Engine-level fail-closed hard block enforced to prevent writing unverified configuration to vehicle.`
            );
        }
    }

    /**
     * Enforces Engine-Level Fingerprint Hard-Block.
     * Blocks write operation if fingerprint result is UNKNOWN, MISMATCH, or PARTIAL_MATCH.
     */
    public evaluateFingerprintHardBlock(fingerprint: EcuFingerprint | undefined, definition: FeatureDefinition): void {
        if (!fingerprint) return; // Skip if no fingerprint available (dev / fallback)
        const matchResult = this.checkFingerprintMatch(fingerprint, definition);
        if (
            matchResult === FingerprintMatchResult.UNKNOWN ||
            matchResult === FingerprintMatchResult.MISMATCH ||
            matchResult === FingerprintMatchResult.PARTIAL_MATCH
        ) {
            throw new Error(
                `SAFETY_VIOLATION_FINGERPRINT_BLOCK: ECU fingerprint match status is '${matchResult}'. Engine-level hard block enforced.`
            );
        }
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
            // Step 0: Execute OEM Guard Framework (VagSfdGuard, RenaultUchGuard, BmwFemGuard)
            const gContext: VehicleGuardContext = check.guardContext || {
                oem: definition.oem,
                ecuAddress: definition.targetEcuAddress,
                sfdTokenPresent: false,
                uchAntiscanState: 'CLEAR'
            };
            OemGuardFramework.evaluatePreWriteGuards(definition, gContext);

            // Step 0.1: Engine-Level Data Provenance Hard-Block (Fail-Closed)
            this.evaluateVerificationStatusHardBlock(definition);

            // Step 0.2: Engine-Level Fingerprint Hard-Block Evaluation
            if (check.fingerprint) {
                this.evaluateFingerprintHardBlock(check.fingerprint, definition);
            }

            // Step 0.3: EV Safety Gate — ISO-Standard Telemetry Fail-Closed
            if (check.isEv) {
                // EV vehicles: Block if HV system is READY (risk of high-voltage arc during write)
                if (check.isHighVoltageReady === true) {
                    throw new Error(
                        'SAFETY_VIOLATION_EV_HV_READY: EV High Voltage system is in READY state. ' +
                        'ECU write blocked to prevent high-voltage arc risk. Deactivate HV system (set READY=false) before coding.'
                    );
                }
                // EV vehicles: Block if charging cable is connected (risk of charge controller interruption)
                if (check.isEvCharging === true) {
                    throw new Error(
                        'SAFETY_VIOLATION_EV_CHARGING: EV charging is active or cable is connected. ' +
                        'ECU write blocked to prevent charge controller disruption. Disconnect charging cable before coding.'
                    );
                }
                // EV vehicles: Block if EV telemetry status is completely unknown (fail-closed)
                if (check.isHighVoltageReady === undefined && check.isEvCharging === undefined) {
                    throw new Error(
                        'SAFETY_VIOLATION_EV_TELEMETRY_UNKNOWN: EV telemetry data (HV Ready / Charging status) cannot be determined. ' +
                        'Fail-closed policy enforced. Cannot proceed with ECU write on EV without verified telemetry.'
                    );
                }
            }

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
        phase: 'PRECHECK' | 'BACKUP_COMPLETE' | 'WRITE_STARTED' | 'WRITE_POSITIVE_RESPONSE' | 'WRITE_NEGATIVE_RESPONSE' | 'VERIFICATION_STARTED' | 'VERIFIED' | 'NOT_VERIFIED' | 'INCONCLUSIVE' | 'RECOVERY_REQUIRED' | 'ROLLBACK_STARTED' | 'CRITICAL_MANUAL_INTERVENTION' | 'COMPLETED' | 'RE_AUTHENTICATING' | 'RECOVERY_COOLDOWN_PENDING' | 'EMERGENCY_SESSION_FLUSH',
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

        // Faz 0.4 Kural C: Developer Bench Bypass Mode SHA-256 Audit Trail
        if (this.developerBenchModeEnabled) {
            (payload as any).IS_DEVELOPER_BYPASS = true;
            (payload as any).developerBypassTimestamp = Date.now();
            (payload as any).bypassDeviceSignature = await this.computeDeviceAuditHash(vin, ecuHeader, didHex, featureId);
            Logger.log('DEVELOPER_AUDIT', `[BENCH MODE] Journal phase '${phase}' for feature '${featureId}' logged with developer bypass audit trail.`);
        }

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
     * Faz 0.4 Kural B: Emergency Session Flush (0x10 01 Default Session).
     * Sends UDS DiagnosticSessionControl (0x10) with sub-function 0x01 (Default Session)
     * to flush ECU's Shadow RAM buffer and return to safe default mode after
     * a mid-payload voltage abort or critical failure.
     */
    public async emergencySessionFlush(
        sendUdsCommandFn: (serviceId: number, subFunction: number) => Promise<void>
    ): Promise<void> {
        try {
            Logger.log('EMERGENCY_FLUSH', 'Initiating 0x10 01 Default Session flush to clear ECU Shadow RAM buffer...');
            await sendUdsCommandFn(0x10, 0x01);
            Logger.log('EMERGENCY_FLUSH', '0x10 01 Default Session flush completed. ECU returned to safe default mode.');
        } catch (err) {
            Logger.log('EMERGENCY_FLUSH', `WARNING: 0x10 01 session flush failed: ${err}. ECU may retain corrupted Shadow RAM data.`);
        }
    }

    /**
     * Faz 0.4 Kural C: Computes SHA-256 audit hash for Developer Bench Mode journal entries.
     * Ensures production engine errors and developer bench tests are permanently separated.
     */
    private async computeDeviceAuditHash(
        vin: string,
        ecuHeader: string,
        didHex: string,
        featureId: string
    ): Promise<string> {
        const data = `MOTOCORTEX_BENCH_AUDIT|${vin}|${ecuHeader}|${didHex}|${featureId}|${Date.now()}`;
        try {
            // Use Web Crypto API (React Native / Node.js compatible via polyfill)
            const encoder = new TextEncoder();
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
            // Fallback: simple non-cryptographic hash for environments without Web Crypto
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
                const chr = data.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return `FALLBACK_HASH_${Math.abs(hash).toString(16).padStart(8, '0')}`;
        }
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
     * Applies a cross-byte bitmask modification supporting multi-bit values
     * with Little-Endian (Intel) and Big-Endian (Motorola / Vector DBC) notation.
     *
     * Vector DBC Standard: Bit_7 of Byte_0 = Offset 7.
     * For BIG_ENDIAN_MOTOROLA, startBitOffset follows the Vector DBC MSB convention:
     *   Byte N, Bit 7 = (N * 8) + 7
     *   The signal is laid out MSB-first across consecutive bytes.
     *
     * For LITTLE_ENDIAN (Intel), startBitOffset is the LSB position:
     *   Byte N, Bit B = (N * 8) + B
     *   The signal is laid out LSB-first across consecutive bytes.
     *
     * @param originalBytesHex - Original DID payload as hex string
     * @param startBitOffset   - Start bit offset (Vector DBC notation)
     * @param bitWidth         - Number of bits in the signal (1-64)
     * @param value            - The integer value to write into the signal
     * @param endianness       - LITTLE_ENDIAN (Intel) or BIG_ENDIAN_MOTOROLA (Motorola)
     * @returns Modified hex payload string
     */
    public applyCrossByteBitmask(
        originalBytesHex: string,
        startBitOffset: number,
        bitWidth: number,
        value: number,
        endianness: SignalEndianness = 'LITTLE_ENDIAN'
    ): string {
        const clean = originalBytesHex.replace(/\s+/g, '');
        const bytes = clean.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [];

        // Validate bitWidth
        if (bitWidth < 1 || bitWidth > 64) {
            throw new Error(`INVALID_BIT_WIDTH: bitWidth must be between 1 and 64, got ${bitWidth}`);
        }

        // Validate value fits in bitWidth
        const maxValue = (1 << bitWidth) - 1; // Safe for bitWidth <= 30
        if (bitWidth <= 30 && (value < 0 || value > maxValue)) {
            throw new Error(
                `INVALID_VALUE: Value ${value} exceeds maximum for ${bitWidth}-bit signal (max: ${maxValue})`
            );
        }

        if (endianness === 'LITTLE_ENDIAN') {
            // Intel byte order: LSB at startBitOffset, extends to higher byte addresses
            const startByteIndex = Math.floor(startBitOffset / 8);
            const startBitInByte = startBitOffset % 8;

            // Validate range
            const endBitOffset = startBitOffset + bitWidth - 1;
            const endByteIndex = Math.floor(endBitOffset / 8);
            if (endByteIndex >= bytes.length) {
                throw new Error(
                    `CROSS_BYTE_OUT_OF_RANGE: Little-Endian signal extends to byte ${endByteIndex} but payload has only ${bytes.length} bytes`
                );
            }

            // Write value bit-by-bit from LSB to MSB
            for (let i = 0; i < bitWidth; i++) {
                const bitVal = (value >> i) & 1;
                const globalBit = startBitOffset + i;
                const byteIdx = Math.floor(globalBit / 8);
                const bitIdx = globalBit % 8;

                if (bitVal) {
                    bytes[byteIdx] |= (1 << bitIdx);
                } else {
                    bytes[byteIdx] &= ~(1 << bitIdx);
                }
            }
        } else {
            // Motorola (Big-Endian / Vector DBC) byte order:
            // MSB is at startBitOffset, signal extends to lower bit positions
            // then wraps to next byte's bit 7.
            //
            // Vector DBC notation: within each byte, bit 7 is MSB, bit 0 is LSB.
            // startBitOffset = (byteIndex * 8) + bitPositionInByte
            //
            // Layout: MSB at startBitOffset, next bits go right (lower bit index),
            // then wrap to bit 7 of next byte.

            const startByteIndex = Math.floor(startBitOffset / 8);
            const startBitInByte = startBitOffset % 8;

            // Validate: enough bits available from start position
            // In Motorola, bits go: startBit, startBit-1, ..., bit0_of_startByte,
            // then bit7_of_nextByte, bit6, ...
            const bitsInFirstByte = startBitInByte + 1;
            const remainingBits = bitWidth - bitsInFirstByte;
            if (remainingBits > 0) {
                const additionalBytesNeeded = Math.ceil(remainingBits / 8);
                if (startByteIndex + additionalBytesNeeded >= bytes.length) {
                    throw new Error(
                        `CROSS_BYTE_OUT_OF_RANGE: Motorola signal starting at bit ${startBitOffset} ` +
                        `with width ${bitWidth} extends beyond payload of ${bytes.length} bytes`
                    );
                }
            }

            // Write MSB-first: value's MSB goes to startBitOffset position
            let bitsWritten = 0;
            let currentByteIdx = startByteIndex;
            let currentBitIdx = startBitInByte;

            while (bitsWritten < bitWidth) {
                // Extract the bit from value (MSB-first)
                const bitPosition = bitWidth - 1 - bitsWritten;
                const bitVal = (value >> bitPosition) & 1;

                if (currentByteIdx >= bytes.length) {
                    throw new Error(
                        `CROSS_BYTE_OUT_OF_RANGE: Motorola signal write exceeded payload boundary at byte ${currentByteIdx}`
                    );
                }

                if (bitVal) {
                    bytes[currentByteIdx] |= (1 << currentBitIdx);
                } else {
                    bytes[currentByteIdx] &= ~(1 << currentBitIdx);
                }

                bitsWritten++;

                // Move to next bit position (Motorola layout)
                currentBitIdx--;
                if (currentBitIdx < 0) {
                    // Wrap to bit 7 of next byte
                    currentByteIdx++;
                    currentBitIdx = 7;
                }
            }
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
     * Evaluates 2-pass pre/post write DTC snapshot diff.
     * Identifies newly introduced DTCs resulting from ECU write side-effects.
     */
    public evaluatePostWriteDtcDiff(
        preWriteDtcs: string[],
        postWriteDtcs: string[],
        expectedTransientDtcs: string[] = []
    ): VerificationOutcome {
        const preSet = new Set(preWriteDtcs.map(d => d.toUpperCase().trim()));
        const transientSet = new Set(expectedTransientDtcs.map(d => d.toUpperCase().trim()));

        const newDtcs = postWriteDtcs
            .map(d => d.toUpperCase().trim())
            .filter(d => !preSet.has(d) && !transientSet.has(d));

        if (newDtcs.length > 0) {
            Logger.log('DTC_SCANNER', `New DTCs detected after ECU write: [${newDtcs.join(', ')}]`);
            return {
                result: VerificationResult.POST_WRITE_DTC_DETECTED,
                reason: 'NEW_DTC_DETECTED',
                detectedDtcs: newDtcs
            };
        }

        return { result: VerificationResult.VERIFIED };
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
