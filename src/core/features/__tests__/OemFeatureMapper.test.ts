import { oemDatabaseProvider } from '../../database/OemDatabaseProvider';
import { mapOemToFeatureDefinition } from '../OemFeatureMapper';

describe('OemFeatureMapper', () => {
    it('should map all catalog OEM features into valid FeatureDefinition objects without error', () => {
        const features = oemDatabaseProvider.getFeaturesForMake();
        expect(features.length).toBeGreaterThan(50);

        for (const feature of features) {
            const mapped = mapOemToFeatureDefinition(feature);
            expect(mapped.id).toBe(feature.id);
            expect(mapped.name).toBe(feature.defaultName);
            expect(mapped.targetEcuAddress).toBe(feature.targetEcuHeader);
            expect(mapped.payloadSpec.readDid).toBe(feature.didHex);
            expect(mapped.payloadSpec.writeDid).toBe(feature.didHex);
            expect(mapped.safetySpec.maxRollbackAttempts).toBeLessThanOrEqual(1);
            expect(mapped.preconditions?.requiresVehicleStationary).toBe(true);
        }
    });

    it('should correctly tag safety-critical features with targetModule ABS_ESP or SRS_AIRBAG', () => {
        const mockAbs = {
            id: 'test_abs_feature',
            nameKey: 'test',
            descKey: 'test',
            defaultName: 'ABS System Calibration',
            defaultDesc: 'Test',
            make: 'Volkswagen',
            category: 'SECURITY_SAFETY' as const,
            targetEcuHeader: '0x7E2',
            didHex: '0101',
            byteIndex: 0,
            bitIndex: 0,
            requiresSecurityAccess: false,
            requiresExtendedSession: false,
            safetyLevel: 'LEVEL_2_ADAPTATION' as const,
            riskLevel: 'HIGH' as const,
        };

        const mapped = mapOemToFeatureDefinition(mockAbs);
        expect((mapped as any).targetModule).toBe('ABS_ESP');
    });
});
