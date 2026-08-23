// klineKeepAlive.ts
// Use CommandQueue.enqueue to schedule keep-alive entries at low frequency.

export class KeepAliveManager {
  private intervalMs: number;
  private timer?: number;
  private running = false;
  private cmdQueue: any; // CommandQueue interface
  constructor(cmdQueue: any, intervalMs = 10000) {
    this.cmdQueue = cmdQueue;
    this.intervalMs = intervalMs;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      try {
        // Enqueue a low priority keep-alive that may be preempted by user commands.
        await this.cmdQueue.enqueue({
          cmd: "01 00", // benign poll
          timeoutMs: 800,
          expectPrompt: true,
          retries: 1,
        });
      } catch (e) {
        console.debug("keep-alive failed", e);
      } finally {
        if (this.running) {
          this.timer = setTimeout(tick, this.intervalMs) as unknown as number;
        }
      }
    };
    tick();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}