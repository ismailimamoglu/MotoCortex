// src/core/protocol/uds/__tests__/UdsNrcHandler.test.ts
import { UdsNrcHandler } from '../UdsNrcHandler';

describe('UdsNrcHandler', () => {
    beforeEach(() => {
        // Reset any lockouts
        UdsNrcHandler.clearLockouts();
    });

    test('should return null when parsing non-NRC response', () => {
        const result = UdsNrcHandler.analyzeResponse('6E 09 02 01');
        expect(result).toBeNull();
    });

    test('should parse NRC 0x22 (ConditionsNotCorrect) correctly', () => {
        const result = UdsNrcHandler.analyzeResponse('7F 2E 22');
        expect(result).not.toBeNull();
        expect(result?.nrcCode).toBe(0x22);
        expect(result?.titleKey).toBe('nrc.conditionsNotCorrectTitle');
        expect(result?.isLockoutTriggered).toBe(false);
    });

    test('should parse NRC 0x36 (ExceededNumberOfAttempts) and trigger lockout timer per ECU header', () => {
        const result = UdsNrcHandler.analyzeResponse('7F 27 36', '7E8');
        expect(result).not.toBeNull();
        expect(result?.nrcCode).toBe(0x36);
        expect(result?.isLockoutTriggered).toBe(true);
        expect(result?.lockoutDurationSeconds).toBe(600);
        expect(UdsNrcHandler.isLockoutActive('7E8')).toBe(true);
        expect(UdsNrcHandler.isLockoutActive('7E9')).toBe(false); // TCM remains unlocked!
        expect(UdsNrcHandler.getRemainingLockoutSeconds('7E8')).toBeGreaterThan(0);
    });

    test('should parse NRC 0x33 (SecurityAccessDenied)', () => {
        const result = UdsNrcHandler.analyzeCode(0x33, '7F 2E 33');
        expect(result.nrcCode).toBe(0x33);
        expect(result.titleKey).toBe('nrc.securityAccessDeniedTitle');
    });
});
