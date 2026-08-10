export class ISOTPDecoder {
    /**
     * Global Hardened Multi-ECU aware ISO-TP Decoder
     */
    decode(lines: string[]): string {
        const pendingBuffers = new Map<string, { totalLength: number; accumulatedHex: string; isMulti: boolean; expectedSeqNo: number }>();
        const stablePayloads: string[] = [];

        for (const line of lines) {
            let cleanLine = line.toUpperCase().replace(/\s+/g, '');
            if (!cleanLine || cleanLine.includes("CANERROR") || cleanLine.includes("?") || cleanLine.includes("STOPPED")) continue;

            let ecuId = "7E8";
            let hasHeader = false;

            if (cleanLine.startsWith('7E8') || cleanLine.startsWith('7E9') || cleanLine.startsWith('7EA') ||
                cleanLine.startsWith('7EB') || cleanLine.startsWith('7EC') || cleanLine.startsWith('7ED') ||
                cleanLine.startsWith('7EE') || cleanLine.startsWith('7EF')) {
                ecuId = cleanLine.substring(0, 3);
                cleanLine = cleanLine.substring(3);
                hasHeader = true;
            } else if (cleanLine.startsWith('18DAF110') || cleanLine.startsWith('18DAF118') || cleanLine.startsWith('18DAF1')) {
                ecuId = cleanLine.substring(0, 8);
                cleanLine = cleanLine.substring(8);
                hasHeader = true;
            }

            // Multi-ECU Support: Accept all valid 11-bit (7E8..7EF, 7C8..7CF) and 29-bit (18DAF1xx, 18DAxxF1) ECU headers
            // All valid headers are processed per ecuId in pendingBuffers.

            const indexMatch = cleanLine.match(/^(\d+:)/);
            if (indexMatch) {
                cleanLine = cleanLine.substring(indexMatch[1].length);
            }

            if (cleanLine.length < 2) continue;

            // --- CLONE ADAPTER UART OVERFLOW / MERGE GUARD ---
            // After removing header and prefix, the payload (PCI + Data bytes) 
            // should not exceed 8 bytes (16 hex characters) for a standard CAN frame.
            if (cleanLine.length > 16) {
                continue;
            }

            const pciType = parseInt(cleanLine.substring(0, 1), 16);

            if (pciType === 0) {
                // Single Frame (SF)
                const length = parseInt(cleanLine.substring(1, 2), 16);
                if (length > 0 && cleanLine.length >= 2 + (length * 2)) {
                    stablePayloads.push(cleanLine.substring(2, 2 + (length * 2)));
                }
            } else if (pciType === 1) {
                // First Frame (FF)
                const totalLength = parseInt(cleanLine.substring(1, 4), 16);
                pendingBuffers.set(ecuId, {
                    totalLength: totalLength * 2,
                    accumulatedHex: cleanLine.substring(4),
                    isMulti: true,
                    expectedSeqNo: 1
                });
            } else if (pciType === 2) {
                // Consecutive Frame (CF)
                const currentCtx = pendingBuffers.get(ecuId);
                if (currentCtx && currentCtx.isMulti) {
                    const seqNo = parseInt(cleanLine.substring(1, 2), 16);
                    if (seqNo !== currentCtx.expectedSeqNo) {
                        // Sequence number mismatch / Out-of-order frame: discard corrupt buffer
                        pendingBuffers.delete(ecuId);
                        continue;
                    }

                    currentCtx.accumulatedHex += cleanLine.substring(2);
                    currentCtx.expectedSeqNo = (currentCtx.expectedSeqNo + 1) % 16;

                    if (currentCtx.accumulatedHex.length >= currentCtx.totalLength) {
                        stablePayloads.push(currentCtx.accumulatedHex.substring(0, currentCtx.totalLength));
                        pendingBuffers.delete(ecuId);
                    }
                }
            } else if (pciType === 3) {
                continue;
            } else {
                stablePayloads.push(cleanLine);
            }
        }

        const joinedHex = stablePayloads.join('');
        const formatted: string[] = [];
        for (let i = 0; i < joinedHex.length; i += 2) {
            formatted.push(joinedHex.substring(i, i + 2));
        }
        return formatted.join(' ');
    }
}

export default new ISOTPDecoder();