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
});
