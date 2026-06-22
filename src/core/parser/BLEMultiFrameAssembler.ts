export type AssemblerState = 'IDLE' | 'COLLECTING' | 'MULTIFRAME' | 'COMPLETE' | 'CORRUPTED';

export class BLEMultiFrameAssembler {
    private buffer: string = '';
    private state: AssemblerState = 'IDLE';
    private expectedLength: number = 0; // expected data bytes
    private currentPayloadLength: number = 0; // accumulated payload bytes
    private isMultiFrame: boolean = false;

    constructor() {
        this.reset();
    }

    public reset(): void {
        this.buffer = '';
        this.state = 'IDLE';
        this.expectedLength = 0;
        this.currentPayloadLength = 0;
        this.isMultiFrame = false;
    }

    public clear(): void {
        this.reset();
    }

    public getState(): AssemblerState {
        return this.state;
    }

    public append(chunk: string): string[] {
        // Filter out null bytes (\0) to prevent buffer contamination
        const sanitized = chunk.replace(/\0/g, '');
        this.buffer += sanitized;

        if (this.state === 'IDLE' && this.buffer.length > 0) {
            this.state = 'COLLECTING';
        }

        const lines: string[] = [];
        let delimiterIndex = this.findDelimiterIndex();

        while (delimiterIndex !== -1) {
            const line = this.buffer.substring(0, delimiterIndex + 1);
            this.buffer = this.buffer.substring(delimiterIndex + 1);
            lines.push(line);
            this.processLine(line);
            delimiterIndex = this.findDelimiterIndex();
        }

        // Final completion and corruption checks
        const trimmedBuffer = this.buffer.trim();
        const endsWithPrompt = trimmedBuffer.endsWith('>');
        const promptReceived = lines.some(l => l.includes('>')) || endsWithPrompt;

        if (this.isMultiFrame) {
            if (this.currentPayloadLength >= this.expectedLength) {
                this.state = 'COMPLETE';
            } else if (promptReceived) {
                // Prompt received before we got all the bytes
                this.state = 'CORRUPTED';
            }
        } else {
            // Single frame or simple AT commands
            if (promptReceived) {
                this.state = 'COMPLETE';
            }
        }

        return lines;
    }

    private findDelimiterIndex(): number {
        for (let i = 0; i < this.buffer.length; i++) {
            const char = this.buffer[i];
            if (char === '\r' || char === '\n' || char === '>') {
                return i;
            }
        }
        return -1;
    }

    private processLine(line: string): void {
        let clean = line.toUpperCase().replace(/\s+/g, '');
        if (!clean) return;

        // Strip CAN Arbitration headers
        if (clean.startsWith('7E8')) {
            clean = clean.substring(3);
        } else if (clean.startsWith('18DAF110')) {
            clean = clean.substring(8);
        }

        // Strip lines prefixes (e.g. "0:")
        const prefixMatch = clean.match(/^(\d+:)/);
        if (prefixMatch) {
            clean = clean.substring(prefixMatch[1].length);
        }

        if (clean.length < 2) return;

        // Parse ISO-TP PCI (Protocol Control Information) byte
        const pciType = parseInt(clean.substring(0, 1), 16);

        if (pciType === 1) {
            // First Frame (FF): 1X YY -> XYY is 12-bit length
            this.isMultiFrame = true;
            this.state = 'MULTIFRAME';
            this.expectedLength = parseInt(clean.substring(1, 4), 16);
            // First Frame payload is after the first 4 nibbles (2 bytes PCI)
            const ffPayload = clean.substring(4);
            this.currentPayloadLength = ffPayload.length / 2;
        } else if (pciType === 2 && this.isMultiFrame) {
            // Consecutive Frame (CF): 2X -> X is sequence index
            // Payload is after the first 2 nibbles (1 byte PCI)
            const cfPayload = clean.substring(2);
            this.currentPayloadLength += cfPayload.length / 2;

            if (this.currentPayloadLength >= this.expectedLength) {
                this.state = 'COMPLETE';
            }
        }
    }

    public getRemaining(): string {
        return this.buffer;
    }
}
export default BLEMultiFrameAssembler;
