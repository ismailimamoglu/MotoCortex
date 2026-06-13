import { ELMParser, RxState } from '../ELMParser';

describe('ELMParser Unit Tests', () => {
    let parser: ELMParser;

    beforeEach(() => {
        parser = new ELMParser();
    });

    test('1. Transitions to RECEIVING state on startCommand', () => {
        parser.startCommand();
        expect(parser.getState()).toBe(RxState.RECEIVING);
        expect(parser.getRawResponse()).toBe('');
    });

    test('2. Handles partial chunk appending and state transitions', () => {
        parser.startCommand();
        const state1 = parser.appendChunk('41 0C ');
        expect(state1).toBe(RxState.RECEIVING);
        expect(parser.getRawResponse()).toBe('41 0C ');

        const state2 = parser.appendChunk('1A 2B\r>');
        expect(state2).toBe(RxState.PROMPT_RECEIVED);
        expect(parser.getRawResponse()).toBe('41 0C 1A 2B\r>');
    });

    test('3. Transitions to SEARCHING state on finding intermediate searching keywords', () => {
        parser.startCommand();
        const state = parser.appendChunk('SEARCHING...');
        expect(state).toBe(RxState.SEARCHING);
    });

    test('4. Resolves Token Collision using priority rules (e.g. "CAN ERROR" vs ">")', () => {
        parser.startCommand();
        // If the chunk contains both "CAN ERROR" and ">", priority logic should trigger foundTerminal.
        // Priority of CAN ERROR (100) vs > (10).
        const state = parser.appendChunk('CAN ERROR\r>');
        expect(state).toBe(RxState.PROMPT_RECEIVED);
        expect(parser.getRawResponse()).toBe('CAN ERROR\r>');
    });

    test('5. Sanitizes basic prompt symbol ">" from the end of responses', () => {
        const command = '01 0C';
        const raw = '41 0C 1A 2B\r>';
        const clean = parser.sanitize(raw, command);
        expect(clean).toBe('41 0C 1A 2B');
    });

    test('6. Strips Echo Contamination (cleans command echo lines)', () => {
        const command = '01 0C';
        // Command echo '01 0C' appears on line 1, then data on line 2
        const raw = '01 0C\r\n41 0C 1A 2B\r\n>';
        const clean = parser.sanitize(raw, command);
        expect(clean).toBe('41 0C 1A 2B');
    });

    test('7. Cleans AT command lines from the raw responses', () => {
        const command = 'AT Z';
        const raw = 'AT Z\r\nELM327 v1.5\r\n>';
        const clean = parser.sanitize(raw, command);
        expect(clean).toBe('ELM327 v1.5');
    });

    test('8. Handles Clone Garbage (extra lines, null bytes, spacing noise)', () => {
        const command = '01 0D';
        // Raw response has blank lines and leading/trailing whitespace
        const raw = '\r\n\r\n 01 0D \r\n\r\n 41 0D 50 \r\n\r\n > ';
        const clean = parser.sanitize(raw, command);
        expect(clean).toBe('41 0D 50');
    });

    test('9. Resolves lowest-priority terminal token correctly', () => {
        parser.startCommand();
        const state = parser.appendChunk('UNKNOWN RESPONSE >');
        expect(state).toBe(RxState.PROMPT_RECEIVED);
    });

    test('10. Leaves normal data lines untouched while removing empty rows', () => {
        const command = '01 00';
        const raw = '41 00 BE 3E B8 11\r\n\r\n41 00 00 00 00 00\r\n>';
        const clean = parser.sanitize(raw, command);
        expect(clean).toBe('41 00 BE 3E B8 11\n41 00 00 00 00 00');
    });
});
