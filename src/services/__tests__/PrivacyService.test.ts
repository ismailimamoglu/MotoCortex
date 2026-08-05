import { PrivacyService } from '../PrivacyService';

describe('PrivacyService', () => {
    test('should export user data bundle', async () => {
        const exportPkg = await PrivacyService.exportUserData('TEST_USER_123');
        expect(exportPkg).toHaveProperty('exportDate');
        expect(exportPkg.data.userId).toBe('TEST_USER_123');
        expect(exportPkg.data).toHaveProperty('telemetryRecordsCount');
    });

    test('should purge user data for right to be forgotten', async () => {
        const purgeRes = await PrivacyService.purgeUserData('TEST_USER_123');
        expect(purgeRes.success).toBe(true);
        expect(Array.isArray(purgeRes.purgedItems)).toBe(true);
    });
});
