/**
 * DoipTransport.ts
 * 
 * MotoCortex ISO 13400 (DoIP - Diagnostics over IP) Transport Layer.
 * Provides high-speed Ethernet/IP diagnostic payload encapsulation for modern vehicles.
 */

import * as Logger from '../../services/Logger';

export enum DoipPayloadType {
    GENERIC_NACK = 0x0000,
    VEHICLE_IDENT_REQ = 0x0001,
    VEHICLE_IDENT_RES = 0x0004,
    ROUTING_ACTIVATION_REQ = 0x0005,
    ROUTING_ACTIVATION_RES = 0x0006,
    ALIVE_CHECK_REQ = 0x0007,
    ALIVE_CHECK_RES = 0x0008,
    DIAGNOSTIC_MESSAGE = 0x8001,
    DIAGNOSTIC_ACK = 0x8002,
    DIAGNOSTIC_NACK = 0x8003,
}

export interface DoipHeader {
    protocolVersion: number; // usually 0x02 for ISO 13400-2:2012
    inverseVersion: number;  // 0xFD
    payloadType: DoipPayloadType;
    payloadLength: number;
}

export interface DoipDiagnosticMessage {
    sourceAddress: number;       // e.g. 0x0E80 (Tester)
    targetAddress: number;       // e.g. 0x0001 or 0x1000 (ECU)
    userData: Uint8Array;        // UDS payload
}

export class DoipTransport {
    private static instance: DoipTransport | null = null;
    private isConnected: boolean = false;
    private testerAddress: number = 0x0E80;
    private targetEcuAddress: number = 0x0001;

    public static getInstance(): DoipTransport {
        if (!DoipTransport.instance) {
            DoipTransport.instance = new DoipTransport();
        }
        return DoipTransport.instance;
    }

    /**
     * Builds a standard DoIP message frame.
     */
    public encodeMessage(payloadType: DoipPayloadType, payload: Uint8Array): Uint8Array {
        const header = new Uint8Array(8);
        header[0] = 0x02; // ISO 13400-2
        header[1] = 0xFD; // Inverse version
        header[2] = (payloadType >> 8) & 0xFF;
        header[3] = payloadType & 0xFF;
        header[4] = (payload.length >> 24) & 0xFF;
        header[5] = (payload.length >> 16) & 0xFF;
        header[6] = (payload.length >> 8) & 0xFF;
        header[7] = payload.length & 0xFF;

        const frame = new Uint8Array(8 + payload.length);
        frame.set(header, 0);
        frame.set(payload, 8);
        return frame;
    }

    /**
     * Encodes a UDS diagnostic request over DoIP.
     */
    public encodeDiagnosticMessage(targetEcu: number, udsPayload: Uint8Array): Uint8Array {
        const payload = new Uint8Array(4 + udsPayload.length);
        payload[0] = (this.testerAddress >> 8) & 0xFF;
        payload[1] = this.testerAddress & 0xFF;
        payload[2] = (targetEcu >> 8) & 0xFF;
        payload[3] = targetEcu & 0xFF;
        payload.set(udsPayload, 4);

        return this.encodeMessage(DoipPayloadType.DIAGNOSTIC_MESSAGE, payload);
    }

    /**
     * Decodes a received DoIP frame.
     */
    public decodeFrame(data: Uint8Array): { header: DoipHeader; payload: Uint8Array } | null {
        if (data.length < 8) return null;

        const protocolVersion = data[0];
        const inverseVersion = data[1];
        const payloadType = (data[2] << 8) | data[3];
        const payloadLength = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7];

        if (protocolVersion + inverseVersion !== 0xFF) {
            Logger.log('DOIP', `[WARN] Invalid DoIP header inverse version: 0x${protocolVersion.toString(16)} / 0x${inverseVersion.toString(16)}`);
            return null;
        }

        const payload = data.slice(8, 8 + payloadLength);
        return {
            header: {
                protocolVersion,
                inverseVersion,
                payloadType,
                payloadLength,
            },
            payload
        };
    }

    public setTargetEcu(address: number): void {
        this.targetEcuAddress = address;
    }

    public setTesterAddress(address: number): void {
        this.testerAddress = address;
    }
}

export const doipTransport = DoipTransport.getInstance();
