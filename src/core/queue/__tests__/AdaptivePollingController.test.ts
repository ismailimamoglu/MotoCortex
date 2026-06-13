import { AdaptivePollingController } from '../AdaptivePollingController';
import { useBluetoothStore } from '../../../store/useBluetoothStore';
import SessionHealthMonitor from '../../monitor/SessionHealthMonitor';
import CommandScheduler from '../CommandScheduler';

jest.mock('../../../store/useBluetoothStore', () => {
    let state = {
        connectionState: 'TELEMETRY_ACTIVE',
        telemetryStats: {
            requestsSent: 10,
            timeoutCount: 0,
            avgResponseTime: 50
        }
    };
    return {
        useBluetoothStore: {
            getState: () => state,
            setState: (newState: any) => { state = { ...state, ...newState }; }
        }
    };
});

jest.mock('../../monitor/SessionHealthMonitor', () => {
    return {
        __esModule: true,
        default: {
            getAverageRtt: jest.fn().mockReturnValue(60)
        }
    };
});

jest.mock('../CommandScheduler', () => {
    return {
        __esModule: true,
        default: {
            getQueueLength: jest.fn().mockReturnValue(0)
        }
    };
});

describe('AdaptivePollingController Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        AdaptivePollingController.reset();
        
        // Reset store state to healthy defaults
        const store = useBluetoothStore.getState() as any;
        store.connectionState = 'TELEMETRY_ACTIVE';
        store.telemetryStats = {
            requestsSent: 10,
            timeoutCount: 0,
            avgResponseTime: 60
        };
        
        (SessionHealthMonitor.getAverageRtt as jest.Mock).mockReturnValue(60);
        (CommandScheduler.getQueueLength as jest.Mock).mockReturnValue(0);
    });

    test('1. Bypasses hysteresis and returns 500ms in RECOVERY state', () => {
        const store = useBluetoothStore.getState() as any;
        store.connectionState = 'RECOVERY';

        const interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(500);
    });

    test('2. Bypasses hysteresis and returns 500ms in DEGRADED state', () => {
        const store = useBluetoothStore.getState() as any;
        store.connectionState = 'DEGRADED';

        const interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(500);
    });

    test('3. Bypasses hysteresis and returns 500ms in HARDWARE_FATAL state', () => {
        const store = useBluetoothStore.getState() as any;
        store.connectionState = 'HARDWARE_FATAL';

        const interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(500);
    });

    test('4. Under high health (low RTT, 0 timeouts, empty queue), returns fast interval (25ms)', () => {
        (SessionHealthMonitor.getAverageRtt as jest.Mock).mockReturnValue(30);
        (CommandScheduler.getQueueLength as jest.Mock).mockReturnValue(0);

        const interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(25);
    });

    test('5. Degrades interval as health scores drop due to timeouts and queue depth', () => {
        const store = useBluetoothStore.getState() as any;
        store.telemetryStats = {
            requestsSent: 10,
            timeoutCount: 3, // 30% timeout rate
            avgResponseTime: 200
        };
        (SessionHealthMonitor.getAverageRtt as jest.Mock).mockReturnValue(200);
        (CommandScheduler.getQueueLength as jest.Mock).mockReturnValue(6); // full queue

        let interval = 0;
        for (let i = 0; i < 15; i++) {
            interval = AdaptivePollingController.calculateInterval();
        }
        // healthScore will be low, interval should be slower (e.g. 300ms or 500ms)
        expect(interval).toBeGreaterThanOrEqual(300);
    });

    test('6. Observes Hysteresis: does not change interval if target is within 50ms of current', () => {
        // Initial call setting baseline to 25
        (SessionHealthMonitor.getAverageRtt as jest.Mock).mockReturnValue(30);
        let interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(25);

        // Adjust RTT slightly so target is 75 (health score drops, target shifts to 75)
        // difference is 50ms, which is not > 50, so it keeps 25 due to hysteresis
        (SessionHealthMonitor.getAverageRtt as jest.Mock).mockReturnValue(90);
        interval = AdaptivePollingController.calculateInterval();
        expect(interval).toBe(25);
    });
});
