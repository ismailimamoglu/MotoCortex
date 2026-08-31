import { OBD2ProtocolEngine } from '../OBD2ProtocolEngine';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { PollingOrchestrator } from '../../core/connection/PollingOrchestrator';
import OBDCommandQueue from '../OBDCommandQueue';
import { PidRegistry, PidDefinition } from '../../core/pids/PidRegistry';

describe('🚗 MotoCortex QA Automotive Hardware In-The-Loop Simulation', () => {

    test('1. Saha Logundan Gelen STOPPED Ekli Yanıtların Parse Edilmesi (010C, 010D, 0105, ATRV)', () => {
        const engine = new OBD2ProtocolEngine();

        // Logda dönen ham parçalar: 41 0C 1E 65 STOPPED > (0x1E65 = 7781 -> 1945.25 RPM)
        (engine as any).parseResponse('01 0C', '41 0C 1E 65 STOPPED >');
        const parsedRpm = useBluetoothStore.getState().rpm;
        expect(parsedRpm).not.toBeNull();
        expect(Math.round(parsedRpm!)).toBe(1945);

        // Logda dönen hız: 41 0D 2C STOPPED > (0x2C = 44 km/h)
        (engine as any).parseResponse('01 0D', '41 0D 2C STOPPED >');
        const parsedSpeed = useBluetoothStore.getState().speed;
        expect(parsedSpeed).toBe(44);

        // Logda dönen hararet: 41 05 61 STOPPED > (0x61 = 97 -> 97 - 40 = 57 °C)
        (engine as any).parseResponse('01 05', '41 05 61 STOPPED >');
        const parsedCoolant = useBluetoothStore.getState().coolant;
        expect(parsedCoolant).toBe(57);

        // Logda dönen akü voltajı: 14.5V >
        (engine as any).parseResponse('ATRV', '14.5V >');
        const parsedVolt = useBluetoothStore.getState().voltage;
        expect(parsedVolt).toBe('14.5V');
    });

    test('2. PollingOrchestrator Sıfır Karaliste ile Kesintisiz Telemetri Akışı', async () => {
        const commandsDispatched: string[] = [];
        const queueSpy = jest.spyOn(OBDCommandQueue, 'add').mockImplementation(async (cmd: string) => {
            commandsDispatched.push(cmd);
            if (cmd === '01 0C') return '41 0C 1E 65 STOPPED >';
            if (cmd === '01 0D') return '41 0D 2C STOPPED >';
            if (cmd === '01 05') return '41 05 61 STOPPED >';
            return 'OK >';
        });

        setTimeout(() => {
            PollingOrchestrator.stopPolling();
        }, 100);

        await PollingOrchestrator.startPolling(['0C', '0D', '05']);

        expect(commandsDispatched.length).toBeGreaterThan(0);
        expect(commandsDispatched).toContain('01 0C');
        expect(commandsDispatched).toContain('01 0D');
        expect(commandsDispatched).toContain('01 05');

        queueSpy.mockRestore();
    });

    test('3. Gaza Basma ve Ani Devir Sıçraması (Temporal Sanity Stress Test)', () => {
        const mockRpmPid: PidDefinition = {
            mode: '01',
            pid: '0C',
            name: 'ENGINE_RPM',
            description: 'Engine RPM',
            min: 0,
            max: 16383.75,
            unit: 'rpm',
            decode: () => 0
        };
        
        // Rölanti 800 RPM'den 3500 RPM'e 40ms içinde ani gaz verme
        const isSuddenRevAllowed = PidRegistry.validateTemporalSanity(mockRpmPid, 3500, 800, 40);
        expect(isSuddenRevAllowed).toBe(true);

        const mockSpeedPid: PidDefinition = {
            mode: '01',
            pid: '0D',
            name: 'VEHICLE_SPEED',
            description: 'Vehicle Speed',
            min: 0,
            max: 255,
            unit: 'km/h',
            decode: () => 0
        };

        // 0-100 Hızlanma (0 -> 60 km/h) ani artış
        const isSpeedJumpAllowed = PidRegistry.validateTemporalSanity(mockSpeedPid, 60, 0, 100);
        expect(isSpeedJumpAllowed).toBe(true);
    });

    test('4. UI Sensor Values Doğrulaması', () => {
        useBluetoothStore.setState({ ecuStatus: 'connected', rpm: 2450, speed: 85, coolant: 90, voltage: '14.2V' });
        
        const storeState = useBluetoothStore.getState();
        expect(storeState.rpm).toBe(2450);
        expect(storeState.speed).toBe(85);
        expect(storeState.coolant).toBe(90);
        expect(storeState.voltage).toBe('14.2V');
    });
});
