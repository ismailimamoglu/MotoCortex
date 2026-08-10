import { runIdentifierTest, clearIdentifierCache } from '../ELMIdentifierGate';
import OBDCommandQueue from '../OBDCommandQueue';
import { useBluetoothStore } from '../../store/useBluetoothStore';

jest.mock('../OBDCommandQueue', () => ({
  add: jest.fn()
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() }))
  },
  Platform: { OS: 'android' }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn() }
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn()
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn()
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { name: 'MotoCortex' } }
}));

describe('ELMIdentifierGate Compatibility & Clone Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearIdentifierCache();
    useBluetoothStore.getState().reset();
  });

  test('should pass fully and allow coding on safe adapters', async () => {
    (OBDCommandQueue.add as jest.Mock).mockResolvedValue('OK');

    const result = await runIdentifierTest();

    expect(result.isCloneDevice).toBe(false);
    expect(result.isCodingAllowed).toBe(true);
    expect(result.capabilityScore).toBe(100);
    expect(result.elmVersionTested).toBe('2.3');

    const storeState = useBluetoothStore.getState();
    expect(storeState.isCloneDevice).toBe(false);
    expect(storeState.isCodingAllowed).toBe(true);
  });

  test('should short-circuit and block coding if core command fails', async () => {
    (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd === 'ATI') {
        return Promise.resolve('?');
      }
      return Promise.resolve('OK');
    });

    const result = await runIdentifierTest();

    expect(result.isCloneDevice).toBe(true);
    expect(result.isCodingAllowed).toBe(false);
    expect(OBDCommandQueue.add).toHaveBeenCalledTimes(1); // Short-circuits immediately on first cmd

    const storeState = useBluetoothStore.getState();
    expect(storeState.isCloneDevice).toBe(true);
    expect(storeState.isCodingAllowed).toBe(false);
  });

  test('should lock coding allowed but not mark clone if non-core command fails', async () => {
    (OBDCommandQueue.add as jest.Mock).mockImplementation((cmd: string) => {
      if (cmd === 'ATFT') { // non-core (v2.1)
        return Promise.resolve('?');
      }
      return Promise.resolve('OK');
    });

    const result = await runIdentifierTest();

    expect(result.isCloneDevice).toBe(false);
    expect(result.isCodingAllowed).toBe(false);

    const storeState = useBluetoothStore.getState();
    expect(storeState.isCloneDevice).toBe(false);
    expect(storeState.isCodingAllowed).toBe(false);
  });

  test('should use 2000ms timeout for ATZ and cache scan results for subsequent calls', async () => {
    (OBDCommandQueue.add as jest.Mock).mockResolvedValue('OK');

    const firstResult = await runIdentifierTest('DEV_123');
    expect(firstResult.capabilityScore).toBe(100);

    // ATZ command should be called with 2000ms timeout
    expect(OBDCommandQueue.add).toHaveBeenCalledWith('ATZ', 2000, 'HIGH_PRIORITY_AD_HOC');

    const callCountAfterFirstRun = (OBDCommandQueue.add as jest.Mock).mock.calls.length;

    // Second call for same deviceId should hit cache without issuing new commands
    const secondResult = await runIdentifierTest('DEV_123');
    expect(secondResult.capabilityScore).toBe(100);
    expect((OBDCommandQueue.add as jest.Mock).mock.calls.length).toBe(callCountAfterFirstRun);
  });
});
