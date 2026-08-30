Short answer

Your proposed sequence is sound and close to optimal for modern Stellantis BSI/SGW — with three important adjustments: (A) do a brief capability/probe step (ATDP/ATI/ATRV) before forcing protocol, (B) enable ATCAF1 and ATAT1 immediately after selecting the protocol and before sending ISO‑TP traffic, and (C) insert a short delay (100–300 ms) after ATSH + 3E 00 before sending 01 00 so the gateway has time to open the diagnostic channel.
Send Tester Present (3E 00) once to enter/keep the session, then maintain a periodic keep‑alive (every 2–3 s) while you are doing live polling.
Guard parsing against adapter quirks (split/partial lines, stray prompts, alternate header formats) and implement ISO‑TP reassembly/flow‑control handling even when ATCAF1 is enabled (adapter may hide or expose FC frames).
If you observe repeated CAN ERROR across both 11b and 29b forced attempts (2 consecutive errors per arbitration type) or immediate format errors on the first frame, fail fast and prompt the user to use a CAN‑FD/fully compatible interface instead of falling through a long K‑Line loop.
Detailed validation, tweaks and implementation notes

Sequence validation (step‑by‑step with recommended tweaks) Your sequence is correct in spirit. I recommend the following final ordering and small timing/verification changes:
A. Link & capability probe (very short)

ATZ — reset adapter; wait for prompt ">" (watch for echo or extra lines).
ATE0, ATH1, ATL0, ATS0 — echo off, headers on, linefeeds/spaces off.
ATI / AT I (adapter identity) — log firmware version and vendor string.
ATRV — log battery voltage (quick sleep / ignition check).
ATSP0 then ATDP — let adapter auto-detect, and read what it picked. If ATDP returns a protocol you can use, you can skip forcing unless you want deterministic behavior.
Rationale: ATDP/ATI lets you know what the adapter wants to use and whether it claims FD capabilities; ATRV tells you vehicle state and reduces false SGW classification when the car is asleep.

B. Force modern CAN (11-bit 500k) and enable ISO‑TP features

ATSP6 (ISO‑15765‑4 CAN, 11b/500k) — force the likely Stellantis powertrain protocol.
ATCAF1 — enable CAN auto flow control / multi-frame formatting (must be set before ISO‑TP traffic).
ATAT1 — enable adaptive timing (helps with gateway latency).
ATST <reasonable> — set request timeout high enough for UDS multi‑frame (see notes below).
Optional: ATDP again to confirm the protocol.
Rationale: Must enable adapter ISO‑TP assistance before you send requests or you’ll see NO DATA or broken multi‑frame responses.

C. Targeted physical probing (SGW‑aware)

ATSH 7E0 — set 11‑bit physical header (tester → 0x7E0).
Small pause 100–300 ms — let header apply and gateway wake.
3E 00 — Tester Present (enter/keep session); wait ~100–200 ms for gateway to process.
01 00 — Mode 01 functional query using the targeted header (not 7DF broadcast).
If NO DATA:

Try ATSH 18DA10F1 + ATSP7 (29‑bit/500k) with same small pauses and Tester Present.
Try diagnostic session 10 01 (or 10 03 if you know OEM needs it) then 01 00.
D. Fast fail/fallback

If CAN ERROR occurs immediately on the first send in 11b, then again in 29b -> abort within ~8 s and show hardware incompatibility (possible CAN FD / transceiver mismatch). Do not enter the 60‑s blind K‑Line loop.
If NO DATA for both physical headers and adapter reports OK to AT commands -> mark likely SGW and advise testing with different headers or an OEM tool.
Timeouts and ATST guidance
UDS/ISO‑TP replies can be slower than simple PID replies. For single‑frame PID replies, 200–500 ms is usually enough. For multi‑frame ISO‑TP, you may need 1–2 s depending on gateway behavior.
Conservative approach: set your ATST to a value that results in ~1–2 s effective timeout for UDS responses. (Exact translation of ATST → milliseconds is adapter‑firmware specific — read the monoFe/ELM docs and prefer a value that the adapter vendor recommends for ISO‑TP; if unsure, err on the higher side.)
Tester Present timing and lifetime
Send 3E 00 right after ATSH and wait ~100–300 ms before sending diagnostic requests.
Maintain a periodic keep‑alive of 3E 00 every 2–3 seconds while you are actively polling to prevent session timeouts. Use a configurable interval and pause keep‑alives while idle.
Some ECUs / gateways will accept a single 3E 00 and keep the session for longer; others will time out in ~5–10 s — periodic keep‑alive is most robust.
Response parsing and header formats — what to guard against With ATH1 on the monoFe (PIC18F25K80) adapter you will typically see responses prefixed by CAN ID. But adapter firmware and Bluetooth stacks vary, so code defensively:
Common header forms to accept

"7E8 06 41 00 BE 3F B8 13" (space‑separated)
"7E8: 06 41 00 BE 3F B8 13" (colon separated)
"7E8 41 00 BE 3F B8 13" (ELM may strip the length byte or show raw bytes)
Multi‑line ISO‑TP: first frame (FF), consecutive frames (CF) where payload bytes are split across messages
Flow control frames from the ECU (FC) if ATCAF1 is off — you may see "7E8 03 30 00 00" or similar.
Parser rules to implement

Trim CR/LF and the '>' prompt; ignore empty lines and AT echo if present.
Normalize separators (convert colons, multiple spaces, tabs to single space) before tokenizing.
Recognize and reassemble ISO‑TP:
Single frame (first nibble 0x0x) -> immediate payload.
First frame (0x10 | high nibble) -> compute total length and gather CFs (0x2x) until full payload assembled.
Handle flow control (0x30) if adapter exposes it — if you enabled ATCAF1 the adapter will usually handle flow control and present only reassembled data; still accept either presentation.
Accept both 11‑bit and 29‑bit header lengths (3 vs 4 bytes for header representation).
Watch for "NO DATA", "CAN ERROR", "UNABLE TO CONNECT" and other textual responses and map them to discrete states.
PIC18F25K80 / monoFe adapter quirks to guard for
Splitting: Bluetooth/RFCOMM stacks commonly split long lines; expect partial reads and buffer until you detect end of logical frame (CR or newline or header+payload length).
Prompt: '>' prompt may appear immediately after a request and before the response if your write/read timing is tight; treat it as a command prompt not as data.
Multi‑frame handling: some adapters partially reassemble ISO‑TP, some fully reassemble — detect both cases (FC frames or reassembled payload).
Interleaved logs: when you send multiple concurrent requests (don’t) responses can interleave; only allow one outstanding request at a time per connection.
Vendor commands: monoFe may implement extra commands or slightly different syntax; detect ATI string and adapt to vendor quirks (e.g., ATCAF vs ATCAF1, different ATST scaling).
Flow control/padding: some firmwares pad with 0x00 or 0x55 — strip or handle padding per ISO‑TP rules.
Additional AT parameters and vendor‑specific commands to consider
ATDP — display protocol (good as a probe).
ATI — adapter ID (useful for decision logic).
ATMA — monitor all (useful in debug mode to capture raw bus traffic while passive).
ATST — request timeout (tune per adapter). Use a conservative setting for UDS multi‑frame.
ATCAF1 — you already included; keep it (adapter handles ISO‑TP FC).
ATAT1 — adaptive timing (good on SGWed buses).
ATSH — you already use for physical addressing.
ATPS — some adapters expose parameters for padding or separation (check monoFe docs).
CAN‑FD flags: if your adapter supports CAN‑FD, there may be a vendor command (nonstandard) to enable FD mode or BRS — check monoFe docs for AT+FD or ATCFD commands. If you plan to support CAN‑FD vehicles, detect and expose those vendor commands in your code path.
ATAL — enable auto line termination or similar (vendor specific) — if monoFe provides it and the docs suggest it, apply per vendor guidance.
Fast‑fail / telemetry thresholds (concrete)
Hardware fail threshold:
If you receive "CAN ERROR" (or adapter reports bus error) on the first data frame in 11‑bit and again immediately after forcing 29‑bit (2 attempts) → classify as hardware/transceiver mismatch (likely CAN FD or bitrate switching) and abort with a prompt to use a CAN‑FD capable interface.
SGW suspicion threshold:
Functional 7DF → NO DATA, then ATSH 7E0 + 3E 00 + 01 00 → NO DATA, then ATSH 18DA10F1 + 3E 00 + 01 00 → NO DATA, with ATRV > 12 V and AT commands OK → classify as SGW filtering.
Sleep / ignition:
ATRV < 11.5 V OR adapter returns BUS SLEEP messages + paddling/no responses → advise ignition RUN/wake vehicle.
Practical code/UX policy recommendations
Do not blindly iterate all ATSP values for 60 s. Limit probes:
1 functional (7DF) attempt,
2 physical header attempts (11b, 29b),
1 diagnostic session attempt,
If none successful within ~8–12 s, surface a clear error and next‑step guidance.
Cache successful ATSH + ATSP combos per VIN to speed subsequent connections.
Provide explicit guidance to users (e.g., "Try ignition RUN", "Switch to OEM tool", "Use CAN‑FD adapter") rather than opaque error states.
Summary recommended state machine (condensed)
INIT: ATZ, ATE0, ATH1, ATL0, ATS0, ATI, ATRV
PROBE: ATSP0, ATDP — if auto picked OK then PROCEED else FORCE:
Force ATSP6, ATCAF1, ATAT1, ATST (conservative)
TARGET: ATSH 7E0, pause 100–300 ms, 3E 00, pause 100–200 ms, 01 00
If response -> OPERATIONAL
If NO DATA -> try ATSP7 + ATSH 18DA10F1 same flow
FAIL FAST: If CAN ERROR on both forced 11b/29b -> HARDWARE_INCOMPATIBLE
If NO DATA on both but AT commands OK -> SGW_BLOCKING
OPERATIONAL: Poll using ATSH per‑ECU as needed, send 3E 00 every 2–3 s while polling; reverify ATRV periodically.
If you want, I can:

Produce a small TypeScript pseudocode implementation of this state machine (useBluetooth.ts) with explicit delays, timeout values, parsing helpers for header formats and ISO‑TP reassembly, and telemetry hooks for the GUI messages you described.