/**
 * ISO 13400 DoIP (Diagnostic over IP) Client — MotoCortex Core
 * ----------------------------------------------------------------------
 * Provides DoIP vehicle discovery (UDP 13400) and TCP diagnostic session management
 * for modern Euro 6d / Euro 7 vehicles (BMW G-Series, VAG MLBevo/MEB, Volvo SPA).
 */

export interface DoIpVehicleAnnouncement {
    vin: string;
    logicalAddress: number;
    eid: string;
    gid: string;
    ipAddress: string;
}

export type DoIpState = 'DISCONNECTED' | 'ROUTING_ACTIVATION_PENDING' | 'CONNECTED' | 'ERROR';

export class DoIpClient {
    private state: DoIpState = 'DISCONNECTED';
    private targetIp: string | null = null;
    private targetLogicalAddress: number = 0x0E80; // Default tester logical address (0x0E80)
    private ecuLogicalAddress: number = 0x0001;    // Default primary ECU address (0x0001)

    /**
     * Builds ISO 13400 DoIP Header + Payload byte array
     */
    public static createDoIpPacket(payloadType: number, payload: number[]): number[] {
        const protocolVersion = 0x02; // ISO 13400-2:2012
        const inverseVersion = 0xFD;
        const payloadLength = payload.length;

        const header = [
            protocolVersion,
            inverseVersion,
            (payloadType >> 8) & 0xFF,
            payloadType & 0xFF,
            (payloadLength >> 24) & 0xFF,
            (payloadLength >> 16) & 0xFF,
            (payloadLength >> 8) & 0xFF,
            payloadLength & 0xFF
        ];

        return [...header, ...payload];
    }

    /**
     * Builds Routing Activation Request packet (Type 0x0005)
     */
    public buildRoutingActivationRequest(activationType: number = 0x00): number[] {
        const payload = [
            (this.targetLogicalAddress >> 8) & 0xFF,
            this.targetLogicalAddress & 0xFF,
            activationType,
            0x00, 0x00, 0x00, 0x00 // 4 Reserved bytes
        ];

        return DoIpClient.createDoIpPacket(0x0005, payload);
    }

    /**
     * Builds Diagnostic Message packet (Type 0x8001) carrying UDS payload
     */
    public buildDiagnosticMessage(udsPayloadBytes: number[]): number[] {
        const payload = [
            (this.targetLogicalAddress >> 8) & 0xFF,
            this.targetLogicalAddress & 0xFF,
            (this.ecuLogicalAddress >> 8) & 0xFF,
            this.ecuLogicalAddress & 0xFF,
            ...udsPayloadBytes
        ];

        return DoIpClient.createDoIpPacket(0x8001, payload);
    }

    /**
     * Parses incoming DoIP packet and extracts UDS response payload if Type 0x8001
     */
    public parsePacket(packetBytes: number[]): { payloadType: number; udsPayload?: number[] } | null {
        if (!packetBytes || packetBytes.length < 8) return null;

        const payloadType = (packetBytes[2] << 8) | packetBytes[3];
        const payloadLength = (packetBytes[4] << 24) | (packetBytes[5] << 16) | (packetBytes[6] << 8) | packetBytes[7];

        if (packetBytes.length < 8 + payloadLength) return null;

        const payload = packetBytes.slice(8, 8 + payloadLength);

        if (payloadType === 0x8001 && payload.length >= 4) {
            // Remove source (2B) and target (2B) logical addresses to return raw UDS response
            const udsPayload = payload.slice(4);
            return { payloadType, udsPayload };
        }

        return { payloadType };
    }

    public getState(): DoIpState {
        return this.state;
    }

    public setState(nextState: DoIpState): void {
        this.state = nextState;
    }
}
