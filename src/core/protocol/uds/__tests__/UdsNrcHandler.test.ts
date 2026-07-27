// src/core/protocol/uds/__tests__/UdsNrcHandler.test.ts
import { UdsNrcHandler } from '../UdsNrcHandler';

describe('UdsNrcHandler', () => {
    beforeEach(() => {
        // Reset any lockouts
        (UdsNrcHandler as any).lockoutEndTime = 0;
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

    test('should parse NRC 0x36 (ExceededNumberOfAttempts) and trigger lockout timer', () => {
        const result = UdsNrcHandler.analyzeResponse('7F 27 36');
        expect(result).not.toBeNull();
        expect(result?.nrcCode).toBe(0x36);
        expect(result?.isLockoutTriggered).toBe(true);
        expect(result?.lockoutDurationSeconds).toBe(600);
        expect(UdsNrcHandler.isLockoutActive()).toBe(true);
        expect(UdsNrcHandler.getRemainingLockoutSeconds()).toBeGreaterThan(0);
    });

    test('should parse NRC 0x33 (SecurityAccessDenied)', () => {
        const result = UdsNrcHandler.analyzeCode(0x33, '7F 2E 33');
        expect(result.nrcCode).toBe(0x33);
        expect(result.titleKey).toBe('nrc.securityAccessDeniedTitle');
    });
});
