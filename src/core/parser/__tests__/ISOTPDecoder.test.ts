import ISOTPDecoder from '../ISOTPDecoder';

describe('ISOTPDecoder Unit Tests', () => {
    test('1. Decodes a single frame (SF) payload correctly', () => {
        const response = ISOTPDecoder.decode(['04 41 0C 1A 2B']); // PCI: 0, Len: 4, Payload: 410C1A2B
        expect(response).toBe('41 0C 1A 2B');
    });

    test('2. Strips 11-bit engine CAN header (7E8) before decoding', () => {
        const response = ISOTPDecoder.decode(['7E8 04 41 0C 1A 2B']);
        expect(response).toBe('41 0C 1A 2B');
    });

    test('3. Ignores 11-bit non-engine CAN frames (7E9 - 7EF)', () => {
        const response = ISOTPDecoder.decode([
            '7E9 04 41 0C 1A 2B', // ignored
            '7E8 03 41 0D AA'     // processed
        ]);
        expect(response).toBe('41 0D AA');
    });

    test('4. Strips 29-bit CAN header (18DAF110) before decoding', () => {
        const response = ISOTPDecoder.decode(['18DAF110 04 41 0C 1A 2B']);
        expect(response).toBe('41 0C 1A 2B');
    });

    test('5. Discards other 29-bit CAN headers (starting with 18DAF1 but not 18DAF110)', () => {
        const response = ISOTPDecoder.decode([
            '18DAF120 04 41 0C 1A 2B', // ignored
            '18DAF110 03 41 0D AA'     // processed
        ]);
        expect(response).toBe('41 0D AA');
    });

    test('6. Strips line prefixes (like "0:") commonly sent by ELM scanners', () => {
        const response = ISOTPDecoder.decode([
            '7E8 0: 10 0A 41 0C 11 22 33 44',
            '7E8 1: 21 55 66 77 88'
        ]);
        expect(response).toBe('41 0C 11 22 33 44 55 66 77 88');
    });

    test('7. Assembles Multi-frame (FF + CF) payload successfully', () => {
        const response = ISOTPDecoder.decode([
            '7E8 10 0A 41 0C 11 22 33 44', // FF: length 10 (0x0A bytes = 20 hex chars), payload: 410C11223344 (6 bytes)
            '7E8 21 55 66 77 88'           // CF: seq 1, payload: 55667788 (4 bytes)
        ]);
        expect(response).toBe('41 0C 11 22 33 44 55 66 77 88');
    });

    test('8. Truncates accumulated payload to match FF length indicator', () => {
        const response = ISOTPDecoder.decode([
            '7E8 10 04 41 02 03 04', // FF: length 4 (8 hex chars), payload: 41020304 (4 bytes)
            '7E8 21 05 06 07 08'     // CF: seq 1, ignored or truncated since length is met
        ]);
        expect(response).toBe('41 02 03 04');
    });

    test('9. Ignores Flow Control (FC) frames (pciType 3)', () => {
        const response = ISOTPDecoder.decode([
            '7E8 30 00 00 00',    // Flow Control: Ignored
            '7E8 03 41 0D AA'     // Single Frame
        ]);
        expect(response).toBe('41 0D AA');
    });

    test('10. Processes non-standard/unmarked PCI frames as raw hex lines', () => {
        const response = ISOTPDecoder.decode([
            '41 0C 11 22',
            '41 0D 33 44'
        ]);
        expect(response).toBe('41 0C 11 22 41 0D 33 44');
    });

    test('11. Discards corrupt buffer when Consecutive Frame (CF) is out-of-order', () => {
        const response = ISOTPDecoder.decode([
            '7E8 10 0A 41 0C 11 22 33 44', // FF: seq expected next is 1
            '7E8 23 55 66 77 88'           // CF: seq 3 (out of order, expected 1) -> buffer discarded
        ]);
        expect(response).toBe('');
    });

    test('12. Omits incomplete multi-frame payloads if stream ends before total length is met', () => {
        const response = ISOTPDecoder.decode([
            '7E8 10 0F 41 0C 11 22 33 44', // FF: length 15 (0x0F)
            '7E8 21 55 66 77 88'           // CF: seq 1, total accumulated length 10 bytes < 15 bytes
        ]);
        expect(response).toBe('');
    });

    test('13. Correctly handles sequence number wraparound (0x0F -> 0x00)', () => {
        // Construct a long multi-frame with 17 CF frames to test 0xF -> 0x0 seq wraparound
        const frames = ['7E8 10 74 41 0C 00 00 00 00']; // FF: 116 bytes (232 hex chars), 6 bytes in FF
        let seq = 1;
        // Need 110 more bytes -> 16 CF frames (16 * 7 = 112 bytes)
        for (let i = 0; i < 16; i++) {
            const seqHex = seq.toString(16).toUpperCase();
            frames.push(`7E8 2${seqHex} 11 22 33 44 55 66 77`);
            seq = (seq + 1) % 16;
        }
        const response = ISOTPDecoder.decode(frames);
        expect(response).not.toBe('');
        expect(response.startsWith('41 0C')).toBe(true);
    });
});

