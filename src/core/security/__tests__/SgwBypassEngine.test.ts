import { SgwBypassEngine } from '../SgwBypassEngine';

describe('SgwBypassEngine', () => {
    beforeEach(() => {
        SgwBypassEngine.relock();
    });

    test('should detect SGW for FCA VINs', () => {
        const status = SgwBypassEngine.detectSgwStatus('1J4GZ58B98C123456');
        expect(status.isLocked).toBe(true);
        expect(status.vendor).toBe('FCA');
    });

    test('should detect generic SGW for unknown VINs', () => {
        const status = SgwBypassEngine.detectSgwStatus('1FA6P8CF0H5123456');
        expect(status.isLocked).toBe(false);
        expect(status.vendor).toBe('GENERIC');
    });

    test('should unlock with valid token and auto-relock check', () => {
        const unlockRes = SgwBypassEngine.unlockWithToken({
            vin: '1J4GZ58B98C123456',
            vendor: 'FCA',
            challengeHex: '12345678',
            signedToken: 'VALID_TEST_TOKEN',
        });

        expect(unlockRes.success).toBe(true);
        const status = SgwBypassEngine.getStatus();
        expect(status.isLocked).toBe(false);
        expect(status.vendor).toBe('FCA');
    });

    test('should support offline fallback unlock', () => {
        const offlineRes = SgwBypassEngine.unlockOfflineFallback('1J4GZ58B98C123456', 'FCA', 'OFF_12345678');
        expect(offlineRes.success).toBe(true);
        expect(SgwBypassEngine.getStatus().isLocked).toBe(false);
    });
});
