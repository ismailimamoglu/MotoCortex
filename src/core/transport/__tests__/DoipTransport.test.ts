import { DoipTransport, DoipPayloadType } from '../DoipTransport';

describe('DoipTransport (ISO 13400)', () => {
    let transport: DoipTransport;

    beforeEach(() => {
        transport = DoipTransport.getInstance();
    });

    it('should correctly encode and decode a generic DoIP header', () => {
        const payload = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
        const frame = transport.encodeMessage(DoipPayloadType.ROUTING_ACTIVATION_REQ, payload);

        expect(frame.length).toBe(8 + payload.length);
        expect(frame[0]).toBe(0x02); // ISO 13400-2
        expect(frame[1]).toBe(0xFD); // Inverse version

        const decoded = transport.decodeFrame(frame);
        expect(decoded).not.toBeNull();
        expect(decoded?.header.payloadType).toBe(DoipPayloadType.ROUTING_ACTIVATION_REQ);
        expect(decoded?.header.payloadLength).toBe(4);
        expect(decoded?.payload).toEqual(payload);
    });

    it('should encode diagnostic message with tester and target address', () => {
        const udsPayload = new Uint8Array([0x22, 0xF1, 0x90]); // Read VIN
        const frame = transport.encodeDiagnosticMessage(0x0001, udsPayload);

        const decoded = transport.decodeFrame(frame);
        expect(decoded).not.toBeNull();
        expect(decoded?.header.payloadType).toBe(DoipPayloadType.DIAGNOSTIC_MESSAGE);
        // Source (2 bytes) + Target (2 bytes) + UDS payload (3 bytes) = 7 bytes
        expect(decoded?.payload.length).toBe(7);
    });
});
