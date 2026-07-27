// src/store/__tests__/useAppStore.test.ts
import { useAppStore, checkIsProStatus, stopSimulation } from '../useAppStore';
import { useBluetoothStore } from '../useBluetoothStore';

// Mock RevenueCat Native Module
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {}, all: {} } }),
  addCustomerInfoUpdateListener: jest.fn(),
}));

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockCustomerInfo = { entitlements: { active: {}, all: {} } } as any;

describe('useAppStore - checkIsProStatus (Backdoor & Session Lock)', () => {
  const originalDev = (global as any).__DEV__;

  const resetStores = () => {
    useAppStore.setState({
      isBackdoorPro: false,
      isSessionProMemoryLock: false,
    } as any);
    useBluetoothStore.setState({ status: 'disconnected' } as any);
  };

  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    (global as any).__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  describe('Developer Backdoor (__DEV__ guard)', () => {
    it('__DEV__ = true VE isBackdoorPro = true iken Pro erişimi vermeli', () => {
      (global as any).__DEV__ = true;
      useAppStore.setState({ isBackdoorPro: true } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(true);
    });

    it('KRİTİK GÜVENLİK TESTİ: __DEV__ = false (production) iken isBackdoorPro true olsa bile backdoor tetiklenmemeli', () => {
      (global as any).__DEV__ = false;
      useAppStore.setState({ isBackdoorPro: true } as any);
      useAppStore.setState({ isSessionProMemoryLock: false } as any);
      useBluetoothStore.setState({ status: 'disconnected' } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(false);
    });

    it('isBackdoorPro = false iken __DEV__ true olsa da backdoor tetiklenmemeli', () => {
      (global as any).__DEV__ = true;
      useAppStore.setState({ isBackdoorPro: false } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(false);
    });
  });

  describe('Session Memory Lock (RAM-only Pro unlock while connected)', () => {
    it('isSessionProMemoryLock = true VE bluetooth status = "connected" iken Pro erişimi vermeli', () => {
      useAppStore.setState({ isSessionProMemoryLock: true } as any);
      useBluetoothStore.setState({ status: 'connected' } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(true);
    });

    it('isSessionProMemoryLock = true ama bluetooth status "connected" DEĞİLSE Pro erişimi vermemeli', () => {
      useAppStore.setState({ isSessionProMemoryLock: true } as any);
      useBluetoothStore.setState({ status: 'disconnected' } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(false);
    });

    it('NOT: bu path prod build\'de de __DEV__ guard\'ı olmadan çalışır — isSessionProMemoryLock true VE connected olduğunda __DEV__ = false olsa dahi erişim verilir', () => {
      (global as any).__DEV__ = false;
      useAppStore.setState({ isSessionProMemoryLock: true } as any);
      useBluetoothStore.setState({ status: 'connected' } as any);

      expect(checkIsProStatus(mockCustomerInfo)).toBe(true);
    });
  });

  describe('Hata Toleransı (try/catch blokları)', () => {
    it('useBluetoothStore.getState() exception fırlatırsa fonksiyon crash olmadan devam etmeli', () => {
      jest.spyOn(useBluetoothStore, 'getState').mockImplementation(() => {
        throw new Error('Simulated store failure');
      });
      useAppStore.setState({ isSessionProMemoryLock: true } as any);

      expect(() => checkIsProStatus(mockCustomerInfo)).not.toThrow();
    });

    it('useAppStore.getState() exception fırlatırsa fonksiyon crash olmadan devam etmeli', () => {
      const getStateSpy = jest
        .spyOn(useAppStore, 'getState')
        .mockImplementationOnce(() => {
          throw new Error('Simulated store failure');
        });

      expect(() => checkIsProStatus(mockCustomerInfo)).not.toThrow();
      getStateSpy.mockRestore();
    });
  });
});

describe('useAppStore - stopSimulation (Timer Cleanup)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('aktif bir interval yokken çağrıldığında hata fırlatmamalı', () => {
    expect(() => stopSimulation()).not.toThrow();
  });

  it('art arda birden fazla kez çağrıldığında idempotent olmalı (crash veya side-effect birikmemeli)', () => {
    expect(() => {
      stopSimulation();
      stopSimulation();
      stopSimulation();
    }).not.toThrow();
  });

  it('interval aktif değilken clearInterval çağrılmamalı (gereksiz sistem çağrısı yok)', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    stopSimulation();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });
});
