// src/core/security/__tests__/SecurityAccessProvider.test.ts
import { 
    LocalTestSecurityProvider, 
    SecurityAccessManager 
} from '../SecurityAccessProvider';

describe('SecurityAccessProvider', () => {
    test('should calculate valid key from seed using LocalTestSecurityProvider', async () => {
        const provider = new LocalTestSecurityProvider();
        const response = await provider.calculateKey({
            seedHex: '6789',
            securityLevel: 1
        });

        expect(response.isSuccess).toBe(true);
        expect(response.keyHex).toBeDefined();
        expect(response.keyHex?.length).toBe(4);
    });

    test('should reject invalid or short seed hex', async () => {
        const provider = new LocalTestSecurityProvider();
        const response = await provider.calculateKey({
            seedHex: '01',
            securityLevel: 1
        });

        expect(response.isSuccess).toBe(false);
        expect(response.errorMessage).toBe('INVALID_SEED_LENGTH');
    });

    test('should delegate key calculation to active provider in SecurityAccessManager', async () => {
        const response = await SecurityAccessManager.calculateKey({
            seedHex: '1234',
            securityLevel: 1
        });

        expect(response.isSuccess).toBe(true);
        expect(response.providerName).toBe('LocalTestSecurityProvider');
    });
});
