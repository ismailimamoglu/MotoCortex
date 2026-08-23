// telemetrySubscriptionManager.ts
// Idempotent telemetry subscription manager that reattaches after reconnects.

type TelemetryPayload = { pid: string; value: number; timestamp: number };
type TelemetryCallback = (t: TelemetryPayload) => void;

export class TelemetrySubscriptionManager {
  private subscribers = new Map<number, TelemetryCallback>();
  private nextId = 1;
  private transportAttachFn: ((cb: (chunk: any) => void) => () => void) | null = null;
  private transportUnsub: (() => void) | null = null;
  private lastValues = new Map<string, TelemetryPayload>();

  public setTransportAttach(attach: (cb: (chunk: any) => void) => () => void) {
    // attach is called once by the CommandQueue or outer system to provide data stream
    this.transportAttachFn = attach;
    this.reattachTransport();
  }

  private reattachTransport() {
    // detach existing
    if (this.transportUnsub) {
      try { this.transportUnsub(); } catch {}
      this.transportUnsub = null;
    }
    if (!this.transportAttachFn) return;
    // attach and register handler
    this.transportUnsub = this.transportAttachFn((chunk) => {
      // chunk is already parsed frames or raw -> transform into TelemetryPayloads
      const events = this.transformChunkToTelemetry(chunk);
      for (const ev of events) {
        this.lastValues.set(ev.pid, ev);
        for (const cb of this.subscribers.values()) {
          try { cb(ev); } catch (e) { console.warn("telemetry callback failed", e); }
        }
      }
    });
  }

  public subscribe(cb: TelemetryCallback): { id: number; unsubscribe: () => void } {
    const id = this.nextId++;
    this.subscribers.set(id, cb);
    // replay last values so UI shows latest
    for (const payload of this.lastValues.values()) {
      try { cb(payload); } catch {}
    }
    return {
      id,
      unsubscribe: () => { this.subscribers.delete(id); },
    };
  }

  // call on connect
  public onConnected() {
    this.reattachTransport();
  }

  // call on disconnect
  public onDisconnected() {
    if (this.transportUnsub) {
      try { this.transportUnsub(); } catch {}
      this.transportUnsub = null;
    }
    // but keep subscribers in memory; they'll be re-fed on reconnect
  }

  private transformChunkToTelemetry(chunk: any): TelemetryPayload[] {
    // adapt this to your ParsedFrame shape
    // Example: chunk = { pid: '0C', value: 800, timestamp: ... }
    if (Array.isArray(chunk)) {
      return chunk.map((c: any) => ({ pid: c.pid || 'unknown', value: c.value || 0, timestamp: c.timestamp || Date.now() }));
    }
    return [{ pid: chunk.pid ?? 'unknown', value: chunk.value ?? 0, timestamp: Date.now() }];
  }
}