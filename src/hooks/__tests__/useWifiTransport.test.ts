import { WifiTransport } from '../useWifiTransport';
import { useBluetoothStore } from '../../store/useBluetoothStore';

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

describe('WifiTransport class tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBluetoothStore.getState().reset();
  });

  test('should establish simulated Wi-Fi connection and set state correctly', async () => {
    const transport = new WifiTransport();
    const success = await transport.connect('192.168.0.10:35000');

    expect(success).toBe(true);
  });

  test('should successfully write data and callback response', async () => {
    const transport = new WifiTransport();
    await transport.connect('192.168.0.10:35000');

    const receivedChunks: string[] = [];
    transport.onDataReceived((data) => {
      receivedChunks.push(data);
    });

    await transport.write('01 0D');

    // Wait for the simulated timeout response
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(receivedChunks.length).toBe(1);
    expect(receivedChunks[0]).toContain('41 0D 3C');
  });
});
