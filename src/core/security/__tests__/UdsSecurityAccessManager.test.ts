import { UdsSecurityAccessManager, StandardOemSeedKeyProvider } from '../UdsSecurityAccessManager';

describe('UdsSecurityAccessManager', () => {
    let manager: UdsSecurityAccessManager;

    beforeEach(() => {
        manager = UdsSecurityAccessManager.getInstance();
        manager.setProvider(new StandardOemSeedKeyProvider());
        manager.recordSuccess('01');
    });

    it('should compute valid key for VAG ECU seed', async () => {
        const seedHex = '12345678';
        const keyHex = await manager.computeKey(seedHex, 0x01, {
            ecuAddress: '01',
            securityLevel: 0x01,
            oemMake: 'Volkswagen'
        });

        expect(keyHex).toBeDefined();
        expect(keyHex.length).toBe(seedHex.length);
        expect(typeof keyHex).toBe('string');
    });

    it('should compute valid key for BMW ECU seed', async () => {
        const seedHex = 'AABBCCDD';
        const keyHex = await manager.computeKey(seedHex, 0x01, {
            ecuAddress: '12',
            securityLevel: 0x01,
            oemMake: 'BMW'
        });

        expect(keyHex).toBeDefined();
        expect(keyHex.length).toBe(seedHex.length);
    });

    it('should return empty key if seed is all zeros (already unlocked)', async () => {
        const seedHex = '00000000';
        const keyHex = await manager.computeKey(seedHex, 0x01, {
            ecuAddress: '01',
            securityLevel: 0x01,
            oemMake: 'Volkswagen'
        });

        expect(keyHex).toBe('');
    });

    it('should enforce lockout after 3 failed attempts', () => {
        const ecu = '09';
        manager.recordFailure(ecu);
        manager.recordFailure(ecu);
        const lockoutRemaining = manager.recordFailure(ecu);

        expect(lockoutRemaining).toBeGreaterThan(0);
        const status = manager.isLockedOut(ecu);
        expect(status.locked).toBe(true);

        // Reset after success
        manager.recordSuccess(ecu);
        expect(manager.isLockedOut(ecu).locked).toBe(false);
    });
});
