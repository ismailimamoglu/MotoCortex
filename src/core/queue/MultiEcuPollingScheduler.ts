// src/core/queue/MultiEcuPollingScheduler.ts
// MotoCortex v10.0 - Multi-ECU Parallel Live Data Polling & Round-Robin Scheduler

export interface EcuPollingSlot {
  ecuHeader: string; // e.g. "7E0" (Engine), "7E1" (Transmission), "7E4" (BMS)
  modePid: string; // e.g. "010C" (RPM), "22F40C" (DSG Oil Temp)
  priority: 'HIGH' | 'LOW';
  intervalMs: number;
}

export class MultiEcuPollingScheduler {
  private static instance: MultiEcuPollingScheduler | null = null;
  private isRunning: boolean = false;
  private activeSlots: EcuPollingSlot[] = [];

  private constructor() {}

  public static getInstance(): MultiEcuPollingScheduler {
    if (!MultiEcuPollingScheduler.instance) {
      MultiEcuPollingScheduler.instance = new MultiEcuPollingScheduler();
    }
    return MultiEcuPollingScheduler.instance;
  }

  /**
   * Register polling slots across multiple ECU headers (ECM, TCM, ABS, BMS).
   */
  public registerSlots(slots: EcuPollingSlot[]) {
    this.activeSlots = slots;
    console.log(`[MultiEcuPollingScheduler] Registered ${slots.length} multi-ECU polling slots.`);
  }

  /**
   * Get sorted execution queue prioritizing HIGH-priority sensors.
   */
  public getNextExecutionQueue(): EcuPollingSlot[] {
    return [...this.activeSlots].sort((a, b) => {
      if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
      if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
      return a.intervalMs - b.intervalMs;
    });
  }

  public getActiveSlotsCount(): number {
    return this.activeSlots.length;
  }
}

export default MultiEcuPollingScheduler.getInstance();
