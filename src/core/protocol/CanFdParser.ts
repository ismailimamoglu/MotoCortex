/**
 * CAN FD (Flexible Data-rate) Frame Parser — MotoCortex Core
 * ----------------------------------------------------------------------
 * Parses ISO 11898-1:2015 extended 64-byte payload CAN FD frames
 * transmitted over STN2120, OBDLink MX+, or ELS27 high-speed adapters.
 */

export interface CanFdFrame {
    canIdHex: string;
    isExtendedId: boolean;
    dlc: number;
    payloadLength: number;
    payloadBytes: number[];
    isBrsActive: boolean; // Bit Rate Switch (up to 8 Mbps)
    esiFlag: boolean;     // Error State Indicator
    timestampMs: number;
}

export class CanFdParser {
    /**
     * Data Length Code (DLC) to byte length mapping table per ISO 11898-1 CAN FD spec
     */
    private static DLC_TO_LENGTH_MAP: Record<number, number> = {
        0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8,
        9: 12, 10: 16, 11: 20, 12: 24, 13: 32, 14: 48, 15: 64
    };

    /**
     * Parses raw adapter hex stream (e.g. STN2120 STPX response) into structured CanFdFrame.
     *
     * Example raw hex string: "7E8 0F 62 22 01 00 00 00 00 00 00 00 00 00 00 00 00"
     */
    public static parseFrame(rawHexLine: string): CanFdFrame | null {
        if (!rawHexLine || rawHexLine.trim().length === 0) return null;

        const tokens = rawHexLine.trim().split(/\s+/);
        if (tokens.length < 2) return null;

        const canIdHex = tokens[0].toUpperCase();
        const isExtendedId = canIdHex.length > 3;

        // Extract payload bytes
        const payloadBytes: number[] = [];
        for (let i = 1; i < tokens.length; i++) {
            const byteVal = parseInt(tokens[i], 16);
            if (!isNaN(byteVal)) {
                payloadBytes.push(byteVal);
            }
        }

        const actualLength = payloadBytes.length;
        let dlc = actualLength <= 8 ? actualLength : 8;

        // Map actual payload length back to closest CAN FD DLC code
        for (const [codeStr, len] of Object.entries(this.DLC_TO_LENGTH_MAP)) {
            if (len === actualLength) {
                dlc = parseInt(codeStr, 10);
                break;
            }
        }

        return {
            canIdHex,
            isExtendedId,
            dlc,
            payloadLength: actualLength,
            payloadBytes,
            isBrsActive: actualLength > 8,
            esiFlag: false,
            timestampMs: Date.now()
        };
    }

    /**
     * Formats outgoing CAN FD frame command for STN2120/OBDLink adapters (STPX command).
     */
    public static buildTxCommand(canIdHex: string, payloadBytes: number[], enableBrs: boolean = true): string {
        const payloadHex = payloadBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
        const brsFlag = enableBrs ? 'BRS' : 'NOBRS';
        return `STPX h:${canIdHex}, d:${payloadHex}, ${brsFlag}`;
    }
}
