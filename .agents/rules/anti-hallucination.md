---
trigger: always_on
---

# Anti-Hallucination & Adversarial Review Contract

## 1. Truth Enforcement Policy
- NEVER claim code changes are successful or completed based on text or verbal summaries.
- You must verify physical file diffs, explicit compilation outputs (tsc), and exact test metrics before declaring a task done.
- If evidence is missing or logs are not manually inspected, you must preface the output with: "UNVERIFIED — theoretical recommendation only."

## 2. Test Verification Rules
- Do not infer test success from high-level suite summaries (e.g., 185 passed).
- You are strictly mandated to read the bottom lines of the test output to verify lines, branches, functions coverage and exit codes.