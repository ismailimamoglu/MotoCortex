
Short answer / executive summary

Most likely root cause: a combination of (1) the ELM327 v1.5 clone lacking CAN‑FD / modern transceiver features (or failing when the vehicle switches bitrate/format) which produces immediate CAN ERROR, and (2) Stellantis Security Gateway (SGW) filtering/functional-address blocking which returns NO DATA for a plain functional 7DF Mode‑01 request unless a proper physical header and UDS session/tester‑present sequence is used. Vehicle sleep/power state made the problem worse but is not the primary cause (battery voltage is OK at 13.3 V).
Practical outcome: a clone ELM327 will intermittently fail on EMP2/CMP Stellantis vehicles. You must: (A) use an adapter with explicit CAN‑FD support and robust transceiver/bitrate switching, and (B) implement targeted physical addressing + UDS session/tester‑present before querying sensitive PIDs to bypass SGW filtering where allowed.
Now the detailed technical analysis, evidence from the traces, and recommended remediation.

What the logs show (evidence)
Common initialization: each session does ATZ; ATE0; ATL0; ATS0 — good practice (echo off / clean output).
Attempt 1:
First Mode‑01 (01 00) after basic setup → "NO DATA". That means the adapter sent the PID request but got no response frames within ISO‑TP timeout.
Later the code cycles through many ATSPn protocol guesses and finally reads ATRV 13.3 V. The sequence shows repeated retries of different CAN protocol numbers with long timeouts and never receives a valid ISO‑TP reply.
Attempt 2:
First Mode‑01 after setup → "CAN ERROR". A CAN ERROR returned by ELM327 means the adapter/transceiver reported a protocol-level error on the bus (bus error, frame format mismatch, or adapter unable to transmit in expected format). Later there is also a line where the code tries an ATIB (internal bitrate?) and gets no useful reply.
Voltage is reported 13.3 V, so no low‑battery sleep condition is evident from the ATRV reading.
Why NO DATA (Attempt 1) and CAN ERROR (Attempt 2)
NO DATA (Attempt 1)
Most commonly this is a lack of response from any ECU to a functional broadcast (7DF) Mode‑01 request. On modern Stellantis platforms, the SGW often filters/block functional 7DF or requires physical/targeted addressing to a specific ECU, so a broadcast 01 00 can legitimately yield no response.
Another cause: the adapter transmitted a request but the gateway suppressed broadcasting it onto the subnetwork where the ECU lives, or the ECU is in sleep/not in the requested diagnostic session, so no ISO‑TP response arrived.
Evidence supporting SGW filtering: the adapter later cycles through targeted protocol codes and still receives nothing — consistent with gateway-level filtering rather than random packet loss.
CAN ERROR (Attempt 2)
This is consistent with a bus‑level format mismatch or transceiver problem: e.g., the vehicle is using CAN FD (or a variant with bitrate switching/BRS) or a nonstandard arbitration/data bitrate combination and the clone transceiver cannot properly handle the frame structure, responds with an error indication, or the adapter’s driver returns CAN ERROR instead of higher‑level frames.
Another cause is that the adapter attempted to use an incorrect header/frame format (11‑bit vs 29‑bit), causing arbitration or protocol errors that the adapter reports as CAN ERROR. But given the behavior across many ATSP attempts, CAN FD / bitrate switching is the stronger candidate.
Attribution: hardware vs SGW vs vehicle state
Hardware limitations (ELM327 clone)
Strong contributor. Most ELM327 v1.5 clones:
Lack CAN‑FD support (FD uses different frame format, longer payloads, and optional bit‑rate switching/BRS). If the Rifter's CAN backbone or gateway uses FD (or mixes FD and classic frames), a clone will either silently fail or report CAN ERROR.
Sometimes have weak/faulty transceivers and do not handle bitrate switching or extended bus wake patterns robustly.
May not implement or expose ISO‑TP/UDS features reliably (header control, flow‑control handling, padding).
Conclusion: if the vehicle uses CAN FD or requires strict ISO‑TP flow‑control handling, the clone is very likely the limiting factor.
Security Gateway (SGW) & BSI Gateway Filtering
Strong contributor. Stellantis SGWs (and OEM implementations) aggressively filter functional broadcast requests to comply with regulations and to protect safety/security. UNECE R155 and OEM hardening have driven SGWs to:
Block generic functional 7DF requests for many parameters,
Require tester to use physical addressing (tester/source address in header) or to pass through the gateway via an authenticated/whitelisted path.
Practical sign: NO DATA on plain 01 00 + success only when ATSH set or when diagnostic session/tester‑present used.
Conclusion: even a perfectly capable CAN interface will get NO DATA if you use broadcast functional addressing and the SGW blocks it.
Vehicle state / BSI / sleep modes
Contributing factor but secondary. The ATRV 13.3 V indicates the main battery is present. However some ECUs or gateway routes are disabled unless ignition is in RUN or the vehicle is not in deep sleep. Stellantis body control modules can keep buses asleep and require a specific wake pattern (e.g., ignition ON or a defined wakeup frame) before responding.
If the tester was not in RUN, some ECUs might be unreachable; this makes SGW filtering look like NO DATA.
Conclusion: always confirm ignition state (RUN) and that the gateway shows as awake before deep diagnostics.
Gold‑standard AT initialization / handshake for 2024–2026 Stellantis (recommended sequence and rationale) Note: exact numbering of ATSPn differs slightly across ELM327 firmware variants; the safe approach is to prefer "auto" and then iterate the likely CAN 11/29 and 500/250 kbit options. The sequence below is a practical, field‑tested pattern — adapt to your adapter docs.
Recommended sequence (purpose + example commands)

Reset and clean:
ATZ ; reset adapter
ATE0 ; echo off
ATL0 ; linefeeds off (makes parsing deterministic)
ATS0 ; spaces off
ATH1 ; headers on (you want to see and set 11/29‑bit headers)
ATSP0 ; protocol auto (start with auto discovery)
ATDP ; display protocol (see what auto picked)
Quick capability probe
ATI / AT I ; adapter identification (confirm ELM327 version / clone)
ATRV ; confirm voltage
AT RV? ; (note: command names vary; use your adapter docs)
Use one short functional query (brief timeout) for 7DF Mode 01 to test functional response:
01 00 (functional 7DF) with short timeout (1–2 s)
If you receive NO DATA, do not retry functional broadcast repeatedly — switch to targeted tests.
Targeted physical addressing + UDS session
ATSH 7E0 ; set 11‑bit physical header (tester → 0x7E0; many ECUs respond from 0x7E8)
If vehicle uses 29‑bit addressing, use the proper 29‑bit ATSH value (e.g., ATSH 18DA10F1 or other OEM header) — consult OEM diagnostics docs or capture with a known good tool.
Send Tester Present (UDS 0x3E 0x00) to keep session alive:
3E 00
Request diagnostic session if needed (UDS 0x10 subfunction):
Example: 10 01 (default) or 10 03 (extended) — which to use depends on the ECU and the operation. Many PIDs are available in default session.
Then retry Mode‑01 under the targeted header (01 00). If the target ECU supports the PID, you should get an ISO‑TP reply.
ISO‑TP flow control and padding
If the response is multi‑frame, ensure your adapter supports ISO‑TP flow control and that ATCAF/ATCF commands (adapter specific) are set so the adapter handles ISO‑TP correctly. Many clones mishandle flow control/padding which causes timeouts or malformed frames.
If you see CAN ERROR
Immediately detect hardware mismatch: log the error and do not continue with long protocol loops. Try switching to other CAN bitrate protocol numbers (250k/500k) once or twice — but if you consistently get CAN ERROR across those, treat as hardware incompatibility (likely CAN FD or incompatible transceiver).
If you get NO DATA for physical header too
Probable SGW filtering or ECU requires security access. Try:
Alternate physical header per OEM doc
Sending Tester Present and requesting a session
If still NO DATA, likely SGW blocks that service or requires OEM authentication.
Caveats / commands notes

ATCAF1 (or AT CAF1) on some ELM clones toggles CAN Automatic Format / Padding/ISO‑TP handling. Use it if your adapter supports it. Behavior is vendor dependent — consult adapter manual before relying on it.
The exact ATSPn → protocol mapping is adapter‑firmware dependent. Use ATDP to confirm what protocol is active after a set.
Is it possible to communicate with the vehicle over standard OBD‑II Mode 01 with an ELM327 if headers are configured?
Maybe, but not reliably with a clone:
If the SGW allows functional 7DF for the parameter you need, Mode‑01 via basic ELM may succeed.
If SGW blocks broadcasts, you need to use physical addressing and UDS exchanges to reach the target ECU — that can work with classic CAN (non‑FD) and a competent adapter that supports headers and ISO‑TP/UDS properly.
If the vehicle or gateway uses CAN FD, or the OEM uses extended diagnostics that rely on FD frame format/bitrate switching, then a CAN‑FD capable adapter is mandatory.
Recommendation: use a proven CAN FD capable adapter (OBDLink MX+/CX, vLinker MC+/FD+, other CAN‑FD/J2534 devices) in the lab and reproduce the handshake with headers + Tester Present. If that works, then the problem was the clone.
Practical tests you should run (order matters)
Step 0: Confirm ignition/vehicle state: put ignition in RUN (or the OEM-specified diagnostics ON position) and ensure doors locked/BSI awake.
Step 1: With current ELM clone, run:
ATZ, ATE0, ATH1, ATSP0, ATRV, ATDP
Try ATSH 7E0 + 3E 00 + 01 00 (with short timeouts). Observe if any response appears.
Step 2: If CAN ERROR on any of these, stop and switch to CAN‑FD capable adapter and repeat.
Step 3: With CAN‑FD adapter, run the same sequence and also try ATSH 18DA10F1 (29‑bit) if 11‑bit fails — capture responses to see which header returns replies.
Step 4: If physical addressing returns data, add Tester Present keep‑alive every ~2–3 s.
Software architecture recommendations — universal OBD‑II protocol negotiator design Design goals: fast failure detection, non‑blocking UX, minimal intrusive probing (avoid waking / annoying gateway), and clear reasons to escalate/hint to user.
State machine (high level)

State: INIT
Commands: ATZ, ATE0, ATL0, ATS0, ATH1, ATSP0
Collect: adapter identity (ATI), voltage (ATRV), adapter capabilities (does adapter claim FD?)
State: QUICK_PROBE
Send a single, short (1s) functional (7DF) 01 00.
If reply → go to OPERATIONAL (classic).
If NO DATA → go to SGW_PROBE.
If CAN ERROR → go to HARDWARE_FALLBACK.
State: SGW_PROBE
Set ATSH to candidate physical headers (7E0 then possible 29‑bit values).
Send Tester Present (3E 00).
Request Diagnostic Session (10 01 then 10 03 if needed).
Send 01 00 to that header (timeout longer, 2–3 s).
If reply → OPERATIONAL.
If NO DATA for all headers and sessions → mark as likely SGW blocking (SGW_WARNING).
State: HARDWARE_FALLBACK
Quickly iterate a minimal set of protocol numbers (e.g., 500k 11‑bit, 250k 11‑bit, 500k 29‑bit) but limit to 2 tries each.
If CAN ERROR persists → declare HARDWARE_INCOMPATIBLE.
If any protocol returns a reply → OPERATIONAL.
State: OPERATIONAL
Use Tester Present periodic keepalive; proceed with requested PIDs or UDS services.
State: RETRY/DELAY
Implement backoff before repeats; do not loop the full set for 60 seconds.
Implementation details

Use a short timeout on functional (1s) and longer on physical/UDS (2–3s). Do not exhaustively loop all ATSP codes for long durations.
Make header list configurable and cache a successful header per VIN/session for future speed.
Track and surface the adapter reported capabilities (CAN FD support, ISO‑TP support).
Log the exact adapter responses (NO DATA, CAN ERROR, unreachable) for telemetry and diagnostics.
Error codes / telemetry thresholds to trigger immediate “SGW / Hardware Incompatibility” warning Tune for low false positives; these thresholds are conservative and practical:
Immediate Hardware Incompatibility (show "adapter likely incompatible — try CAN‑FD adapter"):
Condition A (definitive): 3 or more immediate "CAN ERROR" responses across 2 different CAN arbitration bitrates (e.g., 500k & 250k) within a single probe sequence AND adapter identifies as non‑FD (ATI shows ELM327 v1.5 clone).
Condition B (strong): Adapter reports inability to set CAN FD or responds to "AT CAF?" / capability query negatively + observed CAN ERROR on first targeted header attempt.
Likely SGW (show "gateway filtering — try using physical header/UDS session or OEM tool"):
Condition C: Functional 7DF 01 00 → NO DATA, then targeted ATSH 7E0 + Tester Present + 01 00 → NO DATA (on at least two distinct physical headers such as 7E0 and 18DA10F1) while device voltage OK and ignition RUN.
Condition D: NO DATA for physical headers and device responds OK to AT commands (ATRV ok, ATDP returns protocol) — implies functional path exists but ECUs aren't answering (gateway or security).
Vehicle asleep / ignition wrong (show "vehicle asleep—please put ignition in RUN"):
Condition E: ATRV < 11.5 V or ATRV fluctuates and initial probing yields no frames, OR after a wake attempt a short pause then NO DATA across whole probing but later a reply after commanding a clear wake (user toggles ignition): mark as sleep.
Time budget / UX rule:
If no positive reply after ~8–12 s of targeted probing (one functional attempt + up to 3 targeted headers + 1 session request each) — show a clear short message explaining the likely causes (SGW vs hardware) and recommend next actions rather than continuing 60 s loops.
Recommended UX messages and actions to present to user
If HARDWARE_INCOMPATIBLE:
Message: "Adapter incompatible with this vehicle network (likely CAN‑FD or bitrate switching). Use a CAN‑FD capable adapter (OBDLink MX+/CX, vLinker MC+/FD+, or J2534 device)."
Action: Provide "Retry with CAN‑FD adapter" and show a short diagnostics log attach option.
If SGW suspected:
Message: "Vehicle Security Gateway is blocking generic queries. Try enabling physical ECU addressing and a UDS diagnostic session (Tester Present). This often requires an OEM‑grade tool or to use the vehicle ignition RUN position."
Action: Offer "Try physical addressing" with a one‑tap attempt (set ATSH to common headers + tester present) and show "If still fails, try OEM tool or authorized gateway bypass."
If vehicle asleep:
Message: "Vehicle appears asleep. Please turn ignition to RUN or remove smart key from sleep mode and retry."
Recommended test/hardware list (for immediate validation)
Good CAN FD-capable adapters: OBDLink MX+/CX, vLinker MC+/FD+, and many J2534‑compliant interfaces.
PC toolset for capture: use a known good CAN FD interface + Wireshark or CAN‑analysis tool to capture raw frames. That will show if the bus uses FD frames, extended headers, or BRS switching.
If you can, capture a raw bus trace with a known-good adapter to see which header and which session allow replies — that will prove SGW vs hardware.
Short checklist to resolve this exact vehicle quickly
Confirm ignition RUN and that vehicle is not in ECO sleep.
Replace ELM327 clone with a CAN FD capable adapter and repeat: ATZ, ATE0, ATH1, ATSP0, ATSH 7E0, 3E00, 01 00.
If still no reply: try ATSH 18DA10F1 (29‑bit) and UDS 10 03 (extended session), after Tester Present.
Capture raw bus with CAN tool to check FD frames or BRS throughput.
If adapter works but plain 7DF fails — implement targeted addressing and keep‑alive in your app; if still blocked, inform user SGW is enforcing blocking and recommend OEM access.
Final remarks about compliance and safety
Modern Stellantis platforms implement SGW and may require OEM authentication or specific diagnostic gateways for sensitive operations; ensure your product's diagnostic behavior respects vehicle cybersecurity regulations (UNECE R155) and user safety/privacy.
Avoid brute‑force broadcast probing on production vehicles—aggressive probing can trigger gateway protections or vehicle alarms.
 If you want, I can:

Produce a drop‑in negotiator state‑machine pseudocode implementation (JavaScript/TypeScript) for your React‑Native app showing AT command timing, timeouts, header lists, and telemetry hooks.
Provide a short script of exact AT sequences to run on your bench (for both classic CAN and CAN‑FD adapters) so you can quickly confirm whether the limiting factor is hardware or SGW.  Which would you prefer?