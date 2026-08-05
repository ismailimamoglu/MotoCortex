/**
 * SAE J1939 Heavy Duty Vehicle Frame & Parameter Parser — MotoCortex Core
 * ----------------------------------------------------------------------
 * Parses 29-bit Extended CAN Identifier frames into PGN (Parameter Group Number),
 * Priority, Source Address, Destination Address, and SPN (Suspect Parameter Number) values.
 */

export interface J1939Frame {
    rawCanIdHex: string;
    priority: number;
    pgn: number;
    sourceAddress: number;
    destinationAddress?: number;
    isBroadcast: boolean;
    dataBytes: number[];
    timestampMs: number;
}

export interface J1939SpnValue {
    spn: number;
    name: string;
    value: number;
    unit: string;
}

export class J1939Parser {
    /**
     * Common SAE J1939 PGN definitions
     */
    public static PGN_ELECTRONIC_ENGINE_CONTROLLER_1 = 61444; // EEC1 (RPM, Torque)
    public static PGN_ELECTRONIC_ENGINE_CONTROLLER_2 = 61443; // EEC2 (Throttle, Accelerator Pedal)
    public static PGN_CRUISE_CONTROL_VEHICLE_SPEED = 65265;   // CCVS (Vehicle Speed)
    public static PGN_ENGINE_TEMPERATURE = 65262;             // ET1 (Coolant Temp, Oil Temp)
    public static PGN_DIAGNOSTIC_DM1 = 65226;                  // Active Diagnostic Trouble Codes

    /**
     * Parses 29-bit CAN ID (e.g. 0x18FEE000) into J1939 Header fields.
     */
    public static parseHeader(canIdHex: string): { priority: number; pgn: number; sourceAddress: number; destinationAddress?: number } | null {
        const cleanHex = canIdHex.trim().replace(/^0x/i, '');
        const idVal = parseInt(cleanHex, 16);
        if (isNaN(idVal)) return null;

        const priority = (idVal >> 26) & 0x07;
        const dp = (idVal >> 24) & 0x01;
        const pf = (idVal >> 16) & 0xFF;
        const ps = (idVal >> 8) & 0xFF;
        const sourceAddress = idVal & 0xFF;

        let pgn: number;
        let destinationAddress: number | undefined;

        if (pf < 240) {
            // PDU1 Format (Peer-to-Peer)
            pgn = (dp << 16) | (pf << 8);
            destinationAddress = ps;
        } else {
            // PDU2 Format (Broadcast)
            pgn = (dp << 16) | (pf << 8) | ps;
        }

        return { priority, pgn, sourceAddress, destinationAddress };
    }

    /**
     * Parses raw J1939 CAN frame line.
     */
    public static parseFrame(rawLine: string): J1939Frame | null {
        if (!rawLine) return null;
        const parts = rawLine.trim().split(/\s+/);
        if (parts.length < 2) return null;

        const header = this.parseHeader(parts[0]);
        if (!header) return null;

        const dataBytes: number[] = [];
        for (let i = 1; i < parts.length; i++) {
            const b = parseInt(parts[i], 16);
            if (!isNaN(b)) dataBytes.push(b);
        }

        return {
            rawCanIdHex: parts[0],
            priority: header.priority,
            pgn: header.pgn,
            sourceAddress: header.sourceAddress,
            destinationAddress: header.destinationAddress,
            isBroadcast: header.destinationAddress === undefined,
            dataBytes,
            timestampMs: Date.now(),
        };
    }

    /**
     * Extracts SPN values from known J1939 PGN frames.
     */
    public static extractSpnValues(frame: J1939Frame): J1939SpnValue[] {
        const results: J1939SpnValue[] = [];
        const { pgn, dataBytes } = frame;

        if (pgn === this.PGN_ELECTRONIC_ENGINE_CONTROLLER_1 && dataBytes.length >= 8) {
            // SPN 190: Engine Speed (Bytes 4-5, 0.125 RPM/bit)
            const rawRpm = (dataBytes[4] << 8) | dataBytes[3];
            const rpm = Math.round(rawRpm * 0.125);
            results.push({ spn: 190, name: 'Engine Speed', value: rpm, unit: 'RPM' });
        } else if (pgn === this.PGN_ENGINE_TEMPERATURE && dataBytes.length >= 8) {
            // SPN 110: Engine Coolant Temperature (Byte 1, 1 deg C/bit, offset -40)
            const rawTemp = dataBytes[0];
            const tempC = rawTemp - 40;
            results.push({ spn: 110, name: 'Coolant Temperature', value: tempC, unit: '°C' });
        } else if (pgn === this.PGN_CRUISE_CONTROL_VEHICLE_SPEED && dataBytes.length >= 8) {
            // SPN 84: Wheel-Based Vehicle Speed (Bytes 2-3, 1/256 km/h/bit)
            const rawSpeed = (dataBytes[2] << 8) | dataBytes[1];
            const speedKmh = Math.round(rawSpeed / 256);
            results.push({ spn: 84, name: 'Vehicle Speed', value: speedKmh, unit: 'km/h' });
        }

        return results;
    }
}
