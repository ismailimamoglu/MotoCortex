/**
 * CommandClassificationRegistry
 * 
 * Enum-based OBD command classification replacing hardcoded opcode blacklists.
 * Every raw command from diagnostics pipeline or terminal is normalized and
 * classified before reaching the hardware transport layer.
 * 
 * Classification tiers:
 *   READ_ONLY       — Telemetry reads, DTC reads, VIN/CalID queries, AT queries
 *   ADAPTER_CONTROL — Adapter reset/config commands (ATZ, ATWS, ATE0, ATSP, etc.)
 *   MUTATING        — DTC clearing (Mode 04), ECU write operations (Mode 2E)
 *   DANGEROUS       — ECU Reset (Mode 11), Adaptation routines (Mode 33)
 */

export enum CommandClass {
    READ_ONLY = 'READ_ONLY',
    OEM_READ_ONLY = 'OEM_READ_ONLY',
    ADAPTER_CONTROL = 'ADAPTER_CONTROL',
    SESSION_CONTROL = 'SESSION_CONTROL',
    SOFT_MUTATION = 'SOFT_MUTATION',
    HARD_MUTATION = 'HARD_MUTATION',
    DANGEROUS = 'DANGEROUS',
}

/**
 * Handshake Whitelist — commands that must NEVER be blocked by PRO gate.
 * These are adapter-only reset/config commands and initial ECU probes
 * required to establish any OBD2 connection. None of these write to
 * or modify the vehicle ECU.
 * 
 * Global best practice: ATZ→ATE0→ATL0→ATH1→ATS0→ATSTFF→ATSP0→0100
 * Reference: ELM327 datasheet, python-OBD, Car Scanner, Infocar
 */
const HANDSHAKE_WHITELIST = new Set([
    // Adapter reset & warm start
    'ATZ', 'ATWS',
    // Echo, linefeed, spaces, headers
    'ATE0', 'ATE1', 'ATL0', 'ATL1', 'ATH0', 'ATH1', 'ATS0', 'ATS1',
    // Timing & adaptive timing
    'ATSTFF', 'ATST32', 'ATAT0', 'ATAT1', 'ATAT2',
    // Protocol selection (all variants)
    'ATSP0', 'ATSP1', 'ATSP2', 'ATSP3', 'ATSP4', 'ATSP5',
    'ATSP6', 'ATSP7', 'ATSP8', 'ATSP9', 'ATSPA', 'ATSPB', 'ATSPC',
    // Protocol query & cancel
    'ATDP', 'ATDPN', 'ATPC',
    // Adapter info & voltage
    'ATI', 'ATRV', 'ATCV', 'AT@1',
    // CAN header & flow control
    'ATSH7E0', 'ATSH7DF', 'ATCRA', 'ATCFC0', 'ATCFC1',
    // K-Line / ISO init helpers
    'ATBI', 'ATSI',
    // Initial ECU probes (read-only, never modify vehicle)
    '0100', '0902',
]);

/**
 * Returns true if the normalized command matches the handshake whitelist.
 * Supports both exact matches and prefix matches for parameterized commands.
 */
function isHandshakeWhitelisted(normalizedCmd: string): boolean {
    if (HANDSHAKE_WHITELIST.has(normalizedCmd)) return true;
    // Prefix matches for parameterized AT commands (ATSH*, ATSP*, ATST*, ATIB*, ATIIA*, ATCRA*)
    const HANDSHAKE_PREFIXES = ['ATSH', 'ATSP', 'ATST', 'ATIB', 'ATIIA', 'ATCRA', 'ATFC'];
    return HANDSHAKE_PREFIXES.some(prefix => normalizedCmd.startsWith(prefix));
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
 *   ADAPTER_CONTROL:
 *     - ATZ, ATWS (Adapter reset — does NOT touch vehicle ECU)
 *   DANGEROUS:
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
export function classifyCommand(rawCmd: string, isMoving: boolean = false): CommandClass {
    const cmd = normalizeCommand(rawCmd);

    // 1. ADAPTER_CONTROL — ATZ/ATWS are adapter resets, not ECU commands
    if (cmd === 'ATZ' || cmd === 'ATWS') return CommandClass.ADAPTER_CONTROL;

    // 2. DANGEROUS checks (ECU-level dangerous operations)
    if (cmd.startsWith('11')) return CommandClass.DANGEROUS;
    if (cmd.startsWith('33')) return CommandClass.DANGEROUS;
    if (cmd.includes('1002')) return CommandClass.DANGEROUS;
    if (cmd === '300000') return CommandClass.READ_ONLY; // ISO-TP Flow Control frame
    if (cmd.includes('300000')) return CommandClass.DANGEROUS;

    // 3. HARD_MUTATION checks
    if (cmd.startsWith('2E')) return CommandClass.HARD_MUTATION;

    // 4. SOFT_MUTATION checks
    if (cmd === '04') return CommandClass.SOFT_MUTATION;

    // 5. SESSION_CONTROL checks
    if (cmd.startsWith('10')) return CommandClass.SESSION_CONTROL;
    if (cmd.startsWith('27')) return CommandClass.SESSION_CONTROL;

    // 6. OEM_READ_ONLY checks (prevent false positive hardware violations for reading manufacturer parameters)
    if (cmd.startsWith('22')) return CommandClass.OEM_READ_ONLY;
    if (cmd.startsWith('21')) return CommandClass.OEM_READ_ONLY;

    // 7. Whitelist of safe commands when moving
    const isStandardSafe = 
        cmd.startsWith('01') || 
        cmd.startsWith('02') || 
        cmd.startsWith('03') || 
        cmd.startsWith('07') || 
        cmd.startsWith('09') || 
        cmd.startsWith('0A') ||
        cmd.startsWith('AT');

    if (isStandardSafe) {
        return CommandClass.READ_ONLY;
    }

    // 8. Context-Aware Fallback
    if (isMoving) {
        // If vehicle is in motion, any unknown command is treated as DANGEROUS to protect passenger safety!
        return CommandClass.DANGEROUS;
    }

    // Otherwise, standard fallback for static diagnostics (for flexibility)
    return CommandClass.READ_ONLY;
}

/**
 * Returns true if the given command class requires PRO access.
 * ADAPTER_CONTROL is explicitly excluded — adapter reset/config must always work.
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
 * Handshake Whitelist: Commands in HANDSHAKE_WHITELIST always pass through
 * regardless of PRO status. This ensures adapter initialization and basic
 * ECU probing (0100, 0902) are never blocked.
 * 
 * This is the Layer 3 (hardware) security gate — the last line of defense
 * before bytes hit the OBD transport wire.
 */
export function assertHardwareGate(
    rawCmd: string,
    isPro: boolean,
    isMoving: boolean = false,
    customVoltageStr?: string,
    isFreeTrialAllowed: boolean = false
): void {
    const normalizedCmd = normalizeCommand(rawCmd);

    // Handshake whitelist bypass — these commands must ALWAYS work for connection
    if (isHandshakeWhitelisted(normalizedCmd)) return;

    const cls = classifyCommand(rawCmd, isMoving);
    if (requiresProAccess(cls) && !isPro && !isFreeTrialAllowed) {
        throw new Error('HARDWARE_GATE_VIOLATION');
    }

    if (cls === CommandClass.HARD_MUTATION || cls === CommandClass.DANGEROUS) {
        let voltageVal: number | null = null;

        if (customVoltageStr) {
            const parsed = parseFloat(customVoltageStr.replace(/[^\d.]/g, ''));
            if (!isNaN(parsed)) voltageVal = parsed;
        } else {
            try {
                const { useBluetoothStore } = require('../../store/useBluetoothStore');
                const storeVoltage = useBluetoothStore.getState().voltage;
                if (storeVoltage) {
                    const parsed = parseFloat(storeVoltage.replace(/[^\d.]/g, ''));
                    if (!isNaN(parsed)) voltageVal = parsed;
                }
            } catch (e) {}
        }

        if (voltageVal !== null && voltageVal < 11.8 && voltageVal > 0) {
            throw new Error('BATTERY_VOLTAGE_LOW');
        }
    }
}

/**
 * Returns true if the command is classified as DANGEROUS or HARD_MUTATION
 * and requires explicit user confirmation modal before execution.
 */
export function requiresConfirmationModal(rawCmd: string): boolean {
    const cls = classifyCommand(rawCmd, false);
    return cls === CommandClass.DANGEROUS || cls === CommandClass.HARD_MUTATION;
}


