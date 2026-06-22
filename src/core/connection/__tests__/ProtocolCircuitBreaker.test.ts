import { ProtocolCircuitBreaker } from '../ProtocolCircuitBreaker';
import { useBluetoothStore } from '../../../store/useBluetoothStore';

describe('ProtocolCircuitBreaker Tests', () => {
    beforeEach(() => {
        useBluetoothStore.getState().reset();
        ProtocolCircuitBreaker.reset();
    });

    test('1. First failure does not blacklist protocol', () => {
        ProtocolCircuitBreaker.recordFailure('5');
        expect(ProtocolCircuitBreaker.isBlacklisted('5')).toBe(false);
        expect(useBluetoothStore.getState().failedProtocols).not.toContain('5');
    });

    test('2. Second failure blacklists protocol', () => {
        ProtocolCircuitBreaker.recordFailure('5');
        ProtocolCircuitBreaker.recordFailure('5');
        expect(ProtocolCircuitBreaker.isBlacklisted('5')).toBe(true);
        expect(useBluetoothStore.getState().failedProtocols).toContain('5');
    });

    test('3. Case insensitivity and whitespace handling', () => {
        ProtocolCircuitBreaker.recordFailure('  at sp 6  ');
        ProtocolCircuitBreaker.recordFailure('AT SP 6');
        expect(ProtocolCircuitBreaker.isBlacklisted('AT SP 6')).toBe(true);
        expect(useBluetoothStore.getState().failedProtocols).toContain('AT SP 6');
    });

    test('4. Reset clears all blacklists and counts', () => {
        ProtocolCircuitBreaker.recordFailure('6');
        ProtocolCircuitBreaker.recordFailure('6');
        expect(ProtocolCircuitBreaker.isBlacklisted('6')).toBe(true);

        ProtocolCircuitBreaker.reset();
        expect(ProtocolCircuitBreaker.isBlacklisted('6')).toBe(false);
        expect(useBluetoothStore.getState().failedProtocols).not.toContain('6');
    });
});
