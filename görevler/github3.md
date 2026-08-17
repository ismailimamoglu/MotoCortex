TL;DR — constraints and approach

I cannot safely publish “production-verified” PGN/SPN/UDS DID values for heavy‑duty ECUs without OEM docs or lab captures — those parameter addresses are manufacturer- and SW-build‑dependent and can brick vehicles if wrong.
Below I give:
A detailed technical specification for supporting heavy‑duty vehicles (J1939 + 24V UDS over J1939), including transport details, safety rules, best practices and discovery methods.
A concrete mapping methodology and probe checklist (how to discover PGN/SPN and UDS DID reliably in the lab).
A set of strict OEMFeatureDefinition JSON templates (ready to ingest) for the features you requested — each template contains PGN/SPN placeholders and UDS DID placeholders marked "TBD_LAB_VERIFY" where a manufacturer-specific address is required. Use the included probe checklist to populate those placeholders and mark the template VERIFIED once rollback/test passes.
This gives you a safe, auditable pipeline: templates → lab discovery → verified final templates.
Section A — Technical specification (SAE J1939 + 24V UDS over J1939)

Protocol & transport summary
Primary transports:
J1939 (CAN 2.0B, 29-bit identifiers) for in-vehicle parameter messaging (PGNs/SPNs).
J1939 Transport Protocol (TP) for multi-packet PGNs using BAM or RTS/CTS.
UDS-over-J1939: UDS (ISO‑14229) tunneled over J1939 using manufacturer-defined DIDs/requests; 24V ECUs often implement UDS services adapted to J1939 message mapping. UDS session & security model applies where supported.
Key J1939 concepts to use:
PGN (Parameter Group Number) identifies message group.
SPN (Suspect Parameter Number) identifies parameter within PGN payload.
PDU Format / Priority / Source Address: use correct source address (your adapter) and detect/address-claim collisions.
Request PGN (standard: use J1939 Request PGN to request a PGN from an ECU).
Diagnostic messages may be vendor PGNs; do not guess — discover.
Transport specifics & best practices
Address claiming:
Implement J1939 Address Claim sequences to avoid collisions. If adapter needs a static SA, document and allow customization.
Multi-packet handling:
Support BAM and RTS/CTS. Use window-size & block-size controls and robust timeout & retry logic.
Timeouts & flow-control:
Use conservative timeouts for heavy‑duty (ECUs may be slow): default request timeout = 3–6 s, p2/p2* longer, retry 2–3 times with exponential backoff. Permit configuration per-manufacturer.
Security & safety:
For write operations, require explicit elevated permissions and audit logging.
For engine/propulsion parameters, require mutual-auth / OEM-provided security or on-prem HSM.
Logging & capture:
Always capture full J1939 traces in PCAP/ASC format with timestamps, bus load and ambient voltage.
Power & electrical considerations (24V specifics)
Typical nominal voltages:
Battery nominal ~24V; charging/regulating voltage engine running ~27–29V.
Minimum safe thresholds for writes:
Warn below 24.0V, require external stable power or engine-on above 26.0V for high-risk write operations (e.g., ECM parameter writes / reflash).
For critical reflashes/parameter writes require engine running or connection to dealer/power-supply that holds >26.5V.
Current draw & heat:
Heavy‑duty ECUs may draw more; ensure adapter supports 24V transients. Use transient voltage suppression (TVS) and isolation if operating from vehicle battery.
Safety / brick prevention for heavy‑duty
Pre-write snapshot:
Capture full parameter PGNs (e.g., PGNs that list configurable parameters), and if UDS DIDs support binary dump, capture that as binary backup. Store both locally and optionally encrypted in cloud with SHA‑256.
Two‑phase commit:
PREPARE (verify session & security) → WRITE (chunked, TP-aware) → VERIFY (readback/CRC) → COMMIT (clear “pending” flags).
Checkpointed chunked writes:
After each block (TP block), verify CRC/ack before sending next. If interruption occurs, provide either rollback by reapply snapshot or use ECU’s fallback bank if ECU supports it.
Vehicle & environment preconditions:
Engine status, parking brake, PTO engaged, battery voltage, ambient temperature thresholds for ECU writes.
Section B — Discovery & probe methodology (how to discover PGN / SPN / UDS DID)

General discovery flow (safe, non-destructive)
Step 0: Safety & preconditions
Confirm operator has permission, connect stable power, set engine on/off per vendor guidance, engage parking brake, record VIN and vehicle metadata.
Step 1: Passive capture
Capture bus for 60–120 seconds to observe active PGNs and SPNs. Save PCAP/ASC.
Step 2: Request supported PGNs & PIDs
Use J1939 Request (PGN_REQUEST) to request known configuration PGNs (manufacturer-specific). Many vendors provide a “parameter group list” PGN you can request; if present, request it.
Step 3: Probe candidate PGNs
When you suspect a parameter (e.g., idle shutdown), find PGNs published by engine ECU or vehicle master. Request a read of that PGN and decode SPNs to find candidate fields (units, scaling).
Step 4: UDS-over-J1939 discovery
Use J1939 Request to read UDS-supported DID list if the vendor exposes a DID index PGN. If UDS read returns access denied, test extended diagnostic session or security access per vendor process.
Step 5: Controlled toggle & diff
Issue a safe operator action (technician toggles feature) while logging. Compare pre/post payloads and log diffs at byte and bit level.
Step 6: Lab write & rollback test
In lab fixture, perform write with PREPARE→WRITE→VERIFY→ROLLBACK to ensure atomicity and successful restore.
Tools & commands
Use python-can and isotp for J1939/UDS interactions, or vendor tools (Vector, PEAK).
Save captures and include VIN, ECU source address, PGN list, and timestamp.
For J1939 multi-packet uses BAM/RTS-CTS: implement and log both CM/DT frames.
Section C — PGN/SPN/UDS mapping guidance (per feature)

For each feature below I provide:
Common ECU(s) to target,
J1939 parameter approach (PGN/SPN candidate names or where to look),
UDS DID approach,
Safety/security notes,
Template JSON skeleton with PGN/SPN and DID placeholders that you can populate after lab verification.
Common heavy-duty ECU targets

Engine/Powertrain ECU (EMS / EEC / CMx): controls RSL, idle limits, PTO RPM presets, DPF regen initiation.
Vehicle Master / VMCU / CPC / VCU: cruise control, speed-limit configuration, suspension presets.
Brake / Retarder Control Module: retarder aggressiveness.
ECAS / Air suspension controller: level presets.
Body Builder Module (BBM) / BUP: reverse alarm, night mode volume.
Aftertreatment (ACM) / DPF controller: stationary regeneration routines.
Important note on units & encoding

J1939 SPNs use scaled integer values: always read SPN scale and offset in PGN metadata before interpreting raw value.
For UDS/UDS-over-J1939 DIDs, the DID may be multi‑byte with little/big endian and OEM-specific checksums. Capture pre/post and include checksum algorithm in metadata.
Section D — Example OEMFeatureDefinition JSON templates (ready-to-ingest)

Each template uses fields compatible with your OEMFeatureDefinition shape (extended for heavy-duty: pgn/spn fields included and bitWidth for multi‑byte options). didHex and pgn/spn entries that cannot be published without lab verification are marked "TBD_LAB_VERIFY". After lab verification replace those values and set verification.status = "VERIFIED" with verifiedVINs and signatures.
Below I provide a representative set covering the requested features across manufacturers. Ingest these as draft templates, then run the probe script (or the J1939 discovery flow) to populate PGN/SPN/DID addresses and mark them VERIFIED.

Note: For compactness I present JSON objects in a list. Each object strictly follows your OEM schema extended with "pgn" and "spn" fields where applicable and "verification" metadata.

[ { "id": "actros_rsl_limit", "nameKey": "features.items.actros_rsl_limit.name", "descKey": "features.items.actros_rsl_limit.desc", "defaultName": "Road Speed Limiter (Fleet Limit)", "defaultDesc": "Configures vehicle maximum road speed limiter (RSL) for fleet policy.", "make": "Mercedes-Benz Trucks", "category": "POWERTRAIN_LIMITS", "targetEcuHeader": "CPC", "pgn": "TBD_LAB_VERIFY", /* PGN that contains RSL parameter or the PGN to request / "spn": "TBD_LAB_VERIFY", / SPN for RSL (name/number) / "didHex": "TBD_LAB_VERIFY", / UDS DID if engine supports UDS-based RSL config */ "byteIndex": 0, "bitIndex": 0, "bitWidth": 16, "options": [ { "labelKey": "features.options.speed85", "defaultLabel": "85 km/h", "valueHex": "0055" }, { "labelKey": "features.options.speed90", "defaultLabel": "90 km/h", "valueHex": "005A" }, { "labelKey": "features.options.speed100", "defaultLabel": "100 km/h", "valueHex": "0064" }, { "labelKey": "features.options.speed110", "defaultLabel": "110 km/h", "valueHex": "006E" } ], "requiresSecurityAccess": true, "securityLevel": 2, "requiresExtendedSession": true, "safetyLevel": "LEVEL_4_CRITICAL", "riskLevel": "HIGH", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "PGN/SPN and UDS DID must be discovered and validated in lab; confirm units (km/h) and scaling." } },

{ "id": "actros_idle_shutdown_timer", "nameKey": "features.items.actros_idle_shutdown_timer.name", "descKey": "features.items.actros_idle_shutdown_timer.desc", "defaultName": "Automatic Engine Idle Shutdown Timer", "defaultDesc": "Automatically shuts down engine after specified idle time while stationary with parking brake set.", "make": "Mercedes-Benz Trucks", "category": "SERVICE_MAINTENANCE", "targetEcuHeader": "CPC", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 1, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.idleOff", "defaultLabel": "Disabled (Unlimited Idle)", "valueHex": "00" }, { "labelKey": "features.options.idle3m", "defaultLabel": "3 Minutes Auto Shutdown", "valueHex": "03" }, { "labelKey": "features.options.idle5m", "defaultLabel": "5 Minutes Auto Shutdown", "valueHex": "05" }, { "labelKey": "features.options.idle10m", "defaultLabel": "10 Minutes Auto Shutdown", "valueHex": "0A" } ], "requiresSecurityAccess": true, "securityLevel": 1, "requiresExtendedSession": true, "safetyLevel": "LEVEL_2_ADAPTATION", "riskLevel": "LOW", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Must verify that shutting down occurs only when safe (parking brake, neutral, PTO disengaged)." } },

{ "id": "volvo_pto_engine_rpm_preset", "nameKey": "features.items.volvo_pto_rpm_preset.name", "descKey": "features.items.volvo_pto_rpm_preset.desc", "defaultName": "PTO RPM Preset", "defaultDesc": "Set predefined engine idle speed when PTO engaged for hydraulic pump operation.", "make": "Volvo Trucks", "category": "PTO_CONTROL", "targetEcuHeader": "EMS", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 2, "bitIndex": 0, "bitWidth": 16, "options": [ { "labelKey": "features.options.pto900", "defaultLabel": "900 RPM", "valueHex": "0384" }, { "labelKey": "features.options.pto1100", "defaultLabel": "1100 RPM", "valueHex": "044C" }, { "labelKey": "features.options.pto1300", "defaultLabel": "1300 RPM", "valueHex": "0514" } ], "requiresSecurityAccess": true, "securityLevel": 2, "requiresExtendedSession": true, "safetyLevel": "LEVEL_3_OPERATIONAL", "riskLevel": "MEDIUM", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Ensure PTO interlocks (transmission neutral etc.) are enforced when applied." } },

{ "id": "scania_retarder_aggressiveness", "nameKey": "features.items.scania_retarder_aggr.name", "descKey": "features.items.scania_retarder_aggr.desc", "defaultName": "Retarder / Engine Brake Aggressiveness", "defaultDesc": "Adjust retarder aggressiveness and downshift behavior for engine braking.", "make": "Scania", "category": "BRAKING_RETARDER", "targetEcuHeader": "PTM", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 5, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.retarder_low", "defaultLabel": "Low", "valueHex": "00" }, { "labelKey": "features.options.retarder_med", "defaultLabel": "Medium", "valueHex": "04" }, { "labelKey": "features.options.retarder_high", "defaultLabel": "High", "valueHex": "08" } ], "requiresSecurityAccess": true, "securityLevel": 2, "requiresExtendedSession": true, "safetyLevel": "LEVEL_4_CRITICAL", "riskLevel": "HIGH", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Safety-critical: require HMI warning and confirm braking systems are functional before commit." } },

{ "id": "man_ecas_level_memory", "nameKey": "features.items.man_ecas_level_memory.name", "descKey": "features.items.man_ecas_level_memory.desc", "defaultName": "ECAS Loading Dock Height Preset", "defaultDesc": "Store and recall air suspension height presets for loading docks.", "make": "MAN Truck & Bus", "category": "SUSPENSION_ECAS", "targetEcuHeader": "BBM", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 3, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.level_normal", "defaultLabel": "Normal Ride", "valueHex": "00" }, { "labelKey": "features.options.level_ramp1", "defaultLabel": "Ramp Height 1", "valueHex": "01" }, { "labelKey": "features.options.level_ramp2", "defaultLabel": "Ramp Height 2", "valueHex": "02" } ], "requiresSecurityAccess": false, "securityLevel": 0, "requiresExtendedSession": false, "safetyLevel": "LEVEL_2_ADAPTATION", "riskLevel": "LOW", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "ECAS positions must be validated under load; provide operator instructions to monitor air pressure." } },

{ "id": "daf_stationary_dpf_regen", "nameKey": "features.items.daf_stationary_dpf_regen.name", "descKey": "features.items.daf_stationary_dpf_regen.desc", "defaultName": "Stationary DPF Forced Regeneration", "defaultDesc": "Initiate stationary regeneration using UDS Routine Control or J1939 regen sequence.", "make": "DAF Trucks", "category": "AFTERTREATMENT", "targetEcuHeader": "ACM", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "routineId": "TBD_LAB_VERIFY", "byteIndex": 0, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.regen_start", "defaultLabel": "Start Regeneration", "valueHex": "01" }, { "labelKey": "features.options.regen_status", "defaultLabel": "Query Status", "valueHex": "00" } ], "requiresSecurityAccess": true, "securityLevel": 2, "requiresExtendedSession": true, "safetyLevel": "LEVEL_4_CRITICAL", "riskLevel": "HIGH", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Must confirm exhaust temps, DEF level and operator safety checklist preconditions." } },

{ "id": "ford_reverse_alarm_night_mode", "nameKey": "features.items.ford_reverse_alarm_night.name", "descKey": "features.items.ford_reverse_alarm_night.desc", "defaultName": "Reverse Alarm Night Mode", "defaultDesc": "Attenuate reverse alarm or switch to low-volume night mode for restricted areas.", "make": "Ford Trucks", "category": "CAB_COMFORT_SAFETY", "targetEcuHeader": "BBM", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 4, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.alarm_normal", "defaultLabel": "Normal Volume", "valueHex": "FF" }, { "labelKey": "features.options.alarm_night_low", "defaultLabel": "Night Low Volume", "valueHex": "7F" } ], "requiresSecurityAccess": false, "securityLevel": 0, "requiresExtendedSession": false, "safetyLevel": "LEVEL_3_OPERATIONAL", "riskLevel": "MEDIUM", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Check local regulations before enabling reduced-volume alarms." } },

{ "id": "cummins_rsl_program", "nameKey": "features.items.cummins_rsl.name", "descKey": "features.items.cummins_rsl.desc", "defaultName": "Cummins Engine Speed Limiter (RSL)", "defaultDesc": "Program RSL in Cummins ECM for fleet speed policy (INSITE-style parameter).", "make": "Cummins", "category": "POWERTRAIN_LIMITS", "targetEcuHeader": "ECM", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 6, "bitIndex": 0, "bitWidth": 16, "options": [ { "labelKey": "features.options.speed85", "defaultLabel": "85 km/h", "valueHex": "0055" }, { "labelKey": "features.options.speed90", "defaultLabel": "90 km/h", "valueHex": "005A" }, { "labelKey": "features.options.speed100", "defaultLabel": "100 km/h", "valueHex": "0064" } ], "requiresSecurityAccess": true, "securityLevel": 3, "requiresExtendedSession": true, "safetyLevel": "LEVEL_4_CRITICAL", "riskLevel": "HIGH", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Cummins parameters often require proprietary authentication and a signed request/permission." } },

{ "id": "volvo_ppc_eco_roll_hysteresis", "nameKey": "features.items.volvo_ppc_hysteresis.name", "descKey": "features.items.volvo_ppc_hysteresis.desc", "defaultName": "PPC Speed Hysteresis (Eco-Roll)", "defaultDesc": "Adjust PPC (Predictive Powertrain Control) hysteresis tolerance for eco‑roll behavior.", "make": "Volvo Trucks", "category": "DRIVER_ASSIST_PPC", "targetEcuHeader": "VMCU", "pgn": "TBD_LAB_VERIFY", "spn": "TBD_LAB_VERIFY", "didHex": "TBD_LAB_VERIFY", "byteIndex": 8, "bitIndex": 0, "bitWidth": 8, "options": [ { "labelKey": "features.options.hyst_3", "defaultLabel": "+/- 3 km/h", "valueHex": "03" }, { "labelKey": "features.options.hyst_5", "defaultLabel": "+/- 5 km/h", "valueHex": "05" }, { "labelKey": "features.options.hyst_10", "defaultLabel": "+/-10 km/h", "valueHex": "0A" } ], "requiresSecurityAccess": true, "securityLevel": 2, "requiresExtendedSession": true, "safetyLevel": "LEVEL_3_OPERATIONAL", "riskLevel": "MEDIUM", "verification": { "status": "DRAFT_UNVERIFIED", "notes": "Requires route test with PPC and verify transient behavior in test track." } } ]

Section E — Lab discovery checklist (step-by-step)

Pre-lab:
Obtain authorizations, check local legal constraints.
Prepare stable 24V power and voltage monitor probe.
Confirm adapter supports J1939 TP and UDS over J1939 (BAM/RTS-CTS).
Discovery steps for each template:
Passive logging (60–120s) with PCAP/ASC.
Identify engine/master ECU SA and common PGNs being broadcast.
Use J1939 Request to request candidate PGNs that contain configurable parameters (vendor PGNs or commonly used engine configuration PGNs).
If UDS available: use UDS service 0x22 to read known DIDs (start with FA / vehicle order / config DIDs if exposed); use Diagnostic Session 0x10 before write checks.
Controlled toggle: operator toggles setting; log pre/post traces; run diff to isolate changed PGN/SPN or DID bytes.
In lab, perform a write with PREPARE→WRITE→VERIFY. For J1939-based writes use TP and block/verify strategy.
Execute rollback: reapply pre-snapshot and verify successful restoration.
Document encoding (endianness, scale), units, min/max values, allowed SW ranges and any checksum routines.
Set verification.status = VERIFIED and add verifyingVINs and test logs to template metadata.
Section F — Integration & operational notes

Safety gating:
Enforce that features with safetyLevel >= LEVEL_4_CRITICAL require: engine running or external power, supervised operator, and dual-approval (operator + fleet manager).
Security:
Use HSM for server side signing for manufacturer auth where required. Log all security access attempts and limit retry windows.
Telemetry:
Record field telemetry (success/failure, VIN, SW version) and auto-disable templates that show >X% failures.
Regulatory:
RSL modifications must comply with local laws. Provide explicit consent screens and fleet policy logging.
Section G — Next steps for you (safe path to verified catalog)

Run the J1939/UDS probe script (I previously provided a probe script for passenger vehicles) adapted to your J1939 bus (I can provide an adapted Python probe that queries PGN ranges and saves diffs) — capture results for the provided draft templates.
For each template, populate pgn/spn/didHex with lab-captured values, set verification.status = VERIFIED after rollback tests, and push to production catalog.
For Cummins and other constrained vendors request partner / OEM sign-off or use official tools (INSITE, dealerships) for any features that require vendor authentication.
Appendix — Example verification metadata structure (add to each template)

verification: { status: "VERIFIED" | "DRAFT_UNVERIFIED", verifiedBy: "lab-engineer@company", verifiedDate: "2026-08-17T12:00:00Z", verifiedVINs: ["X12345..."], testLogs: ["s3://.../capture1.asc","s3://.../pcap2.pcap"], notes: "Confirmed units km/h, value = integer speed in km/h" }
Final deliverables I can produce next (pick one or more)

Option A: Provide an adapted Python probe script that targets J1939 PGN ranges and outputs diffs (pre/post) similar to the passenger-vehicle script but using J1939 Request PGN and TP handling — I can include code to search for SPNs and export candidate SPN/byte/bit suggestions.
Option B: Convert X of your existing 360 templates into heavy-duty JSON templates and mark them DRAFT_UNVERIFIED, ready for lab verification (I’ll need sample inputs).
Option C: After you run the captures (PCAP/ASC/probe_diff.json) for 3 representative vehicles (one Mercedes Actros, one Volvo FH, one Cummins-equipped truck) upload them here and I will:
Parse each capture,
Extract candidate PGN/SPN/UDS DID addresses,
Populate the templates above with the discovered addresses and bit offsets,
Produce a PR-ready set of VERIFIED templates (if rollback logs are included).
Option D: Produce the J1939-specific probe script now (Python) — I will generate it and include instructions for SocketCAN, PEAK and Vector.
Which would you like next? I recommend Option A (J1939 probe script) so you can capture deterministic addresses and I can convert the results to VERIFIED templates for you.