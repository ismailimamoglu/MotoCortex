import { CanFdParser } from '../CanFdParser';

describe('CanFdParser', () => {
    test('should parse raw hex CAN FD frame', () => {
        const rawLine = '7E8 0F 62 22 01 00 00 00 00 00 00 00 00 00 00 00 00';
        const frame = CanFdParser.parseFrame(rawLine);

        expect(frame).not.toBeNull();
        expect(frame?.canIdHex).toBe('7E8');
        expect(frame?.isExtendedId).toBe(false);
        expect(frame?.payloadLength).toBe(16);
        expect(frame?.isBrsActive).toBe(true);
    });

    test('should build STPX transmit command for STN2120', () => {
        const cmd = CanFdParser.buildTxCommand('7E0', [0x02, 0x01, 0x0C], true);
        expect(cmd).toBe('STPX h:7E0, d:02010C, BRS');
    });
});
