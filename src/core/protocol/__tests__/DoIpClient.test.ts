import { DoIpClient } from '../DoIpClient';

describe('DoIpClient', () => {
    test('should construct valid DoIP header packet', () => {
        const packet = DoIpClient.createDoIpPacket(0x0005, [0x0E, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
        expect(packet[0]).toBe(0x02); // ISO 13400-2 Version
        expect(packet[1]).toBe(0xFD); // Inverse Version
        expect(packet[2]).toBe(0x00); // Payload Type High
        expect(packet[3]).toBe(0x05); // Payload Type Low (Routing Activation)
    });

    test('should parse diagnostic message payload', () => {
        const client = new DoIpClient();
        // DoIP header (8 bytes) + UDS payload (source 2B, target 2B, UDS 2B)
        const packet = [0x02, 0xFD, 0x80, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x01, 0x0E, 0x80, 0x62, 0x0C];
        const parsed = client.parsePacket(packet);

        expect(parsed).not.toBeNull();
        expect(parsed?.payloadType).toBe(0x8001);
        expect(parsed?.udsPayload).toEqual([0x62, 0x0C]);
    });
});
