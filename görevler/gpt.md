\# MotoCortex Pre-Release Audit

\#\# Audit Scope Limitation

I cannot retrieve or inspect external GitHub repositories from this environment. The supplied URL also references a mutable repository state rather than an immutable release commit/tag.

Consequently, I could not verify source files, generated native manifests, release binaries, or runtime behavior. The items below are therefore \*\*unverified release gates\*\*, not claims that MotoCortex definitely contains these defects. Approving the release without verifying them would be unsafe.

\---

\#\# 1\. Critical Blockers — Must Verify/Fix Before Submission

\#\#\# A. Release candidate provenance

\*\*Status: BLOCKED / NOT VERIFIED\*\*

A production audit must target an exact artifact.

Required evidence:

\- Exact Git commit SHA and release tag.  
\- \`package.json\` and lockfile.  
\- \`app.json\` / \`app.config.ts\`.  
\- \`eas.json\`.  
\- Generated iOS \`Info.plist\`, entitlements, and privacy manifest.  
\- Final Android merged \`AndroidManifest.xml\`.  
\- Signed or unsigned RC IPA/AAB corresponding to the audited commit.

Expo configuration alone is insufficient because config plugins and native dependencies can change generated permissions.

\---

\#\#\# B. Bluetooth, location, and background permissions

\*\*Status: CRITICAL — NOT VERIFIED\*\*

\#\#\#\# iOS pass criteria

Verify the final built application contains accurate, user-facing descriptions for every requested capability, including where applicable:

\- \`NSBluetoothAlwaysUsageDescription\`.  
\- Legacy Bluetooth usage keys only if required by the deployment target.  
\- Location usage keys only if MotoCortex actually uses location.

Bluetooth scanning does not justify unnecessary location access on modern iOS. Requesting location without a real feature can create privacy-review concerns.

If background BLE is enabled:

\- \`UIBackgroundModes\` must contain only capabilities the application genuinely uses.  
\- Store metadata and in-app behavior must clearly explain continued background communication.  
\- The app must not imply unlimited background execution.

\#\#\#\# Android pass criteria

Verify API-level-specific handling for:

\- \`BLUETOOTH\_SCAN\`.  
\- \`BLUETOOTH\_CONNECT\`.  
\- Legacy Bluetooth permissions restricted to applicable Android versions.  
\- Pre-Android 12 location permission where required for scanning.  
\- \`neverForLocation\` only when scanner results are genuinely never used to infer location.  
\- Foreground-service permission/type and persistent notification if communication continues in the background.  
\- Runtime denial, permanent denial, and “Bluetooth disabled” paths.

Permission prompts must be preceded by a contextual explanation rather than appearing unexpectedly on launch.

\---

\#\#\# C. iOS hardware compatibility disclosure

\*\*Status: CRITICAL — NOT VERIFIED\*\*

Generic Bluetooth Classic serial ELM327 adapters generally cannot be used by an iOS application unless they expose an Apple-supported/MFi protocol. BLE, supported Wi-Fi adapters, or explicitly supported accessories are the normal iOS paths.

Before purchase and before scanning, the UI should clearly state:

\- \*\*iOS:\*\* supported adapter types and known limitations.  
\- \*\*Android:\*\* BLE versus Bluetooth Classic support.  
\- That “Bluetooth” branding alone does not guarantee compatibility.  
\- A list or link identifying tested adapters.

The app must not let an iOS user purchase a subscription and only afterward discover that their common Classic ELM327 adapter cannot connect. That creates both “app inoperable” and purchase/refund review risks.

\---

\#\#\# D. Paywall and subscription compliance

\*\*Status: CRITICAL — NOT VERIFIED\*\*

The production paywall must expose, without hidden navigation:

\- Restore Purchases on iOS for restorable purchases/subscriptions.  
\- Privacy Policy link.  
\- Terms of Use/EULA link.  
\- Subscription duration and localized price.  
\- Trial duration, if applicable.  
\- Clear auto-renewal and cancellation language.  
\- What functionality is unlocked.  
\- Functional links in release builds, not placeholder URLs.

Also verify:

\- Restore works after reinstall and on a second device using the same store account.  
\- Purchase cancellation is not presented as an error.  
\- Pending, interrupted, already-owned, refunded, and expired states are handled.  
\- Server entitlement validation does not leave the user permanently stuck behind the paywall.  
\- No external payment routing is shown where store policy prohibits it.

\---

\#\#\# E. Privacy, automotive safety, and ECU coding warnings

\*\*Status: CRITICAL — NOT VERIFIED\*\*

MotoCortex processes potentially sensitive vehicle information such as VINs, fault codes, adapter identifiers, and telemetry. Verify consistency among:

\- Actual SDK/network behavior.  
\- Apple privacy disclosures.  
\- Google Play Data Safety form.  
\- In-app Privacy Policy.  
\- Consent and account-deletion behavior, where applicable.  
\- Apple privacy manifest and required-reason API declarations.

Safety messaging should not exist only inside a long Terms document. At minimum:

\- “Do not operate while driving.”  
\- Diagnostics may be inaccurate or incomplete.  
\- The app is not a substitute for qualified service.  
\- Vehicle/manufacturer compatibility is not guaranteed.  
\- ECU coding can render modules or the vehicle inoperable.  
\- Coding requires stable battery voltage and must not be interrupted.  
\- Explicit confirmation immediately before write/coding operations.

A disclaimer does not replace safe product behavior. Coding actions should have conservative defaults, clear target-module identification, and no automatic retry of non-idempotent write commands.

\---

\#\#\# F. Disconnect and fault-recovery state machine

\*\*Status: CRITICAL — NOT VERIFIED\*\*

The following physical tests are mandatory:

1\. Unplug adapter during scan.  
2\. Unplug while connecting.  
3\. Unplug during ELM initialization.  
4\. Unplug during continuous PID polling.  
5\. Disable Bluetooth during telemetry.  
6\. Background/foreground the app during polling.  
7\. Unplug during ECU coding.  
8\. Reconnect to the same and a different adapter.

Required behavior:

\- One authoritative connection state machine.  
\- Bounded retries with backoff.  
\- No concurrent reconnect loops.  
\- No unhandled promise rejection.  
\- Stale callbacks cannot restore an old connection state.  
\- Telemetry stops immediately after disconnect.  
\- User can manually reconnect without restarting the app.  
\- Coding commands are not blindly replayed after a timeout.

Using \`Promise.race()\` for a timeout is not sufficient unless the underlying BLE/socket operation is also cancelled or invalidated.

\#\#\#\# Safe Disconnect acceptance criteria

Teardown should be idempotent and follow approximately this order:

1\. Stop and invalidate polling.  
2\. Cancel pending commands and retry timers.  
3\. Unsubscribe notification/listener handles.  
4\. Close BLE/Classic connection handles.  
5\. Clear parser and transport buffers.  
6\. Reset adapter/session-specific state.  
7\. Publish the disconnected UI state.

Calling disconnect twice must not throw.

\---

\#\#\# G. ELM327 parser resilience

\*\*Status: CRITICAL — NOT VERIFIED\*\*

The parser must tolerate fragmented and concatenated transport frames, command echo, prompts, whitespace, and unsolicited status text.

At minimum, test:

\- \`SEARCHING...\`  
\- \`STOPPED\`  
\- \`NO DATA\`  
\- \`CAN ERROR\`  
\- \`BUS ERROR\`  
\- \`UNABLE TO CONNECT\`  
\- \`?\`  
\- \`BUFFER FULL\`  
\- Command echo mixed with data.  
\- Prompt \`\>\` arriving in a separate packet.  
\- Odd-length hex.  
\- Invalid hex characters.  
\- Truncated CAN frames.  
\- Multiple PID replies in one read.  
\- Headers on/off.  
\- Lowercase and inconsistent whitespace.  
\- Clone adapters returning delayed responses from a previous command.

No unchecked array indexing, unchecked \`parseInt\`, or assumption that one BLE notification equals one OBD response should reach production.

Parser fuzz tests and captured-response regression fixtures should be release-gating for ECU write/coding functionality.

\---

\#\#\# H. Telemetry timers and memory growth

\*\*Status: CRITICAL — NOT VERIFIED\*\*

Verify every polling path is cancelled on:

\- Component unmount.  
\- Screen blur/navigation.  
\- Adapter disconnect.  
\- App backgrounding, unless explicitly supported.  
\- Vehicle/session change.  
\- Error and timeout.  
\- Logout or entitlement loss.

An async \`setInterval\` can overlap requests when an OBD response takes longer than the interval. Prefer a single-flight loop that schedules the next request only after the previous request completes.

Also verify:

\- Chart data uses bounded ring buffers.  
\- Diagnostic logs are bounded.  
\- Event listeners are removed.  
\- No reconnect or polling timer survives teardown.  
\- Pending state updates cannot target an unmounted screen.  
\- Telemetry does not update the entire React component tree at adapter frequency.

A practical architecture is to process transport data outside React state and publish UI snapshots at a controlled cadence.

\---

\#\#\# I. 26-language and compact-screen layout

\*\*Status: CRITICAL — NOT VERIFIED\*\*

Required device/layout tests:

\- iPhone SE-sized viewport.  
\- 360 px-wide Android viewport.  
\- Maximum supported accessibility font scaling.  
\- German, Dutch, Polish, and the longest actual translations.  
\- Pseudolocalization with approximately 30–40% string expansion.  
\- RTL layout if any supported language is RTL.  
\- Keyboard-visible and landscape states where supported.

Important: \`adjustsFontSizeToFit\` and \`numberOfLines={1}\` are not universal fixes. They can hide content or undermine accessibility.

Pass criteria include:

\- Text containers use suitable \`flexShrink\`, \`flexGrow\`, and \`minWidth: 0\`.  
\- Legal and safety copy is never truncated.  
\- Primary actions remain visible and tappable.  
\- Buttons either expand, wrap intentionally, or use an approved shorter translation.  
\- No fixed-width labels based on English text.  
\- Safe-area insets are respected.  
\- Navigation titles do not collide with back/action buttons.  
\- Touch targets remain appropriately sized after scaling.

\---

\#\# 2\. Minor Enhancements — Candidate Post-Launch Work

These are recommendations, not observed defects:

\- Use a bounded telemetry ring buffer and decouple transport frequency from chart-render frequency.  
\- Add parser property/fuzz testing with real ELM327 clone captures.  
\- Add automated unplug/reconnect tests around the transport abstraction.  
\- Add pseudolocalization and compact-screen screenshot tests to CI.  
\- Publish a tested-adapter compatibility matrix with firmware/chipset details.  
\- Add a connection diagnostic export that redacts VINs and other identifiers by default.  
\- Add voltage checks and transaction journaling before supported ECU coding operations.  
\- Track disconnect rate, timeout rate, and parser errors using privacy-safe aggregate telemetry.  
\- Provide a user-visible “Stop session and safely disconnect” action rather than relying only on navigation/unmount behavior.

\---

\#\# 3\. Overall Release Readiness Verdict

\#\#\# \*\*Verdict: HOLD — NOT APPROVED FOR STORE SUBMISSION\*\*

| Audit pillar | Evidence-backed score |  
|---|---:|  
| Store, permissions, purchases, privacy and safety | 0 / 35 |  
| Bluetooth/OBD resilience and teardown | 0 / 30 |  
| Polling, memory and performance | 0 / 20 |  
| Localization and responsive UI | 0 / 15 |  
| \*\*Total\*\* | \*\*0 / 100\*\* |

This is an \*\*audit-evidence score\*\*, not a conclusion that the application itself is defective. No source or release artifact was available for verification, so no points can responsibly be awarded.

To obtain a real code-level verdict, provide an archive of the exact RC commit plus the generated iOS/Android configurations. The final report should then include file-and-line findings, reproduced failure cases, and device/store test results.