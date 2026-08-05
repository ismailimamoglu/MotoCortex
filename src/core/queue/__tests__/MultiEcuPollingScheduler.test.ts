// src/core/queue/__tests__/MultiEcuPollingScheduler.test.ts
import MultiEcuPollingScheduler from '../MultiEcuPollingScheduler';

describe('MultiEcuPollingScheduler Engine', () => {
  it('registers and sorts polling slots placing HIGH priority sensors first', () => {
    MultiEcuPollingScheduler.registerSlots([
      { ecuHeader: '7E1', modePid: '22F40C', priority: 'LOW', intervalMs: 1000 },
      { ecuHeader: '7E0', modePid: '010C', priority: 'HIGH', intervalMs: 100 },
      { ecuHeader: '7E4', modePid: '223001', priority: 'LOW', intervalMs: 500 },
    ]);

    expect(MultiEcuPollingScheduler.getActiveSlotsCount()).toBe(3);
    const queue = MultiEcuPollingScheduler.getNextExecutionQueue();
    expect(queue[0].modePid).toBe('010C');
    expect(queue[0].priority).toBe('HIGH');
  });
});
