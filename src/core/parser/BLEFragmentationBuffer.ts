export class BLEFragmentationBuffer {
    private buffer: string;

    constructor() {
        this.buffer = '';
    }

    append(chunk: string): string[] {
        // Filter out null bytes (\0) to prevent buffer contamination
        const sanitized = chunk.replace(/\0/g, '');
        this.buffer += sanitized;

        const lines: string[] = [];
        let delimiterIndex = this.findDelimiterIndex();
        
        while (delimiterIndex !== -1) {
            const line = this.buffer.substring(0, delimiterIndex + 1);
            this.buffer = this.buffer.substring(delimiterIndex + 1);
            lines.push(line);
            delimiterIndex = this.findDelimiterIndex();
        }

        return lines;
    }

    private findDelimiterIndex(): number {
        // Delimiters: \r, \n, or prompt character >
        for (let i = 0; i < this.buffer.length; i++) {
            const char = this.buffer[i];
            if (char === '\r' || char === '\n' || char === '>') {
                return i;
            }
        }
        return -1;
    }

    clear() {
        this.buffer = '';
    }

    getRemaining(): string {
        return this.buffer;
    }
}
export default new BLEFragmentationBuffer();
