export class ISOTPDecoder {
    decode(lines: string[]): string {
        let isMultiFrame = false;
        let totalLength = 0;
        let accumulatedHex = '';
        
        const processedPayloads: string[] = [];

        for (const line of lines) {
            let cleanLine = line.toUpperCase().replace(/\s+/g, '');
            if (!cleanLine) continue;

            // 1. Strip CAN Arbitration headers
            if (cleanLine.startsWith('7E8')) {
                cleanLine = cleanLine.substring(3);
            } else if (cleanLine.startsWith('7E9') || cleanLine.startsWith('7EA') || cleanLine.startsWith('7EB') || cleanLine.startsWith('7EC') || cleanLine.startsWith('7ED') || cleanLine.startsWith('7EE') || cleanLine.startsWith('7EF')) {
                continue; // Discard non-engine CAN frames
            } else if (cleanLine.startsWith('18DAF110')) {
                cleanLine = cleanLine.substring(8);
            } else if (cleanLine.startsWith('18DAF1')) {
                continue; // Discard other 29-bit CAN frames
            }

            // 2. Strip multi-line tag prefixes (e.g. "0:")
            const indexMatch = cleanLine.match(/^(\d+:)/);
            if (indexMatch) {
                cleanLine = cleanLine.substring(indexMatch[1].length);
            }

            if (cleanLine.length < 2) continue;

            // 3. Parse ISO-TP PCI (Protocol Control Information) byte
            const pciType = parseInt(cleanLine.substring(0, 1), 16);
            
            if (pciType === 0) {
                // Single Frame (SF): 0X -> X is length
                const length = parseInt(cleanLine.substring(1, 2), 16);
                if (length > 0 && cleanLine.length >= 2 + (length * 2)) {
                    processedPayloads.push(cleanLine.substring(2, 2 + (length * 2)));
                }
            } else if (pciType === 1) {
                // First Frame (FF): 1X YY -> XYY is 12-bit length
                isMultiFrame = true;
                totalLength = parseInt(cleanLine.substring(1, 4), 16);
                accumulatedHex = cleanLine.substring(4);
            } else if (pciType === 2) {
                // Consecutive Frame (CF): 2X -> X is sequence number
                if (isMultiFrame) {
                    accumulatedHex += cleanLine.substring(2);
                }
            } else if (pciType === 3) {
                // Flow Control (FC): Discard
                continue;
            } else {
                // If there's no recognizable PCI prefix, keep raw line
                processedPayloads.push(cleanLine);
            }
        }

        if (isMultiFrame && accumulatedHex.length > 0) {
            // Trim to target totalLength if it exceeds
            const maxChars = totalLength * 2;
            if (accumulatedHex.length > maxChars) {
                accumulatedHex = accumulatedHex.substring(0, maxChars);
            }
            processedPayloads.push(accumulatedHex);
        }

        const joinedHex = processedPayloads.join('');
        const formatted: string[] = [];
        for (let i = 0; i < joinedHex.length; i += 2) {
            formatted.push(joinedHex.substring(i, i + 2));
        }
        return formatted.join(' ');
    }
}

export default new ISOTPDecoder();
