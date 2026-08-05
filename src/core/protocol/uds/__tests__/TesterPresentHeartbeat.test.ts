// src/core/protocol/uds/__tests__/TesterPresentHeartbeat.test.ts
import TesterPresentHeartbeat from '../TesterPresentHeartbeat';

describe('UDS TesterPresentHeartbeat Engine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    TesterPresentHeartbeat.stop();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts and dispatches 0x3E80 command at specified interval', async () => {
    const mockSend = jest.fn().mockResolvedValue('7F3E00');
    TesterPresentHeartbeat.registerSender(mockSend);

    TesterPresentHeartbeat.start(1000);
    expect(TesterPresentHeartbeat.isActive()).toBe(true);

    jest.advanceTimersByTime(1000);
    expect(mockSend).toHaveBeenCalledWith('3E80');

    jest.advanceTimersByTime(2000);
    expect(mockSend).toHaveBeenCalledTimes(3);

    TesterPresentHeartbeat.stop();
    expect(TesterPresentHeartbeat.isActive()).toBe(false);
  });
});
