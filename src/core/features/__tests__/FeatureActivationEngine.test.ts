import { recoveryStateMachine, RecoveryStateMachine } from '../RecoveryStateMachine';
import { pendingWriteStore } from '../PendingWriteStore';
import { featureActivationEngine } from '../FeatureActivationEngine';
import { 
    AdapterTier, 
    FeatureDefinition, 
    PendingWriteRecord, 
    PendingWriteJournalPhase, 
    VoltageState 
} from '../FeatureTypes';

describe('MotoCortex ECU Coding & UDS Safety Engine v1.2 Consensus Tests', () => {

    describe('1. Static Safety Policy Validation (maxRollbackAttempts <= 1 & Proven Safety)', () => {
        it('should REJECT feature definitions declaring maxRollbackAttempts > 1', () => {
            const unsafeFeature: FeatureDefinition = {
                id: 'UNSAFE_ROLLBACK_TEST',
                name: 'Unsafe Test',
                description: 'Testing > 1 rollback attempts',
                category: 'LIGHTING',
                oem: 'VOLKSWAGEN',
                platform: 'MQB',
                targetEcuAddress: '0x09',
                identificationDids: ['F191'],
                operationType: 'READ_MODIFY_WRITE',
                payloadSpec: { readDid: '0901', writeDid: '0901', byteIndex: 0, bitIndex: 1 },
                safetySpec: {
                    supportsBackup: true,
                    supportsRollback: true,
                    maxRollbackAttempts: 2, // VIOLATION: > 1
                    provenSafe: true,
                    requireSfdUnlock: false,
                    minVoltageState: VoltageState.WARNING,
                    requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
                },
            };

            expect(() => recoveryStateMachine.validateSafetyPolicy(unsafeFeature)).toThrow(
                /SAFETY_POLICY_VIOLATION_INVALID_ROLLBACK_ATTEMPTS/
            );
        });

        it('should REJECT feature declaring supportsRollback: true without provenSafe: true', () => {
            const unprovenFeature: FeatureDefinition = {
                id: 'UNPROVEN_ROLLBACK_TEST',
                name: 'Unproven Rollback Test',
                description: 'Testing unproven safety flag',
                category: 'LIGHTING',
                oem: 'BMW',
                platform: 'F30',
                targetEcuAddress: '0x40',
                identificationDids: ['F1A2'],
                operationType: 'READ_MODIFY_WRITE',
                payloadSpec: { readDid: '3000', writeDid: '3000', byteIndex: 0, bitIndex: 0 },
                safetySpec: {
                    supportsBackup: true,
                    supportsRollback: true,
                    maxRollbackAttempts: 1,
                    provenSafe: false, // VIOLATION: unproven safety
                    requireSfdUnlock: false,
                    minVoltageState: VoltageState.WARNING,
                    requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
                },
            };

            expect(() => recoveryStateMachine.validateSafetyPolicy(unprovenFeature)).toThrow(
                /SAFETY_POLICY_VIOLATION_UNPROVEN_ROLLBACK/
            );
        });

        it('should PASS feature definition complying strictly with v1.2 static safety policy', () => {
            const compliantFeature: FeatureDefinition = {
                id: 'COMPLIANT_TEST',
                name: 'Compliant Feature',
                description: 'Valid v1.2 safety spec',
                category: 'INSTRUMENT',
                oem: 'VOLKSWAGEN',
                platform: 'MQB',
                targetEcuAddress: '0x17',
                identificationDids: ['F191'],
                operationType: 'READ_MODIFY_WRITE',
                payloadSpec: { readDid: '1701', writeDid: '1701', byteIndex: 1, bitIndex: 0 },
                safetySpec: {
                    supportsBackup: true,
                    supportsRollback: true,
                    maxRollbackAttempts: 1,
                    provenSafe: true,
                    requireSfdUnlock: false,
                    minVoltageState: VoltageState.WARNING,
                    requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
                },
            };

            expect(() => recoveryStateMachine.validateSafetyPolicy(compliantFeature)).not.toThrow();
        });
    });

    describe('2. 13-Phase Journal & SHA-256 Hash Chain Integrity', () => {
        it('should maintain tamper-proof SHA-256 hash chain across phases', async () => {
            const sampleRecord: PendingWriteRecord = {
                pendingWriteId: 'OP_HASH_CHAIN_TEST_100',
                featureId: 'NEEDLE_SWEEP_TEST',
                vin: 'WVWZZZAUZHW000001',
                ecuHeader: '0x17',
                didHex: '1701',
                originalHex: '00',
                targetHex: '01',
                status: 'WRITE_INITIATED',
                timestamp: Date.now(),
            };

            await pendingWriteStore.appendJournalPhase('PRECHECK', sampleRecord);
            await pendingWriteStore.appendJournalPhase('BACKUP_COMPLETE', sampleRecord);
            await pendingWriteStore.appendJournalPhase('WRITE_STARTED', sampleRecord);

            const journal = await pendingWriteStore.getJournalHistory();
            expect(journal.length).toBeGreaterThanOrEqual(3);

            const isValid = pendingWriteStore.validateJournalIntegrity(journal);
            expect(isValid).toBe(true);
        });
    });

    describe('3. Vehicle Preconditions & Fail-Safe Speed Check', () => {
        const sampleFeature: FeatureDefinition = {
            id: 'NEEDLE_SWEEP_TEST',
            name: 'Needle Sweep',
            description: 'Gauge needle sweep on start',
            category: 'INSTRUMENT',
            oem: 'VOLKSWAGEN',
            platform: 'MQB',
            targetEcuAddress: '0x17',
            identificationDids: ['F191'],
            operationType: 'READ_MODIFY_WRITE',
            payloadSpec: { readDid: '1701', writeDid: '1701', byteIndex: 0, bitIndex: 3 },
            safetySpec: {
                supportsBackup: true,
                supportsRollback: true,
                maxRollbackAttempts: 1,
                provenSafe: true,
                requireSfdUnlock: false,
                minVoltageState: VoltageState.WARNING,
                requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
            },
            preconditions: {
                requiresVehicleStationary: true,
                maxAllowedSpeedKmh: 0,
                minimumVoltage: 12.0,
            },
        };

        it('should BLOCK coding when vehicle speed PID is UNREADABLE (Fail-Safe)', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: undefined,
                        isSpeedReadable: false, // Fail-Safe speed trigger
                        isEngineRunning: false,
                    },
                    sampleFeature
                );
            }).toThrow(/SAFETY_VIOLATION_UNKNOWN_SPEED/);
        });

        it('should BLOCK coding when vehicle speed > 0 km/h', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 10, // 10 km/h motion
                        isSpeedReadable: true,
                        isEngineRunning: false,
                    },
                    sampleFeature
                );
            }).toThrow(/SAFETY_VIOLATION_VEHICLE_IN_MOTION/);
        });

        it('should PASS safety gate when stationary, battery >= 12.0V, and valid preconditions', () => {
            const resultVoltageState = featureActivationEngine.validateSafetyGate(
                {
                    batteryVoltage: 12.6,
                    vehicleSpeed: 0,
                    isSpeedReadable: true,
                    isEngineRunning: false,
                    ignitionState: 'ON',
                },
                sampleFeature
            );

            expect(resultVoltageState).toBe(VoltageState.STABLE);
        });
    });
});
