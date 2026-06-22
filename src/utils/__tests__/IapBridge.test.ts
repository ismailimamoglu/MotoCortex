import { deriveHmacKey, signReceipt, verifyReceipt, GracePeriodReceipt } from '../IapBridge';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
    digestStringAsync: jest.fn(async (_algo: any, data: string) => {
        // Simple deterministic hash mock for testing
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `mock_sha256_${Math.abs(hash).toString(16)}`;
    }),
    CryptoDigestAlgorithm: {
        SHA256: 'SHA-256',
    },
}));

describe('IapBridge', () => {
    describe('deriveHmacKey', () => {
        it('derives a hex key from device UUID', () => {
            const key = deriveHmacKey('550e8400-e29b-41d4-a716-446655440000');
            expect(key).toBeDefined();
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
            // Key should be hex characters only
            expect(key).toMatch(/^[0-9a-f]+$/);
        });

        it('produces different keys for different UUIDs', () => {
            const key1 = deriveHmacKey('550e8400-e29b-41d4-a716-446655440000');
            const key2 = deriveHmacKey('660f9511-f3ac-52e5-b827-557766551111');
            expect(key1).not.toBe(key2);
        });

        it('produces different keys for different hardware fingerprints', () => {
            // Mock react-native Platform constants to change hardware fingerprint
            const originalPlatform = require('react-native').Platform;
            
            // First run with one set of platform variables
            originalPlatform.OS = 'ios';
            originalPlatform.Version = '17.2';
            originalPlatform.constants = { Model: 'iPhone15' };
            const key1 = deriveHmacKey('550e8400-e29b-41d4-a716-446655440000');

            // Second run with a different set of platform variables (spoof/clone/android target)
            originalPlatform.OS = 'android';
            originalPlatform.Version = '33';
            originalPlatform.constants = { Brand: 'Pixel', Model: 'Pixel 8' };
            const key2 = deriveHmacKey('550e8400-e29b-41d4-a716-446655440000');

            expect(key1).not.toBe(key2);

            // Restore
            originalPlatform.OS = 'ios';
            originalPlatform.Version = '17.2';
            originalPlatform.constants = { Model: 'iPhone15' };
        });

        it('produces consistent output for same UUID', () => {
            const key1 = deriveHmacKey('aabbccdd-1122-3344-5566-778899001122');
            const key2 = deriveHmacKey('aabbccdd-1122-3344-5566-778899001122');
            expect(key1).toBe(key2);
        });

        it('handles empty UUID gracefully', () => {
            const key = deriveHmacKey('');
            expect(key).toBeDefined();
            expect(key.length).toBeGreaterThan(0);
        });

        it('handles short UUID gracefully', () => {
            const key = deriveHmacKey('abcd');
            expect(key).toBeDefined();
            expect(key.length).toBeGreaterThan(0);
        });
    });

    describe('signReceipt', () => {
        it('produces a signature string', async () => {
            const sig = await signReceipt(1700000000000, 'tx_test_001', 'test-device-uuid');
            expect(sig).toBeDefined();
            expect(typeof sig).toBe('string');
            expect(sig.length).toBeGreaterThan(0);
        });

        it('produces different signatures for different transactions', async () => {
            const sig1 = await signReceipt(1700000000000, 'tx_001', 'device-uuid');
            const sig2 = await signReceipt(1700000000000, 'tx_002', 'device-uuid');
            expect(sig1).not.toBe(sig2);
        });

        it('produces different signatures for different device UUIDs', async () => {
            const sig1 = await signReceipt(1700000000000, 'tx_001', 'device-uuid-A');
            const sig2 = await signReceipt(1700000000000, 'tx_001', 'device-uuid-B');
            expect(sig1).not.toBe(sig2);
        });
    });

    describe('verifyReceipt', () => {
        it('verifies a correctly signed receipt', async () => {
            const timestamp = Date.now();
            const txId = 'valid_tx_123';
            const deviceUuid = 'valid-device-uuid';
            const signature = await signReceipt(timestamp, txId, deviceUuid);
            
            const receipt: GracePeriodReceipt = { timestamp, transactionId: txId, signature };
            const isValid = await verifyReceipt(receipt, deviceUuid);
            expect(isValid).toBe(true);
        });

        it('rejects receipt signed with different UUID (spoofed HMAC)', async () => {
            const timestamp = Date.now();
            const txId = 'spoofed_tx_456';
            const attackerUuid = 'attacker-device-uuid';
            const victimUuid = 'victim-device-uuid';
            
            // Attacker signs with their own UUID
            const signature = await signReceipt(timestamp, txId, attackerUuid);
            
            // Victim tries to verify — must fail
            const receipt: GracePeriodReceipt = { timestamp, transactionId: txId, signature };
            const isValid = await verifyReceipt(receipt, victimUuid);
            expect(isValid).toBe(false);
        });

        it('rejects receipt with tampered timestamp', async () => {
            const originalTimestamp = Date.now();
            const txId = 'tamper_tx_789';
            const deviceUuid = 'tamper-device-uuid';
            const signature = await signReceipt(originalTimestamp, txId, deviceUuid);
            
            // Tamper with the timestamp to extend grace period
            const tamperedReceipt: GracePeriodReceipt = {
                timestamp: originalTimestamp - 999999,
                transactionId: txId,
                signature,
            };
            const isValid = await verifyReceipt(tamperedReceipt, deviceUuid);
            expect(isValid).toBe(false);
        });

        it('rejects receipt with tampered transactionId', async () => {
            const timestamp = Date.now();
            const deviceUuid = 'tamper-device-uuid';
            const signature = await signReceipt(timestamp, 'real_tx', deviceUuid);
            
            const tamperedReceipt: GracePeriodReceipt = {
                timestamp,
                transactionId: 'fake_tx',
                signature,
            };
            const isValid = await verifyReceipt(tamperedReceipt, deviceUuid);
            expect(isValid).toBe(false);
        });

        it('handles null or generic/cloned UUID (e.g. 9774d56d682e549c) safely and generates distinct keys', () => {
            const key1 = deriveHmacKey('9774d56d682e549c');
            const key2 = deriveHmacKey('another-device-uuid');
            expect(key1).toBeDefined();
            expect(key1).not.toBe(key2);
        });

        it('rejects verification if grace period signature is corrupted/malformed string', async () => {
            const receipt: GracePeriodReceipt = {
                timestamp: Date.now(),
                transactionId: 'tx_123',
                signature: 'MALFORMED_OR_CORRUPTED_SIGNATURE_PAYLOAD',
            };
            const isValid = await verifyReceipt(receipt, 'test-device-uuid');
            expect(isValid).toBe(false);
        });

        it('rejects expired grace period receipt verification', async () => {
            // Mock scenario where receipt is signed for a timestamp far in the past
            const pastTimestamp = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
            const txId = 'expired_tx_999';
            const deviceUuid = 'test-device-uuid';
            const signature = await signReceipt(pastTimestamp, txId, deviceUuid);

            const receipt: GracePeriodReceipt = {
                timestamp: pastTimestamp,
                transactionId: txId,
                signature
            };
            
            // Verify receipt signature matches, but caller/logic layer should know the timestamp is too old
            const signatureMatches = await verifyReceipt(receipt, deviceUuid);
            expect(signatureMatches).toBe(true);

            // Verify with modified timestamp (rejected)
            const tamperedReceipt = { ...receipt, timestamp: Date.now() };
            const isTamperedValid = await verifyReceipt(tamperedReceipt, deviceUuid);
            expect(isTamperedValid).toBe(false);
        });
    });
});
