export class KWPFrameDecoder {
    decode(lines: string[]): string {
        const processedPayloads: string[] = [];

        for (const line of lines) {
            const cleanLine = line.toUpperCase().replace(/\s+/g, '');
            if (!cleanLine || cleanLine.length < 4) continue;

            const bytes: number[] = [];
            for (let i = 0; i < cleanLine.length; i += 2) {
                const b = parseInt(cleanLine.substring(i, i + 2), 16);
                if (!isNaN(b)) {
                    bytes.push(b);
                }
            }

            if (bytes.length < 2) continue;

            // In ATH0 (headers off) mode, ELM327 already strips the physical KWP header
            // and checksum for standard OBD/UDS application responses (Mode 01, 02, 03, 04, 07, 09, 22/UDS 62, 7F).
            // Do not mistake them for physical KWP format frames.
            const isAppPayload = [0x41, 0x42, 0x43, 0x44, 0x47, 0x49, 0x62, 0x7F].includes(bytes[0]);
            if (isAppPayload) {
                const payloadHex = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
                processedPayloads.push(payloadHex);
                continue;
            }

            // KWP2000 Physical Header Parsing (ATH1 or raw bus frame)
            const fmt = bytes[0];
            const hasTargetAndSource = (fmt & 0x80) === 0 || (fmt & 0x40) !== 0;
            
            let headerLen = 1;
            if (hasTargetAndSource) {
                headerLen = 3; // fmt + target + source
            }

            const fmtLen = fmt & 0x3F;
            if (fmtLen === 0 && bytes.length > headerLen) {
                headerLen += 1; // length byte present
            }

            // Validate Checksum (CS)
            if (bytes.length >= headerLen + 1) {
                const csIndex = bytes.length - 1;
                const expectedCS = bytes[csIndex];
                
                let sum = 0;
                for (let j = 0; j < csIndex; j++) {
                    sum = (sum + bytes[j]) & 0xFF;
                }

                if (sum !== expectedCS) {
                    // Checksum mismatch -> drop corrupt line
                    continue;
                }

                // Extract payload bytes (excluding header and checksum)
                const payloadBytes = bytes.slice(headerLen, csIndex);
                const payloadHex = payloadBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
                processedPayloads.push(payloadHex);
            } else {
                const payloadHex = bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
                processedPayloads.push(payloadHex);
            }
        }

        const joinedHex = processedPayloads.join('');
        const formatted: string[] = [];
        for (let i = 0; i < joinedHex.length; i += 2) {
            formatted.push(joinedHex.substring(i, i + 2));
        }
        return formatted.join(' ');
    }
}

export default new KWPFrameDecoder();
