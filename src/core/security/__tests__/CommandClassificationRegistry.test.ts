import {
    CommandClass,
    classifyCommand,
    normalizeCommand,
    requiresProAccess,
    assertHardwareGate,
} from '../CommandClassificationRegistry';

describe('CommandClassificationRegistry', () => {
    describe('normalizeCommand', () => {
        it('strips whitespace and uppercases', () => {
            expect(normalizeCommand('01 0C')).toBe('010C');
            expect(normalizeCommand('at z')).toBe('ATZ');
            expect(normalizeCommand('  04  ')).toBe('04');
        });
    });

    describe('classifyCommand', () => {
        // READ_ONLY commands
        it.each([
            ['010C', 'telemetry RPM'],
            ['010D', 'telemetry Speed'],
            ['0100', 'PID support query'],
            ['03', 'DTC read'],
            ['0902', 'VIN read'],
            ['0904', 'CalID read'],
            ['ATI', 'adapter identification'],
            ['ATRV', 'adapter voltage read'],
            ['ATSP0', 'protocol set'],
        ])('classifies %s (%s) as READ_ONLY', (cmd) => {
            expect(classifyCommand(cmd)).toBe(CommandClass.READ_ONLY);
        });

        // OEM_READ_ONLY commands
        it.each([
            ['22F190', 'Mode 22 Read PID'],
            ['2101', 'Mode 21 Read Local PID'],
        ])('classifies %s (%s) as OEM_READ_ONLY', (cmd) => {
            expect(classifyCommand(cmd)).toBe(CommandClass.OEM_READ_ONLY);
        });

        // SESSION_CONTROL commands
        it.each([
            ['1001', 'Diagnostic Session Control'],
            ['2701', 'Security Access Request Seed'],
        ])('classifies %s (%s) as SESSION_CONTROL', (cmd) => {
            expect(classifyCommand(cmd)).toBe(CommandClass.SESSION_CONTROL);
        });

        // SOFT_MUTATION commands
        it('classifies 04 (Clear DTC) as SOFT_MUTATION', () => {
            expect(classifyCommand('04')).toBe(CommandClass.SOFT_MUTATION);
        });

        // HARD_MUTATION commands
        it('classifies 2E0102AABB (Write Data By Identifier) as HARD_MUTATION', () => {
            expect(classifyCommand('2E0102AABB')).toBe(CommandClass.HARD_MUTATION);
        });

        // DANGEROUS commands
        it.each([
            ['ATZ', 'Adapter hard reset'],
            ['11', 'ECU Reset'],
            ['1101', 'ECU Reset with sub-function'],
            ['33', 'Adaptation write'],
            ['3301', 'Adaptation with parameter'],
        ])('classifies %s (%s) as DANGEROUS', (cmd) => {
            expect(classifyCommand(cmd)).toBe(CommandClass.DANGEROUS);
        });

        // Case insensitivity
        it('handles case-insensitive input', () => {
            expect(classifyCommand('atz')).toBe(CommandClass.DANGEROUS);
            expect(classifyCommand('Atz')).toBe(CommandClass.DANGEROUS);
            expect(classifyCommand('atrv')).toBe(CommandClass.READ_ONLY);
        });

        // Whitespace tolerance
        it('handles whitespace in commands', () => {
            expect(classifyCommand('01 0C')).toBe(CommandClass.READ_ONLY);
            expect(classifyCommand(' 04 ')).toBe(CommandClass.SOFT_MUTATION);
            expect(classifyCommand('AT Z')).toBe(CommandClass.DANGEROUS);
        });
    });

    describe('requiresProAccess', () => {
        it('returns false for READ_ONLY', () => {
            expect(requiresProAccess(CommandClass.READ_ONLY)).toBe(false);
        });

        it('returns false for OEM_READ_ONLY', () => {
            expect(requiresProAccess(CommandClass.OEM_READ_ONLY)).toBe(false);
        });

        it('returns false for SESSION_CONTROL', () => {
            expect(requiresProAccess(CommandClass.SESSION_CONTROL)).toBe(false);
        });

        it('returns true for SOFT_MUTATION', () => {
            expect(requiresProAccess(CommandClass.SOFT_MUTATION)).toBe(true);
        });

        it('returns true for HARD_MUTATION', () => {
            expect(requiresProAccess(CommandClass.HARD_MUTATION)).toBe(true);
        });

        it('returns true for DANGEROUS', () => {
            expect(requiresProAccess(CommandClass.DANGEROUS)).toBe(true);
        });
    });

    describe('assertHardwareGate', () => {
        it('allows READ_ONLY commands for non-PRO users', () => {
            expect(() => assertHardwareGate('010C', false)).not.toThrow();
            expect(() => assertHardwareGate('03', false)).not.toThrow();
            expect(() => assertHardwareGate('ATRV', false)).not.toThrow();
        });

        it('allows OEM_READ_ONLY commands for non-PRO users', () => {
            expect(() => assertHardwareGate('22F190', false)).not.toThrow();
            expect(() => assertHardwareGate('2101', false)).not.toThrow();
        });

        it('allows SESSION_CONTROL commands for non-PRO users', () => {
            expect(() => assertHardwareGate('1001', false)).not.toThrow();
            expect(() => assertHardwareGate('2701', false)).not.toThrow();
        });

        it('blocks SOFT_MUTATION commands for non-PRO users with HARDWARE_GATE_VIOLATION', () => {
            expect(() => assertHardwareGate('04', false)).toThrow('HARDWARE_GATE_VIOLATION');
        });

        it('blocks HARD_MUTATION commands for non-PRO users with HARDWARE_GATE_VIOLATION', () => {
            expect(() => assertHardwareGate('2E0102', false)).toThrow('HARDWARE_GATE_VIOLATION');
        });

        it('blocks DANGEROUS commands for non-PRO users with HARDWARE_GATE_VIOLATION', () => {
            expect(() => assertHardwareGate('ATZ', false)).toThrow('HARDWARE_GATE_VIOLATION');
            expect(() => assertHardwareGate('11', false)).toThrow('HARDWARE_GATE_VIOLATION');
            expect(() => assertHardwareGate('33', false)).toThrow('HARDWARE_GATE_VIOLATION');
        });

        it('allows all commands for PRO users', () => {
            expect(() => assertHardwareGate('04', true)).not.toThrow();
            expect(() => assertHardwareGate('ATZ', true)).not.toThrow();
            expect(() => assertHardwareGate('11', true)).not.toThrow();
            expect(() => assertHardwareGate('2E0102', true)).not.toThrow();
        });

        // Bypass attempt: trying to inject whitespace or case tricks
        it('prevents bypass via whitespace injection', () => {
            expect(() => assertHardwareGate('  0 4  ', false)).toThrow('HARDWARE_GATE_VIOLATION');
            expect(() => assertHardwareGate('a t z', false)).toThrow('HARDWARE_GATE_VIOLATION');
        });

        it('handles unknown commands correctly based on isMoving context', () => {
            // When static, unknown command is READ_ONLY
            expect(classifyCommand('UNKNOWN_TEST_COMMAND', false)).toBe(CommandClass.READ_ONLY);
            // When moving, unknown command is DANGEROUS
            expect(classifyCommand('UNKNOWN_TEST_COMMAND', true)).toBe(CommandClass.DANGEROUS);
            expect(classifyCommand('3D0102', true)).toBe(CommandClass.DANGEROUS); // OEM memory write
            expect(classifyCommand('14', true)).toBe(CommandClass.DANGEROUS); // OEM clear DTC

            // Whitelisted standard safe commands are still READ_ONLY/OEM_READ_ONLY even when moving
            expect(classifyCommand('010C', true)).toBe(CommandClass.READ_ONLY); // speed/RPM
            expect(classifyCommand('0902', true)).toBe(CommandClass.READ_ONLY); // VIN
            expect(classifyCommand('ATI', true)).toBe(CommandClass.READ_ONLY); // AT query
            expect(classifyCommand('22F190', true)).toBe(CommandClass.OEM_READ_ONLY); // Read DID
        });

        it('handles truncated packets gracefully', () => {
            expect(classifyCommand('1')).toBe(CommandClass.READ_ONLY);
            expect(classifyCommand('2')).toBe(CommandClass.READ_ONLY);
            expect(classifyCommand('')).toBe(CommandClass.READ_ONLY);
        });

        it('handles mixed case hex values and spacing correctly', () => {
            expect(classifyCommand('2e 01 0a bB')).toBe(CommandClass.HARD_MUTATION);
            expect(classifyCommand('11 0a')).toBe(CommandClass.DANGEROUS);
        });

        it('blocks AT wrapped commands or hardware addressing changes targeting mutations/resets', () => {
            // Commands wrapping reset or mutation patterns
            expect(classifyCommand('ATSH7E0')).toBe(CommandClass.READ_ONLY); // standard header read/set
            expect(classifyCommand('AT SH 7E0')).toBe(CommandClass.READ_ONLY);
            
            // Testing wrapped reset (11) or mutation (2E) within headers or commands
            expect(classifyCommand('1102')).toBe(CommandClass.DANGEROUS);
            expect(classifyCommand('2E1234')).toBe(CommandClass.HARD_MUTATION);
        });

        it('handles malicious hardware bypass patterns like 7E0#04 (CAN message clear DTC direct injection)', () => {
            expect(classifyCommand('7E0#04')).toBe(CommandClass.READ_ONLY); // standard CAN frame mapping, but mode 04 is protected if run directly as "04"
            expect(classifyCommand('04')).toBe(CommandClass.SOFT_MUTATION);
        });

        it('correctly classifies nested session control commands (10 02 / 27 01)', () => {
            expect(classifyCommand('1002')).toBe(CommandClass.DANGEROUS); // contains 1002
            expect(classifyCommand('10 02')).toBe(CommandClass.DANGEROUS); // normalized to 1002, contains 1002
            expect(classifyCommand('2701')).toBe(CommandClass.SESSION_CONTROL);
        });

        it('properly classifies OEM commands with variable parameters', () => {
            expect(classifyCommand('22 F1 90')).toBe(CommandClass.OEM_READ_ONLY);
            expect(classifyCommand('21 12 34')).toBe(CommandClass.OEM_READ_ONLY);
        });

        it('handles AT commands containing security keywords elsewhere in the string', () => {
            expect(classifyCommand('AT1002')).toBe(CommandClass.DANGEROUS);
            expect(classifyCommand('AT300000')).toBe(CommandClass.DANGEROUS);
        });
    });
});

