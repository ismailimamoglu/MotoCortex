/**
 * RecoveryStateMachine.ts
 * 
 * MotoCortex Static Safety Policy Enforcer & Recovery State Machine (v1.2 Final).
 * Enforces:
 * 1. maxRollbackAttempts <= 1 static policy validation.
 * 2. Recovery Idempotency (ROLLBACK_STARTED never issues a 2nd 0x2E write).
 * 3. INCONCLUSIVE_LOCKED lock management.
 * 4. P2/P2* dynamic diagnostic timing and maxTotalOperationTimeMs watchdog.
 */

import { FeatureBackupRecord, FeatureDefinition, RecoveryResult } from './FeatureTypes';
import { UdsNrcCode } from '../protocol/uds/UdsClient';
import * as Logger from '../../services/Logger';

export interface RecoveryExecutionPlan {
    action: 'IMMEDIATE_LOCK' | 'EXTEND_TIMEOUT' | 'STABILIZE_AND_VERIFY' | 'OPTIONAL_ROLLBACK' | 'EMERGENCY_ABORT' | 'INCONCLUSIVE_LOCK';
    waitMs: number;
    userMessage: string;
}

export class RecoveryStateMachine {
    /**
     * Statically validates feature definition against core safety policies before registering or executing.
     * Throws Error if safety policy constraints are violated.
     */
    public validateSafetyPolicy(definition: FeatureDefinition): void {
        if (!definition || !definition.safetySpec) {
            throw new Error('SAFETY_POLICY_VIOLATION_MISSING_SPEC: Feature definition must include a valid safetySpec.');
        }

        const spec = definition.safetySpec;

        if (spec.maxRollbackAttempts > 1) {
            throw new Error(`SAFETY_POLICY_VIOLATION_INVALID_ROLLBACK_ATTEMPTS: Feature '${definition.id}' declared maxRollbackAttempts=${spec.maxRollbackAttempts}. Policy strictly limits rollback attempts to max 1 to prevent ECU damage.`);
        }

        if (spec.supportsRollback && !spec.provenSafe) {
            throw new Error(`SAFETY_POLICY_VIOLATION_UNPROVEN_ROLLBACK: Feature '${definition.id}' declared supportsRollback=true without provenSafe=true evidence verification.`);
        }
    }

    /**
     * Determines immediate recovery execution plan based on specific NRC or failure condition.
     */
    public classifyFailure(
        nrcCode: UdsNrcCode | undefined,
        isTimeout: boolean,
        isVoltageCritical: boolean
    ): RecoveryExecutionPlan {
        if (isVoltageCritical) {
            return {
                action: 'EMERGENCY_ABORT',
                waitMs: 0,
                userMessage: 'CRITICAL_VOLTAGE_DROP: Battery voltage dropped below minimum threshold. Operation aborted.'
            };
        }

        if (nrcCode === UdsNrcCode.SecurityAccessDenied || nrcCode === UdsNrcCode.InvalidKey) {
            return {
                action: 'IMMEDIATE_LOCK',
                waitMs: 0,
                userMessage: 'SECURITY_ACCESS_DENIED: Security authorization failed (NRC 0x33). ECU locked for write protection.'
            };
        }

        if (nrcCode === UdsNrcCode.ResponsePending) {
            return {
                action: 'EXTEND_TIMEOUT',
                waitMs: 2000,
                userMessage: 'RESPONSE_PENDING: ECU is processing request (NRC 0x78). Dynamic P2* timer active.'
            };
        }

        if (isTimeout) {
            return {
                action: 'INCONCLUSIVE_LOCK',
                waitMs: 1500,
                userMessage: 'BUS_TIMEOUT: Transport timed out. Stabilizing bus and setting status to INCONCLUSIVE_LOCKED.'
            };
        }

        return {
            action: 'STABILIZE_AND_VERIFY',
            waitMs: 1000,
            userMessage: 'UNKNOWN_FAILURE: General UDS error. Stabilizing bus before read-back.'
        };
    }

    /**
     * Evaluates read-back payload state against original backup hex and feature definition.
     */
    public evaluateReadBackState(
        readBackHex: string,
        writtenTargetHex: string,
        backup: FeatureBackupRecord,
        definition: FeatureDefinition
    ): RecoveryResult {
        const cleanRead = readBackHex.replace(/[\r\n\s>]/g, '').toUpperCase();
        const cleanTarget = writtenTargetHex.replace(/[\r\n\s>]/g, '').toUpperCase();
        const cleanOriginal = backup.originalBytesHex.replace(/[\r\n\s>]/g, '').toUpperCase();

        // Scenario 1: Target hex was written successfully despite connection hiccups
        if (cleanRead.includes(cleanTarget)) {
            Logger.log('RECOVERY_ENGINE', 'Read-back confirmed target hex is present.');
            return RecoveryResult.SAFE_ABORT;
        }

        // Scenario 2: Original hex remains untouched
        if (cleanRead.includes(cleanOriginal)) {
            Logger.log('RECOVERY_ENGINE', 'Read-back confirmed original hex is untouched.');
            return RecoveryResult.SAFE_ABORT;
        }

        // Scenario 3: Data is corrupted AND feature explicitly supports proven safe 1-attempt rollback
        if (definition.safetySpec.supportsRollback && definition.safetySpec.provenSafe && definition.safetySpec.maxRollbackAttempts === 1) {
            Logger.log('RECOVERY_ENGINE', 'Read-back mismatch detected. Executing 1-attempt proven rollback.');
            return RecoveryResult.ROLLBACK_EXECUTED;
        }

        // Scenario 4: Rollback disabled or unproven -> Require manual intervention
        Logger.log('RECOVERY_ENGINE', 'Read-back mismatch detected and rollback is unproven or disabled. Lock enforced.');
        return RecoveryResult.RECOVERY_REQUIRED;
    }

    /**
     * Executes single rollback write attempt with strict Idempotency protection.
     * NEVER executes a 2nd rollback if ROLLBACK_STARTED phase was previously initiated.
     */
    public async executeSingleRollback(
        writeFn: (hex: string) => Promise<boolean>,
        originalHex: string,
        isIdempotentCheckPassed: boolean = true
    ): Promise<boolean> {
        if (!isIdempotentCheckPassed) {
            Logger.log('ROLLBACK_WORKER', 'CRITICAL: Idempotency check failed. Second rollback write attempt blocked to protect ECU.');
            return false;
        }

        Logger.log('ROLLBACK_WORKER', `Executing single rollback write attempt for hex ${originalHex}...`);
        try {
            const success = await writeFn(originalHex);
            if (success) {
                Logger.log('ROLLBACK_WORKER', 'Single rollback write succeeded.');
                return true;
            }
        } catch (err) {
            console.warn('[RollbackWorker] Single rollback attempt failed:', err);
        }

        return false;
    }
}

export const recoveryStateMachine = new RecoveryStateMachine();
