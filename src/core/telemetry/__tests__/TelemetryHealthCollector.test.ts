import TelemetryHealthCollector from '../TelemetryHealthCollector';

describe('TelemetryHealthCollector', () => {
    beforeEach(() => {
        TelemetryHealthCollector.resetCollector();
    });

    describe('initial state', () => {
        it('starts with zero fragmentation rate', () => {
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(0);
        });

        it('starts with zero timeout rate', () => {
            expect(TelemetryHealthCollector.commandTimeoutRate).toBe(0);
        });

        it('starts with zero parser recovery count', () => {
            expect(TelemetryHealthCollector.parserRecoveryCount).toBe(0);
        });

        it('starts with zero average RTT', () => {
            expect(TelemetryHealthCollector.averageRtt).toBe(0);
        });
    });

    describe('bleFragmentationRate', () => {
        it('calculates correct ratio with mixed events', () => {
            // 3 fragmented out of 10 total = 0.3
            for (let i = 0; i < 7; i++) TelemetryHealthCollector.recordFragment(false);
            for (let i = 0; i < 3; i++) TelemetryHealthCollector.recordFragment(true);
            expect(TelemetryHealthCollector.bleFragmentationRate).toBeCloseTo(0.3, 2);
        });

        it('returns 1.0 when all packets are fragmented', () => {
            for (let i = 0; i < 10; i++) TelemetryHealthCollector.recordFragment(true);
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(1);
        });

        it('returns 0 when no packets are fragmented', () => {
            for (let i = 0; i < 10; i++) TelemetryHealthCollector.recordFragment(false);
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(0);
        });

        it('defaults to true when recordFragment is called with no arguments', () => {
            TelemetryHealthCollector.recordFragment();
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(1.0);
        });
    });

    describe('commandTimeoutRate', () => {
        it('calculates correct ratio', () => {
            // 2 timeouts out of 10 = 0.2
            for (let i = 0; i < 8; i++) TelemetryHealthCollector.recordSuccess(50);
            TelemetryHealthCollector.recordTimeout();
            TelemetryHealthCollector.recordTimeout();
            expect(TelemetryHealthCollector.commandTimeoutRate).toBeCloseTo(0.2, 2);
        });

        it('returns 1.0 when all commands timeout', () => {
            for (let i = 0; i < 5; i++) TelemetryHealthCollector.recordTimeout();
            expect(TelemetryHealthCollector.commandTimeoutRate).toBe(1);
        });
    });

    describe('averageRtt', () => {
        it('calculates correct average', () => {
            TelemetryHealthCollector.recordSuccess(100);
            TelemetryHealthCollector.recordSuccess(200);
            TelemetryHealthCollector.recordSuccess(300);
            expect(TelemetryHealthCollector.averageRtt).toBe(200);
        });
    });

    describe('rolling window', () => {
        it('maintains window size of 100', () => {
            // Fill beyond the window
            for (let i = 0; i < 110; i++) {
                TelemetryHealthCollector.recordSuccess(50);
            }
            // Add 10 timeouts
            for (let i = 0; i < 10; i++) {
                TelemetryHealthCollector.recordTimeout();
            }
            // Window should now have 100 items: 90 success + 10 timeout
            // But actually 100 of the 110 success are kept, then 10 timeout added = oldest 20 shifted out
            // So the window has 90 success + 10 timeout
            expect(TelemetryHealthCollector.commandTimeoutRate).toBeCloseTo(0.1, 1);
        });
    });

    describe('parserRecoveryCount', () => {
        it('increments correctly', () => {
            TelemetryHealthCollector.recordParserRecovery();
            TelemetryHealthCollector.recordParserRecovery();
            TelemetryHealthCollector.recordParserRecovery();
            expect(TelemetryHealthCollector.parserRecoveryCount).toBe(3);
        });
    });

    describe('getHealthSnapshot', () => {
        it('returns a structured snapshot with all fields', () => {
            TelemetryHealthCollector.recordSuccess(100);
            TelemetryHealthCollector.recordTimeout();
            TelemetryHealthCollector.recordFragment(true);
            TelemetryHealthCollector.recordParserRecovery();
            TelemetryHealthCollector.recordDecoderError();
            TelemetryHealthCollector.setQueueDepth(5);

            const snapshot = TelemetryHealthCollector.getHealthSnapshot();
            expect(snapshot).toHaveProperty('packetLoss');
            expect(snapshot).toHaveProperty('averageRtt');
            expect(snapshot).toHaveProperty('decoderErrors', 1);
            expect(snapshot).toHaveProperty('queueDepth', 5);
            expect(snapshot).toHaveProperty('bleFragmentationRate');
            expect(snapshot).toHaveProperty('commandTimeoutRate');
            expect(snapshot).toHaveProperty('parserRecoveryCount', 1);
            expect(snapshot.commandTimeoutRate).toBeCloseTo(0.5, 2);
        });
    });

    describe('resetCollector', () => {
        it('clears all state after reset', () => {
            TelemetryHealthCollector.recordSuccess(100);
            TelemetryHealthCollector.recordTimeout();
            TelemetryHealthCollector.recordFragment(true);
            TelemetryHealthCollector.recordParserRecovery();
            TelemetryHealthCollector.recordDecoderError();
            TelemetryHealthCollector.setQueueDepth(10);

            TelemetryHealthCollector.resetCollector();

            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(0);
            expect(TelemetryHealthCollector.commandTimeoutRate).toBe(0);
            expect(TelemetryHealthCollector.parserRecoveryCount).toBe(0);
            expect(TelemetryHealthCollector.averageRtt).toBe(0);
            expect(TelemetryHealthCollector.decoderErrors).toBe(0);
            expect(TelemetryHealthCollector.queueDepth).toBe(0);
        });
    });

    describe('stress scenarios', () => {
        it('handles high timeout rate gracefully', () => {
            for (let i = 0; i < 95; i++) TelemetryHealthCollector.recordTimeout();
            for (let i = 0; i < 5; i++) TelemetryHealthCollector.recordSuccess(50);
            expect(TelemetryHealthCollector.commandTimeoutRate).toBeCloseTo(0.95, 2);
        });

        it('handles massive fragment count', () => {
            for (let i = 0; i < 200; i++) TelemetryHealthCollector.recordFragment(true);
            // Window capped at 100, all fragmented
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(1);
        });

        it('verifies circular buffer pointer wrap-around correctness', () => {
            // Fill the buffer with 95 false, then 5 true
            for (let i = 0; i < 95; i++) TelemetryHealthCollector.recordFragment(false);
            for (let i = 0; i < 5; i++) TelemetryHealthCollector.recordFragment(true);
            expect(TelemetryHealthCollector.bleFragmentationRate).toBeCloseTo(0.05, 2);

            // Add 95 true fragments. This should overwrite all 95 false fragments, leaving 100 true fragments
            for (let i = 0; i < 95; i++) TelemetryHealthCollector.recordFragment(true);
            expect(TelemetryHealthCollector.bleFragmentationRate).toBe(1.0);
        });
    });
});
