# MotoCortex QA Audit Report

## Summary
The codebase was audited for performance bottlenecks, memory leaks, and runtime crashes. Several critical issues were identified and patched. A significant performance bottleneck was found in the dashboard re-rendering logic.

## 1. Memory Leaks & Cleanup
**Status:** ⚠️ **FIXED**

*   **Issue 1:** The `useBluetooth` hook's polling loop (`performPollSync`) used a recursive `setTimeout` strategy. While it handled disconnects, it did not cancel the timeout or stop the loop if the component unmounted while polling was active. This could lead to memory leaks and attempts to update state on unmounted components.
    *   **Fix Applied:** Added a `useEffect` cleanup function in `src/hooks/useBluetooth.ts` to explicitly stop polling when the component unmounts.
*   **Issue 2:** Modals (`BatteryTestModal` and `PerformanceModal`) were initializing intervals that were not cleared when the component unmounted.
    *   **Fix Applied:** Added `useEffect` cleanup functions in `src/components/BatteryTestModal.tsx` and `src/components/PerformanceModal.tsx` to clear these intervals upon component destruction.

## 2. i18n Safety
**Status:** ⚠️ **FIXED / WARNING**

*   **Issue 1 (Crash Risk):** The `initI18n` function in `src/i18n.ts` read from `AsyncStorage` without a `try/catch` block. If storage access failed (e.g., corrupted data or permission issues), the app could crash during startup.
    *   **Fix Applied:** Wrapped the storage access in `src/i18n.ts` with error handling.
*   **Issue 2 (Typos):**
    *   Found typos/misspellings in `src/locales/id.json` (e.g., "GARAŞ" instead of "GARASI", "TİNDAKAN" with Turkish 'İ').
    *   No missing translation keys were found that would cause a crash.

## 3. AsyncStorage Robustness
**Status:** ❌ **FIXED**

*   **Issue:** The `saveGarageRecord`, `getGarageRecords`, and `deleteGarageRecord` functions in `src/store/garageStore.ts` did not handle `AsyncStorage` errors. A storage failure (e.g., device full) would cause an unhandled promise rejection and potentially crash the app when saving a vehicle.
*   **Fix Applied:** Wrapped all storage operations in `src/store/garageStore.ts` with `try/catch` blocks. `saveGarageRecord` now returns `null` on failure instead of throwing.

## 4. Re-render Optimization
**Status:** ❌ **CRITICAL BOTTLENECK**

*   **Issue:** The `useBluetooth` hook subscribes to the *entire* `useBluetoothStore` state.
    *   `App.tsx` uses `useBluetooth`, so `App.tsx` re-renders whenever *any* value in the store changes.
    *   With the new 4Hz polling for RPM and Speed, the entire `App` component (including hidden tabs like Info/Expertise) re-renders at least 8-10 times per second.
    *   This will cause high CPU usage and battery drain.
*   **Recommendation:** Refactor `App.tsx` to isolate the high-frequency dashboard components.
    *   **Proposed Fix (Snippet):** extract the Dashboard into a separate component that subscribes only to the necessary data slices using `zustand` selectors, instead of passing everything down from `App.tsx`.

### Recommended Patch for Re-rendering (App.tsx Refactor)

Instead of:
```typescript
const { rpm, speed, ... } = useBluetooth();
```

Use atomic selectors in a child component:
```typescript
const Dashboard = () => {
  const rpm = useBluetoothStore(s => s.rpm);
  const speed = useBluetoothStore(s => s.speed);
  // ... render ...
}
```

## Conclusion
The critical crash risks and memory leaks have been patched. The app is safe for AAB build regarding stability, but the **performance bottleneck** in `App.tsx` should be addressed before a wide release to ensure good user experience on lower-end devices.
