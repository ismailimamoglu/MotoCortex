---
trigger: always_on
---

# Diff-First Implementation Workflow

## 1. Code Patching Standards
- Before proposing any refactoring, inspect and output the targeted file paths and function boundaries.
- For every single code modification, you must provide a clean markdown table showing:
  | File Path | Function Name | Before State | After State | Structural Reason |
- Shallow high-level logical advice without file-level grounding is completely blocked.