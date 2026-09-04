import KWPFrameDecoder from '../KWPFrameDecoder';

describe('KWPFrameDecoder Unit Tests', () => {
    test('1. Decodes a valid KWP frame with format byte only (no target/source)', () => {
        // fmt = 0x82 (fmtLen = 2, hasTargetAndSource = false, headerLen = 1)
        // payload = 0x41, 0x0C
        // CS = (0x82 + 0x41 + 0x0C) & 0xFF = 0xCF
        const response = KWPFrameDecoder.decode(['82 41 0C CF']);
        expect(response).toBe('41 0C');
    });

    test('2. Decodes a valid KWP frame with target/source addresses', () => {
        // fmt = 0xC2 (hasTargetAndSource = true, headerLen = 3)
        // Header bytes: 0xC2, 0xF1, 0x11
        // Payload: 0x41, 0x0C
        // CS = (0xC2 + 0xF1 + 0x11 + 0x41 + 0x0C) & 0xFF = 0x11
        const response = KWPFrameDecoder.decode(['C2 F1 11 41 0C 11']);
        expect(response).toBe('41 0C');
    });

    test('3. Decodes KWP frame with target/source and extra length byte', () => {
        // fmt = 0xC0 (fmtLen = 0 -> headerLen + 1 for length byte, hasTargetAndSource = true)
        // Header bytes: 0xC0 (fmt), 0xF1 (target), 0x11 (source), 0x02 (length) -> headerLen = 4
        // Payload: 0x41, 0x0C
        // CS = (0xC0 + 0xF1 + 0x11 + 0x02 + 0x41 + 0x0C) & 0xFF = 0x11
        const response = KWPFrameDecoder.decode(['C0 F1 11 02 41 0C 11']);
        expect(response).toBe('41 0C');
    });

    test('4. Drops frame when checksum mismatch occurs', () => {
        // Correct frame: '82 41 0C CF'
        // Corrupt checksum: '82 41 0C 99'
        const response = KWPFrameDecoder.decode(['82 41 0C 99']);
        expect(response).toBe('');
    });

    test('5. Processes multiple valid KWP frames and joins them', () => {
        const response = KWPFrameDecoder.decode([
            '82 41 0C CF', // 41 0C
            '82 41 0D D0'  // 41 0D
        ]);
        expect(response).toBe('41 0C 41 0D');
    });

    test('6. Skips lines that are empty or too short', () => {
        const response = KWPFrameDecoder.decode([
            '',
            '02',
            '82 41 0C CF'
        ]);
        expect(response).toBe('41 0C');
    });

    test('7. Handles frame without enough bytes for expected header size (retains raw bytes)', () => {
        const response = KWPFrameDecoder.decode(['C2 F1']);
        expect(response).toBe('C2 F1');
    });

    test('8. Handles KWP format 0x80 with no target/source when conditions not met', () => {
        // fmt = 0x80 -> hasTargetAndSource is false. headerLen = 1.
        // fmtLen = 0x80 & 0x3F = 0. Since fmtLen === 0, headerLen is incremented to 2.
        // bytes = [0x80, 0x02, 0x41, 0x0C, CS]
        // CS: (0x80 + 0x02 + 0x41 + 0x0C) & 0xFF = 0xCF
        const response = KWPFrameDecoder.decode(['80 02 41 0C CF']);
        expect(response).toBe('41 0C');
    });

    test('9. Decodes slow init wake-up responses correctly', () => {
        const response = KWPFrameDecoder.decode(['55 EF 8F']);
        expect(response).toBe('55 EF 8F');
    });

    test('10. Drops frames with partial or missing checksum bytes', () => {
        // fmt = 0x82, needs 1 header + 2 payload + 1 CS = 4 bytes.
        // If we only give 3 bytes: 82 41 0C
        // Calculated CS for [82, 41] is 0xC3, but last byte is 0x0C. Mismatch! Thus, drops it.
        const response = KWPFrameDecoder.decode(['82 41 0C']);
        expect(response).toBe('');
    });

    test('11. Preserves ATH0 application responses (e.g. 41 0C 0C 6C RPM 795 on K-Line)', () => {
        const response = KWPFrameDecoder.decode(['41 0C 0C 6C']);
        expect(response).toBe('41 0C 0C 6C');
    });

    test('12. Preserves UDS application responses (e.g. 62 F1 90 ...)', () => {
        const response = KWPFrameDecoder.decode(['62 F1 90 55 55 31']);
        expect(response).toBe('62 F1 90 55 55 31');
    });
});
