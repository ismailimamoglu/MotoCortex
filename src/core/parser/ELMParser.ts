export enum RxState {
    IDLE,
    RECEIVING,
    SEARCHING,
    PROMPT_RECEIVED
}

export const TERMINAL_TOKENS = [
    "OK", "?", ">", "NO DATA", "STOPPED", 
    "CAN ERROR", "BUS ERROR", "BUFFER FULL", 
    "UNABLE TO CONNECT", "ERROR", 
    "BUS INIT...ERROR", "LV RESET", "FB ERROR", 
    "DATA ERROR", "RX ERROR"
];

export const TOKEN_PRIORITIES: Record<string, number> = {
    "CAN ERROR": 100,
    "BUS ERROR": 90,
    "STOPPED": 80,
    "NO DATA": 70,
    "ERROR": 60,
    "BUS INIT...ERROR": 50,
    "LV RESET": 40,
    "FB ERROR": 30,
    "DATA ERROR": 25,
    "RX ERROR": 20,
    ">": 10
};

export class ELMParser {
    private state: RxState;
    private rawResponseBuffer: string;

    constructor() {
        this.state = RxState.IDLE;
        this.rawResponseBuffer = '';
    }

    startCommand() {
        this.state = RxState.RECEIVING;
        this.rawResponseBuffer = '';
    }

    appendChunk(chunk: string): RxState {
        this.rawResponseBuffer += chunk;
        const trimmed = this.rawResponseBuffer.trim();
        const uppercase = trimmed.toUpperCase().replace(/\s+/g, '');

        // Check for intermediate SEARCHING state
        if (uppercase.includes('SEARCHING') && !uppercase.includes('SEARCHING...DONE')) {
            this.state = RxState.SEARCHING;
            return this.state;
        }

        // Token Search & Priority Resolution
        let foundTerminal = false;
        let highestPriority = -1;

        for (const token of TERMINAL_TOKENS) {
            const tokenClean = token.toUpperCase().replace(/\s+/g, '');
            if (uppercase.includes(tokenClean)) {
                foundTerminal = true;
                const priority = TOKEN_PRIORITIES[token] || 0;
                if (priority > highestPriority) {
                    highestPriority = priority;
                }
            }
        }

        if (foundTerminal || trimmed.endsWith('>')) {
            this.state = RxState.PROMPT_RECEIVED;
        }

        return this.state;
    }

    getRawResponse(): string {
        return this.rawResponseBuffer;
    }

    getState(): RxState {
        return this.state;
    }

    sanitize(rawResponse: string, command: string): string {
        // Strip echoes and clean up prompt symbols
        let clean = rawResponse.trim();
        if (clean.endsWith('>')) {
            clean = clean.substring(0, clean.length - 1).trim();
        }

        const lines = clean.split(/[\r\n]+/);
        const cmdClean = command.toUpperCase().replace(/\s+/g, '');
        const filteredLines: string[] = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const lineClean = trimmedLine.toUpperCase().replace(/\s+/g, '');
            
            // Remove command echoes (e.g. 010C at the start of response lines)
            if (lineClean === cmdClean || lineClean.startsWith('AT')) {
                continue;
            }

            filteredLines.push(trimmedLine);
        }

        return filteredLines.join('\n');
    }
}
