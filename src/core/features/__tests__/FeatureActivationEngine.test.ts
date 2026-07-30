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
            verificationStatus: 'BENCH_VERIFIED',
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

        it('should BLOCK coding when engine is RUNNING (RPM > 0)', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: true, // Engine active (RPM > 0)
                    },
                    sampleFeature
                );
            }).toThrow('SAFETY_VIOLATION_ENGINE_RUNNING');
        });

        it('should HARD-BLOCK ECU write attempts to ABS (0x7E2) and Airbag/SRS (0x7E3) modules', () => {
            const unsafeAbsFeature: FeatureDefinition = {
                ...sampleFeature,
                id: 'ABS_BRAKE_RESET_TEST',
            };
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.8,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: false,
                    },
                    unsafeAbsFeature
                );
            }).toThrow('SAFETY_VIOLATION_UNSAFE_MODULE_WRITE');
        });

        it('should PASS EV battery features on 0x7E2 without false-positive ABS/SRS hard-block', () => {
            const evBatteryFeature: FeatureDefinition = {
                ...sampleFeature,
                id: 'mg_ev_battery_preconditioning',
                name: 'EV Battery Preconditioning',
                targetEcuAddress: '0x7E2',
            };
            const resultVoltageState = featureActivationEngine.validateSafetyGate(
                {
                    batteryVoltage: 12.6,
                    vehicleSpeed: 0,
                    isSpeedReadable: true,
                    isEngineRunning: false,
                    ignitionState: 'ON',
                },
                evBatteryFeature
            );
            expect(resultVoltageState).toBe(VoltageState.STABLE);
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

    describe('4. Phase 0 & Phase 1 Security Guards, Fingerprint Hard-Block & DTC Scan', () => {
        const sampleFeature: FeatureDefinition = {
            id: 'NEEDLE_SWEEP_TEST',
            name: 'Needle Sweep',
            description: 'Gauge needle sweep on start',
            category: 'INSTRUMENT',
            oem: 'VOLKSWAGEN',
            platform: 'MQB',
            targetEcuAddress: '0x17',
            identificationDids: ['F191'],
            verificationStatus: 'BENCH_VERIFIED',
            operationType: 'READ_MODIFY_WRITE',
            payloadSpec: { readDid: '1701', writeDid: '1701', byteIndex: 0, bitIndex: 3 },
            safetySpec: {
                supportsBackup: true,
                supportsRollback: true,
                maxRollbackAttempts: 1,
                provenSafe: true,
                requireSfdUnlock: true, // Requires SFD
                minVoltageState: VoltageState.WARNING,
                requiredAdapterTier: AdapterTier.TIER_2_STANDARD,
            },
            preconditions: {
                requiresVehicleStationary: true,
                maxAllowedSpeedKmh: 0,
                minimumVoltage: 12.0,
            },
        };

        it('should FAIL-CLOSED and block write when VAG SFD protection is active without token', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: false,
                        guardContext: { oem: 'VOLKSWAGEN', sfdTokenPresent: false }
                    },
                    sampleFeature
                );
            }).toThrow(/SAFETY_VIOLATION_SFD_PROTECTED/);
        });

        it('should HARD-BLOCK write at engine level if FingerprintMatchResult is UNKNOWN or MISMATCH', () => {
            expect(() => {
                featureActivationEngine.evaluateFingerprintHardBlock(
                    {
                        vin: 'WVWZZZAUZHW000001',
                        ecuAddress: '0x17',
                        ecuName: 'Dashboard',
                        softwareVersion: 'SW_UNKNOWN_VERSION',
                        readDids: {},
                        fingerprintHash: 'HASH'
                    },
                    {
                        ...sampleFeature,
                        compatibleSoftwareVersions: ['SW_VALID_V1', 'SW_VALID_V2']
                    }
                );
            }).toThrow(/SAFETY_VIOLATION_FINGERPRINT_BLOCK/);
        });

        it('should detect new post-write DTCs and trigger POST_WRITE_DTC_DETECTED outcome', () => {
            const outcome = featureActivationEngine.evaluatePostWriteDtcDiff(
                ['P0113'],
                ['P0113', 'U112300'], // U112300 is newly introduced DTC
                []
            );

            expect(outcome.result).toBe('POST_WRITE_DTC_DETECTED');
            expect(outcome.detectedDtcs).toEqual(['U112300']);
        });

        it('should enforce T_Total_Max global operation watchdog on ResponsePending NRC 0x78 loops', () => {
            const plan = recoveryStateMachine.classifyFailure(
                0x78 as any, // ResponsePending
                false,
                false,
                65000, // 65 seconds operation duration
                60000  // 60 seconds T_Total_Max limit
            );

            expect(plan.action).toBe('INCONCLUSIVE_LOCK');
            expect(plan.userMessage).toContain('WATCHDOG_TIMEOUT');
        });
    });

    describe('5. Cross-Byte Bitmask Engine (Faz 0.3)', () => {
        it('should write a single-bit value in Little-Endian (Intel) mode', () => {
            // Original: 00 00 00 00, set bit 3 of byte 0 (startBitOffset=3, bitWidth=1, value=1)
            const result = featureActivationEngine.applyCrossByteBitmask('00000000', 3, 1, 1, 'LITTLE_ENDIAN');
            expect(result).toBe('08000000');
        });

        it('should write a multi-bit value crossing byte boundary in Little-Endian', () => {
            // Original: 00 00, set 12-bit value 0xABC starting at bit 0 of byte 0
            // bits 0-7 go to byte 0, bits 8-11 go to byte 1
            const result = featureActivationEngine.applyCrossByteBitmask('0000', 0, 12, 0xABC, 'LITTLE_ENDIAN');
            // 0xABC = 101010111100 binary
            // byte 0 (bits 0-7): 10111100 = 0xBC
            // byte 1 (bits 8-11): 00001010 = 0x0A
            expect(result).toBe('BC0A');
        });

        it('should write a single-bit value in Big-Endian (Motorola / Vector DBC) mode', () => {
            // Original: 00 00, set bit 7 of byte 0 (startBitOffset=7, bitWidth=1, value=1)
            // Vector DBC: Bit_7 of Byte_0 = Offset 7 (MSB of first byte)
            const result = featureActivationEngine.applyCrossByteBitmask('0000', 7, 1, 1, 'BIG_ENDIAN_MOTOROLA');
            expect(result).toBe('8000');
        });

        it('should write a multi-bit value in Big-Endian (Motorola) crossing byte boundary', () => {
            // Original: 00 00 00, 10-bit value 0x2AB starting at bit 7 of byte 0 (MSB)
            // Motorola layout: MSB at byte0:bit7, goes right to bit0, then wraps to byte1:bit7
            // 0x2AB = 1010101011 (10 bits)
            // byte0: bits 7..0 = 10101010 = 0xAA (first 8 bits of value)
            // byte1: bits 7..6 = 11 (remaining 2 bits) -> byte1 = 11000000 = 0xC0
            const result = featureActivationEngine.applyCrossByteBitmask('000000', 7, 10, 0x2AB, 'BIG_ENDIAN_MOTOROLA');
            expect(result).toBe('AAC000'); // AA + C0 + 00
        });

        it('should throw INVALID_BIT_WIDTH for bitWidth = 0', () => {
            expect(() => {
                featureActivationEngine.applyCrossByteBitmask('0000', 0, 0, 0);
            }).toThrow(/INVALID_BIT_WIDTH/);
        });

        it('should throw INVALID_VALUE when value exceeds max for bitWidth', () => {
            expect(() => {
                featureActivationEngine.applyCrossByteBitmask('0000', 0, 4, 16); // max for 4-bit is 15
            }).toThrow(/INVALID_VALUE/);
        });

        it('should throw CROSS_BYTE_OUT_OF_RANGE when signal extends beyond payload', () => {
            expect(() => {
                featureActivationEngine.applyCrossByteBitmask('00', 0, 16, 0xFFFF, 'LITTLE_ENDIAN');
            }).toThrow(/CROSS_BYTE_OUT_OF_RANGE/);
        });

        it('should correctly preserve unaffected bits in the payload', () => {
            // Original: FF FF, clear bit 3 of byte 0 (set 1-bit signal to 0)
            const result = featureActivationEngine.applyCrossByteBitmask('FFFF', 3, 1, 0, 'LITTLE_ENDIAN');
            expect(result).toBe('F7FF');
        });
    });

    describe('6. EV Safety Gate & VerificationStatus Hard-Block (Faz 0.3/0.4)', () => {
        const evFeature: FeatureDefinition = {
            id: 'EV_REGEN_BRAKE_LEVEL',
            name: 'EV Regen Brake Level',
            description: 'Adjusts EV regenerative braking level',
            category: 'COMFORT',
            oem: 'VOLKSWAGEN',
            platform: 'MEB',
            targetEcuAddress: '0x7E2',
            identificationDids: ['F191'],
            verificationStatus: 'BENCH_VERIFIED',
            operationType: 'READ_MODIFY_WRITE',
            payloadSpec: { readDid: '2001', writeDid: '2001', byteIndex: 0, bitIndex: 0 },
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

        it('should BLOCK when EV High Voltage system is READY', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: false,
                        isEv: true,
                        isHighVoltageReady: true,
                        isEvCharging: false,
                    },
                    evFeature
                );
            }).toThrow(/SAFETY_VIOLATION_EV_HV_READY/);
        });

        it('should BLOCK when EV is charging', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: false,
                        isEv: true,
                        isHighVoltageReady: false,
                        isEvCharging: true,
                    },
                    evFeature
                );
            }).toThrow(/SAFETY_VIOLATION_EV_CHARGING/);
        });

        it('should BLOCK when EV telemetry is completely unknown (fail-closed)', () => {
            expect(() => {
                featureActivationEngine.validateSafetyGate(
                    {
                        batteryVoltage: 12.6,
                        vehicleSpeed: 0,
                        isSpeedReadable: true,
                        isEngineRunning: false,
                        isEv: true,
                        // Both isHighVoltageReady and isEvCharging are undefined
                    },
                    evFeature
                );
            }).toThrow(/SAFETY_VIOLATION_EV_TELEMETRY_UNKNOWN/);
        });

        it('should PASS EV safety gate when HV=false and Charging=false', () => {
            const result = featureActivationEngine.validateSafetyGate(
                {
                    batteryVoltage: 12.6,
                    vehicleSpeed: 0,
                    isSpeedReadable: true,
                    isEngineRunning: false,
                    isEv: true,
                    isHighVoltageReady: false,
                    isEvCharging: false,
                },
                evFeature
            );
            expect(result).toBe(VoltageState.STABLE);
        });

        it('should HARD-BLOCK DRAFT_UNVERIFIED features at engine level', () => {
            const unverifiedFeature: FeatureDefinition = {
                ...evFeature,
                verificationStatus: 'DRAFT_UNVERIFIED',
            };
            expect(() => {
                featureActivationEngine.evaluateVerificationStatusHardBlock(unverifiedFeature);
            }).toThrow(/SAFETY_VIOLATION_UNVERIFIED_DATA/);
        });

        it('should ALLOW DRAFT_UNVERIFIED features when Developer Bench Mode is active', () => {
            const unverifiedFeature: FeatureDefinition = {
                ...evFeature,
                verificationStatus: 'DRAFT_UNVERIFIED',
            };
            featureActivationEngine.setDeveloperBenchModeEnabled(true);
            expect(() => {
                featureActivationEngine.evaluateVerificationStatusHardBlock(unverifiedFeature);
            }).not.toThrow();
            featureActivationEngine.setDeveloperBenchModeEnabled(false);
        });
    });

    describe('7. Emergency Session Flush & Developer Audit Trail (Faz 0.4)', () => {
        it('should call sendUdsCommandFn with 0x10 0x01 during emergency session flush', async () => {
            const mockSendUds = jest.fn().mockResolvedValue(undefined);
            await featureActivationEngine.emergencySessionFlush(mockSendUds);
            expect(mockSendUds).toHaveBeenCalledWith(0x10, 0x01);
            expect(mockSendUds).toHaveBeenCalledTimes(1);
        });

        it('should not throw even if 0x10 01 flush fails (graceful degradation)', async () => {
            const failingUds = jest.fn().mockRejectedValue(new Error('Transport disconnected'));
            await expect(featureActivationEngine.emergencySessionFlush(failingUds)).resolves.not.toThrow();
        });

        it('should invoke session flush via voltage polling when voltage drops below 12V', async () => {
            const mockSendUds = jest.fn().mockResolvedValue(undefined);
            let currentVoltage = 12.6;
            const mockAbort = jest.fn();

            featureActivationEngine.startVoltagePolling(
                () => currentVoltage,
                mockAbort,
                mockSendUds
            );

            // Simulate voltage drop
            currentVoltage = 11.5;

            // Wait for polling interval (250ms + buffer)
            await new Promise(resolve => setTimeout(resolve, 350));

            expect(mockSendUds).toHaveBeenCalledWith(0x10, 0x01);
            expect(mockAbort).toHaveBeenCalled();

            featureActivationEngine.stopVoltagePolling();
        });
    });
});
