// src/core/queue/__tests__/CommandScheduler.test.ts
import { CommandSchedulerClass } from '../CommandScheduler';

// Mock CommandRateLimiter to resolve pace() instantly without setTimeout delays in unit tests
jest.mock('../CommandRateLimiter', () => ({
  __esModule: true,
  default: {
    pace: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock useBluetoothStore to provide safe default state and helper methods
jest.mock('../../../store/useBluetoothStore', () => {
  let state = {
    guardTime: 50,
    connectionType: 'BLUETOOTH',
    status: 'connected',
    isCloneDevice: false,
    adapterCapabilityScore: 100,
    addLog: jest.fn(),
  };
  return {
    useBluetoothStore: {
      getState: () => state,
      setState: (newState: any) => {
        state = { ...state, ...newState };
      },
    },
  };
});

describe('CommandSchedulerClass', () => {
  let scheduler: CommandSchedulerClass;

  beforeEach(() => {
    scheduler = new CommandSchedulerClass();
  });

  describe('Temel resolve / reject davranışı', () => {
    it('execution fonksiyonu başarılı sonuç döndürdüğünde add() bu değerle resolve olmalı', async () => {
      const execFn = jest.fn().mockResolvedValue('41 00 BE 3E B8 11');
      scheduler.setExecutionFunction(execFn);

      const result = await scheduler.add('0100', 'HIGH', 50, 2000);

      expect(result).toBe('41 00 BE 3E B8 11');
      expect(execFn).toHaveBeenCalledWith('0100', 2000);
    });

    it('execution fonksiyonu reddedildiğinde add() aynı sebeple reject olmalı', async () => {
      const executionError = new Error('NO DATA');
      const execFn = jest.fn().mockRejectedValue(executionError);
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('03', 'LOW', 50, 2000)).rejects.toThrow('NO DATA');
    });

    it('varsayılan parametrelerle çağrıldığında execution fonksiyonuna doğru timeoutMs iletilmeli', async () => {
      const execFn = jest.fn().mockResolvedValue('OK');
      scheduler.setExecutionFunction(execFn);

      await scheduler.add('AT Z');

      expect(execFn).toHaveBeenCalledWith('AT Z', 2000);
    });
  });

  describe('ELM327 / UDS komut senaryoları', () => {
    it('"AT Z" (adaptör reset) komutunu doğru şekilde çözümlemeli', async () => {
      const execFn = jest.fn().mockResolvedValue('ELM327 v1.5');
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('AT Z', 'HIGH_PRIORITY_AD_HOC', 100, 3000)).resolves.toBe(
        'ELM327 v1.5'
      );
    });

    it('"0100" (PID desteği sorgusu) komutunu doğru şekilde çözümlemeli', async () => {
      const execFn = jest.fn().mockResolvedValue('41 00 BE 3E B8 11');
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('0100', 'LOW')).resolves.toBe('41 00 BE 3E B8 11');
    });

    it('UDS 0x22 (ReadDataByIdentifier) komutunu doğru şekilde çözümlemeli', async () => {
      const execFn = jest.fn().mockResolvedValue('62 F1 90 57 42 41');
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('22F190', 'HIGH', 80, 2500)).resolves.toBe(
        '62 F1 90 57 42 41'
      );
      expect(execFn).toHaveBeenCalledWith('22F190', 2500);
    });

    it('UDS 0x2E (WriteDataByIdentifier) komutunu doğru şekilde çözümlemeli', async () => {
      const execFn = jest.fn().mockResolvedValue('6E F1 90');
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('2EF19001', 'HIGH', 80, 2500)).resolves.toBe('6E F1 90');
    });

    it('UDS negatif yanıt (0x7F) durumunda reject olmalı', async () => {
      const execFn = jest.fn().mockRejectedValue(new Error('7F 22 31 - Request Out of Range'));
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('22F190', 'HIGH', 80, 2500)).rejects.toThrow(
        'Request Out of Range'
      );
    });
  });

  describe('Zaman aşımı (timeout) davranışı', () => {
    it('execution fonksiyonu timeoutMs süresi içinde hiç resolve/reject olmazsa, add() zaman aşımı hatasıyla reject olmalı', async () => {
      const execFn = jest.fn().mockImplementation((_cmd, timeoutMs) => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('COMMAND_TIMEOUT')), timeoutMs || 50);
      }));
      scheduler.setExecutionFunction(execFn);

      await expect(scheduler.add('0100', 'LOW', 50, 50)).rejects.toThrow('COMMAND_TIMEOUT');
    });
  });

  describe('Recovery: bir komut zaman aşımına uğradığında kuyruk kilitlenmemeli', () => {
    it('timeout olan bir komuttan sonra gelen komut normal şekilde işlenmeye devam etmeli', async () => {
      const execFn = jest
        .fn()
        .mockImplementationOnce((_cmd, timeoutMs) => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('COMMAND_TIMEOUT')), timeoutMs || 50);
        }))
        .mockImplementationOnce((command: string) => Promise.resolve(`OK:${command}`));
      scheduler.setExecutionFunction(execFn);

      const timedOutCommand = scheduler.add('0100', 'LOW', 50, 50);
      await expect(timedOutCommand).rejects.toThrow('COMMAND_TIMEOUT');

      const nextCommand = scheduler.add('03', 'HIGH', 50, 2000);
      await expect(nextCommand).resolves.toBe('OK:03');
      expect(execFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Öncelik parametreleri kabul ediliyor mu', () => {
    it.each(['HIGH', 'LOW', 'HIGH_PRIORITY_AD_HOC'] as const)(
      '"%s" önceliğiyle eklenen komut hatasız şekilde işlenmeli',
      async (priority) => {
        const execFn = jest.fn().mockResolvedValue('OK');
        scheduler.setExecutionFunction(execFn);

        await expect(scheduler.add('0100', priority, 50, 2000)).resolves.toBe('OK');
      }
    );
  });

  describe('Weighted Fair Queuing (WFQ) Önceliklendirme', () => {
    const createControlledExecFn = () => {
      const dispatchOrder: string[] = [];
      const pendingResolvers: Array<(value: string) => void> = [];

      const execFn = jest.fn((command: string) => {
        dispatchOrder.push(command);
        return new Promise<string>((resolve) => {
          pendingResolvers.push(resolve);
        });
      });

      const resolveNext = async (value = 'OK') => {
        let waitCount = 0;
        while (pendingResolvers.length === 0 && waitCount < 50) {
          await new Promise((r) => setTimeout(r, 2));
          waitCount++;
        }
        const resolve = pendingResolvers.shift();
        if (!resolve) {
          throw new Error('resolveNext() cagrildi ama bekleyen bir promise yok');
        }
        resolve(value);
        await new Promise((r) => setTimeout(r, 2));
      };

      return { execFn, dispatchOrder, resolveNext };
    };

    it('HIGH_PRIORITY_AD_HOC komutu, kuyrukta bekleyen HIGH/LOW komutlarinin onune gecmeli', async () => {
      const { execFn, dispatchOrder, resolveNext } = createControlledExecFn();
      scheduler.setExecutionFunction(execFn);

      const blocker = scheduler.add('BLOCKER', 'LOW', 50, 5000);
      const low = scheduler.add('LOW_CMD', 'LOW', 50, 5000);
      const high = scheduler.add('HIGH_CMD', 'HIGH', 50, 5000);
      const adHoc = scheduler.add('AT Z', 'HIGH_PRIORITY_AD_HOC', 50, 5000);

      await resolveNext('blocker-ok');
      expect(dispatchOrder[1]).toBe('AT Z');

      await resolveNext();
      expect(dispatchOrder[2]).toBe('HIGH_CMD');

      await resolveNext();
      expect(dispatchOrder[3]).toBe('LOW_CMD');

      await resolveNext();
      await Promise.all([blocker, low, high, adHoc]);
    });

    it('HIGH komutlar ust uste en fazla 4 kez (MAX_HIGH_CONSECUTIVE) calismali, 5. slotta bekleyen LOW komuta aclik onleme uygulanmali', async () => {
      const { execFn, dispatchOrder, resolveNext } = createControlledExecFn();
      scheduler.setExecutionFunction(execFn);

      // Toplam 7 komut: BLOCKER (HIGH, 1), H1..H5 (HIGH, 5), DTC_READ (LOW, 1)
      const blocker = scheduler.add('BLOCKER', 'HIGH', 50, 5000);
      const highCommands = ['H1', 'H2', 'H3', 'H4', 'H5'].map((cmd) =>
        scheduler.add(cmd, 'HIGH', 50, 5000)
      );
      const lowCommand = scheduler.add('DTC_READ', 'LOW', 50, 5000);

      // BLOCKER (HIGH #1), H1 (HIGH #2), H2 (HIGH #3), H3 (HIGH #4) -> 4 adet HIGH çalıştı
      await resolveNext('blocker-ok');
      await resolveNext();
      await resolveNext();
      await resolveNext();

      // 4 HIGH komut sonrası (BLOCKER + H1 + H2 + H3) açlık önleme tetiklenir -> DTC_READ (LOW) dispatch edilir
      await resolveNext();
      expect(dispatchOrder.slice(0, 5)).toEqual(['BLOCKER', 'H1', 'H2', 'H3', 'DTC_READ']);
      expect(dispatchOrder[4]).toBe('DTC_READ');

      // DTC_READ sonrası geriye kalan H4 ve H5 çalıştırılır
      await resolveNext();
      await resolveNext();
      await Promise.all([blocker, ...highCommands, lowCommand]);
    });
  });
});
