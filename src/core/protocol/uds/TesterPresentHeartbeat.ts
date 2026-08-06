// src/core/protocol/uds/TesterPresentHeartbeat.ts
// MotoCortex v10.0 - UDS Diagnostic Session Auto TesterPresent (0x3E) Heartbeat Engine

export class TesterPresentHeartbeat {
  private static instance: TesterPresentHeartbeat | null = null;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private sendCommandFn: ((cmd: string) => Promise<string | undefined>) | null = null;
  private intervalMs: number = 2000;

  private isExecuting: boolean = false;

  private constructor() {}

  public static getInstance(): TesterPresentHeartbeat {
    if (!TesterPresentHeartbeat.instance) {
      TesterPresentHeartbeat.instance = new TesterPresentHeartbeat();
    }
    return TesterPresentHeartbeat.instance;
  }

  /**
   * Configure the communication callback used to send raw UDS frames.
   */
  public registerSender(sendCommandFn: (cmd: string) => Promise<string | undefined>) {
    this.sendCommandFn = sendCommandFn;
  }

  private scheduleNextTick() {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      if (!this.isRunning || !this.sendCommandFn || this.isExecuting) {
        this.scheduleNextTick();
        return;
      }
      this.isExecuting = true;
      try {
        // Send UDS 0x3E 0x80 (TesterPresent with suppressPosRspMsgIndicationBit)
        await this.sendCommandFn('3E80');
      } catch (error) {
        console.warn('[TesterPresentHeartbeat] Failed to send 0x3E heartbeat:', error);
      } finally {
        this.isExecuting = false;
        this.scheduleNextTick();
      }
    }, this.intervalMs);
  }

  /**
   * Start auto TesterPresent (0x3E 0x80 - Suppress Positive Response) loop.
   */
  public start(intervalMs: number = 2000) {
    if (this.isRunning) return;
    this.intervalMs = intervalMs;
    this.isRunning = true;
    this.scheduleNextTick();
    console.log(`[TesterPresentHeartbeat] Started active UDS 0x3E heartbeat loop (${intervalMs}ms)`);
  }

  /**
   * Stop the active heartbeat loop when leaving UDS session.
   */
  public stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.isExecuting = false;
    console.log('[TesterPresentHeartbeat] Stopped UDS 0x3E heartbeat loop');
  }

  public isActive(): boolean {
    return this.isRunning;
  }
}

export default TesterPresentHeartbeat.getInstance();
