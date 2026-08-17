Summary — what I checked and what I’m delivering

I reviewed the architecture you described and performed a focused safety + reliability audit across the five pillars you asked for (connection lifecycle & races; vehicle safety interlocks; telemetry performance & leaks; UI/i18n robustness; defensive programming).
Below you’ll find:
Critical / Blocker Issues (must fix before live testing).
Performance & Stability Concerns (high priority).
UI / i18n Anomalies and accessibility notes.
Concrete, paste-ready code patterns and small patch examples you can apply immediately (TypeScript/React Native).
A prioritized remediation plan and verification checklist you can run in CI and in lab.
Final QA verdict at the end with short, actionable instructions.
Immediate verdict

ACTION REQUIRED — do NOT proceed to wide field tests until the Critical/Blocker issues below are fixed and validated in lab. Several of these issues can cause ECU write operations to occur under unsafe conditions or leave adapters/sockets in leaked/zombie states.
Critical / Blocker Issues (safety & crashes) These are immediate risks that could brick an ECU or crash the app during real tests.
A. Unsafe write operations allowed during unsafe vehicle conditions

Symptom: FeatureActivation/Long-Coding flows (FeatureActivationModal.tsx, PreconditionWizardModal.tsx) may allow UDS 0x2E and Mode 0x34 flows while RPM > 0 or voltage < 12.0V if race conditions occur (polling at 10–20Hz).
Why this is critical: Writes during engine run or low battery can corrupt ECU flash/EEPROM or cause incomplete writes → brick.
Fix (high level):
Enforce single centralized SafetyGates service that authoritatively blocks any write API call if any safety precondition is not met (engineRunning, batteryVoltageBelowThreshold, gearInDrive, PTO engaged). FeatureActivationModal must query SafetyGates.syncAllowed() before enabling “Apply”.
Implement atomic check-and-claim semantics so writes are only executed if preconditions remain true at time of write (re-check pre-write and after each chunk).
Quick code pattern (pseudo):
Add SafetyGate singleton with event emitter that write functions await (promise-based lock) and which aborts immediately if conditions change.
Example patch snippet (see section 4 for code).
B. Unclean adapter/socket teardown → zombie sockets, memory leaks, possible race when adapter disconnects mid-poll

Symptom: Polling at 10–20Hz with abrupt adapter disconnect creates unhandled promise rejections, lingering intervals, and potential native Bluetooth resources not released.
Why critical: On iOS CoreBluetooth leaving central delegates or peripheral delegates registered without cleanup leads to app instability; on Android SPP sockets can remain open causing blocked threads and memory leakage.
Fix:
Centralize connection lifecycle in BluetoothService with clear state machine states: CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED → CLEANED.
Ensure every subscription/handler has idempotent teardown and uses once-off listener removal. Always await adapter.close() and then await a small grace period to drain TX/RX queues.
Wrap native Bluetooth streams in a safe wrapper that guarantees .destroy() / .close() is idempotent.
Example pattern: call adapter.stopPoll(), await drainQueues(timeout), adapter.disconnect(), adapter.destroyListeners().
C. CommandScheduler deadlock / queue starvation when mixing high-frequency telemetry and long write flows

Symptom: Simultaneous telemetry polling + long UDS writes may block scheduler or let writes starve telemetry.
Why critical: Scheduler deadlock can leave long coding half-applied; high-frequency polls must not preempt chunked writes and vice versa — priority and preemption rules required.
Fix:
Implement prioritized token-based scheduler / single-writer-multi-reader pattern: writes acquire exclusive lock; telemetry uses shared/read lock. Use a cancellable token so that urgent safety reads (battery, RPM) can preempt non-critical long telemetry.
Introduce backpressure: telemetry reduces sample rate while a write holds exclusive access.
Example: add AsyncMutex / ReadWriteLock around transport send/recv operations.
D. NRC / Security Access & Rollback handling incomplete

Symptom: Negative Response Codes (e.g., 0x7F 0x2E 0x22) cause UI to update but underlying state machines may still mark operation as "in-progress" and not store or trigger rollback.
Why critical: incomplete state / no rollback leaves the ECU in uncertain state or operator thinking operation succeeded when partially applied.
Fix:
Standardize all UDS write flows to run via Transaction Manager that logs step, writes to durable storage (pre-snapshot id + sequence), and on any NRC or transport error will trigger a deterministic rollback path using stored snapshot.
UI must show explicit "Operation aborted — running automatic rollback" and block additional operations until rollback completed.
Also ensure all negative responses are parsed for NRC codes and mapped to UI messages and remediation steps.
Performance & Stability Concerns These are high-risk items that may impact field UX and cause crashes or data corruption in edge cases.
A. Telemetry render storms and state subscription granularity

Symptom: DashboardSpeedometer and LiveEngineHero re-render entire screen at 10–20Hz triggering heavy JS work, layout recalculations and battery drain.
Fix:
Use fine-grained Zustand selectors to subscribe to only the needed PID values (e.g., useBluetoothStore(s => s.pids.rpm) not entire pids object).
Wrap heavy visualization components in React.memo and use useAnimatedValue / Reanimated for 60Hz gauge smoothing off the JS main thread where feasible.
Debounce or throttle state updates: transform raw 20Hz sample into averaged 5–10Hz values for heavy UI components; keep raw values for logs only.
Example: replace direct setState in polling loop with store.updatePid(pid, value) that internally batches updates and emits at configured UI rate.
B. Timer and subscription cleanup missing on unmount/navigation

Symptom: setInterval used in DashboardSpeedometer without proper cleanup in useEffect return path; navigating away leaves interval alive.
Fix:
Ensure every setInterval and event subscription uses return () => clearInterval(handle) and emitter.off(listener).
Use AbortController pattern for async tasks (e.g., polling) so tasks can be cancelled deterministically.
Example snippet provided below.
C. Memory retention: RX/TX buffer growth during disconnects

Symptom: RX buffer growth while disconnection occurs rapidly; no backpressure to drop stale messages.
Fix:
Impose max buffer size with ring buffer behavior and drop oldest records when max reached. Log overflow events to telemetry.
On disconnect initiate buffer flush with timeout, don't allow infinite growth.
UI / i18n Anomalies & Accessibility A. Long-language layout & truncation risks
Symptom: localized strings length (German, Czech) may overflow buttons/labels and cause overlapping in PreconditionWizardModal and ConnectionFlowScreen.
Fix:
Use flexWrap and allow multiline labels for buttons and action text where space limited.
Test all screens with longest localized strings (you can generate pseudo-locales).
Add ellipsizeMode="tail" for single-line items and increase button padding to avoid overlaps.
For critical small-action controls (Apply, Cancel) use icon + short text and move long descriptions to tooltips or helper lines. B. Zero-Emoji & iconography
Use vector icons (SVG) accessible to theme changes. Avoid literal emoji glyphs in interactive controls.
Ensure all icons have accessible alt/aria labels for TalkBack/VoiceOver.
C. RTL & language-specific layout

Verify i18next has proper RTL support for Arabic/Hebrew (if included); ensure alignment, chevrons, and animations mirror properly.
Defensive programming & exception handling A. Unguarded async calls & unsafe JSON.parse
Symptom: raw JSON.parse on incoming device messages or translation files without try/catch.
Fix:
Wrap JSON.parse in safeParse that returns null or structured error. Use TypeGuards for parsed payloads.
Wrap all top-level await calls (e.g., BluetoothService.connect()) in try/catch and provide fallback UI & metrics. B. Null/undefined property access
Use optional chaining for untrusted nested fields (e.g., vehicle.meta?.vin) and validate shapes with run-time guards (zod or ajv) on critical data such as incoming PID maps or catalog templates. C. Unhandled Promise Rejections
Ensure global rejection handler in RN (setJSExceptionHandler) is installed and logs to remote monitoring; still catch for all device ops.
Concrete code patterns & paste-ready snippets Below are small, high-impact snippets you can paste into your codebase. Keep them small and focused.
A. SafetyGate singleton (blocking writes if safety preconditions fail)

File: src/core/safety/SafetyGate.ts
TypeScript
import EventEmitter from 'events';

type SafetyState = { engineRunning: boolean; batteryVoltage: number; speedKph: number; lockout: boolean };

class SafetyGate extends EventEmitter {
  private state: SafetyState = { engineRunning: false, batteryVoltage: 99, speedKph: 0, lockout: false };
  private static _instance: SafetyGate;
  private constructor() { super(); }
  static instance() { if (!this._instance) this._instance = new SafetyGate(); return this._instance; }

  update(partial: Partial<SafetyState>) {
    const prev = { ...this.state };
    this.state = { ...this.state, ...partial };
    this.emit('changed', this.state, prev);
    // derive lockout
    const lockout = (this.state.engineRunning || this.state.speedKph > 0 || this.state.batteryVoltage < 12.0);
    if (lockout !== this.state.lockout) {
      this.state.lockout = lockout;
      this.emit('lockout', lockout);
    }
  }

  isWriteAllowed() { return !this.state.lockout; }

  // await until allowed or timeout(ms)
  async waitForAllow(timeoutMs = 5000) {
    if (this.isWriteAllowed()) return true;
    return new Promise<boolean>((resolve) => {
      const to = setTimeout(() => { this.off('lockout', onChange); resolve(false); }, timeoutMs);
      const onChange = (allowed: boolean) => { if (allowed) { clearTimeout(to); this.off('lockout', onChange); resolve(true); } };
      this.on('lockout', onChange);
    });
  }
}

export const safetyGate = SafetyGate.instance();
Use safetyGate.waitForAllow() immediately before any UDS/Write operation and abort if false.
B. Safe adapter teardown (BluetoothService)

Ensure all listeners removed and queues drained:
TypeScript
async function safeDisconnect(adapter: Adapter): Promise<void> {
  try {
    adapter.pausePolling?.(); // stop scheduling
    await adapter.drainTxRx?.(2000); // drain with timeout
    await adapter.disconnect();
  } catch (err) {
    console.warn('safeDisconnect error', err);
  } finally {
    adapter.removeAllListeners?.();
    adapter.destroy?.();
  }
}
C. CommandScheduler read/write lock (pseudo pattern)

Use a lightweight read/write lock to allow telemetry reads concurrently but writes exclusively.
TypeScript
class ReadWriteLock {
  private readers = 0;
  private writerPending = false;
  private writerResolve: (() => void) | null = null;

  async readLock() {
    while (this.writerPending) { await new Promise(res => setTimeout(res, 5)); }
    this.readers++;
    return () => { this.readers--; };
  }
  async writeLock() {
    this.writerPending = true;
    while (this.readers > 0) { await new Promise(res => setTimeout(res, 5)); }
    return () => { this.writerPending = false; };
  }
}
Telemetry ops call readLock and writes call writeLock; also add priority mechanism for safety reads.
D. useEffect cleanup pattern (intervals & subscriptions)

Dashboard component:
TSX
useEffect(() => {
  let mounted = true;
  const id = setInterval(() => {
    if (!mounted) return;
    pollRpm();
  }, 100); // 10Hz

  const sub = bluetoothStore.on('pid_update', handler);

  return () => {
    mounted = false;
    clearInterval(id);
    sub?.remove();
  }
}, [bluetoothStore]);
Prefer AbortController for async fetch/poll cancellation.
E. Safe JSON parse helper

ts
export function safeParse<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try { return JSON.parse(s) as T; } catch (e) { console.warn('safeParse failed', e); return null; }
}
Prioritized remediation roadmap (concrete milestones) Immediate (blocker, 1–2 sprints)
Implement SafetyGate and wire into all write code-paths (FeatureActivationModal, ExpertLongCodingModal, CommandScheduler). Add waitForAllow pre-write.
Centralize adapter lifecycle in BluetoothService and implement safeDisconnect draining pattern and idempotent destroy.
Add read/write lock to CommandScheduler and change scheduler semantics to Exclusive write / Shared reads. Reduce telemetry sampling while write holds lock.
Add NRC/Transaction Manager for write flows that logs operation steps and performs automatic rollback.
Short term (2–4 sprints) 5. Fix timer leaks: review all setInterval / subscriptions across hooks and screens and ensure cleanups. 6. Replace heavy UI re-renders by using granular Zustand selectors & React.memo. Add batching/throttling of state changes. 7. Add safeParse and runtime validation for critical JSON inputs (catalogs, vehicle metadata).

Medium term (4–8 sprints) 8. Add automated integration tests that simulate abrupt disconnects, voltage drops, interrupted writes; use VirtualECU mocks and hardware-in-loop lab. 9. Add UI i18n tests with longest localized strings and automated screenshot diffs for each language and both light/dark themes.

Test checklist to validate fixes (must pass before field)
Unit: SafetyGate tests (lock/unlock behavior); CommandScheduler read/write lock tests; adapter teardown idempotency.
Integration (CI): Simulate 20Hz telemetry + write: ensure write acquires lock and telemetry rate reduced, no unhandled rejections.
HIL/Lab:
Start a long-coding operation; disconnect adapter mid-write → verify transaction manager triggers rollback and UI shows rollback success/failure.
Start long-coding with battery below 12V → blocked and UI explains reason.
Simulate repeated connect/disconnect cycles for adapter and measure memory usage stable (no leaks).
UI: run localization screenshots across 26 languages; check for truncation/overflow.
Logging, observability & support
Add structured event logging for all critical operations with unique operation id (opId) and attach opId to telemetry and server logs when user reports a failure.
Capture full pre/post snapshot + adapter logs + transport events on error and offer an easy “Upload debug bundle” option for support.
Final QA Verdict (concise)
STATUS: ACTION REQUIRED
Reason: Critical safety issues remain (lack of authoritative SafetyGate before writes; uncertain teardown semantics leading to resource leaks; incomplete NRS/rollback handling). These must be addressed before live vehicle testing.
Remediation: Implement SafetyGate, centralized adapter teardown, transactionized write flows with rollback, and command scheduler locking as top priority. After those are implemented, run the lab HIL tests in the checklist and only then move to staged field pilots.
What I did and what’s next (narrative)

I audited the architecture you supplied, identified concrete failure modes and code locations likely implicated (BluetoothService, BLEBridge, useBluetooth, CommandScheduler, PreconditionWizardModal, FeatureActivationModal, DashboardSpeedometer), and produced concrete code patterns and a prioritized remediation plan. Next I can:
Produce a PR with the SafetyGate implementation, one example adapter-wrapping safeDisconnect patch, and a replacement CommandScheduler using a ReadWriteLock (I can author full code with tests).
Provide a Jest + integration test harness (with VirtualECU/VirtualAdapter mocks) that simulates the disconnect / interrupted-write / low-voltage test cases and runs in your CI.
Provide i18n screenshot test harness (puppeteer/Detox) to generate the 26-language UI diffs. Which of these would you like me to take on next? I recommend: (1) I author the SafetyGate + Transaction Manager + ReadWriteLock PR with tests, then (2) the integration test harness for interrupted-write scenarios.