/**
 * CommandClassificationRegistry
 * 
 * Enum-based OBD command classification replacing hardcoded opcode blacklists.
 * Every raw command from diagnostics pipeline or terminal is normalized and
 * classified before reaching the hardware transport layer.
 * 
 * Classification tiers:
 *   READ_ONLY  — Telemetry reads, DTC reads, VIN/CalID queries, AT commands
 *   MUTATING   — DTC clearing (Mode 04), ECU write operations (Mode 2E)
 *   DANGEROUS  — ECU Reset (Mode 11), Adaptation routines (Mode 22/33), ATZ
 */

export enum CommandClass {
    READ_ONLY = 'READ_ONLY',
    OEM_READ_ONLY = 'OEM_READ_ONLY',
    SESSION_CONTROL = 'SESSION_CONTROL',
    SOFT_MUTATION = 'SOFT_MUTATION',
    HARD_MUTATION = 'HARD_MUTATION',
    DANGEROUS = 'DANGEROUS',
}

/**
 * Normalizes a raw OBD command string to uppercase with whitespace stripped.
 */
export function normalizeCommand(raw: string): string {
    return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * Classifies a raw OBD command into its security tier.
 * 
 * Classification rules (evaluated in order of specificity):
 *   DANGEROUS:
 *     - ATZ (Adapter hard reset)
 *     - Mode 11 (ECU Reset)
 *     - Mode 33 (Adaptation write / routine control)
 *     - Commands containing security access patterns (1002, 300000)
 *   HARD_MUTATION:
 *     - Mode 2E (Write Data By Identifier)
 *   SOFT_MUTATION:
 *     - Mode 04 (Clear DTC)
 *   SESSION_CONTROL:
 *     - Mode 10 (Diagnostic Session Control)
 *     - Mode 27 (Security Access)
 *   OEM_READ_ONLY:
 *     - Mode 22 (Read Data By Identifier)
 *     - Mode 21 (Read Data By Local Identifier)
 *   READ_ONLY:
 *     - Everything else (Mode 01, 03, 09, AT queries, etc.)
 */
export function classifyCommand(rawCmd: string): CommandClass {
    const cmd = normalizeCommand(rawCmd);

    // 1. DANGEROUS checks (highest priority)
    if (cmd === 'ATZ') return CommandClass.DANGEROUS;
    if (cmd.startsWith('11')) return CommandClass.DANGEROUS;
    if (cmd.startsWith('33')) return CommandClass.DANGEROUS;
    if (cmd.includes('1002')) return CommandClass.DANGEROUS;
    if (cmd.includes('300000')) return CommandClass.DANGEROUS;

    // 2. HARD_MUTATION checks
    if (cmd.startsWith('2E')) return CommandClass.HARD_MUTATION;

    // 3. SOFT_MUTATION checks
    if (cmd === '04') return CommandClass.SOFT_MUTATION;

    // 4. SESSION_CONTROL checks
    if (cmd.startsWith('10')) return CommandClass.SESSION_CONTROL;
    if (cmd.startsWith('27')) return CommandClass.SESSION_CONTROL;

    // 5. OEM_READ_ONLY checks (prevent false positive hardware violations for reading manufacturer parameters)
    if (cmd.startsWith('22')) return CommandClass.OEM_READ_ONLY;
    if (cmd.startsWith('21')) return CommandClass.OEM_READ_ONLY;

    // 6. Everything else is standard READ_ONLY (Mode 01, 03, 09, generic AT commands)
    return CommandClass.READ_ONLY;
}

/**
 * Returns true if the given command class requires PRO access.
 */
export function requiresProAccess(cls: CommandClass): boolean {
    return (
        cls === CommandClass.SOFT_MUTATION ||
        cls === CommandClass.HARD_MUTATION ||
        cls === CommandClass.DANGEROUS
    );
}

/**
 * Hardware gate assertion. Throws HARDWARE_GATE_VIOLATION if the command
 * requires PRO access and the user is not PRO.
 * 
 * This is the Layer 3 (hardware) security gate — the last line of defense
 * before bytes hit the OBD transport wire.
 */
export function assertHardwareGate(rawCmd: string, isPro: boolean): void {
    const cls = classifyCommand(rawCmd);
    if (requiresProAccess(cls) && !isPro) {
        throw new Error('HARDWARE_GATE_VIOLATION');
    }
}

