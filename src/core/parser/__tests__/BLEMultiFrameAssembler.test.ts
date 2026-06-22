import { BLEMultiFrameAssembler } from '../BLEMultiFrameAssembler';

describe('BLEMultiFrameAssembler Tests', () => {
    let assembler: BLEMultiFrameAssembler;

    beforeEach(() => {
        assembler = new BLEMultiFrameAssembler();
    });

    test('1. Initial state is IDLE', () => {
        expect(assembler.getState()).toBe('IDLE');
    });

    test('2. Single frame connection transition: IDLE -> COLLECTING -> COMPLETE', () => {
        const lines = assembler.append('AT Z\r');
        expect(assembler.getState()).toBe('COLLECTING');
        expect(lines).toEqual(['AT Z\r']);

        assembler.append('>');
        expect(assembler.getState()).toBe('COMPLETE');
    });

    test('3. ISO-TP Multi-frame assembly: FF and CF', () => {
        // FF: 7E8 10 14 49 02 01 31 46 4D -> PCI length = 0x014 (20 bytes total payload)
        // FF has 2 bytes (4 hex chars) PCI: "1014" -> length is 20. Payload: "49020131464D" (6 bytes)
        const lines1 = assembler.append('7E8 10 14 49 02 01 31 46 4D\r');
        expect(assembler.getState()).toBe('MULTIFRAME');
        expect(lines1).toEqual(['7E8 10 14 49 02 01 31 46 4D\r']);

        // CF1: 7E8 21 43 32 32 4E 4C 35 48 -> PCI "21" (1 byte). Payload: "4332324E4C3548" (7 bytes, total = 13 bytes)
        const lines2 = assembler.append('7E8 21 43 32 32 4E 4C 35 48\r');
        expect(assembler.getState()).toBe('MULTIFRAME');

        // CF2: 7E8 22 41 38 30 39 31 35 34 -> PCI "22" (1 byte). Payload: "41383039313534" (7 bytes, total = 20 bytes)
        const lines3 = assembler.append('7E8 22 41 38 30 39 31 35 34\r');
        expect(assembler.getState()).toBe('COMPLETE');
    });

    test('4. Detects corruption when prompt received prematurely', () => {
        // FF expects 20 bytes
        assembler.append('7E8 10 14 49 02 01 31 46 4D\r');
        expect(assembler.getState()).toBe('MULTIFRAME');

        // Receives prompt instead of more frames
        assembler.append('>');
        expect(assembler.getState()).toBe('CORRUPTED');
    });

    test('5. Ignores null bytes in chunk', () => {
        const lines = assembler.append('AT Z\0\r>');
        expect(lines).toEqual(['AT Z\r', '>']);
        expect(assembler.getState()).toBe('COMPLETE');
    });

    test('6. Reset resets all internal variables and returns state to IDLE', () => {
        assembler.append('7E8 10 14 49 02 01 31 46 4D\r');
        expect(assembler.getState()).toBe('MULTIFRAME');

        assembler.reset();
        expect(assembler.getState()).toBe('IDLE');
        expect(assembler.getRemaining()).toBe('');
    });
});
